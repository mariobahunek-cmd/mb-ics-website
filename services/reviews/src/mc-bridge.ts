import {reviewDetail,reviewQueue,decideReview} from './mc-moderation.ts';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {HttpError} from './schema.ts';import type {Context} from './context.ts';import type {Actor} from './admin.ts';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');const random=()=>randomBytes(32).toString('base64url');
export interface MCHandoff {binding:string;challenge:string;state:string;expires:number}
export interface MCOptions {origin:string;mcOrigin:string;secret:string;owner:string;now?:()=>number;isActive:(sub:string,session:string)=>boolean}
export function mcConfiguration(env:NodeJS.ProcessEnv,origin:string){
 if(env.REVIEWS_MC_ENABLED!=='true')return undefined;
 const mcOrigin=env.REVIEWS_MC_ORIGIN!,secret=env.REVIEWS_MC_CHANNEL!,owner=env.REVIEWS_MC_OWNER_SUBJECT!;
 if(!mcOrigin || new URL(mcOrigin).origin!==mcOrigin || !mcOrigin.startsWith('https://') || !secret || secret.length<43 || !owner || !(env.OIDC_SUBJECTS||'').split(',').includes(owner) || [env.OIDC_CLIENT_SECRET,env.REVIEWS_KEY,env.HERMES_READONLY_TOKEN].includes(secret))throw Error('Invalid Reviews-specific MC binding');
 return {origin,mcOrigin,secret,owner};
}
export function createMCBridge(ctx:Context,options:MCOptions){
 for(const value of [options.origin,options.mcOrigin])if(new URL(value).origin!==value || !value.startsWith('https://'))throw Error('Exact HTTPS Reviews/MC origins required');
 if(options.secret.length<43 || !options.owner)throw Error('Dedicated Reviews channel and exact owner required');
 const now=options.now||(()=>Math.floor(Date.now()/1000));
 const tickets=new Map<string,MCHandoff>();
 type Authority={actor:Actor;session:string;expires:number};
 const codes=new Map<string,MCHandoff & Authority>();const grants=new Map<string,MCHandoff & Authority>();
 function prune(){for(const map of [tickets,codes,grants])for(const [k,v] of map)if(v.expires<=now())map.delete(k)}
 function take<T>(map:Map<string,T>,key:string){const value=map.get(hash(key));map.delete(hash(key));return value}
 return {
  begin(ticket:string){prune();const tx=take(tickets,ticket);if(!tx)throw new HttpError(401,'handoff');return tx},
  complete(tx:MCHandoff,actor:Actor,expires:number,session:string){prune();if(actor.sub!==options.owner || tx.expires<=now() || expires<=now() || !options.isActive(actor.sub,session))throw new HttpError(401,'owner');if(codes.size>=1000)throw new HttpError(503,'capacity');const code=random();codes.set(hash(code),{...tx,actor,session,expires:Math.min(expires,tx.expires)});const target=new URL(options.mcOrigin+'/api/reviews/callback');target.searchParams.set('code',code);target.searchParams.set('state',tx.state);return target.href},
  async handle(req:Request):Promise<Response>{
   const json=(b:unknown,status=200)=>Response.json(b,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
   try{prune();const url=new URL(req.url);if(url.origin!==options.origin || req.method!=='POST' || req.headers.has('origin') || req.headers.has('sec-fetch-site'))throw new HttpError(403,'origin');
    const supplied=req.headers.get('x-reviews-channel')||'';if(supplied.length!==options.secret.length || !timingSafeEqual(Buffer.from(supplied),Buffer.from(options.secret)))throw new HttpError(401,'channel');
    if(req.headers.get('content-type')!=='application/json')throw new HttpError(415,'content_type');const raw=await req.text();if(Buffer.byteLength(raw)>16384)throw new HttpError(413,'request_size');const b=JSON.parse(raw);if(!b || typeof b!=='object' || Array.isArray(b))throw new HttpError(400,'body');
    if(url.pathname==='/v1/mc/start'){
     if(!/^[a-f0-9]{64}$/.test(b.binding)||!/^[a-f0-9]{64}$/.test(b.challenge)||!/^[A-Za-z0-9_-]{43}$/.test(b.state))throw new HttpError(400,'binding');if(tickets.size>=1000)throw new HttpError(503,'capacity');const ticket=random();tickets.set(hash(ticket),{binding:b.binding,challenge:b.challenge,state:b.state,expires:now()+300});return json({loginUrl:options.origin+'/v1/admin/mc-login?ticket='+ticket});
    }
    if(url.pathname==='/v1/mc/exchange'){
     if(typeof b.code!=='string')throw new HttpError(401,'handoff');const code=take(codes,b.code);if(!code || b.binding!==code.binding || typeof b.verifier!=='string' || hash(b.verifier)!==code.challenge || code.actor.sub!==options.owner || !options.isActive(code.actor.sub,code.session))throw new HttpError(401,'handoff');if(grants.size>=1000)throw new HttpError(503,'capacity');const grant=random();grants.set(hash(grant),code);return json({grant,expires:code.expires});
    }
    const grant=typeof b.grant==='string'?grants.get(hash(b.grant)):null;
    if(!grant || b.binding!==grant.binding || grant.actor.sub!==options.owner || !options.isActive(grant.actor.sub,grant.session))throw new HttpError(401,'step_up');
    if(url.pathname==='/v1/mc/list')return json(reviewQueue(ctx,b.offset??0));
    if(url.pathname==='/v1/mc/detail')return json(reviewDetail(ctx,b.id));
    if(url.pathname==='/v1/mc/decide')return json(decideReview(ctx,grant.actor,b));
    if(url.pathname==='/v1/mc/logout'){grants.delete(hash(b.grant));return json({authenticated:false})}
    throw new HttpError(404,'not_found');
   }catch(e){return json({error:e instanceof HttpError?e.message:'reviews_unavailable'},e instanceof HttpError?e.status:503)}
  }
 }
}
