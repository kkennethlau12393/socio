import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, Check, X, Bell } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import UserProfileModal from './UserProfileModal';

interface NotificationCenterProps {
  onClose: () => void;
  onNotificationChange?: () => void;
}

interface RequestDetails {
  id: string;
  event_id: string;
  user_id: string;
  event_title: string;
  event_image: string | null;
  event_location: string | null;
  event_start_time: string;
  user_username: string | null;
  user_avatar: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
}

interface FollowerDetails {
  id: string;
  username: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean;
  related_id: string | null;
  request_id: string | null;
  request_details?: RequestDetails;
  follower_details?: FollowerDetails;
}

const HEADER_TOP = 67;

// Anonymous avatar used ONLY for follower notifications when they have no avatar_url
const DEFAULT_FOLLOWER_AVATAR_URL = (() => {
  try {
    const { data } = supabase
      .storage
      .from('Profile') // bucket: profile
      .getPublicUrl('anonymous/cover.jpg'); // file path
    return data?.publicUrl || '';
  } catch {
    return '';
  }
})();

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onClose,
  onNotificationChange,
}) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const translateX = useRef(new Animated.Value(40)).current;
  const scrollRef = useRef<ScrollView | null>(null);

  // Animate in
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  // Subscribe + initial fetch
  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    markAllAsRead();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
          onNotificationChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [user?.id]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setIsScrolled(y > 10);
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      onNotificationChange?.();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched: Notification[] = await Promise.all(
        (data || []).map(async (notif: any): Promise<Notification> => {
          // Join request details
          if (notif.type === 'join_request' && notif.request_id) {
            const { data: requestData, error: reqError } = await supabase
              .from('event_join_requests')
              .select(
                `
                id,
                event_id,
                user_id,
                events!inner(
                  title,
                  image_url,
                  location_name,
                  start_time
                ),
                profiles!inner(
                  username,
                  avatar_url,
                  first_name,
                  last_name
                )
              `
              )
              .eq('id', notif.request_id)
              .maybeSingle();

            if (!reqError && requestData) {
              const events = (requestData as any).events;
              const profiles = (requestData as any).profiles;

              const eventRow = Array.isArray(events) ? events[0] : events;
              const profileRow = Array.isArray(profiles) ? profiles[0] : profiles;

              if (eventRow && profileRow) {
                const request_details: RequestDetails = {
                  id: requestData.id,
                  event_id: requestData.event_id,
                  user_id: requestData.user_id,
                  event_title: eventRow.title,
                  event_image: eventRow.image_url,
                  event_location: eventRow.location_name,
                  event_start_time: eventRow.start_time,
                  user_username: profileRow.username,
                  user_avatar: profileRow.avatar_url,
                  user_first_name: profileRow.first_name,
                  user_last_name: profileRow.last_name,
                };

                return { ...notif, request_details };
              }
            }
          }

          // New follower details: use related_id to fetch profile
          if (notif.type === 'new_follower' && notif.related_id) {
            const { data: followerData, error: followerError } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, first_name, last_name')
              .eq('id', notif.related_id)
              .maybeSingle();

            if (!followerError && followerData) {
              const follower_details: FollowerDetails = {
                id: followerData.id,
                username: followerData.username,
                avatar_url: followerData.avatar_url,
                first_name: followerData.first_name,
                last_name: followerData.last_name,
              };

              return { ...notif, follower_details };
            }
          }

          return notif as Notification;
        })
      );

      setNotifications(enriched);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, notificationId: string) => {
    try {
      setProcessingId(requestId);

      const { error } = await supabase
        .from('event_join_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      onNotificationChange?.();
    } catch (err) {
      console.error('Error accepting request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string, notificationId: string) => {
    try {
      setProcessingId(requestId);

      const { error } = await supabase
        .from('event_join_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      onNotificationChange?.();
    } catch (err) {
      console.error('Error declining request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBack = () => {
    if (isClosing) return;
    setIsClosing(true);

    Animated.timing(translateX, {
      toValue: 40,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }: { finished: boolean }) => {
      if (finished) onClose();
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Join requests: generic fallback (no anonymous Supabase asset)
  const getJoinRequestAvatar = (maybeUrl?: string | null) => {
    if (maybeUrl && maybeUrl.length > 0) return maybeUrl;
    return 'https://api.dicebear.com/7.x/thumbs/svg?seed=join-request';
  };

  // Followers: use avatar if present, otherwise Supabase anonymous asset
  const getFollowerAvatar = (maybeUrl?: string | null) => {
    if (maybeUrl && maybeUrl.length > 0) return maybeUrl;
    if (DEFAULT_FOLLOWER_AVATAR_URL) return DEFAULT_FOLLOWER_AVATAR_URL;
    return 'https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous';
  };

  const renderJoinRequest = (notification: Notification) => {
    if (!notification.request_details) return null;
    const request = notification.request_details;

    const start = new Date(request.event_start_time);
    const eventTimeString = start.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const isProcessing = processingId === request.id;

    return (
      <View
        key={notification.id}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-3"
      >
        {request.event_image ? (
          <View className="h-40 w-full overflow-hidden">
            <Image
              source={{ uri: request.event_image }}
              className="w-full h-full"
            />
          </View>
        ) : null}

        <View className="p-4">
          <Text className="text-lg font-bold text-slate-900 mb-2">
            {request.event_title}
          </Text>

          <Text className="text-xs text-slate-600 mb-1">{eventTimeString}</Text>
          {request.event_location ? (
            <Text className="text-xs text-slate-600 mb-3">
              {request.event_location}
            </Text>
          ) : null}

          <View className="flex-row items-center mb-4 pb-3 border-b border-gray-100">
            <Pressable
              onPress={() => setSelectedUserId(request.user_id)}
              className="flex-row items-center"
            >
              <Image
                source={{ uri: getJoinRequestAvatar(request.user_avatar) }}
                className="w-9 h-9 rounded-full mr-2"
              />
              <View>
                <Text className="text-sm font-semibold text-slate-900">
                  {request.user_first_name} {request.user_last_name}
                </Text>
                <Text className="text-[11px] text-slate-500">
                  wants to join
                </Text>
              </View>
            </Pressable>
            <Text className="ml-auto text-[10px] text-slate-400">
              {getTimeAgo(notification.created_at)}
            </Text>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleAccept(request.id, notification.id)}
              disabled={isProcessing}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                isProcessing ? 'bg-emerald-500/70' : 'bg-emerald-500'
              }`}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text className="ml-1.5 text-white text-sm font-semibold">
                    Accept
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => handleDecline(request.id, notification.id)}
              disabled={isProcessing}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-gray-100"
            >
              {isProcessing ? (
                <ActivityIndicator size="small" />
              ) : (
                <>
                  <X size={16} color="#111827" />
                  <Text className="ml-1.5 text-slate-800 text-sm font-semibold">
                    Decline
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderFollower = (notification: Notification) => {
    // We now ALWAYS render follower-style for type=new_follower,
    // even if follower_details is missing.
    const f = notification.follower_details;

    const nameFromDetails =
      (f?.first_name || '') + (f?.last_name ? ` ${f.last_name}` : '');
    const cleanedName = nameFromDetails.trim();

    // Fallback: derive name from message like "X started following you"
    let nameFromMessage: string | null = null;
    if (!cleanedName && notification.message) {
      const msg = notification.message;
      const suffix = ' started following you';
      if (msg.endsWith(suffix)) {
        nameFromMessage = msg.replace(suffix, '').trim();
      }
    }

    const displayName =
      cleanedName || nameFromMessage || f?.username || 'Someone';

    const avatarUri = getFollowerAvatar(f?.avatar_url);

    return (
      <Pressable
        key={notification.id}
        onPress={() => {
          if (f?.id) setSelectedUserId(f.id);
        }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 flex-row"
      >
        <Image
          source={{ uri: avatarUri }}
          className="w-11 h-11 rounded-full mr-3"
        />
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <View>
              <Text className="text-sm font-semibold text-slate-900">
                {displayName}
              </Text>
              <Text className="text-xs text-slate-600">
                started following you
              </Text>
            </View>
            <Text className="text-[10px] text-slate-400">
              {getTimeAgo(notification.created_at)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderGeneric = (notification: Notification) => {
    let iconColor = '#0284c7';
    let bgColor = '#e0f2fe';

    if (notification.type === 'request_accepted') {
      iconColor = '#16a34a';
      bgColor = '#bbf7d0';
    } else if (notification.type === 'request_declined') {
      iconColor = '#dc2626';
      bgColor = '#fee2e2';
    }

    return (
      <View
        key={notification.id}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-3 flex-row"
      >
        <View
          style={{ backgroundColor: bgColor }}
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
        >
          <Bell size={18} color={iconColor} />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-sm font-semibold text-slate-900 flex-1">
              {notification.title || ''}
            </Text>
            <Text className="text-[10px] text-slate-400 ml-2">
              {getTimeAgo(notification.created_at)}
            </Text>
          </View>
          <Text className="text-xs text-slate-600">
            {notification.message || ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderNotification = (n: Notification) => {
    if (n.type === 'join_request' && n.request_details) {
      return renderJoinRequest(n);
    }
    if (n.type === 'new_follower') {
      // ⚡ always use follower-style UI for new_follower
      return renderFollower(n);
    }
    return renderGeneric(n);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX }] },
      ]}
    >
      {/* Header */}
      <View
        className={`px-6 pb-3 border-b flex-row items-center justify-between ${
          isScrolled
            ? 'bg-white border-gray-200 shadow-xs'
            : 'bg-white/95 border-gray-100'
        }`}
        style={{ paddingTop: HEADER_TOP }}
      >
        <Pressable
          onPress={handleBack}
          className="w-9 h-9 items-center justify-center -ml-2 rounded-xl bg-gray-100"
        >
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-2xl font-bold text-slate-900">
          Notifications
        </Text>
        <View className="w-9" />
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#45C4A0" />
          <Text className="mt-3 text-slate-500">
            Loading notifications...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-3">
            <Bell size={28} color="#9ca3af" />
          </View>
          <Text className="text-lg font-semibold text-slate-800 mb-1">
            No notifications
          </Text>
          <Text className="text-xs text-slate-500 text-center">
            When something happens, it will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map(renderNotification)}
          <View className="h-6" />
        </ScrollView>
      )}

      {/* User profile modal */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onFollowChange={() => {}}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    inset: 0 as any,
    flex: 1,
    backgroundColor: '#ffffff',
    zIndex: 50,
  },
});

export default NotificationCenter;
