-- Create the token_submissions table for MoonSafe Meter
CREATE TABLE IF NOT EXISTS token_submissions (
    id BIGSERIAL PRIMARY KEY,
    token_name VARCHAR(255) NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    submitter_name VARCHAR(255) NOT NULL,
    submitter_contact VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    social_links TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_submissions_status ON token_submissions(status);
CREATE INDEX IF NOT EXISTS idx_token_submissions_created_at ON token_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_submissions_token_name ON token_submissions(token_name);
CREATE INDEX IF NOT EXISTS idx_token_submissions_token_address ON token_submissions(token_address);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_token_submissions_updated_at 
    BEFORE UPDATE ON token_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE token_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for the token_submissions table
-- Allow anyone to insert (submit tokens)
CREATE POLICY "Allow public to insert token submissions" ON token_submissions
    FOR INSERT WITH CHECK (true);

-- Allow anyone to read approved submissions (for display on website)
CREATE POLICY "Allow public to read approved submissions" ON token_submissions
    FOR SELECT USING (status = 'approved');

-- Allow public to read all submissions (for admin panel - we'll secure this with app-level auth)
CREATE POLICY "Allow public to read all submissions" ON token_submissions
    FOR SELECT USING (true);

-- Allow public to update submissions (for admin approval/rejection - we'll secure this with app-level auth)
CREATE POLICY "Allow public to update submissions" ON token_submissions
    FOR UPDATE USING (true);

-- Insert some sample data for testing (optional)
INSERT INTO token_submissions (token_name, token_address, submitter_name, submitter_contact, description, social_links, status) VALUES
('Sample Token 1', '0x1234567890abcdef1234567890abcdef12345678', 'John Doe', 't.me/johndoe', 'This is a sample token submission for testing purposes. It has some interesting features and potential red flags.', 'X: https://x.com/sampletoken1, Telegram: https://t.me/sampletoken1', 'pending'),
('Sample Token 2', '0xabcdef1234567890abcdef1234567890abcdef12', 'Jane Smith', 'discord.gg/janesmith', 'Another sample token with different characteristics. This one looks more promising but needs community review.', 'X: https://x.com/sampletoken2, Telegram: https://t.me/sampletoken2, Website: https://sampletoken2.com', 'approved'),
('Sample Token 3', '0x9876543210fedcba9876543210fedcba98765432', 'Bob Wilson', 't.me/bobwilson', 'This token has some concerning patterns that the community should be aware of. Multiple red flags detected.', 'X: https://x.com/sampletoken3, Discord: https://discord.gg/sampletoken3', 'rejected');

-- Grant necessary permissions
GRANT ALL ON token_submissions TO authenticated;
GRANT USAGE ON SEQUENCE token_submissions_id_seq TO authenticated; 