import { useState, useEffect } from 'react';
import { ChevronLeft, MoreVertical, Send } from 'lucide-react';
import { Society, Group } from '../types';

interface CommunityChatProps {
  community: Society | Group;
  type: 'society' | 'group';
  onBack: () => void;
  onLeave: () => void;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
}

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Sarah Chen',
    userAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    text: 'Hey everyone! Excited for the next meetup!',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'James Wilson',
    userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    text: 'Same here! Does anyone know what time it starts?',
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Emma Rodriguez',
    userAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    text: 'It starts at 6 PM. Looking forward to seeing everyone there!',
    timestamp: new Date(Date.now() - 1800000),
  },
];

export const CommunityChat = ({ community, type, onBack, onLeave }: CommunityChatProps) => {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isSliding, setIsSliding] = useState(false);

  useEffect(() => {
    setIsSliding(true);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: 'currentUser',
      userName: 'You',
      userAvatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=100',
      text: newMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes === 0) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleBack = () => {
    setIsSliding(false);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col transition-transform duration-300 ${isSliding ? 'translate-x-0' : 'translate-x-full'}`}>
      <header className="bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-10 h-10 flex-shrink-0">
                <img
                  src={community.image}
                  alt={community.name}
                  className="w-full h-full object-cover rounded-full"
                />
                <div className="absolute -bottom-0.5 -right-0.5 text-sm bg-white rounded-full p-0.5">
                  {community.emoji}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-[#1e293b] truncate">{community.name}</h1>
                <p className="text-xs text-gray-500">{community.members} members</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onLeave();
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-all"
                  >
                    Leave {type === 'society' ? 'Society' : 'Group'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-8 space-y-5">
        {messages.map((message) => {
          const isCurrentUser = message.userId === 'currentUser';

          return (
            <div key={message.id} className={`flex gap-2.5 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} animate-[fadeIn_0.2s_ease-out]`}>
              {!isCurrentUser && (
                <img
                  src={message.userAvatar}
                  alt={message.userName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                />
              )}
              <div className={`flex flex-col gap-1 ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {!isCurrentUser && (
                  <span className="text-xs font-medium text-gray-600 px-3">
                    {message.userName}
                  </span>
                )}
                <div className={`group relative min-w-[80px] ${
                  isCurrentUser
                    ? 'bg-[#45C4A0] text-white rounded-[20px] rounded-tr-md'
                    : 'bg-[#f1f3f5] text-gray-900 rounded-[20px] rounded-tl-md'
                } px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow`}>
                  <p className="text-[14.5px] leading-[1.5]">{message.text}</p>
                  <span className={`text-[10px] mt-1 block opacity-70 ${
                    isCurrentUser ? 'text-white' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
              {isCurrentUser && (
                <img
                  src={message.userAvatar}
                  alt={message.userName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
                />
              )}
            </div>
          );
        })}
      </main>

      <div className="bg-white px-5 py-4 flex-shrink-0 border-t border-gray-100">
        <div className="flex gap-2 items-center bg-[#f8f9fa] rounded-[24px] px-4 py-2 focus-within:ring-2 focus-within:ring-[#45C4A0]/30 transition-all">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Message..."
            className="flex-1 bg-transparent border-0 focus:outline-none text-[15px] text-gray-900 placeholder:text-gray-400 py-2"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="w-9 h-9 flex items-center justify-center bg-[#45C4A0] text-white rounded-full hover:bg-[#3ab592] active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#45C4A0]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
