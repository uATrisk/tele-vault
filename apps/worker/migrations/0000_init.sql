-- Migration 0000: Initialize TeleVault schema

CREATE TABLE IF NOT EXISTS vault (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  header BLOB NOT NULL,
  rev INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL UNIQUE,
  rev INTEGER NOT NULL,
  manifest BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS thumbs (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  bytes BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  item_id TEXT,
  idx INTEGER,
  message_id INTEGER NOT NULL,
  file_id TEXT NOT NULL,
  size INTEGER NOT NULL,
  PRIMARY KEY(item_id, idx)
);

CREATE TABLE IF NOT EXISTS pending_chunks (
  upload_id TEXT,
  idx INTEGER,
  message_id INTEGER NOT NULL,
  file_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(upload_id, idx)
);

CREATE TABLE IF NOT EXISTS tombstones (
  seq INTEGER PRIMARY KEY,
  id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Initialize sequence counter if not present
INSERT OR IGNORE INTO meta (key, value) VALUES ('seq_counter', '0');
INSERT OR IGNORE INTO meta (key, value) VALUES ('last_snapshot_seq', '0');
