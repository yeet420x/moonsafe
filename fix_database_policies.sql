-- Fix the RLS policies to allow the admin panel to read all submissions
-- Run this in your Supabase SQL Editor

-- First, drop the existing policies
DROP POLICY IF EXISTS "Allow public to read approved submissions" ON token_submissions;
DROP POLICY IF EXISTS "Allow public to read all submissions" ON token_submissions;
DROP POLICY IF EXISTS "Allow public to update submissions" ON token_submissions;

-- Create new policies that allow full access (we'll secure this with app-level auth)
CREATE POLICY "Allow public to read all submissions" ON token_submissions
    FOR SELECT USING (true);

CREATE POLICY "Allow public to update submissions" ON token_submissions
    FOR UPDATE USING (true);

-- Verify the policies are working
SELECT * FROM token_submissions ORDER BY created_at DESC LIMIT 10; 