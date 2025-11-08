import { useState, useEffect, useRef } from 'react';
import { X, Users, Calendar, MapPin } from 'lucide-react';
import { Society } from '../types';

interface SocietyModalProps {
  society: Society;
  onClose: () => void;
  onFollow: () => void;
}

export const SocietyModal = ({ society, onClose, onFollow }: SocietyModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const scrollPosition = useRef(0);

  useEffect(() => {
    setIsOpening(false);
  
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
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}>
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
          {society.image && (
            <img
              src={society.image}
              alt={society.name}
              className="w-full h-64 object-cover sm:rounded-t-2xl rounded-t-3xl"
            />
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-4xl">{society.emoji}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#1e293b] mb-1">{society.name}</h2>
              <span className="inline-block px-3 py-1 bg-[#45C4A0]/10 text-[#45C4A0] text-xs font-semibold rounded-full">
                {society.category}
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 text-gray-700">
              <Users className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#45C4A0]" />
              <div>
                <p className="font-semibold text-sm text-gray-500">Members</p>
                <p className="text-base">{society.members} members</p>
              </div>
            </div>

            {society.nextEvent && (
              <div className="flex items-start gap-3 text-gray-700">
                <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#45C4A0]" />
                <div>
                  <p className="font-semibold text-sm text-gray-500">Next Event</p>
                  <p className="text-base">{society.nextEvent}</p>
                </div>
              </div>
            )}

            <div>
              <p className="font-semibold text-sm text-gray-500 mb-2">About</p>
              <p className="text-gray-700 leading-relaxed">{society.description}</p>
            </div>
          </div>

          <button
            onClick={onFollow}
            className="w-full py-4 bg-[#45C4A0] text-white font-semibold rounded-xl hover:bg-[#3ab592] transition-all active:scale-[0.98]"
          >
            Follow Society
          </button>
        </div>
        </div>
      </div>
    </>
  );
};
