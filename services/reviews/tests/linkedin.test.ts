import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore Public browser ES module is intentionally plain JavaScript.
import { attachHandoff } from "../../../reviews-handoff.js";
function dom() {
  const nodes = new Map<string, any>();
  for (const id of [
    "linkedin-copy",
    "rating-only",
    "copy-status",
    "linkedin-manual",
    "linkedin-text",
  ])
    nodes.set(id, {
      hidden: false,
      textContent: "",
      value: "",
      addEventListener(_event: string, fn: any) {
        this.click = fn;
      },
      focus() {},
      select() {},
    });
  return { getElementById: (id: string) => nodes.get(id) };
}
const t = { copied: "Copied; not sent", manual: "Copy manually" };
test("author text is copied only on gesture, unchanged, with truthful resolved/denied/unavailable feedback", async () => {
  for (const stars of [1, 2, 3, 4, 5]) {
    const doc = dom(),
      original = `Rating ${stars}: crítica\n日本語 🌎`;
    let calls = 0;
    let finish: () => void = () => {};
    attachHandoff(doc, original, t, {
      writeText: async (text: string) => {
        calls++;
        assert.equal(text, original);
        await new Promise<void>((r) => (finish = r));
      },
    });
    assert.equal(calls, 0);
    const pending = doc.getElementById("linkedin-copy").click();
    assert.equal(calls, 1);
    assert.equal(doc.getElementById("copy-status").textContent, "");
    finish();
    await pending;
    assert.equal(doc.getElementById("copy-status").textContent, t.copied);
  }
  for (const clipboard of [
    undefined,
    {
      writeText: async () => {
        throw new Error("denied");
      },
    },
  ]) {
    const doc = dom();
    attachHandoff(doc, "Original\ntext", t, clipboard);
    await doc.getElementById("linkedin-copy").click();
    assert.equal(doc.getElementById("linkedin-manual").hidden, false);
    assert.equal(doc.getElementById("linkedin-text").value, "Original\ntext");
    assert.equal(doc.getElementById("copy-status").textContent, t.manual);
  }
  const doc = dom();
  attachHandoff(doc, "", t, undefined);
  assert.equal(doc.getElementById("linkedin-copy").hidden, true);
  assert.equal(doc.getElementById("rating-only").hidden, false);
});
