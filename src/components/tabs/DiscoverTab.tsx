import { useState, useMemo, useEffect } from 'react';
import { Calendar, MapPin, Users, Sparkles, TrendingUp, Search, Check, MessageCircle, Plus, User } from 'lucide-react';
import { Event } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DiscoverTabProps {
  onEventClick: (event: Event) => void;
  onEventChat: (event: Event) => void;
  onCreateEvent: () => void;
}

interface EventWithDetails extends Event {
  createdBy?: string;
  attendeeAvatars?: string[];
  isDemo?: boolean;
}

export const DiscoverTab = ({ onEventClick, onEventChat, onCreateEvent }: DiscoverTabProps) => {
  const { user } = useAuth();
  const [feedTab, setFeedTab] = useState<'discover' | 'foryou'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [joinedEventIds, setJoinedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchJoinedEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedEvents: EventWithDetails[] = await Promise.all((data || []).map(async event => {
        const startTime = new Date(event.start_time);
        const timeString = startTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        let actualAttendeeCount = event.current_attendees || 0;
        let attendeeAvatars: (string | null)[] = [];

        if (!event.is_demo) {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          actualAttendeeCount = count || 0;

          const { data: avatarData } = await supabase
            .rpc('get_event_attendee_avatars', {
              p_event_id: event.id,
              p_limit: 3
            });

          attendeeAvatars = avatarData?.map(a => a.avatar_url) || [];
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
          attendees: actualAttendeeCount,
          createdBy: event.created_by,
          attendeeAvatars,
          isDemo: event.is_demo
        };
      }));

      setEvents(formattedEvents);
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

      const eventIds = new Set(data?.map(rsvp => rsvp.event_id) || []);
      setJoinedEventIds(eventIds);
    } catch (error) {
      console.error('Error fetching joined events:', error);
    }
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;

    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query)
    );
  }, [searchQuery, events]);

  const isSearching = searchQuery.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading events...</div>
      </div>
    );
  }

  const renderEventCard = (event: EventWithDetails) => {
    const isCreator = user && event.createdBy === user.id;

    return (
      <div
        key={event.id}
        onClick={() => onEventClick(event)}
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
              {event.category}
            </span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold text-[#1e293b] mb-3">{event.title}</h3>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Users className="w-4 h-4" />
              <span>{event.attendees} attending</span>
              {event.attendeeAvatars && event.attendeeAvatars.length > 0 && (
                <>
                  <div className="flex -space-x-2">
                    {event.attendeeAvatars.map((avatar, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden">
                        <img
                          src={avatar || '/default-avatar.svg'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {event.attendees > event.attendeeAvatars.length && (
                    <span className="text-xs text-gray-500">
                      +{event.attendees - event.attendeeAvatars.length}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {isCreator ? (
            <div className="overflow-x-auto -mx-5 px-5 scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                <div className="flex-1 min-w-[240px] py-3 bg-gray-100 text-gray-500 font-semibold rounded-xl text-center flex items-center justify-center gap-2 cursor-not-allowed">
                  <span className="text-sm">You're hosting</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventChat(event);
                  }}
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#45C4A0]/10 text-[#45C4A0] hover:bg-[#45C4A0]/20 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : joinedEventIds.has(event.id) ? (
            <div className="overflow-x-auto -mx-5 px-5 scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                <button
                  disabled
                  className="flex-1 min-w-[240px] py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl cursor-default flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Joined
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventChat(event);
                  }}
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#45C4A0]/10 text-[#45C4A0] hover:bg-[#45C4A0]/20 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
              className="w-full py-3 bg-[#45C4A0] text-white font-semibold rounded-xl hover:bg-[#3ab592] transition-all shadow-sm"
            >
              View Event
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-6 relative">
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-30">
        <div className="px-6 pt-2">
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#45C4A0] focus:border-transparent transition-all"
            />
          </div>
        </div>
        {!isSearching && (
          <div className="flex gap-8 px-6">
            <button
              onClick={() => setFeedTab('discover')}
              className={`flex items-center gap-2 py-4 font-medium text-sm transition-all relative ${
                feedTab === 'discover'
                  ? 'text-[#45C4A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Discover
              {feedTab === 'discover' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45C4A0]"></div>
              )}
            </button>
            <button
              onClick={() => setFeedTab('foryou')}
              className={`flex items-center gap-2 py-4 font-medium text-sm transition-all relative ${
                feedTab === 'foryou'
                  ? 'text-[#45C4A0]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              For You
              {feedTab === 'foryou' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#45C4A0]"></div>
              )}
            </button>
          </div>
        )}
      </div>

      {isSearching ? (
        <div className="px-4 pt-6">
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No events found</h3>
                <p className="text-gray-500">Try searching with different keywords</p>
              </div>
            ) : (
              filteredEvents.map((event) => renderEventCard(event))
            )}
          </div>
        </div>
      ) : feedTab === 'discover' ? (
        <div className="space-y-6 px-4 pt-6">
          <section>
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">Happening Soon</h2>
            <div className="space-y-4">
              {events.map((event) => renderEventCard(event))}
            </div>
          </section>

          {events.length >= 2 && (
            <section className="pt-4">
              <h2 className="text-xl font-bold text-[#1e293b] mb-4">Trending This Week</h2>
              <div className="grid grid-cols-2 gap-3">
                {events.slice(0, 2).map((event) => (
                  <div
                    key={`trending-${event.id}`}
                    onClick={() => onEventClick(event)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="relative h-32">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/0"></div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-[#1e293b] text-sm mb-1 line-clamp-2">{event.title}</h3>
                      <div className="flex items-center gap-1 text-gray-600 text-xs">
                        <Users className="w-3 h-3" />
                        <span>{event.attendees}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-6 px-4 pt-6">
          <section>
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">Recommended For You</h2>
            <div className="space-y-4">
              {events.slice().reverse().map((event) => renderEventCard(event))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
