/* ================= MAIN: boot, networking glue, input, loop ================= */
let ticker=null; G.tickN=0;
function send(m){ if(G.isHost&&G.host){ const H=G.host, pid=G.pid; Promise.resolve().then(()=>H.recv(pid,m)); } else if(G.net) G.net.send(m); }
function onMsg(m){
  if(!m||!m.t) return;
  switch(m.t){
    case 'welcome': G.pid=m.you; G.isHost=!!m.host; G.code=m.code; G.settings=m.settings; enterGame(); break;
    case 'r': G.roster=new Map(m.list.map(x=>[x.id,x])); Voice.sync(); break;
    case 'settings': G.settings=m.settings; if(G.modal&&G.modal.kind==='settings'&&!G.isHost) openSettings(); break;
    case 's': applySnap(m); break;
    case 'ev': onEvent(m); break;
    case 'chat': addChat(m); break;
    case 'chatlog': G.chat=m.log.slice(); renderChat(); break;
    case 'pong': G.pingMs=performance.now()-m.c; break;
    case 'reject': sessionStorage.removeItem('sus_pid_'+G.code); alert(m.why); leaveGame(true); break;
  }
}
function onEvent(e){
  const T=performance.now()/1000;
  switch(e.e){
    case 'intro': G._endShown=false; showIntro(e); Voice.keepAlive(true); requestWake(); break;
    case 'killed': G.shake=1.2; PostFX.kick(1); showKilled(e.by); break;
    case 'kill': SFX.kill(); G.shake=0.9; PostFX.kick(0.7); break;
    case 'meeting': G.shake=0.8; PostFX.kick(0.6); showMeetingSplash(e); break;
    case 'alarm': G.alarms.push({x:e.x,y:e.y,t:T}); SFX.alarm(); toast('Noisemaker alarm! Someone was killed'); break;
    case 'puff': G.fx.push({k:'puff',x:e.x,y:e.y,t:T,d:0.7,soft:e.soft}); break;
    case 'shield': G.fx.push({k:'shield',x:e.x,y:e.y,t:T,d:0.8}); toast('A shield blocked the kill!'); break;
    case 'vent': G.ventAnim[e.i]=T; { const v=G.map.ventList[e.i]; if(v&&Math.hypot(v.x-G.local.x,v.y-G.local.y)<visR) SFX.vent(); } break;
    case 'sab': SFX.sab(); G.shake=0.5; PostFX.kick(0.35); if(!amImp()) toast('⚠ '+sabLabel({k:e.k})+'!'); break;
    case 'fixed': toast('✔ '+sabLabel({k:e.k})+' fixed'); break;
    case 'ghostrole': toast('You became a Guardian Angel — protect the living!',4500); break;
    case 'end': G._endShown=true; showEnd(e); break;
    case 'lobby': G._endShown=false; hideFx(); toast('Back in the lobby'); break;
    case 'overrule': toast(`${rosterName(e.judge)} used Overrule on ${rosterName(e.target)}!`,3500); break;
    case 'toast': toast(e.msg); break;
  }
}
function homeStatus(t){ $('#homeStatus').textContent=t||''; }
function readHome(){ if(!$('#hName').value.trim()){ $('#hName').focus(); homeStatus('Enter your name first'); return false; } saveProfile(cleanName($('#hName').value),myCos()); return true; }
function createRoom(){
  if(!readHome()) return; Voice.ensureCtx();
  if(!LOCAL&&typeof Peer==='undefined'){ homeStatus('Network library failed to load. Check your internet and reload.'); return; }
  setHomeBusy(true); homeStatus('Creating room…');
  const code=roomCode(), pid='h'+uid(7); const host=new Host(code,pid,null);
  const T=LOCAL?LocalHost:PeerHost;
  const tr=new T({
    onReady:()=>{ G.code=code; G.pid=pid; G.isHost=true; G.host=host;
      const p=host.addPlayer(pid,myName(),myCos(),false); p.online=true; p.cid='local'; p.peer=tr.peer?tr.peer.id:null;
      host.attachLocal(pid,m=>onMsg(m)); Voice.attachPeer(tr.peer||null);
      sessionStorage.setItem('sus_hosted_'+code,'1');
      history.replaceState(null,'','?room='+code+(LOCAL?'&local=1':''));
      host.sendTo(pid,{t:'welcome',you:pid,host:true,code,settings:host.settings}); host.rosterDirty=true;
      startTicker(); window.__host=host; },
    onFail:why=>{ setHomeBusy(false); if(why==='taken'){ homeStatus('Code clash, retrying…'); setTimeout(createRoom,300);} else homeStatus('Your browser does not support WebRTC.'); },
    onConn:c=>host.onConn(c), onMsg:(c,m)=>host.onMsg(c,m), onClose:c=>host.onClose(c), onCall:c=>Voice.onCall(c),
    onNet:s=>{ if(s==='retry') homeStatus('Connecting to signaling server… check your internet'); }
  });
  host.net=tr; G.hostTr=tr; tr.start(code);
}
function joinRoom(code){
  code=String(code||'').toUpperCase().replace(/[^A-Z]/g,''); if(code.length<4){ homeStatus('Enter a valid room code'); return; }
  if(!readHome()) return; Voice.ensureCtx();
  if(!LOCAL&&typeof Peer==='undefined'){ homeStatus('Network library failed to load. Check your internet and reload.'); return; }
  if(sessionStorage.getItem('sus_hosted_'+code)){ homeStatus('You hosted this room — reloading ended it. Create a new room.'); history.replaceState(null,'',location.pathname+(LOCAL?'?local=1':'')); return; }
  G.code=code; G.isHost=false; let pid=sessionStorage.getItem('sus_pid_'+code); if(!pid){ pid='p'+uid(7); sessionStorage.setItem('sus_pid_'+code,pid); } G.pid=pid;
  setHomeBusy(true); homeStatus('Connecting to room '+code+'…');
  const T=LOCAL?LocalClient:PeerClient; let tr;
  tr=new T({
    onOpen:()=>tr.send({t:'hello',pid,name:myName(),cos:myCos(),peer:tr.myId}),
    onMsg:m=>onMsg(m),
    onStatus:s=>{ if(G.screen!=='game'){ if(s==='nohost') homeStatus(`Room ${code} not found yet — retrying… (check the code)`); if(s==='browser') homeStatus('Your browser does not support WebRTC.'); } },
    onPeerId:()=>Voice.attachPeer(tr.peer||null),
    onCall:c=>Voice.onCall(c)
  });
  G.net=tr; tr.start(code); startTicker(); window.__net=tr;
  history.replaceState(null,'','?room='+code+(LOCAL?'&local=1':''));
}
function startTicker(){ if(!ticker) ticker=makeTicker(50,tick); }
function tick(){
  G.tickN++;
  if(G.isHost&&G.host){ G.host.update(); if(G.hostTr&&G.tickN%10===0) G.hostTr.check(); }
  else if(G.net){ G.net.check(); if(G.tickN%30===0&&G.net.isOpen()) G.net.send({t:'ping',c:performance.now()}); }
  if(G.me&&G.screen==='game'){ const L=G.local; send({t:'in',x:+L.x.toFixed(3),y:+L.y.toFixed(3),d:L.d,m:L.m,sq:L.sq,sp:Voice.speaking?1:0}); }
  if(G.tickN%80===0) Voice.sync();
}
function setHomeBusy(b){ ['#hCreate','#hJoin'].forEach(s=>$(s).disabled=b); }
function enterGame(){
  if(G.screen==='game') return; G.screen='game'; show('#home',false); show('#hud',true); homeStatus(''); setHomeBusy(false);
  Voice.keepAlive(true); requestWake(); resize();
  if(!LOCAL&&G.settings.voice!=='off') setTimeout(()=>toast('Tap the mic to talk · voice is '+(G.settings.voice==='proximity'?'proximity-based':G.settings.voice),3500),800);
}
function leaveGame(){
  try{ if(G.isHost&&G.host) G.host.broadcast({t:'reject',why:'The host ended the room.'},p=>p.id!==G.pid); else send({t:'leave'}); }catch(e){}
  sessionStorage.removeItem('sus_pid_'+G.code);
  setTimeout(()=>{ try{G.net&&G.net.destroy();}catch(e){} try{G.hostTr&&G.hostTr.destroy();}catch(e){} location.href=location.pathname+(LOCAL?'?local=1':''); },250);
}
/* ---------- canvas & input ---------- */
const cv=$('#cv'), ctx=cv.getContext('2d',{alpha:false}); let dpr=1, dprCap=9;
function resize(){ dpr=Math.min(IS_TOUCH?1.75:2,devicePixelRatio||1,dprCap); G.vw=innerWidth; G.vh=innerHeight; cv.width=Math.round(G.vw*dpr); cv.height=Math.round(G.vh*dpr); cv.style.width=G.vw+'px'; cv.style.height=G.vh+'px';
  G.tilePx=setRenderScale(Math.max(28,Math.min(G.vw/20,G.vh/11.5)),dpr); }
addEventListener('resize',resize); resize();
const typing=()=>{ const a=document.activeElement; return a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'); };
addEventListener('keydown',e=>{
  if(typing()){ if(e.key==='Escape') document.activeElement.blur(); return; }
  G.keys[e.code]=true; if(G.screen!=='game') return;
  if(e.code==='Escape'){ closeModal(); toggleChat(false); }
  else if(e.code==='KeyE'||e.code==='Space'){ e.preventDefault(); if(G.modal&&G.modal.kind!=='map') return; doUse(); }
  else if(e.code==='KeyR') doReport(); else if(e.code==='KeyQ') doKill(); else if(e.code==='KeyV') doVent(); else if(e.code==='KeyF') doAbility();
  else if(e.code==='KeyM'||e.code==='Tab'){ e.preventDefault(); if(G.phase==='play'){ G.modal&&G.modal.kind==='map'?closeModal():openMap(false);} }
  else if(e.code==='Enter'&&(G.phase==='lobby'||G.phase==='end'||(amDead()&&G.phase==='play'))){ e.preventDefault(); toggleChat(true); }
  else if(e.code==='KeyT'&&G.phase==='meeting'){ e.preventDefault(); $('#mtIn')&&$('#mtIn').focus(); }
});
addEventListener('keyup',e=>{ G.keys[e.code]=false; });
addEventListener('blur',()=>G.keys={});
cv.addEventListener('pointerdown',e=>{
  if(G.screen!=='game') return; Voice.ensureCtx();
  if(e.pointerType==='mouse'&&e.button!==0) return;
  if(!G.joy){ G.joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,cx:e.clientX,cy:e.clientY,r:Math.min(70,G.vh*0.13),active:true}; cv.setPointerCapture(e.pointerId); }
});
cv.addEventListener('pointermove',e=>{ if(G.joy&&e.pointerId===G.joy.id){ G.joy.cx=e.clientX; G.joy.cy=e.clientY; const dx=G.joy.cx-G.joy.ox, dy=G.joy.cy-G.joy.oy, d=Math.hypot(dx,dy); if(d>G.joy.r*1.6){ G.joy.ox+=dx/d*(d-G.joy.r*1.6); G.joy.oy+=dy/d*(d-G.joy.r*1.6);} } });
const endJoy=e=>{ if(G.joy&&e.pointerId===G.joy.id) G.joy=null; };
cv.addEventListener('pointerup',endJoy); cv.addEventListener('pointercancel',endJoy);
/* ---------- background robustness: never drop players on tab/app switch ---------- */
document.addEventListener('visibilitychange',()=>{ G.keys={}; G.joy=null;
  if(document.visibilityState==='visible'){ Voice.ensureCtx(); requestWake(); if(G.net){ G.net.check(); if(G.net.isOpen()) G.net.send({t:'ping',c:performance.now()}); } if(G.hostTr) G.hostTr.check(); } });
addEventListener('pageshow',()=>{ if(G.net) G.net.check(); });
addEventListener('online',()=>{ if(G.net) G.net.check(); if(G.hostTr) G.hostTr.check(); });
addEventListener('beforeunload',e=>{ if(G.isHost&&G.screen==='game'){ e.preventDefault(); e.returnValue='Leaving will end the room for everyone.'; } });
/* ---------- home ---------- */
const homeCrew=[...Array(10)].map((_,i)=>({x:Math.random(),y:Math.random(),vx:(Math.random()-0.5)*0.03,vy:(Math.random()-0.5)*0.02,r:Math.random()*6,vr:(Math.random()-0.5)*0.8,cos:{color:i*2%18,hat:ri(HATS.length),outfit:ri(OUTFITS.length),visor:ri(VISORS.length),pet:0},s:40+Math.random()*60,z:Math.random()}));
const homeStars=[...Array(220)].map(()=>[Math.random(),Math.random(),Math.random()]);
function renderHome(c,W,H,dt){
  const t=performance.now()/1000;
  const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,'#04051a'); g.addColorStop(1,'#0c1236'); c.fillStyle=g; c.fillRect(0,0,W,H);
  [[0.15,0.25,'rgba(120,60,220,.22)',0.45],[0.85,0.7,'rgba(30,140,255,.18)',0.5],[0.6,0.15,'rgba(255,60,150,.12)',0.35]].forEach(([x,y,col,r])=>{ const gg=c.createRadialGradient(x*W,y*H,0,x*W,y*H,r*Math.max(W,H)); gg.addColorStop(0,col); gg.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=gg; c.fillRect(0,0,W,H); });
  homeStars.forEach(s=>{ s[0]-=dt*0.006*(0.3+s[2]); if(s[0]<0)s[0]+=1; c.fillStyle=`rgba(255,255,255,${0.25+s[2]*0.75*(0.7+0.3*Math.sin(t*2+s[1]*40))})`; c.fillRect(s[0]*W,s[1]*H,1+s[2]*1.6,1+s[2]*1.6); });
  const px=W*0.86, py=H*0.82, pr=Math.min(W,H)*0.28; const pg=c.createRadialGradient(px-pr*0.4,py-pr*0.4,pr*0.1,px,py,pr); pg.addColorStop(0,'#ffb27a'); pg.addColorStop(0.55,'#b8453a'); pg.addColorStop(1,'#2a0f2a');
  c.fillStyle=pg; c.beginPath(); c.arc(px,py,pr,0,7); c.fill(); c.strokeStyle='rgba(255,210,170,.35)'; c.lineWidth=pr*0.05; c.beginPath(); c.ellipse(px,py,pr*1.7,pr*0.35,-0.35,Math.PI*1.05,Math.PI*2.0); c.stroke();
  homeCrew.sort((a,b)=>a.z-b.z).forEach(p=>{ p.x+=p.vx*dt; p.y+=p.vy*dt; p.r+=p.vr*dt; if(p.x<-0.1)p.x=1.1; if(p.x>1.1)p.x=-0.1; if(p.y<-0.1)p.y=1.1; if(p.y>1.1)p.y=-0.1;
    c.save(); c.globalAlpha=0.5+p.z*0.5; c.translate(p.x*W,p.y*H); c.rotate(p.r); drawCrew(c,0,p.s*0.45,p.s*(0.6+p.z*0.6),p.cos,{}); c.restore(); });
}
function initHome(){
  $('#hName').value=myName();
  const pv=$('#hPrev'); const upd=()=>{ pv.innerHTML=''; pv.append(crewCanvas(myCos(),96,{pet:true})); }; upd();
  $('#hCustom').addEventListener('click',()=>{ openCustomize(); const iv=setInterval(()=>{ if(!G.modal){ clearInterval(iv); upd(); $('#hName').value=myName(); } },300); });
  $('#hCreate').addEventListener('click',createRoom);
  $('#hJoin').addEventListener('click',()=>joinRoom($('#hCode').value));
  $('#hCode').addEventListener('keydown',e=>{ if(e.key==='Enter') joinRoom($('#hCode').value); });
  $('#hName').addEventListener('change',()=>saveProfile($('#hName').value,myCos()));
  const room=QS.get('room'); if(room){ $('#hCode').value=room.toUpperCase(); $('#homeCard').classList.add('invite'); $('#hJoin').textContent='JOIN '+room.toUpperCase(); homeStatus('You were invited! Enter your name and tap Join.'); }
  if(LOCAL) $('#localTag').classList.remove('hidden');
}
let lastT=performance.now(), slowT=0, qDrop=0;
function loop(ts){
  requestAnimationFrame(loop);
  const raw=(ts-lastT)/1000, dt=clamp(raw,0,0.1); lastT=ts;
  // adaptive quality: if frames are consistently slow, lower the render resolution
  if(G.screen==='game'&&document.visibilityState==='visible'){ slowT=raw>0.028&&raw<0.5?slowT+raw:Math.max(0,slowT-raw*0.5); if(slowT>2){ slowT=0; if(dpr>1.01&&qDrop<3){ qDrop++; dprCap=Math.max(1,dpr-0.35); resize(); } else if(PostFX.on&&!G.fxAuto){ G.fxAuto=1; PostFX.set(false); toast('Cinematic effects turned off for smoother play (Menu to re-enable)',4000); } } }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(G.screen==='game'&&G.me){ stepLocal(dt); renderFrame(ctx,G.vw,G.vh,dt); drawJoy(ctx); UI.frame(); if(G.phase==='meeting') Meet.render(); Voice.frame(); }
  else renderHome(ctx,G.vw,G.vh,dt);
  PostFX.draw(cv,dt);
}
