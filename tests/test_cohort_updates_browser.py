"""Isolated cohort-update form regression; no request reaches Formspree."""
import asyncio,functools,http.server,json,os,pathlib,threading,traceback
from playwright.async_api import async_playwright
SITE=pathlib.Path(os.environ['SITE_DIR']);OUT=pathlib.Path(os.environ['EVIDENCE_DIR']);OUT.mkdir(parents=True,exist_ok=True);BASE='http://127.0.0.1:8791';checks=[]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def check(name,value):checks.append({'name':name,'pass':bool(value)});print(name,value,flush=True)
async def main():
 threading.Thread(target=lambda:http.server.ThreadingHTTPServer(('127.0.0.1',8791),functools.partial(Quiet,directory=str(SITE))).serve_forever(),daemon=True).start()
 async with async_playwright() as p:
  b=await p.chromium.launch();c=await b.new_context();await c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort());page=await c.new_page();mode=['http500'];posts=[];errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  async def fixture(route):
   if route.request.method=='OPTIONS':await route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'});return
   posts.append(route.request.post_data or '')
   if mode[0] in ['network','offline']:await route.abort('failed');return
   if mode[0]=='timeout':await asyncio.sleep(16);await route.abort();return
   if mode[0]=='success':await asyncio.sleep(.2)
   await route.fulfill(status=500 if mode[0]=='http500' else 422 if mode[0]=='http422' else 200,content_type='application/json',body='not json' if mode[0]=='invalidjson' else json.dumps({'ok':True} if mode[0]=='success' else {'ok':False}),headers={'Access-Control-Allow-Origin':'*'})
  await page.route('https://formspree.io/**',fixture);await page.goto(BASE+'/sap-mm-crashcourse/');await page.locator('#cookieNecessary').click();await page.evaluate('window.__events=[];window.gtag=(...args)=>window.__events.push(args)')
  check('opt-in initially unchecked',not await page.locator('[name=consent]').is_checked());check('country and role optional',not await page.locator('[name=country]').evaluate('(e)=>e.required') and not await page.locator('[name=role]').evaluate('(e)=>e.required'))
  await page.locator('[name=name]').fill('Synthetic');await page.locator('[name=email]').fill('test@example.invalid');await page.locator('#leadForm').evaluate('(e)=>e.requestSubmit()');check('missing opt-in blocks submission',len(posts)==0)
  await page.locator('[name=consent]').check()
  for case in ['http500','http422','network','offline','unconfirmed200','invalidjson','timeout','success']:
   mode[0]=case;before=len(posts)
   if case=='offline':await c.set_offline(True)
   await page.locator('#leadForm').evaluate('(e)=>e.requestSubmit()')
   if case=='success':await page.locator('#leadForm').evaluate('(e)=>e.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))')
   await page.wait_for_function('!document.querySelector("#submitBtn").disabled')
   if case=='success':check('service acceptance shown; duplicate in-flight suppressed',await page.locator('#thankyou').is_visible() and len(posts)==before+1)
   else:check(case+' honest error preserves entries',await page.locator('#formError').is_visible() and await page.locator('[name=name]').input_value()=='Synthetic' and await page.locator('[name=email]').input_value()=='test@example.invalid' and await page.locator('[name=consent]').is_checked())
   if case=='offline':await c.set_offline(False)
  before=len(posts);await page.locator('#leadForm').evaluate('(e)=>e.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');check('accepted duplicate suppressed',len(posts)==before)
  check('payload records express cohort opt-in',all('name="cohort_updates_consent"' in x and '\r\n\r\nyes\r\n' in x for x in posts));check('no campaign fields after rejection',all('attr_' not in x for x in posts));check('no JS errors',not errors)
  check('denied analytics has no acceptance event',await page.evaluate('window.__events.filter(e=>e[0]==="event").length===0'))
  await page.screenshot(path=str(OUT/'cohort-accepted-fixture.png'))
  for analytics in [True,False]:
   await page.reload();await page.evaluate('(allow)=>mbicsTracking.setConsent({analytics:allow,marketing:!allow,video:false})',analytics);await page.evaluate('window.__events=[];window.gtag=(...args)=>window.__events.push(args)')
   await page.locator('[name=name]').fill('Synthetic analytics check');await page.locator('[name=email]').fill('test@example.invalid');await page.locator('[name=consent]').check();await page.locator('#leadForm').evaluate('(e)=>e.requestSubmit()');await page.wait_for_function('!document.querySelector("#submitBtn").disabled')
   events=await page.evaluate('window.__events.filter(e=>e[0]==="event")');check('analytics permission '+str(analytics)+' only static acceptance event',events==([['event','generate_lead',{'form_id':'crashcourse-waitlist'}]] if analytics else []))
  await b.close()
async def run():
 try:await main()
 except Exception:checks.append({'name':'harness','pass':False,'detail':traceback.format_exc()})
 finally:(OUT/'checks.json').write_text(json.dumps(checks,indent=2));print('RESULT',sum(x['pass'] for x in checks),'/',len(checks),flush=True)
 if not all(x['pass'] for x in checks):raise SystemExit(1)
asyncio.run(run())
