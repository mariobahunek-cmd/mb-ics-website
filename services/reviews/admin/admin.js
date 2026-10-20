"use strict";
const $ = (id) => document.getElementById(id);
let identity = "",
  csrf = "",
  local = false,
  sessionEpoch = 0,
  offset = 0,
  auditOffset = 0;
let historicalOffset = 0;
const node = (tag, text) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  return el;
};
async function api(path, body) {
  const epoch = sessionEpoch;
  const r = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(local && identity ? { Authorization: "Bearer " + identity } : {}),
      ...(body && !local ? { "X-CSRF-Token": csrf } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    credentials: local ? "omit" : "same-origin",
    referrerPolicy: "no-referrer",
  });
  if (r.status === 401)
    signedOut("Session invalid or expired. Login with fresh MFA.");
  if (!r.ok)
    throw new Error(
      r.status === 401
        ? "Session invalid or expired. Sign in with recent MFA."
        : "Action failed. Check state and reason, then refresh.",
    );
  const result = await r.json();
  if (epoch !== sessionEpoch) throw new Error("Session changed. Login again.");
  return result;
}
async function audit(reset = true) {
  if (reset) {
    auditOffset = 0;
    $("audit").replaceChildren();
  }
  const rows = await api("/v1/admin/audit?offset=" + auditOffset);
  for (const r of rows) {
    const p = node(
      "p",
      `${new Date(r.created_at).toISOString()} · ${r.actor} · ${r.review_id} · ${r.action} · ${r.reason}`,
    );
    p.className = "audit";
    $("audit").append(p);
  }
  auditOffset += rows.length;
  $("audit-next").hidden = rows.length < 100;
}
async function load(reset = true) {
  try {
    if (reset) {
      offset = 0;
      $("queue").replaceChildren();
    }
    const rows = await api("/v1/admin/reviews?offset=" + offset);
    $("login").hidden = true;
    $("admin-content").hidden = false;
    for (const r of rows) {
      const card = node("article");
      card.className = "review-card";
      card.dataset.reviewId = r.id;
      card.append(
        node("h3", `${r.stars}/5 · ${r.status}`),
        node(
          "p",
          `${r.id} · ${r.display_name || "Anonymous"} · ${r.course_category} · ${r.original_language}`,
        ),
      );
      const comment = node("p", r.comment_plaintext);
      comment.className = "review-comment";
      card.append(comment);
      const controls = node("div");
      controls.className = "admin-actions";
      async function action(status, reason) {
        for (const b of controls.querySelectorAll("button")) b.disabled = true;
        try {
          await api("/v1/admin/reviews/" + r.id, { status, reason });
          $("admin-status").textContent = "Saved with audit record.";
          await load();
          await audit();
        } catch (e) {
          $("admin-status").textContent = e.message;
          for (const b of controls.querySelectorAll("button"))
            b.disabled = false;
        }
      }
      if (r.status === "pending_moderation") {
        const publish = node("button", "Publish");
        publish.type = "button";
        publish.addEventListener("click", () =>
          action("published", "reviewed_under_neutral_policy"),
        );
        controls.append(publish);
        const label = node("label", "Rejection reason");
        label.htmlFor = "reason-" + r.id;
        const select = node("select");
        select.id = label.htmlFor;
        for (const [value, text] of [
          ["", "Choose a permitted reason"],
          ["spam", "Spam"],
          ["duplicate", "Duplicate"],
          ["third_party_personal_data", "Third-party personal data"],
          ["sensitive_personal_data", "Sensitive personal data (self or others)"],
          ["unlawful", "Unlawful content"],
          ["unrelated_training", "No training relation"],
        ]) {
          const option = node("option", text);
          option.value = value;
          select.append(option);
        }
        const reject = node("button", "Reject");
        reject.type = "button";
        reject.addEventListener("click", () => {
          if (!select.value) {
            $("admin-status").textContent =
              "Choose a permitted rejection reason.";
            return;
          }
          action("rejected", select.value);
        });
        controls.append(label, select, reject);
      }
      if (["pending_moderation", "published"].includes(r.status)) {
        const label = node(
          "label",
          "Exact third-party personal text to remove (no rewriting)",
        );
        label.htmlFor = "redact-" + r.id;
        const field = node("textarea");
        field.id = label.htmlFor;
        field.maxLength = 3000;
        const button = node("button", "Redact personal data");
        button.type = "button";
        button.addEventListener("click", async () => {
          if (
            !field.value.trim() ||
            !confirm(
              "Remove this exact text for third-party privacy and audit the action? Contact the author for substantial changes.",
            )
          )
            return;
          try {
            await api("/v1/admin/reviews/" + r.id + "/redact", {
              remove: field.value,
            });
            await load();
            await audit();
          } catch (e) {
            $("admin-status").textContent = e.message;
          }
        });
        controls.append(label, field, button);
      }
      if (r.status !== "withdrawn") {
        const withdraw = node("button", "Withdraw / erase");
        withdraw.type = "button";
        withdraw.addEventListener("click", () => {
          if (
            confirm(
              "Withdraw and erase private data for this review? This is for an author request or documented moderation need.",
            )
          )
            action("withdrawn", "moderator_documented_withdrawal");
        });
        controls.append(withdraw);
      }
      card.append(controls);
      $("queue").append(card);
    }
    offset += rows.length;
    $("queue-next").hidden = rows.length < 50;
    if (!rows.length && reset) $("queue").append(node("p", "No submissions."));
    await loadHistorical(reset);
  } catch (e) {
    $("admin-status").textContent = e.message;
  }
}
async function loadHistorical(reset = true) {
  const queue = $("historical-queue");
  if (!queue) return;
  if (reset) {historicalOffset=0;queue.replaceChildren();}
  const rows = await api("/v1/admin/historical?offset="+historicalOffset);
  for (const r of rows) {
    const card=node("article");card.className="review-card historical-card";
    card.dataset.sourceId=r.source_id;card.dataset.status=r.status;
    card.append(node("h3",`${r.source} · ${r.source_rating === null ? "Unrated recommendation" : r.source_rating+" / "+r.source_scale} · ${r.status}`),
      node("p",`${r.source_id} · ${r.display_name || "Anonymous"} · ${r.original_date} · ${r.original_language ?? "unknown language"}`));
    const comment=node("p",r.comment_plaintext);comment.className="review-comment";card.append(comment);
    card.append(node("p","Permission reference: "+r.permission_proof),node("p","Authorized import rights: "+r.import_rights_confirmed),
      node("p","Approval digest: "+(r.approved_digest ?? "No authorized import")),node("pre",JSON.stringify(r.provenance ?? {},null,2)));
    const controls=node("div");controls.className="admin-actions";
    async function action(path,body) {
      for(const b of controls.querySelectorAll("button"))b.disabled=true;
      try {await api("/v1/admin/historical/"+encodeURIComponent(r.source_id)+path,body);await load();await audit();$("admin-status").textContent="Saved historical decision with audit and erasure controls.";}
      catch(e){$("admin-status").textContent=e.message;for(const b of controls.querySelectorAll("button"))b.disabled=false;}
    }
    if(r.status==="pending_moderation") {
      const rights=node("input");rights.type="checkbox";rights.dataset.rightsConfirmed="";
      const rightsLabel=node("label");rightsLabel.append(rights,document.createTextNode(" I explicitly verified this source's publication rights."));
      const publish=node("button","Publish");publish.type="button";publish.dataset.action="publish";
      publish.addEventListener("click",()=>{
        if(!rights.checked || !r.import_rights_confirmed || !r.approved_digest){$("admin-status").textContent="Verify original rights and authorized import digest before publication.";return;}
        action("/approve",{manual_approval:true,rights_confirmed:true,approved_digest:r.approved_digest,reason:"reviewed_under_neutral_policy"});
      });
      const select=node("select");select.setAttribute("aria-label","Historical rejection reason");
      for(const [value,text] of [["","Choose a permitted reason"],["spam","Spam"],["duplicate","Duplicate"],["third_party_personal_data","Third-party personal data"],["sensitive_personal_data","Sensitive personal data (self or others)"],["unlawful","Unlawful content"],["unrelated_training","No training relation"]]) {const option=node("option",text);option.value=value;select.append(option);}
      const reject=node("button","Reject / erase linked variants");reject.type="button";reject.dataset.action="reject";
      reject.addEventListener("click",()=>{if(!select.value){$("admin-status").textContent="Choose a permitted rejection reason.";return;}
        if(confirm("Reject and erase all linked canonical variants, including any published variants, under this neutral reason?"))action("/reject",{manual_rejection:true,reason:select.value});});
      controls.append(rightsLabel,publish,select,reject);
    }
    if(["pending_moderation","published"].includes(r.status)){
      const withdraw=node("button","Withdraw / erase linked variants");withdraw.type="button";
      withdraw.addEventListener("click",()=>{if(confirm("Author-request withdrawal: erase all linked canonical variants?"))action("",{});});controls.append(withdraw);
    }
    card.append(controls);queue.append(card);
  }
  historicalOffset+=rows.length;$("historical-next").hidden=rows.length<50;
  if(!rows.length && reset)queue.append(node("p","No historical records."));
}
$("historical-next")?.addEventListener("click",()=>loadHistorical(false).catch(e=>$("admin-status").textContent=e.message));
$("sign-in").addEventListener("click", async () => {
  try {
    const response = await fetch("/v1/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok)
      throw new Error("Login unavailable. Retry or contact the owner.");
    const result = await response.json();
    window.location.assign(result.authorizationUrl);
  } catch (e) {
    $("admin-status").textContent = e.message;
  }
});
function signedOut(message) {
  sessionEpoch++;
  identity = "";
  csrf = "";
  $("queue").replaceChildren();
  $("historical-queue")?.replaceChildren();
  $("audit").replaceChildren();
  $("admin-content").hidden = true;
  $("login").hidden = false;
  $("admin-status").textContent = message;
}
async function restoreSession() {
  try {
    const status = await api("/v1/admin/session");
    csrf = status.csrf;
    await load();
    await audit();
  } catch (e) {
    signedOut(e.message);
  }
}
$("refresh").addEventListener("click", () => {
  load();
  audit().catch((e) => ($("admin-status").textContent = e.message));
});
$("queue-next").addEventListener("click", () => load(false));
$("audit-next").addEventListener("click", () =>
  audit(false).catch((e) => ($("admin-status").textContent = e.message)),
);
$("logout").addEventListener("click", async () => {
  try {
    if (!local) await api("/v1/admin/logout", {});
    signedOut("Signed out.");
  } catch (e) {
    $("admin-status").textContent = e.message;
  }
});
fetch("/v1/config", { cache: "no-store" })
  .then((r) => r.json())
  .then((c) => {
    local = !!c.local;
    $("local-login").hidden = !local;
    $("oidc-login").hidden = local;
    if (!local) return restoreSession();
  })
  .catch(() => ($("admin-status").textContent = "Service unavailable."));
$("local-login").addEventListener("click", async () => {
  try {
    const r = await fetch("/__local/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) throw new Error("Local identity unavailable");
    identity = (await r.json()).token;
    await load();
    await audit();
    $("admin-status").textContent =
      "LOCAL SYNTHETIC identity. This is not production MFA.";
  } catch (e) {
    $("admin-status").textContent = e.message;
  }
});
