-- A neutral rejection is a durable moderation decision, not an author withdrawal.
-- Erased historical bodies retain the existing terminal withdrawn storage state;
-- authenticated moderation DTO projects rejected from this metadata-only ledger.
CREATE TABLE historical_moderation (
 source_id TEXT PRIMARY KEY REFERENCES historical(source_id),
 decision TEXT NOT NULL CHECK(decision='rejected'),
 reason TEXT NOT NULL CHECK(reason IN ('spam','duplicate','third_party_personal_data','sensitive_personal_data','unlawful','unrelated_training')),
 created_at INTEGER NOT NULL
) STRICT;
CREATE TRIGGER historical_moderation_immutable BEFORE UPDATE ON historical_moderation
BEGIN SELECT RAISE(ABORT,'immutable historical rejection'); END;
CREATE TRIGGER historical_moderation_no_delete BEFORE DELETE ON historical_moderation
BEGIN SELECT RAISE(ABORT,'retain historical rejection decision'); END;
INSERT INTO schema_migrations VALUES (6);
