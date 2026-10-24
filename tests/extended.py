import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
results=[];errors=[]
def check(name,value):
 results.append({'test':name,'passed':bool(value)});print(name,bool(value),flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', p.chromium.executable_path),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1280,'height':800});context.route('https://**/*',lambda r:r.abort())
 host=context.new_page();host.on('pageerror',lambda e:errors.append(str(e)));host.goto('http://127.0.0.1:8765/?local=1');host.locator('#hName').fill('Host');host.locator('#hCreate').click();host.wait_for_function('G.me');code=host.evaluate('G.code')
 check('Host cannot start alone',host.locator('#lbStart').is_disabled())
 peers=[]
 for i in range(3):
  c=context.new_page();c.on('pageerror',lambda e:errors.append(str(e)));c.goto('http://127.0.0.1:8765/?local=1&room='+code);c.locator('#hName').fill('Friend'+str(i));c.locator('#hJoin').click();c.wait_for_function('G.me');peers.append(c)
 host.wait_for_function('G.roster.size===4');check('Four human browser peers share one room',host.evaluate('G.host.players.size===4'))
 host.locator('#lbStart').click();host.wait_for_function('G.phase==="play"',timeout=20000)
 for c in peers:c.wait_for_function('G.phase==="play"',timeout=20000)
 check('Four-player game starts and snapshots arrive',all(c.evaluate('performance.now()-G.lastSnap<2000') for c in peers))
 host.evaluate('G.host.startMeeting(G.host.players.get(G.pid),null)');host.wait_for_function('G.phase==="meeting"');host.wait_for_timeout(2800)
 check('Meeting voting cards render for every player',host.locator('.vc').count()==4)
 host.screenshot(path='/mnt/data/sus_station_meeting.png')
 host.evaluate('G.host.meeting.st="vote";G.host.meeting.left=30');host.wait_for_timeout(200)
 host.locator('#mtSkip').click();host.locator('#mtSkip').click();host.wait_for_timeout(200)
 check('Skip vote confirms through authoritative host',host.evaluate('G.host.meeting.votes[G.pid]==="skip"'))
 # Host validation tests run on isolated Host instances so no real session is modified.
 checks=host.evaluate('''()=>{
  const tr={send:()=>{},drop:()=>{}};const H=new Host('TEST','a',tr);const a=H.addPlayer('a','A',{},false),b=H.addPlayer('b','B',{},false);a.online=b.online=true;
  H.phase='play';a.team='imp';a.killCd=0;b.team='crew';a.x=1;a.y=1;b.x=1.1;b.y=1.1;
  H.map=buildMap({id:'test',w:5,h:5,theme:{},rooms:[['A',1,1,1,1,{}],['B',3,1,1,1,{}]],cors:[],spawn:[1.5,1.5],tasks:[],vents:[],consoles:{},sab:{}});
  a.x=1.5;a.y=1.5;b.x=3.5;b.y=1.5;H.settings.killDist=2;H.kill(a,b);const blocked=!b.dead;
  H.sab={hold:[null,null]};H.map.critStations=[[1.5,1.5],[3.5,1.5]];H.recv('a',{t:'hold',st:99,on:true});const invalid=H.sab.hold.length===2;
  a.dead=true;H.recv('a',{t:'hold',st:0,on:true});const dead=H.sab.hold[0]===null;
  return {blocked,invalid,dead};}''')
 for k,v in checks.items():check('Host validation: '+k,v)
 home=context.new_page();home.goto('http://127.0.0.1:8765/?local=1')
 for width,height in [(320,700),(390,844),(844,390),(1024,768),(1920,1080)]:
  home.set_viewport_size({'width':width,'height':height});home.wait_for_timeout(70)
  check('Home layout fits '+str(width)+'x'+str(height),home.evaluate('document.querySelector("#home").scrollWidth<=innerWidth'))
 # Guarded mini-game completion must not call done after cleanup.
 check('Task completion ignored after dialog cleanup',home.evaluate('''()=>{let called=0,cb;const original=MG.manifold;openModal({kind:'test',build:b=>{const r=h('div',{class:'mg'});b.append(r);const clean=MG.manifold(r,()=>called++,{});const buttons=[...r.querySelectorAll('button')].sort((a,b)=>+a.textContent-+b.textContent);buttons.forEach(b=>b.dispatchEvent(new PointerEvent('pointerdown')));return clean;}});closeModal();window.__taskCalled=()=>called;return true;}'''))
 home.wait_for_timeout(450);check('No delayed task completion after close',home.evaluate('__taskCalled()===0'))
 check('No uncaught extended-test browser errors',not errors)
 browser.close()
Path('/mnt/data/sus_station_rebuilt/tests/extended-results.json').write_text(json.dumps({'results':results,'errors':errors},indent=2))
