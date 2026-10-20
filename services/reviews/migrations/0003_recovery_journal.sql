-- Metadata only: no removed text, mailbox, capability, or foreign key to retained bodies.
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS recovery_state (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), origin TEXT NOT NULL,
 acknowledged INTEGER NOT NULL DEFAULT 0 CHECK(acknowledged>=0)
) STRICT;
INSERT OR IGNORE INTO recovery_state(singleton,origin) VALUES (1,lower(hex(randomblob(16))));
CREATE TABLE IF NOT EXISTS recovery_events (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 kind TEXT NOT NULL CHECK(kind IN ('withdrawn','redacted','historical_withdrawn','quota')),
 object_id TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE TRIGGER IF NOT EXISTS recovery_no_update BEFORE UPDATE ON recovery_events
 BEGIN SELECT RAISE(ABORT,'immutable recovery journal'); END;
CREATE TRIGGER IF NOT EXISTS recovery_no_delete BEFORE DELETE ON recovery_events
 BEGIN SELECT RAISE(ABORT,'immutable recovery journal'); END;
-- Privacy change and its journal intent commit or roll back together with existing audit.
CREATE TRIGGER IF NOT EXISTS recovery_privacy AFTER INSERT ON audit
WHEN NEW.action IN ('withdrawn','redacted','historical_withdrawn')
BEGIN
 INSERT INTO recovery_events(kind,object_id) VALUES (NEW.action,NEW.review_id);
END;
-- An object imported and withdrawn after the backup may be absent on restore.
-- Its exact source ID must not be resurrected by a replayed authorized import.
CREATE TRIGGER IF NOT EXISTS recovery_historical_tombstone BEFORE INSERT ON historical
WHEN EXISTS (SELECT 1 FROM recovery_events WHERE kind='historical_withdrawn' AND object_id='historical:' || NEW.source_id)
BEGIN SELECT RAISE(ABORT,'withdrawn historical recovery tombstone'); END;
COMMIT;
