-- Players
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) WITHOUT ROWID;

-- Dictionary of valid Uzbek words
CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  length INTEGER NOT NULL
);

-- Main words used as game prompts
CREATE TABLE IF NOT EXISTS game_words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
) WITHOUT ROWID;

-- Pre-computed valid sub-words for each game word
CREATE TABLE IF NOT EXISTS game_word_answers (
  id TEXT PRIMARY KEY,
  game_word_id TEXT NOT NULL REFERENCES game_words(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  score INTEGER NOT NULL,
  UNIQUE(game_word_id, word)
) WITHOUT ROWID;

-- Individual game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  game_word_id TEXT NOT NULL REFERENCES game_words(id),
  score INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
) WITHOUT ROWID;

-- Words found during a session
CREATE TABLE IF NOT EXISTS game_session_words (
  id TEXT PRIMARY KEY,
  game_session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  score INTEGER NOT NULL,
  found_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(game_session_id, word)
) WITHOUT ROWID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_game_word_answers_gw ON game_word_answers(game_word_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_session_words_session ON game_session_words(game_session_id);
