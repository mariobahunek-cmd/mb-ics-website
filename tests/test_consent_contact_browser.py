import asyncio,json,threading,functools,http.server,pathlib,traceback,os
from urllib.parse import urlsplit,parse_qs
from playwright.async_api import async_playwright
ROOT=pathlib.Path(os.environ.get('PACKAGE02_ROOT',pathlib.Path.cwd()));OUT=pathlib.Path(os.environ.get('EVIDENCE_DIR',ROOT/'work/evidence'));OUT.mkdir(parents=True,exist_ok=True);SITE=pathlib.Path(os.environ.get('SITE_DIR',ROOT/'work/candidate-site'));checks=[];net=[];shots=[];storage=[]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def serve():http.server.ThreadingHTTPServer(('127.0.0.1',8763),functools.partial(Quiet,directory=str(SITE))).serve_forever()
def check(name,value,detail=None):
 checks.append({'name':name,'pass':bool(value),'detail':detail});print(('PASS ' if value else 'FAIL ')+name,flush=True)
async def shot(page,name):
 await page.wait_for_timeout(450);await page.screenshot(path=str(OUT/(name+'.png')));shots.append(name+'.png')
def request_record(request,lang,phase):
 u=urlsplit(request.url);q=parse_qs(u.query)
 return {'language':lang,'phase':phase,'host':u.netloc,'path':u.path,'method':request.method,'type':request.resource_type,'query_keys':sorted(q),'consent_signals':{k:q[k] for k in ['gcs','gcd'] if k in q},'synthetic_campaign_present':any('synthetic' in v for vals in q.values() for v in vals)}
async def run():
 threading.Thread(target=serve,daemon=True).start()
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for lang,path in [('en','/'),('de','/de/'),('es','/es/')]:
   phase=['initial'];errors=[];c=await b.new_context(viewport={'width':1440,'height':1000});page=await c.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda req,la=lang,ph=phase:net.append(request_record(req,la,ph[0])))
   page.on('response',lambda res,la=lang,ph=phase:net.append({'language':la,'phase':ph[0],'response_host':urlsplit(res.url).netloc,'response_path':urlsplit(res.url).path,'status':res.status}))
   await page.route('https://formspree.io/**',lambda route:route.abort('blockedbyclient'))
   url='http://127.0.0.1:8763'+path+'?utm_source=package02-synthetic&gclid=synthetic-click'
   await page.goto(url);await page.wait_for_timeout(1500)
   storage.append({'lang':lang,'phase':'initial','local':await page.evaluate('({...localStorage})'),'session':await page.evaluate('({...sessionStorage})'),'cookie_names':[x['name'] for x in await c.cookies()]})
   check(lang+' no optional data initially',await page.evaluate('mbicsTracking.readTracking() === null && !localStorage.mbics_tracking && !sessionStorage.mbics_tracking'))
   check(lang+' no Google/player/preview initial',not any(x.get('host','').split(':')[0] not in ['127.0.0.1','reviews-api.mb-ics.com'] for x in net if 'host' in x and x.get('language')==lang and x.get('phase')=='initial'),[x for x in net if x.get('language')==lang and x.get('phase')=='initial' and 'host'in x])
   await shot(page,lang+'-1440-initial-consent')
   phase[0]='video-prompt';await page.locator('.video-card').first.press('Enter');await page.wait_for_timeout(450)
   check(lang+' keyboard opens prompt',await page.locator('.video-modal__consent').is_visible())
   check(lang+' prompt no iframe request',not await page.locator('#videoModalIframe').get_attribute('src'))
   check(lang+' focus on close',await page.locator('.video-modal__close').evaluate('(el)=>el===document.activeElement'))
   await page.keyboard.press('Shift+Tab');check(lang+' focus trap reverse',await page.locator('[data-video-revoke]').evaluate('(el)=>el===document.activeElement'))
   await page.keyboard.press('Tab');check(lang+' focus trap forward',await page.locator('.video-modal__close').evaluate('(el)=>el===document.activeElement'))
   await shot(page,lang+'-1440-video-prompt')
   phase[0]='video-allowed';await page.locator('.video-modal__consent-btn').click();await page.wait_for_timeout(2000)
   state=await page.evaluate('mbicsTracking.getConsent()');check(lang+' video does not grant other purposes',state=={'analytics':None,'marketing':None,'video':True},state)
   check(lang+' real YouTube requested after opt-in',any(x.get('host')=='www.youtube-nocookie.com' for x in net if x.get('language')==lang and x.get('phase')=='video-allowed'))
   check(lang+' video does not store campaign',await page.evaluate('mbicsTracking.readTracking()===null'))
   phase[0]='video-withdrawn';await page.locator('[data-video-revoke]').click()
   check(lang+' revoke stops iframe immediately',not await page.locator('#videoModalIframe').get_attribute('src'))
   await page.keyboard.press('Escape');check(lang+' Escape restores trigger focus',await page.locator('.video-card').first.evaluate('(el)=>el===document.activeElement'))
   phase[0]='rejected';await page.locator('#cookieNecessary').click();await page.reload();await page.wait_for_timeout(500)
   check(lang+' rejection survives reload',await page.evaluate('Object.values(mbicsTracking.getConsent()).every(v=>v===false)'))
   await page.locator('#cookieSettingsLink').click();await page.locator('#consent-analytics').check();await page.locator('#cookieSave').click();phase[0]='analytics-only';await page.wait_for_timeout(2500)
   check(lang+' analytics alone no campaign',await page.evaluate('mbicsTracking.getConsent().analytics && !mbicsTracking.getConsent().marketing && !sessionStorage.mbics_tracking'))
   phase[0]='marketing-allowed';await page.locator('#cookieSettingsLink').click();await page.locator('#cookieAcceptAll').click();await page.wait_for_timeout(2000)
   check(lang+' explicit marketing captures session only',await page.evaluate('!!sessionStorage.mbics_tracking && !localStorage.mbics_tracking && mbicsTracking.readTracking().gclid==="synthetic-click"'))
   check(lang+' tracking allow does not allow video',await page.evaluate('mbicsTracking.getConsent().video===false'))
   phase[0]='granted-reload';await page.reload();await page.wait_for_timeout(1500)
   storage.append({'lang':lang,'phase':'granted-reload','local':await page.evaluate('({...localStorage})'),'session':await page.evaluate('({...sessionStorage})'),'cookie_names':[x['name'] for x in await c.cookies()]})
   check(lang+' grant survives reload',await page.evaluate('mbicsTracking.getConsent().marketing && mbicsTracking.getConsent().analytics && !!sessionStorage.mbics_tracking'))
   await page.evaluate('''() => {localStorage.mbics_tracking='legacy';const i=document.createElement('input');i.type='hidden';i.name='attr_gclid';i.value='synthetic-stale';document.querySelector('#contactForm').append(i);}''')
   phase[0]='all-withdrawn';await page.locator('#cookieSettingsLink').click();await page.locator('#cookieNecessary').click();await page.wait_for_timeout(1000)
   storage.append({'lang':lang,'phase':'withdrawn','local':await page.evaluate('({...localStorage})'),'session':await page.evaluate('({...sessionStorage})'),'cookie_names':[x['name'] for x in await c.cookies()]})
   check(lang+' withdrawal removes storage and fields',await page.evaluate('!localStorage.mbics_tracking && !sessionStorage.mbics_tracking && document.querySelector("[name=attr_gclid]").value===""'))
   await page.evaluate('''() => {const i=document.querySelector('[name=attr_gclid]');i.disabled=false;i.value='synthetic-stale';}''')
   check(lang+' FormData cannot leak stale hidden field',await page.evaluate('!new FormData(document.querySelector("#contactForm")).has("attr_gclid")'))
   phase[0]='withdrawn-reload';await page.reload();await page.wait_for_timeout(1000)
   check(lang+' withdrawn reload does not load a new Google tag',await page.evaluate('!document.querySelector("script[src*=googletagmanager]") && !window.dataLayer'))
   check(lang+' withdrawal beacons contain no campaign',not any(x.get('synthetic_campaign_present') for x in net if 'google' in x.get('host','') and x.get('language')==lang and x.get('phase')=='withdrawn-reload'))
   phase[0]='cross-tab-video'
   # Cross-tab storage revocation of an already loaded player.
   await page.locator('.video-card').first.click();await page.locator('.video-modal__consent-btn').click()
   other=await c.new_page();await other.goto('http://127.0.0.1:8763'+path);await other.evaluate('mbicsTracking.setConsent({video:false})');await page.wait_for_timeout(300)
   check(lang+' cross-tab video withdrawal',not await page.locator('#videoModalIframe').get_attribute('src'));await other.close();await page.keyboard.press('Escape')
   # Form cases, all provider POSTs intercepted; never real messages.
   phase[0]='contact-tests';await page.unroute('https://formspree.io/**');mode=['http500'];posts=[]
   async def respond(route):
    req=route.request
    if req.method=='OPTIONS':await route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'});return
    posts.append({'mode':mode[0],'body_has_campaign':'synthetic-click' in (req.post_data or '')})
    if mode[0]=='network':await route.abort('failed');return
    if mode[0]=='timeout':await asyncio.sleep(16);await route.abort();return
    if mode[0]=='success':await asyncio.sleep(.5)
    status=500 if mode[0]=='http500' else 422 if mode[0]=='http422' else 200
    body={'next':'https://formspree.io/thanks'} if mode[0]=='success' else {'ok':False} if mode[0]=='notaccepted' else {'errors':[{'message':'synthetic failure'}]}
    await route.fulfill(status=status,content_type='application/json',body=json.dumps(body),headers={'Access-Control-Allow-Origin':'*'})
   await page.route('https://formspree.io/**',respond)
   await page.locator('#name').fill('Synthetic Test');await page.locator('#email').fill('test@example.invalid');await page.locator('#message').fill('Isolated synthetic contact test, no delivery.')
   for case in ['http500','http422','network','offline','notaccepted','timeout','success']:
    mode[0]=case
    if case=='offline':await c.set_offline(True)
    before=len(posts)
    await page.locator('#submitBtn').click()
    if case=='success':await page.locator('#contactForm').dispatch_event('submit')
    await page.wait_for_function('!document.querySelector("#submitBtn").disabled')
    await page.wait_for_timeout(80)
    cls=await page.locator('#formToast').get_attribute('class')
    if case=='success':
     check(lang+' server acceptance success', 'form-toast--success' in cls and await page.locator('#name').input_value()=='')
     check(lang+' duplicate in-flight suppressed',len(posts)-before==1)
     check(lang+' success hides draft',not await page.locator('#contactMailDraft').is_visible())
    else:
     check(lang+' '+case+' honest error and preserved entries','form-toast--error' in cls and await page.locator('#name').input_value()=='Synthetic Test' and await page.locator('#contactMailDraft').is_visible())
     check(lang+' '+case+' stays on page',page.url.startswith('http://127.0.0.1:8763'))
    if case=='http500':await shot(page,lang+'-1440-contact-500')
    if case=='offline':await c.set_offline(False)
   # A repeated identical accepted payload is suppressed in this page.
   await page.locator('#name').fill('Synthetic Test');await page.locator('#email').fill('test@example.invalid');await page.locator('#message').fill('Isolated synthetic contact test, no delivery.')
   before=len(posts);await page.locator('#submitBtn').click();await page.wait_for_timeout(150);check(lang+' accepted duplicate suppressed',len(posts)==before)
   check(lang+' no optional campaign in requests',all(not x['body_has_campaign'] for x in posts))
   await shot(page,lang+'-1440-server-acceptance')
   await page.goto('http://127.0.0.1:8763'+('' if lang=='en' else '/'+lang)+'/privacy.html');check(lang+' localized privacy page',await page.locator('html').get_attribute('lang')==lang)
   await page.locator('#cookieSettingsLink').click();check(lang+' legal page settings work',await page.locator('#cookieBanner').is_visible());await page.locator('#cookieNecessary').click();await shot(page,lang+'-1440-privacy')
   check(lang+' no page JS errors',not errors,errors)
   await c.close()
   # Small screen layout and actual controls.
   c=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,device_scale_factor=1);page=await c.new_page();await page.goto('http://127.0.0.1:8763'+path)
   await shot(page,lang+'-390-consent');check(lang+' mobile no page overflow',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   await page.locator('#cookieNecessary').click();await page.locator('.video-card').first.click();await shot(page,lang+'-390-video-prompt')
   check(lang+' mobile video consent usable',await page.locator('.video-modal__consent-btn').is_visible());await page.locator('.video-modal__close').click();await c.close()
  # Old values must not transfer the old video "all" into consent v2.
  for legacy in ['all','necessary','malformed']:
   c=await b.new_context();await c.add_init_script(f"localStorage.setItem('cookieConsent','{legacy}'); localStorage.setItem('mbics_tracking','legacy-data');")
   page=await c.new_page();await page.goto('http://127.0.0.1:8763/');check('legacy '+legacy+' fails closed',await page.evaluate('mbicsTracking.getConsent().marketing!==true && mbicsTracking.getConsent().analytics!==true && !localStorage.mbics_tracking'));await c.close()
  # Test tab-session boundaries and guarded conversion paths using the real helper.
  c=await b.new_context();await c.route('**/*google*/**',lambda route:route.abort());page=await c.new_page();await page.goto('http://127.0.0.1:8763/?gclid=synthetic-click')
  await page.evaluate('mbicsTracking.setConsent({analytics:false,marketing:true,video:false})')
  check('marketing only leaves analytics denied',await page.evaluate('mbicsTracking.getConsent().analytics===false && !!mbicsTracking.readTracking() && window[\"ga-disable-G-73EMQX5W68\"]===true'))
  other=await c.new_page();await other.goto('http://127.0.0.1:8763/')
  check('fresh tab does not inherit campaign session',await other.evaluate('mbicsTracking.readTracking()===null'))
  # Observe queue only: neutralize the tag library before invoking synthetic conversions.
  await page.route('https://www.googletagmanager.com/**',lambda route:route.abort())
  outcomes=await page.evaluate('''async () => { const a=mbicsTracking.fireLeadConversion({label:'synthetic-test'});const b=mbicsTracking.fireLeadConversion({label:'synthetic-test'});return await Promise.all([a,b]); }''')
  check('conversion duplicate suppressed',outcomes==[True,False],outcomes)
  outcome=await page.evaluate('''async () => {const p=mbicsTracking.fireLeadConversion({label:'synthetic-race'});mbicsTracking.setConsent({marketing:false});return await p;}''')
  check('withdrawal cancels pending conversion',outcome is False)
  check('denied conversion is ignored',await page.evaluate('mbicsTracking.fireLeadConversion({label: \"synthetic-denied\"})') is False)
  await c.close()
  c=await b.new_context();await c.add_init_script("Storage.prototype.getItem=function(){throw new Error('disabled')};Storage.prototype.setItem=function(){throw new Error('disabled')};Storage.prototype.removeItem=function(){throw new Error('disabled')};")
  page=await c.new_page();await page.goto('http://127.0.0.1:8763/');await page.locator('#cookieNecessary').click()
  check('disabled storage fails closed without breaking UI',await page.evaluate('mbicsTracking.getConsent().marketing===false && mbicsTracking.readTracking()===null'));await c.close()
  # Page scripts must remain usable where no nav/video/contact exists.
  for path in ['/404.html','/impressum.html','/blog/en/','/blog/de/','/sap-mm-crashcourse/','/trainer-profile/','/sap-mm-corporate-training/']:
   c=await b.new_context();page=await c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));await page.goto('http://127.0.0.1:8763'+path);await page.wait_for_timeout(200)
   check('shared entry '+path,await page.evaluate('!!window.mbicsTracking && mbicsTracking.getConsent().marketing!==true') and not errors,errors);await c.close()
  await b.close()
async def main():
 try:await run()
 except Exception:checks.append({'name':'Harness completed','pass':False,'detail':traceback.format_exc()});traceback.print_exc()
 finally:
  (OUT/'browser-checks.json').write_text(json.dumps({'checks':checks,'screenshots':shots},indent=2));(OUT/'network-observations.json').write_text(json.dumps(net,indent=2));(OUT/'storage-observations.json').write_text(json.dumps(storage,indent=2))
  print('RESULT',sum(x['pass'] for x in checks),'/',len(checks),flush=True)
  if not all(x['pass'] for x in checks):raise SystemExit(1)
asyncio.run(main())
