-- ═══════════════════════════════════════════════════════
-- User Roles: Admin, Gamemaster, Moderator, Supporter
-- ═══════════════════════════════════════════════════════

-- Role column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'supporter', 'moderator', 'gamemaster', 'admin'));

-- ── Admin RPC: Set user role (only admin/gamemaster can call) ──
CREATE OR REPLACE FUNCTION admin_set_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'gamemaster') THEN
    RAISE EXCEPTION 'Unauthorized: Nur Admins können Rollen ändern.';
  END IF;
  IF new_role NOT IN ('user', 'supporter', 'moderator', 'gamemaster', 'admin') THEN
    RAISE EXCEPTION 'Ungültige Rolle: %', new_role;
  END IF;
  UPDATE profiles SET role = new_role WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Admin RPC: Gift beats to a user ──
CREATE OR REPLACE FUNCTION admin_gift_beats(target_user_id UUID, amount INTEGER, reason TEXT)
RETURNS VOID AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'gamemaster') THEN
    RAISE EXCEPTION 'Unauthorized: Nur Admins können Beats verschenken.';
  END IF;
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Betrag muss positiv sein.';
  END IF;
  UPDATE profiles SET coins = COALESCE(coins, 0) + amount, total_earned = COALESCE(total_earned, 0) + amount WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Admin RPC: Gift item to a user ──
CREATE OR REPLACE FUNCTION admin_gift_item(target_user_id UUID, item_id TEXT)
RETURNS VOID AS $$
DECLARE
  current_items JSONB;
  item_exists BOOLEAN;
BEGIN
  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'gamemaster') THEN
    RAISE EXCEPTION 'Unauthorized: Nur Admins können Items verschenken.';
  END IF;

  -- Parse current owned_items (stored as JSON text)
  SELECT COALESCE(owned_items, '[]')::JSONB INTO current_items FROM profiles WHERE id = target_user_id;

  -- Check if user already owns the item
  SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(current_items) elem WHERE elem->>'itemId' = item_id) INTO item_exists;
  IF item_exists THEN
    RAISE EXCEPTION 'Spieler besitzt dieses Item bereits.';
  END IF;

  -- Append new item
  current_items := current_items || jsonb_build_array(jsonb_build_object('itemId', item_id, 'purchasedAt', extract(epoch from now()) * 1000));
  UPDATE profiles SET owned_items = current_items::TEXT WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
