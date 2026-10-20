import { test, mock } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { digest } from "../src/crypto.ts";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/db.ts";
import assert from "node:assert/strict";
import { fixture } from "./helpers/fixture.ts";
import { moderate } from "../src/admin.ts";
import { publicList } from "../src/public.ts";
function insert(
  db: ReturnType<typeof openDB>,
  id: string,
  status = "published",
) {
  db.prepare(
    "INSERT INTO reviews(id,stars,comment_plaintext,display_name,visibility_choice,course_category,original_language,status,created_at,published_at,consent_version,consent_at) VALUES (?,5,'Synthetic boundary test','','anonymous','MM','en',?,1,1,'2026-10-09',1)",
  ).run(id, status);
}
for (const sort of ["newest", "critical"])
  test(`publication in snapshot millisecond must not enter later ${sort} page aggregate`, () => {
    const f = fixture();
    const actor = { sub: "synthetic-reviewer", role: "moderator" as const };
    const ids = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ];
    try {
      for (const id of ids)
        f.db
          .prepare(
            "INSERT INTO reviews(id,stars,comment_plaintext,display_name,visibility_choice,course_category,original_language,status,created_at,consent_version,consent_at) VALUES (?,5,'Synthetic boundary test','','anonymous','MM','en','pending_moderation',?,'2026-10-09',?)",
          )
          .run(id, f.ctx.now(), f.ctx.now());
      for (const id of ids.slice(0, 2))
        moderate(f.ctx, actor, id, "published", "reviewed");
      const first = publicList(
        f.ctx,
        new URLSearchParams({ sort, limit: "1" }),
      );
      // Another publication occurs after page one but within the same Date.now() millisecond.
      moderate(f.ctx, actor, ids[2], "published", "reviewed");
      const second = publicList(
        f.ctx,
        new URLSearchParams({ sort, limit: "1", cursor: first.next_cursor! }),
      );
      console.log(
        JSON.stringify({
          sort,
          reachable: first.items.length + second.items.length,
          count: second.summary.count,
          next: second.next_cursor,
          newPublicationReturned: [...first.items, ...second.items].some(
            (r) => r.id === ids[2],
          ),
        }),
      );
      assert.equal(
        second.summary.count,
        2,
        "Later publication must not change cursor snapshot membership",
      );
    } finally {
      f.db.close();
    }
  });
for (const sort of ["newest", "critical"]) {
  for (const mutation of ["insert", "publish", "republish", "withdraw"]) {
    test(`${sort} count/list use one read snapshot across concurrent ${mutation}`, () => {
      const dir = mkdtempSync(join(tmpdir(), "review-snapshot-"));
      const reader = openDB(join(dir, "db")),
        writer = openDB(join(dir, "db")),
        f = fixture();
      const ctx = { ...f.ctx, db: reader };
      try {
        insert(writer, "a");
        insert(writer, "b");
        insert(writer, "c", "pending_moderation");
        const prepare = reader.prepare.bind(reader);
        let changed = false;
        const hook = mock.method(reader, "prepare", (sql: string) => {
          // The rows SELECT has run; commit on a distinct connection before aggregates.
          if (!changed && sql.startsWith("SELECT stars,count(*)")) {
            changed = true;
            if (mutation === "insert") insert(writer, "d");
            if (mutation === "publish")
              writer
                .prepare("UPDATE reviews SET status='published' WHERE id='c'")
                .run();
            if (mutation === "republish")
              writer.exec(
                "BEGIN; UPDATE reviews SET status='pending_moderation' WHERE id='a'; UPDATE reviews SET status='published' WHERE id='a'; COMMIT;",
              );
            if (mutation === "withdraw")
              writer
                .prepare("UPDATE reviews SET status='withdrawn' WHERE id='a'")
                .run();
          }
          return prepare(sql);
        });
        const page = publicList(ctx, new URLSearchParams({ sort }));
        hook.mock.restore();
        assert.ok(changed);
        assert.equal(page.items.length, 2);
        assert.equal(page.summary.count, 2);
        assert.deepEqual(page.items.map((x) => x.id).sort(), ["a", "b"]);
        const current = publicList(ctx, new URLSearchParams({ sort }));
        assert.equal(
          current.summary.count,
          mutation === "withdraw" ? 1 : mutation === "republish" ? 2 : 3,
        );
        assert.equal(current.items.length, current.summary.count);
      } finally {
        mock.restoreAll();
        reader.close();
        writer.close();
        f.db.close();
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
  test(`${sort} cursor survives reopen, excludes backdated inserts and republication, and hides withdrawals`, () => {
    const dir = mkdtempSync(join(tmpdir(), "review-revision-")),
      file = join(dir, "db"),
      f = fixture();
    let db = openDB(file);
    try {
      for (const id of ["a", "b", "c", "d"]) insert(db, id);
      const first = publicList(
        { ...f.ctx, db },
        new URLSearchParams({ sort, limit: "1" }),
      );
      const rev = Number(
        db.prepare("SELECT max(revision) n FROM publication_revisions").get()!
          .n,
      );
      db.close();
      db = openDB(file);
      insert(db, "z");
      db.exec(
        "UPDATE reviews SET status='pending_moderation' WHERE id='a'; UPDATE reviews SET status='published' WHERE id='a'; UPDATE reviews SET status='withdrawn' WHERE id='b';",
      );
      const second = publicList(
        { ...f.ctx, db },
        new URLSearchParams({ sort, limit: "10", cursor: first.next_cursor! }),
      );
      assert.deepEqual(
        second.items.map((x) => x.id),
        ["c"],
      );
      assert.equal(second.summary.count, 2);
      assert.equal(second.next_cursor, null);
      assert.ok(
        Number(
          db
            .prepare(
              "SELECT revision FROM publication_revisions WHERE review_id='a'",
            )
            .get()!.revision,
        ) > rev,
      );
      db.exec("DELETE FROM reviews");
      db.close();
      db = openDB(file);
      insert(db, "new");
      assert.ok(
        Number(
          db.prepare("SELECT revision FROM publication_revisions").get()!
            .revision,
        ) > rev,
      );
    } finally {
      db.close();
      f.db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("schema upgrade initializes native publication revisions once and rejects legacy signed cursors", () => {
  const dir = mkdtempSync(join(tmpdir(), "review-schema-")),
    file = join(dir, "db"),
    f = fixture();
  let db = new DatabaseSync(file);
  try {
    db.exec(
      readFileSync(
        new URL("../migrations/0001_reviews.sql", import.meta.url),
        "utf8",
      ),
    );
    insert(db, "old-native");
    insert(db, "pending", "pending_moderation");
    db.close();
    db = openDB(file);
    const initial = db.prepare("SELECT * FROM publication_revisions").all();
    assert.equal(initial.length, 1);
    assert.equal(initial[0].review_id, "old-native");
    db.close();
    db = openDB(file);
    assert.deepEqual(
      db.prepare("SELECT * FROM publication_revisions").all(),
      initial,
    );
    assert.equal(
      publicList({ ...f.ctx, db }, new URLSearchParams()).summary.count,
      1,
    );
    const data = Buffer.from(
      JSON.stringify({
        sort: "newest",
        date: 1,
        id: "old-native",
        stars: 5,
        snapshot: f.ctx.now(),
      }),
    ).toString("base64url");
    assert.throws(
      () =>
        publicList(
          { ...f.ctx, db },
          new URLSearchParams({
            cursor: data + "." + digest(f.ctx.key, "cursor:" + data),
          }),
        ),
      /cursor/,
    );
  } finally {
    db.close();
    f.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
