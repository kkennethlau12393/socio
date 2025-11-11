import React, {
  useState,
  useEffect,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Settings,
  LogOut,
  Plus,
  Calendar,
  Users,
  Award,
  Sparkles,
  UserPlus,
  Heart,
  Camera,
  ChevronLeft,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../contexts/AuthContext';
import { AddInterestModal } from '../AddInterestModal';
import { SettingsModal } from '../SettingsModal';
import { supabase } from '../../lib/supabase';
import UserProfileModal from '../UserProfileModal';

type ProfileView = 'main' | 'followers' | 'following';

const AVAILABLE_INTERESTS = [
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

interface ProfileTabProps {
  onNavigateToCommunity?: () => void;
  onNavigateToMyCommunity?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  onNavigateToCommunity,
  onNavigateToMyCommunity,
}) => {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [universityName, setUniversityName] = useState('');
  const [communityCount, setCommunityCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentView, setCurrentView] =
    useState<ProfileView>('main');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Effects ---

  useEffect(() => {
    const fetchUniversity = async () => {
      if (profile?.university_id) {
        const { data } = await supabase
          .from('universities')
          .select('name')
          .eq('id', profile.university_id)
          .maybeSingle();

        if (data) setUniversityName(data.name);
      }
    };
    fetchUniversity();
  }, [profile]);

  useEffect(() => {
    const fetchCommunityCount = async () => {
      if (!user) {
        setCommunityCount(0);
        return;
      }

      const [groupsResult, societiesResult] =
        await Promise.all([
          supabase
            .from('group_members')
            .select('group_id', {
              count: 'exact',
              head: true,
            })
            .eq('user_id', user.id),
          supabase
            .from('follows')
            .select('following_id', {
              count: 'exact',
              head: true,
            })
            .eq('follower_id', user.id)
            .eq('following_type', 'society'),
        ]);

      const groupCount = groupsResult.count || 0;
      const societyCount = societiesResult.count || 0;
      setCommunityCount(groupCount + societyCount);
    };

    fetchCommunityCount();
    fetchFollowCounts();
  }, [user]);

  const fetchFollowCounts = async () => {
    if (!user) {
      setFollowersCount(0);
      setFollowingCount(0);
      return;
    }

    try {
      const [followersRes, followingRes] =
        await Promise.all([
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', user.id),
          supabase
            .from('followers')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', user.id),
        ]);

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
    } catch (error) {
      console.error(
        'Error fetching follow counts:',
        error
      );
    }
  };

  const fetchFollowers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(
          `
          follower_id,
          profiles!followers_follower_id_fkey(*)
        `
        )
        .eq('following_id', user.id);

      if (error) throw error;
      setFollowers(
        data?.map((f: any) => f.profiles) || []
      );
      setSearchQuery('');
      setCurrentView('followers');
    } catch (error) {
      console.error(
        'Error fetching followers:',
        error
      );
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(
          `
          following_id,
          profiles!followers_following_id_fkey(*)
        `
        )
        .eq('follower_id', user.id);

      if (error) throw error;
      setFollowing(
        data?.map((f: any) => f.profiles) || []
      );
      setSearchQuery('');
      setCurrentView('following');
    } catch (error) {
      console.error(
        'Error fetching following:',
        error
      );
    }
  };

  // --- Avatar upload (Expo) ---

  const handleAvatarClick = async () => {
    if (!user) return;

    try {
      const {
        status,
      } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.warn(
          'Permission to access media library denied'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });

      if (
        result.canceled ||
        !result.assets ||
        !result.assets.length
      ) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.base64) {
        console.warn('No base64 data from picker');
        return;
      }

      setUploadingAvatar(true);

      const base64String = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: base64String })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      console.error(
        'Error uploading avatar:',
        error
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // --- Interests ---

  const handleAddInterest = async (
    interests: string[]
  ) => {
    if (!user || !profile) return;

    await supabase
      .from('profiles')
      .update({ interests })
      .eq('id', user.id);

    await refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // ===== Views =====

  if (!user) {
    return (
      <View className="flex-1 bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50 pt-6 px-4">
        <View className="flex-1 items-center justify-center">
          <View className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 items-center">
            <View className="w-20 h-20 bg-gradient-to-br from-[#45C4A0] to-[#3ab592] rounded-3xl items-center justify-center mb-4">
              <User
                size={40}
                color="#ffffff"
              />
            </View>
            <Text className="text-2xl font-bold text-[#1e293b] mb-2">
              Sign In Required
            </Text>
            <Text className="text-gray-600 text-center">
              Sign in to view your profile and manage your
              account.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Followers list view
  if (currentView === 'followers') {
    const filtered = followers.filter(
      (u) => {
        const q = searchQuery.toLowerCase();
        return (
          u.username?.toLowerCase().includes(q) ||
          u.first_name
            ?.toLowerCase()
            .includes(q) ||
          u.last_name
            ?.toLowerCase()
            .includes(q)
        );
      }
    );

    return (
      <View className="flex-1 bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50">
        {/* Header */}
        <View className="pt-10 pb-3 px-4 bg-white/95 border-b border-gray-200 flex-row items-center gap-3">
          <Pressable
            onPress={() =>
              setCurrentView('main')
            }
            className="p-2 rounded-xl active:bg-gray-100"
          >
            <ChevronLeft
              size={22}
              color="#4b5563"
            />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">
              Followers
            </Text>
            <Text className="text-xs text-gray-500">
              {followersCount} followers
            </Text>
          </View>
        </View>

        {/* Search + list */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
          }}
        >
          <TextInput
            placeholder="Search followers..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full px-4 py-3 mb-4 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800"
          />

          {followers.length === 0 ? (
            <View className="items-center py-12">
              <UserPlus
                size={64}
                color="#d1d5db"
              />
              <Text className="mt-4 text-gray-500">
                No followers yet
              </Text>
              <Text className="text-gray-400 text-xs">
                Share your profile to get followers
              </Text>
            </View>
          ) : (
            filtered.map((f) => (
              <Pressable
                key={f.id}
                onPress={() =>
                  setSelectedUserId(f.id)
                }
                className="w-full bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center gap-3"
              >
                {f.avatar_url ? (
                  <Image
                    source={{
                      uri: f.avatar_url,
                    }}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
                    <User
                      size={20}
                      color="#9ca3af"
                    />
                  </View>
                )}
                <View>
                  <Text className="font-semibold text-gray-900">
                    {f.username}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {f.first_name}{' '}
                    {f.last_name}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        {selectedUserId && (
          <UserProfileModal
            userId={selectedUserId}
            onClose={() => {
              setSelectedUserId(null);
              fetchFollowCounts();
              fetchFollowers();
            }}
            onFollowChange={() => {
              fetchFollowCounts();
              fetchFollowers();
            }}
          />
        )}
      </View>
    );
  }

  // Following list view
  if (currentView === 'following') {
    const filtered = following.filter(
      (u) => {
        const q = searchQuery.toLowerCase();
        return (
          u.username?.toLowerCase().includes(q) ||
          u.first_name
            ?.toLowerCase()
            .includes(q) ||
          u.last_name
            ?.toLowerCase()
            .includes(q)
        );
      }
    );

    return (
      <View className="flex-1 bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50">
        {/* Header */}
        <View className="pt-10 pb-3 px-4 bg-white/95 border-b border-gray-200 flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              setCurrentView('main');
              fetchFollowCounts();
            }}
            className="p-2 rounded-xl active:bg-gray-100"
          >
            <ChevronLeft
              size={22}
              color="#4b5563"
            />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">
              Following
            </Text>
            <Text className="text-xs text-gray-500">
              {followingCount} following
            </Text>
          </View>
        </View>

        {/* Search + list */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
          }}
        >
          <TextInput
            placeholder="Search following..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="w-full px-4 py-3 mb-4 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800"
          />

          {following.length === 0 ? (
            <View className="items-center py-12">
              <Heart
                size={64}
                color="#d1d5db"
              />
              <Text className="mt-4 text-gray-500">
                Not following anyone yet
              </Text>
              <Text className="text-gray-400 text-xs">
                Start following people to see
                them here
              </Text>
            </View>
          ) : (
            filtered.map((f) => (
              <Pressable
                key={f.id}
                onPress={() =>
                  setSelectedUserId(f.id)
                }
                className="w-full bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center gap-3"
              >
                {f.avatar_url ? (
                  <Image
                    source={{
                      uri: f.avatar_url,
                    }}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
                    <User
                      size={20}
                      color="#9ca3af"
                    />
                  </View>
                )}
                <View>
                  <Text className="font-semibold text-gray-900">
                    {f.username}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {f.first_name}{' '}
                    {f.last_name}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>

        {selectedUserId && (
          <UserProfileModal
            userId={selectedUserId}
            onClose={() => {
              setSelectedUserId(null);
              fetchFollowCounts();
            }}
            onFollowChange={fetchFollowCounts}
          />
        )}
      </View>
    );
  }

  // Main profile view
  const handleCommunityPress = () => {
    if (onNavigateToMyCommunity) {
      onNavigateToMyCommunity();
    } else if (onNavigateToCommunity) {
      onNavigateToCommunity();
    }
  };

  return (
    <View className="flex-1 bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50">
      <ScrollView
        contentContainerStyle={{
          paddingTop: 24,
          paddingHorizontal: 16,
          paddingBottom: 32,
        }}
      >
        {/* Top card */}
        <View className="relative overflow-hidden bg-gradient-to-br from-[#45C4A0] via-[#3ab592] to-[#2da885] rounded-3xl shadow-2xl p-8">
          <View className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
          <View className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />

          <View className="relative flex-row items-start justify-between">
            {/* Avatar + name */}
            <View className="flex-row gap-4">
              <Pressable
                onPress={handleAvatarClick}
                className="relative"
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{
                      uri: profile.avatar_url,
                    }}
                    className="w-20 h-20 rounded-2xl border-4 border-white/30"
                  />
                ) : (
                  <View className="w-20 h-20 bg-white/20 rounded-2xl border-4 border-white/30 items-center justify-center">
                    <User
                      size={36}
                      color="#ffffff"
                    />
                  </View>
                )}
                <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#45C4A0] items-center justify-center">
                  {uploadingAvatar ? (
                    <ActivityIndicator
                      size="small"
                      color="#ffffff"
                    />
                  ) : (
                    <Camera
                      size={14}
                      color="#ffffff"
                    />
                  )}
                </View>
              </Pressable>

              <View>
                <Text className="text-2xl font-bold text-white mb-1">
                  {profile?.first_name &&
                  profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : 'Student'}
                </Text>
                <Text className="text-white/90 text-sm mb-1">
                  @{profile?.username}
                </Text>
                {universityName ? (
                  <View className="flex-row items-center gap-1">
                    <Sparkles
                      size={10}
                      color="#e5e7eb"
                    />
                    <Text className="text-white/80 text-xs">
                      {universityName}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Stats */}
          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={fetchFollowers}
              className="flex-1 bg-white/20 rounded-2xl p-4 items-center border border-white/30"
            >
              <UserPlus
                size={20}
                color="#ffffff"
              />
              <Text className="text-2xl font-bold text-white mt-1">
                {followersCount}
              </Text>
              <Text className="text-[10px] text-white/90 mt-0.5">
                Followers
              </Text>
            </Pressable>
            <Pressable
              onPress={fetchFollowing}
              className="flex-1 bg-white/20 rounded-2xl p-4 items-center border border-white/30"
            >
              <Heart
                size={20}
                color="#ffffff"
              />
              <Text className="text-2xl font-bold text-white mt-1">
                {followingCount}
              </Text>
              <Text className="text-[10px] text-white/90 mt-0.5">
                Following
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCommunityPress}
              className="flex-1 bg-white/20 rounded-2xl p-4 items-center border border-white/30"
            >
              <Users
                size={20}
                color="#ffffff"
              />
              <Text className="text-2xl font-bold text-white mt-1">
                {communityCount}
              </Text>
              <Text className="text-[10px] text-white/90 mt-0.5">
                Community
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Interests */}
        <View className="mt-6 bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-[#1e293b]">
              Your Interests
            </Text>
            <Pressable
              onPress={() =>
                setShowAddInterest(true)
              }
              className="p-2 rounded-xl bg-gradient-to-br from-[#45C4A0] to-[#3ab592]"
            >
              <Plus
                size={16}
                color="#ffffff"
              />
            </Pressable>
          </View>

          {profile?.interests &&
          profile.interests.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {profile.interests.map(
                (interest: string) => {
                  const meta =
                    AVAILABLE_INTERESTS.find(
                      (i) =>
                        i.name ===
                        interest
                    );
                  return (
                    <View
                      key={interest}
                      className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 flex-row items-center gap-2"
                    >
                      {meta?.emoji && (
                        <Text className="text-lg">
                          {meta.emoji}
                        </Text>
                      )}
                      <Text className="text-sm text-gray-700">
                        {interest}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          ) : (
            <View className="items-center py-6">
              <Award
                size={40}
                color="#d1d5db"
              />
              <Text className="mt-2 text-gray-500 text-sm">
                No interests added yet
              </Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                Add your interests to discover
                relevant events.
              </Text>
            </View>
          )}
        </View>

        {/* Settings / Sign out */}
        <View className="mt-4 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <Pressable
            onPress={() =>
              setShowSettings(true)
            }
            className="flex-row items-center gap-4 px-6 py-5 border-b border-gray-100"
          >
            <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center">
              <Settings
                size={22}
                color="#2563eb"
              />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-[#1e293b]">
                Settings
              </Text>
              <Text className="text-xs text-gray-500">
                Manage your account preferences
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center gap-4 px-6 py-5"
          >
            <View className="w-12 h-12 bg-red-50 rounded-2xl items-center justify-center">
              <LogOut
                size={22}
                color="#dc2626"
              />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-red-600">
                Sign Out
              </Text>
              <Text className="text-xs text-red-400">
                Log out of your account
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modals */}
      {showAddInterest && (
        <AddInterestModal
          onClose={() =>
            setShowAddInterest(false)
          }
          onAdd={handleAddInterest}
          existingInterests={
            profile?.interests || []
          }
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() =>
            setShowSettings(false)
          }
        />
      )}

      {selectedUserId && currentView === 'main' && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() =>
            setSelectedUserId(null)
          }
          onFollowChange={fetchFollowCounts}
        />
      )}
    </View>
  );
};
