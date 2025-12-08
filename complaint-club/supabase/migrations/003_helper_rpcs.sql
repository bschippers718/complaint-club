-- Helper RPC functions for API access
-- These functions allow the API to perform operations that need PostGIS

-- ============================================================
-- INSERT NEIGHBORHOOD
-- Inserts a neighborhood with PostGIS geometry from GeoJSON
-- ============================================================
CREATE OR REPLACE FUNCTION insert_neighborhood(
  p_name TEXT,
  p_borough TEXT,
  p_nta_code TEXT,
  p_geojson TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO neighborhoods (name, borough, nta_code, polygon)
  VALUES (
    p_name, 
    p_borough, 
    p_nta_code, 
    ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
  )
  ON CONFLICT (nta_code) DO UPDATE SET
    name = EXCLUDED.name,
    borough = EXCLUDED.borough,
    polygon = EXCLUDED.polygon;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- INSERT COMPLAINT WITH GEOCODING
-- Inserts a complaint and automatically geocodes to neighborhood
-- ============================================================
CREATE OR REPLACE FUNCTION insert_complaint(
  p_id TEXT,
  p_category TEXT,
  p_complaint_type TEXT,
  p_descriptor TEXT,
  p_created_at TIMESTAMPTZ,
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_incident_zip TEXT,
  p_borough TEXT,
  p_raw JSONB
)
RETURNS INT AS $$
DECLARE
  v_neighborhood_id INT;
BEGIN
  -- Find neighborhood from lat/lon
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    SELECT id INTO v_neighborhood_id
    FROM neighborhoods
    WHERE ST_Within(
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
      polygon
    )
    LIMIT 1;
  END IF;

  -- Insert the complaint
  INSERT INTO complaints (
    id, neighborhood_id, category, complaint_type, descriptor,
    created_at, latitude, longitude, incident_zip, borough, raw
  )
  VALUES (
    p_id, v_neighborhood_id, p_category, p_complaint_type, p_descriptor,
    p_created_at, p_latitude, p_longitude, p_incident_zip, p_borough, p_raw
  )
  ON CONFLICT (id) DO UPDATE SET
    neighborhood_id = COALESCE(EXCLUDED.neighborhood_id, complaints.neighborhood_id),
    category = EXCLUDED.category,
    complaint_type = EXCLUDED.complaint_type,
    descriptor = EXCLUDED.descriptor;

  RETURN v_neighborhood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET NEARBY COMPLAINTS
-- Returns complaints within a radius of a point
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_complaints(
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_radius_meters FLOAT DEFAULT 500,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  category TEXT,
  complaint_type TEXT,
  descriptor TEXT,
  created_at TIMESTAMPTZ,
  latitude FLOAT,
  longitude FLOAT,
  distance_meters FLOAT,
  neighborhood_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.category,
    c.complaint_type,
    c.descriptor,
    c.created_at,
    c.latitude,
    c.longitude,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography
    ) as distance_meters,
    n.name as neighborhood_name
  FROM complaints c
  LEFT JOIN neighborhoods n ON n.id = c.neighborhood_id
  WHERE 
    c.latitude IS NOT NULL 
    AND c.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET LEADERBOARD
-- Returns ranked neighborhoods for a timeframe and optional category
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
        WHEN 'other' THEN s.other
        ELSE s.total
      END DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET NEIGHBORHOOD DETAIL
-- Returns detailed stats for a single neighborhood
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
-- GET NEIGHBORHOOD TRENDS
-- Returns daily complaint counts for the past N days
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
BEGIN
  RETURN QUERY
  SELECT 
    d.date,
    COALESCE(SUM(CASE WHEN a.category IS NOT NULL THEN a.count ELSE 0 END), 0)::BIGINT as total,
    COALESCE(SUM(CASE WHEN a.category = 'rats' THEN a.count ELSE 0 END), 0)::BIGINT as rats,
    COALESCE(SUM(CASE WHEN a.category = 'noise' THEN a.count ELSE 0 END), 0)::BIGINT as noise,
    COALESCE(SUM(CASE WHEN a.category = 'parking' THEN a.count ELSE 0 END), 0)::BIGINT as parking,
    COALESCE(SUM(CASE WHEN a.category = 'trash' THEN a.count ELSE 0 END), 0)::BIGINT as trash,
    COALESCE(SUM(CASE WHEN a.category = 'heat_water' THEN a.count ELSE 0 END), 0)::BIGINT as heat_water,
    COALESCE(SUM(CASE WHEN a.category = 'other' THEN a.count ELSE 0 END), 0)::BIGINT as other
  FROM generate_series(
    CURRENT_DATE - (p_days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(date)
  LEFT JOIN aggregates_daily a ON a.date = d.date::DATE AND a.neighborhood_id = p_neighborhood_id
  GROUP BY d.date
  ORDER BY d.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

