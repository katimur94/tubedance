-- ═══════════════════════════════════════════════════════
-- TubeDance → Audition: Economy, Social & Achievement Schema
-- ═══════════════════════════════════════════════════════

-- ── Coins auf profiles ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 500;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diamonds INTEGER DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 500;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owned_items TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS highest_combo INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily_login DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;

-- ── Shop Items Katalog ──
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hair','top','bottom','shoes','accessory','dance_move','effect')),
  price INTEGER NOT NULL DEFAULT 100,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  mesh_name TEXT,
  preview_url TEXT,
  required_level INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop items sichtbar für alle" ON shop_items FOR SELECT USING (true);

-- ── Transaktions-Log ──
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Transaktionen sehen" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Eigene Transaktionen erstellen" ON coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Freundesliste ──
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Freundschaften sehen" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Freundschaftsanfragen senden" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Freundschaft bearbeiten" ON friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ── Crews / Gilden ──
CREATE TABLE IF NOT EXISTS crews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  leader_id UUID REFERENCES profiles(id),
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Crews sichtbar für alle" ON crews FOR SELECT USING (true);
CREATE POLICY "Crew erstellen" ON crews FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Crew bearbeiten" ON crews FOR UPDATE USING (auth.uid() = leader_id);

CREATE TABLE IF NOT EXISTS crew_members (
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('leader','officer','member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Crew-Mitglieder sichtbar" ON crew_members FOR SELECT USING (true);
CREATE POLICY "Crew beitreten" ON crew_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Crew verlassen" ON crew_members FOR DELETE USING (auth.uid() = user_id);

-- ── Achievements ──
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  required_value INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID REFERENCES profiles(id),
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements sichtbar" ON achievements FOR SELECT USING (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Achievements sehen" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Achievement freischalten" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Leaderboard ──
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  total_score BIGINT DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  highest_combo INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboard sichtbar" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Eigenes Leaderboard updaten" ON leaderboard FOR ALL USING (auth.uid() = user_id);

-- ── Game Rooms erweitern ──
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'beat_up';
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 8;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- ── Seed-Achievements ──
INSERT INTO achievements (id, name, description, icon, required_value) VALUES
  ('first_dance', 'Erster Tanz', 'Erstes Spiel abgeschlossen', '💃', 1),
  ('combo_king', 'Combo-König', '50er Combo erreicht', '🔥', 50),
  ('perfectionist', 'Perfektionist', '10 Perfects hintereinander', '⭐', 10),
  ('fashionista', 'Fashionista', '20 Items gekauft', '👗', 20),
  ('social_butterfly', 'Social Butterfly', '10 Freunde hinzugefügt', '🦋', 10),
  ('beat_master', 'Beat Master', '1000 Perfects insgesamt', '🎵', 1000),
  ('millionaire', 'Millionär', '1.000.000 Beats verdient', '💰', 1000000),
  ('crew_leader', 'Crew Leader', 'Eine Crew gegründet', '👑', 1),
  ('marathon', 'Marathon-Tänzer', '100 Songs gespielt', '🏃', 100),
  ('night_owl', 'Nachteule', '7 Tage Login-Streak', '🦉', 7)
ON CONFLICT (id) DO NOTHING;
