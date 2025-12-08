-- GeoJSON export function for map visualization
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_neighborhoods_geojson(p_timeframe TEXT DEFAULT 'month')
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'properties', jsonb_build_object(
          'id', n.id,
          'name', n.name,
          'borough', n.borough,
          'nta_code', n.nta_code,
          'total', COALESCE(s.total, 0),
          'rats', COALESCE(s.rats, 0),
          'noise', COALESCE(s.noise, 0),
          'parking', COALESCE(s.parking, 0),
          'trash', COALESCE(s.trash, 0),
          'heat_water', COALESCE(s.heat_water, 0),
          'other', COALESCE(s.other, 0),
          'chaos_score', COALESCE(s.chaos_score, 0)
        ),
        'geometry', ST_AsGeoJSON(n.polygon)::jsonb
      )
    )
    FROM neighborhoods n
    LEFT JOIN aggregates_summary s ON s.neighborhood_id = n.id AND s.timeframe = p_timeframe
    WHERE n.polygon IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

