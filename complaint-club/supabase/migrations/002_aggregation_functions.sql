-- Aggregation Functions for Complaint Club
-- These functions compute daily and summary aggregates

-- ============================================================
-- REFRESH DAILY AGGREGATES
-- Updates aggregates_daily for a specific date
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_daily_aggregates(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  -- Insert or update daily aggregates
  INSERT INTO aggregates_daily (neighborhood_id, date, category, count)
  SELECT 
    neighborhood_id,
    target_date,
    category,
    COUNT(*)::INT
  FROM complaints
  WHERE 
    neighborhood_id IS NOT NULL
    AND DATE(created_at) = target_date
  GROUP BY neighborhood_id, category
  ON CONFLICT (neighborhood_id, date, category) 
  DO UPDATE SET count = EXCLUDED.count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REFRESH SUMMARY AGGREGATES
-- Updates aggregates_summary for all timeframes
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_summary_aggregates()
RETURNS void AS $$
DECLARE
  today_start TIMESTAMPTZ;
  week_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
BEGIN
  -- Calculate time boundaries
  today_start := DATE_TRUNC('day', NOW());
  week_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
  month_start := DATE_TRUNC('day', NOW() - INTERVAL '30 days');

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

  -- Refresh 'all' aggregates
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
  LEFT JOIN complaints c ON c.neighborhood_id = n.id
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
-- UPDATE CHAOS SCORES
-- Recalculates chaos scores for all summary records
-- ============================================================
CREATE OR REPLACE FUNCTION update_chaos_scores()
RETURNS void AS $$
BEGIN
  UPDATE aggregates_summary
  SET chaos_score = LEAST(100, GREATEST(0, 
    ROUND(
      -- Normalized total (0.5 weight) - max ~5000 for month
      (LEAST(total::FLOAT / 5000, 1) * 100 * 0.5) +
      -- Normalized noise (0.2 weight) - max ~1500
      (LEAST(noise::FLOAT / 1500, 1) * 100 * 0.2) +
      -- Normalized rats (0.15 weight) - max ~800
      (LEAST(rats::FLOAT / 800, 1) * 100 * 0.15) +
      -- Normalized parking (0.1 weight) - max ~1000
      (LEAST(parking::FLOAT / 1000, 1) * 100 * 0.1) +
      -- Normalized trash (0.05 weight) - max ~500
      (LEAST(trash::FLOAT / 500, 1) * 100 * 0.05)
    )
  ))
  WHERE timeframe = 'month'; -- Chaos score is based on monthly data
  
  -- Copy month chaos score to other timeframes for consistency
  UPDATE aggregates_summary s
  SET chaos_score = m.chaos_score
  FROM (SELECT neighborhood_id, chaos_score FROM aggregates_summary WHERE timeframe = 'month') m
  WHERE s.neighborhood_id = m.neighborhood_id AND s.timeframe != 'month';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FULL AGGREGATION REFRESH
-- Convenience function to run all aggregation steps
-- ============================================================
CREATE OR REPLACE FUNCTION full_aggregation_refresh()
RETURNS void AS $$
BEGIN
  -- Refresh daily aggregates for recent days
  PERFORM refresh_daily_aggregates(CURRENT_DATE);
  PERFORM refresh_daily_aggregates(CURRENT_DATE - 1);
  
  -- Refresh summary aggregates
  PERFORM refresh_summary_aggregates();
  
  -- Update chaos scores
  PERFORM update_chaos_scores();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- LEADERBOARD VIEW
-- Convenient view for leaderboard queries
-- ============================================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  ROW_NUMBER() OVER (PARTITION BY s.timeframe ORDER BY s.total DESC) as rank,
  n.id as neighborhood_id,
  n.name as neighborhood_name,
  n.borough,
  s.timeframe,
  s.total,
  s.rats,
  s.noise,
  s.parking,
  s.trash,
  s.heat_water,
  s.other,
  s.chaos_score,
  s.updated_at
FROM aggregates_summary s
JOIN neighborhoods n ON n.id = s.neighborhood_id
WHERE s.total > 0;

