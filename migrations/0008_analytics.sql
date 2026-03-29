-- Brands / networks
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO brands (name, slug) VALUES ('TOK BOR', 'tokbor');

-- Add brand_id to charging_stations
ALTER TABLE charging_stations ADD COLUMN brand_id INTEGER REFERENCES brands(id);
UPDATE charging_stations SET brand_id = 1;

-- Brand owners — links Telegram users to brands
CREATE TABLE IF NOT EXISTS brand_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id INTEGER NOT NULL REFERENCES brands(id),
  telegram_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_owners_telegram_id ON brand_owners(telegram_id);

-- Request logs — every user interaction
CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'other',
  user_lat REAL,
  user_lon REAL,
  nearest_station_id INTEGER REFERENCES charging_stations(id),
  distance_km REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_request_logs_telegram_id ON request_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_station_id ON request_logs(nearest_station_id);
