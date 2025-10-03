-- Add is_private column to rooms table
-- This migration adds support for private rooms that are only accessible via room code
-- Migration: add_is_private_to_rooms
-- Date: 2025-10-03

-- Add is_private column with default value false
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN rooms.is_private IS 'Whether the room is private (only accessible via room code) or public (visible in room list)';

-- Create index for filtering public rooms
CREATE INDEX IF NOT EXISTS idx_rooms_is_private ON rooms(is_private) WHERE is_private = false;

-- Update RLS policies to handle private rooms
-- Note: This assumes RLS is enabled on the rooms table
-- Users should only see private rooms they are members of

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own rooms" ON rooms;

-- Create updated policy for viewing rooms
CREATE POLICY "Users can view their own rooms" ON rooms
  FOR SELECT
  USING (
    -- User is creator or participant
    auth.uid() = creator_id
    OR auth.uid() = participant_id
    -- Or room is public
    OR is_private = false
  );

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rooms'
    AND column_name = 'is_private'
  ) THEN
    RAISE NOTICE 'Column is_private successfully added to rooms table';
  ELSE
    RAISE EXCEPTION 'Failed to add is_private column to rooms table';
  END IF;
END $$;