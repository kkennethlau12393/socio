import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, X, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import UserProfileModal from './UserProfileModal';

interface NotificationCenterProps {
  onClose: () => void;
  onNotificationChange?: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  related_id: string | null;
  request_id: string | null;
  request_details?: {
    id: string;
    event_id: string;
    user_id: string;
    event_title: string;
    event_image: string;
    event_location: string;
    event_start_time: string;
    user_username: string;
    user_avatar: string | null;
    user_first_name: string;
    user_last_name: string;
  };
  follower_details?: {
    id: string;
    username: string;
    avatar_url: string | null;
    first_name: string;
    last_name: string;
  };
}

export const NotificationCenter = ({ onClose, onNotificationChange }: NotificationCenterProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
  
    fetchNotifications();
    markAllAsRead();
  
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          fetchNotifications();
          onNotificationChange?.();
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => setIsScrolled(container.scrollTop > 10);
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      if (onNotificationChange) {
        onNotificationChange();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedNotifications = await Promise.all((data || []).map(async (notif) => {
        if (notif.type === 'join_request' && notif.request_id) {
          const { data: requestData } = await supabase
            .from('event_join_requests')
            .select(`
              id,
              event_id,
              user_id,
              events!inner(title, image_url, location_name, start_time),
              profiles!inner(username, avatar_url, first_name, last_name)
            `)
            .eq('id', notif.request_id)
            .maybeSingle();

          if (requestData) {
            return {
              ...notif,
              request_details: {
                id: requestData.id,
                event_id: requestData.event_id,
                user_id: requestData.user_id,
                event_title: requestData.events.title,
                event_image: requestData.events.image_url,
                event_location: requestData.events.location_name,
                event_start_time: requestData.events.start_time,
                user_username: requestData.profiles.username,
                user_avatar: requestData.profiles.avatar_url,
                user_first_name: requestData.profiles.first_name,
                user_last_name: requestData.profiles.last_name,
              }
            };
          }
        }

        if (notif.type === 'new_follower' && notif.related_id) {
          const { data: followerData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, first_name, last_name')
            .eq('id', notif.related_id)
            .maybeSingle();

          if (followerData) {
            return {
              ...notif,
              follower_details: {
                id: followerData.id,
                username: followerData.username,
                avatar_url: followerData.avatar_url,
                first_name: followerData.first_name,
                last_name: followerData.last_name,
              }
            };
          }
        }

        return notif;
      }));

      setNotifications(enrichedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, notificationId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('event_join_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (onNotificationChange) {
        onNotificationChange();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string, notificationId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('event_join_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (onNotificationChange) {
        onNotificationChange();
      }
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Failed to decline request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderNotification = (notification: Notification) => {
    if (notification.type === 'join_request' && notification.request_details) {
      const request = notification.request_details;
      const startTime = new Date(request.event_start_time);
      const eventTimeString = startTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      return (
        <div
          key={notification.id}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
        >
          <div className="relative h-48 overflow-hidden">
            <img
              src={request.event_image}
              alt={request.event_title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
          </div>

          <div className="p-4">
            <h3 className="font-bold text-lg text-[#1e293b] mb-2">{request.event_title}</h3>

            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
              <span>{eventTimeString}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
              <span>{request.event_location}</span>
            </div>

            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserId(request.user_id);
                }}
                className="flex items-center gap-2 group"
              >
                <img
                  src={request.user_avatar || '/default-avatar.svg'}
                  alt={request.user_username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex flex-col items-start">
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-[#45C4A0] transition-colors">
                    {request.user_first_name} {request.user_last_name}
                  </p>
                  <p className="text-xs text-gray-500">wants to join</p>
                </div>
              </button>
              <div className="ml-auto text-xs text-gray-400">{getTimeAgo(notification.created_at)}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(request.id, notification.id)}
                disabled={processingId === request.id}
                className="flex-1 py-2.5 bg-[#45C4A0] text-white rounded-xl font-medium hover:bg-[#3ab592] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingId === request.id ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Accept
                  </>
                )}
              </button>
              <button
                onClick={() => handleDecline(request.id, notification.id)}
                disabled={processingId === request.id}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingId === request.id ? (
                  <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Decline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (notification.type === 'new_follower' && notification.follower_details) {
      const follower = notification.follower_details;
      return (
        <div
          key={notification.id}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => setSelectedUserId(follower.id)}
              className="flex-shrink-0"
            >
              <img
                src={follower.avatar_url || '/default-avatar.svg'}
                alt={follower.username}
                className="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-[#45C4A0] transition-all"
              />
            </button>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <button
                    onClick={() => setSelectedUserId(follower.id)}
                    className="font-semibold text-gray-900 hover:text-[#45C4A0] transition-colors"
                  >
                    {follower.first_name} {follower.last_name}
                  </button>
                  <p className="text-sm text-gray-600">started following you</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{getTimeAgo(notification.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={notification.id}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            notification.type === 'request_accepted' ? 'bg-green-100' :
            notification.type === 'request_declined' ? 'bg-red-100' :
            'bg-blue-100'
          }`}>
            <Bell className={`w-5 h-5 ${
              notification.type === 'request_accepted' ? 'text-green-600' :
              notification.type === 'request_declined' ? 'text-red-600' :
              'text-blue-600'
            }`} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
              <span className="text-xs text-gray-400 whitespace-nowrap">{getTimeAgo(notification.created_at)}</span>
            </div>
            <p className="text-sm text-gray-600">{notification.message}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col ${
  isExiting ? 'animate-slideOutRight' : 'animate-slideInRight'
}`}>
      <header className={`backdrop-blur-lg border-b flex-shrink-0 sticky top-0 z-10 transition-all duration-300 ${
  isScrolled ? 'bg-white shadow-sm border-gray-200' : 'bg-white/80 border-gray-100'
}`}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          </div>
        </div>
      </header>

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#45C4A0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">No notifications</p>
            <p className="text-gray-400 text-sm">Your notifications will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(renderNotification)}
          </div>
        )}
      </main>

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onFollowChange={() => {}}
        />
      )}
    </div>
  );
};
