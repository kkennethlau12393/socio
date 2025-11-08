/*
  # Fix Followers Table and Add Foreign Keys
  
  1. Changes
    - Delete orphaned follower records (where users don't exist in profiles)
    - Add foreign keys to enforce data integrity
*/

DELETE FROM followers
WHERE follower_id NOT IN (SELECT id FROM profiles)
   OR following_id NOT IN (SELECT id FROM profiles);

ALTER TABLE followers
  ADD CONSTRAINT followers_follower_id_fkey 
  FOREIGN KEY (follower_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE followers
  ADD CONSTRAINT followers_following_id_fkey 
  FOREIGN KEY (following_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;
