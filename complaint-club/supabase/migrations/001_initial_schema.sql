-- Complaint Club Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- NEIGHBORHOODS TABLE
-- Stores NYC neighborhood boundaries with PostGIS polygons
-- ============================================================
CREATE TABLE IF NOT EXISTS neighborhoods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  borough TEXT NOT NULL,
  nta_code TEXT UNIQUE, -- NYC Neighborhood Tabulation Area code
  polygon GEOMETRY(MULTIPOLYGON, 4326), -- PostGIS geometry in WGS84
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast geospatial lookups
CREATE INDEX IF NOT EXISTS idx_neighborhoods_polygon 
ON neighborhoods USING GIST (polygon);

-- Index for borough queries
CREATE INDEX IF NOT EXISTS idx_neighborhoods_borough 
ON neighborhoods (borough);

-- ============================================================
-- COMPLAINTS TABLE
-- Stores individual 311 complaints geocoded to neighborhoods
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY, -- unique_key from NYC 311
  neighborhood_id INT REFERENCES neighborhoods(id),
  category TEXT NOT NULL CHECK (category IN ('rats', 'noise', 'parking', 'trash', 'heat_water', 'other')),
  complaint_type TEXT, -- Original complaint type from 311
  descriptor TEXT, -- Additional descriptor
  created_at TIMESTAMPTZ NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  incident_zip TEXT,
  borough TEXT,
  raw JSONB, -- Store full original record
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_complaints_neighborhood_id 
ON complaints (neighborhood_id);

CREATE INDEX IF NOT EXISTS idx_complaints_category 
ON complaints (category);

CREATE INDEX IF NOT EXISTS idx_complaints_created_at 
ON complaints (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaints_neighborhood_created 
ON complaints (neighborhood_id, created_at DESC);

-- Spatial index for nearby queries
CREATE INDEX IF NOT EXISTS idx_complaints_location 
ON complaints USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- ============================================================
-- AGGREGATES_DAILY TABLE
-- Daily complaint counts per neighborhood and category
-- ============================================================
CREATE TABLE IF NOT EXISTS aggregates_daily (
  id SERIAL PRIMARY KEY,
  neighborhood_id INT NOT NULL REFERENCES neighborhoods(id),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('rats', 'noise', 'parking', 'trash', 'heat_water', 'other')),
  count INT DEFAULT 0,
  UNIQUE(neighborhood_id, date, category)
);

-- Index for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_aggregates_daily_lookup 
ON aggregates_daily (neighborhood_id, date);

-- ============================================================
-- AGGREGATES_SUMMARY TABLE
-- Precomputed summary stats for fast leaderboard queries
-- ============================================================
CREATE TABLE IF NOT EXISTS aggregates_summary (
  id SERIAL PRIMARY KEY,
  neighborhood_id INT NOT NULL REFERENCES neighborhoods(id),
  timeframe TEXT NOT NULL CHECK (timeframe IN ('today', 'week', 'month', 'all')),
  total INT DEFAULT 0,
  rats INT DEFAULT 0,
  noise INT DEFAULT 0,
  parking INT DEFAULT 0,
  trash INT DEFAULT 0,
  heat_water INT DEFAULT 0,
  other INT DEFAULT 0,
  chaos_score INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(neighborhood_id, timeframe)
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_aggregates_summary_leaderboard 
ON aggregates_summary (timeframe, total DESC);

CREATE INDEX IF NOT EXISTS idx_aggregates_summary_chaos 
ON aggregates_summary (timeframe, chaos_score DESC);

-- ============================================================
-- ETL TRACKING TABLE
-- Tracks ingestion progress and status
-- ============================================================
CREATE TABLE IF NOT EXISTS etl_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  records_fetched INT DEFAULT 0,
  records_inserted INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  error_message TEXT,
  last_complaint_date TIMESTAMPTZ
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get neighborhood ID from lat/lon
CREATE OR REPLACE FUNCTION get_neighborhood_id(lat FLOAT, lon FLOAT)
RETURNS INT AS $$
DECLARE
  nhood_id INT;
BEGIN
  SELECT id INTO nhood_id
  FROM neighborhoods
  WHERE ST_Within(
    ST_SetSRID(ST_MakePoint(lon, lat), 4326),
    polygon
  )
  LIMIT 1;
  
  RETURN nhood_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between two points (in meters)
CREATE OR REPLACE FUNCTION distance_meters(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT)
RETURNS FLOAT AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on tables (data is public read, restricted write)
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl_runs ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON neighborhoods FOR SELECT USING (true);
CREATE POLICY "Public read access" ON complaints FOR SELECT USING (true);
CREATE POLICY "Public read access" ON aggregates_daily FOR SELECT USING (true);
CREATE POLICY "Public read access" ON aggregates_summary FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access" ON neighborhoods FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON complaints FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON aggregates_daily FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON aggregates_summary FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON etl_runs FOR ALL USING (auth.role() = 'service_role');

