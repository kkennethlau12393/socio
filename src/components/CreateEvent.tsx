import { useState, useCallback } from 'react';
import { ArrowLeft, Upload, X, Calendar, MapPin, Users, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRef, useEffect } from 'react';
import { CATEGORY_COVER_PATH } from "../constants/covers";
import { LocationAutocomplete, PickedPlace } from "../components/LocationAutocomplete";

interface CreateEventProps {
  onBack: () => void;
  onEventCreated: () => void;
}

const CATEGORIES = [
  { name: 'Social', emoji: '🎉' },
  { name: 'Sports', emoji: '⚽' },
  { name: 'Academic', emoji: '📚' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Food', emoji: '🍕' },
  { name: 'Fitness', emoji: '💪' },
  { name: 'Arts', emoji: '🎨' },
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Other', emoji: '' }
];

const BANNED_WORDS = [
  'sex', 'sexual', 'porn', 'porno', 'pornography', 'hentai', 'xxx', 'nude', 'nudity', 'naked',
  'masturbation', 'masturbate', 'blowjob', 'bj', 'anal', 'cum', 'semen', 'dick', 'penis', 'vagina',
  'pussy', 'clit', 'orgasm', 'fetish', 'erotic', 'escort', 'threesome', 'gangbang', 'intercourse',
  'nsfw', 'bdsm', 'tits', 'boobs', 'ass', 'booty', 'onlyfans',
  'kill', 'murder', 'rape', 'assault', 'suicide', 'bomb', 'shoot', 'shooting', 'gun', 'knife', 'stab',
  'terrorist', 'terrorism', 'massacre', 'execute', 'genocide', 'blood', 'gore',
  'racist', 'nazi', 'hitler', 'kkk', 'slavery', 'lynch', 'fag', 'faggot', 'nigger', 'chink', 'spic',
  'retard', 'tranny', 'shemale', 'whore', 'slut', 'prostitute', 'pedo', 'pedophile',
  'crypto giveaway', 'prostitution', 'selfharm', 'cut', 'depression meetup', 'kill myself', 'dying', 'overdose'
];

const containsBannedWords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some(word => {
    const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lowerText);
  });
};

export const CreateEvent = ({ onBack, onEventCreated }: CreateEventProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [languages, setLanguages] = useState('');
  const [startTime, setStartTime] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [locationInput, setLocationInput] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PickedPlace | null>(null);

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setIsScrolled(scrollContainerRef.current.scrollTop > 10);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const toggleCategory = (categoryName: string) => {
    setSelectedCategory(prev => (prev === categoryName ? null : categoryName));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImageUrl(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImageUrl(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to create an event');
      return;
    }

    if (!title || !description || !selectedCategory || !startTime || !selectedPlace) {
      setError('Please fill in all required fields and pick a verified location.');
      return;
    }

    if (
      containsBannedWords(title) ||
      containsBannedWords(description) ||
      (selectedPlace?.formatted_address && containsBannedWords(selectedPlace.formatted_address))
    ) {
      setError('Event content contains inappropriate or prohibited words. Please review and update your event details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const languagesArray = languages
        .split(',')
        .map(lang => lang.trim())
        .filter(lang => lang.length > 0);

      const category = selectedCategory!;
      let finalImageUrl = imageUrl || null;

    if (!finalImageUrl) {
      let path;
      
      if (category === 'Social') {
        const hour = new Date(startTime).getHours();
        if (hour < 18) {
          path = CATEGORY_COVER_PATH['Social_Day'];
        } else {
          path = CATEGORY_COVER_PATH['Social_Night'];
        }
      } else {
        path = CATEGORY_COVER_PATH[category] || CATEGORY_COVER_PATH['Other'];
      }
      
      const { data } = supabase.storage.from('event-covers').getPublicUrl(path);
      finalImageUrl = data.publicUrl;
    }


      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title,
          description,
          category: category,
      location_name: selectedPlace.formatted_address,
          place_provider: selectedPlace.provider,
          place_id: selectedPlace.place_id,
          place_lat: selectedPlace.lat,
          place_lng: selectedPlace.lng,
          place_name: selectedPlace.place_name,
          formatted_address: selectedPlace.formatted_address,
          location_verified: true,
          start_time: startTime,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          image_url: finalImageUrl,
          created_by: user.id,
          current_attendees: 1,
          host_type: 'user',
          host_id: user.id,
          end_time: new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          languages: languagesArray.length > 0 ? languagesArray : null
        });

      if (insertError) throw insertError;

      const { data: eventData } = await supabase
        .from('events')
        .select('id')
        .eq('title', title)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (eventData) {
        await supabase
          .from('event_rsvps')
          .insert({
            event_id: eventData.id,
            user_id: user.id,
            status: 'going'
          });
      }

      onEventCreated();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-white z-50 flex flex-col ${
      isExiting ? 'animate-slideOutRight' : 'animate-slideInRight'
    }`}>
      <header className={`backdrop-blur-lg border-b flex-shrink-0 sticky top-0 z-10 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-sm border-gray-200' : 'bg-white/80 border-gray-100'
      }`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-[#1e293b]">Create Event</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900">
                Event Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's the name of your event?"
                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#45C4A0]/20 focus:border-[#45C4A0] transition-all text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people what your event is about..."
                rows={4}
                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#45C4A0]/20 focus:border-[#45C4A0] transition-all resize-none text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-900">
                Category *
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.slice(0, 6).map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 transition-all ${
                        selectedCategory === cat.name
                          ? 'border-[#45C4A0] bg-[#45C4A0]/10'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cat.emoji && <span className="text-lg">{cat.emoji}</span>}
                      <span className={`text-xs font-medium ${
                        selectedCategory === cat.name ? 'text-[#45C4A0]' : 'text-gray-600'
                      }`}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>

                {showAllCategories && (
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.slice(6).map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => toggleCategory(cat.name)}
                        className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 transition-all ${
                          selectedCategory === cat.name
                            ? 'border-[#45C4A0] bg-[#45C4A0]/10'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {cat.emoji && <span className="text-lg">{cat.emoji}</span>}
                        <span className={`text-xs font-medium ${
                          selectedCategory === cat.name ? 'text-[#45C4A0]' : 'text-gray-600'
                        }`}>
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium text-gray-600 hover:text-[#45C4A0] transition-colors"
                >
                  {showAllCategories ? 'Show Less' : 'Show More'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#45C4A0]" />
                  Location *
                </label>
                
                <LocationAutocomplete
                  value={locationInput}
                  onChangeText={(v) => {
                    setLocationInput(v);
                    setSelectedPlace(null);
                  }}
                  onSelect={(p) => {
                    setLocationInput(p.formatted_address);
                    setSelectedPlace(p);
                  }}
                  country="GB|HK"
                  placeholder="Search a place and pick from list"
                />
                
                {!selectedPlace && (
                  <p className="text-xs text-gray-500 mt-1">Pick a search result to verify the location.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#45C4A0]" />
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#45C4A0]/20 focus:border-[#45C4A0] transition-all text-gray-900"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#45C4A0]" />
                Max Attendees
              </label>
              <input
                type="number"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                placeholder="Leave empty for unlimited"
                min="1"
                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#45C4A0]/20 focus:border-[#45C4A0] transition-all text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 ml-1">Optional - leave blank if there's no limit</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900">
                Languages
              </label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="e.g., English, Mandarin, Spanish"
                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#45C4A0]/20 focus:border-[#45C4A0] transition-all text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 ml-1">Separate multiple languages with commas</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-900">
                Event Image
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
                  imageUrl ? 'h-72' : 'h-52'
                } ${
                  isDragging
                    ? 'border-4 border-[#45C4A0] bg-[#45C4A0]/5 scale-[1.02]'
                    : 'border-2 border-dashed border-gray-300 hover:border-[#45C4A0] bg-gray-50'
                }`}
              >
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Event preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg hover:scale-110 active:scale-95"
                    >
                      <X className="w-5 h-5 text-gray-700" />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                      <ImageIcon className="w-8 h-8 text-[#45C4A0]" />
                    </div>
                    <p className="text-gray-700 font-semibold mb-1">Drop your image here</p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                  </label>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm flex items-start gap-2 animate-[slideUp_0.3s_ease-out]">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#45C4A0] to-[#3BA889] text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Creating Event...' : 'Create Event'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
