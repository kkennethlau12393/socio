// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Animated,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MessageCircle, Search as SearchIcon, ArrowLeft } from 'lucide-react-native';
import { DeviceEventEmitter } from 'react-native';
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

const HEADER_TOP = 67;

const DEFAULT_DM_AVATAR_URL = (() => {
  try {
    const { data } = supabase.storage
      .from('Profile')
      .getPublicUrl('anonymous/cover.jpg');
    return data?.publicUrl || '';
  } catch {
    return '';
  }
})();

const getDmAvatar = (maybeUrl?: string | null) => {
  if (maybeUrl && maybeUrl.length > 0) return maybeUrl;
  if (DEFAULT_DM_AVATAR_URL) return DEFAULT_DM_AVATAR_URL;
  return 'https://api.dicebear.com/7.x/thumbs/svg?seed=dm';
};

export const DirectMessages: React.FC<DirectMessagesProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<DMRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const translateX = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, []);

  const animateClose = () => {
    if (closing) return;
    setClosing(true);
    Animated.timing(translateX, {
      toValue: 40,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      await loadRooms();
      if (!mounted) return;
    })();
    const unsub = subscribeToMessages();
    return () => {
      mounted = false;
      unsub();
    };
  }, [user?.id]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('dm-thread-read', (roomId: string) => {
      if (!roomId) return;
      setRooms(prev =>
        prev.map(r =>
          r.id === roomId
            ? {
                ...r,
                unreadCount: 0,
                lastMessage: r.lastMessage
                  ? { ...r.lastMessage, is_read: true }
                  : r.lastMessage,
              }
            : r
        )
      );
    });
    return () => sub.remove();
  }, []);

  const loadRooms = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('direct_message_rooms')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: (DMRoom | null)[] = await Promise.all(
        (data || []).map(async room => {
          const otherUserId =
            room.user1_id === user.id ? room.user2_id : room.user1_id;
          const { data: otherUser, error: otherErr } = await supabase
            .from('profiles')
            .select(
              'id, first_name, last_name, display_name, avatar_url, username'
            )
            .eq('id', otherUserId)
            .maybeSingle();

          if (otherErr || !otherUser) {
            try {
              await supabase.from('direct_messages').delete().eq('room_id', room.id);
              await supabase.from('direct_message_rooms').delete().eq('id', room.id);
            } catch (cleanupErr) {
              console.error('Error cleaning deleted user DMs:', cleanupErr);
            }
            return null;
          }

          const { data: lastMessage } = await supabase
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
            otherUser,
            lastMessage: lastMessage || undefined,
            unreadCount: unreadCount || 0,
          } as DMRoom;
        })
      );

      setRooms(mapped.filter((r): r is DMRoom => !!r));
    } catch (err) {
      console.error('Error loading DM rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('dm_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        () => loadRooms()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsScrolled(e.nativeEvent.contentOffset.y > 10);
  };

  const filteredRooms = rooms.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${r.otherUser?.first_name || ''} ${
      r.otherUser?.last_name || ''
    }`.toLowerCase();
    return (
      fullName.includes(q) ||
      (r.otherUser?.display_name || '').toLowerCase().includes(q) ||
      (r.otherUser?.username || '').toLowerCase().includes(q)
    );
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 3600000;
    if (diff < 1) {
      const mins = Math.floor(diff * 60);
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    if (diff < 24) return `${Math.floor(diff)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
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
          onPress={animateClose}
          className="w-9 h-9 items-center justify-center -ml-2 rounded-xl bg-gray-100"
        >
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-2xl font-bold text-slate-900">Messages</Text>
        <View className="w-9" />
      </View>

      {/* Search bar */}
      <View className="bg-white">
        <View className="px-6 pt-5 pb-2">
          <View
            className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl mb-1 px-4"
            style={{ height: 46 }}
          >
            <SearchIcon size={16} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages..."
              placeholderTextColor="#9ca3af"
              className="flex-1 ml-2 text-sm text-gray-800"
              style={{ paddingTop: 0, paddingBottom: 3.65 }}
            />
          </View>
        </View>
      </View>

      {/* Rooms / Empty / Loading */}
      <View className="flex-1 px-3 pb-4">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color="#45C4A0" />
          </View>
        ) : filteredRooms.length === 0 ? (
          <View className="flex-1 items-center justify-start mt-28">
            <MessageCircle size={48} color="#A1A1AA" />
            <Text className="text-lg font-semibold text-slate-900 mt-3">
              No messages yet
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Start a chat with someone you meet
            </Text>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {filteredRooms.map(room => {
              if (!room.otherUser) return null;
              const displayName =
                room.otherUser.first_name && room.otherUser.last_name
                  ? `${room.otherUser.first_name} ${room.otherUser.last_name}`
                  : room.otherUser.display_name || 'User';
              return (
                <Pressable
                  key={room.id}
                  onPress={async () => {
                    setRooms(prev =>
                      prev.map(r =>
                        r.id === room.id
                          ? {
                              ...r,
                              unreadCount: 0,
                              lastMessage: r.lastMessage
                                ? { ...r.lastMessage, is_read: true }
                                : r.lastMessage,
                            }
                          : r
                      )
                    );
                    setSelectedRoomId(room.id);
                    if (user) {
                      try {
                        await supabase
                          .from('direct_messages')
                          .update({ is_read: true })
                          .eq('room_id', room.id)
                          .eq('is_read', false)
                          .neq('sender_id', user.id);
                      } catch (err) {
                        console.error('Error marking read:', err);
                      }
                    }
                  }}
                  className="w-full px-3 py-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="relative">
                      <Image
                        source={{ uri: getDmAvatar(room.otherUser.avatar_url) }}
                        className="w-14 h-14 rounded-full"
                      />
                      {room.unreadCount > 0 && (
                        <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#45C4A0] rounded-full" />
                      )}
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className="font-semibold text-base text-gray-900 flex-1"
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        {room.lastMessage && (
                          <Text className="ml-2 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {formatTime(room.lastMessage.created_at)}
                          </Text>
                        )}
                      </View>

                      {room.lastMessage ? (
                        <Text
                          className={`text-sm ${
                            room.unreadCount > 0
                              ? 'font-semibold text-gray-900'
                              : 'text-gray-500'
                          }`}
                          numberOfLines={1}
                        >
                          {room.lastMessage.content}
                        </Text>
                      ) : (
                        <Text className="text-sm text-gray-400 italic">
                          No messages yet
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Chat overlay */}
      {selectedRoomId && (() => {
        const selectedRoom = rooms.find(r => r.id === selectedRoomId);
        if (!selectedRoom || !selectedRoom.otherUser) return null;
        return (
          <View className="absolute inset-0 z-50 bg-white">
            <DirectMessageChat
              roomId={selectedRoomId}
              otherUser={selectedRoom.otherUser}
              onBack={() => setSelectedRoomId(null)}
            />
          </View>
        );
      })()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
});

export default DirectMessages;
