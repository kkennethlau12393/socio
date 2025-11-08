import { useState, useEffect, useRef } from 'react';
import { User, Settings, LogOut, Plus, Calendar, Users, Award, Sparkles, UserPlus, Heart, Camera } from 'lucide-react';
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

export const ProfileTab = ({ onNavigateToCommunity, onNavigateToMyCommunity }: ProfileTabProps) => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [universityName, setUniversityName] = useState('');
  const [communityCount, setCommunityCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentView, setCurrentView] = useState<ProfileView>('main');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUniversity = async () => {
      if (profile?.university_id) {
        const { data } = await supabase
          .from('universities')
          .select('name')
          .eq('id', profile.university_id)
          .maybeSingle();

        if (data) {
          setUniversityName(data.name);
        }
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

      const [groupsResult, societiesResult] = await Promise.all([
        supabase
          .from('group_members')
          .select('group_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('follows')
          .select('following_id', { count: 'exact', head: true })
          .eq('follower_id', user.id)
          .eq('following_type', 'society')
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
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', user.id),
        supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', user.id)
      ]);

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const fetchFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`
          follower_id,
          profiles!followers_follower_id_fkey(*)
        `)
        .eq('following_id', user.id);

      if (error) throw error;
      setFollowers(data?.map(f => (f as any).profiles) || []);
      setSearchQuery('');
      setCurrentView('followers');
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`
          following_id,
          profiles!followers_following_id_fkey(*)
        `)
        .eq('follower_id', user.id);

      if (error) throw error;
      setFollowing(data?.map(f => (f as any).profiles) || []);
      setSearchQuery('');
      setCurrentView('following');
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: base64String })
          .eq('id', user.id);

        if (error) throw error;

        await refreshProfile();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAddInterest = async (interests: string[]) => {
    if (!user || !profile) return;

    await supabase
      .from('profiles')
      .update({ interests })
      .eq('id', user.id);

    await refreshProfile();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50 pt-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12 text-center backdrop-blur-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#45C4A0] to-[#3ab592] rounded-3xl mb-6 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#1e293b] mb-3">Sign In Required</h3>
            <p className="text-gray-600 text-lg">Sign in to view your profile and manage your account</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'following') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 backdrop-blur-xl bg-white/95">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentView('main');
                fetchFollowCounts();
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Following</h1>
              <p className="text-xs text-gray-500">{followingCount} following</p>
            </div>
          </div>
        </header>

        <main className="px-4 py-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search following..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent"
            />
          </div>

          {following.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">Not following anyone yet</p>
              <p className="text-gray-400 text-sm">Start following people to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {following
                .filter(user => {
                  const query = searchQuery.toLowerCase();
                  return (
                    user.username?.toLowerCase().includes(query) ||
                    user.first_name?.toLowerCase().includes(query) ||
                    user.last_name?.toLowerCase().includes(query)
                  );
                })
                .map((followedUser) => (
                  <button
                    key={followedUser.id}
                    onClick={() => setSelectedUserId(followedUser.id)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={followedUser.avatar_url || '/default-avatar.svg'}
                        alt={followedUser.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-left">{followedUser.username}</p>
                        <p className="text-sm text-gray-500 text-left">{followedUser.first_name} {followedUser.last_name}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </main>

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
      </div>
    );
  }

  if (currentView === 'followers') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 backdrop-blur-xl bg-white/95">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setCurrentView('main')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Followers</h1>
              <p className="text-xs text-gray-500">{followersCount} followers</p>
            </div>
          </div>
        </header>

        <main className="px-4 py-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search followers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent"
            />
          </div>

          {followers.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No followers yet</p>
              <p className="text-gray-400 text-sm">Share your profile to get followers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followers
                .filter(user => {
                  const query = searchQuery.toLowerCase();
                  return (
                    user.username?.toLowerCase().includes(query) ||
                    user.first_name?.toLowerCase().includes(query) ||
                    user.last_name?.toLowerCase().includes(query)
                  );
                })
                .map((follower) => (
                  <button
                    key={follower.id}
                    onClick={() => setSelectedUserId(follower.id)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={follower.avatar_url || '/default-avatar.svg'}
                        alt={follower.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-left">{follower.username}</p>
                        <p className="text-sm text-gray-500 text-left">{follower.first_name} {follower.last_name}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </main>

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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#45C4A0]/5 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#45C4A0] via-[#3ab592] to-[#2da885] rounded-3xl shadow-2xl p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white/30 shadow-xl cursor-pointer"
                      onClick={handleAvatarClick}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border-4 border-white/30 shadow-xl cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                      <User className="w-10 h-10 text-white" />
                    </div>
                  )}
                  <button
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-[#45C4A0] rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : 'Student'}
                  </h2>
                  <p className="text-white/90 text-sm mb-1">@{profile?.username}</p>
                  {universityName && (
                    <p className="text-white/80 text-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {universityName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <button
                onClick={fetchFollowers}
                className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/30 hover:bg-white/30 transition-all"
              >
                <UserPlus className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold mb-1">{followersCount}</div>
                <div className="text-xs text-white/90">Followers</div>
              </button>
              <button
                onClick={fetchFollowing}
                className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/30 hover:bg-white/30 transition-all"
              >
                <Heart className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold mb-1">{followingCount}</div>
                <div className="text-xs text-white/90">Following</div>
              </button>
              <button
                onClick={onNavigateToMyCommunity || onNavigateToCommunity}
                className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 text-center border border-white/30 hover:bg-white/30 transition-all"
              >
                <Users className="w-6 h-6 mx-auto mb-2" />
                <div className="text-2xl font-bold mb-1">{communityCount}</div>
                <div className="text-xs text-white/90">Community</div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#1e293b]">Your Interests</h3>
            <button
              onClick={() => setShowAddInterest(true)}
              className="p-2 bg-gradient-to-br from-[#45C4A0] to-[#3ab592] hover:shadow-lg rounded-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          {profile?.interests && profile.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => {
                const interestData = AVAILABLE_INTERESTS.find(i => i.name === interest);
                return (
                  <span
                    key={interest}
                    className="px-4 py-2 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 text-sm rounded-xl flex items-center gap-2 font-medium border border-gray-200 hover:shadow-md transition-all"
                  >
                    {interestData?.emoji && <span className="text-lg">{interestData.emoji}</span>}
                    <span>{interest}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No interests added yet</p>
              <p className="text-gray-400 text-xs mt-1">Add your interests to discover relevant events</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-4 px-6 py-5 text-left text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all group border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-[#1e293b] block">Settings</span>
              <span className="text-xs text-gray-500">Manage your account preferences</span>
            </div>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-6 py-5 text-left text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-white transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <span className="font-semibold block">Sign Out</span>
              <span className="text-xs text-red-400">Log out of your account</span>
            </div>
          </button>
        </div>
      </div>

      {showAddInterest && (
        <AddInterestModal
          onClose={() => setShowAddInterest(false)}
          onAdd={handleAddInterest}
          existingInterests={profile?.interests || []}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};
