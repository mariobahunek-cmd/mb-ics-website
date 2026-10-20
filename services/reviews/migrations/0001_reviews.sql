PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS reviews (
 id TEXT PRIMARY KEY, stars INTEGER NOT NULL CHECK(typeof(stars)='integer' AND stars BETWEEN 1 AND 5),
 comment_plaintext TEXT NOT NULL CHECK(length(comment_plaintext)<=3000), display_name TEXT NOT NULL CHECK(length(display_name)<=80),
 visibility_choice TEXT NOT NULL CHECK(visibility_choice IN ('anonymous','named')), course_category TEXT NOT NULL CHECK(course_category IN ('MM','SD','basics','other')),
 course_month TEXT, original_language TEXT NOT NULL CHECK(original_language IN ('en','de','es')),
 status TEXT NOT NULL CHECK(status IN ('pending_email','pending_moderation','published','rejected','withdrawn')),
 created_at INTEGER NOT NULL,published_at INTEGER, consent_version TEXT NOT NULL,consent_at INTEGER NOT NULL,
 origin TEXT NOT NULL DEFAULT 'native' CHECK(origin='native'), verification_level TEXT NOT NULL DEFAULT 'email_only' CHECK(verification_level='email_only')
) STRICT;
CREATE INDEX IF NOT EXISTS review_public ON reviews(status,published_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS review_private (
 review_id TEXT PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE, email_cipher TEXT NOT NULL, dedupe_hmac TEXT NOT NULL,
 token_digest TEXT UNIQUE NOT NULL, token_expiry INTEGER NOT NULL, consumed_at INTEGER, manage_digest TEXT UNIQUE NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS review_dedupe ON review_private(dedupe_hmac);
CREATE TABLE IF NOT EXISTS idempotency (key_digest TEXT PRIMARY KEY,body_digest TEXT NOT NULL,review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,created_at INTEGER NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS outbox (review_id TEXT PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,payload_cipher TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('queued','sending','sent')),attempts INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY,review_id TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL) STRICT;
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'immutable audit'); END;
CREATE TABLE IF NOT EXISTS historical (source_id TEXT PRIMARY KEY,source TEXT NOT NULL CHECK(source='ProvenExpert'),source_rating REAL NOT NULL,source_scale REAL NOT NULL CHECK(source_scale>0),original_date TEXT NOT NULL,imported_at INTEGER NOT NULL,comment_plaintext TEXT NOT NULL,display_name TEXT NOT NULL,original_language TEXT NOT NULL,permission_proof TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','withdrawn')),CHECK(source_rating>=0 AND source_rating<=source_scale)) STRICT;
