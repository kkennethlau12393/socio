import { useEffect, useState, useRef } from 'react';
import { X, UserPlus, UserMinus, Users, UserCheck, MessageCircle } from 'lucide-react';
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

const DEFAULT_AVATAR = '/default-avatar.svg';

export default function UserProfileModal({ userId, onClose, onFollowChange }: UserProfileModalProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [mutualFollow, setMutualFollow] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [profileFollowsMe, setProfileFollowsMe] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [followersOpening, setFollowersOpening] = useState(false);
  const [followersClosing, setFollowersClosing] = useState(false);
  const [followingOpening, setFollowingOpening] = useState(false);
  const [followingClosing, setFollowingClosing] = useState(false);
  const scrollPosition = useRef(0);

  useEffect(() => {
    setIsOpening(false);

    scrollPosition.current = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = -`${scrollPosition.current}` + 'px';
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPosition.current);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    fetchProfile();
    checkFollowStatus();
    fetchFollowCounts();
    checkMutualFollow();
    checkIfProfileFollowsMe();
  }, [userId]);

  useEffect(() => {
    if (showFollowers) {
      setFollowersClosing(false);
      setFollowersOpening(true);
      setTimeout(() => setFollowersOpening(false), 0);
    }
  }, [showFollowers]);
  
  useEffect(() => {
    if (showFollowing) {
      setFollowingClosing(false);
      setFollowingOpening(true);
      setTimeout(() => setFollowingOpening(false), 0);
    }
  }, [showFollowing]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowCounts = async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('followers')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId)
      ]);

      setFollowersCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const checkMutualFollow = async () => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error('Error checking mutual follow:', error);
    }
  };

  const checkIfProfileFollowsMe = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', user.id)
        .maybeSingle();

      setProfileFollowsMe(!!data);
    } catch (error) {
      console.error('Error checking if profile follows me:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || followLoading) {
      console.log('Follow blocked:', { user: !!user, followLoading });
      return;
    }

    console.log('Starting follow action:', { isFollowing, userId, currentUser: user.id });
    setFollowLoading(true);
    try {
      if (isFollowing) {
        console.log('Attempting to unfollow...');
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) {
          console.error('Unfollow error:', error);
          throw error;
        }
        console.log('Unfollow successful');
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        if (onFollowChange) onFollowChange();
        await checkMutualFollow();
        await checkIfProfileFollowsMe();
      } else {
        console.log('Attempting to follow...');
        const { data, error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: userId
          })
          .select();

        if (error) {
          console.error('Follow error:', error);
          throw error;
        }
        console.log('Follow successful:', data);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        if (onFollowChange) onFollowChange();
        await checkMutualFollow();
        await checkIfProfileFollowsMe();
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('Failed to follow user: ' + (error as any).message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !mutualFollow) return;

    try {
      const [smallerId, largerId] = [user.id, userId].sort();

      const { data: existingRoom } = await supabase
        .from('direct_message_rooms')
        .select('id')
        .eq('user1_id', smallerId)
        .eq('user2_id', largerId)
        .maybeSingle();

      if (existingRoom) {
        setChatRoomId(existingRoom.id);
        setShowChat(true);
      } else {
        const { data: newRoom, error } = await supabase
          .from('direct_message_rooms')
          .insert({
            user1_id: smallerId,
            user2_id: largerId
          })
          .select()
          .single();

        if (error) throw error;
        setChatRoomId(newRoom.id);
        setShowChat(true);
      }
    } catch (error) {
      console.error('Error creating/opening chat:', error);
    }
  };

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(
          'follower_id, profiles!followers_follower_id_fkey(*)'
        )
        .eq('following_id', userId);

      if (error) throw error;
      setFollowers(data?.map(f => (f as any).profiles) || []);
      setShowFollowers(true);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(
          'following_id, profiles!followers_following_id_fkey(*)'
        )
        .eq('follower_id', userId);

      if (error) throw error;
      setFollowing(data?.map(f => (f as any).profiles) || []);
      setShowFollowing(true);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleCloseFollowers = () => {
    setFollowersClosing(true);
    setTimeout(() => setShowFollowers(false), 300);
  };
  
  const handleCloseFollowing = () => {
    setFollowingClosing(true);
    setTimeout(() => setShowFollowing(false), 300);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <div className="text-center text-gray-500">User not found</div>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-100 text-gray-700 py-2 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (showChat && chatRoomId && profile) {
    return (
      <DirectMessageChat
        roomId={chatRoomId}
        otherUser={{
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          display_name: profile.username,
          avatar_url: profile.avatar_url,
          username: profile.username
        }}
        onBack={() => setShowChat(false)}
      />
    );
  }

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}>
      <div className={`bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative transition-transform duration-300 ease-out ${
        isOpening ? 'translate-y-full' : isClosing ? 'translate-y-full' : 'translate-y-0'
      }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <img
              src={profile.avatar_url || DEFAULT_AVATAR}
              alt={profile.username}
              className="w-20 h-20 rounded-full object-cover"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.username}</h2>
              <p className="text-gray-600">{profile.first_name} {profile.last_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {user?.id !== userId && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-[#45C4A0] text-white hover:bg-[#3ab08d]'
              } disabled:opacity-50`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-5 h-5" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  {profileFollowsMe ? 'Follow Back' : 'Follow'}
                </>
              )}
            </button>
            {mutualFollow && (
              <button
                onClick={handleMessage}
                className="px-4 py-3 rounded-xl font-semibold bg-[#45C4A0]/10 text-[#45C4A0] hover:bg-[#45C4A0]/20 transition-colors flex items-center justify-center"
                title="Send message"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={fetchFollowers}
            className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-xl py-3 transition-colors"
          >
            <div className="text-2xl font-bold text-gray-900">{followersCount}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </button>
          <button
            onClick={fetchFollowing}
            className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-xl py-3 transition-colors"
          >
            <div className="text-2xl font-bold text-gray-900">{followingCount}</div>
            <div className="text-sm text-gray-600">Following</div>
          </button>
        </div>

        <div className="space-y-4">
          {profile.bio && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Bio</h3>
              <p className="text-gray-900">{profile.bio}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">University</h3>
            <p className="text-gray-900">{profile.university}</p>
          </div>

          {profile.course && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Course</h3>
              <p className="text-gray-900">{profile.course}</p>
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="bg-[#45C4A0]/10 text-[#45C4A0] px-3 py-1 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
