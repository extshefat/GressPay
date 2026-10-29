-- GressPay SQLite Core Schema (Parity with MySQL)
-- Table prefix: gp_

CREATE TABLE IF NOT EXISTS gp_merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id VARCHAR(24) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'merchant',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  plan_id VARCHAR(32) NOT NULL DEFAULT 'starter',
  plan_expires_at TEXT NULL,
  google_id VARCHAR(64) NULL,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  avatar_url TEXT NULL,
  google_email_verified INTEGER NOT NULL DEFAULT 0,
  brand_name VARCHAR(120) NULL,
  brand_logo_url TEXT NULL,
  support_contact VARCHAR(160) NULL,
  telegram_bot_token TEXT NULL,
  telegram_chat_id VARCHAR(64) NULL,
  discord_webhook_url TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL UNIQUE,
  merchant_id VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  currency_code VARCHAR(8) NOT NULL DEFAULT 'BDT',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  webhook_url TEXT,
  webhook_secret TEXT,
  payment_tolerance VARCHAR(16) NOT NULL DEFAULT '0',
  binance_pay_json TEXT,
  crypto_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  name VARCHAR(80) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  key_hash TEXT NOT NULL,
  mode VARCHAR(8) NOT NULL DEFAULT 'live',
  scopes TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_currency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  code VARCHAR(8) NOT NULL,
  symbol VARCHAR(8) NOT NULL,
  rate DECIMAL(20,8) NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(brand_id, code)
);

CREATE TABLE IF NOT EXISTS gp_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  code VARCHAR(40) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  options TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(brand_id, code)
);

CREATE TABLE IF NOT EXISTS gp_gateways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway_id VARCHAR(32) NOT NULL,
  brand_id VARCHAR(24) NOT NULL,
  method_code VARCHAR(40) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  account_type VARCHAR(40) NOT NULL DEFAULT 'personal',
  account TEXT,
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  country VARCHAR(8) NOT NULL DEFAULT 'BD',
  instructions TEXT,
  min_amount DECIMAL(20,8),
  max_amount DECIMAL(20,8),
  display_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'inactive',
  qr_object_key TEXT,
  qr_mime VARCHAR(64),
  qr_bytes INTEGER,
  qr_checksum VARCHAR(64),
  qr_status VARCHAR(16) NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(brand_id, gateway_id)
);

CREATE TABLE IF NOT EXISTS gp_platform_gateways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway_code VARCHAR(40) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'mfs',
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  instructions TEXT,
  min_amount DECIMAL(20,8) NOT NULL DEFAULT 10,
  max_amount DECIMAL(20,8) NOT NULL DEFAULT 100000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_payment_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  title VARCHAR(160) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  expires_at TEXT,
  description TEXT,
  webhook_url TEXT,
  ledger_mode VARCHAR(8) NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  customer_name VARCHAR(120),
  customer_email VARCHAR(160),
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'unpaid',
  due_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id VARCHAR(32) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  source VARCHAR(24) NOT NULL DEFAULT 'api',
  source_id VARCHAR(32),
  customer_json TEXT,
  amount DECIMAL(20,8) NOT NULL,
  fee DECIMAL(20,8) NOT NULL DEFAULT 0,
  discount DECIMAL(20,8) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL,
  local_net DECIMAL(20,8),
  local_currency VARCHAR(8),
  method_code VARCHAR(40),
  gateway_id VARCHAR(32),
  trx_id VARCHAR(80),
  evidence_type VARCHAR(32),
  evidence_ref VARCHAR(120),
  verified_amount DECIMAL(20,8),
  verified_currency VARCHAR(8),
  verified_at TEXT,
  merchant_trade_no VARCHAR(64),
  chain_tx_hash VARCHAR(80),
  ledger_mode VARCHAR(8) NOT NULL DEFAULT 'live',
  webhook_url TEXT,
  metadata TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'initiated',
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_payment_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NOT NULL,
  evidence_type VARCHAR(32) NOT NULL,
  provider_ref TEXT,
  amount DECIMAL(20,8),
  currency VARCHAR(8),
  meta_json TEXT,
  verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(session_id, evidence_type)
);

CREATE TABLE IF NOT EXISTS gp_sms_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  sender_key VARCHAR(24) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  trx_id VARCHAR(80) NOT NULL,
  number VARCHAR(32),
  device_id VARCHAR(28),
  idempotency_key VARCHAR(80),
  status VARCHAR(16) NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32),
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT,
  http_code INTEGER,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_webhook_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id VARCHAR(48) NOT NULL,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32),
  event_name VARCHAR(64) NOT NULL,
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT,
  http_code INTEGER,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  note TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  label TEXT,
  token_hash TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_rate_limit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket VARCHAR(80) NOT NULL UNIQUE,
  window_start INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gp_binance_callback_nonces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nonce VARCHAR(64) NOT NULL UNIQUE,
  merchant_trade_no TEXT,
  brand_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_provider_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  merchant_trade_no VARCHAR(64) NOT NULL,
  provider_order_id TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  raw_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(brand_id, merchant_trade_no),
  UNIQUE(session_id, provider)
);

CREATE TABLE IF NOT EXISTS gp_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id TEXT NOT NULL,
  session_id TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_oauth_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state VARCHAR(64) NOT NULL UNIQUE,
  nonce VARCHAR(64) NOT NULL,
  code_verifier TEXT,
  redirect_uri TEXT,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  description TEXT,
  price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  credit_allowance INTEGER NOT NULL DEFAULT 100,
  device_limit INTEGER NOT NULL DEFAULT 1,
  method_limit INTEGER NOT NULL DEFAULT 2,
  features_json TEXT,
  is_free INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_subscription_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  description TEXT,
  price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  credit_allowance INTEGER NOT NULL DEFAULT 100,
  device_limit INTEGER NOT NULL DEFAULT 1,
  method_limit INTEGER NOT NULL DEFAULT 2,
  features_json TEXT,
  is_free INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id VARCHAR(32) NOT NULL UNIQUE,
  merchant_id VARCHAR(24) NOT NULL,
  plan_id VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id VARCHAR(24) NOT NULL,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by VARCHAR(120) NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_email VARCHAR(120) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  details_json TEXT,
  ip_address VARCHAR(45),
  created_at TEXT NOT NULL
);
