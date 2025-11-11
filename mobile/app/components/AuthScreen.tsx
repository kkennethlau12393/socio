// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import OnboardingFlow from './OnboardingFlow';

interface AuthScreenProps {
  // Called ONLY after onboarding is completed (then parent shows main app).
  onComplete: () => void;
}

type Mode = 'signin' | 'signup';
type Stage = 'auth' | 'verify' | 'onboarding';

// OAuth redirect URL for Expo Go (your user + slug)
const REDIRECT_URL =
  'exp://exp.host/@kenneth12393/mobile/--/auth/callback';

const ALLOWED_DOMAINS = [
  'ucl.ac.uk',
  'lse.ac.uk',
  'kcl.ac.uk',
  'imperial.ac.uk',
];

const DEV_ALLOWED_EMAILS = [
  'kenneth@tomlau.com',
  'kenneth@socio-app.com',
  'misha@socio-app.com',
];

WebBrowser.maybeCompleteAuthSession();

const validateEmailDomain = (email: string): boolean => {
  const emailLower = email.toLowerCase();
  if (DEV_ALLOWED_EMAILS.includes(emailLower)) return true;
  return ALLOWED_DOMAINS.some((domain) =>
    emailLower.endsWith(`@${domain}`)
  );
};

const isProfileComplete = (profile: any): boolean => {
  if (!profile) return false;
  return Boolean(
    profile.username &&
      profile.university &&
      profile.degree &&
      profile.year_of_study
  );
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onComplete }) => {
  const { user, profile, refreshProfile } = useAuth();

  const [mode, setMode] = useState<Mode>('signup');
  const [stage, setStage] = useState<Stage>('auth');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailForVerification, setEmailForVerification] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  // Supabase assets
  const LOGO_URL =
    supabase.storage.from('Logo').getPublicUrl('Logo/socio_real.png').data
      ?.publicUrl || '';

  const GOOGLE_LOGO_URL =
    supabase.storage.from('Logo').getPublicUrl('Google/google_logo.png').data
      ?.publicUrl || '';

  const MICROSOFT_LOGO_URL =
    supabase.storage
      .from('Logo')
      .getPublicUrl('Microsoft/microsoft_logo.png').data?.publicUrl || '';

  // On mount / auth change: if user exists, decide onboarding vs complete
  useEffect(() => {
    const syncUser = async () => {
      if (!user) return;

      try {
        await refreshProfile?.();
      } catch {
        // ignore
      }

      if (isProfileComplete(profile)) {
        onComplete();
      } else {
        setStage('onboarding');
      }
    };

    syncUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---------- HANDLERS ----------

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!firstName || !lastName) {
        setError('Please enter your first and last name.');
        setLoading(false);
        return;
      }

      if (!email || !password) {
        setError('Enter your email and password.');
        setLoading(false);
        return;
      }

      if (!validateEmailDomain(email)) {
        setError(
          'Please use a valid university email from UCL, LSE, KCL, or Imperial College London.'
        );
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) throw signUpError;

      // ✅ Go straight to email verification screen
      setEmailForVerification(email);
      setStage('verify');
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!email || !password) {
        setError('Enter your email and password.');
        setLoading(false);
        return;
      }

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      // Refresh profile then decide where to go
      await refreshProfile?.();

      if (isProfileComplete(profile)) {
        onComplete();
      } else {
        setStage('onboarding');
      }

      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'azure') => {
    try {
      setLoading(true);
      setError(null);

      const supabaseProvider = provider === 'azure' ? 'azure' : 'google';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider as any,
        options: {
          redirectTo: REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data?.url) {
        setError('No auth URL returned from Supabase.');
        setLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        REDIRECT_URL
      );

      if (result.type === 'success') {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (session?.user?.email) {
          const userEmail = session.user.email.toLowerCase();

          if (!validateEmailDomain(userEmail)) {
            await supabase.auth.signOut();
            setError(
              'Please use a valid university email from UCL, LSE, KCL, or Imperial College London.'
            );
            setLoading(false);
            return;
          }

          await refreshProfile?.();

          if (isProfileComplete(profile)) {
            onComplete();
          } else {
            setStage('onboarding');
          }

          setLoading(false);
          return;
        }

        setError('Sign in completed but no session/email found. Try again.');
      }

      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Unable to start social sign in.');
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    // Called by EmailVerificationScreen: user clicked "I've verified"
    try {
      await supabase.auth.getUser(); // refresh session
      await refreshProfile?.();
    } catch {
      // ignore
    }
    setStage('onboarding');
  };

  const handleBackToLogin = () => {
    setStage('auth');
    setMode('signin');
    setError(null);
  };

  const handleOnboardingComplete = () => {
    onComplete();
  };

  // ---------- STAGE RENDERING ----------

  if (stage === 'verify') {
    return (
      <EmailVerificationScreen
        email={emailForVerification}
        onVerified={handleVerified}
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  if (stage === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // ---------- AUTH SCREEN (SIGN UP / LOG IN) ----------

  const handleAuth = () => {
    if (isSignUp) return handleSignUp();
    return handleSignIn();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        <View className="flex-1 bg-white px-6">
          {/* Logo */}
          <View className="items-center mb-12">
            {LOGO_URL ? (
              <Image
                source={{ uri: LOGO_URL }}
                resizeMode="contain"
                style={{ width: 190, height: 56 }}
              />
            ) : (
              <Text className="text-4xl font-extrabold text-[#45C4A0]">
                socio
              </Text>
            )}
            <Text className="mt-4 text-sm text-gray-600">
              Join your campus community
            </Text>
          </View>

          {/* Mode toggle */}
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-10">
            <Pressable
              onPress={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-2xl items-center justify-center ${
                isSignUp ? 'bg-[#45C4A0]' : ''
              }`}
            >
              <Text
                className={`text-xs ${
                  isSignUp
                    ? 'text-white font-bold'
                    : 'text-gray-600'
                }`}
              >
                Sign up
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-2xl items-center justify-center ${
                !isSignUp ? 'bg-gray-200' : ''
              }`}
            >
              <Text
                className={`text-xs ${
                  !isSignUp
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-600'
                }`}
              >
                Log in
              </Text>
            </Pressable>
          </View>

          {/* Inputs */}
          <View className="space-y-4 mb-8">
            {isSignUp && (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1.5">
                    First name
                  </Text>
                  <View className="bg-white border border-gray-300 rounded-2xl px-4 py-3">
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="John"
                      placeholderTextColor="#9ca3af"
                      className="text-sm text-gray-900"
                    />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1.5">
                    Last name
                  </Text>
                  <View className="bg-white border border-gray-300 rounded-2xl px-4 py-3">
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                      placeholderTextColor="#9ca3af"
                      className="text-sm text-gray-900"
                    />
                  </View>
                </View>
              </View>
            )}

            <View>
              <Text className="text-xs text-gray-500 mb-1.5">
                {isSignUp ? 'University email' : 'Email'}
              </Text>
              <View className="bg-white border border-gray-300 rounded-2xl px-4 py-3">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={
                    isSignUp
                      ? 'your.name@ucl.ac.uk'
                      : 'you@example.com'
                  }
                  placeholderTextColor="#9ca3af"
                  className="text-sm text-gray-900"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs text-gray-500 mb-1.5">
                Password
              </Text>
              <View className="bg-white border border-gray-300 rounded-2xl px-4 py-3">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  className="text-sm text-gray-900"
                />
              </View>
            </View>
          </View>

          {/* Error */}
          {error && (
            <Text className="mb-3 text-xs text-red-500 text-center">
              {error}
            </Text>
          )}

          {/* Primary button */}
          <Pressable
            disabled={loading}
            onPress={handleAuth}
            className={`w-full rounded-2xl items-center justify-center ${
              isSignUp ? 'bg-[#45C4A0]' : 'bg-gray-900'
            }`}
            style={{
              paddingVertical: 16,
              marginBottom: 20,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                className={`text-base ${
                  isSignUp
                    ? 'text-white font-bold'
                    : 'text-white font-semibold'
                }`}
              >
                {isSignUp ? 'Sign up' : 'Log in'}
              </Text>
            )}
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center justify-center mb-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-3 text-[10px] text-gray-500">
              or continue with
            </Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google & Microsoft buttons */}
          <View className="flex-row items-center justify-center gap-4 mb-8">
            <Pressable
              onPress={() => handleOAuth('google')}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-white border border-gray-300 items-center justify-center"
            >
              <Image
                source={{ uri: GOOGLE_LOGO_URL }}
                resizeMode="contain"
                style={{ width: 25, height: 25 }}
              />
            </Pressable>

            <Pressable
              onPress={() => handleOAuth('azure')}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-white border border-gray-300 items-center justify-center"
            >
              <Image
                source={{ uri: MICROSOFT_LOGO_URL }}
                resizeMode="contain"
                style={{ width: 21.5, height: 21.5 }}
              />
            </Pressable>
          </View>

          {/* Terms */}
          <View className="items-center mt-8">
            <Text className="text-[10px] text-gray-500 text-center">
              By continuing you agree to Socio&apos;s Terms &amp; Privacy
              Policy.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingBottom: 60,
  },
});

export default AuthScreen;
