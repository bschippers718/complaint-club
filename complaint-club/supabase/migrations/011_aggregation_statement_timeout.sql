-- Give aggregation functions more time (Supabase default is 8s for service_role)
-- Run 008_add_new_categories first. This adds statement_timeout so cron doesn't timeout.

ALTER FUNCTION refresh_summary_aggregates() SET statement_timeout = '120s';
