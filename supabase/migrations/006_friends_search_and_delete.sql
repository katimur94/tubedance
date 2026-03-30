-- ── Fix: Missing DELETE policy on friendships ──
-- Without this, rejecting/removing friend requests fails due to RLS
CREATE POLICY "Freundschaft loeschen" ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ── Fix: Search profiles RPC ──
-- Bypasses restrictive RLS on profiles table so users can search for other players by username
CREATE OR REPLACE FUNCTION search_profiles(search_term TEXT, current_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INTEGER, role TEXT)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT p.id, p.username, p.level, COALESCE(p.role, 'user') AS role
  FROM profiles p
  WHERE p.username ILIKE '%' || search_term || '%'
    AND p.id != current_user_id
  LIMIT 10;
$$;

-- ── Fix: Ensure profiles are readable by authenticated users ──
-- This is needed so that friendship joins (profiles!friendships_friend_id_fkey) work
-- and so the direct query fallback in search also works.
-- Using DO block to avoid error if policy already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Profile fuer authentifizierte sichtbar'
  ) THEN
    EXECUTE 'CREATE POLICY "Profile fuer authentifizierte sichtbar" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL)';
  END IF;
END
$$;
