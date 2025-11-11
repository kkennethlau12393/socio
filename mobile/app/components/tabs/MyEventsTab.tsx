// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react-native';
import { Event } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MyEventsTabProps {
  onEventClick: (event: EventWithExtras) => void;
  onExploreEvents: () => void;
  onEventChat: (event: EventWithExtras) => void;
}

interface EventWithExtras extends Omit<Event, 'attendeeAvatars'> {
  time?: string;
  image?: string;
  attendeeAvatars?: (string | null)[];
}

// Anonymous/fallback avatar – using your Profile/anonymous/cover.jpg setup
const ANON_AVATAR_URL =
  supabase.storage
    .from('Profile')
    .getPublicUrl('anonymous/cover.jpg').data?.publicUrl || '';

export const MyEventsTab: React.FC<MyEventsTabProps> = ({
  onEventClick,
  onExploreEvents,
  onEventChat,
}) => {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventWithExtras[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 🔹 Animation just for calendar month switch
  const monthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      fetchMyEvents();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (events.length > 0) {
      const now = new Date();
      const upcoming = events
        .map((e) => new Date(e.time || e.date))
        .filter((d) => !isNaN(d.getTime()) && d >= now)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (upcoming) setCurrentDate(upcoming);
    }
  }, [events]);

  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('event_rsvps')
        .select(
          `
          event_id,
          events (
            id,
            title,
            description,
            location_name,
            start_time,
            category,
            image_url,
            current_attendees
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: EventWithExtras[] = await Promise.all(
        (data || [])
          .filter((item: any) => item.events)
          .map(async (item: any) => {
            const event = item.events;
            const startTime = new Date(event.start_time);
            const dateString = startTime.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });

            // attendee count
            const { count } = await supabase
              .from('event_rsvps')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id);

            // attendee avatars with fallback (same logic style as Discover)
            const { data: avatarData } = await supabase.rpc(
              'get_event_attendee_avatars',
              {
                p_event_id: event.id,
                p_limit: 3,
              }
            );

            const attendeeAvatars =
              avatarData?.map((a: any) => {
                const url = a.avatar_url;
                return url && url.trim().length > 0
                  ? url
                  : ANON_AVATAR_URL || null;
              }) || [];

            return {
              id: event.id,
              title: event.title,
              description: event.description,
              location: event.location_name,
              date: dateString,
              time: event.start_time,
              category: event.category,
              image: event.image_url,
              attendees: count || event.current_attendees || 0,
              attendeeAvatars,
            };
          })
      );

      setEvents(formatted);
    } catch (err) {
      console.error('Error fetching my events:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Calendar helpers ----

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInCurrentMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventWithExtras[]>();
    events.forEach((event) => {
      const eventDate = new Date(event.time || event.date);
      if (!isNaN(eventDate.getTime())) {
        const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(event);
      }
    });
    return map;
  }, [events]);

  const getEventsForDate = (date: Date | null): EventWithExtras[] => {
    if (!date) return [];
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate.get(key) || [];
  };

  // 🔹 Only change: animated month switch
  const changeMonth = (offset: number) => {
    if (!offset) return;

    const direction = offset > 0 ? -1 : 1; // right arrow -> slide left, left arrow -> slide right

    Animated.timing(monthAnim, {
      toValue: 16 * direction,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setMonth(next.getMonth() + offset);
        return next;
      });
      setSelectedDate(null);

      Animated.timing(monthAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDate = (a: Date | null, b: Date | null) => {
    if (!a || !b) return false;
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  };

  const filteredEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : events;

  // ---- Loading / empty states ----

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="small" color="#45C4A0" />
        <Text className="mt-2 text-gray-500">
          Loading your events...
        </Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View className="pt-4 px-4">
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 items-center">
          <View className="w-16 h-16 rounded-2xl bg-[#45C4A0]/10 items-center justify-center mb-4">
            <Calendar size={32} color="#45C4A0" />
          </View>
          <Text className="text-xl font-bold text-[#1e293b] mb-2">
            Your Events
          </Text>
          <Text className="text-gray-600 mb-4 text-center">
            Events you&apos;ve joined will appear here.
          </Text>
          <Pressable
            onPress={onExploreEvents}
            className="px-6 py-3 bg-[#45C4A0] rounded-xl shadow-sm items-center justify-center"
          >
            <Text className="text-white font-semibold">
              Explore Events
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- Render ----

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
      }}
    >
      {/* Calendar Card */}
      <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        {/* Month header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-[#1e293b]">
            {currentDate.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => changeMonth(-1)}
              className="p-2 rounded-lg active:bg-gray-100"
            >
              <ChevronLeft size={18} color="#6b7280" />
            </Pressable>
            <Pressable
              onPress={() => changeMonth(1)}
              className="p-2 rounded-lg active:bg-gray-100"
            >
              <ChevronRight size={18} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {/* Weekdays */}
        <View className="flex-row mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
            (day) => (
              <View
                key={day}
                className="w-[14.28%] py-1.5 items-center"
              >
                <Text className="text-xs font-semibold text-gray-500">
                  {day}
                </Text>
              </View>
            )
          )}
        </View>

        {/* Days grid with animation (ONLY change here) */}
        <Animated.View
          className="flex-row flex-wrap"
          style={{
            transform: [{ translateX: monthAnim }],
            opacity: monthAnim.interpolate({
              inputRange: [-16, 0, 16],
              outputRange: [0.25, 1, 0.25],
            }),
          }}
        >
          {daysInMonth.map((date, index) => {
            const hasEvents = date
              ? getEventsForDate(date).length > 0
              : false;
            const isSelected = isSameDate(date, selectedDate);
            const today = date ? isToday(date) : false;

            const disabled = !date;

            let bg = 'bg-transparent';
            let text = 'text-gray-700';
            if (disabled) {
              bg = 'bg-transparent';
              text = 'text-transparent';
            } else if (isSelected) {
              bg = 'bg-[#45C4A0]';
              text = 'text-white';
            } else if (today) {
              bg = 'bg-[#45C4A0]/10';
              text = 'text-[#45C4A0]';
            }

            return (
              <Pressable
                key={index}
                disabled={disabled}
                onPress={() => {
                  if (!date) return;
                  setSelectedDate((prev) =>
                    prev && isSameDate(prev, date)
                      ? null
                      : date
                  );
                }}
                className={`
                  w-[14.28%]
                  items-center justify-center
                  rounded-lg mb-1
                  ${bg}
                `}
                style={{
                  paddingVertical: disabled ? 0 : 6,
                }}
              >
                {date && (
                  <>
                    <Text
                      className={`
                        text-sm
                        ${text}
                        ${isSelected ? 'font-bold' : ''}
                      `}
                    >
                      {date.getDate()}
                    </Text>
                    {hasEvents && (
                      <View
                        className="w-1.5 h-1.5 rounded-full mt-0.5"
                        style={{
                          backgroundColor: isSelected
                            ? '#ffffff'
                            : '#45C4A0',
                        }}
                      />
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>

      {/* Events list (UNCHANGED) */}
      {filteredEvents.length > 0 ? (
        <View className="space-y-3">
          <Text className="text-sm font-semibold text-gray-600 px-1">
            {selectedDate
              ? `Events on ${selectedDate.toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                  }
                )}`
              : 'All Upcoming Events'}
          </Text>

          {filteredEvents.map((event) => (
            <View
              key={event.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <View className="flex-row gap-3 items-center">
                {/* Thumbnail */}
                {event.image ? (
                  <Pressable
                    onPress={() => onEventClick(event)}
                    className="w-16 h-16 rounded-lg overflow-hidden"
                  >
                    <Image
                      source={{ uri: event.image }}
                      className="w-full h-full"
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => onEventClick(event)}
                    className="w-16 h-16 rounded-lg bg-gray-100 items-center justify-center"
                  >
                    <Calendar size={20} color="#9ca3af" />
                  </Pressable>
                )}

                {/* Info */}
                <Pressable
                  onPress={() => onEventClick(event)}
                  className="flex-1"
                >
                  <Text
                    className="font-bold text-[#1e293b] text-sm mb-1"
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>

                  {/* Date / Time */}
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <Clock size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-600" numberOfLines={1}>
                      {event.date}
                    </Text>
                  </View>

                  {/* Location */}
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <MapPin size={12} color="#6b7280" />
                    <Text
                      className="text-xs text-gray-600 flex-shrink"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        flex: 1,
                        marginRight: 8,
                        minWidth: 0, // ensures proper ellipsis
                      }}
                    >
                      {event.location}
                    </Text>
                  </View>

                  {/* Attendees */}
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <Users size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-600">
                      {event.attendees || 0} attending
                    </Text>

                    {event.attendeeAvatars &&
                      event.attendeeAvatars.length > 0 && (
                        <View className="flex-row ml-1">
                          {event.attendeeAvatars.slice(0, 3).map((avatar, i) => (
                            <View
                              key={i}
                              className="rounded-full border-[1.5px] border-white bg-gray-100 overflow-hidden"
                              style={{
                                width: 21,
                                height: 21,
                                marginLeft: i === 0 ? 0 : -8,
                              }}
                            >
                              <Image
                                source={{ uri: avatar || ANON_AVATAR_URL }}
                                className="w-full h-full"
                              />
                            </View>
                          ))}
                        </View>
                      )}
                  </View>
                </Pressable>

                {/* Chat button */}
                <Pressable
                  onPress={() => onEventChat(event)}
                  className="w-10 h-10 rounded-full bg-[#45C4A0]/10 items-center justify-center"
                >
                  <MessageCircle
                    size={18}
                    color="#45C4A0"
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="bg-white rounded-xl p-6 mt-2 items-center border border-gray-100">
          <Text className="text-gray-500 text-sm">
            {selectedDate
              ? 'No events on this day.'
              : 'No upcoming events.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};
