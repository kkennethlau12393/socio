import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { ChevronLeft, MoreVertical, Send } from 'lucide-react-native';
import { Society, Group } from '../types';

interface CommunityChatProps {
  community: Society | Group;
  type: 'society' | 'group';
  onBack: () => void;
  onLeave: () => void;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah Chen',
    userAvatar:
      'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    text: 'Hey everyone! Excited for the next meetup!',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'James Wilson',
    userAvatar:
      'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    text: 'Same here! Does anyone know what time it starts?',
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emma Rodriguez',
    userAvatar:
      'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    text: 'It starts at 6 PM. Looking forward to seeing everyone there!',
    timestamp: new Date(Date.now() - 1800000),
  },
];

export const CommunityChat: React.FC<CommunityChatProps> = ({
  community,
  type,
  onBack,
  onLeave,
}) => {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // slide-in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: 'currentUser',
      userName: 'You',
      userAvatar:
        'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=100',
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes <= 0) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const animateBack = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onBack();
    });
  };

  const membersLabel =
    typeof community.members === 'number'
      ? `${community.members} members`
      : type === 'society'
      ? 'Society chat'
      : 'Group chat';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        className="absolute inset-0 bg-white z-50"
        style={{
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* Header */}
        <View className="bg-white border-b border-gray-200 pt-10 px-4 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={animateBack}
              className="w-9 h-9 items-center justify-center -ml-1 mr-2 rounded-full bg-transparent"
            >
              <ChevronLeft size={22} color="#374151" />
            </Pressable>

            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full overflow-hidden mr-2">
                {community.image ? (
                  <Image
                    source={{ uri: community.image }}
                    className="w-full h-full"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-gray-100">
                    <Text className="text-gray-500 font-semibold">
                      {(community.name || '?')[0]}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-lg font-bold text-[#1e293b]"
                >
                  {community.name}
                </Text>
                <Text className="text-xs text-gray-500">
                  {membersLabel}
                </Text>
              </View>
              {('emoji' in community || false) && (community as any).emoji && (
                <Text className="ml-1 text-lg">
                  {(community as any).emoji}
                </Text>
              )}
            </View>
          </View>

          {/* Menu */}
          <View className="ml-2">
            <Pressable
              onPress={() => setShowMenu((v) => !v)}
              className="w-9 h-9 items-center justify-center rounded-full"
            >
              <MoreVertical size={18} color="#374151" />
            </Pressable>

            {showMenu && (
              <>
                {/* Tap-outside overlay */}
                <Pressable
                  onPress={() => setShowMenu(false)}
                  className="absolute -top-10 -left-40 right-0 bottom-0"
                />
                <View className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                  <Pressable
                    onPress={() => {
                      setShowMenu(false);
                      onLeave();
                    }}
                    className="px-4 py-2"
                  >
                    <Text className="text-red-600 text-sm font-medium">
                      Leave {type === 'society' ? 'Society' : 'Group'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => {
            const isCurrentUser = message.userId === 'currentUser';

            return (
              <View
                key={message.id}
                className={`flex-row mb-4 ${
                  isCurrentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isCurrentUser && (
                  <Image
                    source={{ uri: message.userAvatar }}
                    className="w-8 h-8 rounded-full mr-2 mt-1"
                  />
                )}

                <View
                  className={`max-w-[75%] ${
                    isCurrentUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {!isCurrentUser && (
                    <Text className="text-xs font-medium text-gray-600 mb-0.5">
                      {message.userName}
                    </Text>
                  )}

                  <View
                    className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                      isCurrentUser
                        ? 'bg-[#45C4A0] rounded-tr-md'
                        : 'bg-[#f1f3f5] rounded-tl-md'
                    }`}
                  >
                    <Text
                      className={`text-[14.5px] leading-5 ${
                        isCurrentUser
                          ? 'text-white'
                          : 'text-gray-900'
                      }`}
                    >
                      {message.text}
                    </Text>
                    <Text
                      className={`mt-1 text-[10px] ${
                        isCurrentUser
                          ? 'text-white/80'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>

                {isCurrentUser && (
                  <Image
                    source={{ uri: message.userAvatar }}
                    className="w-8 h-8 rounded-full ml-2 mt-1"
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Input bar */}
        <View className="px-4 pb-5 pt-2 border-t border-gray-100 bg-white">
          <View className="flex-row items-center bg-[#f8f9fa] px-3 py-1.5 rounded-full">
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message..."
              placeholderTextColor="#9ca3af"
              onSubmitEditing={handleSendMessage}
              className="flex-1 px-1 py-2 text-[15px] text-gray-900"
              multiline={false}
              returnKeyType="send"
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`w-9 h-9 rounded-full items-center justify-center ml-1 ${
                newMessage.trim()
                  ? 'bg-[#45C4A0]'
                  : 'bg-[#45C4A0]/40'
              }`}
            >
              <Send
                size={16}
                color="#ffffff"
              />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};
