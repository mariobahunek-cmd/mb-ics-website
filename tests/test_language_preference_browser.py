"""Focused preference precedence and accessible DE reading-guide checks."""
import asyncio,json,os,pathlib,threading,functools,http.server
from playwright.async_api import async_playwright
SITE=pathlib.Path(os.environ['SITE_DIR']);OUT=pathlib.Path(os.environ['EVIDENCE_DIR']);OUT.mkdir(parents=True,exist_ok=True);checks=[];BASE='http://127.0.0.1:8792'
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
def check(n,v):checks.append({'name':n,'pass':bool(v)})
async def run():
 threading.Thread(target=lambda:http.server.ThreadingHTTPServer(('127.0.0.1',8792),functools.partial(Quiet,directory=str(SITE))).serve_forever(),daemon=True).start()
 async with async_playwright() as pw:
  b=await pw.chromium.launch();c=await b.new_context(locale='de-DE',viewport={'width':390,'height':844},reduced_motion='reduce');await c.route('**/*',lambda r:r.continue_() if r.request.url.startswith(BASE) else r.abort());p=await c.new_page();await p.goto(BASE+'/');await p.locator('#cookieNecessary').click()
  await p.locator('a.lang-btn').filter(has_text='ES').first.press('Enter');await p.wait_for_load_state('domcontentloaded');check('explicit Spanish choice stored with German browser',await p.evaluate('localStorage.mbics_language_v1')=='es')
  await p.goto(BASE+'/');check('return to root stays English',await p.locator('html').get_attribute('lang')=='en');check('explicit ES suggestion wins over browser DE',await p.locator('#suggestedLanguage').inner_text()=='Español')
  await p.locator('#dismissLanguageSuggestion').press('Enter');check('hint can be dismissed by keyboard',not await p.locator('#languageSuggestion').is_visible());check('dismissal preserves explicit choice',await p.evaluate('localStorage.mbics_language_v1')=='es')
  await p.goto(BASE+'/de/');check('direct DE URL wins over saved ES',await p.locator('html').get_attribute('lang')=='de' and not await p.locator('#languageSuggestion').is_visible())
  await p.locator('#clearLanguagePreference').press('Enter');check('clear removes functional preference',await p.evaluate('localStorage.getItem("mbics_language_v1")===null'));check('clear does not alter tracking rejection',await p.evaluate('Object.values(mbicsTracking.getConsent()).every(v=>v===false)'))
  await p.goto(BASE+'/');check('after clear browser DE suggestion resumes',await p.locator('#suggestedLanguage').inner_text()=='Deutsch')
  await p.goto(BASE+'/de/');await p.locator('.video-reading[data-video-language=de] summary').press('Enter');check('DE reading guide keyboard operable',await p.locator('.video-reading[data-video-language=de]').evaluate('(x)=>x.open'));check('six edited text steps available',await p.locator('.video-reading[data-video-language=de] li').count()==6);check('reading guide does not load a player',not await p.locator('#videoModalIframe').get_attribute('src'));await p.locator('.video-reading[data-video-language=de]').scroll_into_view_if_needed();await p.screenshot(path=str(OUT/'de-390-video-reading.png'));await b.close()
 (OUT/'checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks,indent=2));print('RESULT',sum(x['pass'] for x in checks),'/',len(checks));assert all(x['pass'] for x in checks)
asyncio.run(run())
