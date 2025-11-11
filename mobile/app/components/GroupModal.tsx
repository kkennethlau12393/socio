import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { X, Users, Calendar } from 'lucide-react-native';
import { Group } from '../types';

interface GroupModalProps {
  group: Group;
  onClose: () => void;
  onJoin: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  group,
  onClose,
  onJoin,
}) => {
  const sheetTranslateY = useRef(new Animated.Value(40)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in on mount
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, sheetTranslateY]);

  const animateClose = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 40,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) cb();
    });
  };

  const handleClose = () => {
    animateClose(onClose);
  };

  const handleJoinPress = () => {
    // Keep UX snappy: call onJoin, let parent decide what to do next
    onJoin();
  };

  return (
    <View style={StyleSheet.absoluteFill} className="z-50">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          className="absolute inset-0 bg-black/50"
          style={{ opacity: overlayOpacity }}
        />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 max-h-[90%] bg-white rounded-t-3xl shadow-2xl"
        style={{ transform: [{ translateY: sheetTranslateY }] }}
      >
        <ScrollView
          className="w-full"
          contentContainerStyle={{ paddingBottom: 24 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Close button */}
          <View className="items-end pt-4 pr-4">
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow"
            >
              <X size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Cover image */}
          {group.image ? (
            <View className="w-full h-64 -mt-6 mb-2 overflow-hidden rounded-t-3xl">
              <Image
                source={{ uri: group.image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          ) : null}

          <View className="px-6">
            {/* Header */}
            <View className="flex-row items-start gap-3 mb-4">
              <Text className="text-4xl">{group.emoji}</Text>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-[#1e293b] mb-1">
                  {group.name}
                </Text>
                <View className="px-3 py-1 bg-[#45C4A0]/10 rounded-full self-start">
                  <Text className="text-[10px] font-semibold text-[#45C4A0]">
                    Group
                  </Text>
                </View>
              </View>
            </View>

            {/* Details */}
            <View className="space-y-4 mb-6">
              <View className="flex-row items-start gap-3">
                <Users
                  size={20}
                  color="#45C4A0"
                />
                <View>
                  <Text className="text-xs font-semibold text-gray-500">
                    Members
                  </Text>
                  <Text className="text-base text-gray-800">
                    {group.members} members
                  </Text>
                </View>
              </View>

              {group.nextEvent ? (
                <View className="flex-row items-start gap-3">
                  <Calendar
                    size={20}
                    color="#45C4A0"
                  />
                  <View>
                    <Text className="text-xs font-semibold text-gray-500">
                      Next Event
                    </Text>
                    <Text className="text-base text-gray-800">
                      {group.nextEvent}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View>
                <Text className="text-xs font-semibold text-gray-500 mb-2">
                  About
                </Text>
                <Text className="text-sm text-gray-700 leading-relaxed">
                  {group.description}
                </Text>
              </View>
            </View>

            {/* Join button */}
            <Pressable
              onPress={handleJoinPress}
              className="w-full py-4 bg-[#45C4A0] rounded-xl items-center justify-center"
              android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  shadowOpacity: pressed ? 0.15 : 0.25,
                },
              ]}
            >
              <Text className="text-white font-semibold text-base">
                Join Group
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};
