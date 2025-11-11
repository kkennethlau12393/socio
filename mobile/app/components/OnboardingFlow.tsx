// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingFlowProps {
  onComplete: () => void; // called after profile is saved & refreshProfile run
  onBack: () => void;     // back to auth/login
}

const availableInterests = [
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Sports', emoji: '⚽' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Technology', emoji: '💻' },
  { name: 'Arts', emoji: '🎨' },
  { name: 'Photography', emoji: '📸' },
  { name: 'Fitness', emoji: '💪' },
  { name: 'Cooking', emoji: '🍳' },
  { name: 'Travel', emoji: '✈️' },
  { name: 'Reading', emoji: '📚' },
  { name: 'Movies', emoji: '🎬' },
  { name: 'Coffee', emoji: '☕' },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onBack,
}) => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [yearFieldLayout, setYearFieldLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const yearFieldRef = useRef<View | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    nationality: '',
    degree: '',
    yearOfStudy: '',
    interests: [] as string[],
  });

  const yearOptions = [
    { label: 'Year 1', value: '1' },
    { label: 'Year 2', value: '2' },
    { label: 'Year 3', value: '3' },
    { label: 'Year 4', value: '4' },
    { label: 'Year 5+', value: '5' },
  ];

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'No active user. Please log in again.');
      return;
    }

    if (!formData.username.trim() || formData.interests.length === 0) {
      Alert.alert(
        'Complete your profile',
        'Please choose a username and at least one interest.',
      );
      return;
    }

    const email =
      user.email ||
      user.user_metadata?.email ||
      null;

    if (!email) {
      Alert.alert(
        'Error',
        'Missing email for this account. Please log out and sign in again.'
      );
      return;
    }

    // Pull first/last name from auth metadata (set during signup)
    const metaFirstName =
      (user.user_metadata?.first_name || '').trim() || null;
    const metaLastName =
      (user.user_metadata?.last_name || '').trim() || null;

    const username = formData.username.trim();

    setLoading(true);

    try {
      // Ensure username unique (excluding self)
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id);

      if (existingError) {
        console.error('Username check error:', existingError);
      }

      if (existing && existing.length > 0) {
        setLoading(false);
        Alert.alert(
          'Username taken',
          'That username is already in use. Please choose another.',
        );
        return;
      }

      const payload: any = {
        id: user.id,
        email, // NOT NULL
        username,
        // ✅ store names into profiles
        first_name: metaFirstName,
        last_name: metaLastName,
        nationality: formData.nationality?.trim() || null,
        degree: formData.degree?.trim() || null,
        year_of_study: formData.yearOfStudy
          ? parseInt(formData.yearOfStudy, 10)
          : null,
        interests: formData.interests,
        display_name:
          (
            `${metaFirstName || ''} ${metaLastName || ''}`.trim() ||
            username
          ),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Profile update error:', error);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        setLoading(false);
        return;
      }

      await refreshProfile();
      setLoading(false);
      onComplete();
    } catch (err: any) {
      console.error('Onboarding exception:', err);
      Alert.alert('Error', 'An error occurred while saving your profile.');
      setLoading(false);
    }
  };

  const firstName = user?.user_metadata?.first_name || 'there';
  const selectedYearLabel =
    yearOptions.find((y) => y.value === formData.yearOfStudy)?.label ||
    'Select year';

  return (
    <View className="flex-1 bg-[#f4faf8] px-6 py-8">
      {/* Back button */}
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={{ position: 'absolute', top: 50, left: 24, zIndex: 50 }}
      >
        <ArrowLeft size={26} color="#4b5563" />
      </TouchableOpacity>

      <View className="flex-1 items-center pt-16">
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="items-center mb-6">
              <Text className="text-5xl mb-3">👋</Text>
              <Text className="text-3xl font-bold text-slate-900 mb-1">
                Hi {firstName}!
              </Text>
              <Text className="text-slate-600 text-base">
                Let&apos;s complete your profile
              </Text>
            </View>

            {/* Username */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1 pl-1">
                Username <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={formData.username}
                onChangeText={(t) =>
                  setFormData((p) => ({ ...p, username: t }))
                }
                placeholder="username"
                autoCapitalize="none"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-[15px] text-slate-900"
              />
            </View>

            {/* Nationality */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1 pl-1">
                Nationality
              </Text>
              <TextInput
                value={formData.nationality}
                onChangeText={(t) =>
                  setFormData((p) => ({ ...p, nationality: t }))
                }
                placeholder="e.g., British, American"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-[15px] text-slate-900"
              />
            </View>

            {/* Degree */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1 pl-1">
                Degree
              </Text>
              <TextInput
                value={formData.degree}
                onChangeText={(t) =>
                  setFormData((p) => ({ ...p, degree: t }))
                }
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-[15px] text-slate-900"
              />
            </View>

            {/* Year of Study dropdown */}
            <View
              className="mb-4"
              ref={yearFieldRef}
              onLayout={() => {
                yearFieldRef.current?.measureInWindow(
                  (x, y, width, height) => {
                    setYearFieldLayout({ x, y, width, height });
                  },
                );
              }}
            >
              <Text className="text-xs font-semibold text-slate-700 mb-2 pl-1">
                Year of Study
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  yearFieldRef.current?.measureInWindow(
                    (x, y, width, height) => {
                      setYearFieldLayout({ x, y, width, height });
                      setShowYearPicker(true);
                    },
                  );
                }}
                className="flex-row items-center justify-between px-4 py-3 rounded-2xl border border-gray-200 bg-white"
              >
                <Text
                  className={`text-[15px] ${
                    formData.yearOfStudy
                      ? 'text-slate-900'
                      : 'text-gray-400'
                  }`}
                >
                  {selectedYearLabel}
                </Text>
                <Text className="text-gray-400 text-xs">▼</Text>
              </TouchableOpacity>
            </View>

            {/* Interests */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1 pl-1">
                Interests <Text className="text-red-500">*</Text>
              </Text>
              <Text className="text-[10px] text-slate-500 mb-2 pl-1">
                Select at least one interest
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {availableInterests.map((i) => {
                  const selected =
                    formData.interests.includes(i.name);
                  return (
                    <TouchableOpacity
                      key={i.name}
                      activeOpacity={0.9}
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          interests: selected
                            ? prev.interests.filter(
                                (x) => x !== i.name,
                              )
                            : [...prev.interests, i.name],
                        }))
                      }
                      className={`w-[48%] mb-2 px-3 py-2.5 rounded-2xl items-center ${
                        selected
                          ? 'bg-[#45C4A0] shadow-md'
                          : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <Text
                        className={`text-2xl mb-1 ${
                          selected
                            ? 'text-white'
                            : 'text-slate-800'
                        }`}
                      >
                        {i.emoji}
                      </Text>
                      <Text
                        className={`text-xs font-medium ${
                          selected
                            ? 'text-white'
                            : 'text-slate-800'
                        }`}
                      >
                        {i.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Complete button */}
            <TouchableOpacity
              onPress={handleComplete}
              disabled={loading}
              activeOpacity={0.9}
              className={`w-full py-4 rounded-2xl items-center justify-center ${
                loading ? 'bg-[#45C4A0]/60' : 'bg-[#45C4A0]'
              }`}
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Saving...' : 'Complete your profile'}
              </Text>
            </TouchableOpacity>

            <Text className="mt-3 text-[10px] text-center text-slate-500">
              * Required fields
            </Text>
          </ScrollView>
        </View>
      </View>

      {/* Year dropdown overlay */}
      {showYearPicker && yearFieldLayout && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowYearPicker(false)}
        >
          <View
            style={[
              styles.dropdownBox,
              {
                top:
                  yearFieldLayout.y +
                  yearFieldLayout.height +
                  5,
                left: yearFieldLayout.x,
                width: yearFieldLayout.width,
              },
            ]}
          >
            {yearOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setFormData((prev) => ({
                    ...prev,
                    yearOfStudy: opt.value,
                  }));
                  setShowYearPicker(false);
                }}
                style={[
                  styles.dropdownOption,
                  formData.yearOfStudy === opt.value &&
                    styles.dropdownOptionActive,
                ]}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    formData.yearOfStudy === opt.value &&
                      styles.dropdownTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  dropdownBox: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 999,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginVertical: 1,
    borderRadius: 10,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(69,196,160,0.12)',
  },
  dropdownText: {
    fontSize: 14,
    color: '#111827',
  },
  dropdownTextActive: {
    color: '#45C4A0',
    fontWeight: '600',
  },
});

export default OnboardingFlow;
