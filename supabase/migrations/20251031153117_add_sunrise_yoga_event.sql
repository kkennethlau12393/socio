/*
  # Add Sunrise Yoga Event

  1. Changes
    - Re-add the Sunrise Yoga event that was previously deleted
    - Set it to a future date in December 2025
  
  2. Security
    - No security changes, uses existing RLS policies
*/

INSERT INTO events (
  id,
  title,
  description,
  location_name,
  latitude,
  longitude,
  start_time,
  end_time,
  category,
  visibility,
  host_type,
  host_id,
  university_id,
  image_url,
  capacity,
  current_attendees,
  is_trending,
  created_at
) VALUES (
  'd0c36481-223f-45b4-8a62-f0b6d5e9f236',
  'Sunrise Yoga on the Quad',
  'Start your day with mindful movement and meditation. All levels welcome, mats provided.',
  'Regent''s Park, Inner Circle',
  51.52654,
  -0.15666,
  '2025-12-01 06:00:00+00',
  '2025-12-01 07:30:00+00',
  'Sports & Fitness',
  'public',
  'society',
  'ed297dd7-b058-47d9-9f39-823b02e449a1',
  '821cc223-140a-45f8-8ba3-ce642792c6ec',
  'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=800',
  50,
  32,
  false,
  NOW()
) ON CONFLICT (id) DO NOTHING;