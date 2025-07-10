-- Update the token_submissions table to use contact instead of email
-- Run this in your Supabase SQL Editor

-- First, add the new submitter_contact column
ALTER TABLE token_submissions 
ADD COLUMN IF NOT EXISTS submitter_contact VARCHAR(255);

-- Update existing records to have a default contact if email exists
UPDATE token_submissions 
SET submitter_contact = 't.me/contact' 
WHERE submitter_contact IS NULL AND submitter_email IS NOT NULL;

-- Update existing records to have a default contact if no email exists
UPDATE token_submissions 
SET submitter_contact = 't.me/contact' 
WHERE submitter_contact IS NULL;

-- Make submitter_contact NOT NULL
ALTER TABLE token_submissions 
ALTER COLUMN submitter_contact SET NOT NULL;

-- Make social_links NOT NULL (update existing records first)
UPDATE token_submissions 
SET social_links = 'X: https://x.com/token, Telegram: https://t.me/token' 
WHERE social_links IS NULL OR social_links = '';

ALTER TABLE token_submissions 
ALTER COLUMN social_links SET NOT NULL;

-- Drop the old submitter_email column
ALTER TABLE token_submissions 
DROP COLUMN IF EXISTS submitter_email;

-- Verify the changes
SELECT id, token_name, submitter_name, submitter_contact, social_links FROM token_submissions LIMIT 5; 