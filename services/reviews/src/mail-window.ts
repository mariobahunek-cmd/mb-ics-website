import type { MailDispatch } from "./context.ts";
// Operational timing budgets, not a provider rollback or exactly-once guarantee.
export const MAIL_REQUEST_BUDGET_MS = 10000;
export const MAIL_RECEIVE_MARGIN_MS = 10000;
export const MAIL_RETRY_RESERVE_MS = MAIL_REQUEST_BUDGET_MS + MAIL_RECEIVE_MARGIN_MS;
export function checkMailDispatch(window?: MailDispatch): void {
  if (!window || !Number.isFinite(window.deadline)) throw new Error("mail_retry_deadline");
  const remaining = window.deadline - window.now();
  if (!Number.isFinite(remaining) || remaining <= MAIL_REQUEST_BUDGET_MS)
    throw new Error("mail_retry_deadline");
}
