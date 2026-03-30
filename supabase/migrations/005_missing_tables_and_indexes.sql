-- Migration 005: Fix schema mismatches and add missing columns/indexes
-- Safe to re-run: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS

-- ============================================================================
-- 1. leaderboard: add missing username column
-- ============================================================================
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS username TEXT;

-- ============================================================================
-- 2. profiles: change daily_login_json from TEXT to JSONB
--    (needed for claim_daily_reward RPC which uses ->> operator)
-- ============================================================================
ALTER TABLE profiles
  ALTER COLUMN daily_login_json TYPE JSONB USING daily_login_json::jsonb;

-- ============================================================================
-- 3. playlists: add created_at if missing
-- ============================================================================
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================================================
-- 4. playlist_songs: add created_at if missing
-- ============================================================================
ALTER TABLE playlist_songs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================================================
-- 5. RLS policies for playlists (if missing)
-- ============================================================================
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlists' AND policyname = 'Playlists sichtbar') THEN
    CREATE POLICY "Playlists sichtbar" ON playlists FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlists' AND policyname = 'Eigene Playlists verwalten') THEN
    CREATE POLICY "Eigene Playlists verwalten" ON playlists FOR ALL USING (auth.uid() = created_by);
  END IF;
END $$;

-- ============================================================================
-- 6. RLS policies for playlist_songs (if missing)
-- ============================================================================
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_songs' AND policyname = 'Playlist Songs sichtbar') THEN
    CREATE POLICY "Playlist Songs sichtbar" ON playlist_songs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'playlist_songs' AND policyname = 'Eigene Playlist Songs verwalten') THEN
    CREATE POLICY "Eigene Playlist Songs verwalten" ON playlist_songs FOR ALL USING (
      auth.uid() = (SELECT created_by FROM playlists WHERE id = playlist_id)
    );
  END IF;
END $$;

-- ============================================================================
-- 7. RLS policies for items (if missing)
-- ============================================================================
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'items' AND policyname = 'Items sichtbar') THEN
    CREATE POLICY "Items sichtbar" ON items FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================================
-- 8. RLS policies for user_inventory (if missing)
-- ============================================================================
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_inventory' AND policyname = 'Eigenes Inventar sehen') THEN
    CREATE POLICY "Eigenes Inventar sehen" ON user_inventory FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_inventory' AND policyname = 'Eigenes Inventar verwalten') THEN
    CREATE POLICY "Eigenes Inventar verwalten" ON user_inventory FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- 9. Performance indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score ON leaderboard(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_is_playing ON game_rooms(is_playing);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
