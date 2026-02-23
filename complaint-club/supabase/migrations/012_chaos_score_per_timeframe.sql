-- Calculate chaos score per timeframe instead of copying from one source.
-- Makes week, month, and 90-day leaderboards show meaningfully different rankings.

CREATE OR REPLACE FUNCTION update_chaos_scores()
RETURNS void AS $$
DECLARE
  tf TEXT;
  max_total INT;
  max_noise INT;
  max_rats INT;
  max_parking INT;
  max_trash INT;
  max_construction INT;
BEGIN
  FOREACH tf IN ARRAY ARRAY['today', 'week', 'month', 'all'] LOOP
    SELECT 
      COALESCE(MAX(total), 1),
      COALESCE(MAX(noise), 1),
      COALESCE(MAX(rats), 1),
      COALESCE(MAX(parking), 1),
      COALESCE(MAX(trash), 1),
      COALESCE(MAX(construction), 1)
    INTO max_total, max_noise, max_rats, max_parking, max_trash, max_construction
    FROM aggregates_summary WHERE timeframe = tf AND total > 0;

    UPDATE aggregates_summary
    SET chaos_score = LEAST(100, GREATEST(0,
      ROUND(
        (LEAST(total::FLOAT / NULLIF(max_total, 0), 1) * 100 * 0.4) +
        (LEAST(noise::FLOAT / NULLIF(max_noise, 0), 1) * 100 * 0.15) +
        (LEAST(rats::FLOAT / NULLIF(max_rats, 0), 1) * 100 * 0.15) +
        (LEAST(parking::FLOAT / NULLIF(max_parking, 0), 1) * 100 * 0.1) +
        (LEAST(trash::FLOAT / NULLIF(max_trash, 0), 1) * 100 * 0.1) +
        (LEAST(construction::FLOAT / NULLIF(max_construction, 0), 1) * 100 * 0.1)
      )
    ))
    WHERE timeframe = tf;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT update_chaos_scores();
