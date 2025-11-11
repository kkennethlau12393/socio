import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  avatar_url?: string;
  university?: {
    name: string;
  };
  university_id: string;
  interests: string[];
  year_of_study?: number;
  degree?: string;
  nationality?: string;
  display_name?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: { firstName: string; lastName: string }
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signInWithProvider: (
    provider: 'google' | 'azure'
  ) => Promise<{ error: Error | null }>;
  signOut: (options?: { skipReload?: boolean }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

// IMPORTANT:
// For Expo native, set EXPO_PUBLIC_SUPABASE_REDIRECT_URL
// to your deep link or hosted callback URL.
// For web, we fall back to window.location.origin when available.
const getRedirectUrl = (): string | undefined => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/`;
    }
    return undefined;
  }

  // Native: prefer env (configure in app config)
  // e.g. "io.socio.app://auth-callback" or your scheme.
  if (
    typeof process !== 'undefined' &&
    // @ts-ignore env at runtime via Expo
    process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL
  ) {
    // @ts-ignore
    return process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL;
  }

  // Fallback: let Supabase use its default settings
  return undefined;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial session + subscription
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        await loadProfile(session.user.id);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          await loadProfile(nextUser.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          university:universities(name)
        `
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Exception loading profile:', err);
    }
  };

  const getUniversityIdFromEmail = async (
    email: string
  ): Promise<string | null> => {
    const emailLower = email.toLowerCase();
    let domain = '';

    if (emailLower.endsWith('@ucl.ac.uk'))
      domain = 'ucl.ac.uk';
    else if (emailLower.endsWith('@lse.ac.uk'))
      domain = 'lse.ac.uk';
    else if (emailLower.endsWith('@kcl.ac.uk'))
      domain = 'kcl.ac.uk';
    else if (
      emailLower.endsWith('@imperial.ac.uk')
    )
      domain = 'imperial.ac.uk';

    if (!domain) return null;

    const { data } = await supabase
      .from('universities')
      .select('id')
      .eq('domain', domain)
      .maybeSingle();

    return data?.id || null;
  };

  const signUp: AuthContextType['signUp'] =
    async (email, password, metadata) => {
      try {
        const universityId =
          await getUniversityIdFromEmail(email);

        const userData: Record<string, string> = {
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
        };

        if (universityId) {
          userData.university_id = universityId;
        }

        const redirectTo = getRedirectUrl();

        const { error } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              // For mobile, this should be a deep link configured in Supabase.
              emailRedirectTo: redirectTo,
              data: userData,
            },
          });

        return { error: error as any };
      } catch (err) {
        return { error: err as Error };
      }
    };

  const signIn: AuthContextType['signIn'] =
    async (email, password) => {
      try {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        return { error: error as any };
      } catch (err) {
        return { error: err as Error };
      }
    };

  const signInWithProvider: AuthContextType['signInWithProvider'] =
    async provider => {
      try {
        const redirectTo = getRedirectUrl();

        const { error } =
          await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo,
            },
          });

        return { error: error as any };
      } catch (err) {
        return { error: err as Error };
      }
    };

  const signOut: AuthContextType['signOut'] =
    async (_options) => {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      // No window.location.reload() in Expo.
      // Let your navigation / root layout react to user=null.
    };

  const refreshProfile =
    async () => {
      if (user) {
        await loadProfile(user.id);
      }
    };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
