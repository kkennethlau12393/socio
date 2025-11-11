import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
  Image,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function notifyDmThreadRead(roomId: string) {
  DeviceEventEmitter.emit('dm-thread-read', roomId);
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

export const DirectMessageChat: React.FC<DirectMessageChatProps> = ({
  roomId,
  otherUser,
  onBack,
}) => {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);

  // Animations: slide in/out from right
  const translateX = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const animateExitAndGoBack = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 40,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        notifyDmThreadRead(roomId);
        onBack();
      }
    });
  }, [onBack, roomId, translateX]);

  // Load + subscribe
  useEffect(() => {
    if (!user || !roomId) return;

    let isMounted = true;

    const init = async () => {
      await loadMessages();
      if (isMounted) {
        await markMessagesAsRead();
      }
    };

    init();

    const unsubscribe = subscribeToMessages();

    return () => {
      isMounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roomId]);

  // Initial scroll after load
  useEffect(() => {
    if (!loading) {
      scrollToBottom(false);
    }
  }, [loading]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  // App foreground => mark read
  useEffect(() => {
    if (!user || !roomId) return;

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        markMessagesAsRead();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user?.id, roomId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(prev =>
          prev.map(msg =>
            msg.sender_id !== user.id && !msg.is_read
              ? { ...msg, is_read: true }
              : msg
          )
        );
        notifyDmThreadRead(roomId);
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`dm_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `room_id=eq.${roomId}`,
        },
        payload => {
          const newMsg = payload.new as Message;

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.sender_id !== user?.id) {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = (animated: boolean) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollToEnd({ animated });
  };

  const handleBack = () => {
    animateExitAndGoBack();
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(content); // restore so user can retry
    } finally {
      setSending(false);
    }
  };

  const handleSubmitEditing = () => {
    if (!sending) {
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() !== today.getFullYear()
          ? 'numeric'
          : undefined,
    });
  };

  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== prevDate;
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        style={[
          styles.flex,
          { backgroundColor: '#ffffff' },
          { transform: [{ translateX }] },
        ]}
      >
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={handleBack}
              className="p-2 -ml-2 rounded-full"
            >
              <ArrowLeft size={20} color="#4b5563" />
            </Pressable>

            <Image
              source={{
                uri:
                  otherUser.avatar_url ||
                  'https://placehold.co/80x80?text=U',
              }}
              className="w-10 h-10 rounded-full"
            />

            <View className="flex-1">
              <Text
                className="font-semibold text-gray-900"
                numberOfLines={1}
              >
                {otherUser.first_name && otherUser.last_name
                  ? `${otherUser.first_name} ${otherUser.last_name}`
                  : otherUser.display_name}
              </Text>
              {otherUser.username ? (
                <Text
                  className="text-xs text-gray-500"
                  numberOfLines={1}
                >
                  {otherUser.username}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 py-3"
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View className="flex-1 items-center justify-center mt-12">
              <ActivityIndicator size="small" color="#45C4A0" />
            </View>
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center mt-12">
              <Text className="text-gray-500 mb-1">
                No messages yet
              </Text>
              <Text className="text-xs text-gray-400">
                Send a message to start the conversation
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showDate = shouldShowDateDivider(index);

              return (
                <View key={message.id}>
                  {showDate && (
                    <View className="items-center my-3">
                      <View className="bg-gray-100 px-3 py-1 rounded-full">
                        <Text className="text-[10px] font-medium text-gray-600">
                          {formatDate(message.created_at)}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View
                    className={`flex-row mb-1 ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <View
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                        isOwn ? 'bg-[#45C4A0]' : 'bg-gray-100'
                      }`}
                    >
                      <View className="flex-row items-end gap-2">
                        <Text
                          className={`flex-1 text-[15px] leading-[1.4] ${
                            isOwn ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {message.content}
                        </Text>
                        <Text
                          className={`text-[9px] ${
                            isOwn ? 'text-white/70' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input */}
        <View className="border-t border-gray-200 px-4 py-3 bg-white">
          <View className="flex-row items-center gap-2">
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              onSubmitEditing={handleSubmitEditing}
              blurOnSubmit={false}
              multiline
              maxLength={2000}
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] text-gray-900 max-h-28"
            />
            <Pressable
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
              className={`w-9 h-9 rounded-full items-center justify-center ${
                newMessage.trim() && !sending
                  ? 'bg-[#45C4A0]'
                  : 'bg-gray-300'
              }`}
            >
              <Send size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
