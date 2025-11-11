// src/components/EventChat.tsx

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  Send,
  MoreVertical,
  LogOut,
  Trash2,
  AlertCircle,
} from 'lucide-react-native';
import { Event } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';

interface EventChatProps {
  event: Event;
  onBack: () => void;
  onEventLeft?: () => void;
}

interface Message {
  id: number;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

interface ChatRoom {
  id: string;
  event_id: string;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: 1,
    room_id: 'demo',
    user_id: 'demo1',
    content: 'Looking forward to this event!',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    username: 'Alex Thompson',
    avatar_url:
      'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: 2,
    room_id: 'demo',
    user_id: 'demo2',
    content: 'Same! Should we meet at the entrance?',
    created_at: new Date(Date.now() - 5400000).toISOString(),
    username: 'Jordan Lee',
    avatar_url:
      'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
];

export const EventChat: React.FC<EventChatProps> = ({
  event,
  onBack,
  onEventLeft,
}) => {
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSliding, setIsSliding] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const currentUserIsHost =
    !!user &&
    (((event as any).created_by === user.id) ||
      (event as any).createdBy === user.id);

  const isDemo =
    (event as any).is_demo === true ||
    (event as any).isDemo === true ||
    event.title.toLowerCase().includes('demo');

  const eventCreatorId =
    (event as any).created_by || (event as any).createdBy;

  const DEFAULT_AVATAR =
    'https://api.dicebear.com/7.x/initials/svg?seed=U';

  // Group messages like web version
  const groupedMessages = useMemo(() => {
    return messages.reduce((groups: Message[][], message, index) => {
      if (index === 0 || messages[index - 1].user_id !== message.user_id) {
        groups.push([message]);
      } else {
        groups[groups.length - 1].push(message);
      }
      return groups;
    }, []);
  }, [messages]);

  // Initial load
  useEffect(() => {
    if (isDemo) {
      setMessages(DEMO_MESSAGES);
      setLoading(false);
      return;
    }
    loadChatRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, isDemo, user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (isDemo || !chatRoom?.id) return;

    const channel = supabase
      .channel(`chat:${chatRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${chatRoom.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          const { data: userData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMsg.user_id)
            .single();

          const messageWithUser: Message = {
            ...newMsg,
            username: userData?.username || 'Unknown',
            avatar_url: userData?.avatar_url,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === messageWithUser.id)) return prev;
            return [...prev, messageWithUser];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatRoom?.id, isDemo]);

  // Auto-scroll when messages change, if user near bottom
  useEffect(() => {
    if (!userScrolled && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, userScrolled]);

  const loadChatRoom = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: rsvpData } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsParticipant(!!rsvpData);

      if (!rsvpData) {
        setError('Join the event to chat');
        setLoading(false);
        return;
      }

      let { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, event_id')
        .eq('event_id', event.id)
        .maybeSingle();

      if (roomError || !roomData) {
        const { data: newRoomId, error: createError } =
          await supabase.rpc('get_or_create_event_chat_room', {
            p_event_id: event.id,
          });

        if (createError) throw createError;

        roomData = { id: newRoomId as string, event_id: event.id };
      }

      if (!roomData) {
        setError('Unable to load chat room');
        setLoading(false);
        return;
      }

      setChatRoom(roomData);
      await loadMessages(roomData.id);
    } catch (err) {
      console.error('Error loading chat room:', err);
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string, beforeId?: number) => {
    try {
      let query = supabase
        .from('messages')
        .select('id, room_id, user_id, content, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(51);

      if (beforeId) {
        query = query.lt('id', beforeId);
      }

      const { data: messagesData, error } = await query;
      if (error) throw error;

      const hasMore = (messagesData?.length || 0) > 50;
      setHasMoreMessages(hasMore);

      const slice = hasMore
        ? messagesData!.slice(0, 50)
        : messagesData || [];

      if (slice.length > 0) {
        const userIds = Array.from(
          new Set(slice.map((m) => m.user_id))
        );
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const usersMap = new Map(
          (usersData || []).map((u) => [u.id, u])
        );

        const withUsers: Message[] = slice.map((msg) => ({
          ...msg,
          username:
            usersMap.get(msg.user_id)?.username || 'Unknown',
          avatar_url: usersMap.get(msg.user_id)?.avatar_url,
        }));

        withUsers.reverse();

        if (beforeId) {
          setMessages((prev) => [...withUsers, ...prev]);
          setOldestMessageId(withUsers[0].id);
        } else {
          setMessages(withUsers);
          setOldestMessageId(withUsers[0].id);
        }
      } else if (!beforeId) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      if (!beforeId) setError('Failed to load messages');
    }
  };

  const loadOlderMessages = async () => {
    if (!chatRoom?.id || !oldestMessageId || loadingMore) return;
    setLoadingMore(true);
    await loadMessages(chatRoom.id, oldestMessageId);
    setLoadingMore(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !chatRoom?.id) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        room_id: chatRoom.id,
        user_id: user.id,
        content,
      });

      if (error) {
        if ((error as any).code === '42501') {
          setError('You may have been removed from this event');
          await loadChatRoom();
        } else {
          setError('Failed to send message');
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const handleLeaveEvent = async () => {
    if (!user || leaving) return;
    setLeaving(true);
    try {
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.rpc('decrement_event_attendees', {
        event_id_param: event.id,
      });

      setShowLeaveConfirm(false);
      setShowMenu(false);

      if (onEventLeft) onEventLeft();
      else onBack();
    } catch (err) {
      console.error('Error leaving event:', err);
    } finally {
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

      setShowDeleteConfirm(false);
      setShowMenu(false);

      if (onEventLeft) onEventLeft();
      else onBack();
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes === 0) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleBack = () => {
    setIsSliding(false);
    setTimeout(onBack, 200);
  };

  return (
    <View
      className={`absolute inset-0 bg-[#f5f7fa] z-50 flex flex-col ${
        isSliding ? 'animate-slideInRight' : 'animate-slideOutRight'
      }`}
    >
      {/* HEADER */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={handleBack}
              className="p-1.5 -ml-1 rounded-full active:opacity-70"
            >
              <ChevronLeft size={24} color="#111827" />
            </Pressable>
            <View className="flex-row items-center gap-3 flex-1 ml-2">
              <View className="w-11 h-11 rounded-xl overflow-hidden bg-gray-200">
                {event.image ? (
                  // eslint-disable-next-line react-native/no-inline-styles
                  <View className="w-full h-full">
                    {/* @ts-ignore - NativeWind Image via className if you swap later */}
                    <Image
                      source={{ uri: event.image }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                {typeof event.attendees === 'number' && (
                  <Text className="text-[10px] text-gray-500">
                    {event.attendees} attending
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View className="relative">
            <Pressable
              onPress={() => setShowMenu((v) => !v)}
              className="p-2 rounded-full active:opacity-70"
            >
              <MoreVertical size={18} color="#4b5563" />
            </Pressable>

            {showMenu && (
              <TouchableWithoutFeedback
                onPress={() => setShowMenu(false)}
              >
                <View className="absolute top-8 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[160px] z-50">
                  {currentUserIsHost ? (
                    <Pressable
                      onPress={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="px-4 py-2.5 flex-row items-center gap-2"
                    >
                      <Trash2 size={16} color="#DC2626" />
                      <Text className="text-sm text-red-600">
                        Delete Event
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setShowMenu(false);
                        setShowLeaveConfirm(true);
                      }}
                      className="px-4 py-2.5 flex-row items-center gap-2"
                    >
                      <LogOut size={16} color="#DC2626" />
                      <Text className="text-sm text-red-600">
                        Leave Event
                      </Text>
                    </Pressable>
                  )}
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>
      </View>

      {/* MESSAGES */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            e.nativeEvent;
          const distanceFromBottom =
            contentSize.height -
            (contentOffset.y + layoutMeasurement.height);
          setUserScrolled(distanceFromBottom > 80);
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center mt-10">
            <ActivityIndicator size="large" color="#45C4A0" />
            <Text className="mt-3 text-gray-600">
              Loading chat...
            </Text>
          </View>
        ) : error && !isParticipant ? (
          <View className="flex-1 items-center justify-center mt-10 px-6">
            <AlertCircle size={40} color="#9CA3AF" />
            <Text className="mt-3 text-lg font-semibold text-gray-900">
              Join to chat
            </Text>
            <Text className="mt-1 text-gray-600 text-sm text-center">
              {error}
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 items-center justify-center mt-10">
            <View className="w-16 h-16 bg-[#45C4A0]/10 rounded-2xl items-center justify-center">
              <Send size={28} color="#45C4A0" />
            </View>
            <Text className="mt-3 text-lg font-semibold text-gray-900">
              Start the conversation
            </Text>
            <Text className="mt-1 text-gray-500 text-sm">
              Be the first to send a message
            </Text>
          </View>
        ) : (
          <>
            {hasMoreMessages && (
              <View className="items-center mb-3">
                <Pressable
                  onPress={loadOlderMessages}
                  disabled={loadingMore}
                  className="px-4 py-1.5 rounded-lg"
                >
                  <Text className="text-xs font-semibold text-[#45C4A0]">
                    {loadingMore
                      ? 'Loading...'
                      : 'Load older messages'}
                  </Text>
                </Pressable>
              </View>
            )}

            {groupedMessages.map((group, groupIndex) => {
              const first = group[0];
              const isCurrentUser =
                first.user_id === user?.id;
              const isFromHost =
                first.user_id === eventCreatorId;

              if (isCurrentUser) {
                return (
                  <View
                    key={groupIndex}
                    className="flex-row justify-end mb-3 gap-2"
                  >
                    <View className="items-end max-w-[72%]">
                      {groupIndex === 0 ||
                      groupedMessages[groupIndex - 1][0]
                        .user_id !== first.user_id ? (
                        <View className="flex-row items-center mb-0.5">
                          <Text className="text-[10px] text-gray-400 mr-1">
                            You
                          </Text>
                          {isFromHost && (
                            <Text className="text-[8px] text-[#45C4A0] font-bold px-1.5 py-0.5 rounded bg-[#45C4A0]/10">
                              HOST
                            </Text>
                          )}
                        </View>
                      ) : null}
                      {group.map((m) => (
                        <View
                          key={m.id}
                          className="bg-[#45C4A0] rounded-2xl rounded-br-md px-3.5 py-2 mb-1 shadow-sm"
                        >
                          <View className="flex-row items-end gap-2">
                            <Text className="text-[15px] text-white flex-1">
                              {m.content}
                            </Text>
                            <Text className="text-[9px] text-white/70">
                              {formatTime(m.created_at)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    <Pressable
                      onPress={() =>
                        setSelectedUserId(user?.id || null)
                      }
                      className="mt-auto mb-0.5"
                    >
                      {/* Avatar placeholder; swap with Image if you have RN Image wired w/ NativeWind */}
                      <View className="w-8 h-8 rounded-full bg-gray-300" />
                    </Pressable>
                  </View>
                );
              }

              return (
                <View
                  key={groupIndex}
                  className="flex-row items-end mb-3 gap-2"
                >
                  <Pressable
                    onPress={() =>
                      setSelectedUserId(first.user_id)
                    }
                    className="mt-auto mb-0.5"
                  >
                    <View className="w-8 h-8 rounded-full bg-gray-300" />
                  </Pressable>
                  <View className="items-start max-w-[72%]">
                    {groupIndex === 0 ||
                    groupedMessages[groupIndex - 1][0]
                      .user_id !== first.user_id ? (
                      <View className="flex-row items-center mb-0.5">
                        <Text className="text-[10px] text-gray-600 mr-1">
                          {first.username || 'Unknown'}
                        </Text>
                        {isFromHost && (
                          <Text className="text-[8px] text-[#45C4A0] font-bold px-1.5 py-0.5 rounded bg-[#45C4A0]/10">
                            HOST
                          </Text>
                        )}
                      </View>
                    ) : null}
                    {group.map((m) => (
                      <View
                        key={m.id}
                        className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-3.5 py-2 mb-1 shadow-sm"
                      >
                        <View className="flex-row items-end gap-2">
                          <Text className="text-[15px] text-gray-900 flex-1">
                            {m.content}
                          </Text>
                          <Text className="text-[9px] text-gray-400">
                            {formatTime(m.created_at)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* INPUT BAR */}
      <View className="bg-white border-t border-gray-200 px-4 py-3">
        {error && isParticipant && (
          <View className="mb-2 flex-row items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle size={14} color="#DC2626" />
            <Text className="text-[11px] text-red-600 flex-1">
              {error}
            </Text>
          </View>
        )}
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2.5">
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={
              !isParticipant
                ? 'Join the event to chat'
                : 'Message...'
            }
            editable={isParticipant}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            multiline={false}
            className="flex-1 text-[15px] text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || !isParticipant}
            className={`w-8 h-8 items-center justify-center rounded-full ml-2 ${
              newMessage.trim() && isParticipant
                ? 'bg-[#45C4A0]'
                : 'bg-[#45C4A0]/40'
            }`}
          >
            <Send size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onFollowChange={() => {}}
        />
      )}

      {/* LEAVE CONFIRM */}
      {showLeaveConfirm && (
        <TouchableWithoutFeedback
          onPress={() => !leaving && setShowLeaveConfirm(false)}
        >
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <Text className="text-xl font-bold text-[#1e293b] mb-2">
                  Leave event?
                </Text>
                <Text className="text-sm text-gray-600 mb-6">
                  You&apos;ll lose your spot and future updates.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() =>
                      !leaving && setShowLeaveConfirm(false)
                    }
                    disabled={leaving}
                    className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                  >
                    <Text className="font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleLeaveEvent}
                    disabled={leaving}
                    className="flex-1 py-3 rounded-xl bg-red-500 items-center"
                  >
                    <Text className="font-semibold text-white">
                      {leaving ? 'Leaving...' : 'Leave'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <TouchableWithoutFeedback
          onPress={() =>
            !deleting && setShowDeleteConfirm(false)
          }
        >
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <Text className="text-xl font-bold text-[#1e293b] mb-2">
                  Delete event?
                </Text>
                <Text className="text-sm text-gray-600 mb-6">
                  This can&apos;t be undone. All attendees lose
                  access.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() =>
                      !deleting &&
                      setShowDeleteConfirm(false)
                    }
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                  >
                    <Text className="font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteEvent}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl bg-red-500 items-center"
                  >
                    <Text className="font-semibold text-white">
                      {deleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

export default EventChat;
