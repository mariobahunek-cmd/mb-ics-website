import { assertCapacity, reserveRequest, rotateBackups, rotationPlan, validateBackupReceipt, beginBackupCycle, finishBackupCycle, validateBackupState, cycleEvidenceMatches } from "./backup-operations.ts";
import { canonical, recoveryHead, syncRecovery, reconcileRecovery, type RecoveryCut, type RecoveryJournal, type RecoveryEvent } from "./recovery.ts";
import { backupDatabase, restoreDatabase } from "./operations.ts";
import { transaction } from "./db.ts";
import { mkdtemp, readFile, writeFile, rm, stat, rename, open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { closeSync, openSync, chmodSync, readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { s3Endpoint, signedS3Upload } from './s3-upload.ts';

export interface B2Config {
  keyId: string; applicationKey: string; bucketId: string; prefix: string; recipient: string;
  uploadTransport?: 'native' | 's3';
}
export interface ObjectReceipt {
  fileId: string; fileName: string; bucketId: string; contentLength: number; contentSha1: string;
}
const MAX_OBJECT = 64 * 1024 * 1024;
function hash(data: Buffer) { return createHash("sha1").update(data).digest("hex"); }
// B2 may report a computed-but-not-sender-verified digest. This normalizes
// metadata only: getWith and durable pre-upload SHA256 witnesses still verify bytes.
function metadataSha1(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^(?:unverified:)?[a-f0-9]{40}$/.test(value)) return undefined;
  return value.startsWith('unverified:') ? value.slice(11) : value;
}
function safeURL(raw: string, kind: "api" | "download" | "upload") {
  const u = new URL(raw);
  const host = kind === "api" ? /^api[0-9]+\.backblazeb2\.com$/ : kind === "download" ? /^f[0-9]+\.backblazeb2\.com$/ : /^pod-[a-z0-9-]+\.backblaze\.com$/;
  if (u.protocol !== "https:" || u.username || u.password || u.port || u.hash || !host.test(u.hostname) ||
      (kind !== "upload" && (u.pathname !== "/" || u.search)) ||
      (kind === "upload" && !u.pathname.startsWith("/b2api/v4/b2_upload_file"))) throw new Error("Unsafe B2 endpoint");
  return raw.replace(/\/$/, "");
}
async function bytes(response: Response, max: number) {
  if (!response.ok || !response.body) throw new Error("B2 request failed");
  const chunks: Buffer[] = []; let length = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    length += chunk.length;
    if (length > max) { await response.body.cancel().catch(() => {}); throw new Error("B2 response exceeds bound"); }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
function createB2Store(config: B2Config, transport: typeof fetch, operationsDirectory: string | undefined, requestClock: ()=>number, pruning=false) {
  if(config.uploadTransport!==undefined&&!['native','s3'].includes(config.uploadTransport))throw new Error('Invalid B2 upload transport');
  const allowedPrefix=config.prefix+(pruning?"backups/":"");
  const requiredCapabilities=pruning?["listFiles","readFiles","deleteFiles"]:["listFiles","readFiles","writeFiles","listBuckets","readBucketRetentions"];
  if (!config.keyId || !config.applicationKey || !config.bucketId || !/^age1[0-9a-z]{58}$/.test(config.recipient) ||
      !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/$/.test(config.prefix)) throw new Error("Invalid B2 recovery configuration");
  function name(relative: string) {
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(relative) || relative.split("/").some(p => p === "." || p === "..")) throw new Error("Invalid recovery object name");
    return config.prefix + relative;
  }
  function receipt(v: any): ObjectReceipt {
    const contentSha1=metadataSha1(v?.contentSha1);
    if (!v || typeof v.fileId !== "string" || !v.fileId || v.bucketId !== config.bucketId || typeof v.fileName !== "string" ||
        !v.fileName.startsWith(allowedPrefix) || name(v.fileName.slice(config.prefix.length)) !== v.fileName ||
        !Number.isSafeInteger(v.contentLength) || v.contentLength < 32 || v.contentLength > MAX_OBJECT ||
        !contentSha1) throw new Error("Invalid B2 object receipt");
    return { fileId: v.fileId, fileName: v.fileName, bucketId: v.bucketId, contentLength: v.contentLength, contentSha1 };
  }
  async function request(url: string, init: RequestInit = {}, maxResponse = 64 * 1024) {
    if (operationsDirectory) reserveRequest(operationsDirectory, requestClock(), maxResponse + (typeof init.body === "string" ? Buffer.byteLength(init.body) : init.body instanceof Uint8Array ? init.body.byteLength : 0));
    try { const response=await transport(url, { ...init, redirect: "error", signal: AbortSignal.timeout(30000) });
      if(!response.ok) authorization=undefined;return response;
    } catch(error) {authorization=undefined;throw error;}
  }
  async function json(url: string, init: RequestInit = {}) {
    return JSON.parse((await bytes(await request(url, init), 64 * 1024)).toString("utf8"));
  }
  let authorization: {at:number;value:{api:string;download:string;s3?:string;token:string;accountId:string;capabilities:string[]}} | undefined;
  async function auth() {
    const now=requestClock();
    if(authorization && now>=authorization.at && now-authorization.at<3600000) return authorization.value;
    authorization=undefined;
    const a = await json("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", {
      headers: { Authorization: "Basic " + Buffer.from(config.keyId + ":" + config.applicationKey).toString("base64") },
    });
    const s = a.apiInfo?.storageApi, allowed = s?.allowed;
    if (!s || !Array.isArray(allowed?.buckets) || allowed.buckets.length !== 1 || allowed.buckets[0].id !== config.bucketId ||
        allowed.namePrefix !== allowedPrefix || !Array.isArray(allowed.capabilities) ||
        requiredCapabilities.some(c => !allowed.capabilities.includes(c)) ||
        allowed.capabilities.some((c: string) => !requiredCapabilities.includes(c)) ||
        typeof a.authorizationToken !== "string" || !a.authorizationToken) throw new Error("B2 key must be restricted to the exact recovery bucket/prefix and read/list/write only");
    if (typeof a.accountId !== "string" || !a.accountId) throw new Error("Invalid B2 account");
    const s3=config.uploadTransport==='s3' ? s3Endpoint(s.s3ApiUrl).origin : undefined;
    const value={ api: safeURL(s.apiUrl, "api"), download: safeURL(s.downloadUrl, "download"), s3, token: a.authorizationToken as string, accountId: a.accountId as string, capabilities: allowed.capabilities as string[] };
    authorization={at:now,value};return value;
  }
  async function post(a: Awaited<ReturnType<typeof auth>>, operation: string, body: unknown) {
    return json(a.api + "/b2api/v4/" + operation, { method: "POST", headers: { Authorization: a.token, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  async function verifyWritePolicy(a: Awaited<ReturnType<typeof auth>>) {
    if (!a.capabilities.includes("listBuckets")) throw new Error("B2 bucket policy cannot be verified");
    const value = await post(a, "b2_list_buckets", { accountId: a.accountId, bucketId: config.bucketId });
    const b = value.buckets?.[0];
    if (!Array.isArray(value.buckets) || value.buckets.length !== 1 || b.bucketId !== config.bucketId || b.bucketType !== "allPrivate" ||
        b.fileLockConfiguration?.isClientAuthorizedToRead !== true || b.fileLockConfiguration?.value?.isFileLockEnabled !== false || !Array.isArray(b.lifecycleRules)) throw new Error("Unsafe or unknown B2 bucket policy");
    const backupPrefix = config.prefix + "backups/", journalPrefix = config.prefix + "journal/";
    let backupRule = false;
    for (const r of b.lifecycleRules) {
      if (typeof r.fileNamePrefix !== "string") throw new Error("Unknown B2 lifecycle policy");
      const overlaps = (p: string) => p.startsWith(r.fileNamePrefix) || r.fileNamePrefix.startsWith(p);
      if (overlaps(journalPrefix) && (r.daysFromUploadingToHiding != null || r.daysFromHidingToDeleting != null)) throw new Error("B2 policy must not prune recovery journal versions");
      if (overlaps(backupPrefix)) {
        // A shorter provider window plus operational margin; deletion is asynchronous
        // and still needs live age/deletion monitoring, not a claimed hard SLA.
        if (r.fileNamePrefix !== backupPrefix || r.daysFromUploadingToHiding !== 27 || r.daysFromHidingToDeleting !== 1) throw new Error("B2 backup lifecycle policy must be exact 27+1 days");
        backupRule = true;
      }
    }
    if (!backupRule) throw new Error("Finite B2 backup retention policy required before write");
    return b.bucketName;
  }
  async function getWith(a: Awaited<ReturnType<typeof auth>>, r: ObjectReceipt) {
    const data = await bytes(await request(a.download + "/b2api/v4/b2_download_file_by_id?fileId=" + encodeURIComponent(r.fileId), { headers: { Authorization: a.token } }, r.contentLength), r.contentLength);
    if (data.length !== r.contentLength || hash(data) !== r.contentSha1 || !data.subarray(0, 22).toString().startsWith("age-encryption.org/v1\n")) throw new Error("B2 object integrity failed");
    return data;
  }
  async function inventory(): Promise<ObjectReceipt[]> {
    const a=await auth(), result:ObjectReceipt[]=[], cursors=new Set<string>(), ids=new Set<string>();
    let cursor: {startFileName?:string;startFileId?:string}={};
    for(let page=0;page<100;page++) {
      const v=await post(a,"b2_list_file_versions",{bucketId:config.bucketId,prefix:allowedPrefix,maxFileCount:100,...cursor});
      if(!Array.isArray(v.files)||v.files.length>1000) throw new Error("Aggregate capacity inventory invalid");
      for(const f of v.files) {
        const contentSha1=metadataSha1(f.contentSha1);
        if(f.action!=="upload"||typeof f.fileId!=="string"||!f.fileId||ids.has(f.fileId)||f.bucketId!==config.bucketId||typeof f.fileName!=="string"||!f.fileName.startsWith(allowedPrefix)||name(f.fileName.slice(config.prefix.length))!==f.fileName||!Number.isSafeInteger(f.contentLength)||f.contentLength<0||!contentSha1) throw new Error("Aggregate capacity inventory unknown");
        ids.add(f.fileId); result.push({fileId:f.fileId,fileName:f.fileName,bucketId:f.bucketId,contentLength:f.contentLength,contentSha1});
        if(result.length>10000) throw new Error("Aggregate capacity inventory exhausted");
      }
      if(v.nextFileName===null&&v.nextFileId===null) return result;
      if(typeof v.nextFileName!=="string"||!v.nextFileName.startsWith(allowedPrefix)||typeof v.nextFileId!=="string") throw new Error("Aggregate capacity pagination invalid");
      const token=JSON.stringify([v.nextFileName,v.nextFileId]);
      if(cursors.has(token)) throw new Error("Aggregate capacity repeated pagination");
      cursors.add(token);cursor={startFileName:v.nextFileName,startFileId:v.nextFileId};
    }
    throw new Error("Aggregate capacity pagination exhausted");
  }
  async function remove(value:ObjectReceipt) {
    if(!pruning) throw new Error("Writer deletion capability prohibited");
    const target=receipt(value), now=requestClock(), before=await inventory();
    const cuts=before.map(object=>{
      const match=object.fileName.slice(allowedPrefix.length).match(/^([0-9]+)-[a-f0-9]{32}\.enc$/);
      if(!match) throw new Error("Unknown backup in pruning scope");
      return {object,createdAt:Number(match[1])};
    });
    const found=before.find(o=>o.fileId===target.fileId);
    if(!found) return; // no delete on an absent exact version; restart reconciliation
    if(JSON.stringify(receipt(found))!==JSON.stringify(target)) throw new Error("Pruning exact version conflict");
    const plan=rotationPlan(cuts,now);
    if(!plan.remove.some(c=>c.object.fileId===target.fileId)) throw new Error("Pruning retained snapshot prohibited");
    const a=await auth();
    for(const c of plan.keep) await getWith(a,receipt(c.object));
    const response=await post(a,"b2_delete_file_version",{fileName:target.fileName,fileId:target.fileId});
    if(response.fileId!==target.fileId||response.fileName!==target.fileName) throw new Error("Pruning acknowledgement conflict");
    const after=await inventory(),expected=before.filter(o=>o.fileId!==target.fileId);
    if(JSON.stringify(after)!==JSON.stringify(expected)) throw new Error("Pruning exact inventory readback failed");
  }
  return {
    remove,
    inventory,
    quietReconcileMs: operationsDirectory ? 600000 : 0,
    backupPrefix: config.prefix + "backups/",
    async put(relative: string, plaintext: Buffer, beforeUpload?: (ciphertext: Buffer) => Promise<void>): Promise<ObjectReceipt> {
      if(pruning) throw new Error("Pruning credential cannot upload");
      const fileName = name(relative);
      if (plaintext.length > MAX_OBJECT - 32) throw new Error("Recovery object exceeds bound");
      // Standard age ciphertext. The name binding is application data INSIDE age,
      // not a new cryptographic envelope or an online decryption capability.
      const body = await age(["--encrypt", "--recipient", config.recipient], Buffer.from(JSON.stringify({ version: 1, fileName, data: plaintext.toString("base64") })));
      if (body.length > MAX_OBJECT) throw new Error("Recovery ciphertext exceeds bound");
      if (operationsDirectory) await assertCapacity(await inventory(), operationsDirectory, body.length + 1024 * 1024);
      await beforeUpload?.(body); // durable witness BEFORE any ambiguous provider write
      const a = await auth(); const bucketName=await verifyWritePolicy(a);
      let r:ObjectReceipt;
      if(config.uploadTransport==='s3') {
        if(!a.s3)throw new Error('Missing authenticated S3 endpoint');
        const signed=await signedS3Upload(a.s3,bucketName,fileName,body,config.keyId,config.applicationKey);
        const response=await request(signed.url,{method:'PUT',headers:signed.headers,body:new Uint8Array(body)});
        const fileId=response.headers.get('x-amz-version-id');
        await response.body?.cancel();
        if(response.status!==200||!fileId||fileId.length>2048||/[\x00-\x20\x7f]/.test(fileId))throw new Error('Unverified S3 upload version');
        r=receipt(await post(a,'b2_get_file_info',{fileId}));
        if(r.fileId!==fileId)throw new Error('S3 upload version conflict');
      } else {
      const u = await post(a, "b2_get_upload_url", { bucketId: config.bucketId });
      if (typeof u.authorizationToken !== "string" || !u.authorizationToken) throw new Error("Invalid B2 upload token");
      r = receipt(await json(safeURL(u.uploadUrl, "upload"), {
        method: "POST", headers: { Authorization: u.authorizationToken, "X-Bz-File-Name": encodeURIComponent(fileName), "Content-Type": "application/octet-stream", "Content-Length": String(body.length), "X-Bz-Content-Sha1": hash(body) }, body: new Uint8Array(body),
      }));
      }
      if (r.fileName !== fileName || r.contentLength !== body.length || r.contentSha1 !== hash(body)) throw new Error("B2 upload receipt mismatch");
      if (!(await getWith(a, r)).equals(body)) throw new Error("B2 readback mismatch");
      return r;
    },
    async get(value: ObjectReceipt) { const r = receipt(value); return getWith(await auth(), r); },
    async versions(relative: string): Promise<ObjectReceipt[]> {
      const prefix = name(relative), a = await auth(), result: ObjectReceipt[] = [], cursors = new Set<string>();
      let cursor: { startFileName?: string; startFileId?: string } = {};
      for (let page = 0; page < 100; page++) {
        const v = await post(a, "b2_list_file_versions", { bucketId: config.bucketId, prefix, maxFileCount: 100, ...cursor });
        if (!Array.isArray(v.files) || v.files.length > 1000) throw new Error("Invalid B2 version list");
        for (const f of v.files) {
          if (f.fileName !== prefix || f.action !== "upload") throw new Error("Unexpected recovery version or hide marker");
          result.push(receipt(f));
        }
        if (v.nextFileName === null && v.nextFileId === null) return result;
        if (typeof v.nextFileName !== "string" || typeof v.nextFileId !== "string" || !v.nextFileName.startsWith(prefix)) throw new Error("Invalid B2 pagination");
        const token = JSON.stringify([v.nextFileName, v.nextFileId]);
        if (cursors.has(token)) throw new Error("Repeated B2 pagination"); cursors.add(token);
        cursor = { startFileName: v.nextFileName, startFileId: v.nextFileId };
      }
      throw new Error("Recovery version capacity exhausted");
    },
  };
}
export function b2RecoveryStore(config:B2Config,transport:typeof fetch=fetch,operationsDirectory?:string,clock=Date.now) {
  const {remove: _prohibited,...writer}=createB2Store(config,transport,operationsDirectory,clock);
  return writer;
}
// Optional separately scoped capability. The shared server/CLI binding may attach
// it; provisioning the distinct backup-prefix credential requires later approval.
export function b2BackupPruner(config:B2Config,transport:typeof fetch=fetch,operationsDirectory:string,clock=Date.now) {
  if(!operationsDirectory) throw new Error("Durable pruning budget directory required");
  const {inventory,get,remove,backupPrefix}=createB2Store(config,transport,operationsDirectory,clock,true);
  return {inventory,get,remove,backupPrefix};
}
export type RecoveryStore = ReturnType<typeof b2RecoveryStore> & {
  readPlaintext?: (receipt: ObjectReceipt) => Promise<Buffer>;
  readVerified?: (receipt: ObjectReceipt) => Promise<{ plaintext: Buffer; ciphertext: Buffer }>;
};
async function age(args: string[], input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("age", args, { env: { PATH: process.env.PATH }, stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = []; let size = 0;
    const timeout = setTimeout(() => { child.kill(); reject(new Error("age operation timed out")); }, 30000);
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OBJECT) { child.kill(); reject(new Error("age output exceeds bound")); }
      else chunks.push(chunk);
    });
    child.stderr.resume(); // never expose private inputs or identity diagnostics
    child.on("error", () => { clearTimeout(timeout); reject(new Error("age executable unavailable")); });
    child.on("close", code => { clearTimeout(timeout); code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error("age operation failed")); });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
// Called only by a separately authorized recovery CLI; never configured on server.
export function offlineRecoveryStore(store: RecoveryStore, identityFile: string): RecoveryStore {
  if (!identityFile || !identityFile.startsWith("/")) throw new Error("Explicit absolute offline identity path required");
  async function readVerified(receipt: ObjectReceipt) {
    const ciphertext = await store.get(receipt);
    const value = JSON.parse((await age(["--decrypt", "--identity", identityFile], ciphertext)).toString("utf8"));
    if (value.version !== 1 || value.fileName !== receipt.fileName || typeof value.data !== "string") throw new Error("Recovery object name binding failed");
    const data = Buffer.from(value.data, "base64");
    if (data.toString("base64") !== value.data) throw new Error("Invalid recovery payload");
    return { plaintext: data, ciphertext };
  }
  return { ...store, readVerified, async readPlaintext(receipt) { return (await readVerified(receipt)).plaintext; } };
}
function plaintext(store: RecoveryStore, receipt: ObjectReceipt) {
  if (!store.readPlaintext) throw new Error("Separately authorized offline decrypt capability required");
  return store.readPlaintext(receipt);
}
export function recoveryConfig(env: NodeJS.ProcessEnv): B2Config | null {
  if (env.REVIEWS_BACKUP_KEY || env.REVIEWS_BACKUP_IDENTITY) throw new Error("Online decryption key configuration prohibited");
  if (!env.REVIEWS_RECOVERY_PROVIDER) {
    if (Object.keys(env).some(k => (k.startsWith("REVIEWS_B2_") || k.startsWith("REVIEWS_BACKUP_")) && env[k])) throw new Error("Partial recovery configuration");
    return null;
  }
  if (env.REVIEWS_RECOVERY_PROVIDER !== "b2" || env.REVIEWS_MODE === "local") throw new Error("Unsafe recovery provider configuration");
  const config = {
    keyId: env.REVIEWS_B2_KEY_ID ?? "", applicationKey: env.REVIEWS_B2_APPLICATION_KEY ?? "",
    bucketId: env.REVIEWS_B2_BUCKET_ID ?? "", prefix: env.REVIEWS_B2_PREFIX ?? "",
    recipient: env.REVIEWS_BACKUP_RECIPIENT ?? "",
    ...(env.REVIEWS_B2_UPLOAD_TRANSPORT===undefined?{}:{uploadTransport:env.REVIEWS_B2_UPLOAD_TRANSPORT as 'native'|'s3'}),
  };
  b2RecoveryStore(config); // validate before any datastore/file creation or network call
  return config;
}
async function atomicState(directory: string, value: unknown, fileName = "offhost-state.json") {
  const temporary = join(directory, "offhost-state-" + randomBytes(16).toString("hex") + ".tmp");
  try {
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx" });
    const handle = await open(temporary, "r"); try { await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, join(directory, fileName));
    const parent = await open(directory, "r"); try { await parent.sync(); } finally { await parent.close(); }
  } finally { await rm(temporary, { force: true }); }
}
export function createRecoveryCycle(db: DatabaseSync, store: RecoveryStore, directory: string, clock = Date.now) {
  let active: Promise<void> | undefined;
  async function run() {
    const now = clock();
    let quiet:any, reusableJournalEvidence:{verifiedBefore:number;sourceCut:RecoveryCut}|undefined;
    if(store.quietReconcileMs) try {
      const prior=validateBackupState(JSON.parse(readFileSync(join(directory,"offhost-state.json"),"utf8")),now);
      const head=recoveryHead(db), remote=prior.lastRemoteVerifiedAt??prior.lastVerifiedSync;
      if(cycleEvidenceMatches(directory,prior)&&!existsSync(join(directory,"offhost-error.json"))&&
        head.origin===prior.observedJournalCut.origin&&head.head===prior.observedJournalCut.head) {
        reusableJournalEvidence={verifiedBefore:prior.lastVerifiedSync,sourceCut:head};
        if(now-remote<Math.min(store.quietReconcileMs,600000)&&now-prior.lastBackup.createdAt<86400000&&
          Math.floor(now/86400000)===Math.floor(prior.lastVerifiedSync/86400000)) quiet=prior;
      }
    } catch { /* Invalid/missing evidence takes the full, fail-closed path. */ }
    const generation=beginBackupCycle(directory,now,store.quietReconcileMs); let lastBackup: BackupReceipt | undefined;
    try {
    try {
      const state = JSON.parse(await readFile(join(directory, "offhost-state.json"), "utf8"));
      if (![1,2].includes(state.version) || state.lastBackup?.version !== 1 || !Number.isSafeInteger(state.lastVerifiedSync) || state.lastVerifiedSync > now || !Number.isSafeInteger(state.lastBackup.createdAt) || state.lastBackup.createdAt > now) throw new Error("Invalid recovery schedule state");
      if(state.version===2) validateBackupState(state,now);
      lastBackup = validateBackupReceipt(state.lastBackup,now);
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    try {
      const receipt=JSON.parse(await readFile(join(directory,"offhost-backup-receipt.json"),"utf8"));
      if(receipt.version!==1||!Number.isSafeInteger(receipt.createdAt)||receipt.createdAt<0||receipt.createdAt>now||receipt.object?.fileName?.match(/\/backups\/([0-9]+)-[a-f0-9]{32}\.enc$/)?.[1]!==String(receipt.createdAt)) throw new Error("Invalid recovery backup receipt");
      validateBackupReceipt(receipt,now);
      if(lastBackup && (receipt.createdAt<lastBackup.createdAt || (receipt.createdAt===lastBackup.createdAt && JSON.stringify(receipt)!==JSON.stringify(lastBackup)))) throw new Error("Conflicting recovery backup receipt");
      lastBackup=receipt;
    } catch(error) {if((error as NodeJS.ErrnoException).code!=="ENOENT") throw error;}
    if(quiet && JSON.stringify(lastBackup)===JSON.stringify(quiet.lastBackup)) {
      // No new source cut: reuse exact immutable evidence for at most ten minutes.
      // Local heartbeat is not a fabricated remote readback; preserve its timestamp.
      const capacity=await assertCapacity([{fileId:"cached-aggregate",fileName:"cached",contentLength:quiet.capacity.remote}],directory,1024*1024);
      const head=recoveryHead(db);
      if(head.origin===quiet.observedJournalCut.origin&&head.head===quiet.observedJournalCut.head) {
        finishBackupCycle(directory,generation,{...quiet,lastVerifiedSync:now,capacity},true);return;
      }
    }
    const cut = await syncRecovery(db, b2RecoveryJournal(store, directory, undefined,
      store.quietReconcileMs ? {now,...reusableJournalEvidence} : undefined));
    if (!lastBackup || now - lastBackup.createdAt >= 86400000) lastBackup = await backupOffhost(db, store, directory, now);
    await store.get(lastBackup.object);
    const rotation = await rotateBackups(store, now);
    const capacity = await assertCapacity(rotation.inventory, directory, 1024 * 1024);
    finishBackupCycle(directory,generation, { version: 2, lastVerifiedSync: now, lastRemoteVerifiedAt:now, observedJournalCut: cut, lastBackup,
      rotation: {daily:rotation.daily.map(c=>c.object),weekly:rotation.weekly.map(c=>c.object)}, capacity },true);
    } catch (error) {
      finishBackupCycle(directory,generation,{version:1,failedAt:clock(),reason:"backup_cycle_failed"},false);
      throw error;
    }
  }
  return () => {
    if (!active) active = run().finally(() => { active = undefined; });
    return active;
  };
}
export function scheduleOffhost(run: () => Promise<void>, onError: () => void, interval = 60000) {
  if (!Number.isSafeInteger(interval) || interval < 1) throw new Error("Invalid recovery interval");
  let stopped = false, timer: ReturnType<typeof setTimeout> | undefined, active: Promise<void>;
  const tick = async () => {
    try { await run(); } catch { onError(); }
    if (!stopped) { timer = setTimeout(() => { active = tick(); }, interval); timer.unref(); }
  };
  active = tick();
  return { async stop() { stopped = true; clearTimeout(timer); await active; } };
}
export interface BackupReceipt { version: 1; createdAt: number; object: ObjectReceipt; observedJournalCut: RecoveryCut }
export async function backupOffhost(db: DatabaseSync, store: RecoveryStore, privateDirectory: string, now = Date.now()): Promise<BackupReceipt> {
  const pendingFile=join(privateDirectory,"offhost-backup-pending.json");
  try {
    const pending=JSON.parse(await readFile(pendingFile,"utf8"));
    if(pending.version!==1||!Number.isSafeInteger(pending.createdAt)||pending.createdAt>now||pending.createdAt<0||pending.relative?.match(/^backups\/([0-9]+)-[a-f0-9]{32}\.enc$/)?.[1]!==String(pending.createdAt)||!/^[a-f0-9]{64}$/.test(pending.cipherSha256)) throw new Error("Invalid pending backup witness");
    const matches=(await store.inventory()).filter(r=>r.fileName.endsWith("/"+pending.relative));
    if(matches.length>1) throw new Error("Ambiguous backup witness versions");
    if(matches.length) {
      if(sha256(await store.get(matches[0]))!==pending.cipherSha256) throw new Error("Backup witness conflict");
      const observedJournalCut=await syncRecovery(db,b2RecoveryJournal(store,privateDirectory));
      const receipt:BackupReceipt={version:1,createdAt:pending.createdAt,object:matches[0],observedJournalCut};
      await atomicState(privateDirectory,receipt,"offhost-backup-receipt.json");
      await rm(pendingFile);await syncDirectory(privateDirectory);
      return receipt;
    }
    // Complete inventory found no accepted object. No append to journal is erased.
    await rm(pendingFile);await syncDirectory(privateDirectory);
  } catch(error) {if((error as NodeJS.ErrnoException).code!=="ENOENT") throw error;}
  const temporary = await mkdtemp(join(privateDirectory, "offhost-"));
  try {
    await syncRecovery(db, b2RecoveryJournal(store, privateDirectory));
    const snapshot = join(temporary, "backup.sqlite");
    await backupDatabase(db, snapshot);
    if ((await stat(snapshot)).size > MAX_OBJECT - 32) throw new Error("Backup exceeds bound");
    const relative=`backups/${now}-${randomBytes(16).toString("hex")}.enc`;
    const object = await store.put(relative, await readFile(snapshot), async ciphertext => {
      await atomicState(privateDirectory,{version:1,createdAt:now,relative,cipherSha256:sha256(ciphertext)},"offhost-backup-pending.json");
    });
    // Online backup may include controls committed during its async work. Sync again;
    // the observation is NOT independent proof that an otherwise lost tail is complete.
    const observedJournalCut = await syncRecovery(db, b2RecoveryJournal(store, privateDirectory));
    const receipt:BackupReceipt={ version: 1, createdAt: now, object, observedJournalCut };
    await atomicState(privateDirectory,receipt,"offhost-backup-receipt.json");
    await rm(pendingFile,{force:true});await syncDirectory(privateDirectory);
    return receipt;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
export interface OffhostCut extends RecoveryCut { contentSha256: string }
// Capture on the authoritative source with writers fenced, and preserve separately.
// Never produce this authority from a downloaded journal or an old backup.
export function authoritativeOffhostCut(db: DatabaseSync): OffhostCut {
  return transaction(db, () => {
    const cut = recoveryHead(db);
    const events = normalize(db.prepare("SELECT sequence,kind,object_id,count,expires_at FROM recovery_events ORDER BY sequence").all() as unknown as RecoveryEvent[]);
    return { ...cut, contentSha256: sha256(Buffer.from(JSON.stringify({ version: 1, origin: cut.origin, events }))) };
  });
}
function requireAuthority(expected: OffhostCut) {
  if (!expected || !/^[a-f0-9]{64}$/.test(expected.contentSha256 ?? "")) throw new Error("Independent source content commitment authority required");
}
export async function restoreOffhost(store: RecoveryStore, receipt: BackupReceipt, destination: string, expected: OffhostCut, privateDirectory: string, now = Date.now()) {
  if (!receipt || receipt.version !== 1 || !Number.isSafeInteger(receipt.createdAt) || receipt.createdAt > now || now - receipt.createdAt > 30 * 86400000) throw new Error("Backup receipt invalid or expired");
  const nameAge = receipt.object?.fileName?.match(/\/backups\/([0-9]+)-[a-f0-9]{32}\.enc$/)?.[1];
  if (nameAge !== String(receipt.createdAt)) throw new Error("Backup receipt age/name mismatch");
  requireAuthority(expected);
  const temporary = await mkdtemp(join(privateDirectory, "offhost-restore-"));
  try {
    const snapshot = join(temporary, "backup.sqlite");
    await writeFile(snapshot, await plaintext(store, receipt.object), { mode: 0o600, flag: "wx" });
    await restoreDatabase(snapshot, destination);
    await reconcileOffhost(store, destination, expected, now);
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
export async function reconcileOffhost(store: RecoveryStore, destination: string, expected: OffhostCut, now = Date.now()) {
  requireAuthority(expected);
  return reconcileRecovery(destination, b2RecoveryJournal(store, dirname(destination), expected), expected, now);
}
function originName(origin: string) {
  if (!/^[a-f0-9]{32}$/.test(origin)) throw new Error("Invalid recovery origin");
  return `journal/${origin}`;
}
function normalize(batch: RecoveryEvent[]) {
  if (!Array.isArray(batch) || batch.length > 100000) throw new Error("Invalid recovery sequence capacity");
  return batch.map((e, i) => {
    canonical(e);
    if (e.sequence !== i + 1) throw new Error("Recovery sequence gap");
    return { sequence: e.sequence, kind: e.kind, object_id: e.object_id, count: e.count, expires_at: e.expires_at };
  });
}
function sha256(data: Buffer) { return createHash("sha256").update(data).digest("hex"); }
function openWitness(directory: string) {
  const file = join(directory, "offhost-witness.sqlite");
  closeSync(openSync(file, "a", 0o600)); chmodSync(file, 0o600);
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    db.exec("CREATE TABLE IF NOT EXISTS witness(origin TEXT NOT NULL, relative TEXT NOT NULL, cipher TEXT PRIMARY KEY, payload TEXT NOT NULL, head INTEGER NOT NULL, confirmed INTEGER NOT NULL DEFAULT 0) STRICT;");
    // Exact immutable receipt -> already verified ciphertext. This is not a new
    // witness or completeness authority, and never replaces the retained witness.
    db.exec("CREATE TABLE IF NOT EXISTS verified_receipt(receipt TEXT PRIMARY KEY, cipher TEXT NOT NULL, checked_at INTEGER NOT NULL) STRICT;");
    return db;
  } catch (error) { db.close(); throw error; }
}
async function syncDirectory(directory: string) {
  const parent = await open(directory, "r"); try { await parent.sync(); } finally { await parent.close(); }
}
export function b2RecoveryJournal(store: RecoveryStore, witnessDirectory?: string, expected?: OffhostCut,
  verification?: {now:number;verifiedBefore?:number;sourceCut?:RecoveryCut}): RecoveryJournal {
  async function read(origin: string) {
    const versions = await store.versions(originName(origin));
    if (versions.length > 1000 || versions.reduce((sum, r) => sum + r.contentLength, 0) > MAX_OBJECT) throw new Error("Recovery journal capacity exhausted; preserve evidence and close recovery");
    let events: RecoveryEvent[] = [];
    const proofs: { cipher: string; payload: string; head: number }[] = [];
    // B2 writes versions, not a compare-and-set register. Read every retained version:
    // forks/hidden entries fail closed; never silently take the latest upload time.
    for (const receipt of versions) {
      const verified = witnessDirectory && store.readVerified ? await store.readVerified(receipt) : undefined;
      const value = JSON.parse((verified ? verified.plaintext : await plaintext(store, receipt)).toString("utf8"));
      if (value.version !== 1 || value.origin !== origin) throw new Error("Recovery journal origin/version mismatch");
      const next = normalize(value.events);
      const prefix = Math.min(events.length, next.length);
      for (let i = 0; i < prefix; i++) if (canonical(events[i]) !== canonical(next[i])) throw new Error("Recovery revision conflict");
      if (next.length > events.length) events = next;
      if (verified) proofs.push({ cipher: sha256(verified.ciphertext), payload: sha256(Buffer.from(JSON.stringify({ version: 1, origin, events: next }))), head: next.length });
    }
    if (expected) {
      requireAuthority(expected);
      if (origin !== expected.origin || events.length !== expected.head) throw new Error("Recovery ledger incomplete");
      if (sha256(Buffer.from(JSON.stringify({ version: 1, origin, events }))) !== expected.contentSha256) throw new Error("Recovery source content commitment mismatch");
    }
    // Only the explicitly authorized offline reader can rebuild lost source witnesses.
    // Validate ALL retained versions before any proof commit; source/cut reconciliation
    // still runs separately and cannot be bypassed by possession of these digests.
    if (expected && witnessDirectory && proofs.length) {
      const db = openWitness(witnessDirectory);
      try {
        db.exec("BEGIN IMMEDIATE");
        for (const proof of proofs) {
          const existing = db.prepare("SELECT * FROM witness WHERE cipher=?").get(proof.cipher);
          if (existing && (existing.origin !== origin || existing.relative !== originName(origin) || existing.payload !== proof.payload || existing.head !== proof.head)) throw new Error("Recovery witness conflict");
          if (!existing) {
            if (Number(db.prepare("SELECT count(*) n FROM witness").get()!.n) >= 1000) throw new Error("Recovery witness capacity exhausted");
            db.prepare("INSERT INTO witness(origin,relative,cipher,payload,head,confirmed) VALUES (?,?,?,?,?,1)").run(origin, originName(origin), proof.cipher, proof.payload, proof.head);
          } else db.prepare("UPDATE witness SET confirmed=1 WHERE cipher=?").run(proof.cipher);
        }
        db.exec("COMMIT");
        await syncDirectory(witnessDirectory);
      } finally { db.close(); }
    }
    return { origin, head: events.length, events };
  }
  return {
    read,
    async append(origin, batch) {
      const relative = originName(origin), next = normalize(batch);
      if (!witnessDirectory) throw new Error("Durable private journal witness directory required");
      const db = openWitness(witnessDirectory);
      const digest = sha256;
      const payload = (head: number) => Buffer.from(JSON.stringify({ version: 1, origin, events: next.slice(0, head) }));
      try {
        async function verify() {
          const versions = await store.versions(relative);
          if (versions.length > 1000 || versions.reduce((sum, r) => sum + r.contentLength, 0) > MAX_OBJECT) throw new Error("Recovery journal capacity exhausted");
          const seen = new Set<string>(); let head = 0;
          for (const receipt of versions) {
            const key=JSON.stringify(receipt);
            const cached=verification?.verifiedBefore===undefined || verification.sourceCut?.origin!==origin || verification.sourceCut?.head!==next.length ? undefined :
              db.prepare("SELECT * FROM verified_receipt WHERE receipt=?").get(key);
            // Fresh list + exact immutable receipt + original SHA256 witness.
            // Cache hits never advance checked_at. Every ciphertext is downloaded
            // again within 24h; source changes/errors/pending disable reuse.
            const reusable=cached && Number.isSafeInteger(cached.checked_at) && Number(cached.checked_at)>=0 &&
              Number(cached.checked_at)<=verification!.verifiedBefore! && Number(cached.checked_at)<=verification!.now &&
              verification!.now-Number(cached.checked_at)<86400000;
            const cipher = reusable ? String(cached.cipher) : digest(await store.get(receipt)); seen.add(cipher);
            const w = db.prepare("SELECT * FROM witness WHERE cipher=? AND origin=? AND relative=?").get(cipher, origin, relative);
            if (!w) throw new Error("Recovery remote prefix unprovable; preserve evidence for offline recovery");
            const n = Number(w.head);
            if (!Number.isSafeInteger(n) || n < 1 || n > next.length) throw new Error("Recovery journal ahead of source");
            if (w.payload !== digest(payload(n))) throw new Error("Recovery revision conflict");
            if(verification && !reusable) db.prepare("INSERT INTO verified_receipt VALUES(?,?,?) ON CONFLICT(receipt) DO UPDATE SET cipher=excluded.cipher,checked_at=max(checked_at,excluded.checked_at)").run(key,cipher,verification.now);
            head = Math.max(head, n);
          }
          const confirmed = db.prepare("SELECT cipher FROM witness WHERE origin=? AND relative=? AND confirmed=1").all(origin, relative);
          if (confirmed.some(w => !seen.has(String(w.cipher)))) throw new Error("Recovery remote prefix unprovable: confirmed version missing");
          for (const cipher of seen) db.prepare("UPDATE witness SET confirmed=1 WHERE cipher=?").run(cipher);
          return head;
        }
        if (await verify() < next.length) {
          const plain = payload(next.length);
          await store.put(relative, plain, async ciphertext => {
            if (Number(db.prepare("SELECT count(*) n FROM witness").get()!.n) >= 1000) throw new Error("Recovery witness capacity exhausted");
            db.prepare("INSERT INTO witness(origin,relative,cipher,payload,head) VALUES (?,?,?,?,?)").run(origin, relative, digest(ciphertext), digest(plain), next.length);
            // SQLite FULL commits proof before upload; sync the newly created directory entry too.
            await syncDirectory(witnessDirectory!);
          });
          if (await verify() !== next.length) throw new Error("Invalid recovery acknowledgement");
        }
        return { origin, head: next.length };
      } finally { db.close(); }
    },
  };
}
