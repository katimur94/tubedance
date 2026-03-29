-- ═══════════════════════════════════════════════════════
-- Add columns for full client-state sync (transactions, daily rewards)
-- ═══════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transactions_json TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_login_json TEXT;
