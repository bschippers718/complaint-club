-- ============================================================
-- DATA INTEGRITY VERIFICATION QUERIES
-- Run these to check your data is consistent
-- ============================================================

-- 1. Check that category totals match the total column
SELECT 
    neighborhood_id,
    timeframe,
    total,
    (rats + noise + parking + trash + heat_water + other) as calculated_total,
    total - (rats + noise + parking + trash + heat_water + other) as difference
FROM aggregates_summary
WHERE total != (rats + noise + parking + trash + heat_water + other)
ORDER BY ABS(total - (rats + noise + parking + trash + heat_water + other)) DESC
LIMIT 20;
-- If this returns rows, there's a data inconsistency!

-- 2. Check for neighborhoods with chaos_score = 0 but have complaints
SELECT 
    n.name,
    s.timeframe,
    s.total,
    s.chaos_score
FROM aggregates_summary s
JOIN neighborhoods n ON n.id = s.neighborhood_id
WHERE s.total > 0 AND s.chaos_score = 0
ORDER BY s.total DESC
LIMIT 20;
-- These neighborhoods should have a chaos score > 0

-- 3. Check chaos scores are consistent across timeframes
SELECT 
    n.name,
    s1.chaos_score as today_chaos,
    s2.chaos_score as week_chaos,
    s3.chaos_score as month_chaos,
    s4.chaos_score as all_chaos
FROM neighborhoods n
JOIN aggregates_summary s1 ON s1.neighborhood_id = n.id AND s1.timeframe = 'today'
JOIN aggregates_summary s2 ON s2.neighborhood_id = n.id AND s2.timeframe = 'week'
JOIN aggregates_summary s3 ON s3.neighborhood_id = n.id AND s3.timeframe = 'month'
JOIN aggregates_summary s4 ON s4.neighborhood_id = n.id AND s4.timeframe = 'all'
WHERE s1.chaos_score != s3.chaos_score 
   OR s2.chaos_score != s3.chaos_score 
   OR s4.chaos_score != s3.chaos_score
LIMIT 20;
-- Chaos scores should be the same across all timeframes (based on month data)

-- 4. Check for missing daily aggregates (gaps in trend data)
SELECT 
    d.date,
    COUNT(DISTINCT a.neighborhood_id) as neighborhoods_with_data
FROM generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    INTERVAL '1 day'
) AS d(date)
LEFT JOIN aggregates_daily a ON a.date = d.date::DATE
GROUP BY d.date
ORDER BY d.date
LIMIT 31;
-- Each day should have data for multiple neighborhoods

-- 5. Top 10 neighborhoods by total complaints (month)
SELECT 
    n.name,
    n.borough,
    s.total,
    s.chaos_score,
    s.rats,
    s.noise,
    s.parking,
    s.trash,
    s.heat_water,
    s.other
FROM aggregates_summary s
JOIN neighborhoods n ON n.id = s.neighborhood_id
WHERE s.timeframe = 'month' AND s.total > 0
ORDER BY s.total DESC
LIMIT 10;

-- 6. Verify 'all' timeframe is 90 days (not all-time)
SELECT 
    'Today' as timeframe,
    MIN(c.created_at) as earliest_complaint,
    MAX(c.created_at) as latest_complaint,
    COUNT(*) as complaint_count
FROM complaints c
WHERE c.created_at >= DATE_TRUNC('day', NOW())
UNION ALL
SELECT 
    'Week' as timeframe,
    MIN(c.created_at) as earliest_complaint,
    MAX(c.created_at) as latest_complaint,
    COUNT(*) as complaint_count
FROM complaints c
WHERE c.created_at >= DATE_TRUNC('day', NOW() - INTERVAL '7 days')
UNION ALL
SELECT 
    'Month' as timeframe,
    MIN(c.created_at) as earliest_complaint,
    MAX(c.created_at) as latest_complaint,
    COUNT(*) as complaint_count
FROM complaints c
WHERE c.created_at >= DATE_TRUNC('day', NOW() - INTERVAL '30 days')
UNION ALL
SELECT 
    'All (90 days)' as timeframe,
    MIN(c.created_at) as earliest_complaint,
    MAX(c.created_at) as latest_complaint,
    COUNT(*) as complaint_count
FROM complaints c
WHERE c.created_at >= DATE_TRUNC('day', NOW() - INTERVAL '90 days');

-- ============================================================
-- If all queries return expected results, your data is consistent!
-- ============================================================


