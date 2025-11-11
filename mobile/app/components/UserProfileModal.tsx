// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Alert,
  StyleSheet,
} from 'react-native';
import {
  X,
  UserPlus,
  UserCheck,
  MessageCircle,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DirectMessageChat } from './DirectMessageChat';

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url: string | null;
  university: string;
  course: string;
  interests: string[];
}

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onFollowChange?: () => void;
}

// Default anonymous avatar from Supabase
const DEFAULT_ANON_AVATAR_URL = (() => {
  try {
    const { data } = supabase
      .storage
      .from('Profile')
      .getPublicUrl('anonymous/cover.jpg');
    return data?.publicUrl || 'https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous';
  } catch {
    return 'https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous';
  }
})();

const easingSoft = Easing.bezier(0.22, 0.61, 0.36, 1); // smooth, iOS-like

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  onClose,
  onFollowChange,
}) => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [mutualFollow, setMutualFollow] = useState(false);
  const [profileFollowsMe, setProfileFollowsMe] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.96)).current;
  const cardTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          fetchProfile(),
          checkFollowStatus(),
          fetchFollowCounts(),
          checkMutualFollow(),
          checkIfProfileFollowsMe(),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    // Backdrop first, then card for smoother perceived motion
    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 190,
          easing: easingSoft,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 210,
          easing: easingSoft,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 210,
          easing: easingSoft,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const animateClose = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.98,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 6,
        duration: 150,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => finished && cb());
  };

  const handleClose = () => animateClose(onClose);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) setProfile(data);
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const fetchFollowCounts = async () => {
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('followers')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ]);
    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
  };

  const checkMutualFollow = async () => {
    if (!user) return;
    const { data: userFollowsProfile } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();
    const { data: profileFollowsUser } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', user.id)
      .maybeSingle();
    setMutualFollow(!!userFollowsProfile && !!profileFollowsUser);
  };

  const checkIfProfileFollowsMe = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', user.id)
      .maybeSingle();
    setProfileFollowsMe(!!data);
  };

  const handleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        setIsFollowing(false);
        setFollowersCount(p => Math.max(0, p - 1));
      } else {
        await supabase.from('followers').insert({
          follower_id: user.id,
          following_id: userId,
        });
        setIsFollowing(true);
        setFollowersCount(p => p + 1);
      }
      onFollowChange?.();
      await checkMutualFollow();
      await checkIfProfileFollowsMe();
    } catch (err) {
      Alert.alert('Error', 'Failed to follow/unfollow user.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !mutualFollow) return;
    const [smallerId, largerId] = [user.id, userId].sort();
    const { data: existing } = await supabase
      .from('direct_message_rooms')
      .select('id')
      .eq('user1_id', smallerId)
      .eq('user2_id', largerId)
      .maybeSingle();
    if (existing) {
      setChatRoomId(existing.id);
      setShowChat(true);
      return;
    }
    const { data: newRoom } = await supabase
      .from('direct_message_rooms')
      .insert({ user1_id: smallerId, user2_id: largerId })
      .select()
      .single();
    setChatRoomId(newRoom.id);
    setShowChat(true);
  };

  if (loading) {
    return (
      <View style={styles.centeredOverlay}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#45C4A0" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centeredOverlay}>
        <View style={styles.loadingCard}>
          <Text style={{ color: '#111827', marginBottom: 8 }}>User not found</Text>
          <Pressable onPress={handleClose} style={styles.closeButtonFull}>
            <Text style={{ fontWeight: '600', color: '#111827' }}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (showChat && chatRoomId) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <DirectMessageChat
          roomId={chatRoomId}
          otherUser={{
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            display_name: profile.username,
            avatar_url: profile.avatar_url || DEFAULT_ANON_AVATAR_URL,
            username: profile.username,
          }}
          onBack={() => setShowChat(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: overlayOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      <View style={styles.centerWrapper}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [
                { scale: cardScale },
                { translateY: cardTranslateY },
              ],
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    overflow: 'hidden',
                    backgroundColor: '#f3f4f6',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={{ uri: profile.avatar_url || DEFAULT_ANON_AVATAR_URL }}
                    style={{ width: 72, height: 72, borderRadius: 999 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.username} numberOfLines={1}>
                    {profile.username}
                  </Text>
                  <Text style={styles.name}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleClose} style={styles.closeIcon}>
                <X size={18} color="#4b5563" />
              </Pressable>
            </View>

            {user?.id !== userId && (
              <View style={styles.rowGap}>
                <Pressable
                  onPress={handleFollow}
                  disabled={followLoading}
                  style={[
                    styles.followBtn,
                    isFollowing ? styles.followingBg : styles.followBg,
                  ]}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={18} color="#111827" />
                      <Text style={styles.followingText}>Following</Text>
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} color="#ffffff" />
                      <Text style={styles.followText}>
                        {profileFollowsMe ? 'Follow Back' : 'Follow'}
                      </Text>
                    </>
                  )}
                </Pressable>

                {mutualFollow && (
                  <Pressable onPress={handleMessage} style={styles.dmBtn}>
                    <MessageCircle size={20} color="#45C4A0" />
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.rowGap}>
              <Pressable style={styles.countCard}>
                <Text style={styles.countNumber}>{followersCount}</Text>
                <Text style={styles.countLabel}>Followers</Text>
              </Pressable>
              <Pressable style={styles.countCard}>
                <Text style={styles.countNumber}>{followingCount}</Text>
                <Text style={styles.countLabel}>Following</Text>
              </Pressable>
            </View>

            {profile.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Bio</Text>
                <Text style={styles.sectionText}>{profile.bio}</Text>
              </View>
            )}

            {profile.university && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>University</Text>
                <Text style={styles.sectionText}>{profile.university}</Text>
              </View>
            )}

            {profile.course && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Course</Text>
                <Text style={styles.sectionText}>{profile.course}</Text>
              </View>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Interests</Text>
                <View style={styles.interestsWrap}>
                  {profile.interests.map((interest, idx) => (
                    <View key={idx} style={styles.interestPill}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 120 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
  },
  centeredOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: 260,
    alignItems: 'center',
  },
  loadingText: { marginTop: 8, fontSize: 13, color: '#4b5563' },
  closeButtonFull: {
    marginTop: 4,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: { width: 72, height: 72, borderRadius: 999 },
  username: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  name: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  closeIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  followBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  followBg: { backgroundColor: '#45C4A0' },
  followingBg: { backgroundColor: '#f3f4f6' },
  followText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  followingText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  dmBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(69,196,160,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  countLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  section: { marginBottom: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 3,
  },
  sectionText: { fontSize: 14, color: '#111827' },
  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(69,196,160,0.08)',
  },
  interestText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#45C4A0',
  },
});

export default UserProfileModal;
