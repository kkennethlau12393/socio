import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Calendar, Users, Check, Trash2, User } from 'lucide-react';
import { Event } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';

interface EventModalProps {
  event: Event;
  onClose: () => void;
  onJoined?: () => void;
}

export const EventModal = ({ event, onClose, onJoined }: EventModalProps) => {
  const { user } = useAuth();
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attendeeAvatars, setAttendeeAvatars] = useState<Array<{userId: string, avatar: string | null}>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'declined'>('none');
  const scrollPosition = useRef(0);

  const isHost = user && ((event as any).created_by === user.id || (event as any).createdBy === user.id);

  useEffect(() => {
    setIsOpening(false);
    checkRSVPStatus();
    fetchAttendeeAvatars();

    scrollPosition.current = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition.current}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPosition.current);
    };
  }, [event.id, user]);

  const fetchAttendeeAvatars = async () => {
    try {
      const { data: avatarData } = await supabase.rpc('get_event_attendee_avatars', {
        p_event_id: event.id,
        p_limit: 3,
      });

      type AvatarRow = {
        user_id: string;
        avatar_url: string | null;
      };

      const avatars =
        (avatarData as AvatarRow[] | null)?.map((a) => ({
          userId: a.user_id,
          avatar: a.avatar_url,
        })) || [];

      setAttendeeAvatars(avatars);
    } catch (error) {
      console.error('Error fetching attendee avatars:', error);
    }
  };

  const checkRSVPStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if ((event as any).created_by === user.id || (event as any).createdBy === user.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsJoined(!!data);

      if (!(event as any).isDemo && !data) {
        const { data: requestData } = await supabase
          .from('event_join_requests')
          .select('status')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (requestData) {
          setRequestStatus(requestData.status as any);
        }
      }
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!user || joining) return;

    setJoining(true);
    try {
      const isDemo = (event as any).isDemo;

      if (!isDemo) {
        const { error } = await supabase
          .from('event_join_requests')
          .insert({
            event_id: event.id,
            user_id: user.id,
            status: 'pending'
          });

        if (error) {
          if (error.code === '23505') {
            setRequestStatus('pending');
            return;
          }
          throw error;
        }

        setRequestStatus('pending');
        return;
      }

      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: 'going'
        });

      if (error) {
        if (error.code === '23505') {
          setIsJoined(true);
          if (onJoined) {
            onJoined();
          }
          return;
        }
        throw error;
      }

      setIsJoined(true);
      fetchAttendeeAvatars();

      if (onJoined) {
        onJoined();
      }
    } catch (error) {
      console.error('Error joining event:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!user || leaving) return;

    setLeaving(true);
    try {
      const { error } = await supabase
        .from('event_rsvps')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id);

      if (error) throw error;

      const { error: updateError } = await supabase.rpc('decrement_event_attendees', {
        event_id: event.id
      });

      if (updateError) console.error('Error updating attendee count:', updateError);

      setIsJoined(false);
      setShowLeaveConfirm(false);
      fetchAttendeeAvatars();

      if (onJoined) {
        onJoined();
      }
    } catch (error) {
      console.error('Error leaving event:', error);
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!user || deleting) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('created_by', user.id);

      if (error) throw error;

      if (onJoined) {
        onJoined();
      }

      handleClose();
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      >
        <div
          className={`bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto relative transition-transform duration-300 ease-out ${isOpening ? 'translate-y-full' : isClosing ? 'translate-y-full' : 'translate-y-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="sticky top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all z-20 ml-auto mr-4"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        <div className="relative -mt-14">
          {event.image && (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-64 object-cover sm:rounded-t-2xl rounded-t-3xl"
            />
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-4xl">{(event as any).emoji || '📅'}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#1e293b] mb-1">{event.title}</h2>
              <span className="inline-block px-3 py-1 bg-[#45C4A0]/10 text-[#45C4A0] text-xs font-semibold rounded-full">
                {event.category}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{(event as any).time || event.date}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{event.location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Users className="w-5 h-5 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm">{event.attendees || 0} attending</span>
                {attendeeAvatars.length > 0 && (
                  <div className="flex -space-x-2 ml-0.65">
                    {attendeeAvatars.map((attendee, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedUserId(attendee.userId)}
                        className="w-7 h-7 rounded-full border-2 border-white overflow-hidden hover:scale-110 hover:z-10 transition-all cursor-pointer bg-gray-100"
                        title="View profile"
                      >
                        <img
                          src={attendee.avatar || '/default-avatar.svg'}
                          alt="Attendee"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {(event as any).languages && (event as any).languages.length > 0 && (
              <div className="flex items-start gap-3 text-gray-600">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 8 6 6"/>
                  <path d="m4 14 6-6 2-3"/>
                  <path d="M2 5h12"/>
                  <path d="M7 2h1"/>
                  <path d="m22 22-5-10-5 10"/>
                  <path d="M14 18h6"/>
                </svg>
                <div className="flex flex-wrap gap-2">
                  {(event as any).languages.map((lang: string, index: number) => (
                    <span key={index} className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-[#1e293b] mb-2">About</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {isHost ? (
            <div className="space-y-3">
              <div className="w-full py-3.5 rounded-xl font-semibold bg-gray-100 text-gray-500 flex items-center justify-center gap-2 cursor-not-allowed">
                <Check className="w-5 h-5" />
                You're hosting this event
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3.5 rounded-xl font-semibold bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete Event
              </button>
            </div>
          ) : isJoined ? (
            <div className="space-y-3">
              <button
                disabled
                className="w-full py-3.5 rounded-xl font-semibold bg-gray-100 text-gray-700 cursor-default flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Joined
              </button>
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-3.5 rounded-xl font-semibold bg-white border-2 border-red-500 text-red-500 hover:bg-red-50 transition-all"
              >
                Leave Event
              </button>
            </div>
          ) : requestStatus === 'pending' ? (
            <button
              disabled
              className="w-full py-3.5 rounded-xl font-semibold bg-yellow-100 text-yellow-700 cursor-default flex items-center justify-center gap-2"
            >
              Request Pending
            </button>
          ) : requestStatus === 'declined' ? (
            <button
              disabled
              className="w-full py-3.5 rounded-xl font-semibold bg-red-100 text-red-700 cursor-default flex items-center justify-center gap-2"
            >
              Request Declined
            </button>
          ) : (
            <button
              onClick={handleJoinEvent}
              disabled={!user || loading || joining}
              className="w-full py-3.5 rounded-xl font-semibold transition-all bg-[#45C4A0] text-white hover:bg-[#3ab592] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : joining ? (!(event as any).isDemo ? 'Requesting...' : 'Joining...') : (!(event as any).isDemo ? 'Request to Join' : 'Join Event')}
            </button>
          )}
        </div>
      </div>
      </div>

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onFollowChange={() => {}}
        />
      )}

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1e293b] mb-2">Leave event?</h3>
            <p className="text-gray-600 text-sm mb-6">
              You'll lose your spot and future updates.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveEvent}
                disabled={leaving}
                className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {leaving ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1e293b] mb-2">Delete event?</h3>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. All attendees will lose access to this event.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
