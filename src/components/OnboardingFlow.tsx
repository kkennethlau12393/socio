import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingFlowProps {
  onComplete: () => void;
  onBack?: () => void;
}

interface University {
  id: string;
  name: string;
}

export const OnboardingFlow = ({ onComplete, onBack }: OnboardingFlowProps) => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    nationality: '',
    degree: '',
    yearOfStudy: '',
    interests: [] as string[],
  });

  const availableInterests = [
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
    { name: 'Coffee', emoji: '☕' }
  ];

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    const { data, error } = await supabase
      .from('universities')
      .select('id, name')
      .order('name');

    if (data && !error) {
      setUniversities(data);
    }
  };

  const toggleInterest = (interestName: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestName)
        ? prev.interests.filter(i => i !== interestName)
        : [...prev.interests, interestName]
    }));
  };

  const handleComplete = async () => {
    console.log('=== ONBOARDING: handleComplete called ===');
    console.log('User:', user);
    console.log('Step:', step);
    console.log('FormData:', formData);

    if (!user) {
      console.error('No user found!');
      return;
    }

    if (step === 1) {
      if (!formData.username || formData.interests.length === 0) {
        console.warn('Validation failed - missing required fields');
        alert('Please fill in all required fields');
        return;
      }

      console.log('Starting profile update...');
      setLoading(true);

      try {
        const updateData = {
          username: formData.username.trim(),
          nationality: formData.nationality?.trim() || null,
          degree: formData.degree?.trim() || null,
          year_of_study: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : null,
          interests: formData.interests,
          display_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || formData.username.trim(),
        };

        console.log('=== ONBOARDING UPDATE ===');
        console.log('User ID:', user.id);
        console.log('Update data:', updateData);

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id)
          .select()
          .single();

        console.log('Update response:', { data, error });

        if (error) {
          console.error('Supabase error:', error);
          alert(`Failed to save profile: ${error.message}`);
          setLoading(false);
          return;
        }

        if (!data) {
          console.error('No data returned from update');
          alert('Failed to save profile. Please try again.');
          setLoading(false);
          return;
        }

        console.log('Profile updated successfully!');
        console.log('Updated profile:', data);

        await refreshProfile();

        setLoading(false);
        onComplete();
      } catch (error) {
        console.error('Exception during update:', error);
        alert(`An error occurred: ${error}`);
        setLoading(false);
      }
    }
  };

  const firstName = user?.user_metadata?.first_name || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#45C4A0]/5 via-white to-[#45C4A0]/10 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <span className="text-5xl">👋</span>
            </div>
            <h1 className="text-3xl font-bold text-[#1e293b] mb-2">Hi {firstName}!</h1>
            <p className="text-gray-600 text-lg">Let's complete your profile</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 pl-4">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#45C4A0] focus:outline-none focus:ring-2 focus:ring-[#45C4A0]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 pl-4">
                Nationality
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="e.g., British, American"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#45C4A0] focus:outline-none focus:ring-2 focus:ring-[#45C4A0]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 pl-4">
                Degree
              </label>
              <input
                type="text"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#45C4A0] focus:outline-none focus:ring-2 focus:ring-[#45C4A0]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 pl-4">
                Year of Study
              </label>
              <select
                value={formData.yearOfStudy}
                onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#45C4A0] focus:outline-none focus:ring-2 focus:ring-[#45C4A0]/20 transition-all"
              >
                <option value="">Select year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 pl-4">
                Interests <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3 pl-4">Select at least one interest</p>
              <div className="grid grid-cols-2 gap-3">
                {availableInterests.map((interest) => (
                  <button
                    key={interest.name}
                    onClick={() => toggleInterest(interest.name)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                      formData.interests.includes(interest.name)
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
          </div>

          <button
            onClick={handleComplete}
            disabled={loading || !formData.username || formData.interests.length === 0}
            className="w-full py-4 bg-gradient-to-r from-[#45C4A0] to-[#3ab592] text-white font-semibold rounded-xl hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : 'Complete Profile'}
          </button>

          <p className="mt-4 text-xs text-center text-gray-500">
            * Required fields
          </p>
        </div>
      </div>
    </div>
  );
};
