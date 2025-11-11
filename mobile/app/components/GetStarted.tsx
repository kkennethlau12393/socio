import React, { useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface GetStartedProps {
  onGetStarted: () => void;
}

// Supabase: background
const GET_STARTED_BG_URL = (() => {
  try {
    const { data } = supabase
      .storage
      .from('Background')
      .getPublicUrl('Get_Started/cover.jpg');
    return data?.publicUrl || '';
  } catch {
    return '';
  }
})();

// Supabase: logo
const LOGO_URL = (() => {
  try {
    const { data } = supabase
      .storage
      .from('Logo')
      .getPublicUrl('Logo/socio_real.png');
    return data?.publicUrl || '';
  } catch {
    return '';
  }
})();

// Fallback background
const FALLBACK_BG =
  'https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1920';

export const GetStarted: React.FC<GetStartedProps> = ({ onGetStarted }) => {
  const bgSource = {
    uri: GET_STARTED_BG_URL || FALLBACK_BG,
  };

  // Animated scale for button
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    onGetStarted();
  };

  return (
    <View className="flex-1 relative overflow-hidden items-center justify-center bg-slate-900">
      {/* Background image with dark navy overlay */}
      <ImageBackground
        source={bgSource}
        resizeMode="cover"
        blurRadius={4}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={styles.overlay} />
      </ImageBackground>

      {/* Content */}
      <View className="relative z-10 max-w-md w-full px-8 items-center">
        <View className="mb-12 items-center">
          <View className="mt-7 mb-8 items-center justify-center">
            {LOGO_URL ? (
              <Image
                source={{ uri: LOGO_URL }}
                resizeMode="contain"
                style={{
                  width: 216.66667,
                  height: 65,
                }}
              />
            ) : (
              <Text
                className="text-8xl text-[#45C4A0] mb-2"
                style={{ fontWeight: '800' }}
              >
                socio
              </Text>
            )}
          </View>

          <Text className="-mt-0.5 text-xl text-white/90 font-light text-center tracking-wider">
            Connect with your campus{'\n'}community
          </Text>
        </View>

        {/* Animated Get Started button */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 8,
            width: '91.666667%', // w-11/12 to match className
          }}
        >
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            android_ripple={{
              color: 'rgba(0,0,0,0.15)',
              borderless: false,
            }}
            className="py-4 rounded-2xl bg-[#45C4A0] items-center justify-center"
          >
            <Text className="text-white font-semibold text-base ml-0.5">
              Get Started
            </Text>
          </Pressable>
        </Animated.View>

        <Text className="mt-8 text-sm text-white/60 text-center">
          Join thousands of students already using Socio
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 15, 35, 0.8)',
  },
});
