-- Per-app rate limit configuration.
-- NULL means use the server default (1000 events/min).
-- Self-hosters can tune the default in rate-limiter.ts.
ALTER TABLE apps ADD COLUMN rate_limit_per_minute INTEGER;
