"""R04-01: actual accessible text alternatives; external services blocked."""
import asyncio,functools,http.server,json,os,pathlib,threading,traceback
from playwright.async_api import async_playwright
SITE=pathlib.Path(os.environ['SITE_DIR']);OUT=pathlib.Path(os.environ['EVIDENCE_DIR']);OUT.mkdir(parents=True,exist_ok=True);BASE='http://127.0.0.1:8793';checks=[];errors=[]
EXPECTED={'en':('a2VQtHrOqzI',8,268),'de':('crnMqP0DqZQ',6,1341),'es':('RAvV6HQlMq8',7,258)}
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def check(n,v,d=None):checks.append({'name':n,'pass':bool(v),'detail':d});print(('PASS ' if v else 'FAIL ')+n,flush=True)
async def run():
 threading.Thread(target=lambda:http.server.ThreadingHTTPServer(('127.0.0.1',8793),functools.partial(Quiet,directory=str(SITE))).serve_forever(),daemon=True).start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  for lang in ['en','de','es']:
   for width in [1440,390]:
    label=f'{lang}/{width}';c=await b.new_context(locale=lang,viewport={'width':width,'height':1000},reduced_motion='reduce');await c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort());p=await c.new_page();remote=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:remote.append(r.url) if not r.url.startswith(BASE) else None)
    await p.goto(BASE+('/' if lang=='en' else '/'+lang+'/'));await p.evaluate('document.fonts.ready')
    check(label+' three reading alternatives present',await p.locator('.video-reading').count()==3)
    own=p.locator(f'.video-reading[data-video-language={lang}]');before=await p.evaluate('mbicsTracking.getConsent()');await own.locator('summary').press('Enter')
    check(label+' read before choosing consent',await own.evaluate('(e)=>e.open') and await own.locator('li').first.is_visible())
    check(label+' reading does not grant consent',await p.evaluate('mbicsTracking.getConsent()')==before)
    await p.locator('#cookieNecessary').click();await own.locator('summary').press('Space');check(label+' native Space closes guide',not await own.evaluate('(e)=>e.open'))
    for video_lang,(vid,n,duration) in EXPECTED.items():
     guide=p.locator('#video-reading-'+vid);await guide.locator('summary').press('Enter')
     check(label+'/'+video_lang+' language and readable steps',await guide.locator('ol').get_attribute('lang')==video_lang and await guide.locator('li').count()==n and await guide.locator('li').last.is_visible())
     times=await guide.locator('li strong').all_text_contents();seconds=[sum(int(t)*k for t,k in zip(v.split(':'),[60,1])) for v in times]
     check(label+'/'+video_lang+' ordered source-relative timecodes',seconds==sorted(seconds) and all(0<=x<duration for x in seconds) and (video_lang!='de' or all(26<=x<207 for x in seconds)),times)
     check(label+'/'+video_lang+' type label distinguishes summary from captions',bool(await guide.locator('p').inner_text()) and ('English' if lang=='en' and video_lang=='en' else 'Deutsch' if lang=='de' and video_lang=='de' else 'español' if lang=='es' and video_lang=='es' else '(') in await guide.locator('summary').inner_text())
     if video_lang==lang:
      await guide.scroll_into_view_if_needed();await p.screenshot(path=str(OUT/(label.replace('/','-')+'-reading.png')))
     await guide.locator('summary').press('Space')
    check(label+' no player or optional Google request while reading',not any('youtube' in u or 'google' in u or 'ytimg' in u for u in remote),remote)
    check(label+' no iframe and denied consent preserved',not await p.locator('#videoModalIframe').get_attribute('src') and await p.evaluate('Object.values(mbicsTracking.getConsent()).every(v=>v===false)'))
    check(label+' no page overflow',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    await p.locator('.video-card').first.press('Enter');check(label+' video still asks separate permission',await p.locator('.video-modal__consent').is_visible());await p.keyboard.press('Escape');check(label+' focus returns to sample trigger',await p.locator('.video-card').first.evaluate('(e)=>e===document.activeElement'))
    await c.close()
   c=await b.new_context(java_script_enabled=False,locale=lang);await c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort());p=await c.new_page();await p.goto(BASE+('/' if lang=='en' else '/'+lang+'/'));guide=p.locator(f'.video-reading[data-video-language={lang}]');await guide.locator('summary').press('Enter');check(lang+' reading alternative without JavaScript',await guide.locator('li').last.is_visible() and await guide.evaluate('(e)=>e.open'));await c.close()
  check('no uncaught page errors',not errors,errors);await b.close()
async def main():
 try:await run()
 except Exception:check('harness completes',False,traceback.format_exc())
 finally:(OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors,'scope':'Local text/keyboard/language/consent tests. External requests blocked. No proof of audio or continuous video playback.'},ensure_ascii=False,indent=2));print('RESULT',sum(x['pass'] for x in checks),'/',len(checks))
 if not all(x['pass'] for x in checks):raise SystemExit(1)
asyncio.run(main())
