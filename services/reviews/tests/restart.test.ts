import { test } from "node:test";
import assert from "node:assert/strict";
import { backend } from "./helpers/backend.ts";
import { valid } from "./helpers/fixture.ts";
test("real HTTP backend restart preserves review, confirmation token, moderation and withdrawal", async () => {
  const service = await backend(
    new URL("../src/server.ts", import.meta.url).pathname,
  );
  try {
    await service.json("/v1/reviews", {
      ...valid,
      challenge: "local-synthetic",
    });
    let { token } = await service.json("/__local/login", {});
    const [mail] = await service.json("/__local/mail", undefined, token);
    const confirm = new URLSearchParams(
      new URL(mail.confirm).hash.slice(1),
    ).get("confirm");
    const manage = new URLSearchParams(new URL(mail.manage).hash.slice(1)).get(
      "manage",
    );
    const firstPID = service.pid;
    await service.restart();
    assert.notEqual(service.pid, firstPID);
    await service.json("/v1/reviews/confirm", { token: confirm });
    ({ token } = await service.json("/__local/login", {}));
    const [row] = await service.json("/v1/admin/reviews", undefined, token);
    assert.equal(row.status, "pending_moderation");
    await service.json(
      "/v1/admin/reviews/" + row.id,
      { status: "published", reason: "reviewed" },
      token,
    );
    const published = await service.json("/v1/reviews");
    assert.equal(published.summary.count, 1);
    assert.equal(published.items[0].id, row.id);
    await service.restart();
    assert.deepEqual(await service.json("/v1/reviews"), published);
    await assert.rejects(
      () => service.json("/v1/reviews/confirm", { token: confirm }),
      /400/,
    );
    await service.json("/v1/reviews/withdraw", { token: manage });
    await service.restart();
    const withdrawn = await service.json("/v1/reviews");
    assert.equal(withdrawn.summary.count, 0);
    assert.deepEqual(withdrawn.items, []);
  } finally {
    await service.close();
  }
});
