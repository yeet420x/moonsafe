-- Update the moonmeter_votes table to support token-specific voting
-- Run this in your Supabase SQL Editor

-- Add token_id column to moonmeter_votes table
ALTER TABLE moonmeter_votes 
ADD COLUMN IF NOT EXISTS token_id BIGINT REFERENCES token_submissions(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_moonmeter_votes_token_id ON moonmeter_votes(token_id);

-- Update RLS policies to allow token-specific votes
DROP POLICY IF EXISTS "Allow public to insert votes" ON moonmeter_votes;
DROP POLICY IF EXISTS "Allow public to read votes" ON moonmeter_votes;

CREATE POLICY "Allow public to insert votes" ON moonmeter_votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public to read votes" ON moonmeter_votes
    FOR SELECT USING (true);

-- Insert some sample votes for testing (optional)
-- These will be for the general meter (no token_id)
INSERT INTO moonmeter_votes (vote, created_at) VALUES 
(1, NOW()), -- low vote
(2, NOW()), -- medium vote
(3, NOW()), -- high vote
(1, NOW()), -- low vote
(2, NOW()); -- medium vote

-- Verify the changes
SELECT * FROM moonmeter_votes ORDER BY created_at DESC LIMIT 10; 