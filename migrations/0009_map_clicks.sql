CREATE TABLE IF NOT EXISTS map_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_log_id INTEGER NOT NULL REFERENCES request_logs(id),
  telegram_id INTEGER NOT NULL,
  map_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_map_clicks_request_log_id ON map_clicks(request_log_id);
CREATE INDEX IF NOT EXISTS idx_map_clicks_created_at ON map_clicks(created_at);
