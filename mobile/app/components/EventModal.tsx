import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  X,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Check,
  Trash2,
  AlertCircle,
} from 'lucide-react-native';
import { Event } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';

interface EventModalProps {
  event: Event;
  onClose: () => void;
  onJoined?: () => void;
}

type AttendeeAvatar = {
  userId: string;
  avatar: string | null;
};

type AvatarRow = {
  user_id: string;
  avatar_url: string | null;
};

type RequestStatus = 'none' | 'pending' | 'declined';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default avatar from Supabase "Profile/anonymous/cover.jpg"
const DEFAULT_AVATAR_URL = (() => {
  try {
    const { data } = supabase
      .storage
      .from('Profile')
      .getPublicUrl('anonymous/cover.jpg');
    return data?.publicUrl || '';
  } catch {
    return '';
  }
})();

const getAvatar = (maybeUrl: string | null | undefined) => {
  if (maybeUrl && maybeUrl.length > 0) return maybeUrl;
  if (DEFAULT_AVATAR_URL && DEFAULT_AVATAR_URL.length > 0) {
    return DEFAULT_AVATAR_URL;
  }
  return 'https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous';
};

export const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  onJoined,
}) => {
  const { user } = useAuth();

  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [attendeeAvatars, setAttendeeAvatars] = useState<AttendeeAvatar[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');

  const isHost =
    !!user &&
    (((event as any).created_by === user.id) ||
      (event as any).createdBy === user.id);

  const isDemo =
    (event as any).is_demo === true ||
    (event as any).isDemo === true;

  const languages: string[] = (event as any).languages || [];

  // ---- Main sheet animation ----
  const openAnim = useRef(new Animated.Value(0)).current;

  const overlayOpacity = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  // ---- Leave confirm modal animation ----
  const leaveAnim = useRef(new Animated.Value(0)).current;

  const leaveOverlayOpacity = leaveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const leaveTranslateY = leaveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  // ---- Delete confirm modal animation ----
  const deleteAnim = useRef(new Animated.Value(0)).current;

  const deleteOverlayOpacity = deleteAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const deleteTranslateY = deleteAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  useEffect(() => {
    Animated.timing(openAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [openAnim]);

  useEffect(() => {
    checkRSVPStatus();
    fetchAttendeeAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, user?.id]);

  const animateClose = (cb: () => void) => {
    Animated.timing(openAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) cb();
    });
  };

  const handleClose = () => {
    animateClose(onClose);
  };

  // ---- Leave confirm controls ----
  const openLeaveConfirm = () => {
    setShowLeaveConfirm(true);
    leaveAnim.setValue(0);

    Animated.timing(leaveAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeLeaveConfirm = () => {
    Animated.timing(leaveAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowLeaveConfirm(false);
    });
  };

  // ---- Delete confirm controls ----
  const openDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    deleteAnim.setValue(0);

    Animated.timing(deleteAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeDeleteConfirm = () => {
    Animated.timing(deleteAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowDeleteConfirm(false);
    });
  };

  // ---- Helpers ----

  const fetchAttendeeAvatars = async () => {
    try {
      const { data: avatarData } = await supabase.rpc(
        'get_event_attendee_avatars',
        {
          p_event_id: event.id,
          p_limit: 3,
        },
      );

      const avatars: AttendeeAvatar[] =
        (avatarData as AvatarRow[] | null)?.map((a) => ({
          userId: a.user_id,
          avatar: a.avatar_url,
        })) || [];

      setAttendeeAvatars(avatars);
    } catch (error) {
      console.error('Error fetching attendee avatars:', error);
    }
  };

  const checkRSVPStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (
      (event as any).created_by === user.id ||
      (event as any).createdBy === user.id
    ) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsJoined(!!data);

      if (!isDemo && !data) {
        const { data: requestData } = await supabase
          .from('event_join_requests')
          .select('status')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (requestData) {
          setRequestStatus(requestData.status as RequestStatus);
        }
      }
    } catch (err) {
      console.error('Error checking RSVP status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!user || joining) return;

    setJoining(true);

    try {
      if (!isDemo) {
        const { error } = await supabase
          .from('event_join_requests')
          .insert({
            event_id: event.id,
            user_id: user.id,
            status: 'pending',
          });

        if (error) {
          if (error.code === '23505') {
            setRequestStatus('pending');
            setJoining(false);
            return;
          }
          throw error;
        }

        setRequestStatus('pending');
        setJoining(false);
        return;
      }

      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: 'going',
        });

      if (error) {
        if (error.code === '23505') {
          setIsJoined(true);
          onJoined?.();
          setJoining(false);
          return;
        }
        throw error;
      }

      setIsJoined(true);
      fetchAttendeeAvatars();
      onJoined?.();
    } catch (err) {
      console.error('Error joining event:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!user || leaving) return;
    setLeaving(true);

    try {
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id);

      if (error) throw error;

      const { error: updateError } = await supabase.rpc(
        'decrement_event_attendees',
        {
          event_id: event.id,
        },
      );
      if (updateError) {
        console.error('Error updating attendee count:', updateError);
      }

      setIsJoined(false);
      fetchAttendeeAvatars();
      onJoined?.();
      closeLeaveConfirm();
    } catch (err) {
      console.error('Error leaving event:', err);
      setLeaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!user || deleting) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('created_by', user.id);

      if (error) throw error;

      onJoined?.();
      closeDeleteConfirm();
      animateClose(onClose);
    } catch (err) {
      console.error('Error deleting event:', err);
      setDeleting(false);
    }
  };

  const getFormattedDateTime = () => {
    const pre = (event as any).time || (event as any).date;
    if (pre) return pre as string;

    const raw =
      (event as any).start_time ||
      (event as any).startTime ||
      (event as any).starts_at ||
      event.date;

    if (!raw) return '';

    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';

    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const totalAttendees =
    event.attendees ||
    (event as any).current_attendees ||
    0;

  // ---- Render ----

  return (
    <>
      {/* Base overlay for main sheet */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(15,23,42,0.5)',
              opacity: overlayOpacity,
              zIndex: 40,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Bottom sheet */}
      <Animated.View
        className="absolute inset-x-0 bottom-0 z-50"
        style={{
          transform: [{ translateY: sheetTranslateY }],
        }}
      >
        <View className="max-h-[90vh] bg-white rounded-t-3xl overflow-hidden pb-6">
          {/* Hero image + close */}
          <View className="relative">
            {event.image ? (
              <Image
                source={{ uri: event.image }}
                className="w-full h-56"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-16 bg-white" />
            )}

            <Pressable
              onPress={handleClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow-sm"
            >
              <X size={18} color="#4b5563" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            className="px-6"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Title + category */}
            <View className="flex-row gap-3 mb-4">
              <Text className="text-3xl">
                {(event as any).emoji || '📅'}
              </Text>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-slate-900">
                  {event.title}
                </Text>
                <View className="mt-1 self-start px-3 py-1 rounded-full bg-emerald-500/10 items-center justify-center">
                  <Text className="text-[10px] font-semibold text-emerald-500 text-center">
                    {event.category}
                  </Text>
                </View>
              </View>
            </View>

            {/* Meta */}
            <View className="space-y-3 mb-6">
              <View className="flex-row items-center">
                <CalendarIcon size={18} color="#6b7280" />
                <Text className="ml-3 text-sm text-gray-600">
                  {getFormattedDateTime()}
                </Text>
              </View>

              <View className="flex-row items-center">
                <MapPin size={18} color="#6b7280" />
                <Text className="ml-3 text-sm text-gray-600 flex-1">
                  {(event as any).location ||
                    (event as any).location_name ||
                    ''}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Users size={18} color="#6b7280" />
                <View className="ml-3 flex-row items-center flex-1">
                  <Text className="text-sm text-gray-600">
                    {totalAttendees} attending
                  </Text>

                  {attendeeAvatars.length > 0 && (
                    <View className="flex-row items-center ml-2">
                      {attendeeAvatars.slice(0, 3).map((att, i) => (
                        <Pressable
                          key={`${att.userId}-${i}`}
                          onPress={() => setSelectedUserId(att.userId)}
                          className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-gray-100 items-center justify-center"
                          style={{ marginLeft: i === 0 ? 0 : -14 }}
                        >
                          <Image
                            source={{ uri: getAvatar(att.avatar) }}
                            className="w-full h-full"
                          />
                        </Pressable>
                      ))}

                      {totalAttendees > attendeeAvatars.length && (
                        <Text className="ml-1 text-[10px] text-gray-500">
                          +{totalAttendees - attendeeAvatars.length}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {languages.length > 0 && (
                <View className="flex-row">
                  <AlertCircle size={18} color="#6b7280" />
                  <View className="ml-3 flex-row flex-wrap gap-2 flex-1">
                    {languages.map((lang, idx) => (
                      <View
                        key={`${lang}-${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 items-center justify-center"
                      >
                        <Text className="text-[10px] text-gray-700 font-medium text-center">
                          {lang}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* About */}
            {event.description ? (
              <View className="mb-6">
                <Text className="text-sm font-semibold text-slate-900 mb-1.5">
                  About
                </Text>
                <Text className="text-sm text-gray-600 leading-relaxed">
                  {event.description}
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            {isHost ? (
              <View className="space-y-3 mb-4">
                <View className="w-full py-3.5 rounded-xl bg-gray-100 flex-row items-center justify-center">
                  <Check size={18} color="#6b7280" style={{ marginRight: 6 }} />
                  <Text className="font-semibold text-gray-500 text-center">
                    You're hosting this event
                  </Text>
                </View>
                <Pressable
                  onPress={openDeleteConfirm}
                  className="w-full py-3.5 rounded-xl border-2 border-red-500 flex-row items-center justify-center"
                >
                  <Trash2 size={18} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text className="font-semibold text-red-500 text-center">
                    Delete Event
                  </Text>
                </Pressable>
              </View>
            ) : loading ? (
              <View className="w-full py-3.5 rounded-xl bg-gray-100 flex-row items-center justify-center gap-2 mb-4">
                <ActivityIndicator size="small" color="#45C4A0" />
                <Text className="text-sm text-gray-600 text-center">
                  Loading...
                </Text>
              </View>
            ) : isJoined ? (
              <View className="space-y-3 mb-4">
                <View className="w-full py-3.5 rounded-xl bg-gray-100 flex-row items-center justify-center gap-2">
                  <Check size={18} color="#111827" />
                  <Text className="font-semibold text-gray-800 text-center">
                    Joined
                  </Text>
                </View>
                <Pressable
                  onPress={openLeaveConfirm}
                  className="w-full py-3.5 rounded-xl border-2 border-red-500 items-center justify-center"
                >
                  <Text className="font-semibold text-red-500 text-center">
                    Leave Event
                  </Text>
                </Pressable>
              </View>
            ) : requestStatus === 'pending' ? (
              <View className="w-full py-3.5 mb-4 rounded-xl bg-yellow-100 items-center justify-center">
                <Text className="font-semibold text-yellow-800 text-center">
                  Request Pending
                </Text>
              </View>
            ) : requestStatus === 'declined' ? (
              <View className="w-full py-3.5 mb-4 rounded-xl bg-red-100 items-center justify-center">
                <Text className="font-semibold text-red-700 text-center">
                  Request Declined
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleJoinEvent}
                disabled={!user || joining}
                className="w-full py-3.5 mb-4 rounded-xl bg-emerald-500 items-center justify-center"
                style={{ opacity: !user || joining ? 0.5 : 1 }}
              >
                <Text className="font-semibold text-white text-center">
                  {joining
                    ? isDemo
                      ? 'Joining...'
                      : 'Requesting...'
                    : isDemo
                    ? 'Join Event'
                    : 'Request to Join'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Attendee profile modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onFollowChange={() => {}}
        />
      )}

      {/* Leave confirm modal */}
      {showLeaveConfirm && (
        <TouchableWithoutFeedback onPress={closeLeaveConfirm}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: 'rgba(15,23,42,0.5)',
                opacity: leaveOverlayOpacity,
                zIndex: 80,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 16,
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <Animated.View
                className="w-full max-w-sm bg-white rounded-2xl p-6"
                style={{
                  transform: [{ translateY: leaveTranslateY }],
                }}
              >
                <Text className="text-xl font-bold text-slate-900 mb-2">
                  Leave event?
                </Text>
                <Text className="text-sm text-gray-600 mb-6">
                  You'll lose your spot and future updates.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={closeLeaveConfirm}
                    disabled={leaving}
                    className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center"
                  >
                    <Text className="font-semibold text-gray-700 text-center">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleLeaveEvent}
                    disabled={leaving}
                    className="flex-1 py-3 rounded-xl bg-red-500 items-center justify-center"
                    style={{ opacity: leaving ? 0.6 : 1 }}
                  >
                    <Text className="font-semibold text-white text-center">
                      {leaving ? 'Leaving...' : 'Leave'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <TouchableWithoutFeedback onPress={closeDeleteConfirm}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: 'rgba(15,23,42,0.5)',
                opacity: deleteOverlayOpacity,
                zIndex: 90,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 16,
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <Animated.View
                className="w-full max-w-sm bg-white rounded-2xl p-6"
                style={{
                  transform: [{ translateY: deleteTranslateY }],
                }}
              >
                <Text className="text-xl font-bold text-slate-900 mb-2">
                  Delete event?
                </Text>
                <Text className="text-sm text-gray-600 mb-6">
                  This action cannot be undone. All attendees will lose access to this event.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={closeDeleteConfirm}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl bg-gray-100 items-center justify-center"
                  >
                    <Text className="font-semibold text-gray-700 text-center">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteEvent}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl bg-red-500 items-center justify-center"
                    style={{ opacity: deleting ? 0.6 : 1 }}
                  >
                    <Text className="font-semibold text-white text-center">
                      {deleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
    </>
  );
};
