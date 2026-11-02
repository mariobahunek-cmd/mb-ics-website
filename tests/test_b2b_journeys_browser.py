"""Package 04 acceptance: real local UI, all third parties intercepted, synthetic inputs only.
SITE_DIR and EVIDENCE_DIR select a built candidate and a private evidence directory.
"""
import asyncio,json,os,pathlib,threading,functools,http.server,traceback
from urllib.parse import urlsplit,parse_qs
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];SITE=pathlib.Path(os.environ['SITE_DIR']);OUT=pathlib.Path(os.environ['EVIDENCE_DIR']);OUT.mkdir(parents=True,exist_ok=True)
BASE='http://127.0.0.1:8788';checks=[];requests=[];errors=[]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def check(name,ok,detail=None):
 checks.append({'name':name,'pass':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
async def context(browser,**kwargs):
 c=await browser.new_context(**kwargs)
 await c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort('blockedbyclient'))
 return c
async def page_for(c,path):
 p=await c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append({'host':urlsplit(r.url).netloc,'path':urlsplit(r.url).path,'method':r.method}))
 await p.goto(BASE+path);await p.evaluate('document.fonts.ready');return p
async def deny(p):
 if await p.locator('#cookieNecessary').is_visible():await p.locator('#cookieNecessary').click()
async def main():
 threading.Thread(target=lambda:http.server.ThreadingHTTPServer(('127.0.0.1',8788),functools.partial(Quiet,directory=str(SITE))).serve_forever(),daemon=True).start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  for lang in ['en','de','es']:
   home='/' if lang=='en' else '/'+lang+'/'
   for width in [1440,390]:
    c=await context(b,viewport={'width':width,'height':900},locale=lang,reduced_motion='reduce');p=await page_for(c,home);await deny(p)
    check(f'{lang}/{width} empty toast stays hidden',not await p.locator('#formToast').is_visible())
    check(f'{lang}/{width} three audience choices',await p.locator('#paths .path-card').count()==3)
    for audience,purpose in [('company','corporate'),('education','education'),('partner','partner')]:
     await p.goto(BASE+home);await p.locator(f'[data-audience={audience}]').click();await p.wait_for_load_state('domcontentloaded')
     check(f'{lang}/{width}/{audience} localized destination',urlsplit(p.url).path==home+'sap-mm-corporate-training/' and urlsplit(p.url).fragment==audience)
     await p.locator(f'#{audience} a').click();await p.wait_for_function('!!window.mbicsAudience')
     check(f'{lang}/{width}/{audience} inquiry purpose',await p.locator('#interest').input_value()==purpose and urlsplit(p.url).path==home)
     await p.locator('#interest').select_option('other');await p.evaluate("mbicsAudience.prefill({inquiry:'corporate'})")
     check(f'{lang}/{width}/{audience} editable choice preserved',await p.locator('#interest').input_value()=='other')
    await p.goto(BASE+home);await p.locator('[data-audience=education]').click();await p.wait_for_function('!!window.mbicsAudience');await p.locator('#process a').click();await p.wait_for_function('!!window.mbicsAudience')
    check(f'{lang}/{width} profile continuity',urlsplit(p.url).path==home+'trainer-profile/' and parse_qs(urlsplit(p.url).query).get('inquiry')==['education'])
    async with p.expect_download() as d:await p.locator('.buyer-hero a[download]').click()
    download=await d.value;dp=await download.path();check(f'{lang}/{width} actual PDF download',pathlib.Path(dp).read_bytes().startswith(b'%PDF') and ('trainerprofil' in download.suggested_filename)==(lang=='de'))
    if lang=='es':check('ES PDF explicitly English','inglés' in await p.locator('.buyer-hero a[download]').inner_text())
    await p.locator('.buyer-hero .btn--primary').click();await p.wait_for_function('!!window.mbicsAudience');check(f'{lang}/{width} profile to inquiry context',await p.locator('#interest').input_value()=='education')
    check(f'{lang}/{width} no horizontal overflow',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    await p.locator('.paths__participants a').click();await p.wait_for_function('document.querySelector("#training").getBoundingClientRect().top < 150 && document.querySelector("#training").getBoundingClientRect().top >= 0');check(f'{lang}/{width} participant path',await p.locator('#training').is_visible())
    check(f'{lang}/{width} Academy/beta distinct',await p.locator('a[data-academy-link]').first.get_attribute('href')!=await p.locator('a[href="https://berater.mb-ics.com/"]').get_attribute('href'))
    if lang=='es':check('ES Academy English labelled','inglés' in (await p.locator('a[data-academy-link]').first.inner_text()).lower())
    await c.close()
   # New fields and editable context, with every provider result intercepted.
   c=await context(b,locale=lang);p=await page_for(c,home+'?inquiry=partner&topic=pricing#contact');await deny(p)
   check(lang+' allowlisted context',await p.locator('#interest').input_value()=='partner' and bool(await p.locator('#topic').input_value()))
   await p.locator('#topic').fill('Synthetic MM & FI – Übung');await p.evaluate("mbicsAudience.prefill({inquiry:'corporate',topic:'procurement'})")
   check(lang+' edited topic preserved',await p.locator('#topic').input_value()=='Synthetic MM & FI – Übung')
   check(lang+' only core fields required',await p.locator('#contactForm [required]').evaluate_all('(xs)=>xs.map(x=>x.name).sort()')==['email','message','name'])
   fields={'name':'Synthetic Test','email':'test@example.invalid','company':'Synthetic GmbH','message':'Synthetic training request; no real delivery.','topic':'Synthetic MM & FI – Übung','period':'2027 – nach Absprache','group':'12, gemischte Erfahrung'}
   for key,value in fields.items():await p.locator('#'+key).fill(value)
   await p.locator('#teachingLanguage').select_option('de');await p.locator('#format').select_option('online')
   mode=['http500'];posts=[]
   async def respond(route):
    if route.request.method=='OPTIONS':await route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'});return
    posts.append({'case':mode[0],'body':route.request.post_data or ''})
    if mode[0] in ['network','offline']:await route.abort('failed');return
    if mode[0]=='timeout':await asyncio.sleep(16);await route.abort();return
    if mode[0]=='success':await asyncio.sleep(.2)
    status=500 if mode[0]=='http500' else 422 if mode[0]=='http422' else 200
    body='not json' if mode[0]=='invalidjson' else json.dumps({'next':'https://formspree.io/thanks'} if mode[0]=='success' else {'ok':False})
    await route.fulfill(status=status,content_type='application/json',body=body,headers={'Access-Control-Allow-Origin':'*'})
   await p.route('https://formspree.io/**',respond)
   for case in ['http500','http422','network','offline','unconfirmed200','invalidjson','timeout','success']:
    mode[0]=case;before=len(posts)
    if case=='offline':await c.set_offline(True)
    await p.locator('#submitBtn').click()
    if case=='success':await p.locator('#contactForm').dispatch_event('submit')
    await p.wait_for_function('!document.querySelector("#submitBtn").disabled');await p.wait_for_timeout(50)
    if case=='success':check(lang+' new payload accepted once',len(posts)-before==1 and await p.locator('#name').input_value()=='')
    else:
     retained=all([await p.locator('#'+k).input_value()==v for k,v in fields.items()])
     check(lang+' '+case+' preserves all inputs',retained and 'form-toast--error' in await p.locator('#formToast').get_attribute('class'))
    if case=='http500':
     check(lang+' error toast visible',await p.locator('#formToast').is_visible())
     href=await p.locator('#contactMailDraft').evaluate('(el)=>{el.addEventListener("click",e=>e.preventDefault(),{once:true});el.click();return el.href;}');body=parse_qs(urlsplit(href).query)['body'][0]
     check(lang+' voluntary draft includes all new values',all(v in body for v in fields.values()) and 'mailto:' in href and urlsplit(p.url).netloc=='127.0.0.1:8788')
     await p.screenshot(path=str(OUT/(lang+'-new-fields-error.png')))
    if case=='offline':await c.set_offline(False)
   check(lang+' no campaign/personal data sent to analytics',not any('attr_' in x['body'] for x in posts))
   check(lang+' optional fields in actual payload',all(('name="'+x+'"') in posts[0]['body'] for x in ['company','topic','period','group','teaching_language','format']))
   # New successful request with optional values blank is allowed.
   await p.locator('#name').fill('Synthetic blank options');await p.locator('#email').fill('test@example.invalid');await p.locator('#message').fill('Synthetic blank optional details.');before=len(posts);await p.locator('#submitBtn').click();await p.wait_for_function('!document.querySelector("#submitBtn").disabled')
   check(lang+' optional values can remain blank',len(posts)==before+1 and await p.locator('#name').input_value()=='')
   await p.goto(BASE+home+'?inquiry=%3Cscript%3E&topic='+('x'*2048));check(lang+' unsafe context ignored',await p.locator('#interest').input_value()=='' and await p.locator('#topic').input_value()=='' and not await p.locator('#contactOptions').evaluate('(e)=>e.open'))
   await c.close()
   # Language-specific first video, consent, excerpt/full URL and editable inquiry.
   c=await context(b,locale=lang);p=await page_for(c,home);await deny(p)
   card=p.locator('.video-card').first;expected={'en':'a2VQtHrOqzI','de':'crnMqP0DqZQ','es':'RAvV6HQlMq8'}[lang]
   check(lang+' language-matching first video',await card.get_attribute('data-video-id')==expected)
   await card.press('Enter');check(lang+' preview stays local',not await p.locator('#videoModalIframe').get_attribute('src'))
   await p.locator('.video-modal__consent-btn').click();src=await p.locator('#videoModalIframe').get_attribute('src');q=parse_qs(urlsplit(src).query)
   check(lang+' honest excerpt bounds',q.get('start')==['26'] and q.get('end')==['207'] if lang=='de' else 'start' not in q and 'end' not in q)
   await p.keyboard.press('Escape');await p.locator('.video-full').click();src=await p.locator('#videoModalIframe').get_attribute('src');check(lang+' full DE demo still available','start=' not in src and 'end=' not in src)
   await p.locator('[data-video-inquiry]').click();check(lang+' video context prefill',await p.locator('#interest').input_value()=='corporate' and bool(await p.locator('#topic').input_value()))
   check(lang+' player stopped after inquiry',not await p.locator('#videoModalIframe').get_attribute('src'))
   await c.close()
  # Root and direct URL authority across browser and saved language preferences.
  for locale in ['en-US','de-DE','es-ES','fr-FR']:
   for path in ['/','/de/','/es/']:
    c=await context(b,locale=locale);p=await page_for(c,path);check(locale+' direct '+path,urlsplit(p.url).path==path)
    expected=path=='/' and locale[:2] in ['de','es'];check(locale+' optional hint '+path,await p.locator('#languageSuggestion').is_visible()==expected)
    check(locale+' no implicit language storage '+path,await p.evaluate('localStorage.getItem("mbics_language_v1")') is None);await c.close()
  c=await context(b,locale='en-US');p=await page_for(c,'/');await deny(p)
  for target in ['de','es','en']:
   await p.locator('a.lang-btn').filter(has_text=target.upper()).first.press('Enter');await p.wait_for_load_state('domcontentloaded');check(target+' explicit choice saved',await p.evaluate('localStorage.mbics_language_v1')==target)
   await p.reload();check(target+' preference survives reload',await p.evaluate('localStorage.mbics_language_v1')==target)
  await p.goto(BASE+'/de/');check('saved EN cannot override direct DE',await p.locator('html').get_attribute('lang')=='de')
  await p.go_back();await p.go_forward();check('back/forward no redirect loop',urlsplit(p.url).path=='/de/')
  await p.locator('#clearLanguagePreference').click();check('preference can be cleared',await p.evaluate('localStorage.getItem("mbics_language_v1")===null'))
  check('language choice never grants optional consent',await p.evaluate('Object.values(mbicsTracking.getConsent()).every(v=>v===false)&&!localStorage.mbics_tracking&&!sessionStorage.mbics_tracking'))
  await c.close()
  for mode in ['malformed','disabled']:
   c=await context(b,locale='de-DE');await c.add_init_script("localStorage.setItem('mbics_language_v1','<invalid>')" if mode=='malformed' else "Storage.prototype.getItem=Storage.prototype.setItem=Storage.prototype.removeItem=function(){throw Error('disabled')}")
   p=await page_for(c,'/');await deny(p);await p.locator('#suggestedLanguageLink').press('Enter');check(mode+' storage allows language navigation',urlsplit(p.url).path=='/de/');await c.close()
  for path in ['/','/de/','/de/sap-mm-corporate-training/','/de/trainer-profile/']:
   c=await context(b,java_script_enabled=False);p=await page_for(c,path);check('no JS core content '+path,await p.locator('h1').is_visible() and await p.locator('a[href*="#contact"]').count()>0 and await p.locator('a.lang-btn').count()>=3);await c.close()
  for width in [320,390,768,1440]:
   c=await context(b,viewport={'width':width,'height':900},reduced_motion='reduce');p=await page_for(c,'/de/');await deny(p);await p.add_style_tag(content='html {font-size: 125% !important}')
   check(str(width)+' enlarged text no page overflow',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   if width<1180:
    await p.locator('.nav__burger').click();check(str(width)+' mobile menu expands',await p.locator('.nav__burger').get_attribute('aria-expanded')=='true');await p.keyboard.press('Escape');check(str(width)+' mobile menu Escape',await p.locator('.nav__burger').get_attribute('aria-expanded')=='false')
   await c.close()
  check('all browser pages without uncaught JS errors',not errors,errors)
  check('external POST destinations only intercepted provider fixtures',all(x['host']=='formspree.io' for x in requests if x['method']=='POST' and x['host']!='127.0.0.1:8788'))
  await b.close()
async def run():
 try:await main()
 except Exception:check('harness completion',False,traceback.format_exc());traceback.print_exc()
 finally:
  (OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors,'network_policy':'All non-local traffic aborted; explicit Formspree fixtures fulfilled locally; no mail, conversion, review or newsletter sent.','requests':requests},ensure_ascii=False,indent=2));print('RESULT',sum(x['pass'] for x in checks),'/',len(checks),flush=True)
 if not all(x['pass'] for x in checks):raise SystemExit(1)
asyncio.run(run())
