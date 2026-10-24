-- Migration 002: Google OAuth 2.0 / OpenID Connect and Multi-Merchant enhancements
-- Author: GressPay Architecture

-- 1. Add OAuth provider columns to gp_merchants
ALTER TABLE gp_merchants ADD COLUMN google_id VARCHAR(64) NULL;
ALTER TABLE gp_merchants ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE gp_merchants ADD COLUMN avatar_url TEXT NULL;
ALTER TABLE gp_merchants ADD COLUMN google_email_verified INT NOT NULL DEFAULT 0;

-- 2. Create state/nonce storage for CSRF and PKCE replay protection
CREATE TABLE IF NOT EXISTS gp_oauth_states (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  state VARCHAR(64) NOT NULL UNIQUE,
  nonce VARCHAR(64) NOT NULL,
  code_verifier VARCHAR(128) NULL,
  redirect_uri TEXT NULL,
  expires_at INT NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  INDEX idx_gp_oauth_state (state),
  INDEX idx_gp_oauth_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
