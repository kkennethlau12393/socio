// @ts-nocheck
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  X,
  Calendar,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORY_COVER_PATH } from '../constants/covers';
import {
  LocationAutocomplete,
  PickedPlace,
} from '../components/LocationAutocomplete';

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
  { name: 'Other', emoji: '' },
];

const BANNED_WORDS = [
  'sex',
  'sexual',
  'porn',
  'porno',
  'pornography',
  'hentai',
  'xxx',
  'nude',
  'nudity',
  'naked',
  'masturbation',
  'masturbate',
  'blowjob',
  'bj',
  'anal',
  'cum',
  'semen',
  'dick',
  'penis',
  'vagina',
  'pussy',
  'clit',
  'orgasm',
  'fetish',
  'erotic',
  'escort',
  'threesome',
  'gangbang',
  'intercourse',
  'nsfw',
  'bdsm',
  'tits',
  'boobs',
  'ass',
  'booty',
  'onlyfans',
  'kill',
  'murder',
  'rape',
  'assault',
  'suicide',
  'bomb',
  'shoot',
  'shooting',
  'gun',
  'knife',
  'stab',
  'terrorist',
  'terrorism',
  'massacre',
  'execute',
  'genocide',
  'blood',
  'gore',
  'racist',
  'nazi',
  'hitler',
  'kkk',
  'slavery',
  'lynch',
  'fag',
  'faggot',
  'nigger',
  'chink',
  'spic',
  'retard',
  'tranny',
  'shemale',
  'whore',
  'slut',
  'prostitute',
  'pedo',
  'pedophile',
  'crypto giveaway',
  'prostitution',
  'selfharm',
  'cut',
  'depression meetup',
  'kill myself',
  'dying',
  'overdose',
];

const containsBannedWords = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return regex.test(lowerText);
  });
};

// ---- Category layout constants (tight + uniform like web) ----
const NUM_COLS = 3;
const COL_GAP = 8;
const ROW_GAP = 12;
const BOX_HEIGHT = 44;

// Match ScrollView paddingHorizontal = 24
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 24;

// fixed width so every pill is identical, based on 3 columns + gap
const BOX_WIDTH =
  (SCREEN_WIDTH - H_PADDING * 2 - COL_GAP * (NUM_COLS - 1)) / NUM_COLS;

export const CreateEvent: React.FC<CreateEventProps> = ({
  onBack,
  onEventCreated,
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [languages, setLanguages] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PickedPlace | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  const slideX = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideX, opacity]);

  const animateExit = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: 40,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => finished && cb());
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsScrolled(e.nativeEvent.contentOffset.y > 10);
  };

  const handleBack = () => {
    if (loading) return;
    animateExit(onBack);
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategory((prev) =>
      prev === categoryName ? null : categoryName
    );
  };

  // ONE grid; Show More only changes how many entries we show.
  const visibleCategories = showAllCategories
    ? CATEGORIES
    : CATEGORIES.slice(0, 6);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access photos is required to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          setImageUrl(`data:${mime};base64,${asset.base64}`);
        } else if (asset.uri) {
          setImageUrl(asset.uri);
        }
      }
    } catch (err) {
      console.error('Image pick error', err);
      setError('Failed to pick image. Try again.');
    }
  }, []);

  const displayStartTime = startTime
    ? startTime.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const handleSubmit = async () => {
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
      (selectedPlace.formatted_address &&
        containsBannedWords(selectedPlace.formatted_address))
    ) {
      setError(
        'Event content contains inappropriate or prohibited words. Please review and update your event details.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const languagesArray = languages
        .split(',')
        .map((lang) => lang.trim())
        .filter((lang) => lang.length > 0);

      const category = selectedCategory!;
      const startIso = startTime.toISOString();

      let finalImageUrl: string | null = imageUrl || null;

      if (!finalImageUrl) {
        let path;
        if (category === 'Social') {
          const hour = startTime.getHours();
          path =
            hour < 18
              ? CATEGORY_COVER_PATH['Social_Day']
              : CATEGORY_COVER_PATH['Social_Night'];
        } else {
          path = CATEGORY_COVER_PATH[category] || CATEGORY_COVER_PATH['Other'];
        }
        const { data } = supabase.storage.from('event-covers').getPublicUrl(path);
        finalImageUrl = data.publicUrl;
      }

      const { error: insertError } = await supabase.from('events').insert({
        title,
        description,
        category,
        location_name: selectedPlace.formatted_address,
        place_provider: selectedPlace.provider,
        place_id: selectedPlace.place_id,
        place_lat: selectedPlace.lat,
        place_lng: selectedPlace.lng,
        place_name: selectedPlace.place_name,
        formatted_address: selectedPlace.formatted_address,
        location_verified: true,
        start_time: startIso,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        image_url: finalImageUrl,
        created_by: user.id,
        current_attendees: 1,
        host_type: 'user',
        host_id: user.id,
        end_time: new Date(startTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        languages: languagesArray.length > 0 ? languagesArray : null,
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
        await supabase.from('event_rsvps').insert({
          event_id: eventData.id,
          user_id: user.id,
          status: 'going',
        });
      }

      animateExit(onEventCreated);
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          opacity,
          transform: [{ translateX: slideX }],
        }}
      >
        {/* Header */}
        <View
          className={`px-6 pb-3 border-b flex-row items-center justify-between ${
            isScrolled
              ? 'bg-white border-gray-200 shadow-xs'
              : 'bg-white/95 border-gray-100'
          }`}
          style={{ paddingTop: 67 }}
        >
          <Pressable
            onPress={handleBack}
            className="w-9 h-9 items-center justify-center -ml-2 rounded-xl"
          >
            <ArrowLeft size={22} color="#4b5563" />
          </Pressable>
          <Text className="text-2xl font-bold text-[#1e293b]">
            Create Event
          </Text>
          <View className="w-9" />
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: H_PADDING,
            paddingVertical: 24,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {/* Event Name */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Event Name *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What's the name of your event?"
              placeholderTextColor="#9ca3af"
              className="w-full h-14 px-5 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 text-sm"
            />
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Description *
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell people what your event is about..."
              placeholderTextColor="#9ca3af"
              className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Category *
            </Text>

            <View style={styles.categoryGrid}>
              {visibleCategories.map((cat, index) => {
                const isSelected = selectedCategory === cat.name;
                const isLastInRow = (index + 1) % NUM_COLS === 0;
                const isLastRow =
                  index >= visibleCategories.length - NUM_COLS;

                return (
                  <Pressable
                    key={cat.name}
                    onPress={() => toggleCategory(cat.name)}
                    style={[
                      styles.categoryPill,
                      !isLastInRow && { marginRight: COL_GAP },
                      !isLastRow && { marginBottom: ROW_GAP }, // uniform row gap
                      isSelected
                        ? styles.categoryPillSelected
                        : styles.categoryPillDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected
                          ? styles.categoryTextSelected
                          : styles.categoryTextDefault,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Only this controls gap below last row; does NOT affect row-to-row spacing */}
           <Pressable
            onPress={() => setShowAllCategories((prev) => !prev)}
            style={{
              marginTop: 10,          // ↓ adjust vertical distance (was 12)
              transform: [
                { translateX: 2 },   // ← shift left (negative = left, positive = right)
                { translateY: 8 },    // ↓ shift slightly down
              ],
            }}
            className="flex-row items-center justify-center"
          >
            <Text className="text-sm font-medium text-gray-600 mr-1">
              {showAllCategories ? 'Show Less' : 'Show More'}
            </Text>
            <ChevronDown
              size={16}
              color="#6b7280"
              style={{
                transform: [
                  { rotate: showAllCategories ? '180deg' : '0deg' },
                ],
              }}
            />
</Pressable>
          </View>

          {/* Location */}
          <View className="mb-6" style={{ zIndex: 30 }}>
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Location *
            </Text>
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
              placeholder="Search a place and pick from list"
            />
            {!selectedPlace && (
              <Text className="text-xs text-gray-500 mt-1">
                Pick a search result to verify the location.
              </Text>
            )}
          </View>

          {/* Date & Time */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Date &amp; Time *
            </Text>
            <Pressable
              onPress={() => {
                setShowDatePicker(true);
              }}
              className="w-full h-14 px-5 bg-white border-2 border-gray-200 rounded-2xl flex-row items-center justify-between"
            >
              <Text
                className={`text-sm ${
                  displayStartTime ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {displayStartTime || 'Pick date & time'}
              </Text>
              <Calendar size={18} color="#45C4A0" />
            </Pressable>
            {showDatePicker && (
              <Text className="text-[10px] text-gray-500 mt-1">
                Connect your DateTimePicker here and call setStartTime(date).
              </Text>
            )}
          </View>

          {/* Max attendees */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Max Attendees
            </Text>
            <TextInput
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              placeholder="Leave empty for unlimited"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className="w-full h-14 px-5 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 text-sm"
            />
            <Text className="text-xs text-gray-500 mt-1">
              Optional – leave blank if there&apos;s no limit
            </Text>
          </View>

          {/* Languages */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Languages
            </Text>
            <TextInput
              value={languages}
              onChangeText={setLanguages}
              placeholder="e.g., English, Mandarin, Spanish"
              placeholderTextColor="#9ca3af"
              className="w-full h-14 px-5 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 text-sm"
            />
            <Text className="text-xs text-gray-500 mt-1">
              Separate multiple languages with commas
            </Text>
          </View>

          {/* Image picker */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">
              Event Image
            </Text>
            {imageUrl ? (
              <View className="relative w-full h-56 rounded-3xl overflow-hidden border border-gray-200">
                <Image
                  source={{ uri: imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setImageUrl('')}
                  className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full items-center justify-center"
                >
                  <X size={18} color="#4b5563" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-3xl bg-gray-50 items-center justify-center"
              >
                <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center mb-3">
                  <ImageIcon size={28} color="#45C4A0" />
                </View>
                <Text className="text-gray-700 font-semibold">
                  Tap to upload an image
                </Text>
                <Text className="text-sm text-gray-500">
                  Optional – a cover will be chosen if empty
                </Text>
              </Pressable>
            )}
          </View>

          {/* Error */}
          {error ? (
            <View className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={loading ? undefined : handleSubmit}
            disabled={loading}
            className={`w-full mb-6 rounded-2xl py-4 items-center justify-center ${
              loading ? 'bg-[#45C4A0]/70' : 'bg-[#45C4A0]'
            }`}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? 'Creating Event...' : 'Create Event'}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryPill: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderRadius: BOX_HEIGHT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  categoryPillSelected: {
    borderColor: '#45C4A0',
    backgroundColor: 'rgba(69,196,160,0.06)',
  },
  categoryPillDefault: {
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#45C4A0',
  },
  categoryTextDefault: {
    color: '#4b5563',
  },
});

export default CreateEvent;
