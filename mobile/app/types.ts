// src/types.ts

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;          // formatted label
  location: string;
  category: string;
  attendees?: number;
  // extra fields used in some components:
  time?: string;         // ISO string from Supabase
  image?: string;
  attendeeAvatars?: string[];
  createdBy?: string;
  isDemo?: boolean;
}

export interface Society {
  id: string;
  name: string;
  description: string;
  category: string;
  members?: number;

  // UI fields for cards / demo data:
  image?: string;
  emoji?: string;
  nextEvent?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members?: number;

  // UI fields for cards / demo data:
  image?: string;
  emoji?: string;
  nextEvent?: string;
}


export type TabType = 'discover' | 'map' | 'communities' | 'events' | 'profile';
