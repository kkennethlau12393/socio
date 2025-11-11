// @ts-nocheck
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from 'react-native';
import {
  Calendar,
  MapPin,
  Users,
  Sparkles,
  TrendingUp,
  Search as SearchIcon,
  Check,
  MessageCircle,
} from 'lucide-react-native';
import { Event } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DiscoverTabProps {
  onEventClick: (event: EventWithDetails) => void;
  onEventChat: (event: EventWithDetails) => void;
  onCreateEvent: () => void;
}

interface EventWithDetails extends Event {
  createdBy?: string;
  attendeeAvatars?: (string | null)[];
  isDemo?: boolean;
  time?: string;
}

// Default avatar from Supabase "Profile/anonymous/cover.jpg"
const DEFAULT_AVATAR_URL = (() => {
  try {
    const { data } = supabase
      .storage
      .from('Profile')
      .getPublicUrl('anonymous/cover.jpg');
    return data?.publicUrl || '';
  } catch {
    return '';
  }
})();

const getAvatar = (maybeUrl: string | null | undefined) => {
  if (maybeUrl && maybeUrl.length > 0) return maybeUrl;
  if (DEFAULT_AVATAR_URL && DEFAULT_AVATAR_URL.length > 0) {
    return DEFAULT_AVATAR_URL;
  }
  return 'https://api.dicebear.com/7.x/thumbs/svg?seed=anonymous';
};

export const DiscoverTab: React.FC<DiscoverTabProps> = ({
  onEventClick,
  onEventChat,
}) => {
  const { user } = useAuth();
  const [feedTab, setFeedTab] = useState<'discover' | 'foryou'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // one Animated.Value per card so only pressed one scales
  const scalesRef = useRef<Record<string, Animated.Value>>({});

  const getScale = (id: string) => {
    if (!scalesRef.current[id]) {
      scalesRef.current[id] = new Animated.Value(1);
    }
    return scalesRef.current[id];
  };

  const animatePressIn = (id: string) => {
    const scale = getScale(id);
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const animatePressOut = (id: string) => {
    const scale = getScale(id);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  useEffect(() => {
    fetchEvents();
    if (user) fetchJoinedEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formatted: EventWithDetails[] = await Promise.all(
        (data || []).map(async (event: any) => {
          const startTime = new Date(event.start_time);
          const timeString = startTime.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });

          let attendees = event.current_attendees || 0;
          let attendeeAvatars: (string | null)[] = [];

          if (!event.is_demo) {
            const { count } = await supabase
              .from('event_rsvps')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);

            attendees = count || 0;

            const { data: avatarData } = await supabase.rpc(
              'get_event_attendee_avatars',
              {
                p_event_id: event.id,
                p_limit: 3,
              },
            );

            attendeeAvatars =
              avatarData?.map((a: any) => a.avatar_url) || [];
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location_name,
            date: timeString,
            time: event.start_time,
            category: event.category,
            image: event.image_url,
            attendees,
            createdBy: event.created_by,
            attendeeAvatars,
            isDemo: event.is_demo,
          };
        }),
      );

      setEvents(formatted);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinedEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setJoinedEventIds(
        new Set((data || []).map((rsvp: any) => rsvp.event_id)),
      );
    } catch (error) {
      console.error('Error fetching joined events:', error);
    }
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;

    const q = searchQuery.toLowerCase();
    return events.filter((event) => {
      const title = event.title?.toLowerCase() || '';
      const cat = event.category?.toLowerCase() || '';
      const loc = event.location?.toLowerCase() || '';
      return (
        title.includes(q) ||
        cat.includes(q) ||
        loc.includes(q)
      );
    });
  }, [searchQuery, events]);

  const isSearching = searchQuery.trim().length > 0;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f9fafb]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#45C4A0" />
          <Text className="mt-2 text-gray-500 text-xs">
            Loading events...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderEventCard = (event: EventWithDetails) => {
    const isCreator = user && event.createdBy === user.id;
    const joined = joinedEventIds.has(event.id);
    const scale = getScale(event.id);

    return (
      <Pressable
        key={event.id}
        onPress={() => onEventClick(event)}
        onPressIn={() => animatePressIn(event.id)}
        onPressOut={() => animatePressOut(event.id)}
      >
        <Animated.View
          style={{ transform: [{ scale }] }}
          className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4"
        >
          {/* Image */}
          <View className="relative h-48 overflow-hidden">
            {event.image ? (
              <Image
                source={{ uri: event.image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-slate-200" />
            )}
            <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            {event.category && (
              <View className="absolute bottom-4 left-4">
                <View className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                  <Text className="text-white text-xs font-medium">
                    {event.category}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Content */}
          <View className="p-5">
            <Text className="text-xl font-bold text-[#1e293b] mb-3">
              {event.title}
            </Text>

            {/* Meta rows: date, location, attendees - fixed icon column for perfect alignment */}
            <View className="mb-4">
              {event.date && (
                <View className="flex-row items-center mb-2">
                  <View style={{ width: 18, alignItems: 'center' }}>
                    <Calendar size={16} color="#6b7280" />
                  </View>
                  <Text className="ml-2 text-xs text-gray-600">
                    {event.date}
                  </Text>
                </View>
              )}

              {event.location && (
                <View className="flex-row items-center mb-2">
                  <View style={{ width: 18, alignItems: 'center' }}>
                    <MapPin size={16} color="#6b7280" style={{ transform: [{ translateX: -0.15 }] }} />
                  </View>
                  <Text
                    className="ml-2 text-xs text-gray-600"
                    numberOfLines={1}
                  >
                    {event.location}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center">
                <View style={{ width: 18, alignItems: 'center' }}>
                  <Users size={16} color="#6b7280" />
                </View>
                <Text className="ml-2 text-xs text-gray-600">
                  {event.attendees || 0} attending
                </Text>

                {event.attendeeAvatars &&
                  event.attendeeAvatars.length > 0 && (
                    <View className="flex-row items-center ml-2">
                      <View className="flex-row items-center">
                        {event.attendeeAvatars.slice(0, 3).map((avatar, i) => (
                          <View
                            key={i}
                            className="w-5 h-5 rounded-full overflow-hidden border border-white"
                            style={{ marginLeft: i === 0 ? 0 : -8 }}
                          >
                            <Image
                              source={{ uri: getAvatar(avatar) }}
                              className="w-full h-full"
                            />
                          </View>
                        ))}
                      </View>

                      {event.attendees >
                        event.attendeeAvatars.length && (
                        <Text className="ml-1 text-[9px] text-gray-500">
                          +
                          {event.attendees -
                            event.attendeeAvatars.length}
                        </Text>
                      )}
                    </View>
                  )}
              </View>
            </View>

            {/* CTA row */}
            {isCreator ? (
              <View className="flex-row items-center gap-3 mt-1">
                <View className="flex-1 py-3 bg-gray-100 rounded-2xl flex-row items-center justify-center">
                  <Text className="text-sm font-semibold text-gray-500">
                    You&apos;re hosting
                  </Text>
                </View>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onEventChat(event);
                  }}
                  className="w-12 h-12 rounded-2xl bg-[#45C4A0]/10 items-center justify-center"
                >
                  <MessageCircle size={20} color="#45C4A0" />
                </Pressable>
              </View>
            ) : joined ? (
              <View className="flex-row items-center gap-3 mt-1">
                <View className="flex-1 py-3 bg-gray-100 rounded-2xl flex-row items-center justify-center">
                  <Check size={18} color="#111827" />
                  <Text className="ml-2 text-sm font-semibold text-gray-800">
                    Joined
                  </Text>
                </View>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onEventChat(event);
                  }}
                  className="w-12 h-12 rounded-2xl bg-[#45C4A0]/10 items-center justify-center"
                >
                  <MessageCircle size={20} color="#45C4A0" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onEventClick(event);
                }}
                className="w-full py-3 bg-[#45C4A0] rounded-2xl items-center justify-center shadow-sm mt-1"
              >
                <Text className="text-sm font-semibold text-white">
                  View Event
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const renderTrendingCard = (
    event: EventWithDetails,
    indexKey: string,
  ) => (
    <Pressable
      key={indexKey}
      onPress={() => onEventClick(event)}
      className="bg-white rounded-xl overflow-hidden shadow-sm"
    >
      <View className="relative h-32">
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-slate-200" />
        )}
        <View className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/0" />
      </View>
      <View className="p-3">
        <Text
          className="font-semibold text-[#1e293b] text-sm mb-1"
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <View className="flex-row items-center gap-1">
          <Users size={12} color="#6b7280" />
          <Text className="text-[10px] text-gray-600">
            {event.attendees || 0}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const listForSearch = filteredEvents;
  const listForForYou = [...events].reverse();

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">
      <ScrollView
        className="flex-1"
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Sticky header (search + tabs) */}
        <View className="bg-white border-b border-gray-200">
          {/* Search */}
          <View className="px-6 pt-5">
            <View
              className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl mb-1 px-4"
              style={{ height: 46 }}
            >
              <SearchIcon size={16} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search events..."
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-2 text-sm text-gray-800"
                style={{ paddingTop: 0, paddingBottom: 3.65 }}
              />
            </View>
          </View>

          {/* Tabs */}
          {!isSearching && (
            <View className="flex-row gap-8 px-6">
              <Pressable
                onPress={() => setFeedTab('discover')}
                className="relative py-4 flex-row items-center gap-2"
              >
                <Sparkles
                  size={16}
                  color={
                    feedTab === 'discover'
                      ? '#45C4A0'
                      : '#6b7280'
                  }
                />
                <Text
                  className={`font-medium text-sm ${
                    feedTab === 'discover'
                      ? 'text-[#45C4A0]'
                      : 'text-gray-500'
                  }`}
                >
                  Discover
                </Text>
                {feedTab === 'discover' && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45C4A0]" />
                )}
              </Pressable>

              <Pressable
                onPress={() => setFeedTab('foryou')}
                className="relative py-4 flex-row items-center gap-2"
              >
                <TrendingUp
                  size={16}
                  color={
                    feedTab === 'foryou'
                      ? '#45C4A0'
                      : '#6b7280'
                  }
                />
                <Text
                  className={`font-medium text-sm ${
                    feedTab === 'foryou'
                      ? 'text-[#45C4A0]'
                      : 'text-gray-500'
                  }`}
                >
                  For You
                </Text>
                {feedTab === 'foryou' && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45C4A0]" />
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Content */}
        {isSearching ? (
          <View className="px-4 pt-6">
            {listForSearch.length === 0 ? (
              <View className="items-center justify-center py-12">
                <SearchIcon size={48} color="#d1d5db" />
                <Text className="mt-4 text-lg font-semibold text-gray-600">
                  No events found
                </Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Try searching with different keywords
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {listForSearch.map((e) => renderEventCard(e))}
              </View>
            )}
          </View>
        ) : feedTab === 'discover' ? (
          <View className="space-y-6 px-4 pt-6">
            {/* Happening Soon */}
            <View>
              <Text className="text-xl font-bold text-[#1e293b] mb-4">
                Happening Soon
              </Text>
              <View className="space-y-4">
                {events.map((e) => renderEventCard(e))}
              </View>
            </View>

            {/* Trending This Week */}
            {events.length >= 2 && (
              <View className="pt-4">
                <Text className="text-xl font-bold text-[#1e293b] mb-4">
                  Trending This Week
                </Text>
                <View className="flex-row gap-3">
                  {events.slice(0, 2).map((e, i) =>
                    renderTrendingCard(e, `trending-${e.id}-${i}`),
                  )}
                </View>
              </View>
            )}
          </View>
        ) : (
          // For You
          <View className="space-y-6 px-4 pt-6">
            <View>
              <Text className="text-xl font-bold text-[#1e293b] mb-4">
                Recommended For You
              </Text>
              <View className="space-y-4">
                {listForForYou.map((e) => renderEventCard(e))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};