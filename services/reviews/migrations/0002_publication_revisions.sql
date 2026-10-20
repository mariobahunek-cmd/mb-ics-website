-- Revisions order committed publication events, independently of wall-clock precision.
-- Keep only current membership; withdrawn/private content is never snapshotted.
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS publication_revisions (
 revision INTEGER PRIMARY KEY AUTOINCREMENT,
 review_id TEXT NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE
) STRICT;
CREATE TRIGGER IF NOT EXISTS publication_insert AFTER INSERT ON reviews
WHEN NEW.status='published'
BEGIN
 INSERT INTO publication_revisions(review_id) VALUES (NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS publication_update AFTER UPDATE OF status,published_at ON reviews
WHEN NEW.status='published' AND (OLD.status!='published' OR NEW.published_at IS NOT OLD.published_at)
BEGIN
 DELETE FROM publication_revisions WHERE review_id=NEW.id;
 INSERT INTO publication_revisions(review_id) VALUES (NEW.id);
END;
-- Idempotently initialize native records from databases created before this schema.
INSERT INTO publication_revisions(review_id)
 SELECT id FROM reviews WHERE status='published'
 AND NOT EXISTS (SELECT 1 FROM publication_revisions WHERE review_id=reviews.id)
 ORDER BY published_at,id;
COMMIT;
