/*
  # Add Followers/Following System

  1. New Tables
    - `followers`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles) - The user who is following
      - `following_id` (uuid, references profiles) - The user being followed
      - `created_at` (timestamptz)
      - Unique constraint on (follower_id, following_id) to prevent duplicate follows

  2. Security
    - Enable RLS on `followers` table
    - Users can view their own followers and following
    - Users can view followers/following of users they follow
    - Users can insert new follows (follow others)
    - Users can delete their own follows (unfollow)

  3. Indexes
    - Index on follower_id for efficient follower lookups
    - Index on following_id for efficient following lookups
*/

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);

-- Enable RLS
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own followers
CREATE POLICY "Users can view own followers"
  ON followers FOR SELECT
  TO authenticated
  USING (following_id = auth.uid());

-- Policy: Users can view their own following
CREATE POLICY "Users can view own following"
  ON followers FOR SELECT
  TO authenticated
  USING (follower_id = auth.uid());

-- Policy: Users can view followers/following of users they follow
CREATE POLICY "Users can view followed users relationships"
  ON followers FOR SELECT
  TO authenticated
  USING (
    following_id IN (
      SELECT following_id FROM followers WHERE follower_id = auth.uid()
    )
    OR follower_id IN (
      SELECT following_id FROM followers WHERE follower_id = auth.uid()
    )
  );

-- Policy: Users can follow others
CREATE POLICY "Users can follow others"
  ON followers FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- Policy: Users can unfollow others
CREATE POLICY "Users can unfollow"
  ON followers FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());