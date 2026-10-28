-- Per-IP enquiry API throttling. Store only a SHA-256 digest, not the raw client IP.
CREATE TABLE IF NOT EXISTS enquiry_rate_limits (
  ip_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (ip_hash, window_start)
);
CREATE INDEX IF NOT EXISTS idx_enquiry_rate_limits_window
  ON enquiry_rate_limits(window_start);
