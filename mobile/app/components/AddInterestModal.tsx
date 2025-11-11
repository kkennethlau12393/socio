import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { X } from 'lucide-react-native';

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

export const AddInterestModal: React.FC<AddInterestModalProps> = ({
  onClose,
  onAdd,
  existingInterests,
}) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    existingInterests
  );
  const [visible, setVisible] = useState(true);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const toggleInterest = (interestName: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestName)
        ? prev.filter((i) => i !== interestName)
        : [...prev, interestName]
    );
  };

  const closeWithAnimation = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 40,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      after?.();
    });
  };

  const handleClose = () => {
    closeWithAnimation(onClose);
  };

  const handleSave = () => {
    onAdd(selectedInterests);
    closeWithAnimation(onClose);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity,
          justifyContent: 'flex-end',
        }}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View className="flex-1 w-full" />
        </TouchableWithoutFeedback>

        <Animated.View
          style={{
            transform: [{ translateY }],
          }}
          className="bg-white w-full max-h-[90%] rounded-t-3xl pt-2 pb-4"
        >
          {/* Header */}
          <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-[#1e293b]">
              Manage Interests
            </Text>
            <Pressable
              onPress={handleClose}
              className="w-9 h-9 bg-gray-100 rounded-full items-center justify-center"
            >
              <X size={18} color="#374151" />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView
            className="px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-1">
                Select your interests
              </Text>
              <Text className="text-xs text-gray-500 mb-3">
                Tap to select or deselect
              </Text>

              <View className="flex-row flex-wrap gap-3">
                {AVAILABLE_INTERESTS.map((interest) => {
                  const active = selectedInterests.includes(
                    interest.name
                  );
                  return (
                    <Pressable
                      key={interest.name}
                      onPress={() =>
                        toggleInterest(
                          interest.name
                        )
                      }
                      className={`w-[47%] px-3 py-3 rounded-xl items-start ${
                        active
                          ? 'bg-[#45C4A0] shadow-lg'
                          : 'bg-gray-50 shadow-sm'
                      }`}
                    >
                      <Text
                        className={`text-2xl mb-1 ${
                          active
                            ? 'text-white'
                            : 'text-gray-800'
                        }`}
                      >
                        {interest.emoji}
                      </Text>
                      <Text
                        className={`text-sm font-medium ${
                          active
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      >
                        {interest.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              className="w-full mt-2 py-3 rounded-xl bg-[#45C4A0] items-center justify-center"
            >
              <Text className="text-white font-semibold">
                Save Changes
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
