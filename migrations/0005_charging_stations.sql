-- Charging stations table
CREATE TABLE IF NOT EXISTS charging_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed data
INSERT INTO charging_stations (name, latitude, longitude) VALUES
  ('TOK BOR BeFit PRO 160+160kW', 41.304887, 69.252557),
  ('TOK BOR Ekobazar Chimgan 60+100kW', 41.354576, 69.354892),
  ('TOK BOR Anhor Lokomotiv 60+100kW+120kW', 41.328349, 69.265062),
  ('TOK BOR FeedUp Sputnik', 41.200831, 69.211253),
  ('TOK BOR Neus 80kW + CCS1', 41.275703, 69.223793),
  ('TOK BOR Kuka Home 80+60kW', 41.254788, 69.196906),
  ('TOK BOR Uzbekistan Hotel 80+200kW', 41.310888, 69.282733),
  ('TOK BOR Coworking Uchtepa 80kW', 41.297665, 69.175274),
  ('TOK BOR Food City Tashkent 120kW', 41.204915, 69.323473),
  ('TOK BOR Yangi O''zbekiston Bog''i 120kW', 41.332540, 69.436085);
