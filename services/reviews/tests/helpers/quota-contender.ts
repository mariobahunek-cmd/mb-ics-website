import { openDB } from "../../src/db.ts";
import { submit } from "../../src/submit.ts";
import { valid } from "./fixture.ts";
const [path, request, mailbox] = process.argv.slice(2);
const db = openDB(path);
process.send!({ ready: true });
process.once("message", async () => {
  try {
    await submit({ db, key: Buffer.alloc(32,7), now: () => Date.UTC(2026,9,9), site: "http://127.0.0.1:4173", mailEnabled: true, send: async () => {}, challenge: async () => true },
      { ...valid, email: mailbox }, request, "192.0.2.99");
    process.send!({ ok: true });
  } catch (e) { process.send!({ ok: false, error: (e as Error).message }); }
  finally { db.close(); process.disconnect(); }
});
