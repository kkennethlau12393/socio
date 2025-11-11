import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Mail } from 'lucide-react-native';

export interface EmailVerificationScreenProps {
  email: string;
  onBackToLogin: () => void;   // -> show AuthScreen (login)
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  onBackToLogin,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoBack = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // small delay just to show feedback
    setTimeout(() => {
      setIsLoading(false);
      onBackToLogin(); // simply go back to AuthScreen (login)
    }, 400);
  };

  return (
    <View className="flex-1 bg-white px-6 items-center justify-center">
      <View className="w-full max-w-[380px] bg-[#f9fafb] rounded-3xl p-8 shadow-sm border border-gray-100 items-center">
        {/* Icon */}
        <View className="w-20 h-20 rounded-full bg-[#45C4A0]/10 items-center justify-center mb-5">
          <Mail size={42} color="#45C4A0" />
        </View>

        {/* Title + Email */}
        <Text className="text-2xl font-semibold text-slate-900 mb-2">
          Verify your email
        </Text>
        <Text className="text-sm text-gray-600 text-center mb-2">
          We’ve sent a verification link to:
        </Text>
        <Text className="text-base font-medium text-[#45C4A0] text-center mb-8">
          {email}
        </Text>

        {/* “I've verified” button that just returns to login */}
        <Pressable
          onPress={handleGoBack}
          disabled={isLoading}
          className={`w-full py-4 rounded-2xl items-center justify-center ${
            isLoading ? 'bg-[#45C4A0]/60' : 'bg-[#45C4A0]'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              I’ve verified my email
            </Text>
          )}
        </Pressable>

        <Text className="text-xs text-gray-500 mt-6 text-center">
          After verifying your email, tap this button to log in.
        </Text>
      </View>
    </View>
  );
};

export default EmailVerificationScreen;
