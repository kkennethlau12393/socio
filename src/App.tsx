import { useState, useEffect } from 'react';
import { Home, Calendar, User, MapPin, Users, MessageSquare, ArrowLeft, Plus, Bell } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { GetStarted } from './components/GetStarted';
import { OnboardingFlow } from './components/OnboardingFlow';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { DiscoverTab } from './components/tabs/DiscoverTab';
import { MapTab } from './components/tabs/MapTab';
import { CommunitiesTab } from './components/tabs/CommunitiesTab';
import { MyEventsTab } from './components/tabs/MyEventsTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { EventModal } from './components/EventModal';
import { EventChat } from './components/EventChat';
import { CreateEvent } from './components/CreateEvent';
import { DirectMessages } from './components/DirectMessages';
import { NotificationCenter } from './components/NotificationCenter';
import { Event, Society, Group, TabType } from './types';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [showGetStarted, setShowGetStarted] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDMPage, setShowDMPage] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);
  const [showMyCommunityFromProfile, setShowMyCommunityFromProfile] = useState(false);
  const [eventChatEvent, setEventChatEvent] = useState<Event | null>(null);
  const [unreadDMCount, setUnreadDMCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadDMCount(0);
      setNotificationCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_unread_dm_count', { p_user_id: user.id });

        if (!error && data !== null) {
          setUnreadDMCount(data);
        }
      } catch (error) {
        console.error('Error fetching unread DM count:', error);
      }
    };

    const fetchNotificationCount = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        setNotificationCount(count || 0);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchUnreadCount();
    fetchNotificationCount();

    const channel = supabase
      .channel('unread-dms-and-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#45C4A0] rounded-2xl mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showGetStarted && !user) {
    return <GetStarted onGetStarted={() => {
      setShowGetStarted(false);
      setShowAuthModal(true);
    }} />;
  }

  if (!user && (showAuthModal || authRequired)) {
    return <AuthScreen onComplete={() => { setShowAuthModal(false); setAuthRequired(false); }} />;
  }

  const needsProfileCompletion = !profile || !profile.interests || profile.interests.length === 0 || !profile.username;
  const shouldShowOnboarding = user && !loading && needsProfileCompletion && !onboardingComplete && activeTab !== 'profile';

  if (shouldShowOnboarding) {
    return <OnboardingFlow
      onComplete={() => {
        setOnboardingComplete(true);
        setActiveTab('discover');
        setRefreshKey(prev => prev + 1);
      }}
      onBack={async () => {
        await signOut({ skipReload: true });
        setShowGetStarted(false);
        setShowAuthModal(true);
      }}
    />;
  }

  const requireAuth = () => {
    if (!user) {
      setAuthRequired(true);
      return false;
    }
    return true;
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleSocietyClick = (society: Society) => {
    console.log('Society clicked:', society);
  };

  const handleGroupClick = (group: Group) => {
    console.log('Group clicked:', group);
  };

  const refreshCurrentTab = () => {
    setSelectedEvent(null);
  };

  const handleEventChat = (event: Event) => {
    setEventChatEvent(event);
  };

  const tabs = [
    { id: 'discover' as TabType, label: 'Discover', icon: Home },
    { id: 'communities' as TabType, label: 'Community', icon: Users },
    { id: 'events' as TabType, label: 'Calendar', icon: Calendar },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case 'discover':
        return 'Feed';
      case 'communities':
        return 'Community';
      case 'events':
        return 'Calendar';
      default:
        return 'Feed';
    }
  };

  if (showMapModal) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <header className="bg-white border-b border-gray-100 flex-shrink-0 absolute top-0 left-0 right-0 z-10">
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-600 hover:text-gray-900 p-2 -ml-2"
              >
                <ArrowLeft className="w-7 h-7" />
              </button>
            </div>
          </div>
        </header>
        <main className="absolute inset-0">
          <MapTab onEventClick={handleEventClick} />
        </main>
      </div>
    );
  }

  if (showDMPage) {
    return <DirectMessages onClose={async () => {
      setShowDMPage(false);
      if (user) {
        const { data } = await supabase.rpc('get_unread_dm_count', { p_user_id: user.id });
        if (data !== null) setUnreadDMCount(data);
      }
    }} />;
  }

  if (showCreateEvent) {
    return <CreateEvent
      onBack={() => setShowCreateEvent(false)}
      onEventCreated={() => {
        setShowCreateEvent(false);
        setRefreshKey(prev => prev + 1);
        setEventsRefreshKey(prev => prev + 1);
      }}
    />;
  }

  if (showNotifications) {
    return <NotificationCenter
      onClose={() => setShowNotifications(false)}
      onNotificationChange={() => {
        if (user) {
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .then(({ count }) => setNotificationCount(count || 0));
        }
      }}
    />;
  }

  return (
    <div className="min-h-screen bg-white">
      {activeTab === 'discover' && (
        <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
          <div className="max-w-7xl mx-auto h-[60px] flex items-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center justify-between w-full min-w-max px-6 py-4">
              <h1 className="text-4xl font-cursive text-[#45C4A0] pb-2 flex-shrink-0">socio</h1>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                >
                  <Bell className="w-6 h-6 text-gray-700" strokeWidth={2.5} />
                  {notificationCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#45C4A0] text-white rounded-lg text-sm font-medium transition-all hover:bg-[#3BA889] active:scale-95 mr-1"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
                <button
                  onClick={() => setShowDMPage(true)}
                  className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                >
                  <MessageSquare className="w-7 h-7 text-gray-700" strokeWidth={2.5} />
                  {unreadDMCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg">
                      {unreadDMCount > 99 ? '99+' : unreadDMCount}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      {activeTab !== 'discover' && activeTab !== 'profile' && (
        <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-4 h-[60px] flex items-center">
            <h1 className="text-2xl font-bold text-[#1e293b] tracking-tight">{getPageTitle()}</h1>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto pb-24">
        {activeTab === 'discover' && <DiscoverTab key={refreshKey} onEventClick={handleEventClick} onEventChat={handleEventChat} onCreateEvent={() => setShowCreateEvent(true)} />}
        {activeTab === 'communities' && (
          <CommunitiesTab
            onSocietyClick={handleSocietyClick}
            onGroupClick={handleGroupClick}
            onAuthRequired={() => setAuthRequired(true)}
            showMyCommunityInitial={showMyCommunityFromProfile}
            onMyCommunityClose={() => setShowMyCommunityFromProfile(false)}
          />
        )}
        {activeTab === 'events' && (
          <MyEventsTab
            key={eventsRefreshKey}
            onEventClick={handleEventClick}
            onExploreEvents={() => setActiveTab('discover')}
            onEventChat={handleEventChat}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            onNavigateToCommunity={() => setActiveTab('communities')}
            onNavigateToMyCommunity={() => {
              setShowMyCommunityFromProfile(true);
              setActiveTab('communities');
            }}
          />
        )}
      </main>

      {activeTab === 'discover' && (
        <button
          onClick={() => setShowMapModal(true)}
          className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-xl hover:bg-gray-800 transition-all z-50 hover:scale-110 active:scale-95"
        >
          <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 py-4 transition-all ${
                    isActive ? 'text-[#45C4A0]' : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onJoined={() => {
            setRefreshKey(prev => prev + 1);
            setEventsRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {eventChatEvent && (
        <EventChat
          event={eventChatEvent}
          onBack={() => setEventChatEvent(null)}
          onEventLeft={() => {
            setEventChatEvent(null);
            setRefreshKey(prev => prev + 1);
            setEventsRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
