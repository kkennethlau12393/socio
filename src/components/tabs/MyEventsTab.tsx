import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Users, Clock, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { Event } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MyEventsTabProps {
  onEventClick: (event: Event) => void;
  onExploreEvents: () => void;
  onEventChat: (event: Event) => void;
}

export const MyEventsTab = ({ onEventClick, onExploreEvents, onEventChat }: MyEventsTabProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInCurrentMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const eventDate = new Date(event.time || event.date);
      if (!isNaN(eventDate.getTime())) {
        const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(event);
      }
    });
    return map;
  }, [events]);

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate.get(dateKey) || [];
  };

  const changeMonth = (offset: number) => {
    setTransitionDirection(offset > 0 ? 'left' : 'right');
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + offset);
        return newDate;
      });
      setSelectedDate(null);
      setIsTransitioning(false);
    }, 150);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSameDate = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const filteredEvents = selectedDate ? getEventsForDate(selectedDate) : events;

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
      const upcomingEvent = events
        .map(e => new Date(e.time || e.date))
        .filter(d => !isNaN(d.getTime()) && d >= now)
        .sort((a, b) => a.getTime() - b.getTime())[0];

      if (upcomingEvent) {
        setCurrentDate(upcomingEvent);
      }
    }
  }, [events]);

  const fetchMyEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
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
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedEvents: Event[] = await Promise.all((data || [])
        .filter(item => item.events)
        .map(async item => {
          const event = item.events as any;
          const startTime = new Date(event.start_time);
          const timeString = startTime.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });

          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const { data: avatarData } = await supabase
            .rpc('get_event_attendee_avatars', {
              p_event_id: event.id,
              p_limit: 3
            });

          const attendeeAvatars = avatarData?.map(a => a.avatar_url) || [];

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            location: event.location_name,
            date: timeString,
            time: event.start_time,
            category: event.category,
            image: event.image_url,
            attendees: count || event.current_attendees || 0,
            attendeeAvatars
          };
        }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching my events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading your events...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6 pt-4 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#45C4A0]/10 rounded-2xl mb-4">
            <Calendar className="w-8 h-8 text-[#45C4A0]" />
          </div>
          <h3 className="text-xl font-bold text-[#1e293b] mb-2">Your Events</h3>
          <p className="text-gray-600 mb-4">Events you've joined will appear here</p>
          <button
            onClick={onExploreEvents}
            className="px-6 py-3 bg-[#45C4A0] text-white font-semibold rounded-xl hover:bg-[#3ab592] transition-all shadow-sm"
          >
            Explore Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 px-4 pb-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1e293b]">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-1 transition-all duration-300 ${
          isTransitioning
            ? transitionDirection === 'left'
              ? '-translate-x-4 opacity-0'
              : 'translate-x-4 opacity-0'
            : 'translate-x-0 opacity-100'
        }`}>
          {daysInMonth.map((date, index) => {
            const hasEvents = date ? getEventsForDate(date).length > 0 : false;
            const isSelected = isSameDate(date, selectedDate);
            const isTodayDate = date ? isToday(date) : false;

            return (
              <button
                key={index}
                onClick={() => date && setSelectedDate(isSelected ? null : date)}
                disabled={!date}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${
                  !date
                    ? 'invisible'
                    : isSelected
                    ? 'bg-[#45C4A0] text-white font-bold shadow-md'
                    : isTodayDate
                    ? 'bg-[#45C4A0]/10 text-[#45C4A0] font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {date && (
                  <>
                    <span>{date.getDate()}</span>
                    {hasEvents && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-[#45C4A0]'}`}></div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {filteredEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 px-1">
            {selectedDate
              ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'All Upcoming Events'}
          </h3>
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex gap-3 items-center">
                <div
                  onClick={() => onEventClick(event)}
                  className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                >
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  onClick={() => onEventClick(event)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <h4 className="font-bold text-[#1e293b] text-sm mb-1 truncate">{event.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="truncate">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{event.attendees} attending</span>
                    {(event as any).attendeeAvatars && (event as any).attendeeAvatars.length > 0 && (
                      <div className="flex -space-x-1.5 ml-1">
                        {(event as any).attendeeAvatars.map((avatar: string | null, i: number) => (
                          <div key={i} className="w-5 h-5 rounded-full border-2 border-white overflow-hidden bg-gray-100">
                            <img
                              src={avatar || '/default-avatar.svg'}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventChat(event);
                  }}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#45C4A0]/10 text-[#45C4A0] hover:bg-[#45C4A0]/20 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 && (
        <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
          <p className="text-gray-500 text-sm">
            {selectedDate
              ? 'No events on this day'
              : 'No upcoming events'}
          </p>
        </div>
      )}
    </div>
  );
};
