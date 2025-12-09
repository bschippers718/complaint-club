-- ============================================================
-- APPLY ALL FIXES - Run this in Supabase SQL Editor
-- ============================================================
-- This script fixes multiple data integrity issues:
-- 1. Chaos score calculation (dynamic max values)
-- 2. Trend data function (correct date range)
-- 3. 'all' timeframe (90 days, not all-time)
-- 4. full_aggregation_refresh (refresh more days)
-- 5. Add daily aggregates range refresh function
-- ============================================================

-- ============================================================
-- 1. FIX CHAOS SCORES - Use dynamic max values
-- ============================================================
CREATE OR REPLACE FUNCTION update_chaos_scores()
RETURNS void AS $$
DECLARE
  max_total INT;
  max_noise INT;
  max_rats INT;
  max_parking INT;
  max_trash INT;
BEGIN
  -- Get actual max values from month timeframe data
  SELECT 
    COALESCE(MAX(total), 1),
    COALESCE(MAX(noise), 1),
    COALESCE(MAX(rats), 1),
    COALESCE(MAX(parking), 1),
    COALESCE(MAX(trash), 1)
  INTO max_total, max_noise, max_rats, max_parking, max_trash
  FROM aggregates_summary
  WHERE timeframe = 'month' AND total > 0;

  -- Calculate chaos scores for month timeframe using dynamic max values
  UPDATE aggregates_summary
  SET chaos_score = LEAST(100, GREATEST(0, 
    ROUND(
      -- Normalized total (0.5 weight)
      (LEAST(total::FLOAT / NULLIF(max_total, 0), 1) * 100 * 0.5) +
      -- Normalized noise (0.2 weight)
      (LEAST(noise::FLOAT / NULLIF(max_noise, 0), 1) * 100 * 0.2) +
      -- Normalized rats (0.15 weight)
      (LEAST(rats::FLOAT / NULLIF(max_rats, 0), 1) * 100 * 0.15) +
      -- Normalized parking (0.1 weight)
      (LEAST(parking::FLOAT / NULLIF(max_parking, 0), 1) * 100 * 0.1) +
      -- Normalized trash (0.05 weight)
      (LEAST(trash::FLOAT / NULLIF(max_trash, 0), 1) * 100 * 0.05)
    )
  ))
  WHERE timeframe = 'month';
  
  -- Copy month chaos score to other timeframes for consistency
  UPDATE aggregates_summary s
  SET chaos_score = m.chaos_score
  FROM (SELECT neighborhood_id, chaos_score FROM aggregates_summary WHERE timeframe = 'month') m
  WHERE s.neighborhood_id = m.neighborhood_id AND s.timeframe != 'month';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. FIX TREND DATA FUNCTION - Correct date range (exactly p_days)
-- ============================================================
CREATE OR REPLACE FUNCTION get_neighborhood_trends(
  p_neighborhood_id INT,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  rats BIGINT,
  noise BIGINT,
  parking BIGINT,
  trash BIGINT,
  heat_water BIGINT,
  other BIGINT
) AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  -- Calculate date range: exactly p_days including today
  -- From: CURRENT_DATE - (p_days - 1) to CURRENT_DATE
  start_date := CURRENT_DATE - (p_days - 1);
  end_date := CURRENT_DATE;
  
  RETURN QUERY
  SELECT 
    d.date::DATE,
    COALESCE(SUM(CASE WHEN a.category IS NOT NULL THEN a.count ELSE 0 END), 0)::BIGINT as total,
    COALESCE(SUM(CASE WHEN a.category = 'rats' THEN a.count ELSE 0 END), 0)::BIGINT as rats,
    COALESCE(SUM(CASE WHEN a.category = 'noise' THEN a.count ELSE 0 END), 0)::BIGINT as noise,
    COALESCE(SUM(CASE WHEN a.category = 'parking' THEN a.count ELSE 0 END), 0)::BIGINT as parking,
    COALESCE(SUM(CASE WHEN a.category = 'trash' THEN a.count ELSE 0 END), 0)::BIGINT as trash,
    COALESCE(SUM(CASE WHEN a.category = 'heat_water' THEN a.count ELSE 0 END), 0)::BIGINT as heat_water,
    COALESCE(SUM(CASE WHEN a.category = 'other' THEN a.count ELSE 0 END), 0)::BIGINT as other
  FROM generate_series(start_date, end_date, INTERVAL '1 day') AS d(date)
  LEFT JOIN aggregates_daily a ON a.date = d.date::DATE AND a.neighborhood_id = p_neighborhood_id
  GROUP BY d.date
  ORDER BY d.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FIX SUMMARY AGGREGATES - 'all' timeframe should be 90 days
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_summary_aggregates()
RETURNS void AS $$
DECLARE
  today_start TIMESTAMPTZ;
  week_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
  all_start TIMESTAMPTZ;
BEGIN
  -- Calculate time boundaries
  today_start := DATE_TRUNC('day', NOW());
  week_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
  month_start := DATE_TRUNC('day', NOW() - INTERVAL '30 days');
  all_start := DATE_TRUNC('day', NOW() - INTERVAL '90 days');  -- FIX: 90 days, not all-time

  -- Refresh 'today' aggregates
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, other, updated_at)
  SELECT 
    n.id,
    'today',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= today_start
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe) 
  DO UPDATE SET 
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;

  -- Refresh 'week' aggregates
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, other, updated_at)
  SELECT 
    n.id,
    'week',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= week_start
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe) 
  DO UPDATE SET 
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;

  -- Refresh 'month' aggregates
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, other, updated_at)
  SELECT 
    n.id,
    'month',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= month_start
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe) 
  DO UPDATE SET 
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;

  -- Refresh 'all' aggregates (90 days, not all-time!)
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, other, updated_at)
  SELECT 
    n.id,
    'all',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= all_start  -- FIX: Use 90-day boundary
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe) 
  DO UPDATE SET 
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. FIX FULL AGGREGATION REFRESH - Refresh more days for trend data
-- ============================================================
CREATE OR REPLACE FUNCTION full_aggregation_refresh()
RETURNS void AS $$
DECLARE
  i INT;
BEGIN
  -- Refresh daily aggregates for the last 7 days (for trend data accuracy)
  FOR i IN 0..6 LOOP
    PERFORM refresh_daily_aggregates(CURRENT_DATE - i);
  END LOOP;
  
  -- Refresh summary aggregates
  PERFORM refresh_summary_aggregates();
  
  -- Update chaos scores
  PERFORM update_chaos_scores();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. ADD DAILY AGGREGATES RANGE REFRESH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_daily_aggregates_range(
  start_date DATE,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  current_d DATE;
BEGIN
  current_d := start_date;
  
  WHILE current_d <= end_date LOOP
    PERFORM refresh_daily_aggregates(current_d);
    current_d := current_d + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. RECALCULATE EVERYTHING WITH FIXED FUNCTIONS
-- ============================================================
-- Refresh summary aggregates (now with 90-day 'all' timeframe)
SELECT refresh_summary_aggregates();

-- Update chaos scores with dynamic calculation
SELECT update_chaos_scores();

-- ============================================================
-- DONE! All data integrity issues have been fixed:
-- ============================================================
-- 1. ✅ Chaos scores now use dynamic max values from actual data
-- 2. ✅ Trend data now returns exactly 30 days (not 31)
-- 3. ✅ 'all' timeframe now uses 90 days (not all-time)
-- 4. ✅ full_aggregation_refresh now refreshes 7 days of daily data
-- 5. ✅ Added range refresh function for backfilling
-- ============================================================
