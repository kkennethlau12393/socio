import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, MoreVertical, LogOut, Trash2, AlertCircle } from 'lucide-react';
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

const DEMO_MESSAGES = [
  {
    id: 1,
    room_id: 'demo',
    user_id: 'demo1',
    content: 'Looking forward to this event!',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    username: 'Alex Thompson',
    avatar_url: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
  {
    id: 2,
    room_id: 'demo',
    user_id: 'demo2',
    content: 'Same! Should we meet at the entrance?',
    created_at: new Date(Date.now() - 5400000).toISOString(),
    username: 'Jordan Lee',
    avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100',
  },
];

export const EventChat = ({ event, onBack, onEventLeft }: EventChatProps) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSliding, setIsSliding] = useState(false);
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
  const menuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const currentUserIsHost = user && ((event as any).created_by === user.id || (event as any).createdBy === user.id);
  const isDemo = (event as any).is_demo === true || (event as any).isDemo === true || event.title.toLowerCase().includes('demo');
  const eventCreatorId = (event as any).created_by || (event as any).createdBy;

  const DEFAULT_AVATAR = '/default-avatar.svg';

  const DEBUG_REALTIME = false;

  useEffect(() => {
    setIsSliding(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserScrolled(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userScrolled]);

  useEffect(() => {
    if (isDemo) {
      setMessages(DEMO_MESSAGES);
      setLoading(false);
      return;
    }

    loadChatRoom();
  }, [event.id, isDemo]);

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
          if (DEBUG_REALTIME) {
            console.log('[Realtime] New message:', payload);
          }

          const newMsg = payload.new as Message;

          const { data: userData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMsg.user_id)
            .single();

          const messageWithUser = {
            ...newMsg,
            username: userData?.username || 'Unknown',
            avatar_url: userData?.avatar_url,
          };

          setMessages((prev) => {
            if (prev.some(m => m.id === messageWithUser.id)) {
              return prev;
            }
            return [...prev, messageWithUser];
          });
        }
      )
      .subscribe((status) => {
        if (DEBUG_REALTIME) {
          console.log('[Realtime] Subscription status:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (DEBUG_REALTIME) {
        console.log('[Realtime] Unsubscribing from channel');
      }
      channel.unsubscribe();
    };
  }, [chatRoom?.id, isDemo]);

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
        .single();

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
        .single();

      if (roomError || !roomData) {
        const { data: newRoomId, error: createError } = await supabase
          .rpc('get_or_create_event_chat_room', { p_event_id: event.id });

        if (createError) throw createError;

        roomData = { id: newRoomId, event_id: event.id };
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
        .select(`
          id,
          room_id,
          user_id,
          content,
          created_at
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(51);

      if (beforeId) {
        query = query.lt('id', beforeId);
      }

      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) throw messagesError;

      const hasMore = messagesData && messagesData.length > 50;
      setHasMoreMessages(hasMore);

      const messagesToShow = hasMore ? messagesData.slice(0, 50) : messagesData || [];

      if (messagesToShow.length > 0) {
        const userIds = [...new Set(messagesToShow.map(m => m.user_id))];
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

        const messagesWithUsers = messagesToShow.map(msg => ({
          ...msg,
          username: usersMap.get(msg.user_id)?.username || 'Unknown',
          avatar_url: usersMap.get(msg.user_id)?.avatar_url,
        }));

        messagesWithUsers.reverse();

        if (beforeId) {
          setMessages(prev => [...messagesWithUsers, ...prev]);
        } else {
          setMessages(messagesWithUsers);
          if (messagesWithUsers.length > 0) {
            setOldestMessageId(messagesWithUsers[0].id);
          }
        }

        if (messagesWithUsers.length > 0 && beforeId) {
          setOldestMessageId(messagesWithUsers[0].id);
        }
      } else {
        if (!beforeId) {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      if (!beforeId) {
        setError('Failed to load messages');
      }
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

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          room_id: chatRoom.id,
          user_id: user.id,
          content: messageContent,
        });

      if (insertError) {
        if (insertError.code === '42501') {
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
        event_id_param: event.id
      });

      setShowLeaveConfirm(false);
      setShowMenu(false);
      if (onEventLeft) {
        onEventLeft();
      } else {
        onBack();
      }
    } catch (error) {
      console.error('Error leaving event:', error);
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
      if (onEventLeft) {
        onEventLeft();
      } else {
        onBack();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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
    setTimeout(() => {
      onBack();
    }, 300);
  };

  const groupedMessages = messages.reduce((groups: Message[][], message, index) => {
    if (index === 0 || messages[index - 1].user_id !== message.user_id) {
      groups.push([message]);
    } else {
      groups[groups.length - 1].push(message);
    }
    return groups;
  }, []);

  return (
    <div className={`fixed inset-0 bg-[#f5f7fa] z-50 flex flex-col transition-transform duration-300 ${isSliding ? 'translate-x-0' : 'translate-x-full'}`}>
      <header className="bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-11 h-11 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-gray-900 truncate">{event.title}</h1>
                <p className="text-xs text-gray-500 mt-0.5">{event.attendees} attending</p>
              </div>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[160px] z-20 animate-[fadeIn_0.15s_ease-out]">
                {currentUserIsHost ? (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowLeaveConfirm(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Event
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#45C4A0] rounded-2xl mb-4 animate-pulse">
                <Send className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-600">Loading chat...</p>
            </div>
          </div>
        ) : error && !isParticipant ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Join to chat</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : messages.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#45C4A0]/10 rounded-2xl mb-4">
                <Send className="w-8 h-8 text-[#45C4A0]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the conversation</h3>
              <p className="text-gray-500">Be the first to send a message to the group</p>
            </div>
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm text-[#45C4A0] hover:bg-[#45C4A0]/10 rounded-lg transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {groupedMessages.map((group, groupIndex) => {
              const firstMessage = group[0];
              const isCurrentUser = firstMessage.user_id === user?.id;
              const isMessageFromHost = firstMessage.user_id === eventCreatorId;

              if (isCurrentUser) {
                return (
                  <div key={groupIndex} className="flex gap-2 flex-row justify-end items-end mb-3">
                    <div className="flex flex-col gap-1 items-end max-w-[70%]">
                      {groupIndex === 0 || groupedMessages[groupIndex - 1][0].user_id !== firstMessage.user_id ? (
                        <div className="flex items-center gap-1.5 px-2 mb-0.5">
                          <span className="text-[10px] font-medium text-gray-400">
                            You
                          </span>
                          {isMessageFromHost && (
                            <span className="text-[8px] font-bold text-[#45C4A0] bg-[#45C4A0]/10 px-1.5 py-0.5 rounded uppercase">
                              HOST
                            </span>
                          )}
                        </div>
                      ) : null}
                      {group.map((message) => (
                        <div
                          key={message.id}
                          className="relative bg-[#45C4A0] text-white rounded-2xl rounded-br-md px-3.5 py-2 shadow-sm"
                        >
                          <div className="flex items-end gap-2">
                            <p className="text-[15px] leading-[1.4] flex-1">{message.content}</p>
                            <span className="text-[10px] opacity-70 whitespace-nowrap">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setSelectedUserId(user?.id || null)} className="flex-shrink-0">
                      <img
                        src={profile?.avatar_url || DEFAULT_AVATAR}
                        alt="You"
                        className="w-8 h-8 rounded-full object-cover mb-0.5 hover:ring-2 hover:ring-[#45C4A0] transition-all cursor-pointer"
                      />
                    </button>
                  </div>
                );
              } else {
                return (
                  <div key={groupIndex} className="flex gap-2 flex-row items-end mb-3">
                    <button onClick={() => setSelectedUserId(firstMessage.user_id)} className="flex-shrink-0">
                      <img
                        src={firstMessage.avatar_url || DEFAULT_AVATAR}
                        alt={firstMessage.username || 'User'}
                        className="w-8 h-8 rounded-full object-cover mb-0.5 hover:ring-2 hover:ring-[#45C4A0] transition-all cursor-pointer"
                      />
                    </button>
                    <div className="flex flex-col gap-1 items-start max-w-[70%]">
                      {groupIndex === 0 || groupedMessages[groupIndex - 1][0].user_id !== firstMessage.user_id ? (
                        <div className="flex items-center gap-1.5 px-2 mb-0.5">
                          <span className="text-[10px] font-medium text-gray-500">
                            {firstMessage.username || 'Unknown'}
                          </span>
                          {isMessageFromHost && (
                            <span className="text-[8px] font-bold text-[#45C4A0] bg-[#45C4A0]/10 px-1.5 py-0.5 rounded uppercase">
                              HOST
                            </span>
                          )}
                        </div>
                      ) : null}
                      {group.map((message) => (
                        <div
                          key={message.id}
                          className="relative bg-white text-gray-900 rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm border border-gray-200"
                        >
                          <div className="flex items-end gap-2">
                            <p className="text-[15px] leading-[1.4] flex-1">{message.content}</p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      <div className="bg-white px-4 py-3 flex-shrink-0 border-t border-gray-200">
        {error && isParticipant && (
          <div className="mb-2 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="flex gap-2 items-center bg-gray-100 rounded-full px-4 py-2.5">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={!isParticipant ? 'Join the event to chat' : 'Message...'}
            disabled={!isParticipant}
            className="flex-1 bg-transparent border-0 focus:outline-none text-[15px] text-gray-900 placeholder:text-gray-500 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isParticipant}
            className="w-8 h-8 flex items-center justify-center bg-[#45C4A0] text-white rounded-full hover:bg-[#3db596] active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onFollowChange={() => {}}
        />
      )}

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1e293b] mb-2">Leave event?</h3>
            <p className="text-gray-600 text-sm mb-6">
              You'll lose your spot and future updates.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveEvent}
                disabled={leaving}
                className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {leaving ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1e293b] mb-2">Delete event?</h3>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. All attendees will lose access to this event.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
