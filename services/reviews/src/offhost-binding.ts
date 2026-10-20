import { recoveryConfig, b2RecoveryStore, b2BackupPruner, createRecoveryCycle, type B2Config } from './offhost.ts';
import type { DatabaseSync } from 'node:sqlite';

export interface RecoveryBinding { writer: B2Config; pruner: B2Config | null }

// Local configuration only: this neither creates keys nor grants provider rights.
export function recoveryBinding(env: NodeJS.ProcessEnv): RecoveryBinding | null {
  const writer = recoveryConfig(env);
  const keyId = env.REVIEWS_B2_PRUNE_KEY_ID;
  const applicationKey = env.REVIEWS_B2_PRUNE_APPLICATION_KEY;
  if (!writer) return null; // recoveryConfig rejects orphaned REVIEWS_B2_* values.
  if (!keyId && !applicationKey) return { writer, pruner: null };
  if (!keyId || !applicationKey || keyId === writer.keyId || applicationKey === writer.applicationKey)
    throw new Error('Separate complete pruning credential required');
  // No independently configurable target: exact bucket/root are inherited. The
  // adapter further requires exact root/backups/ and read/list/delete only.
  return { writer, pruner: { ...writer, keyId, applicationKey } };
}

export function boundRecoveryCycle(db: DatabaseSync, binding: RecoveryBinding, directory: string, transport: typeof fetch = fetch, clock = Date.now) {
  const writer = b2RecoveryStore(binding.writer, transport, directory, clock);
  const pruner = binding.pruner ? b2BackupPruner(binding.pruner, transport, directory, clock) : null;
  // Keep writer API unchanged. The private cycle alone receives the distinct
  // exact-ID deletion capability; both adapters reserve the same durable budget.
  const cycleStore = pruner ? { ...writer, remove: pruner.remove } : writer;
  return createRecoveryCycle(db, cycleStore, directory, clock);
}
