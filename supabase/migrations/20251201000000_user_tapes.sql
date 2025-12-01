-- User Tapes table for storing validated loan tapes
CREATE TABLE IF NOT EXISTS user_tapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  validation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  -- Store the validation result as JSONB for flexibility
  validation_data JSONB,
  -- Store cleaned data as JSONB (optional, for smaller tapes)
  cleaned_data JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX idx_user_tapes_user_id ON user_tapes(user_id);
CREATE INDEX idx_user_tapes_uploaded_at ON user_tapes(uploaded_at DESC);

-- Enable RLS
ALTER TABLE user_tapes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tapes
CREATE POLICY "Users can view own tapes"
  ON user_tapes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tapes
CREATE POLICY "Users can insert own tapes"
  ON user_tapes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tapes
CREATE POLICY "Users can update own tapes"
  ON user_tapes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tapes
CREATE POLICY "Users can delete own tapes"
  ON user_tapes FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_tapes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_tapes_updated_at
  BEFORE UPDATE ON user_tapes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tapes_updated_at();
