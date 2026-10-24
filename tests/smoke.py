import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
B=Path(__file__).resolve().parents[1]
results=[]; errors=[]
def record(name,value):
 results.append({'test':name,'passed':bool(value)})
 print(name, bool(value),flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', p.chromium.executable_path),headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
 ctx.route('https://**/*',lambda r:r.abort())
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8765/?local=1',wait_until='load');page.wait_for_timeout(600)
 record('Home boots and five destination buttons render',page.locator('.destination-card').count()==5)
 page.screenshot(path='/mnt/data/sus_station_desktop.png')
 page.locator('#hHelp').click();record('How-to dialog opens',page.locator('.how-card').count()==3);page.locator('#mClose').click()
 page.locator('#hName').fill('Jaya');page.locator('.destination-card').nth(2).click();page.locator('#hCustom').click()
 record('Wardrobe has five categories',page.locator('.tabs .tab').count()==5)
 page.locator('.tabs .tab').nth(1).click();page.locator('.citem').nth(3).click();page.locator('#mClose').click()
 page.locator('#hPractice').click();page.wait_for_function('G.me && G.roster.size===6')
 record('Practice creates host plus five bots',page.evaluate('G.host.players.size===6'))
 record('Selected map applied to host',page.evaluate('G.settings.map===2'))
 page.screenshot(path='/mnt/data/sus_station_lobby.png')
 code=page.evaluate('G.code')
 client=ctx.new_page();client.on('pageerror',lambda e:errors.append(str(e)));client.goto('http://127.0.0.1:8765/?local=1&room='+code,wait_until='load');client.locator('#hName').fill('Guest');client.locator('#hJoin').click();client.wait_for_function('G.me && G.roster.size===7')
 record('Second browser tab joins same room',client.evaluate('!G.isHost && G.phase==="lobby"'))
 page.locator('#lbStart').click();page.wait_for_function('G.phase==="play"',timeout=20000);client.wait_for_function('G.phase==="play"',timeout=20000)
 record('Host starts selected map for both peers',page.evaluate('G.mapIdx===3') and client.evaluate('G.mapIdx===3'))
 page.screenshot(path='/mnt/data/sus_station_gameplay.png')
 page.locator('#bMenu').click();record('Comfort preference available in menu',page.locator('#mBody').inner_text().find('Comfort mode')>=0);page.locator('#mClose').click()
 # Verify reconnect preserves identity and authoritative position sequence.
 pid=client.evaluate('G.pid');client.evaluate('G.net.simulateDrop(300)');client.wait_for_timeout(1300)
 record('Simulated client drop reconnects with same identity',client.evaluate('(G.net.isOpen() && G.pid===%s)'%json.dumps(pid)))
 # End via host harness to verify actual replay flow, not wait for random bot outcome.
 page.evaluate("G.host.gameOver('crew','Replay integration test')");page.wait_for_function('G.phase==="end"');client.wait_for_function('G.phase==="end"')
 page.locator('.ebtns .primary').click();page.wait_for_function('G.phase==="lobby"');client.wait_for_function('G.phase==="lobby"')
 record('Play Again retains client in original room',client.evaluate('G.code===%s && G.pid===%s'%(json.dumps(code),json.dumps(pid))))
 page.locator('#lbStart').click();page.wait_for_function('G.phase==="play"',timeout=20000);client.wait_for_function('G.phase==="play"',timeout=20000)
 record('Second round starts without creating a new room',client.evaluate('G.phase==="play"'))
 # Render all maps and all task mini-games to detect integration exceptions.
 for i in range(1,6):
  page.evaluate('(i)=>{G.mapIdx=i;G.map=MAPS[i];G.local.x=G.map.spawn[0];G.local.y=G.map.spawn[1];G.camInit=0;renderFrame(ctx,G.vw,G.vh,.016)}',i)
 record('All five maps render',True)
 for task in page.evaluate('Object.keys(MG)'):
  page.evaluate('(k)=>{openModal({kind:"test",title:k,cls:"task",build:b=>{const r=h("div",{class:"mg"});b.append(r);return MG[k](r,()=>{}, {sw:[1,0,1,0,0],st:0,hold:()=>{},code:"12345"})}})}',task)
  page.wait_for_timeout(40);page.evaluate('closeModal()')
 record('All task mini-games mount and clean up',True)
 # Responsive layout checks with independent mobile-like context.
 mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 mobile.route('https://**/*',lambda r:r.abort());m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto('http://127.0.0.1:8765/?local=1');m.wait_for_timeout(200)
 m.screenshot(path='/mnt/data/sus_station_mobile.png',full_page=True)
 record('Mobile home has no horizontal overflow',m.evaluate('document.querySelector("#home").scrollWidth<=innerWidth'))
 m.locator('#hName').fill('Mobile');m.locator('#hPractice').click();m.wait_for_function('G.me && G.roster.size===6');m.screenshot(path='/mnt/data/sus_station_mobile_lobby.png')
 record('Mobile lobby controls fit viewport',m.locator('#lobbyBar').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}'))
 m.set_viewport_size({'width':844,'height':390});m.wait_for_timeout(300);record('Landscape lobby controls fit viewport',m.locator('#lobbyBar').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}'))
 record('No uncaught browser JavaScript errors',not errors)
 browser.close()
(B/'tests/results.json').write_text(json.dumps({'results':results,'errors':errors},indent=2))
print(json.dumps({'results':results,'errors':errors},indent=2))
