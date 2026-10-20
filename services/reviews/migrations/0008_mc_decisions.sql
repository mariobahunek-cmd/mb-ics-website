CREATE TABLE IF NOT EXISTS mc_decisions (
 owner TEXT NOT NULL, request_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
 review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE, created_at INTEGER NOT NULL,
 PRIMARY KEY(owner,request_key)
) STRICT;
INSERT INTO schema_migrations(version) VALUES(8);
