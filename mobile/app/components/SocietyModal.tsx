import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { X, Users, Calendar, MapPin } from 'lucide-react-native';
import { Society } from '../types';

interface SocietyModalProps {
  society: Society;
  onClose: () => void;
  onFollow: () => void;
}

export const SocietyModal: React.FC<SocietyModalProps> = ({
  society,
  onClose,
  onFollow,
}) => {
  const translateY = useRef(new Animated.Value(400)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Enter: fade in overlay + slide sheet up
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, translateY]);

  const runCloseAnimation = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 400,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) cb();
    });
  };

  const handleClose = () => {
    runCloseAnimation(onClose);
  };

  const handleFollow = () => {
    onFollow();
    // optional: you can keep modal open or close on follow
    // runCloseAnimation(onClose);
  };

  return (
    <View className="absolute inset-0 z-50">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          pointerEvents="auto"
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-black/50"
        />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <Animated.View
        style={{
          transform: [{ translateY }],
        }}
        className="absolute bottom-0 left-0 right-0 max-h-[90%] bg-white rounded-t-3xl shadow-2xl"
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
              android_ripple={{
                color: 'rgba(0,0,0,0.06)',
                borderless: true,
              }}
            >
              <X size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Cover image */}
          {society.image ? (
            <View className="w-full h-56 -mt-4 mb-2 overflow-hidden rounded-t-3xl">
              <Image
                source={{ uri: society.image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          ) : null}

          <View className="px-6">
            {/* Header */}
            <View className="flex-row items-start gap-3 mb-4">
              <Text className="text-4xl">{society.emoji}</Text>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-[#1e293b] mb-1">
                  {society.name}
                </Text>
                <View className="px-3 py-1 bg-[#45C4A0]/10 rounded-full self-start">
                  <Text className="text-[10px] font-semibold text-[#45C4A0]">
                    {society.category || 'Society'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Details */}
            <View className="space-y-4 mb-6">
              {/* Members */}
              <View className="flex-row items-start gap-3">
                <Users
                  size={20}
                  color="#45C4A0"
                  className="mt-0.5"
                />
                <View>
                  <Text className="text-xs font-semibold text-gray-500">
                    Members
                  </Text>
                  <Text className="text-base text-gray-800">
                    {society.members} members
                  </Text>
                </View>
              </View>

              {/* Next Event */}
              {society.nextEvent ? (
                <View className="flex-row items-start gap-3">
                  <Calendar
                    size={20}
                    color="#45C4A0"
                    className="mt-0.5"
                  />
                  <View>
                    <Text className="text-xs font-semibold text-gray-500">
                      Next Event
                    </Text>
                    <Text className="text-base text-gray-800">
                      {society.nextEvent}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Location (optional if exists on model) */}
              {(society as any).location && (
                <View className="flex-row items-start gap-3">
                  <MapPin
                    size={20}
                    color="#45C4A0"
                    className="mt-0.5"
                  />
                  <View>
                    <Text className="text-xs font-semibold text-gray-500">
                      Location
                    </Text>
                    <Text className="text-base text-gray-800">
                      {(society as any).location}
                    </Text>
                  </View>
                </View>
              )}

              {/* About */}
              <View>
                <Text className="text-xs font-semibold text-gray-500 mb-2">
                  About
                </Text>
                <Text className="text-sm text-gray-700 leading-relaxed">
                  {society.description}
                </Text>
              </View>
            </View>

            {/* Follow button */}
            <Pressable
              onPress={handleFollow}
              android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
              className="w-full py-4 bg-[#45C4A0] rounded-xl items-center justify-center"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],
                shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
                shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0,
                shadowRadius: Platform.OS === 'ios' ? 8 : 0,
                shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 4 } : { width: 0, height: 0 },
              })}
            >
              <Text className="text-white font-semibold text-base">
                Follow Society
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default SocietyModal;
