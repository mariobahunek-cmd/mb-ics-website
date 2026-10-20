-- Keep legacy column order/count and exact source IDs. No rating/language inference.
-- openDB holds BEGIN IMMEDIATE across version selection and this entire migration.
DROP TRIGGER IF EXISTS recovery_historical_tombstone;
CREATE TABLE historical_next (
 source_id TEXT PRIMARY KEY,
 source TEXT NOT NULL CHECK(source IN ('ProvenExpert','LinkedIn')),
 source_rating REAL,
 source_scale REAL,
 original_date TEXT NOT NULL,
 imported_at INTEGER NOT NULL,
 comment_plaintext TEXT NOT NULL,
 display_name TEXT NOT NULL,
 original_language TEXT,
 permission_proof TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending_moderation' CHECK(status IN ('pending_moderation','published','withdrawn')),
 CHECK((source='LinkedIn' AND source_rating IS NULL AND source_scale IS NULL) OR
       (source='ProvenExpert' AND source_rating IS NOT NULL AND source_scale IS NOT NULL AND source_scale>0 AND source_rating>=0 AND source_rating<=source_scale))
) STRICT;
INSERT INTO historical_next SELECT * FROM historical;
DROP TABLE historical;
ALTER TABLE historical_next RENAME TO historical;
CREATE TRIGGER recovery_historical_tombstone BEFORE INSERT ON historical
WHEN EXISTS (SELECT 1 FROM recovery_events WHERE kind='historical_withdrawn' AND object_id='historical:' || NEW.source_id)
BEGIN SELECT RAISE(ABORT,'withdrawn historical recovery tombstone'); END;
CREATE TABLE historical_provenance (
 source_id TEXT PRIMARY KEY REFERENCES historical(source_id) ON DELETE CASCADE,
 provenance_json TEXT NOT NULL CHECK(json_valid(provenance_json))
) STRICT;
-- Relationship/URLs/source author context must not survive withdrawal or restore erasure.
CREATE TRIGGER historical_erase_provenance AFTER UPDATE OF status ON historical
WHEN NEW.status='withdrawn'
BEGIN DELETE FROM historical_provenance WHERE source_id=NEW.source_id; END;
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY) STRICT;
INSERT INTO schema_migrations VALUES (4);
-- Commit/version marker handled atomically by openDB.
