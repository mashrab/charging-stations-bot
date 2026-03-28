-- Add telegram_id to players and make username nullable
ALTER TABLE players ADD COLUMN telegram_id INTEGER;
ALTER TABLE players ADD COLUMN first_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_telegram_id ON players(telegram_id);
