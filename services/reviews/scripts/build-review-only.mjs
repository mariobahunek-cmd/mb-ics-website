// Build-only, explicit review-only candidate. NEVER deletes/rewrites owner source,
// existing deployment, public history or CDN. No provider/network operations.
import {readFileSync,writeFileSync,mkdirSync,existsSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
const allowed=['reviews/index.html','de/bewertungen/index.html','es/opiniones/index.html','review/index.html','reviews/methodology/index.html','privacy.html','impressum.html','reviews.css','reviews.js','reviews-i18n.js','reviews-handoff.js','trust-reviews.js','favicon.svg','style.css',...['DMSans-Regular-LatinExt','DMSans-Regular-Latin','DMSans-Italic-LatinExt','DMSans-Italic-Latin','PlayfairDisplay-Regular-LatinExt','PlayfairDisplay-Regular-Latin'].map(name=>'fonts/'+name+'.woff2')];
const aliases={'index.html':'reviews/index.html','de/index.html':'de/bewertungen/index.html','es/index.html':'es/opiniones/index.html'};
const hash=data=>createHash('sha256').update(data).digest('hex');
export function validateDependencies(payload) {
 const origin='https://review-candidate.invalid',counts={html_references:0,fragments:0,css_references:0,module_references:0,missing:0};
 const docs=new Map();
 const doc=p=>{if(!docs.has(p))docs.set(p,new JSDOM(payload[p].toString('utf8')));return docs.get(p).window.document;};
 function check(ref,page,kind) {
  if(!ref || /^(data:|mailto:|tel:)/i.test(ref))return;
  const url=new URL(ref,origin+'/'+page);
  if(!['http:','https:'].includes(url.protocol))throw new Error('Unsafe local dependency scheme');
  if(url.origin!==origin && url.hostname!=='mb-ics.com')return;
  let target=decodeURIComponent(url.pathname).replace(/^\//,'');if(!target||target.endsWith('/'))target+='index.html';
  if(!Object.hasOwn(payload,target))throw new Error('Missing local dependency: '+target);
  counts[kind]++;
  if(url.hash && target.endsWith('.html')) {
   const id=decodeURIComponent(url.hash.slice(1));if(id && !doc(target).getElementById(id) && !Array.from(doc(target).getElementsByName(id)).length)throw new Error('Missing local fragment: '+target);
   counts.fragments++;
  }
 }
 try {
  for(const [p,data] of Object.entries(payload)) {
   const body=data.toString('utf8');
   if(p.endsWith('.html')) {
    for(const el of doc(p).querySelectorAll('[href],[src],[action],[poster]'))for(const attr of ['href','src','action','poster'])if(el.hasAttribute(attr))check(el.getAttribute(attr),p,'html_references');
    for(const el of doc(p).querySelectorAll('[srcset]'))for(const item of el.getAttribute('srcset').split(','))check(item.trim().split(/\s+/)[0],p,'html_references');
    for(const el of doc(p).querySelectorAll('style,[style]'))for(const match of (el.tagName==='STYLE'?el.textContent:el.getAttribute('style')).matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g))check(match[1]??match[2]??match[3],p,'css_references');
   } else if(p.endsWith('.css'))for(const match of body.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)|@import\s+['"]([^'"]+)['"]/g))check(match[1]??match[2]??match[3]??match[4],p,'css_references');
   else if(p.endsWith('.js'))for(const match of body.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?\sfrom\s*)?['"]([^'"]+)['"]/g))check(match[1],p,'module_references');
  }
  return counts;
 } finally {for(const dom of docs.values())dom.window.close();}
}
export function buildReviewOnly(buildPath,outputPath,archiveRecords) {
 const build=realpathSync(buildPath),output=resolve(outputPath);
 if(existsSync(output))throw new Error('Candidate output exists; refusing overwrite');
 if(!relative(build,output).startsWith('..'))throw new Error('Candidate must be outside input build');
 const forbidden=[...new Set(archiveRecords.flatMap(record=>[record.name,...Object.values(record.quote ?? {})]).filter(v=>typeof v==='string'&&v.trim().length>=3&&!/^(anonymous|anonym|anónimo)$/i.test(v.trim())))];
 const payload={};
 for(const p of allowed){const source=join(build,p);if(!lstatSync(source).isFile()||lstatSync(source).isSymbolicLink())throw new Error('Build input must be regular allowlisted files');payload[p]=readFileSync(source);}
 if(existsSync(join(build,'styles.css')))payload['styles.css']=readFileSync(join(build,'styles.css'));
 const removedAnalytics={};
 for(const p of ['privacy.html','impressum.html']) {
  const dom=new JSDOM(payload[p].toString('utf8'));let removed=0;
  try {
   const doc=dom.window.document,legalText=doc.body.textContent;
   for(const el of doc.querySelectorAll('script')) {
    const src=el.getAttribute('src')??'';
    if(/(?:^|\/)tracking\.js(?:[?#]|$)/.test(src)||/^https:\/\/www\.googletagmanager\.com\/gtag\//.test(src)||(!src&&/\bgtag\s*\(|window\.dataLayer/.test(el.textContent))){el.remove();removed++;}
   }
   for(const el of doc.querySelectorAll('link[rel="dns-prefetch"],link[rel="preconnect"]'))if((el.getAttribute('href')??'').includes('googletagmanager.com'))el.remove();
   if(doc.body.textContent!==legalText)throw new Error('Derived legal text must remain unchanged');
   payload[p]=Buffer.from(dom.serialize());removedAnalytics[p]=removed;
  } finally {dom.window.close();}
 }
 for(const [alias,source] of Object.entries(aliases))payload[alias]=payload[source];
 for(const [p,data] of Object.entries(payload)){
  const body=data.toString('utf8');const dom=new JSDOM(body);let visible;
  try{visible=dom.window.document.documentElement.textContent;}finally{dom.window.close();}
  // Decode HTML entities for JS/text too, and conservatively scan full bytes.
  if(forbidden.some(value=>body.includes(value)||visible.includes(value)))throw new Error('Candidate contains retained archive content; values suppressed');
  if(p.endsWith('index.html')&&Object.keys(aliases).includes(p)&&(!body.includes('data-review-page="list"')||!body.includes('id="historical-list"')))
   throw new Error('Root routes must use canonical review list, never inherited brochure archive');
 }
 const dependencyClosure=validateDependencies(payload);
 const manifest={kind:'isolated-review-only-candidate-not-whole-brochure-release',reviews_enabled_candidate:true,
  analytics_added:false,derived_legal_analytics_removed:removedAnalytics,dependency_closure:dependencyClosure,
  production_flag_changed:false,source_archive_rewritten:false,cdn_or_prior_history_erased:false,
  omitted_archive_quotes_and_history_by_allowlist:true,retained_archive_value_matches:0,archive_records_checked:archiveRecords.length,
  file_count:Object.keys(payload).length,files:Object.fromEntries(Object.entries(payload).map(([p,data])=>[p,hash(data)]))};
 mkdirSync(output,{mode:0o700});
 for(const [p,data] of Object.entries(payload)){const dest=join(output,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data,{flag:'wx',mode:0o600});}
 writeFileSync(join(output,'REVIEW-ONLY-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [built,output,archiveSource]=process.argv.slice(2);if(!built||!output||!archiveSource)throw new Error('Usage: build-review-only.mjs BUILT_SITE NEW_PRIVATE_OUTPUT OWNER_SOURCE_testimonials.js');
  const body=readFileSync(archiveSource,'utf8'),begin=body.indexOf('const testimonialData = ['),end=body.indexOf('const BATCH_SIZE');
  if(begin<0||end<=begin)throw new Error('Original owner archive literal boundary absent');
  // Only the known local source literal; never remote data or renderer execution.
  const records=runInNewContext(body.slice(begin,end)+';testimonialData',Object.create(null),{timeout:1000});
  const manifest=buildReviewOnly(built,output,records);
  console.log(JSON.stringify({kind:manifest.kind,file_count:manifest.file_count,archive_records_checked:records.length,retained_archive_value_matches:0,source_archive_sha256:hash(readFileSync(archiveSource)),output:resolve(output),uploaded:false}));
 }catch(e){console.error(e instanceof Error?e.message:'Build candidate failed');process.exitCode=1;}
}
