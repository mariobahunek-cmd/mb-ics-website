import type { DatabaseSync } from "node:sqlite";
export interface Mail {
  to: string;
  confirm: string;
  manage: string;
  language: string;
}
export interface MailDispatch {
  // Original token expiry minus the receive/processing safety margin.
  readonly deadline: number;
  readonly now: () => number;
}
export interface Context {
  db: DatabaseSync;
  key: Buffer;
  now: () => number;
  site: string;
  // Only explicit true permits admission/dispatch; missing/false pauses attempts.
  mailEnabled?: boolean;
  backupAdmission?: () => void;
  send: (mail: Mail, id: string, dispatch: MailDispatch) => Promise<void>;
  challenge: (token: string) => Promise<boolean>;
}
