// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ChevronRight,
  Search as SearchIcon,
  Filter,
  Check,
  Users,
} from 'lucide-react-native';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Society, Group } from '../../types';
import { SocietyModal } from '../SocietyModal';
import { GroupModal } from '../GroupModal';
import { CommunityChat } from '../CommunityChat';

interface CommunitiesTabProps {
  onSocietyClick: (society: Society) => void;
  onGroupClick: (group: Group) => void;
  onAuthRequired: () => void;
  showMyCommunityInitial?: boolean;
  onMyCommunityClose?: () => void;
  onMyCommunityOpen?: () => void;
}

const DEMO_SOCIETIES: Society[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'UCL Engineering Society',
    emoji: '⚙️',
    members: 245,
    description: 'Connect with fellow engineers and tech enthusiasts',
    image:
      'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Technology',
    nextEvent: 'Tech Talk - Tomorrow 6PM',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'UCL Photography Club',
    emoji: '📸',
    members: 189,
    description: 'Capture moments and learn photography together',
    image:
      'https://images.pexels.com/photos/853151/pexels-photo-853151.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Arts',
    nextEvent: 'Photo Walk - Friday 3PM',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'UCL Women in Tech',
    emoji: '👩‍💻',
    members: 167,
    description: 'Empowering women in technology and STEM',
    image:
      'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Technology',
    nextEvent: 'Networking Night - Wed 7PM',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'UCL Finance & Investment Society',
    emoji: '💼',
    members: 312,
    description: 'Learn about markets, trading, and finance careers',
    image:
      'https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Business',
    nextEvent: 'Trading Workshop - Mon 5PM',
  },
];

const DEMO_GROUPS: Group[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Poker Night Crew',
    emoji: '🃏',
    members: 12,
    description: 'Weekly poker games and tournaments',
    image:
      'https://images.pexels.com/photos/1871508/pexels-photo-1871508.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Poker Night - Tonight 8PM',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Sunday Football',
    emoji: '⚽',
    members: 18,
    description: 'Casual 5-a-side every Sunday morning',
    image:
      'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Match - Sunday 10AM',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Board Game Enthusiasts',
    emoji: '🎲',
    members: 24,
    description: 'Strategy games and friendly competition',
    image:
      'https://images.pexels.com/photos/776654/pexels-photo-776654.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Game Night - Thu 7PM',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Morning Runners',
    emoji: '🏃',
    members: 15,
    description: '6AM runs around campus',
    image:
      'https://images.pexels.com/photos/2803158/pexels-photo-2803158.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Run - Tomorrow 6AM',
  },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const CommunitiesTab: React.FC<CommunitiesTabProps> = ({
  onSocietyClick,
  onGroupClick,
  onAuthRequired,
  showMyCommunityInitial,
  onMyCommunityClose,
  onMyCommunityOpen,
}) => {
  const { user } = useAuth();

  const [showMyCommunity, setShowMyCommunity] = useState(
    showMyCommunityInitial || false
  );
  const [isClosing, setIsClosing] = useState(false);

  const [showAllSocieties, setShowAllSocieties] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [followedSocietyIds, setFollowedSocietyIds] =
    useState<Set<string>>(new Set());
  const [joinedGroupIds, setJoinedGroupIds] =
    useState<Set<string>>(new Set());

  const [selectedSociety, setSelectedSociety] =
    useState<Society | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [chatSociety, setChatSociety] = useState<Society | null>(null);
  const [chatGroup, setChatGroup] = useState<Group | null>(null);

  // 1 = off-screen right, 0 = visible
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showMyCommunity) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(1);
    }
  }, [showMyCommunity]);

  useEffect(() => {
    if (showMyCommunityInitial) {
      setShowMyCommunity(true);
      setIsClosing(false);
      onMyCommunityOpen?.();
    }
  }, [showMyCommunityInitial]);

  useEffect(() => {
    const fetchMemberships = async () => {
      if (!user) return;

      try {
        const { data: groupData, error: groupError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (!groupError && groupData) {
          setJoinedGroupIds(new Set(groupData.map((m: any) => m.group_id)));
        } else if (groupError) {
          console.error('Error fetching group memberships', groupError);
        }

        const { data: societyData, error: followError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('following_type', 'society');

        if (!followError && societyData) {
          setFollowedSocietyIds(
            new Set(societyData.map((f: any) => f.following_id))
          );
        } else if (followError) {
          console.error('Error fetching follows', followError);
        }
      } catch (err) {
        console.error('Error in fetchMemberships', err);
      }
    };

    fetchMemberships();
  }, [user]);

  const followedSocieties = DEMO_SOCIETIES.filter((s) =>
    followedSocietyIds.has(s.id)
  );
  const joinedGroups = DEMO_GROUPS.filter((g) =>
    joinedGroupIds.has(g.id)
  );

  // shared chip styles
  const chipBase: any = {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  };

  const followingChipStyle: any = {
    ...chipBase,
    backgroundColor: '#F3F4F6',
  };

  const followingTextStyle: any = {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  };

  const outlineButtonStyle: any = {
    ...chipBase,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
  };

  const outlineButtonTextStyle: any = {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  };

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  // ===== actions with optimistic update + animations =====

  const handleFollowSociety = async (societyId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    setFollowedSocietyIds((prev) => {
      const set = new Set(prev);
      set.add(societyId);
      return set;
    });
    setSelectedSociety(null);

    try {
      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_type: 'society',
        following_id: societyId,
      });
      if (error) {
        console.error('Supabase follow error', error);
        setFollowedSocietyIds((prev) => {
          const set = new Set(prev);
          set.delete(societyId);
          return set;
        });
      }
    } catch (err) {
      console.error('Follow society failed', err);
      setFollowedSocietyIds((prev) => {
        const set = new Set(prev);
        set.delete(societyId);
        return set;
      });
    }
  };

  const handleUnfollowSociety = async (societyId: string) => {
    if (!user) return;

    animateLayout();

    setFollowedSocietyIds((prev) => {
      const set = new Set(prev);
      set.delete(societyId);
      return set;
    });
    setChatSociety(null);

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_type', 'society')
        .eq('following_id', societyId);

      if (error) {
        console.error('Supabase unfollow error', error);
        animateLayout();
        setFollowedSocietyIds((prev) => {
          const set = new Set(prev);
          set.add(societyId);
          return set;
        });
      }
    } catch (err) {
      console.error('Unfollow society failed', err);
      animateLayout();
      setFollowedSocietyIds((prev) => {
        const set = new Set(prev);
        set.add(societyId);
        return set;
      });
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    setJoinedGroupIds((prev) => {
      const set = new Set(prev);
      set.add(groupId);
      return set;
    });
    setSelectedGroup(null);

    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
      });

      if (error) {
        console.error('Supabase join group error', error);
        setJoinedGroupIds((prev) => {
          const set = new Set(prev);
          set.delete(groupId);
          return set;
        });
      }
    } catch (err) {
      console.error('Join group failed', err);
      setJoinedGroupIds((prev) => {
        const set = new Set(prev);
        set.delete(groupId);
        return set;
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    animateLayout();

    setJoinedGroupIds((prev) => {
      const set = new Set(prev);
      set.delete(groupId);
      return set;
    });
    setChatGroup(null);

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase leave group error', error);
        animateLayout();
        setJoinedGroupIds((prev) => {
          const set = new Set(prev);
          set.add(groupId);
          return set;
        });
      }
    } catch (err) {
      console.error('Leave group failed', err);
      animateLayout();
      setJoinedGroupIds((prev) => {
        const set = new Set(prev);
        set.add(groupId);
        return set;
      });
    }
  };

  // ===== card / nav handlers =====

  const handleSocietyCardPress = (society: Society) => {
    if (followedSocietyIds.has(society.id)) {
      setChatSociety(society);
    } else {
      setSelectedSociety(society);
    }
  };

  const handleGroupCardPress = (group: Group) => {
    if (joinedGroupIds.has(group.id)) {
      setChatGroup(group);
    } else {
      setSelectedGroup(group);
    }
  };

  const handleCloseMyCommunity = () => {
    setIsClosing(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // ✅ Reset state when closing overlay
      setShowMyCommunity(false);
      setIsClosing(false);
      setSearchQuery(''); // <-- reset search bar
      onMyCommunityClose?.();
    });
  };

  // ========== My Community Overlay ==========

  if (showMyCommunity) {
    const filteredSocieties = followedSocieties.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroups = joinedGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, SCREEN_WIDTH],
    });

    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#ffffff',
            zIndex: 50,
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Header */}
        <View className="bg-white border-b border-gray-100">
          <View className="px-6 pt-4 pb-3">
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={handleCloseMyCommunity}
                className="p-2 -ml-2"
              >
                <ChevronRight
                  size={28}
                  color="#4b5563"
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </Pressable>
              <Text className="text-2xl font-bold text-[#1e293b]">
                My Community
              </Text>
              <View style={{ width: 32 }} />
            </View>

            <View className="flex-row gap-2 items-center">
              <View className="flex-1 relative">
                <View className="absolute left-3 top-1/2 -translate-y-1/2">
                  <SearchIcon size={18} color="#9ca3af" />
                </View>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search communities..."
                  placeholderTextColor="#9ca3af"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-slate-800"
                />
              </View>
              <Pressable className="px-3 py-2.5 bg-gray-50 rounded-xl">
                <Filter size={18} color="#4b5563" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
        >
          {/* Followed Societies */}
          {filteredSocieties.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-[#1e293b] mb-3">
                Student Societies
              </Text>
              <View className="space-y-4">
                {filteredSocieties.map((society) => (
                  <View
                    key={society.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    <View className="flex-row gap-4 p-4">
                      <View className="relative w-16 h-16">
                        <Image
                          source={{ uri: society.image }}
                          className="w-full h-full rounded-xl"
                        />
                        <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                          <Text className="text-xl">
                            {society.emoji}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="font-bold text-[#1e293b] mb-1">
                          {society.name}
                        </Text>
                        <Text className="text-sm text-gray-600 mb-2">
                          {society.description}
                        </Text>
                        {society.nextEvent && (
                          <Text className="text-xs text-[#45C4A0] font-semibold mb-2">
                            {society.nextEvent}
                          </Text>
                        )}

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            marginTop: 2,
                          }}
                        >
                          <View style={followingChipStyle}>
                            <Check size={14} color="#6B7280" />
                            <Text style={followingTextStyle}>
                              Following
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => handleUnfollowSociety(society.id)}
                            style={({ pressed }) => [
                              outlineButtonStyle,
                              { transform: [{ scale: pressed ? 0.96 : 1 }] },
                            ]}
                          >
                            <Text style={outlineButtonTextStyle}>
                              Unfollow
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Joined Groups */}
          {filteredGroups.length > 0 && (
            <View>
              <Text className="text-lg font-bold text-[#1e293b] mb-3">
                Groups
              </Text>
              <View className="space-y-4">
                {filteredGroups.map((group) => (
                  <View
                    key={group.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    <View className="flex-row gap-4 p-4">
                      <View className="relative w-16 h-16">
                        <Image
                          source={{ uri: group.image }}
                          className="w-full h-full rounded-xl"
                        />
                        <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                          <Text className="text-xl">
                            {group.emoji}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="font-bold text-[#1e293b] mb-1">
                          {group.name}
                        </Text>
                        <Text className="text-sm text-gray-600 mb-2">
                          {group.description}
                        </Text>
                        {group.nextEvent && (
                          <Text className="text-xs text-[#45C4A0] font-semibold mb-2">
                            {group.nextEvent}
                          </Text>
                        )}

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            marginTop: 2,
                          }}
                        >
                          <View style={followingChipStyle}>
                            <Check size={14} color="#6B7280" />
                            <Text style={followingTextStyle}>
                              Joined
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => handleLeaveGroup(group.id)}
                            style={({ pressed }) => [
                              outlineButtonStyle,
                              { transform: [{ scale: pressed ? 0.96 : 1 }] },
                            ]}
                          >
                            <Text style={outlineButtonTextStyle}>
                              Leave
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  }

  // ========== Chat views ==========

  if (chatSociety) {
    return (
      <CommunityChat
        community={chatSociety}
        type="society"
        onBack={() => setChatSociety(null)}
        onLeave={() => handleUnfollowSociety(chatSociety.id)}
      />
    );
  }

  if (chatGroup) {
    return (
      <CommunityChat
        community={chatGroup}
        type="group"
        onBack={() => setChatGroup(null)}
        onLeave={() => handleLeaveGroup(chatGroup.id)}
      />
    );
  }

  // ========== Main list (My Community card STAYS green) ==========

  const displayedSocieties = showAllSocieties
    ? DEMO_SOCIETIES
    : DEMO_SOCIETIES.slice(0, 2);
  const displayedGroups = showAllGroups
    ? DEMO_GROUPS
    : DEMO_GROUPS.slice(0, 2);

  return (
    <>
      {selectedSociety && (
        <SocietyModal
          society={selectedSociety}
          onClose={() => setSelectedSociety(null)}
          onFollow={() => handleFollowSociety(selectedSociety.id)}
        />
      )}

      {selectedGroup && (
        <GroupModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onJoin={() => handleJoinGroup(group.id)}
        />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 52,
        }}
      >
        {/* My Community card (green) */}
        <Pressable
          onPress={() => {
            setShowMyCommunity(true);
            onMyCommunityOpen?.();
          }}
          className="relative overflow-hidden rounded-3xl p-6 mb-6 shadow-lg active:scale-95"
          style={{ backgroundColor: '#45C4A0' }}
        >
          <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <View className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Users size={20} color="#ffffff" />
                <Text className="text-xl font-bold text-white">
                  My Community
                </Text>
              </View>
              <Text className="text-white/90 text-sm font-medium">
                {followedSocieties.length + joinedGroups.length} communities joined
              </Text>
            </View>
            <View className="bg-white/20 rounded-2xl p-3">
              <ChevronRight size={24} color="#ffffff" />
            </View>
          </View>
        </Pressable>

        {/* Student Societies */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-[#1e293b] mb-4">
            Student Societies
          </Text>
          <View className="space-y-3">
            {displayedSocieties.map((society) => (
              <Pressable
                key={society.id}
                onPress={() => handleSocietyCardPress(society)}
                className="bg-white rounded-2xl shadow-sm"
              >
                <View className="flex-row gap-4 p-4">
                  <View className="relative w-20 h-20">
                    <Image
                      source={{ uri: society.image }}
                      className="w-full h-full rounded-xl"
                    />
                    <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                      <Text className="text-2xl">{society.emoji}</Text>
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-[#1e293b] mb-1">
                      {society.name}
                    </Text>
                    <Text
                      className="text-sm text-gray-600 mb-2"
                      numberOfLines={2}
                    >
                      {society.description}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-gray-500">
                        {society.members} members
                      </Text>
                      {followedSocietyIds.has(society.id) ? (
                        <View style={followingChipStyle}>
                          <Check size={14} color="#6B7280" />
                          <Text style={followingTextStyle}>
                            Following
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleFollowSociety(society.id)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: '#45C4A0',
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          })}
                        >
                          <Text
                            style={{
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: '600',
                            }}
                          >
                            Follow
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
          {DEMO_SOCIETIES.length > 2 && (
            <Pressable
              onPress={() => setShowAllSocieties(!showAllSocieties)}
              className="w-full mt-3 py-3 rounded-xl"
            >
              <Text className="text-center text-[#45C4A0] font-semibold">
                {showAllSocieties ? 'Show Less' : 'Show More'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Groups */}
        <View>
          <Text className="text-2xl font-bold text-[#1e293b] mb-4">
            Groups
          </Text>
          <View className="space-y-3">
            {displayedGroups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => handleGroupCardPress(group)}
                className="bg-white rounded-2xl shadow-sm"
              >
                <View className="flex-row gap-4 p-4">
                  <View className="relative w-20 h-20">
                    <Image
                      source={{ uri: group.image }}
                      className="w-full h-full rounded-xl"
                    />
                    <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-1">
                      <Text className="text-2xl">{group.emoji}</Text>
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-[#1e293b] mb-1">
                      {group.name}
                    </Text>
                    <Text
                      className="text-sm text-gray-600 mb-2"
                      numberOfLines={2}
                    >
                      {group.description}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-xs text-gray-500">
                        {group.members} members
                      </Text>
                      {joinedGroupIds.has(group.id) ? (
                        <View style={followingChipStyle}>
                          <Check size={14} color="#6B7280" />
                          <Text style={followingTextStyle}>
                            Joined
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleJoinGroup(group.id)}
                          style={({ pressed }) => ({
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: '#45C4A0',
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          })}
                        >
                          <Text
                            style={{
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: '600',
                            }}
                          >
                            Join
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
          {DEMO_GROUPS.length > 2 && (
            <Pressable
              onPress={() => setShowAllGroups(!showAllGroups)}
              className="w-full mt-3 py-3 rounded-xl"
            >
              <Text className="text-center text-[#45C4A0] font-semibold">
                {showAllGroups ? 'Show Less' : 'Show More'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
};
