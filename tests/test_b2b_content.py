"""Rendered routes, SEO, factual-source parity and preserved contracts for package 04."""
from pathlib import Path
import hashlib,json,os,re,subprocess
from urllib.parse import urlsplit,unquote
from bs4 import BeautifulSoup
R=Path(__file__).resolve().parents[1];S=Path(os.environ['SITE_DIR']);O=Path(os.environ['EVIDENCE_DIR']);O.mkdir(parents=True,exist_ok=True);checks=[]
BASE='1407dd04bf2aa062538c5ce955a9de6bc5b4039c'
def check(name,ok,detail=None):checks.append({'name':name,'pass':bool(ok),'detail':detail})
def norm(s):return ' '.join(s.split())
for lang in ['en','de','es']:
 prefix='' if lang=='en' else lang+'/'
 for slug in ['','sap-mm-corporate-training/','trainer-profile/']:
  path=prefix+slug;f=S/path/'index.html';s=BeautifulSoup(f.read_text(),'html.parser');label=lang+'/'+(slug or 'home')
  check(label+' canonical',s.select_one('link[rel=canonical]')['href']=='https://mb-ics.com/'+path)
  alternates={x['hreflang']:x['href'] for x in s.select('link[hreflang]')}
  check(label+' reciprocal hreflangs',all(alternates.get(l)=='https://mb-ics.com/'+('' if l=='en' else l+'/')+slug for l in ['en','de','es']) and alternates.get('x-default')=='https://mb-ics.com/'+slug)
  check(label+' document language',s.html['lang']==lang)
  check(label+' one main heading',len(s.select('h1'))==1)
  bad=[]
  for x in s.select('[href],[src]'):
   raw=x.get('href') or x.get('src');u=urlsplit(raw)
   if u.scheme or u.netloc or not u.path:continue
   dest=(S/unquote(u.path).lstrip('/')) if u.path.startswith('/') else f.parent/unquote(u.path)
   if dest.is_dir():dest=dest/'index.html'
   if not dest.exists():bad.append(raw)
   elif u.fragment and dest.suffix=='.html' and not BeautifulSoup(dest.read_text(),'html.parser').find(id=unquote(u.fragment)):bad.append(raw+' [missing anchor]')
  check(label+' local assets and link targets',not bad,bad)
  schemas=[]
  for x in s.select('script[type="application/ld+json"]'):schemas.append(json.loads(x.string or x.get_text()))
  faq=[x for x in schemas if x.get('@type')=='FAQPage']
  if slug!='trainer-profile/':
   visible=[(norm(x.select_one('.faq__question').find('span').get_text()),norm(x.select_one('.faq__answer').get_text())) for x in s.select('.faq__item')]
   pairs=[(norm(x['name']),norm(x['acceptedAnswer']['text'])) for x in faq[0]['mainEntity']] if len(faq)==1 else []
   check(label+' visible FAQ matches schema',visible==pairs and bool(pairs))
  claims=' '.join([s.title.get_text(),s.select_one('meta[name=description]')['content'],s.select_one('h1').get_text(),str(schemas)])
  check(label+' no unsupported headline/schema claims',not re.search(r'SAP[- ]certified (instructor|trainer)|SAP[- ]zertifizierter Trainer|worldwide|weltweit|499|8.seats|24.hours|3.day|1[–-]5.day',claims,re.I))
  if not slug:
   check(label+' exactly three buyer paths',len(s.select('#paths .path-card'))==3)
   check(label+' no metric counters',not s.select('#metrics [data-target],#metrics .metric-card__bar'))
   check(label+' no fixed crash-course claims',not re.search(r'3-DAY|3.Tage.Intensiv|3.Day.Intensive|Intensivo de 3|\$499',s.get_text(),re.I))
   check(label+' optional field names unique',all(len(s.select('#contactForm [name="'+x+'"]'))==1 for x in ['company','topic','period','group','teaching_language','format']))
   check(label+' native language first video',s.select_one('.video-card__lang-badge').get_text().lower()==lang)
  else:
   check(label+' sitemap entry','https://mb-ics.com/'+path in (S/'sitemap.xml').read_text())
source=json.loads((R/'_data/public_facts.json').read_text());localized=json.loads((R/'_data/public_facts_localized.json').read_text())
for lang in ['de','es']:
 f=localized[lang]
 for base,row in zip(source['feedback']['items'],f['feedback']['items']):
  check(lang+' feedback numeric source '+str(row['id']),all(base[k]==row[k] for k in ['id','counts','n','weighted_sum']))
  if len(row['counts'])==6:check(lang+' recalculated grade '+str(row['id']),f"{sum((i+1)*n for i,n in enumerate(row['counts']))/row['n']:.2f}"==row['result'].replace(',','.'))
protected=['tracking.js','_data/public_facts.json','trainer-profile/mario-bahunek-sap-trainer-onepager.pdf','assets/original/comcave-provided-20260625.png','review/index.html','reviews.js','reviews-i18n.js','course-options.js','participant-reviews.js','reviews/index.html','reviews/methodology/index.html','review-archive.js','testimonials.js']
hashes=[]
for path in protected:
 old=subprocess.check_output(['git','show',BASE+':'+path],cwd=R);new=(R/path).read_bytes();check('preserved '+path,old==new);hashes.append({'path':path,'base_sha256':hashlib.sha256(old).hexdigest(),'candidate_sha256':hashlib.sha256(new).hexdigest()})
for lang in ['en','de','es']:
 f=S/('' if lang=='en' else lang)/'privacy.html';check(lang+' language storage documented','mbics_language_v1' in f.read_text())
for path in ['audience.js','main.js','style.css','crashcourse-form.js','tracking.js']:check('built bytes match source '+path,(R/path).read_bytes()==(S/path).read_bytes())
check('editorial generator not published',not (S/'_editorial').exists());check('tests not published',not (S/'tests').exists())
(O/'content-checks.json').write_text(json.dumps({'checks':checks,'protected_hashes':hashes},ensure_ascii=False,indent=2));print(json.dumps([x for x in checks if not x['pass']],ensure_ascii=False,indent=2));print('RESULT',sum(x['pass'] for x in checks),'/',len(checks));assert all(x['pass'] for x in checks)
