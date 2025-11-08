import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function notifyDmThreadRead(roomId: string) {
  window.dispatchEvent(new CustomEvent("dm-thread-read", { detail: roomId }));
}

interface DirectMessageChatProps {
  roomId: string;
  otherUser: {
    id: string;
    first_name?: string;
    last_name?: string;
    display_name: string;
    avatar_url: string | null;
    username: string | null;
  };
  onBack: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const DirectMessageChat = ({ roomId, otherUser, onBack }: DirectMessageChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (user && roomId) {
      loadMessages();
      markMessagesAsRead();
      subscribeToMessages();
    }
  }, [user, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && roomId) {
        markMessagesAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, roomId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBack = () => {
    setIsExiting(true);
    notifyDmThreadRead(roomId);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  const markMessagesAsRead = async () => {
    if (!user) return;
  
    try {
      const { data } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .select();
  
      if (data && data.length > 0) {
        setMessages(prev =>
          prev.map(msg =>
            msg.sender_id !== user.id && !msg.is_read
              ? { ...msg, is_read: true }
              : msg
          )
        );
        // >>> tell the DMs list to zero the unread count
        notifyDmThreadRead(roomId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`dm_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          if (newMessage.sender_id !== user?.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: messageContent,
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== previousDate;
  };

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col ${
    isExiting ? 'animate-slideOutRight' : 'animate-slideInRight'
  }`}>
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <img
            src={otherUser.avatar_url || '/default-avatar.svg'}
            alt={otherUser.display_name}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {otherUser.first_name && otherUser.last_name
                ? `${otherUser.first_name} ${otherUser.last_name}`
                : otherUser.display_name}
            </h2>
            {otherUser.username && (
              <p className="text-sm text-gray-500 truncate">{otherUser.username}</p>
            )}
          </div>
        </div>
      </header>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#45C4A0]"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-gray-500 mb-2">No messages yet</p>
              <p className="text-sm text-gray-400">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwnMessage = message.sender_id === user?.id;
              const showDate = shouldShowDateDivider(index);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-gray-100 px-3 py-1 rounded-full">
                        <span className="text-xs font-medium text-gray-600">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                        isOwnMessage
                          ? 'bg-[#45C4A0] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-end gap-2">
                        <p className="text-[15px] leading-[1.4] flex-1 whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <span
                          className={`text-[10px] whitespace-nowrap ${
                            isOwnMessage ? 'opacity-70' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent max-h-32"
            style={{
              minHeight: '40px',
              height: 'auto'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-[#45C4A0] text-white rounded-full hover:bg-[#3BA889] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};