import { useState, useEffect } from 'react';
import { MessageCircle, Search, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DirectMessageChat } from './DirectMessageChat';

interface DirectMessagesProps {
  onClose: () => void;
}

interface DMRoom {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
  otherUser?: {
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    avatar_url: string | null;
    username: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    is_read: boolean;
  };
  unreadCount: number;
}

export const DirectMessages = ({ onClose }: DirectMessagesProps) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<DMRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (user) {
      loadRooms();
      subscribeToMessages();
    }
  }, [user]);

  useEffect(() => {
    const onThreadRead = (e: Event) => {
      const { roomId } = (e as CustomEvent).detail || {};
      if (!roomId) return;
      // Optimistically zero unread + mark lastMessage as read in UI
      setRooms(prev =>
        prev.map(r =>
          r.id === roomId
            ? {
                ...r,
                unreadCount: 0,
                lastMessage: r.lastMessage
                  ? { ...r.lastMessage, is_read: true }
                  : r.lastMessage
              }
            : r
        )
      );
    };
  
    window.addEventListener("dm-thread-read", onThreadRead);
    return () => window.removeEventListener("dm-thread-read", onThreadRead);
  }, []);

  const loadRooms = async () => {
    if (!user) return;

    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from('direct_message_rooms')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (roomsError) throw roomsError;

      const roomsWithDetails = await Promise.all(
        (roomsData || []).map(async (room) => {
          const otherUserId = room.user1_id === user.id ? room.user2_id : room.user1_id;

          const { data: otherUserData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name, avatar_url, username')
            .eq('id', otherUserId)
            .single();

          const { data: lastMessageData } = await supabase
            .from('direct_messages')
            .select('content, created_at, is_read')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...room,
            otherUser: otherUserData || undefined,
            lastMessage: lastMessageData || undefined,
            unreadCount: unreadCount || 0
          };
        })
      );

      setRooms(roomsWithDetails);
    } catch (error) {
      console.error('Error loading DM rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('dm_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages'
        },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${room.otherUser?.first_name || ''} ${room.otherUser?.last_name || ''}`.toLowerCase();
    return fullName.includes(query) ||
           room.otherUser?.display_name.toLowerCase().includes(query) ||
           room.otherUser?.username?.toLowerCase().includes(query);
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return minutes === 0 ? 'Just now' : `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col relative ${
    isExiting ? 'animate-slideOutRight' : 'animate-slideInRight'
  }`}>
      <header className="bg-white border-b border-gray-200">
        <div className="px-2 pt-3 pb-2 flex items-center gap-0.5">
          <button
            onClick={handleBack}
            className="p-1.5 hover:bg-gray-100 rounded-xl transition-all active:scale-90"
          >
            <ChevronLeft className="w-6 h-6 text-[#1e3a8a] stroke-[2.5]" />
          </button>
          <h1 className="text-2xl font-bold text-[#1e293b] tracking-tight">Messages</h1>
        </div>
        <div className="px-2 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-[#45C4A0] transition-all placeholder:text-gray-400"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-[#45C4A0]/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#45C4A0] border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500">
              Start a conversation with people you follow
            </p>
          </div>
        ) : (
          <div className="">
            {filteredRooms.map((room) => (
              <button
                key={room.id}
                onClick={async () => {
                  setRooms(prev =>
                    prev.map(r =>
                      r.id === room.id
                        ? {
                            ...r,
                            unreadCount: 0,
                            lastMessage: r.lastMessage
                              ? { ...r.lastMessage, is_read: true }
                              : r.lastMessage
                          }
                        : r
                    )
                  );
                
                  setSelectedRoomId(room.id);
                
                  await supabase
                    .from('direct_messages')
                    .update({ is_read: true })
                    .eq('room_id', room.id)
                    .eq('is_read', false)
                    .neq('sender_id', user!.id);
              
                  window.dispatchEvent(
                    new CustomEvent("dm-thread-read", { detail: { roomId: room.id } })
                  );
                }}
                className="w-full px-3 py-4 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={room.otherUser?.avatar_url || '/default-avatar.svg'}
                      alt={room.otherUser?.display_name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold leading-tight truncate text-base ${
                        room.unreadCount > 0 ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {room.otherUser?.first_name && room.otherUser?.last_name
                          ? `${room.otherUser.first_name} ${room.otherUser.last_name}`
                          : room.otherUser?.display_name}
                      </h3>
                      {room.unreadCount > 0 && (
                        <div className="w-2.5 h-2.5 bg-[#45C4A0] rounded-full flex-shrink-0 ml-2"></div>
                      )}
                    </div>
                    {room.lastMessage ? (
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm truncate flex-1 ${
                          room.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'
                        }`}>
                          {room.lastMessage.content}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0 font-bold bg-gray-100 px-2 py-0.5 rounded-full">
                          {formatTime(room.lastMessage.created_at)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No messages yet</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedRoomId && (() => {
        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        if (!selectedRoom) return null;
        return (
          // Transparent overlay; blocks clicks to the list while chat slides in
          <div className="absolute inset-0 z-[60]">
            <DirectMessageChat
              roomId={selectedRoomId}
              otherUser={selectedRoom.otherUser!}
              onBack={() => setSelectedRoomId(null)}
            />
          </div>
        );
      })()}
    </div>
  );
};
