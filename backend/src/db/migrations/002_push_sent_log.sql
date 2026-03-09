-- Persist daily push notification "already sent" state so serverless cron sends at most once per slot per day.
CREATE TABLE IF NOT EXISTS push_sent_log (
  id SERIAL PRIMARY KEY,
  slot TEXT NOT NULL CHECK (slot IN ('morning', 'noon', 'evening')),
  sent_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slot, sent_date)
);
CREATE INDEX IF NOT EXISTS idx_push_sent_log_slot_date ON push_sent_log(slot, sent_date);
