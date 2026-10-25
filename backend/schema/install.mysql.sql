-- GressPay MariaDB/MySQL schema. Prefix gp_.

CREATE TABLE IF NOT EXISTS gp_merchants (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  merchant_id VARCHAR(24) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NULL,
  google_id VARCHAR(64) NULL,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  avatar_url TEXT NULL,
  google_email_verified INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  INDEX idx_gp_merchant_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_brands (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL UNIQUE,
  merchant_id VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  currency_code VARCHAR(8) NOT NULL DEFAULT 'BDT',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  webhook_url TEXT NULL,
  webhook_secret TEXT NULL,
  payment_tolerance VARCHAR(16) NOT NULL DEFAULT '0',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_api_keys (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  name VARCHAR(80) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  key_hash TEXT NOT NULL,
  mode VARCHAR(8) NOT NULL DEFAULT 'live',
  scopes TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  last_used_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  INDEX (prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_currency (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  code VARCHAR(8) NOT NULL,
  symbol VARCHAR(8) NOT NULL,
  rate DECIMAL(20,8) NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  UNIQUE KEY brand_code (brand_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_methods (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  code VARCHAR(40) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  options TEXT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  UNIQUE KEY brand_method (brand_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_gateways (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  gateway_id VARCHAR(32) NOT NULL,
  brand_id VARCHAR(24) NOT NULL,
  method_code VARCHAR(40) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  account_type VARCHAR(40) NOT NULL DEFAULT 'personal',
  account VARCHAR(160) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  country VARCHAR(8) NOT NULL DEFAULT 'BD',
  instructions TEXT NULL,
  min_amount DECIMAL(20,8) NULL,
  max_amount DECIMAL(20,8) NULL,
  display_order INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'inactive',
  qr_object_key VARCHAR(512) NULL,
  qr_mime VARCHAR(64) NULL,
  qr_bytes INT NULL,
  qr_checksum VARCHAR(64) NULL,
  qr_status VARCHAR(16) NOT NULL DEFAULT 'none',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  UNIQUE KEY uq_gp_gw_brand_id (brand_id, gateway_id),
  KEY idx_gp_gw_brand_method (brand_id, method_code, status),
  KEY idx_gp_gw_brand_order (brand_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_payment_links (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  link_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  title VARCHAR(160) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  expires_at VARCHAR(32) NULL,
  description TEXT NULL,
  webhook_url TEXT NULL,
  ledger_mode VARCHAR(8) NOT NULL DEFAULT 'live',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_invoices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  customer_name VARCHAR(120) NULL,
  customer_email VARCHAR(160) NULL,
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'unpaid',
  due_at VARCHAR(32) NULL,
  note TEXT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_transactions (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(32) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  source VARCHAR(24) NOT NULL DEFAULT 'api',
  source_id VARCHAR(32) NULL,
  customer_json TEXT NULL,
  amount DECIMAL(20,8) NOT NULL,
  fee DECIMAL(20,8) NOT NULL DEFAULT 0,
  discount DECIMAL(20,8) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL,
  local_net DECIMAL(20,8) NULL,
  local_currency VARCHAR(8) NULL,
  method_code VARCHAR(40) NULL,
  gateway_id VARCHAR(32) NULL,
  trx_id VARCHAR(80) NULL,
  ledger_mode VARCHAR(8) NOT NULL DEFAULT 'live',
  webhook_url TEXT NULL,
  metadata TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'initiated',
  expires_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  INDEX (brand_id),
  INDEX (trx_id),
  INDEX (gateway_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_sms_data (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  sender_key VARCHAR(24) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  trx_id VARCHAR(80) NOT NULL,
  number VARCHAR(32) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'approved',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_webhook_log (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NULL,
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT NULL,
  http_code INT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_devices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  token_hash TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_rate_limit (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(80) NOT NULL UNIQUE,
  window_start INT NOT NULL,
  hit_count INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_binance_callback_nonces (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nonce VARCHAR(64) NOT NULL,
  merchant_trade_no VARCHAR(64),
  brand_id VARCHAR(24),
  created_at VARCHAR(32) NOT NULL,
  UNIQUE KEY uq_gp_binance_nonce (nonce)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gp_audit_log (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32),
  actor_id VARCHAR(32),
  action VARCHAR(64) NOT NULL,
  meta_json TEXT,
  created_at VARCHAR(32) NOT NULL,
  KEY idx_gp_audit_brand (brand_id),
  KEY idx_gp_audit_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
