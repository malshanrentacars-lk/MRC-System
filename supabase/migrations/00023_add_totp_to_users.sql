-- Add TOTP (Google Authenticator) columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_setup_required BOOLEAN DEFAULT true;

-- All existing users must set up 2FA before accessing the system
UPDATE users SET totp_setup_required = true WHERE totp_setup_required IS NULL;
