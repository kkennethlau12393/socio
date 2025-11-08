import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface AddInterestModalProps {
  onClose: () => void;
  onAdd: (interests: string[]) => void;
  existingInterests: string[];
}

const AVAILABLE_INTERESTS = [
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Sports', emoji: '⚽' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Technology', emoji: '💻' },
  { name: 'Arts', emoji: '🎨' },
  { name: 'Photography', emoji: '📸' },
  { name: 'Fitness', emoji: '💪' },
  { name: 'Cooking', emoji: '🍳' },
  { name: 'Travel', emoji: '✈️' },
  { name: 'Reading', emoji: '📚' },
  { name: 'Movies', emoji: '🎬' },
  { name: 'Coffee', emoji: '☕' },
  { name: 'Fashion', emoji: '👗' },
  { name: 'Dance', emoji: '💃' },
  { name: 'Theatre', emoji: '🎭' },
  { name: 'Science', emoji: '🔬' },
  { name: 'Business', emoji: '💼' },
  { name: 'Environment', emoji: '🌱' },
];

export const AddInterestModal = ({ onClose, onAdd, existingInterests }: AddInterestModalProps) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(existingInterests);
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

  const toggleInterest = (interestName: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestName)
        ? prev.filter(i => i !== interestName)
        : [...prev, interestName]
    );
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSave = () => {
    onAdd(selectedInterests);
    handleClose();
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}>
        <div
          className={`bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto relative transition-transform duration-300 ease-out ${isOpening ? 'translate-y-full' : isClosing ? 'translate-y-full' : 'translate-y-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-[#1e293b]">Manage Interests</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select your interests
              </label>
              <p className="text-xs text-gray-500 mb-4">Tap to select or deselect</p>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_INTERESTS.map((interest) => (
                  <button
                    key={interest.name}
                    onClick={() => toggleInterest(interest.name)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                      selectedInterests.includes(interest.name)
                        ? 'bg-gradient-to-br from-[#45C4A0] to-[#3ab592] text-white shadow-lg scale-105'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 shadow-sm'
                    }`}
                  >
                    <span className="text-xl mb-1 block">{interest.emoji}</span>
                    <span className="text-sm">{interest.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3 bg-gradient-to-r from-[#45C4A0] to-[#3ab592] text-white font-semibold rounded-xl hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
