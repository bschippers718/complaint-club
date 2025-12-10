-- User Reports Table
-- Stores +1 reports from users for quick complaint reporting

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  neighborhood_id INTEGER REFERENCES neighborhoods(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT -- optional: prevent spam from same session
);

-- Index for querying by location
CREATE INDEX IF NOT EXISTS idx_user_reports_location 
ON user_reports (latitude, longitude);

-- Index for querying by neighborhood
CREATE INDEX IF NOT EXISTS idx_user_reports_neighborhood 
ON user_reports (neighborhood_id);

-- Index for querying by category and time
CREATE INDEX IF NOT EXISTS idx_user_reports_category_time 
ON user_reports (category, created_at DESC);

-- RPC to get nearby user reports count by category
CREATE OR REPLACE FUNCTION get_nearby_user_reports(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  category TEXT,
  report_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.category,
    COUNT(*)::BIGINT as report_count
  FROM user_reports ur
  WHERE 
    -- Simple distance calculation (approximate, good enough for small distances)
    (
      111320 * (ur.latitude - p_latitude) * (ur.latitude - p_latitude) +
      84850 * (ur.longitude - p_longitude) * (ur.longitude - p_longitude)
    ) < (p_radius_meters * p_radius_meters)
    -- Only count reports from last 30 days
    AND ur.created_at > NOW() - INTERVAL '30 days'
  GROUP BY ur.category;
END;
$$;

-- RPC to insert a user report
CREATE OR REPLACE FUNCTION insert_user_report(
  p_category TEXT,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_neighborhood_id INTEGER;
  v_report_id UUID;
BEGIN
  -- Find the neighborhood for this location (optional, may be null)
  SELECT id INTO v_neighborhood_id
  FROM neighborhoods
  WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  )
  LIMIT 1;
  
  -- Insert the report
  INSERT INTO user_reports (category, latitude, longitude, neighborhood_id, session_id)
  VALUES (p_category, p_latitude, p_longitude, v_neighborhood_id, p_session_id)
  RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$;
