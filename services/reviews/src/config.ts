export function loadConfig(env: NodeJS.ProcessEnv) {
  const local = env.REVIEWS_MODE === "local",
    host = env.HOST ?? "127.0.0.1",
    port = Number(env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid port configuration");
  if (local && host !== "127.0.0.1")
    throw new Error("Local mode requires literal loopback 127.0.0.1");
  const site = local ? `http://127.0.0.1:${port}` : env.REVIEWS_SITE_URL;
  const api = local ? site : env.REVIEWS_API_URL;
  if (!local) {
    const required = [
      "REVIEWS_KEY",
      "REVIEWS_SITE_URL",
      "REVIEWS_API_URL",
      "OIDC_ISSUER",
      "OIDC_CLIENT_ID",
      "OIDC_CLIENT_SECRET",
      "OIDC_DISCOVERY_URL",
      "OIDC_REDIRECT_URI",
      "REVIEWS_ADMIN_ORIGIN",
      "OIDC_AUDIENCE",
      "OIDC_JWKS_URL",
      "OIDC_SUBJECTS",
      "OIDC_MFA_METHODS",
      "TURNSTILE_SECRET",
      "TURNSTILE_SITEKEY",
      "TURNSTILE_HOSTNAME",
      "RESEND_API_KEY",
      "MAIL_FROM",
    ];
    if (
      env.REVIEWS_MODE !== "production" ||
      required.some((k) => !env[k]) ||
      env.REVIEWS_LOCAL_AUTH ||
      env.REVIEWS_LOCAL_MAIL
    )
      throw new Error("Missing or unsafe production configuration");
    for (const value of [site, api, env.OIDC_ISSUER, env.OIDC_JWKS_URL])
      if (new URL(value!).protocol !== "https:")
        throw new Error("HTTPS required in production configuration");
    if ([site, api].some((value) => new URL(value!).origin !== value))
      throw new Error("Exact origins required in production configuration");
    const discovery =
      env.OIDC_ISSUER!.replace(/\/$/, "") + "/.well-known/openid-configuration";
    if (
      env.REVIEWS_ADMIN_ORIGIN !== api ||
      env.OIDC_REDIRECT_URI !== api + "/v1/admin/callback" ||
      env.OIDC_DISCOVERY_URL !== discovery ||
      env.OIDC_AUDIENCE === env.OIDC_CLIENT_ID
    )
      throw new Error(
        "Exact OIDC/admin binding required in production configuration",
      );
    for (const value of [env.OIDC_ISSUER!, env.OIDC_JWKS_URL!]) {
      const parsed = new URL(value);
      if (
        parsed.username ||
        parsed.password ||
        parsed.hash ||
        parsed.search ||
        (parsed.href !== value && parsed.href !== value + "/")
      )
        throw new Error("Exact OIDC URLs required in production configuration");
    }
    if (env.OIDC_SUBJECTS!.split(",").some((x) => !x || x !== x.trim()))
      throw new Error("Stable subjects required in production configuration");
    if (Buffer.from(env.REVIEWS_KEY!, "base64").length !== 32)
      throw new Error(
        "32-byte encryption key required in production configuration",
      );
    if (
      env
        .OIDC_MFA_METHODS!.split(",")
        .some((x) => !x || ["pwd", "password", "email", "sms"].includes(x))
    )
      throw new Error(
        "Explicit strong MFA claim required in production configuration",
      );
  }
  // Owner-approved shared Free pool, not an isolated provider allocation.
  // Fail closed on misspellings/partial opt-ins; local preview never sends outbound.
  const mailMode = env.REVIEWS_MAIL_MODE ?? "paused";
  if (!["paused", "shared-pool"].includes(mailMode) || (local && mailMode !== "paused"))
    throw new Error("Invalid mail configuration");
  let sharedPool: { apiKey: string; from: string } | null = null;
  if (!local && mailMode === "shared-pool") {
    const from = env.MAIL_FROM ?? "";
    // Intentionally one bare ASCII mailbox, not a display-name/header grammar.
    if (!env.RESEND_API_KEY || !/^[\x21-\x7e]+$/.test(env.RESEND_API_KEY) ||
        from.length > 254 || from.split("@")[0].length > 64 ||
        !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(from))
      throw new Error("Invalid shared-pool mail configuration");
    sharedPool = { apiKey: env.RESEND_API_KEY, from };
  }
  return {
    local,
    mailEnabled: local || sharedPool !== null,
    sharedPool,
    host,
    port,
    site: site!,
    api: api!,
    data: env.REVIEWS_DATA_DIR ?? ".review-data",
    closed: env.REVIEWS_CLOSED === "true",
    historicalReleaseReference: env.REVIEWS_HISTORICAL_RELEASE_REFERENCE?.trim() || null,
  };
}
