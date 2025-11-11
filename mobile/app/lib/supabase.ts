import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log(
  'EXPO_PUBLIC_SUPABASE_URL =',
  supabaseUrl,
  '| HAS_ANON_KEY =',
  !!supabaseAnonKey
);

if (!supabaseUrl) {
  throw new Error(
    'supabaseUrl is required (check .env and EXPO_PUBLIC_SUPABASE_URL).'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'supabaseAnonKey is required (check .env and EXPO_PUBLIC_SUPABASE_ANON_KEY).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // important for Expo/Native (no URL to parse)
  },
});
