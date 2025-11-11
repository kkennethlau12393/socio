import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { profile, user, refreshProfile } = useAuth();

  const [username, setUsername] = useState(profile?.username || '');
  const [yearOfStudy, setYearOfStudy] = useState(
    (profile?.year_of_study as string | number | null) || ''
  );
  const [degree, setDegree] = useState(profile?.degree || '');
  const [nationality, setNationality] = useState(profile?.nationality || '');
  const [universityName, setUniversityName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Animations
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Animate in on mount
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
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
  }, [backdropOpacity, sheetTranslateY]);

  // Fetch university display name
  useEffect(() => {
    const fetchUniversity = async () => {
      try {
        if (profile?.university_id) {
          const { data } = await supabase
            .from('universities')
            .select('name')
            .eq('id', profile.university_id)
            .maybeSingle();

          if (data) setUniversityName(data.name);
        }
      } catch (err) {
        console.log('Error fetching university', err);
      }
    };
    fetchUniversity();
  }, [profile?.university_id]);

  const animateClose = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 40,
        duration: 200,
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

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoadingProfile(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username || null,
          year_of_study: yearOfStudy || null,
          degree: degree || null,
          nationality: nationality || null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoadingPassword(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Change password error:', err);
      setError(err.message || 'Failed to change password');
    } finally {
      setLoadingPassword(false);
    }
  };

  const yearOptions = [
    { label: 'Select year', value: '' },
    { label: '1st Year', value: '1' },
    { label: '2nd Year', value: '2' },
    { label: '3rd Year', value: '3' },
    { label: '4th Year', value: '4' },
    { label: 'Masters', value: 'Masters' },
    { label: 'PhD', value: 'PhD' },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropOpacity,
          },
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View className="px-5 pb-3 pt-3 flex-row items-center justify-between border-b border-gray-100">
          <Text className="text-xl font-bold text-slate-900">Settings</Text>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.85}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={18} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Alerts */}
          {error ? (
            <View className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
              <Text className="text-xs text-red-700">{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <Text className="text-xs text-emerald-700">{success}</Text>
            </View>
          ) : null}

          {/* Profile Information */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-slate-900 mb-3">
              Profile Information
            </Text>

            {/* Username */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                autoCapitalize="none"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[14px] text-slate-900"
              />
            </View>

            {/* Year of Study selector */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Year of Study
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {yearOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => setYearOfStudy(opt.value)}
                    activeOpacity={0.9}
                    className={`px-3 py-1.5 rounded-full border ${
                      String(yearOfStudy) === String(opt.value)
                        ? 'bg-[#45C4A0] border-[#45C4A0]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-medium ${
                        String(yearOfStudy) === String(opt.value)
                          ? 'text-white'
                          : 'text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Degree */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Degree
              </Text>
              <TextInput
                value={degree}
                onChangeText={setDegree}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[14px] text-slate-900"
              />
            </View>

            {/* Nationality */}
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Nationality
              </Text>
              <TextInput
                value={nationality}
                onChangeText={setNationality}
                placeholder="e.g., British, American"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[14px] text-slate-900"
              />
            </View>

            {/* University */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                University
              </Text>
              <View className="w-full px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-100">
                <Text className="text-[13px] text-slate-600">
                  {universityName || 'Not set'}
                </Text>
              </View>
              <Text className="mt-1 text-[9px] text-slate-400">
                Automatically detected from your university email.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={loadingProfile}
              activeOpacity={0.9}
              className={`w-full py-3 rounded-2xl items-center justify-center ${
                loadingProfile ? 'bg-[#45C4A0]/70' : 'bg-[#45C4A0]'
              }`}
            >
              <Text className="text-white font-semibold text-sm">
                {loadingProfile ? 'Saving...' : 'Save Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Change Password */}
          <View>
            <Text className="text-base font-semibold text-slate-900 mb-3">
              Change Password
            </Text>

            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                New Password
              </Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[14px] text-slate-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[14px] text-slate-900"
              />
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={
                loadingPassword || !newPassword || !confirmPassword
              }
              activeOpacity={0.9}
              className={`w-full py-3 rounded-2xl items-center justify-center ${
                loadingPassword || !newPassword || !confirmPassword
                  ? 'bg-[#45C4A0]/60'
                  : 'bg-[#45C4A0]'
              }`}
            >
              <Text className="text-white font-semibold text-sm">
                {loadingPassword ? 'Changing...' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 16,
  },
});

export default SettingsModal;
