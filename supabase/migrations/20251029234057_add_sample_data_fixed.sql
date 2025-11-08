/*
  # Add Sample Data for CampusLink

  ## Overview
  This migration adds sample data for testing the CampusLink application.

  ## Sample Data Includes
  1. Sample societies across different categories
  2. Sample events hosted by societies and universities
  3. Creates diverse event types and categories

  ## Important Notes
  - Uses conditional inserts to avoid conflicts
  - All timestamps are set relative to current date
*/

DO $$
DECLARE
  v_stanford_id uuid;
  v_tech_society_id uuid;
  v_sports_society_id uuid;
  v_arts_society_id uuid;
BEGIN
  SELECT id INTO v_stanford_id FROM universities WHERE domain = 'stanford.edu' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM societies WHERE name = 'Stanford Tech Club') THEN
    INSERT INTO societies (university_id, name, description, logo_url, category, member_count) VALUES
      (v_stanford_id, 'Stanford Tech Club', 'Building the future through technology and innovation. Weekly hackathons, speaker series, and startup pitches.', 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=200', 'Technology', 245);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM societies WHERE name = 'Cardinal Athletics Society') THEN
    INSERT INTO societies (university_id, name, description, logo_url, category, member_count) VALUES
      (v_stanford_id, 'Cardinal Athletics Society', 'For athletes and fitness enthusiasts. Group runs, intramural sports, and wellness workshops.', 'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=200', 'Sports & Fitness', 189);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM societies WHERE name = 'Creative Arts Collective') THEN
    INSERT INTO societies (university_id, name, description, logo_url, category, member_count) VALUES
      (v_stanford_id, 'Creative Arts Collective', 'Express yourself through art, music, and performance. Open mic nights, gallery shows, and collaborative projects.', 'https://images.pexels.com/photos/1053687/pexels-photo-1053687.jpeg?auto=compress&cs=tinysrgb&w=200', 'Arts & Culture', 156);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM societies WHERE name = 'Entrepreneurship Society') THEN
    INSERT INTO societies (university_id, name, description, logo_url, category, member_count) VALUES
      (v_stanford_id, 'Entrepreneurship Society', 'For aspiring founders and innovators. Pitch competitions, mentorship, and networking events.', 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=200', 'Entrepreneurship', 312);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM societies WHERE name = 'Environmental Action Group') THEN
    INSERT INTO societies (university_id, name, description, logo_url, category, member_count) VALUES
      (v_stanford_id, 'Environmental Action Group', 'Fighting for a sustainable future. Beach cleanups, tree planting, and advocacy campaigns.', 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=200', 'Environmental', 203);
  END IF;

  SELECT id INTO v_tech_society_id FROM societies WHERE name = 'Stanford Tech Club' LIMIT 1;
  SELECT id INTO v_sports_society_id FROM societies WHERE name = 'Cardinal Athletics Society' LIMIT 1;
  SELECT id INTO v_arts_society_id FROM societies WHERE name = 'Creative Arts Collective' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM events WHERE title = 'AI & Machine Learning Workshop') THEN
    INSERT INTO events (title, description, host_type, host_id, location_name, latitude, longitude, start_time, end_time, capacity, current_attendees, image_url, category, visibility, university_id, is_trending) VALUES
      (
        'AI & Machine Learning Workshop',
        'Join us for an intensive workshop on the latest ML frameworks and techniques. Hands-on coding sessions with industry experts.',
        'society',
        v_tech_society_id,
        'Gates Computer Science Building, Room 104',
        37.4300,
        -122.1730,
        NOW() + INTERVAL '2 days',
        NOW() + INTERVAL '2 days' + INTERVAL '3 hours',
        80,
        47,
        'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Technology',
        'uni_only',
        v_stanford_id,
        true
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM events WHERE title = 'Sunrise Yoga on the Quad') THEN
    INSERT INTO events (title, description, host_type, host_id, location_name, latitude, longitude, start_time, end_time, capacity, current_attendees, image_url, category, visibility, university_id, is_trending) VALUES
      (
        'Sunrise Yoga on the Quad',
        'Start your day with mindful movement and meditation. All levels welcome, mats provided.',
        'society',
        v_sports_society_id,
        'Main Quad Lawn',
        37.4275,
        -122.1697,
        NOW() + INTERVAL '1 day' + INTERVAL '6 hours',
        NOW() + INTERVAL '1 day' + INTERVAL '7 hours',
        50,
        32,
        'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Sports & Fitness',
        'public',
        v_stanford_id,
        false
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM events WHERE title = 'Open Mic Night') THEN
    INSERT INTO events (title, description, host_type, host_id, location_name, latitude, longitude, start_time, end_time, capacity, current_attendees, image_url, category, visibility, university_id, is_trending) VALUES
      (
        'Open Mic Night',
        'Showcase your talent or just enjoy the show. Music, poetry, comedy - all performances welcome!',
        'society',
        v_arts_society_id,
        'Tresidder Union, Oak Lounge',
        37.4266,
        -122.1706,
        NOW() + INTERVAL '5 days' + INTERVAL '19 hours',
        NOW() + INTERVAL '5 days' + INTERVAL '22 hours',
        120,
        78,
        'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Arts & Culture',
        'uni_only',
        v_stanford_id,
        true
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM events WHERE title = 'Campus Career Fair 2025') THEN
    INSERT INTO events (title, description, host_type, host_id, location_name, latitude, longitude, start_time, end_time, capacity, current_attendees, image_url, category, visibility, university_id, is_trending) VALUES
      (
        'Campus Career Fair 2025',
        'Connect with top employers and explore career opportunities. Bring your resume and dress professionally.',
        'university',
        v_stanford_id,
        'Arrillaga Alumni Center',
        37.4282,
        -122.1742,
        NOW() + INTERVAL '7 days' + INTERVAL '10 hours',
        NOW() + INTERVAL '7 days' + INTERVAL '16 hours',
        500,
        234,
        'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Career Development',
        'uni_only',
        v_stanford_id,
        true
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM events WHERE title = 'Study Break: Pizza & Games') THEN
    INSERT INTO events (title, description, host_type, host_id, location_name, latitude, longitude, start_time, end_time, capacity, current_attendees, image_url, category, visibility, university_id, is_trending) VALUES
      (
        'Study Break: Pizza & Games',
        'Take a break from midterms! Free pizza, board games, and good vibes.',
        'society',
        v_tech_society_id,
        'Huang Engineering Center, Basement',
        37.4283,
        -122.1765,
        NOW() + INTERVAL '3 days' + INTERVAL '18 hours',
        NOW() + INTERVAL '3 days' + INTERVAL '21 hours',
        60,
        41,
        'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Social Impact',
        'public',
        v_stanford_id,
        false
      );
  END IF;

END $$;
