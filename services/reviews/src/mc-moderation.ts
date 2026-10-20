import {transaction} from './db.ts';import {authorize,type Actor} from './admin.ts';
import {createHash} from 'node:crypto';import type {Context} from './context.ts';import {HttpError} from './schema.ts';
export function reviewDetail(ctx:Context,id:unknown){
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(400,'id');
 const row=ctx.db.prepare('SELECT id,stars,comment_plaintext,display_name,visibility_choice,course_category,course_month,original_language,status,created_at,published_at,consent_version,consent_at FROM reviews WHERE id=?').get(id);if(!row)throw new HttpError(404,'not_found');
 const evidence=ctx.db.prepare('SELECT consumed_at FROM review_private WHERE review_id=?').get(id);
 const history=ctx.db.prepare('SELECT action,reason,created_at FROM audit WHERE review_id=? ORDER BY id ASC').all(id);
 const dto={id:row.id,stars:row.stars,comment:row.comment_plaintext,display_name:row.display_name,visibility_choice:row.visibility_choice,course_category:row.course_category,course_month:row.course_month,original_language:row.original_language,status:row.status,created_at:row.created_at,published_at:row.published_at,consent:{version:row.consent_version,at:row.consent_at},verification:{label:evidence?.consumed_at?'email_confirmed':'not_confirmed',participation:false},history};
 return {...dto,version:createHash('sha256').update(JSON.stringify(dto)).digest('hex')};
}
export interface Decision {id:unknown;version:unknown;decision:unknown;reason?:unknown;key:unknown}
export function decideReview(ctx:Context,actor:Actor|null,input:Decision){
 authorize(actor);
 if(typeof input.key!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(input.key))throw new HttpError(400,'idempotency_key');
 const payload=createHash('sha256').update(JSON.stringify([input.id,input.version,input.decision,input.reason??''])).digest('hex');
 return transaction(ctx.db,()=>{
  const receipt=ctx.db.prepare('SELECT payload_hash FROM mc_decisions WHERE owner=? AND request_key=?').get(actor.sub,input.key as string);
  if(receipt){if(receipt.payload_hash!==payload)throw new HttpError(409,'idempotency_conflict');return {duplicate:true,review:reviewDetail(ctx,input.id)}}
  const current=reviewDetail(ctx,input.id);
  if(current.version!==input.version)throw new HttpError(409,'stale_version');
  if(current.status!=='pending_moderation')throw new HttpError(409,'transition');
  if(current.verification.label!=='email_confirmed' || !current.consent.version || !current.consent.at)throw new HttpError(409,'consent_or_email');
  if(!['publish','reject'].includes(String(input.decision)))throw new HttpError(400,'decision');
  const reasons=['spam','duplicate','third_party_personal_data','sensitive_personal_data','unlawful','unrelated_training'];
  if(input.decision==='reject' && !reasons.includes(String(input.reason)))throw new HttpError(400,'reason');
  const status=input.decision==='publish'?'published':'rejected';
  ctx.db.prepare("UPDATE reviews SET status=?,published_at=CASE WHEN ?='published' THEN ? ELSE published_at END WHERE id=? AND status='pending_moderation'").run(status,status,ctx.now(),String(input.id));
  ctx.db.prepare('INSERT INTO audit(review_id,actor,action,reason,created_at) VALUES (?,?,?,?,?)').run(String(input.id),actor.sub,status,status==='published'?'content_checks_passed':String(input.reason),ctx.now());
  ctx.db.prepare('INSERT INTO mc_decisions(owner,request_key,payload_hash,review_id,created_at) VALUES (?,?,?,?,?)').run(actor.sub,input.key as string,payload,String(input.id),ctx.now());
  return {duplicate:false,review:reviewDetail(ctx,input.id)};
 });
}
export function reviewQueue(ctx:Context,offset:unknown=0){
 if(!Number.isSafeInteger(offset)||Number(offset)<0)throw new HttpError(400,'offset');
 const rows=ctx.db.prepare("SELECT id FROM reviews ORDER BY CASE status WHEN 'pending_moderation' THEN 0 WHEN 'pending_email' THEN 1 WHEN 'published' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END,created_at ASC,id ASC LIMIT 51 OFFSET ?").all(Number(offset));
 return {items:rows.slice(0,50).map(r=>{const d=reviewDetail(ctx,r.id);return {id:d.id,stars:d.stars,display_name:d.display_name,status:d.status,created_at:d.created_at,course_category:d.course_category,version:d.version}}),next_offset:rows.length>50?Number(offset)+50:null};
}
