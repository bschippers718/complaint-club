-- Migration: Add new categories (construction, building, bikes)
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 0. DROP EXISTING FUNCTIONS (required for signature changes)
-- ============================================================
DROP FUNCTION IF EXISTS get_neighborhood_trends(integer, integer);
DROP FUNCTION IF EXISTS get_leaderboard(text, text, integer);
DROP FUNCTION IF EXISTS get_neighborhood_detail(integer);

-- ============================================================
-- 1. UPDATE CHECK CONSTRAINTS TO ALLOW NEW CATEGORIES
-- ============================================================

-- Drop existing constraints
ALTER TABLE complaints 
DROP CONSTRAINT IF EXISTS complaints_category_check;

ALTER TABLE aggregates_daily 
DROP CONSTRAINT IF EXISTS aggregates_daily_category_check;

-- Add new constraints with expanded category list
ALTER TABLE complaints 
ADD CONSTRAINT complaints_category_check 
CHECK (category IN ('rats', 'noise', 'parking', 'trash', 'heat_water', 'construction', 'building', 'bikes', 'other'));

ALTER TABLE aggregates_daily 
ADD CONSTRAINT aggregates_daily_category_check 
CHECK (category IN ('rats', 'noise', 'parking', 'trash', 'heat_water', 'construction', 'building', 'bikes', 'other'));

-- ============================================================
-- 2. ADD NEW COLUMNS TO AGGREGATES_SUMMARY
-- ============================================================

ALTER TABLE aggregates_summary 
ADD COLUMN IF NOT EXISTS construction INT DEFAULT 0;

ALTER TABLE aggregates_summary 
ADD COLUMN IF NOT EXISTS building INT DEFAULT 0;

ALTER TABLE aggregates_summary 
ADD COLUMN IF NOT EXISTS bikes INT DEFAULT 0;

-- ============================================================
-- 3. UPDATE AGGREGATION FUNCTIONS
-- ============================================================

-- Update daily aggregates refresh function
CREATE OR REPLACE FUNCTION refresh_daily_aggregates(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  -- Delete existing aggregates for this date
  DELETE FROM aggregates_daily WHERE date = target_date;
  
  -- Insert fresh aggregates
  INSERT INTO aggregates_daily (neighborhood_id, date, category, count)
  SELECT 
    neighborhood_id,
    target_date,
    category,
    COUNT(*)::INT
  FROM complaints
  WHERE DATE(created_at) = target_date
    AND neighborhood_id IS NOT NULL
  GROUP BY neighborhood_id, category;
END;
$$ LANGUAGE plpgsql;

-- Update summary aggregates refresh function
CREATE OR REPLACE FUNCTION refresh_summary_aggregates()
RETURNS void AS $$
BEGIN
  -- Refresh 'today' aggregates
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, construction, building, bikes, other, updated_at)
  SELECT 
    n.id,
    'today',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'construction' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'building' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'bikes' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND DATE(c.created_at) = CURRENT_DATE
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe)
  DO UPDATE SET
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    construction = EXCLUDED.construction,
    building = EXCLUDED.building,
    bikes = EXCLUDED.bikes,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;

  -- Refresh 'week' aggregates (last 7 days)
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, construction, building, bikes, other, updated_at)
  SELECT 
    n.id,
    'week',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'construction' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'building' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'bikes' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= (NOW() - INTERVAL '7 days')
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe)
  DO UPDATE SET
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    construction = EXCLUDED.construction,
    building = EXCLUDED.building,
    bikes = EXCLUDED.bikes,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;

  -- Refresh 'month' aggregates (last 30 days)
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, construction, building, bikes, other, updated_at)
  SELECT 
    n.id,
    'month',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'construction' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'building' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'bikes' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= (NOW() - INTERVAL '30 days')
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe)
  DO UPDATE SET
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    construction = EXCLUDED.construction,
    building = EXCLUDED.building,
    bikes = EXCLUDED.bikes,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;

  -- Refresh 'all' aggregates (90 days)
  INSERT INTO aggregates_summary (neighborhood_id, timeframe, total, rats, noise, parking, trash, heat_water, construction, building, bikes, other, updated_at)
  SELECT 
    n.id,
    'all',
    COALESCE(SUM(CASE WHEN c.category IS NOT NULL THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'rats' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'noise' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'parking' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'trash' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'heat_water' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'construction' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'building' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'bikes' THEN 1 ELSE 0 END), 0)::INT,
    COALESCE(SUM(CASE WHEN c.category = 'other' THEN 1 ELSE 0 END), 0)::INT,
    NOW()
  FROM neighborhoods n
  LEFT JOIN complaints c ON c.neighborhood_id = n.id AND c.created_at >= (NOW() - INTERVAL '90 days')
  GROUP BY n.id
  ON CONFLICT (neighborhood_id, timeframe)
  DO UPDATE SET
    total = EXCLUDED.total,
    rats = EXCLUDED.rats,
    noise = EXCLUDED.noise,
    parking = EXCLUDED.parking,
    trash = EXCLUDED.trash,
    heat_water = EXCLUDED.heat_water,
    construction = EXCLUDED.construction,
    building = EXCLUDED.building,
    bikes = EXCLUDED.bikes,
    other = EXCLUDED.other,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Update chaos scores function
CREATE OR REPLACE FUNCTION update_chaos_scores()
RETURNS void AS $$
DECLARE
  max_total INT;
  max_noise INT;
  max_rats INT;
  max_parking INT;
  max_trash INT;
  max_construction INT;
BEGIN
  -- Get actual max values from month timeframe data
  SELECT 
    COALESCE(MAX(total), 1),
    COALESCE(MAX(noise), 1),
    COALESCE(MAX(rats), 1),
    COALESCE(MAX(parking), 1),
    COALESCE(MAX(trash), 1),
    COALESCE(MAX(construction), 1)
  INTO max_total, max_noise, max_rats, max_parking, max_trash, max_construction
  FROM aggregates_summary 
  WHERE timeframe = 'month' AND total > 0;

  -- Calculate chaos scores for month timeframe using dynamic max values
  UPDATE aggregates_summary
  SET chaos_score = LEAST(100, GREATEST(0,
    ROUND(
      -- Normalized total (0.4 weight)
      (LEAST(total::FLOAT / NULLIF(max_total, 0), 1) * 100 * 0.4) +
      -- Normalized noise (0.15 weight)
      (LEAST(noise::FLOAT / NULLIF(max_noise, 0), 1) * 100 * 0.15) +
      -- Normalized rats (0.15 weight)
      (LEAST(rats::FLOAT / NULLIF(max_rats, 0), 1) * 100 * 0.15) +
      -- Normalized parking (0.1 weight)
      (LEAST(parking::FLOAT / NULLIF(max_parking, 0), 1) * 100 * 0.1) +
      -- Normalized trash (0.1 weight)
      (LEAST(trash::FLOAT / NULLIF(max_trash, 0), 1) * 100 * 0.1) +
      -- Normalized construction (0.1 weight)
      (LEAST(construction::FLOAT / NULLIF(max_construction, 0), 1) * 100 * 0.1)
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

-- Update get_neighborhood_trends function
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
  construction BIGINT,
  building BIGINT,
  bikes BIGINT,
  other BIGINT
) AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
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
    COALESCE(SUM(CASE WHEN a.category = 'construction' THEN a.count ELSE 0 END), 0)::BIGINT as construction,
    COALESCE(SUM(CASE WHEN a.category = 'building' THEN a.count ELSE 0 END), 0)::BIGINT as building,
    COALESCE(SUM(CASE WHEN a.category = 'bikes' THEN a.count ELSE 0 END), 0)::BIGINT as bikes,
    COALESCE(SUM(CASE WHEN a.category = 'other' THEN a.count ELSE 0 END), 0)::BIGINT as other
  FROM generate_series(start_date, end_date, INTERVAL '1 day') AS d(date)
  LEFT JOIN aggregates_daily a ON a.date = d.date::DATE AND a.neighborhood_id = p_neighborhood_id
  GROUP BY d.date
  ORDER BY d.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. UPDATE GET_LEADERBOARD RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_timeframe TEXT DEFAULT 'month',
  p_category TEXT DEFAULT 'all',
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  neighborhood_id INT,
  neighborhood_name TEXT,
  borough TEXT,
  total INT,
  rats INT,
  noise INT,
  parking INT,
  trash INT,
  heat_water INT,
  construction INT,
  building INT,
  bikes INT,
  other INT,
  chaos_score INT
) AS $$
BEGIN
  IF p_category = 'all' THEN
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY s.total DESC)::BIGINT as rank,
      n.id as neighborhood_id,
      n.name as neighborhood_name,
      n.borough,
      s.total,
      s.rats,
      s.noise,
      s.parking,
      s.trash,
      s.heat_water,
      s.construction,
      s.building,
      s.bikes,
      s.other,
      s.chaos_score
    FROM aggregates_summary s
    JOIN neighborhoods n ON n.id = s.neighborhood_id
    WHERE s.timeframe = p_timeframe AND s.total > 0
    ORDER BY s.total DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY 
        CASE p_category
          WHEN 'rats' THEN s.rats
          WHEN 'noise' THEN s.noise
          WHEN 'parking' THEN s.parking
          WHEN 'trash' THEN s.trash
          WHEN 'heat_water' THEN s.heat_water
          WHEN 'construction' THEN s.construction
          WHEN 'building' THEN s.building
          WHEN 'bikes' THEN s.bikes
          WHEN 'other' THEN s.other
          ELSE s.total
        END DESC
      )::BIGINT as rank,
      n.id as neighborhood_id,
      n.name as neighborhood_name,
      n.borough,
      s.total,
      s.rats,
      s.noise,
      s.parking,
      s.trash,
      s.heat_water,
      s.construction,
      s.building,
      s.bikes,
      s.other,
      s.chaos_score
    FROM aggregates_summary s
    JOIN neighborhoods n ON n.id = s.neighborhood_id
    WHERE s.timeframe = p_timeframe AND s.total > 0
    ORDER BY 
      CASE p_category
        WHEN 'rats' THEN s.rats
        WHEN 'noise' THEN s.noise
        WHEN 'parking' THEN s.parking
        WHEN 'trash' THEN s.trash
        WHEN 'heat_water' THEN s.heat_water
        WHEN 'construction' THEN s.construction
        WHEN 'building' THEN s.building
        WHEN 'bikes' THEN s.bikes
        WHEN 'other' THEN s.other
        ELSE s.total
      END DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. UPDATE GET_NEIGHBORHOOD_DETAIL RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_neighborhood_detail(p_neighborhood_id INT)
RETURNS TABLE (
  id INT,
  name TEXT,
  borough TEXT,
  timeframe TEXT,
  total INT,
  rats INT,
  noise INT,
  parking INT,
  trash INT,
  heat_water INT,
  construction INT,
  building INT,
  bikes INT,
  other INT,
  chaos_score INT,
  rank_in_city BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT 
      s.neighborhood_id,
      s.timeframe as tf,
      ROW_NUMBER() OVER (PARTITION BY s.timeframe ORDER BY s.total DESC) as rn
    FROM aggregates_summary s
    WHERE s.total > 0
  )
  SELECT 
    n.id,
    n.name,
    n.borough,
    s.timeframe,
    s.total,
    s.rats,
    s.noise,
    s.parking,
    s.trash,
    s.heat_water,
    s.construction,
    s.building,
    s.bikes,
    s.other,
    s.chaos_score,
    r.rn as rank_in_city
  FROM neighborhoods n
  JOIN aggregates_summary s ON s.neighborhood_id = n.id
  LEFT JOIN ranked r ON r.neighborhood_id = n.id AND r.tf = s.timeframe
  WHERE n.id = p_neighborhood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. REFRESH ALL DATA
-- ============================================================

-- Run a full refresh of aggregates
SELECT refresh_summary_aggregates();
SELECT update_chaos_scores();

