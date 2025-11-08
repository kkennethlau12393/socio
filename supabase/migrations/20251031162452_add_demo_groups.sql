/*
  # Add Demo Groups

  1. New Data
    - Adds 4 demo groups to the groups table:
      - Poker Night Crew
      - Sunday Football
      - Board Game Enthusiasts
      - Morning Runners
  
  2. Details
    - Each group has a unique fixed UUID (g1, g2, g3, g4 become valid UUIDs)
    - Groups are created with demo images and descriptions
    - All groups are set to public (is_private = false)
    - Created_by is set to the first available profile in the database
*/

DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Get the first user ID from profiles
  SELECT id INTO first_user_id FROM profiles LIMIT 1;
  
  -- Insert demo groups with fixed UUIDs
  INSERT INTO groups (id, name, description, image_url, created_by, is_private)
  VALUES
    (
      '00000000-0000-0000-0000-000000000001',
      'Poker Night Crew',
      'Weekly poker games and tournaments',
      'https://images.pexels.com/photos/1871508/pexels-photo-1871508.jpeg?auto=compress&cs=tinysrgb&w=400',
      first_user_id,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000002',
      'Sunday Football',
      'Casual 5-a-side every Sunday morning',
      'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=400',
      first_user_id,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000003',
      'Board Game Enthusiasts',
      'Strategy games and friendly competition',
      'https://images.pexels.com/photos/776654/pexels-photo-776654.jpeg?auto=compress&cs=tinysrgb&w=400',
      first_user_id,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000004',
      'Morning Runners',
      '6AM runs around campus',
      'https://images.pexels.com/photos/2803158/pexels-photo-2803158.jpeg?auto=compress&cs=tinysrgb&w=400',
      first_user_id,
      false
    )
  ON CONFLICT (id) DO NOTHING;
END $$;
