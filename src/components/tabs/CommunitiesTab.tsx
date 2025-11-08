import { useState, useEffect } from 'react';
import { ChevronRight, Search, Filter, Check, Users } from 'lucide-react';
import { Society, Group } from '../../types';
import { SocietyModal } from '../SocietyModal';
import { GroupModal } from '../GroupModal';
import { CommunityChat } from '../CommunityChat';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CommunitiesTabProps {
  onSocietyClick: (society: Society) => void;
  onGroupClick: (group: Group) => void;
  onAuthRequired: () => void;
  showMyCommunityInitial?: boolean;
  onMyCommunityClose?: () => void;
}

const DEMO_SOCIETIES = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'UCL Engineering Society',
    emoji: '⚙️',
    members: 245,
    description: 'Connect with fellow engineers and tech enthusiasts',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Technology',
    nextEvent: 'Tech Talk - Tomorrow 6PM'
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'UCL Photography Club',
    emoji: '📸',
    members: 189,
    description: 'Capture moments and learn photography together',
    image: 'https://images.pexels.com/photos/853151/pexels-photo-853151.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Arts',
    nextEvent: 'Photo Walk - Friday 3PM'
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'UCL Women in Tech',
    emoji: '👩‍💻',
    members: 167,
    description: 'Empowering women in technology and STEM',
    image: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Technology',
    nextEvent: 'Networking Night - Wed 7PM'
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'UCL Finance & Investment Society',
    emoji: '💼',
    members: 312,
    description: 'Learn about markets, trading, and finance careers',
    image: 'https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?auto=compress&cs=tinysrgb&w=400',
    category: 'Business',
    nextEvent: 'Trading Workshop - Mon 5PM'
  }
];

const DEMO_GROUPS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Poker Night Crew',
    emoji: '🃏',
    members: 12,
    description: 'Weekly poker games and tournaments',
    image: 'https://images.pexels.com/photos/1871508/pexels-photo-1871508.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Poker Night - Tonight 8PM'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Sunday Football',
    emoji: '⚽',
    members: 18,
    description: 'Casual 5-a-side every Sunday morning',
    image: 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Match - Sunday 10AM'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Board Game Enthusiasts',
    emoji: '🎲',
    members: 24,
    description: 'Strategy games and friendly competition',
    image: 'https://images.pexels.com/photos/776654/pexels-photo-776654.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Game Night - Thu 7PM'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Morning Runners',
    emoji: '🏃',
    members: 15,
    description: '6AM runs around campus',
    image: 'https://images.pexels.com/photos/2803158/pexels-photo-2803158.jpeg?auto=compress&cs=tinysrgb&w=400',
    nextEvent: 'Run - Tomorrow 6AM'
  }
];

export const CommunitiesTab = ({ onSocietyClick, onGroupClick, onAuthRequired, showMyCommunityInitial, onMyCommunityClose }: CommunitiesTabProps) => {
  const { user } = useAuth();
  const [showMyCommunity, setShowMyCommunity] = useState(showMyCommunityInitial || false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (showMyCommunityInitial !== undefined) {
      setShowMyCommunity(showMyCommunityInitial);
      setIsClosing(false);
    }
  }, [showMyCommunityInitial]);
  const [showAllSocieties, setShowAllSocieties] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [followedSocietyIds, setFollowedSocietyIds] = useState<Set<string>>(new Set());
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [chatSociety, setChatSociety] = useState<Society | null>(null);
  const [chatGroup, setChatGroup] = useState<Group | null>(null);

  useEffect(() => {
    const fetchMemberships = async () => {
      if (!user) return;

      const { data: groupData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (groupData) {
        setJoinedGroupIds(new Set(groupData.map(m => m.group_id)));
      }

      const { data: societyData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_type', 'society');

      if (societyData) {
        setFollowedSocietyIds(new Set(societyData.map(f => f.following_id)));
      }
    };

    fetchMemberships();
  }, [user]);

  const followedSocieties = DEMO_SOCIETIES.filter(s => followedSocietyIds.has(s.id));
  const joinedGroups = DEMO_GROUPS.filter(g => joinedGroupIds.has(g.id));

  const handleFollowSociety = async (societyId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_type: 'society',
        following_id: societyId
      });

    setFollowedSocietyIds(prev => {
      const newSet = new Set(prev);
      newSet.add(societyId);
      return newSet;
    });
    setSelectedSociety(null);
  };

  const handleUnfollowSociety = async (societyId: string) => {
    if (!user) return;

    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_type', 'society')
      .eq('following_id', societyId);

    setFollowedSocietyIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(societyId);
      return newSet;
    });
    setChatSociety(null);
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) {
      onAuthRequired();
      return;
    }

    await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member'
      });

    setJoinedGroupIds(prev => {
      const newSet = new Set(prev);
      newSet.add(groupId);
      return newSet;
    });
    setSelectedGroup(null);
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    setJoinedGroupIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    setChatGroup(null);
  };

  const handleSocietyClick = (society: Society) => {
    if (followedSocietyIds.has(society.id)) {
      setChatSociety(society);
    } else {
      setSelectedSociety(society);
    }
  };

  const handleGroupClick = (group: Group) => {
    if (joinedGroupIds.has(group.id)) {
      setChatGroup(group);
    } else {
      setSelectedGroup(group);
    }
  };

  if (showMyCommunity) {
    const filteredSocieties = followedSocieties.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroups = joinedGroups.filter(g =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className={`fixed inset-0 bg-white z-50 flex flex-col will-change-transform ${isClosing ? 'animate-[slideOut_0.3s_cubic-bezier(0.4,0,0.2,1)]' : 'animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)]'}`}>
        <header className="bg-white border-b border-gray-100 flex-shrink-0 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setIsClosing(true);
                  setTimeout(() => {
                    setShowMyCommunity(false);
                    setIsClosing(false);
                    onMyCommunityClose?.();
                  }, 300);
                }}
                className="text-gray-600 hover:text-gray-900 p-2 -ml-2"
              >
                <ChevronRight className="w-7 h-7 rotate-180" />
              </button>
              <h1 className="text-2xl font-bold text-[#1e293b] tracking-tight">My Community</h1>
              <div className="w-12"></div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-[#45C4A0] focus:bg-white transition-all"
                />
              </div>
              <button className="px-4 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-6">
          <div className="px-6 pt-4 space-y-6">
            {filteredSocieties.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#1e293b] mb-3">Student Societies</h2>
                <div className="space-y-4">
                  {filteredSocieties.map((society) => (
              <div
                key={society.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex gap-4 p-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <img
                      src={society.image}
                      alt={society.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute -bottom-1 -right-1 text-xl bg-white rounded-full p-0.5">
                      {society.emoji}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1e293b] mb-1">{society.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{society.description}</p>
                    {society.nextEvent && (
                      <p className="text-xs text-[#45C4A0] font-semibold mb-3">{society.nextEvent}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        disabled
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg cursor-default flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Following
                      </button>
                      <button
                        onClick={() => handleUnfollowSociety(society.id)}
                        className="px-3 py-1.5 bg-white border border-red-500 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition-all"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </section>
            )}
            {filteredGroups.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-[#1e293b] mb-3">Groups</h2>
                <div className="space-y-4">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <img
                            src={group.image}
                            alt={group.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <div className="absolute -bottom-1 -right-1 text-xl bg-white rounded-full p-0.5">
                            {group.emoji}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#1e293b] mb-1">{group.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                          {group.nextEvent && (
                            <p className="text-xs text-[#45C4A0] font-semibold mb-3">{group.nextEvent}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              disabled
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg cursor-default flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Joined
                            </button>
                            <button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="px-3 py-1.5 bg-white border border-red-500 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 transition-all"
                            >
                              Leave
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    );
  }

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

  const displayedSocieties = showAllSocieties ? DEMO_SOCIETIES : DEMO_SOCIETIES.slice(0, 2);
  const displayedGroups = showAllGroups ? DEMO_GROUPS : DEMO_GROUPS.slice(0, 2);

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
          onJoin={() => handleJoinGroup(selectedGroup.id)}
        />
      )}
    <div className="space-y-6 pb-6 px-6 pt-4">
      <div
        onClick={() => setShowMyCommunity(true)}
        className="relative overflow-hidden bg-gradient-to-br from-[#45C4A0] via-[#3ab592] to-[#2da885] rounded-3xl p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-white" />
              <h2 className="text-xl font-bold text-white">My Community</h2>
            </div>
            <p className="text-white/90 text-sm font-medium">{followedSocieties.length + joinedGroups.length} communities joined</p>
          </div>
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-3">
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold text-[#1e293b] mb-4">Student Societies</h2>
        <div className="space-y-3">
          {displayedSocieties.map((society) => (
            <div
              key={society.id}
              onClick={() => handleSocietyClick(society)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex gap-4 p-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={society.image}
                    alt={society.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute -bottom-1 -right-1 text-2xl bg-white rounded-full p-1">
                    {society.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1e293b] mb-1">{society.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{society.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{society.members} members</span>
                    {followedSocietyIds.has(society.id) ? (
                      <button
                        disabled
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg cursor-default flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Following
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowSociety(society.id);
                        }}
                        className="px-4 py-2 bg-[#45C4A0] text-white text-sm font-semibold rounded-lg hover:bg-[#3ab592] transition-all"
                      >
                        Follow
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {DEMO_SOCIETIES.length > 2 && (
          <button
            onClick={() => setShowAllSocieties(!showAllSocieties)}
            className="w-full mt-3 py-3 text-[#45C4A0] font-semibold rounded-xl hover:bg-gray-50 transition-all"
          >
            {showAllSocieties ? 'Show Less' : 'Show More'}
          </button>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[#1e293b] mb-4">Groups</h2>
        <div className="space-y-3">
          {displayedGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => handleGroupClick(group)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex gap-4 p-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={group.image}
                    alt={group.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute -bottom-1 -right-1 text-2xl bg-white rounded-full p-1">
                    {group.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1e293b] mb-1">{group.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{group.members} members</span>
                    {joinedGroupIds.has(group.id) ? (
                      <button
                        disabled
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg cursor-default flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Joined
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group.id);
                        }}
                        className="px-4 py-2 bg-[#45C4A0] text-white text-sm font-semibold rounded-lg hover:bg-[#3ab592] transition-all"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {DEMO_GROUPS.length > 2 && (
          <button
            onClick={() => setShowAllGroups(!showAllGroups)}
            className="w-full mt-3 py-3 text-[#45C4A0] font-semibold rounded-xl hover:bg-gray-50 transition-all"
          >
            {showAllGroups ? 'Show Less' : 'Show More'}
          </button>
        )}
      </section>
    </div>
    </>
  );
};
