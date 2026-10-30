import { reviewCard, sourceLink } from "./trust-reviews.js";
import { translations } from "./reviews-i18n.js";
import { attachHandoff } from "./reviews-handoff.js";
import {
  AREAS,
  certOptionsForAreas,
  bookOptionsForAreas,
  certLabel,
  bookLabel,
} from "./course-options.js";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search),
  page = document.body.dataset.reviewPage;
let lang =
  page === "form" && ["en", "de", "es"].includes(params.get("lang"))
    ? params.get("lang")
    : document.documentElement.lang;
let t = translations[lang] || translations.en;
document.documentElement.lang = lang;
const paths = { en: "/reviews/", de: "/de/bewertungen/", es: "/es/opiniones/" };
const api = (
  document.querySelector('meta[name="reviews-api"]')?.content || ""
).replace(/\/$/, "");
let config;
function text(el, value) {
  el.textContent = value;
  return el;
}
function element(tag, content, cls) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (cls) node.className = cls;
  return node;
}
function status(id, message, error = false) {
  const node = $(id);
  node.textContent = message;
  node.classList.toggle("error", error);
}
function renderLanguage() {
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll("[data-i18n]"))
    if (t[node.dataset.i18n]) text(node, t[node.dataset.i18n]);
  for (const node of document.querySelectorAll("[data-star]"))
    text(
      node,
      `${node.dataset.star} ${Number(node.dataset.star) === 1 ? t.star : t.stars}`,
    );
  for (const node of document.querySelectorAll("[data-language]")) {
    const l = node.dataset.language;
    node.href = page === "form" ? `/review/?lang=${l}` : paths[l];
    if (l === lang) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  }
  for (const node of document.querySelectorAll("[data-form-link]"))
    node.href = `/review/?lang=${lang}`;
  for (const node of document.querySelectorAll("[data-list-link]"))
    node.href = paths[lang];
}
renderLanguage();
async function request(path, body, key) {
  const response = await fetch(api + path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
            ...(key ? { "Idempotency-Key": key } : {}),
          },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(15000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("unavailable");
  }
  if (!response.ok) throw new Error(data.error || "unavailable");
  return data;
}
function renderSummary(data) {
  const box = $("review-summary");
  box.replaceChildren();
  $("distribution").replaceChildren();
  if (!data.count) {
    box.append(element("p", t.empty));
    return;
  }
  box.append(
    element(
      "div",
      `${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(data.mean)} / 5`,
      "summary-value",
    ),
    element("p", `${t.mean} · ${data.count} ${t.count}`),
  );
  const dist = $("distribution");
  dist.setAttribute("aria-label", t.distribution);
  for (let stars = 5; stars >= 1; stars--) {
    const row = element("div", undefined, "distribution-row"),
      meter = document.createElement("meter");
    meter.min = 0;
    meter.max = data.count;
    meter.value = data.distribution[stars];
    meter.setAttribute(
      "aria-label",
      `${stars} ${t.stars}: ${data.distribution[stars]}`,
    );
    row.append(
      element("span", `${stars} ${t.stars}`),
      meter,
      element("span", String(data.distribution[stars])),
    );
    dist.append(row);
  }
}
function renderReview(r, historical = false) {
  if (!historical) return reviewCard(document,r,lang);
  const card = element("article", undefined, "review-card");
  card.dataset.reviewId = r.id || r.source_id;
  card.append(element("h3", r.display_name || t.anonymous));
  if (!historical || (r.source_rating !== null && r.source_scale !== null)) {
    card.append(element("p", historical
      ? `${r.source_rating} / ${r.source_scale}`
      : `${r.stars} / 5 ${t.stars}`, "stars"));
  } else card.append(element("p", t.recommendationNoStars, "metadata"));
  const date = historical
    ? r.original_date
    : new Date(r.published_at).toLocaleDateString(lang);
  card.append(
    element(
      "p",
      historical
        ? `${date} · ${r.source} · ${t.imported}: ${new Date(r.imported_at).toLocaleDateString(lang)}`
        : `${date} · ${r.course_category}${r.course_month ? " · " + r.course_month : ""}`,
      "metadata",
    ),
  );
  if (r.comment) {
    const comment = element("p", r.comment, "review-comment");
    if (r.original_language) comment.lang = r.original_language;
    card.append(comment);
  }
  card.append(
    element(
      "p",
      `${t.original}: ${r.original_language ?? t.unknownLanguage}${historical ? "" : " · " + t.emailOnly}`,
      "metadata",
    ),
  );
  if (historical && r.source === 'LinkedIn') card.append(sourceLink(document,r,lang));
  return card;
}
async function setupList() {
  let cursor = null,
    busy = false,
    generation = 0;
  async function load(reset = false) {
    if (busy && !reset) return;
    const current = ++generation;
    busy = true;
    $("load-more").disabled = true;
    status("list-status", t.loading);
    if (reset) {
      cursor = null;
      $("load-more").hidden = true;
      $("review-list").replaceChildren();
    }
    try {
      const query = new URLSearchParams({ sort: $("sort").value });
      if (cursor) query.set("cursor", cursor);
      const data = await request("/v1/reviews?" + query);
      if (current !== generation) return;
      renderSummary(data.summary);
      for (const r of data.items) $("review-list").append(renderReview(r));
      cursor = data.next_cursor;
      $("load-more").hidden = !cursor;
      status("list-status", data.items.length ? "" : t.empty);
    } catch {
      if (current === generation) status("list-status", t.failure, true);
    } finally {
      if (current === generation) {
        busy = false;
        $("load-more").disabled = false;
      }
    }
  }
  $("sort").addEventListener("change", () => load(true));
  $("load-more").addEventListener("click", () => load());
  await load(true);
  let offset = 0;
  async function history() {
    const button = $("historical-more");
    button.disabled = true;
    try {
      const data = await request("/v1/historical?offset=" + offset);
      status(
        "historical-status",
        data.count ? `${data.count} · ${Object.entries(data.source_counts || {}).map(([source, count]) => `${source}: ${count}`).join(" · ")}` : t.historicalEmpty,
      );
      for (const r of data.items)
        $("historical-list").append(renderReview(r, true));
      offset = data.next_offset;
      button.hidden = offset === null;
    } catch {
      status("historical-status", t.failure, true);
    } finally {
      button.disabled = false;
    }
  }
  $("historical-more").addEventListener("click", history);
  await history();
}
function setupTokenActions() {
  let current = null;
  function renderAction() {
    if (!current) return;
    const { action, result, busy } = current;
    text($("token-title"), t[action === "confirm" ? "confirmTitle" : "withdrawTitle"]);
    text($("token-hint"), t[action === "confirm" ? "confirmHint" : "withdrawHint"]);
    text($("token-submit"), t[action]);
    status("token-status", result ? t[result] : "", result === "tokenError");
    $("token-submit").hidden = result === "confirmed" || result === "withdrawn";
    $("token-submit").disabled = busy;
  }
  function receiveCapability() {
    const fragment = new URLSearchParams(location.hash.slice(1));
    const action = fragment.has("confirm") ? "confirm" : fragment.has("manage") ? "withdraw" : null;
    if (!action) return; // Ordinary anchors must not reset a draft or pending action.
    const token = fragment.get(action === "confirm" ? "confirm" : "manage");
    // replaceState emits no hashchange and retains unrelated history state/query.
    history.replaceState(history.state, "", location.pathname + location.search);
    if (!current || current.action !== action || current.token !== token)
      current = { action, token, result: null, busy: false };
    $("review-form").hidden = true;
    $("submission-success").hidden = true;
    $("token-action").hidden = false;
    renderAction();
  }
  window.addEventListener("hashchange", receiveCapability);
  for (const node of document.querySelectorAll("[data-language]")) {
    node.addEventListener("click", (event) => {
      if (!current) return;
      event.preventDefault();
      lang = node.dataset.language;
      t = translations[lang] || translations.en;
      const query = new URLSearchParams(location.search);
      query.set("lang", lang);
      history.replaceState(history.state, "", location.pathname + "?" + query);
      renderLanguage();
      renderAction();
    });
  }
  $("token-submit").addEventListener("click", async () => {
    const pending = current;
    if (!pending || pending.busy || (pending.result && pending.result !== "tokenError")) return;
    pending.busy = true;
    renderAction();
    try {
      await request("/v1/reviews/" + pending.action, { token: pending.token });
      pending.result = pending.action === "confirm" ? "confirmed" : "withdrawn";
    } catch {
      pending.result = "tokenError";
    } finally {
      pending.busy = false;
      // An earlier request must not overwrite a newer capability's UI.
      if (current === pending) renderAction();
    }
  });
  receiveCapability();
  return () => current !== null;
}
async function setupForm() {
  const hasCapability = setupTokenActions();
  if (hasCapability()) return;
  const form = $("review-form");
  let challenge = "";
  let widget;
  // B1: optional training period as YYYY-MM month selects (1990-01 .. now,
  // newest first). The empty value means "no selection"; a missing end month
  // is a single-month period.
  function fillPeriodSelect(select) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t.periodNone;
    select.append(placeholder);
    const current = new Date().toISOString().slice(0, 7);
    let [year, month] = current.split("-").map(Number);
    const options = [];
    while (`${year}-${String(month).padStart(2, "0")}` >= "1990-01") {
      options.push(`${year}-${String(month).padStart(2, "0")}`);
      if (--month === 0) {
        month = 12;
        year--;
      }
    }
    for (const value of options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
  }
  fillPeriodSelect($("period-from"));
  fillPeriodSelect($("period-to"));
  // B3/B4/B5: certification and book choices follow the selected training
  // areas (deduplicated union; Foundation always available). Incompatible
  // checked options are cleared visibly with a notice — never silently —
  // and compatible checked states survive an area change.
  const notice = $("selection-notice");
  function selectedAreas() {
    return AREAS.filter((area) =>
      form.querySelector(`input[name="training_areas"][value="${area}"]`)
        ?.checked,
    );
  }
  function renderCourseOptions() {
    const areas = selectedAreas();
    let cleared = 0;
    for (const [containerId, name, options, labeler] of [
      ["cert-options", "certifications", certOptionsForAreas(areas), certLabel],
      ["book-options", "books", bookOptionsForAreas(areas), bookLabel],
    ]) {
      const container = $(containerId);
      const previous = new Set(
        [...container.querySelectorAll("input:checked")].map((i) => i.value),
      );
      for (const value of previous)
        if (!options.includes(value)) cleared++;
      container.replaceChildren();
      for (const code of options) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = name;
        input.value = code;
        input.checked = previous.has(code);
        const span = document.createElement("span");
        span.textContent = labeler(code, lang);
        label.append(input, span);
        container.append(label);
      }
    }
    const chooseFirst = areas.length === 0;
    $("cert-filter-hint").hidden = !chooseFirst;
    $("books-filter-hint").hidden = !chooseFirst;
    notice.textContent = cleared ? t.selectionCleared : "";
  }
  for (const node of form.querySelectorAll('input[name="training_areas"]'))
    node.addEventListener("change", renderCourseOptions);
  renderCourseOptions();
  $("visibility").addEventListener("change", () => {
    const named = $("visibility").value === "named";
    $("name-field").hidden = !named;
    $("display-name").required = named;
    if (!named) $("display-name").value = "";
  });
  let configError = false;
  try {
    config = await request("/v1/config");
    if (config.local) {
      $("local-notice").hidden = false;
      text($("local-notice"), t.local);
      challenge = "local-synthetic";
      $("email").placeholder = "synthetic@example.invalid";
    }
    if (config.closed) {
      status("form-status", t.closed);
      return;
    }
    if (!config.local) {
      if (!config.sitekey) throw new Error("unavailable");
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      widget = window.turnstile.render("#challenge", {
        sitekey: config.sitekey,
        action: "review",
        language: lang,
        callback: (value) => (challenge = value),
        "expired-callback": () => (challenge = ""),
        "error-callback": () => {
          challenge = "";
          status("form-status", t.challengeError, true);
        },
      });
    }
    $("review-fields").disabled = false;
  } catch {
    configError = true;
    status("form-status", t.failure, true);
  }
  if (configError) return;
  let key = crypto.randomUUID(),
    lastBody = "",
    busy = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    for (const node of form.querySelectorAll("[aria-invalid]"))
      node.removeAttribute("aria-invalid");
    if (!form.checkValidity()) {
      status("form-status", t.invalid, true);
      for (const node of form.querySelectorAll(":invalid"))
        node.setAttribute("aria-invalid", "true");
      form.reportValidity();
      return;
    }
    if (config.local && !$("email").value.endsWith(".invalid")) {
      status("form-status", t.local, true);
      return;
    }
    if (!challenge) {
      status("form-status", t.challengeError, true);
      return;
    }
    const f = new FormData(form),
      original = String(f.get("comment") || "");
    // B3: at least one training area is required (the legacy single
    // course_category was equally mandatory). Everything else on the form
    // stays optional.
    const areas = f.getAll("training_areas").map(String);
    if (!areas.length) {
      status("form-status", t.areasRequired, true);
      const first = form.querySelector('input[name="training_areas"]');
      first.setAttribute("aria-invalid", "true");
      first.focus();
      return;
    }
    const periodFrom = String(f.get("course_period_from") || ""),
      periodTo = String(f.get("course_period_to") || "");
    if (periodFrom && periodTo && periodTo < periodFrom) {
      status("form-status", t.periodInvalid, true);
      $("period-to").setAttribute("aria-invalid", "true");
      return;
    }
    // B5: incompatible options are never submitted, even if a stale checked
    // state survived somewhere in the DOM — filter against the allowed union.
    const allowedCerts = certOptionsForAreas(areas),
      allowedBooks = bookOptionsForAreas(areas);
    const body = {
      stars: Number(f.get("stars")),
      comment: original,
      display_name: String(f.get("display_name") || ""),
      visibility_choice: String(f.get("visibility_choice")),
      // Legacy-compatible projection: the first selected area in canonical
      // order; the complete array travels in training_areas.
      course_category: AREAS.find((area) => areas.includes(area)),
      course_month: "",
      course_period_from: periodFrom,
      course_period_to: periodFrom ? periodTo || periodFrom : "",
      training_areas: areas,
      certifications: f
        .getAll("certifications")
        .map(String)
        .filter((code) => allowedCerts.includes(code)),
      books: f
        .getAll("books")
        .map(String)
        .filter((code) => allowedBooks.includes(code)),
      original_language: lang,
      email: String(f.get("email")),
      consent: $("consent").checked,
      consent_version: "2026-10-09",
      website: String(f.get("website") || ""),
    };
    const serialized = JSON.stringify(body);
    if (lastBody && lastBody !== serialized) key = crypto.randomUUID();
    lastBody = serialized;
    body.challenge = challenge;
    busy = true;
    $("review-fields").disabled = true;
    status("form-status", t.sending);
    try {
      await request("/v1/reviews", body, key);
      form.reset();
      form.hidden = true;
      status("form-status", "");
      if (!hasCapability()) {
        $("submission-success").hidden = false;
        attachHandoff(document, original, t, navigator.clipboard);
        $("submission-success").focus();
      }
    } catch (error) {
      status(
        "form-status",
        error.message === "challenge" ? t.challengeError : t.failure,
        true,
      );
      if (widget !== undefined) {
        window.turnstile.reset(widget);
        challenge = "";
      }
    } finally {
      busy = false;
      $("review-fields").disabled = false;
    }
  });
}
if (page === "list") setupList();
if (page === "form") setupForm();
