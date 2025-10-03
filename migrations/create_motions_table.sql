-- Create motions table for agenda proposals and negotiation
CREATE TABLE IF NOT EXISTS motions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  proposer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'proposed',
  negotiation_history JSONB DEFAULT '[]'::jsonb,
  agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT motions_title_length CHECK (char_length(title) >= 10 AND char_length(title) <= 300),
  CONSTRAINT motions_description_length CHECK (char_length(description) >= 50 AND char_length(description) <= 2000),
  CONSTRAINT motions_status_check CHECK (status IN ('proposed', 'under_negotiation', 'agreed', 'rejected'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_motions_room_id ON motions(room_id);
CREATE INDEX IF NOT EXISTS idx_motions_proposer_id ON motions(proposer_id);
CREATE INDEX IF NOT EXISTS idx_motions_status ON motions(status);

-- Unique constraint: one motion per room
CREATE UNIQUE INDEX IF NOT EXISTS idx_motions_room_id_unique ON motions(room_id);

-- RLS (Row Level Security) policies
ALTER TABLE motions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view motions for rooms they are part of
CREATE POLICY motions_select_policy ON motions
  FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM rooms
      WHERE creator_id = auth.uid()
         OR participant_id = auth.uid()
    )
  );

-- Policy: Only room members can insert motions
CREATE POLICY motions_insert_policy ON motions
  FOR INSERT
  WITH CHECK (
    proposer_id = auth.uid() AND
    room_id IN (
      SELECT id FROM rooms
      WHERE creator_id = auth.uid()
         OR participant_id = auth.uid()
    )
  );

-- Policy: Only room members can update motions
CREATE POLICY motions_update_policy ON motions
  FOR UPDATE
  USING (
    room_id IN (
      SELECT id FROM rooms
      WHERE creator_id = auth.uid()
         OR participant_id = auth.uid()
    )
  );

-- Policy: Only room creator can delete motions
CREATE POLICY motions_delete_policy ON motions
  FOR DELETE
  USING (
    room_id IN (
      SELECT id FROM rooms
      WHERE creator_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_motions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS motions_updated_at_trigger ON motions;
CREATE TRIGGER motions_updated_at_trigger
  BEFORE UPDATE ON motions
  FOR EACH ROW
  EXECUTE FUNCTION update_motions_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON motions TO authenticated;
GRANT SELECT ON motions TO anon;
