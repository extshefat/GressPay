-- GressPay PostgreSQL Core Schema
-- Table prefix: gp_

CREATE TABLE IF NOT EXISTS gp_merchants (
  id SERIAL PRIMARY KEY,
  merchant_id VARCHAR(24) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'merchant',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  plan_id VARCHAR(32) NOT NULL DEFAULT 'starter',
  plan_expires_at VARCHAR(32) NULL,
  google_id VARCHAR(64) NULL,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  avatar_url TEXT NULL,
  google_email_verified INTEGER NOT NULL DEFAULT 0,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_merchant_google_id ON gp_merchants (google_id);
CREATE INDEX IF NOT EXISTS idx_gp_merchant_role ON gp_merchants (role);
CREATE INDEX IF NOT EXISTS idx_gp_merchant_status ON gp_merchants (status);
CREATE INDEX IF NOT EXISTS idx_gp_merchant_plan ON gp_merchants (plan_id);

CREATE TABLE IF NOT EXISTS gp_brands (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL UNIQUE,
  merchant_id VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  currency_code VARCHAR(8) NOT NULL DEFAULT 'BDT',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  webhook_url TEXT NULL,
  webhook_secret TEXT NULL,
  payment_tolerance VARCHAR(16) NOT NULL DEFAULT '0',
  binance_pay_json TEXT NULL,
  crypto_enabled INTEGER NOT NULL DEFAULT 0,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_brand_merchant ON gp_brands (merchant_id);

CREATE TABLE IF NOT EXISTS gp_api_keys (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  name VARCHAR(80) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  key_hash TEXT NOT NULL,
  mode VARCHAR(8) NOT NULL DEFAULT 'live',
  scopes TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  last_used_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_key_prefix ON gp_api_keys (prefix);
CREATE INDEX IF NOT EXISTS idx_gp_key_brand ON gp_api_keys (brand_id);

CREATE TABLE IF NOT EXISTS gp_currency (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  code VARCHAR(8) NOT NULL,
  symbol VARCHAR(8) NOT NULL,
  rate DECIMAL(20,8) NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  CONSTRAINT uq_gp_currency_brand_code UNIQUE (brand_id, code)
);

CREATE TABLE IF NOT EXISTS gp_methods (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  code VARCHAR(40) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  options TEXT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  CONSTRAINT uq_gp_methods_brand_code UNIQUE (brand_id, code)
);

CREATE TABLE IF NOT EXISTS gp_gateways (
  id SERIAL PRIMARY KEY,
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
  display_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'inactive',
  qr_object_key VARCHAR(512) NULL,
  qr_mime VARCHAR(64) NULL,
  qr_bytes INTEGER NULL,
  qr_checksum VARCHAR(64) NULL,
  qr_status VARCHAR(16) NOT NULL DEFAULT 'none',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  CONSTRAINT uq_gp_gw_brand_id UNIQUE (brand_id, gateway_id)
);
CREATE INDEX IF NOT EXISTS idx_gp_gw_brand_method ON gp_gateways (brand_id, method_code, status);
CREATE INDEX IF NOT EXISTS idx_gp_gw_brand_order ON gp_gateways (brand_id, display_order);

CREATE TABLE IF NOT EXISTS gp_platform_gateways (
  id SERIAL PRIMARY KEY,
  gateway_code VARCHAR(40) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'mfs',
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  instructions TEXT NULL,
  min_amount DECIMAL(20,8) NOT NULL DEFAULT 10,
  max_amount DECIMAL(20,8) NOT NULL DEFAULT 100000,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_pg_cat ON gp_platform_gateways (category);
CREATE INDEX IF NOT EXISTS idx_gp_pg_enabled ON gp_platform_gateways (is_enabled);

CREATE TABLE IF NOT EXISTS gp_payment_links (
  id SERIAL PRIMARY KEY,
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
);
CREATE INDEX IF NOT EXISTS idx_gp_links_brand ON gp_payment_links (brand_id);

CREATE TABLE IF NOT EXISTS gp_invoices (
  id SERIAL PRIMARY KEY,
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
);
CREATE INDEX IF NOT EXISTS idx_gp_inv_brand ON gp_invoices (brand_id);

CREATE TABLE IF NOT EXISTS gp_transactions (
  id SERIAL PRIMARY KEY,
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
  evidence_type VARCHAR(32) NULL,
  evidence_ref VARCHAR(120) NULL,
  verified_amount DECIMAL(20,8) NULL,
  verified_currency VARCHAR(8) NULL,
  verified_at VARCHAR(32) NULL,
  merchant_trade_no VARCHAR(64) NULL,
  chain_tx_hash VARCHAR(80) NULL,
  ledger_mode VARCHAR(8) NOT NULL DEFAULT 'live',
  webhook_url TEXT NULL,
  metadata TEXT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'initiated',
  expires_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_txn_brand ON gp_transactions (brand_id);
CREATE INDEX IF NOT EXISTS idx_gp_txn_trx ON gp_transactions (trx_id);
CREATE INDEX IF NOT EXISTS idx_gp_txn_gateway ON gp_transactions (gateway_id);
CREATE INDEX IF NOT EXISTS idx_gp_txn_status ON gp_transactions (status);
CREATE INDEX IF NOT EXISTS idx_gp_txn_brand_trx ON gp_transactions (brand_id, trx_id);

CREATE TABLE IF NOT EXISTS gp_payment_evidence (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NOT NULL,
  evidence_type VARCHAR(32) NOT NULL,
  provider_ref VARCHAR(160) NULL,
  amount DECIMAL(20,8) NULL,
  currency VARCHAR(8) NULL,
  meta_json TEXT NULL,
  verified_at VARCHAR(32) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  CONSTRAINT uq_gp_evidence_session_type UNIQUE (session_id, evidence_type)
);
CREATE INDEX IF NOT EXISTS idx_gp_evidence_brand ON gp_payment_evidence (brand_id);

CREATE TABLE IF NOT EXISTS gp_sms_data (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  sender_key VARCHAR(24) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  trx_id VARCHAR(80) NOT NULL,
  number VARCHAR(32) NULL,
  device_id VARCHAR(28) NULL,
  idempotency_key VARCHAR(80) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'approved',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_sms_brand_trx ON gp_sms_data (brand_id, trx_id);

CREATE TABLE IF NOT EXISTS gp_webhook_log (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NULL,
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT NULL,
  http_code INTEGER NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_webhook_deliveries (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(48) NOT NULL,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NULL,
  event_name VARCHAR(64) NOT NULL,
  url TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT NULL,
  http_code INTEGER NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  note TEXT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_wh_event ON gp_webhook_deliveries (event_id);
CREATE INDEX IF NOT EXISTS idx_gp_wh_brand ON gp_webhook_deliveries (brand_id);

CREATE TABLE IF NOT EXISTS gp_devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(28) NOT NULL UNIQUE,
  brand_id VARCHAR(24) NOT NULL,
  label VARCHAR(80) NULL,
  token_hash TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  last_seen_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_devices_brand ON gp_devices (brand_id);

CREATE TABLE IF NOT EXISTS gp_rate_limit (
  id SERIAL PRIMARY KEY,
  bucket VARCHAR(80) NOT NULL UNIQUE,
  window_start INTEGER NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gp_binance_callback_nonces (
  id SERIAL PRIMARY KEY,
  nonce VARCHAR(64) NOT NULL UNIQUE,
  merchant_trade_no VARCHAR(64) NULL,
  brand_id VARCHAR(24) NULL,
  created_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_provider_orders (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  merchant_trade_no VARCHAR(64) NOT NULL,
  provider_order_id VARCHAR(80) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount DECIMAL(20,8) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  raw_json TEXT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL,
  CONSTRAINT uq_gp_provider_trade UNIQUE (brand_id, merchant_trade_no),
  CONSTRAINT uq_gp_provider_session UNIQUE (session_id, provider)
);

CREATE TABLE IF NOT EXISTS gp_audit_log (
  id SERIAL PRIMARY KEY,
  brand_id VARCHAR(24) NOT NULL,
  session_id VARCHAR(32) NULL,
  actor_id VARCHAR(32) NULL,
  action VARCHAR(64) NOT NULL,
  meta_json TEXT NULL,
  created_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_audit_brand ON gp_audit_log (brand_id);
CREATE INDEX IF NOT EXISTS idx_gp_audit_session ON gp_audit_log (session_id);

CREATE TABLE IF NOT EXISTS gp_oauth_states (
  id SERIAL PRIMARY KEY,
  state VARCHAR(64) NOT NULL UNIQUE,
  nonce VARCHAR(64) NOT NULL,
  code_verifier VARCHAR(128) NULL,
  redirect_uri TEXT NULL,
  expires_at INTEGER NOT NULL,
  created_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_oauth_state ON gp_oauth_states (state);
CREATE INDEX IF NOT EXISTS idx_gp_oauth_expires ON gp_oauth_states (expires_at);

CREATE TABLE IF NOT EXISTS gp_plans (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  description TEXT NULL,
  price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  credit_allowance INTEGER NOT NULL DEFAULT 100,
  device_limit INTEGER NOT NULL DEFAULT 1,
  method_limit INTEGER NOT NULL DEFAULT 2,
  features_json TEXT NULL,
  is_free INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_subscription_plans (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  description TEXT NULL,
  price_bdt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  credit_allowance INTEGER NOT NULL DEFAULT 100,
  device_limit INTEGER NOT NULL DEFAULT 1,
  method_limit INTEGER NOT NULL DEFAULT 2,
  features_json TEXT NULL,
  is_free INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS gp_subscriptions (
  id SERIAL PRIMARY KEY,
  subscription_id VARCHAR(32) NOT NULL UNIQUE,
  merchant_id VARCHAR(24) NOT NULL,
  plan_id VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  starts_at VARCHAR(32) NOT NULL,
  expires_at VARCHAR(32) NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_sub_merchant ON gp_subscriptions (merchant_id);

CREATE TABLE IF NOT EXISTS gp_credit_transactions (
  id SERIAL PRIMARY KEY,
  merchant_id VARCHAR(24) NOT NULL,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by VARCHAR(120) NOT NULL,
  created_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_credit_merchant ON gp_credit_transactions (merchant_id);

CREATE TABLE IF NOT EXISTS gp_admin_audit_logs (
  id SERIAL PRIMARY KEY,
  actor_email VARCHAR(120) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  details_json TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_admin_audit_actor ON gp_admin_audit_logs (actor_email);
CREATE INDEX IF NOT EXISTS idx_gp_admin_audit_target ON gp_admin_audit_logs (target_type, target_id);
