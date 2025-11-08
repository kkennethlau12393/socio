export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  attendees?: number;
}

export interface Society {
  id: string;
  name: string;
  description: string;
  category: string;
  members?: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members?: number;
}

export type TabType = 'discover' | 'map' | 'communities' | 'events' | 'profile';
