-- Explicit, approval-digest-bound equivalence only. No text/name/fuzzy matching.
CREATE TABLE historical_identity (
 source_id TEXT PRIMARY KEY REFERENCES historical(source_id),
 canonical_id TEXT NOT NULL,
 homepage_id TEXT,
 CHECK(length(canonical_id)=36),
 CHECK(homepage_id IS NULL OR (length(homepage_id)=73 AND substr(homepage_id,1,9)='homepage/'))
) STRICT;
CREATE INDEX historical_identity_group ON historical_identity(canonical_id);
CREATE TRIGGER historical_identity_immutable BEFORE UPDATE ON historical_identity
BEGIN SELECT RAISE(ABORT,'immutable canonical decision'); END;
CREATE TRIGGER historical_identity_no_delete BEFORE DELETE ON historical_identity
BEGIN SELECT RAISE(ABORT,'retain opaque canonical tombstone linkage'); END;
CREATE TRIGGER historical_identity_tombstone BEFORE INSERT ON historical_identity
WHEN EXISTS (SELECT 1 FROM recovery_events WHERE kind='historical_withdrawn' AND
 (object_id='historical:@canonical/' || NEW.canonical_id OR object_id='historical:@' || NEW.homepage_id))
 OR EXISTS (SELECT 1 FROM historical_identity i JOIN historical h USING(source_id)
 WHERE i.canonical_id=NEW.canonical_id AND h.status='withdrawn')
BEGIN SELECT RAISE(ABORT,'withdrawn canonical recovery tombstone'); END;
CREATE TRIGGER historical_identity_homepage_conflict BEFORE INSERT ON historical_identity
WHEN NEW.homepage_id IS NOT NULL AND EXISTS (SELECT 1 FROM historical_identity WHERE homepage_id=NEW.homepage_id AND canonical_id<>NEW.canonical_id)
BEGIN SELECT RAISE(ABORT,'homepage canonical decision conflict'); END;
INSERT INTO schema_migrations VALUES (5);
