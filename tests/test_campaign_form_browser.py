import asyncio,json,threading,functools,http.server,pathlib,os
from playwright.async_api import async_playwright
ROOT=pathlib.Path(os.environ.get('PACKAGE02_ROOT',pathlib.Path.cwd()));OUT=ROOT/'work/evidence';SITE=ROOT/'work/candidate-site'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
async def run():
 threading.Thread(target=lambda:http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(Quiet,directory=str(SITE))).serve_forever(),daemon=True).start();results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for case in ['unknown','necessary','granted','withdrawn']:
   c=await b.new_context();await c.route('**/*google*/**',lambda r:r.abort());page=await c.new_page();payload=[]
   async def intercept(route):
    payload.append(route.request.post_data or '');await route.fulfill(status=500,content_type='application/json',body='{"error":"synthetic"}',headers={'Access-Control-Allow-Origin':'*'})
   await page.route('https://formspree.io/**',intercept)
   await page.goto('http://127.0.0.1:8765/sap-mm-crashcourse/?utm_source=package02-synthetic&gclid=synthetic-click')
   if case=='necessary':await page.locator('#cookieNecessary').click()
   if case in ['granted','withdrawn']:await page.locator('#cookieAcceptAll').click()
   if case=='withdrawn':await page.locator('#cookieSettingsLink').click();await page.locator('#cookieNecessary').click()
   await page.locator('[name=name]').fill('Synthetic');await page.locator('[name=email]').fill('test@example.invalid');await page.locator('[name=country]').select_option('US');await page.locator('[name=role]').select_option('other');await page.locator('[name=consent]').check();await page.locator('#leadForm').evaluate('(form)=>form.requestSubmit()');await page.wait_for_timeout(300)
   present=bool(payload and 'attr_gclid' in payload[0] and 'synthetic-click' in payload[0]);passed=len(payload)==1 and present==(case=='granted')
   results.append({'case':case,'pass':passed,'post_count':len(payload),'has_campaign_fields':present,'local_tracking_present':await page.evaluate('!!localStorage.mbics_tracking'),'session_tracking_present':await page.evaluate('!!sessionStorage.mbics_tracking')});await c.close()
  await b.close()
 (OUT/'campaign-form-checks.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2));assert all(x['pass'] for x in results)
asyncio.run(run())
