import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  signUp: (email: string, password: string, metadata?: { firstName: string; lastName: string }) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithProvider: (provider: 'google' | 'azure') => Promise<{ error: Error | null }>;
  signOut: (options?: { skipReload?: boolean }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          university:universities(name)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      console.log('Profile loaded:', data);

      if (data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Exception loading profile:', error);
    }
  };

  const getUniversityIdFromEmail = async (email: string): Promise<string | null> => {
    const emailLower = email.toLowerCase();
    let domain = '';

    if (emailLower.endsWith('@ucl.ac.uk')) domain = 'ucl.ac.uk';
    else if (emailLower.endsWith('@lse.ac.uk')) domain = 'lse.ac.uk';
    else if (emailLower.endsWith('@kcl.ac.uk')) domain = 'kcl.ac.uk';
    else if (emailLower.endsWith('@imperial.ac.uk')) domain = 'imperial.ac.uk';

    if (!domain) return null;

    const { data } = await supabase
      .from('universities')
      .select('id')
      .eq('domain', domain)
      .maybeSingle();

    return data?.id || null;
  };

  const signUp = async (email: string, password: string, metadata?: { firstName: string; lastName: string }) => {
    try {
      const universityId = await getUniversityIdFromEmail(email);

      const userData: Record<string, string> = {
        first_name: metadata?.firstName || '',
        last_name: metadata?.lastName || '',
      };

      if (universityId) {
        userData.university_id = universityId;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: userData,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'azure') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async (options?: { skipReload?: boolean }) => {
    await supabase.auth.signOut();
    setProfile(null);
    if (!options?.skipReload) {
      window.location.reload();
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
