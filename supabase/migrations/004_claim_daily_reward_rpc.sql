-- Server-side daily reward claim to prevent localStorage exploit
CREATE OR REPLACE FUNCTION claim_daily_reward()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_claim date;
  v_streak int;
  v_reward int;
  v_today date := current_date;
BEGIN
  -- Get current state
  SELECT (daily_login_json->>'lastClaim')::date, COALESCE((daily_login_json->>'streak')::int, 0)
  INTO v_last_claim, v_streak
  FROM profiles WHERE id = auth.uid();

  -- Already claimed today
  IF v_last_claim = v_today THEN
    RAISE EXCEPTION 'Bereits geclaimed';
  END IF;

  -- Calculate streak
  IF v_last_claim = v_today - interval '1 day' THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  -- Calculate reward based on 7-day cycle
  CASE (v_streak - 1) % 7
    WHEN 0 THEN v_reward := 100;
    WHEN 1 THEN v_reward := 150;
    WHEN 2 THEN v_reward := 200;
    WHEN 3 THEN v_reward := 250;
    WHEN 4 THEN v_reward := 300;
    WHEN 5 THEN v_reward := 400;
    WHEN 6 THEN v_reward := 500;
  END CASE;

  -- Update profile
  UPDATE profiles
  SET
    coins = coins + v_reward,
    total_earned = total_earned + v_reward,
    daily_streak = v_streak,
    daily_login_json = jsonb_build_object('lastClaim', v_today, 'streak', v_streak)
  WHERE id = auth.uid();

  RETURN v_reward;
END;
$$;
