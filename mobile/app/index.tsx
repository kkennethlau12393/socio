// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import {
  Home,
  Calendar,
  User as UserIcon,
  MapPin,
  Users,
  MessageSquare,
  ArrowLeft,
  Plus,
  Bell,
} from 'lucide-react-native';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { GetStarted } from './components/GetStarted';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { OnboardingFlow } from './components/OnboardingFlow';

import { DiscoverTab } from './components/tabs/DiscoverTab';
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

// Dev bypass emails
const DEV_ALLOWED_EMAILS = [
  'kenneth@tomlau.com',
  'kenneth@socio-app.com',
  'misha@socio-app.com',
];

type EventWithDetailsForTabs = Omit<Event, 'attendeeAvatars'> & {
  time?: string;
  image?: string;
  createdBy?: string;
  attendeeAvatars?: (string | null)[];
  isDemo?: boolean;
};

// Socio logo
const SOCIO_LOGO_URL =
  supabase.storage.from('Logo').getPublicUrl('Logo/socio_real.png').data
    ?.publicUrl || '';

const isEmailVerified = (user: any): boolean => {
  if (!user) return false;
  const emailLower = (user.email || '').toLowerCase();
  if (DEV_ALLOWED_EMAILS.includes(emailLower)) return true;

  return Boolean(
    user.email_confirmed_at ||
      user.confirmed_at ||
      user.user_metadata?.email_confirmed_at
  );
};

const isProfileComplete = (profile: any): boolean => {
  if (!profile) return false;
  if (!profile.username) return false;
  if (!Array.isArray(profile.interests) || profile.interests.length === 0) {
    return false;
  }
  return true;
};

function AppContentInner() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  const [showGetStarted, setShowGetStarted] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [selectedEvent, setSelectedEvent] =
    useState<EventWithDetailsForTabs | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDMPage, setShowDMPage] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showMyCommunityFromProfile, setShowMyCommunityFromProfile] =
    useState(false);
  const [eventChatEvent, setEventChatEvent] =
    useState<EventWithDetailsForTabs | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadDMCount, setUnreadDMCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // NEW: track if My Community overlay is open (Communities tab)
  const [isMyCommunityOpen, setIsMyCommunityOpen] = useState(false);

  // Live unread DM + notification counts
  useEffect(() => {
    if (!user) {
      setUnreadDMCount(0);
      setNotificationCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase.rpc(
          'get_unread_dm_count',
          { p_user_id: user.id },
        );
        if (!error && data !== null) setUnreadDMCount(data);
      } catch (err) {
        console.error('Error fetching unread DM count:', err);
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
      } catch (err) {
        console.error('Error fetching notification count:', err);
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
          table: 'direct_messages',
        },
        fetchUnreadCount,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        fetchUnreadCount,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        fetchNotificationCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 1) Global loading
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#45C4A0" />
        <Text className="mt-3 text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  // 2) Logged OUT
  if (!user) {
    if (showGetStarted && !showAuthModal && !authRequired) {
      return (
        <GetStarted
          onGetStarted={() => {
            setShowGetStarted(false);
            setShowAuthModal(true);
          }}
        />
      );
    }

    if (showAuthModal || authRequired || !showGetStarted) {
      return (
        <AuthScreen
          onComplete={async () => {
            await refreshProfile().catch(() => {});
            setShowAuthModal(false);
            setAuthRequired(false);
            setShowGetStarted(false);
          }}
        />
      );
    }

    return (
      <AuthScreen
        onComplete={async () => {
          await refreshProfile().catch(() => {});
          setShowAuthModal(false);
          setAuthRequired(false);
          setShowGetStarted(false);
        }}
      />
    );
  }

  // 3) Logged in, verification
  const verified = isEmailVerified(user);
  const profileComplete = isProfileComplete(profile);

  if (!verified) {
    const email = user.email || '';
    return (
      <EmailVerificationScreen
        email={email}
        onVerified={async () => {
          await refreshProfile().catch(() => {});
        }}
        onBackToLogin={async () => {
          await signOut({ skipReload: true }).catch(() => {});
          setShowAuthModal(true);
          setShowGetStarted(false);
        }}
      />
    );
  }

  // 4) Onboarding
  if (!profileComplete) {
    return (
      <OnboardingFlow
        onComplete={async () => {
          await refreshProfile().catch(() => {});
          setActiveTab('discover');
          setRefreshKey((p) => p + 1);
        }}
        onBack={async () => {
          await signOut({ skipReload: true }).catch(() => {});
          setShowAuthModal(true);
          setShowGetStarted(false);
        }}
      />
    );
  }

  // 5) Main app

  const handleEventClick = (event: EventWithDetailsForTabs) =>
    setSelectedEvent(event);

  const handleEventChat = (event: EventWithDetailsForTabs) =>
    setEventChatEvent(event);

  const handleSocietyClick = (society: Society) => {
    console.log('Society clicked:', society);
  };

  const handleGroupClick = (group: Group) => {
    console.log('Group clicked:', group);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'discover', label: 'Discover', icon: Home },
    { id: 'communities', label: 'Community', icon: Users },
    { id: 'events', label: 'Calendar', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const getPageTitle = (): string => {
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

  // Map modal
  if (showMapModal) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 py-3 border-b border-gray-100 flex-row items-center">
          <Pressable
            onPress={() => setShowMapModal(false)}
            className="p-2 mr-2"
          >
            <ArrowLeft size={24} color="#4b5563" />
          </Pressable>
        </View>
        <View className="flex-1">
          {/* Map content */}
        </View>
      </SafeAreaView>
    );
  }

  // DMs
  if (showDMPage) {
    return (
      <DirectMessages
        onClose={async () => {
          setShowDMPage(false);
          if (user) {
            const { data } = await supabase.rpc(
              'get_unread_dm_count',
              { p_user_id: user.id },
            );
            if (data !== null) setUnreadDMCount(data);
          }
        }}
      />
    );
  }

  // Create Event
  if (showCreateEvent) {
    return (
      <CreateEvent
        onBack={() => setShowCreateEvent(false)}
        onEventCreated={() => {
          setShowCreateEvent(false);
          setRefreshKey((p) => p + 1);
          setEventsRefreshKey((p) => p + 1);
        }}
      />
    );
  }

  // Notifications
  if (showNotifications) {
    return (
      <NotificationCenter
        onClose={() => setShowNotifications(false)}
        onNotificationChange={() => {
          if (user) {
            supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_read', false)
              .then(({ count }) =>
                setNotificationCount(count || 0),
              );
          }
        }}
      />
    );
  }

  // Header
  const renderHeader = () => {
    if (activeTab === 'discover') {
      return (
        <View className="border-b border-gray-100 px-6 pt-2 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={{ uri: SOCIO_LOGO_URL }}
              style={{
                width: 92,
                height: 26,
                resizeMode: 'contain',
              }}
            />
          </View>

          <View className="flex-row items-center gap-2">
            {/* Notifications */}
            <Pressable
              onPress={() => setShowNotifications(true)}
              className="relative w-9 h-9 rounded-full items-center justify-center"
            >
              <Bell size={20} color="#111827" />
              {notificationCount > 0 && (
                <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full px-1.5 h-4 min-w-[16px] items-center justify-center">
                  <Text className="text-white text-[9px] font-bold">
                    {notificationCount > 99
                      ? '99+'
                      : notificationCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Create */}
            <Pressable
              onPress={() => setShowCreateEvent(true)}
              className="rounded-lg bg-[#45C4A0]"
              style={{
                height: 34,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={16} color="#ffffff" />
              <Text
                className="text-white text-xs font-semibold"
                style={{
                  marginLeft: 4,
                  textAlignVertical: 'center',
                  includeFontPadding: false,
                }}
              >
                Create
              </Text>
            </Pressable>

            {/* DMs */}
            <Pressable
              onPress={() => setShowDMPage(true)}
              className="relative w-9 h-9 rounded-full items-center justify-center"
            >
              <MessageSquare size={20} color="#111827" />
              {unreadDMCount > 0 && (
                <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full px-1.5 h-4 min-w-[16px] itemscenter justify-center">
                  <Text className="text-white text-[9px] font-bold">
                    {unreadDMCount > 99
                      ? '99+'
                      : unreadDMCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      );
    }

    // Communities: hide "Community" header when My Community overlay is open
    if (activeTab === 'communities') {
      if (isMyCommunityOpen) {
        return null;
      }
      return (
        <View className="border-b border-gray-100 px-6 pt-2 pb-3">
          <Text className="text-2xl font-bold text-[#1e293b]">
            {getPageTitle()}
          </Text>
        </View>
      );
    }

    if (activeTab !== 'profile') {
      return (
        <View className="border-b border-gray-100 px-6 pt-2 pb-3">
          <Text className="text-2xl font-bold text-[#1e293b]">
            {getPageTitle()}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Main app layout
  return (
    <SafeAreaView className="flex-1 bg-white">
      {renderHeader()}

      <View className="flex-1">
        {activeTab === 'discover' && (
          <DiscoverTab
            key={refreshKey}
            onEventClick={handleEventClick}
            onEventChat={handleEventChat}
            onCreateEvent={() => setShowCreateEvent(true)}
          />
        )}

        {activeTab === 'communities' && (
          <CommunitiesTab
            onSocietyClick={handleSocietyClick}
            onGroupClick={handleGroupClick}
            onAuthRequired={() => setAuthRequired(true)}
            showMyCommunityInitial={showMyCommunityFromProfile}
            onMyCommunityOpen={() => {
              setIsMyCommunityOpen(true);
            }}
            onMyCommunityClose={() => {
              setShowMyCommunityFromProfile(false);
              setIsMyCommunityOpen(false);
            }}
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
            onNavigateToCommunity={() =>
              setActiveTab('communities')
            }
            onNavigateToMyCommunity={() => {
              setShowMyCommunityFromProfile(true);
              setActiveTab('communities');
            }}
          />
        )}
      </View>

      {/* Map FAB */}
      {activeTab === 'discover' && (
        <Pressable
          onPress={() => setShowMapModal(true)}
          className="w-16 h-16 rounded-full bg-black items-center justify-center shadow-xl"
          style={{
            position: 'absolute',
            bottom: 115,
            left: '50%',
            marginLeft: -28,
          }}
        >
          <MapPin size={27} color="#ffffff" />
        </Pressable>
      )}

      {/* Bottom Tabs */}
      <View
        className="absolute left-0 right-0 bg-white border-t border-gray-100"
        style={{ bottom: 0, height: 80, justifyContent: 'center' }}
      >
        <View
          className="flex-row items-end justify-between px-10"
          style={{ paddingBottom: 26.5 }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className="items-center"
              >
                <Icon
                  size={24}
                  color={
                    isActive ? '#45C4A0' : '#9ca3af'
                  }
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Event modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent as unknown as Event}
          onClose={() => setSelectedEvent(null)}
          onJoined={() => {
            setRefreshKey((p) => p + 1);
            setEventsRefreshKey((p) => p + 1);
          }}
        />
      )}

      {/* Event chat */}
      {eventChatEvent && (
        <EventChat
          event={eventChatEvent as unknown as Event}
          onBack={() => setEventChatEvent(null)}
          onEventLeft={() => {
            setEventChatEvent(null);
            setRefreshKey((p) => p + 1);
            setEventsRefreshKey((p) => p + 1);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <AppContentInner />
    </AuthProvider>
  );
}

export default AppContent;
