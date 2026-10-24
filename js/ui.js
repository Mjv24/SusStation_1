/* ================= UI: HUD, modals, meetings, cinematic screens ================= */
const $=s=>document.querySelector(s);
const SFX=(()=>{ let vol=+(localStorage.getItem('sus_sfx')??0.6);
  const ac=()=>{ try{ return Voice.ensureCtx(); }catch(e){ return null; } };
  const tone=(f,d=0.12,type='sine',g=0.2,slide=0)=>{ const c=ac(); if(!c||vol<=0) return; const o=c.createOscillator(), a=c.createGain(); o.type=type; o.frequency.value=f; if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),c.currentTime+d);
    a.gain.value=g*vol; a.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+d); o.connect(a); a.connect(c.destination); o.start(); o.stop(c.currentTime+d+0.02); };
  const noise=(d=0.3,g=0.3)=>{ const c=ac(); if(!c||vol<=0) return; const b=c.createBuffer(1,c.sampleRate*d,c.sampleRate), x=b.getChannelData(0); for(let i=0;i<x.length;i++) x[i]=(Math.random()*2-1)*(1-i/x.length); const s=c.createBufferSource(), a=c.createGain(); s.buffer=b; a.gain.value=g*vol; s.connect(a); a.connect(c.destination); s.start(); };
  return { setVol(v){vol=v;localStorage.setItem('sus_sfx',v);}, get vol(){return vol;},
    click(){tone(660,0.05,'square',0.07);}, beep(f=600,d=0.12){tone(f,d,'sine',0.15);}, ok(){tone(660,0.09,'sine',0.18);setTimeout(()=>tone(990,0.14,'sine',0.18),90);},
    err(){tone(180,0.2,'sawtooth',0.12);}, kill(){noise(0.25,0.5);tone(120,0.3,'sawtooth',0.3,-80);}, alarm(){ for(let i=0;i<3;i++) setTimeout(()=>{tone(880,0.18,'square',0.14);setTimeout(()=>tone(660,0.18,'square',0.14),180);},i*400); },
    vent(){noise(0.15,0.25);tone(220,0.12,'triangle',0.2,-100);}, sab(){ tone(440,0.25,'sawtooth',0.12); setTimeout(()=>tone(330,0.3,'sawtooth',0.12),250); },
    vote(){tone(520,0.07,'square',0.1);}, eject(){noise(1.2,0.25);}, win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.25,'triangle',0.2),i*140));}, lose(){[392,330,262,196].forEach((f,i)=>setTimeout(()=>tone(f,0.3,'triangle',0.2),i*170));},
    reveal(){tone(110,1.2,'sawtooth',0.15,40);} };
})();

const UI={
  init(){
    $('#bUse').addEventListener('click',()=>doUse()); $('#bReport').addEventListener('click',()=>doReport()); $('#bKill').addEventListener('click',()=>doKill());
    $('#bVent').addEventListener('click',()=>doVent()); $('#bSabo').addEventListener('click',()=>openMap(true)); $('#bAb').addEventListener('click',()=>doAbility());
    $('#bMap').addEventListener('click',()=>G.modal&&G.modal.kind==='map'?closeModal():openMap(false));
    $('#bMenu').addEventListener('click',()=>openMenu()); $('#bChat').addEventListener('click',()=>toggleChat());
    $('#bMic').addEventListener('click',()=>Voice.toggleMic()); $('#bSpk').addEventListener('click',()=>Voice.toggleDeaf());
    $('#mClose').addEventListener('click',()=>closeModal());
    $('#lbCustom').addEventListener('click',()=>openCustomize()); $('#lbSettings').addEventListener('click',()=>openSettings());
    $('#lbStart').addEventListener('click',()=>send({t:'start'})); $('#lbBotAdd').addEventListener('click',()=>send({t:'bot+'})); $('#lbBotRem').addEventListener('click',()=>send({t:'bot-'}));
    $('#lbCode').addEventListener('click',()=>shareLink()); $('#tasksHead').addEventListener('click',()=>$('#tasks').classList.toggle('collapsed'));
    $('#chatForm').addEventListener('submit',e=>{ e.preventDefault(); const i=$('#chatIn'); if(i.value.trim()){ send({t:'chat',text:i.value}); i.value=''; } });
    $('#chatX').addEventListener('click',()=>toggleChat(false)); $('#rotX').addEventListener('click',()=>G.rotX=true);
  },
  frame(){
    if(G.screen!=='game'||!G.me) return;
    const me=G.me, ph=G.phase, lobby=ph==='lobby';
    show('#lobbyBar',lobby); show('#topL',ph==='play'||ph==='intro'); show('#roomTag',ph==='play');
    if(lobby){ const n=[...G.roster.values()].filter(r=>!r.left&&(r.on||r.bot)).length; setText('#lbCount',`${n}/15`); setText('#lbCodeT',G.code);
      show('#lbStart',G.isHost); show('#lbBotAdd',G.isHost); show('#lbBotRem',G.isHost); show('#lbWait',!G.isHost);
      const min=me.min||4; const ok=n>=min; $('#lbStart').disabled=!ok; setHTML('#lbStart',ICO('play')+(ok?' START':` ${n}/${min}`)); setHTML('#lbSettings',ICO('gear')+(G.isHost?' Settings':' Rules')); }
    if(ph==='play'){ const R=G.map.roomList[G.map.roomAt(G.local.x,G.local.y)]; setText('#roomTag',R?R.name:G.map.name); }
    if(ph==='play'||ph==='intro'){ const tl=$('#taskList'); const comms=G.sab&&G.sab.k==='comms'&&!amDead();
      let html='';
      if(me.spec) html='<div class="tk">Spectating — you will join next round.</div>';
      else { if(me.team==='imp') html+=`<div class="tk imp">Sabotage and kill everyone.<span class="dim"> Fake tasks:</span></div>`;
        if(me.role!=='crewmate'&&me.role!=='impostor') html+=`<div class="tk role"><b>${ROLES[me.role].name}</b> — ${ROLES[me.role].desc}</div>`;
        if(G.sab) html+=`<div class="tk sab">⚠ ${sabLabel(G.sab)}</div>`;
        if(comms) html+='<div class="tk dim">Comms sabotaged — tasks hidden</div>';
        else (me.tasks||[]).forEach(tk=>{ const st=G.map.stations[tk.st]; const room=st?G.map.roomList[G.map.roomAt(st.x,st.y)]:null; const def=TASKDEF[tk.type];
          const nm=def.stageName?def.stageName[Math.min(tk.stage,def.stageName.length-1)]:def.name;
          html+=`<div class="tk ${tk.done?'done':tk.stage>0?'part':''}"><i></i><span><b>${room?esc(room.name):'?'}</b> ${nm}${tk.n>1?` <em>${Math.min(tk.stage,tk.n)}/${tk.n}</em>`:''}</span></div>`; });
        if(amDead()&&me.team==='crew') html+='<div class="tk dim">You are a ghost. Finish your tasks to help the crew!</div>'; }
      if(tl._h!==html){ tl.innerHTML=html; tl._h=html; }
      const tb=$('#taskbar'); show(tb,G.tb>=0); if(G.tb>=0) tb.firstChild.style.width=(G.tb*100)+'%'; }
    const sb=$('#sabBanner'); if(ph==='play'&&G.sab&&G.sab.crit){ show(sb,true); setText(sb,`⚠ ${sabLabel(G.sab)} — ${Math.ceil(G.sab.left)}s`); } else show(sb,false);
    document.body.classList.toggle('alarm',ph==='play'&&!!(G.sab&&G.sab.crit));
    const netOk=G.isHost||(G.net&&G.net.isOpen()&&performance.now()-G.lastSnap<4000); show('#netpill',!netOk); if(!netOk) setText('#netpill','Reconnecting… your spot is saved');
    this.actions();
    show('#bMap',ph==='play'); show('#bChat',ph==='lobby'||ph==='end'||(amDead()&&ph==='play'));
    $('#bMic').classList.toggle('off',!Voice.micOn); setHTML('#bMic',ICO(Voice.micOn?'mic':'micoff')); setHTML('#bSpk',ICO(Voice.deaf?'spkoff':'spk')); $('#bSpk').classList.toggle('off',Voice.deaf);
    show('#bMic',!LOCAL&&G.settings.voice!=='off'); show('#bSpk',!LOCAL&&G.settings.voice!=='off');
    show('#ventNav',me.vent!=null&&ph==='play'); if(me.vent!=null) this.ventNav();
    show('#rot',G.vh>G.vw*1.15&&IS_TOUCH&&!G.rotX&&ph!=='meeting');
    const cb=$('#chatBadge'); show(cb,G.unread>0); cb.textContent=G.unread;
  },
  actions(){
    const me=G.me, ph=G.phase, S=G.settings; const N=nearby(); G.near=N; const dead=amDead(); const imp=amImp();
    const playing=ph==='play'&&!me.spec;
    const useB=$('#bUse'); show(useB,ph==='lobby'||playing);
    const u=N.use; let lab='USE', ico='use'; if(u){ if(u.k==='customize'){lab='CUSTOMIZE';ico='shirt';} else if(u.k==='button'){lab='EMERGENCY';ico='siren';} else if(u.k==='admin'){lab='ADMIN';ico='map';} else if(u.k==='cams'){lab='SECURITY';ico='cams';} else if(u.k==='vitals'){lab='VITALS';ico='vitals';} else if(u.k==='sab'){lab='FIX';ico='fix';} }
    const btnCd=u&&u.k==='button'&&G.bc>0?G.bc:0;
    setBtn(useB,ico,lab,!!u&&!(u.k==='button'&&(me.ml<=0||G.bc>0||(G.sab&&G.sab.crit))),btnCd,S.btnCd);
    show('#bReport',playing&&!dead); setBtn($('#bReport'),'report','REPORT',!!N.report);
    show('#bKill',playing&&imp&&!dead); setBtn($('#bKill'),'kill','KILL',!!N.kill&&me.kc<=0&&!me.invis,me.kc,S.killCd);
    const canVent=playing&&!dead&&(imp||me.role==='engineer'); show('#bVent',canVent&&me.vent==null);
    setBtn($('#bVent'),'vent','VENT',!!N.vent&&!(me.role==='engineer'&&me.vc>0)&&!me.invis,me.role==='engineer'?me.vc:0,S.roles.engineer.cd);
    show('#bSabo',playing&&imp); setBtn($('#bSabo'),'sabo','SABOTAGE',true);
    const ab=abilityInfo(); show('#bAb',playing&&!!ab); if(ab) setBtn($('#bAb'),ab.ico,ab.lab,ab.ok,ab.cd||0,ab.max||30);
  },
  ventNav(){ const v=G.map.ventList[G.me.vent]; if(!v) return; const el=$('#ventNav'); const key=v.i+':'+v.links.join(',');
    if(el._k===key) return; el._k=key; el.innerHTML='';
    v.links.forEach(li=>{ const o=G.map.ventList[li]; const r=G.map.roomList[G.map.roomAt(o.x,o.y)]; const b=h('button',{type:'button',class:'btn glass',html:ICO('arrow')+' '+esc(r?r.name:'Hallway')}); b.addEventListener('click',()=>{send({t:'vent',a:'go',to:li});SFX.vent();}); el.append(b); });
    const x=h('button',{type:'button',class:'btn primary',html:ICO('exit')+' Exit vent'}); x.addEventListener('click',()=>{send({t:'vent',a:'out'});SFX.vent();}); el.append(x); }
};
function show(sel,on){ const e=typeof sel==='string'?$(sel):sel; if(!e) return; const hid=!on; if(e._hid!==hid){ e.classList.toggle('hidden',hid); e._hid=hid; } }
function setText(sel,t){ const e=typeof sel==='string'?$(sel):sel; if(e&&e._t!==t){ e.textContent=t; e._t=t; } }
function setHTML(sel,t){ const e=$(sel); if(e&&e._h2!==t){ e.innerHTML=t; e._h2=t; } }
function setBtn(b,ico,lab,en,cd,max){
  const cdv=cd>0?Math.ceil(cd):0; const k=ico+lab+en+cdv; const p=cd>0&&max?clamp(cd/max,0,1):0; b.disabled=!en; b.setAttribute('aria-label',lab+(cdv?' cooldown '+cdv+' seconds':'')); b.style.setProperty('--p',p);
  if(b._k===k) return; b._k=k; b.innerHTML=`<span class="ring"></span><span class="ico">${ICO(ico)}</span><span class="lab">${lab}</span>${cdv?`<span class="cd">${cdv}</span>`:''}`; b.classList.toggle('dis',!en); b.classList.toggle('ready',!!en&&!cdv); }
function sabLabel(s){ return {lights:'Fix Lights',comms:'Comms Sabotaged',reactor:'Reactor Meltdown',seismic:'Seismic Stabilizers',o2:'Oxygen Depleted'}[s.k]||s.k; }
function abilityInfo(){
  const me=G.me; if(!me) return null; const dead=amDead(); const cd=me.ab, R=G.settings.roles[me.role]||{};
  switch(me.role){
    case 'shapeshifter': if(dead) return null; return me.shift?{ico:'shift',lab:'REVERT',ok:true}:{ico:'shift',lab:'SHIFT',ok:cd<=0,cd,max:R.cd};
    case 'phantom': if(dead) return null; return me.invis?{ico:'ghost',lab:'APPEAR',ok:true}:{ico:'ghost',lab:'VANISH',ok:cd<=0&&me.vent==null,cd,max:R.cd};
    case 'tracker': if(dead) return null; return {ico:'track',lab:'TRACK',ok:cd<=0&&!!nearestPlayer(3.2,p=>!p.g),cd,max:(R.cd||25)+(R.dur||15)};
    case 'scientist': if(dead) return null; return {ico:'vitals',lab:`VITALS ${Math.ceil(me.bat||0)}s`,ok:cd<=0&&me.bat>0,cd,max:R.cd};
    case 'guardian': if(!dead) return null; return {ico:'shield',lab:'PROTECT',ok:cd<=0&&!!nearestPlayer(3.5,p=>!p.g),cd,max:R.cd};
  } return null;
}
function doUse(){
  const u=G.near&&G.near.use; if(!u) return; SFX.click();
  if(u.k==='customize') return openCustomize();
  if(u.k==='button'){ if(G.me.ml>0&&G.bc<=0) send({t:'btn'}); return; }
  if(u.k==='task') return openTask(u.ti);
  if(u.k==='admin') return openAdmin(); if(u.k==='cams') return openCams(); if(u.k==='vitals') return openVitals(false);
  if(u.k==='sab') return openSabFix(u);
}
function doReport(){ const b=G.near&&G.near.report; if(b) send({t:'report',id:b.i}); }
function doKill(){ const k=G.near&&G.near.kill; if(k&&G.me.kc<=0) send({t:'kill',id:k}); }
function doVent(){ if(G.me.vent!=null){ send({t:'vent',a:'out'}); SFX.vent(); return; } if(G.near&&G.near.vent){ send({t:'vent',a:'in'}); SFX.vent(); closeModal(); } }
function doAbility(){
  const me=G.me, ab=abilityInfo(); if(!ab||!ab.ok) return;
  if(me.role==='shapeshifter'){ if(me.shift) send({t:'ab',k:'unshift'}); else openShiftPicker(); }
  else if(me.role==='phantom') send({t:'ab',k:me.invis?'appear':'vanish'});
  else if(me.role==='tracker'){ const id=nearestPlayer(3.2,p=>!p.g); if(id) send({t:'ab',id}); }
  else if(me.role==='guardian'){ const id=nearestPlayer(3.5,p=>!p.g); if(id) send({t:'ab',id}); }
  else if(me.role==='scientist') openVitals(true);
}
/* ---------- modal system ---------- */
function openModal(o){
  closeModal(); const M=$('#modal'); M.className='modal '+(o.cls||''); $('#mTitle').textContent=o.title||''; const body=$('#mBody'); body.innerHTML='';
  G.modal={kind:o.kind,block:o.block!==false,onClose:o.onClose,cleanup:null}; show(M,true); G.modal.cleanup=o.build(body)||null;
}
function closeModal(){ const m=G.modal; if(!m) return; G.modal=null; try{m.cleanup&&m.cleanup();}catch(e){} try{m.onClose&&m.onClose();}catch(e){} show('#modal',false); $('#mBody').innerHTML=''; }
function openTask(ti){
  const tk=G.me.tasks[ti]; if(!tk) return; const def=TASKDEF[tk.type]; let type=tk.type;
  if(tk.stage>0&&def.chain) type=def.chain;
  const nm=def.stageName?def.stageName[Math.min(tk.stage,1)]:def.name;
  if(def.visual&&G.settings.visual) send({t:'anim',k:tk.type});
  openModal({kind:'task',title:nm,cls:'task',build:body=>{ const root=h('div',{class:'mg'}); body.append(root);
    return MG[type](root,()=>{ send({t:'task',ti}); SFX.ok(); setTimeout(closeModal,250); },{}); }, onClose:()=>{ if(def.visual) send({t:'anim',k:null}); }});
}
function openSabFix(u){
  const s=G.sab; if(!s) return; let ctx={};
  if(u.s==='crit') ctx={st:u.st,hold:on=>send({t:'hold',st:u.st,on})};
  if(u.s==='o2') ctx={code:s.code};
  if(u.s==='lights') ctx={sw:s.sw};
  openModal({kind:'sab',title:sabLabel(s),cls:'task',build:body=>{ const root=h('div',{class:'mg'}); body.append(root);
    return MG[u.s](root,()=>{ if(u.s==='o2') send({t:'fix',k:'o2',st:u.st}); else if(u.s!=='crit') send({t:'fix',k:u.s}); setTimeout(closeModal,200); },ctx); }});
}
function openShiftPicker(){
  openModal({kind:'shift',title:'Shapeshift into…',build:body=>{ const g=h('div',{class:'pgrid'});
    G.roster.forEach(r=>{ if(r.id===G.pid||r.left||r.spec||G.kd.has(r.id)) return; const b=h('button',{type:'button',class:'pcard'},crewCanvas(r.cos,56),h('span',null,r.name));
      b.addEventListener('click',()=>{ send({t:'ab',k:'shift',id:r.id}); closeModal(); }); g.append(b); }); body.append(g); }});
}
function minimap(body,opts){
  const m=G.map; const wrap=h('div',{class:'mapwrap'}); const cv=h('canvas',{class:'mapcv'}); wrap.append(cv); body.append(wrap);
  const mc=getMapCanvas(G.mapIdx); let on=true;
  const geo=()=>{ const r=wrap.getBoundingClientRect(); const W=Math.max(50,r.width), H=Math.max(50,r.height); const s=Math.min(W/m.w,H/m.h); return {W,H,s,ox:(W-m.w*s)/2,oy:(H-m.h*s)/2}; };
  const draw=()=>{ if(!on) return; const {W,H,s,ox,oy}=geo(); const dpr=Math.min(2,devicePixelRatio||1);
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px'; }
    const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
    c.globalAlpha=0.9; c.drawImage(mc,ox,oy,m.w*s,m.h*s); c.globalAlpha=1;
    c.fillStyle='rgba(10,25,50,.35)'; c.fillRect(ox,oy,m.w*s,m.h*s);
    c.font=`800 ${Math.max(9,s*0.7)}px ${FONT_UI}`; c.textAlign='center';
    m.roomList.forEach(R=>{ c.lineWidth=3; c.strokeStyle='rgba(0,0,0,.85)'; const x=ox+(R.x+R.w/2)*s, y=oy+(R.y+1.1)*s; c.strokeText(R.name,x,y); c.fillStyle='#fff'; c.fillText(R.name,x,y); });
    opts.draw&&opts.draw(c,s,ox,oy);
    requestAnimationFrame(draw); };
  requestAnimationFrame(draw);
  cv.addEventListener('pointerdown',e=>{ if(!opts.click) return; const r=cv.getBoundingClientRect(); const {s,ox,oy}=geo(); opts.click((e.clientX-r.left-ox)/s,(e.clientY-r.top-oy)/s); });
  return ()=>on=false;
}
function openMap(sabo){
  const imp=amImp()&&!G.me.spec; sabo=sabo&&imp;
  openModal({kind:'map',title:sabo?'Sabotage':G.map.name,block:false,cls:'map',build:body=>{
    if(sabo){ const bar=h('div',{class:'sabbar'}); const m=G.map; const add=(k,lab,ico)=>{ const b=h('button',{type:'button',class:'btn sab',html:ICO(ico)+' '+lab}); b.addEventListener('click',()=>{ send({t:'sabo',k}); SFX.sab(); closeModal(); }); bar.append(b); };
      if(m.sab.lights) add('lights','Lights','bulb'); if(m.sab.comms) add('comms','Comms','dish'); if(m.critical) add(m.critical,m.critical==='seismic'?'Seismic':'Reactor','sabo'); if(m.sab.o2) add('o2','Oxygen','o2');
      bar.append(h('span',{class:'dim small'},m.doorRooms.length?'Tap a red door on the map to lock it':'')); body.append(bar); }
    return minimap(body,{draw:(c,s,ox,oy)=>{ const t=performance.now()/1000; const me=G.me;
        if(me.team==='crew') (me.tasks||[]).forEach(tk=>{ if(tk.done) return; const st=G.map.stations[tk.st]; if(!st) return; c.fillStyle='#ffe600'; c.shadowColor='#ffe600'; c.shadowBlur=8; c.beginPath(); c.arc(ox+st.x*s,oy+st.y*s,Math.max(3,s*0.35),0,7); c.fill(); c.shadowBlur=0; });
        if(G.sab) sabPoints().forEach(p=>{ c.fillStyle=`rgba(255,60,60,${0.6+0.4*Math.sin(t*8)})`; c.beginPath(); c.arc(ox+p[0]*s,oy+p[1]*s,Math.max(4,s*0.5),0,7); c.fill(); });
        if(me.track){ c.fillStyle='#4fc3f7'; c.beginPath(); c.arc(ox+me.track.x*s,oy+me.track.y*s,Math.max(4,s*0.45),0,7); c.fill(); }
        if(sabo){ G.map.doorRooms.forEach(r=>{ const R=G.map.roomList[r]; const x=ox+(R.x+R.w/2)*s, y=oy+(R.y+R.h/2)*s+s; const closed=G.doors.has(r); c.fillStyle=closed?'#777':'#e74c3c'; rr(c,x-s*0.9,y-s*0.6,s*1.8,s*1.2,4); c.fill();
          c.strokeStyle='#fff'; c.lineWidth=2; c.strokeRect(x-s*0.3,y-s*0.45,s*0.6,s*0.9); c.fillStyle='#fff'; c.beginPath(); c.arc(x+s*0.15,y,s*0.07,0,7); c.fill(); }); }
        const col=COLORS[rosterCos(G.pid).color][1]; c.fillStyle=col; c.strokeStyle='#fff'; c.lineWidth=2; c.beginPath(); c.arc(ox+G.local.x*s,oy+G.local.y*s,Math.max(4,s*0.5)*(1+0.15*Math.sin(t*5)),0,7); c.fill(); c.stroke(); },
      click:sabo?(x,y)=>{ const r=G.map.doorRooms.find(r=>{ const R=G.map.roomList[r]; const cx=R.x+R.w/2, cy=R.y+R.h/2+1; return Math.abs(x-cx)<1.3&&Math.abs(y-cy)<1; }); if(r!=null){ send({t:'sabo',k:'doors',room:r}); SFX.sab(); } }:null});
  }});
}
function openAdmin(){
  send({t:'panel',k:'admin'});
  openModal({kind:'admin',title:'Admin Map',cls:'map',build:body=>minimap(body,{draw:(c,s,ox,oy)=>{
      if(G.sab&&G.sab.k==='comms'){ c.fillStyle='rgba(0,0,0,.6)'; c.fillRect(0,0,9999,9999); c.fillStyle='#ff6b6b'; c.font=`800 22px ${FONT_UI}`; c.fillText('COMMS DISABLED',c.canvas.width/4,c.canvas.height/4); return; }
      const a=G.me.adm||{}; Object.entries(a).forEach(([r,n])=>{ const R=G.map.roomList[r]; if(!R) return; for(let i=0;i<n;i++){ c.fillStyle='#ffe600'; c.strokeStyle='#000'; c.lineWidth=1.5; c.beginPath(); c.arc(ox+(R.x+1+((i%6)*1.1))*s,oy+(R.y+2.2+Math.floor(i/6)*1.1)*s,Math.max(3,s*0.4),0,7); c.fill(); c.stroke(); } }); }}),
    onClose:()=>send({t:'panel',k:null})});
}
function openVitals(portable){
  send({t:'panel',k:'vitals',port:portable?1:0});
  openModal({kind:'vitals',title:portable?'Vitals (portable)':'Vitals',build:body=>{ const g=h('div',{class:'vgrid'}); body.append(g); let on=true;
    const up=()=>{ if(!on) return; if(G.sab&&G.sab.k==='comms'&&!amDead()){ g.innerHTML='<div class="dim">COMMS DISABLED</div>'; return setTimeout(up,300); }
      const v=G.me.vit||[]; const key=JSON.stringify(v)+(portable?Math.ceil(G.me.bat||0):''); if(g._k!==key){ g._k=key; g.innerHTML=''; v.forEach(([id,st])=>{ const r=G.roster.get(id); if(!r) return; const c=h('div',{class:'vcard '+(st===0?'ok':st===1?'dead':'dc')},crewCanvas(r.cos,40),h('div',null,h('b',null,r.name),h('div',{class:'vline'},st===0?'OK':st===1?'DEAD':'D/C')));
        if(st===0) c.querySelector('.vline').innerHTML='<svg viewBox="0 0 100 20" class="ekg"><polyline points="0,10 30,10 36,2 42,18 48,10 100,10"/></svg>'; g.append(c); });
        if(portable) g.append(h('div',{class:'dim'},`Battery: ${Math.ceil(G.me.bat||0)}s`)); }
      if(portable&&(G.me.bat||0)<=0){ closeModal(); return; } setTimeout(up,250); }; up(); return ()=>on=false; },
    onClose:()=>send({t:'panel',k:null})});
}
function openCams(){
  openModal({kind:'cams',title:'Security',cls:'wide',build:body=>{ const g=h('div',{class:'camgrid'}); body.append(g); const cams=G.map.cams||[];
    const cvs=cams.map((cm,i)=>{ const cv=h('canvas',{class:'camcv'}); const R=G.map.roomList[G.map.roomAt(cm[0],cm[1])]; g.append(h('div',{class:'cam'},cv,h('span',null,R?R.name:'Hall '+(i+1)))); return cv; });
    let on=true; const draw=()=>{ if(!on) return; cvs.forEach((cv,i)=>{ const r=cv.getBoundingClientRect(); if(cv.width!==Math.round(r.width)){cv.width=r.width;cv.height=r.height;} const c=cv.getContext('2d');
      if(G.sab&&G.sab.k==='comms'){ const id=c.createImageData(cv.width,cv.height); for(let k=0;k<id.data.length;k+=4){const v=Math.random()*255;id.data[k]=id.data[k+1]=id.data[k+2]=v;id.data[k+3]=255;} c.putImageData(id,0,0); return; }
      renderWorld(c,cams[i][0],cams[i][1],cv.height/9,cv.width,cv.height,{fog:false}); c.fillStyle='rgba(120,255,160,.05)'; for(let y=0;y<cv.height;y+=3) c.fillRect(0,y,cv.width,1); c.fillStyle='#e74c3c'; c.beginPath(); c.arc(12,12,5,0,7); c.fill(); }); requestAnimationFrame(draw); };
    requestAnimationFrame(draw); return ()=>on=false; }});
}
/* ---------- customize ---------- */
function openCustomize(){
  const cos={...myCos()}; let tab='color';
  openModal({kind:'cust',title:'Wardrobe',cls:'wide',build:body=>{
    const prev=h('canvas',{class:'prev'}); const name=h('input',{class:'inp',maxlength:12,value:myName(),placeholder:'Name'});
    const tabs=h('div',{class:'tabs'}); const grid=h('div',{class:'cgrid'});
    body.append(h('div',{class:'custwrap'},h('div',{class:'custL'},prev,name),h('div',{class:'custR'},tabs,grid)));
    const T={color:['Color',COLORS.length],hat:['Hat',HATS.length],visor:['Visor',VISORS.length],outfit:['Outfit',OUTFITS.length],pet:['Pet',PETS.length]};
    const taken=new Set([...G.roster.values()].filter(r=>r.id!==G.pid&&!r.left).map(r=>r.cos.color));
    const fill=()=>{ tabs.innerHTML=''; Object.entries(T).forEach(([k,[lab]])=>{ const b=h('button',{type:'button',class:'tab'+(k===tab?' on':'')},lab); b.addEventListener('click',()=>{tab=k;fill();}); tabs.append(b); });
      grid.innerHTML=''; for(let i=0;i<T[tab][1];i++){ const c2={...cos,[tab]:i}; const labTxt=tab==='color'?COLORS[i][0]:tab==='hat'?HATS[i]:tab==='visor'?VISORS[i]:tab==='outfit'?OUTFITS[i]:PETS[i];
        const cell=h('button',{type:'button',class:'citem'+(cos[tab]===i?' on':'')+(tab==='color'&&taken.has(i)&&G.screen==='game'?' taken':''),title:labTxt});
        if(tab==='color') cell.style.setProperty('--sw',COLORS[i][1]);
        if(tab==='pet'){ const cv=document.createElement('canvas'); cv.width=cv.height=120; cv.style.width=cv.style.height='60px'; const cc=cv.getContext('2d'); if(i) drawPet(cc,60,100,80,i,COLORS[cos.color],0); else { cc.fillStyle='#888'; cc.font='40px sans-serif'; cc.textAlign='center'; cc.fillText('∅',60,75);} cell.append(cv); }
        else cell.append(crewCanvas(c2,60)); cell.append(h('span',null,labTxt));
        cell.addEventListener('click',()=>{ if(tab==='color'&&taken.has(i)&&G.screen==='game') return SFX.err(); cos[tab]=i; SFX.click(); save(); fill(); }); grid.append(cell); } };
    const save=()=>{ saveProfile(name.value,cos); if(G.screen==='game') send({t:'cos',cos,name:cleanName(name.value)}); };
    name.addEventListener('change',save);
    let on=true; const dpr=Math.min(2,devicePixelRatio||1); prev.width=200*dpr; prev.height=220*dpr; const pc=prev.getContext('2d'); pc.scale(dpr,dpr);
    const anim=()=>{ if(!on) return; const t=performance.now()/1000; pc.clearRect(0,0,200,220);
      const g=pc.createRadialGradient(100,190,5,100,190,90); g.addColorStop(0,'rgba(120,200,255,.35)'); g.addColorStop(1,'rgba(120,200,255,0)'); pc.fillStyle=g; pc.beginPath(); pc.ellipse(100,192,85,18,0,0,7); pc.fill();
      drawCrew(pc,92,190,130,cos,{walk:t*9,flip:Math.sin(t*0.6)<-0.7}); if(cos.pet) drawPet(pc,160,194,56,cos.pet,COLORS[cos.color],t); requestAnimationFrame(anim); }; anim();
    fill(); return ()=>{ on=false; save(); }; }});
}
function myCos(){ try{ return sanitizeCos(JSON.parse(localStorage.getItem('sus_cos'))); }catch(e){ return defaultCos(); } }
function myName(){ return localStorage.getItem('sus_name')||''; }
function saveProfile(name,cos){ localStorage.setItem('sus_name',cleanName(name)); localStorage.setItem('sus_cos',JSON.stringify(cos)); }
/* ---------- settings ---------- */
function openSettings(){
  const S=JSON.parse(JSON.stringify(G.settings)); const ed=G.isHost&&G.phase==='lobby';
  openModal({kind:'settings',title:ed?'Game Settings':'Game Rules',cls:'wide',build:body=>{
    const f=h('div',{class:'sets'}); body.append(f);
    const row=(lab,ctrl)=>f.append(h('label',{class:'srow'},h('span',null,lab),ctrl));
    const num=(k,min,max,step,suf='',obj=S)=>{ const wrap=h('div',{class:'stepper'}); const v=h('b',null,''); const upd=()=>v.textContent=(+obj[k]).toFixed(step<1?2:0).replace(/\.00$/,'')+suf;
      const mk=(d,t)=>{ const b=h('button',{type:'button',class:'sbtn2'},t); b.disabled=!ed; b.addEventListener('click',()=>{ obj[k]=clamp(+(obj[k]+d).toFixed(2),min,max); upd(); commit(); }); return b; }; wrap.append(mk(-step,'−'),v,mk(step,'+')); upd(); return wrap; };
    const sel=(k,opts,obj=S)=>{ const s=h('select',{class:'inp'}); opts.forEach(([v,l])=>{ const o=h('option',{value:v},l); if(String(obj[k])===String(v)) o.selected=true; s.append(o); }); s.disabled=!ed; s.addEventListener('change',()=>{ obj[k]=isNaN(+s.value)||s.value===''?s.value:+s.value; commit(); }); return s; };
    const chk=k=>{ const c=h('input',{type:'checkbox',class:'tog'}); c.checked=!!S[k]; c.disabled=!ed; c.addEventListener('change',()=>{S[k]=c.checked;commit();}); return c; };
    const commit=()=>{ if(ed) send({t:'set',settings:S}); };
    f.append(h('h4',null,'Map'));
    const mg=h('div',{class:'mapsel'}); [[-1,'Random','Surprise everyone']].concat(GAME_MAPS.map((m,i)=>[i,m.name,m.desc||''])).forEach(([v,l,d])=>{ const b=h('button',{type:'button',class:'mapopt'+(S.map===v?' on':'')});
      if(v>=0){ const mc=getMapCanvas(v+1,8); const cv=document.createElement('canvas'); cv.width=200; cv.height=124; const c=cv.getContext('2d'); const m=MAPS[v+1]; const s=Math.min(200/m.w,124/m.h); c.fillStyle=m.theme.bg; c.fillRect(0,0,200,124); c.drawImage(mc,(200-m.w*s)/2,(124-m.h*s)/2,m.w*s,m.h*s); b.append(cv);} else b.append(h('div',{class:'rnd'},'?'));
      b.append(h('b',null,l),h('small',null,d)); b.disabled=!ed; b.addEventListener('click',()=>{ S.map=v; commit(); [...mg.children].forEach(x=>x.classList.remove('on')); b.classList.add('on'); }); mg.append(b); }); f.append(mg);
    f.append(h('h4',null,'Players'));
    row('Impostors',num('imp',1,3,1)); row('Kill Cooldown',num('killCd',10,60,2.5,'s')); row('Kill Distance',sel('killDist',[[0,'Short'],[1,'Medium'],[2,'Long']]));
    row('Player Speed',num('speed',0.5,3,0.25,'x')); row('Crewmate Vision',num('crewVision',0.25,5,0.25,'x')); row('Impostor Vision',num('impVision',0.25,5,0.25,'x'));
    f.append(h('h4',null,'Meetings'));
    row('Emergency Meetings',num('meetings',0,9,1)); row('Emergency Cooldown',num('btnCd',0,60,5,'s')); row('Discussion Time',num('discuss',0,120,15,'s')); row('Voting Time',num('vote',15,300,15,'s'));
    row('Anonymous Votes',chk('anon')); row('Confirm Ejects',chk('confirm'));
    f.append(h('h4',null,'Tasks'));
    row('Task Bar Updates',sel('taskbar',[['always','Always'],['meetings','Meetings'],['never','Never']])); row('Common Tasks',num('common',0,2,1)); row('Long Tasks',num('long',0,3,1)); row('Short Tasks',num('short',0,5,1)); row('Visual Tasks',chk('visual'));
    f.append(h('h4',null,'Voice chat'));
    row('Voice Mode',sel('voice',[['proximity','Proximity (hear nearby)'],['global','Everyone, always'],['meetings','Meetings only'],['off','Off']]));
    f.append(h('h4',null,'Roles'));
    SPECIAL_ROLES.forEach(r=>{ const R=ROLES[r]; const box=h('div',{class:'rolebox '+R.team}); box.append(h('div',{class:'rname'},h('b',null,R.name),h('span',{class:'rteam'},R.team==='imp'?'Impostor':'Crewmate'),h('div',{class:'dim small'},R.desc)));
      const ctr=h('div',{class:'rctl'}); const sub=S.roles[r]; ctr.append(h('span',{class:'small'},'Count'),num('n',0,3,1,'',sub),h('span',{class:'small'},'Chance'),num('ch',0,100,10,'%',sub));
      Object.entries(R.opt||{}).forEach(([k,o])=>ctr.append(h('span',{class:'small'},o[0]),num(k,o[2],o[3],o[4],k==='imp'||k==='tasks'?'':'s',sub))); box.append(ctr); f.append(box); });
    if(ed){ const rs=h('button',{type:'button',class:'btn'},'Reset to defaults'); rs.addEventListener('click',()=>{ send({t:'set',settings:defaultSettings()}); closeModal(); }); f.append(rs); }
  }});
}
function openMenu(){
  openModal({kind:'menu',title:'Menu',build:body=>{
    const col=h('div',{class:'menu'}); body.append(col);
    col.append(h('div',{class:'codecard'},h('span',{class:'dim'},'ROOM CODE'),h('b',null,G.code)));
    const sl=(lab,v,fn)=>{ const r=h('input',{type:'range',min:0,max:1,step:0.05,value:v}); r.addEventListener('input',()=>fn(+r.value)); col.append(h('label',{class:'srow'},h('span',null,lab),r)); };
    sl('Sound effects',SFX.vol,v=>SFX.setVol(v)); if(!LOCAL) sl('Voice volume',Voice.vol,v=>Voice.setVol(v));
    const b=(t,fn,cls='')=>{ const x=h('button',{type:'button',class:'btn '+cls,html:t}); x.addEventListener('click',fn); col.append(x); };
    b(ICO('link')+' Copy invite link',()=>shareLink());
    b(ICO('full')+' Fullscreen',()=>toggleFS());
    { const c=h('input',{type:'checkbox',class:'tog'}); c.checked=PostFX.enabled; c.disabled=!PostFX.gl; c.addEventListener('change',()=>PostFX.set(c.checked)); col.append(h('label',{class:'srow'},h('span',null,'Cinematic effects (bloom, lens, grading)'),c)); }
    b(ICO('gear')+' '+(G.isHost&&G.phase==='lobby'?'Game Settings':'Game Rules'),()=>openSettings());
    if(G.isHost){ const pl=h('div',{class:'plist'}); col.append(h('h4',null,'Players'),pl);
      G.roster.forEach(r=>{ if(r.left) return; const row=h('div',{class:'prow'},crewCanvas(r.cos,32),h('span',null,r.name+(r.host?' (host)':'')+(r.bot?' · bot':'')+(!r.on&&!r.bot?' ⚠':'')));
        if(r.id!==G.pid){ const k=h('button',{type:'button',class:'btn small'},'Kick'); k.addEventListener('click',()=>{ send({t:'kick',id:r.id}); row.remove(); }); row.append(k);} pl.append(row); }); }
    b(ICO('exit')+' '+(G.isHost?'End room & leave':'Leave game'),()=>{ if(confirm(G.isHost?'End the room for everyone?':'Leave this game?')) leaveGame(); },'danger');
  }});
}
function toggleFS(){ const d=document; if(!d.fullscreenElement){ (d.documentElement.requestFullscreen||d.documentElement.webkitRequestFullscreen||(()=>{})).call(d.documentElement); try{screen.orientation.lock('landscape').catch(()=>{});}catch(e){} } else (d.exitFullscreen||d.webkitExitFullscreen).call(d); }
function shareLink(){ const url=inviteUrl(); if(navigator.share&&IS_TOUCH){ navigator.share({title:'Join my Sus Station game',text:`Room ${G.code}`,url}).catch(()=>{}); return; }
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Invite link copied!')).catch(()=>{ prompt('Copy this link:',url); }); }
function inviteUrl(){ const u=new URL(location.href); u.search=''; u.hash=''; u.searchParams.set('room',G.code); if(LOCAL) u.searchParams.set('local','1'); return u.toString(); }
function toast(msg,ms=2200){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),ms); }
/* ---------- chat ---------- */
function toggleChat(force){ const p=$('#chatPanel'); const on=force!=null?force:p.classList.contains('hidden'); show(p,on); if(on){ G.unread=0; renderChat(); setTimeout(()=>$('#chatIn').focus({preventScroll:true}),50);} }
function addChat(m){ G.chat.push(m); if(G.chat.length>100) G.chat.shift(); const open=!$('#chatPanel').classList.contains('hidden')||G.phase==='meeting'; if(!open&&m.from!==G.pid) G.unread++; renderChat(); if(m.from!==G.pid) SFX.beep(880,0.05); }
function renderChat(){ const html=G.chat.map(m=>{ const r=G.roster.get(m.from); const c=r?COLORS[r.cos.color][1]:'#aaa';
    return `<div class="cm ${m.from===G.pid?'mine':''} ${m.ghost?'ghost':''}"><span class="cdot" style="background:${c}"></span><b>${esc(r?r.name:'?')}</b>${m.ghost?' · ghost':''}<div>${esc(m.text)}</div></div>`; }).join('');
  ['#chatLog','#mtChatLog'].forEach(s=>{ const e=$(s); if(e&&e._h!==html){ e.innerHTML=html; e._h=html; e.scrollTop=1e9; } }); }
/* ---------- cinematic screens ---------- */
function fx(node,ms,cls=''){ const f=$('#fx'); f.className='fx '+cls; f.innerHTML=''; if(typeof node==='string') f.innerHTML=node; else f.append(node); show(f,true); clearTimeout(f._h); if(ms) f._h=setTimeout(()=>show(f,false),ms); return f; }
function hideFx(){ show('#fx',false); }
function showIntro(e){
  closeModal(); const imp=e.team==='imp'; const role=ROLES[e.role];
  const box=h('div',{class:'intro'}); box.append(h('div',{class:'shh'},'Shhhhh!')); fx(box,0,'dark'); SFX.reveal();
  setTimeout(()=>{ box.innerHTML=''; box.className='intro '+(imp?'imp':'crew');
    const title=h('div',{class:'rtitle'},role.name); const sub=h('div',{class:'rsub'},e.role==='crewmate'?`There ${e.nimp===1?'is':'are'} ${e.nimp} Impostor${e.nimp===1?'':'s'} among us`:role.desc);
    const row=h('div',{class:'trow'}); const ids=e.mates.slice(0,15); const mi=ids.indexOf(G.pid); if(mi>0){ ids.splice(mi,1); ids.unshift(G.pid); }
    ids.forEach((id,i)=>{ const r=G.roster.get(id); if(!r) return; row.append(h('div',{class:'tm',style:`order:${i===0?0:(i%2?-i:i)};animation-delay:${0.1+i*0.06}s`},crewCanvas(r.cos,i===0?130:88),h('span',{class:imp?'imp':''},r.name))); });
    const mp=MAPS[e.map]; box.append(title,sub,row,h('div',{class:'mapname'},mp?mp.name:'')); },1600);
  setTimeout(()=>hideFx(),6000);
}
function showKilled(by){ closeModal(); const r=G.roster.get(by), me=G.roster.get(G.pid); SFX.kill();
  const box=h('div',{class:'killed'}); const k=crewCanvas(r?r.cos:{color:0},150); const v=crewCanvas(me?me.cos:{color:0},150,{flip:true}); k.classList.add('killer'); v.classList.add('victim');
  box.append(h('div',{class:'kstage'},k,h('div',{class:'slash',html:ICO('kill')}),v),h('div',{class:'ktext'},'You were killed')); fx(box,2600,'red'); }
function showMeetingSplash(e){ closeModal(); const r=G.roster.get(e.caller); SFX.alarm();
  const box=h('div',{class:'msplash '+(e.body?'body':'emer')},h('div',{class:'mstitle'},e.body?'DEAD BODY REPORTED':'EMERGENCY MEETING'),crewCanvas(r?r.cos:{color:0},150),h('div',{class:'msub'},(r?r.name:'')+(e.body?' found '+rosterName(e.body):' called a meeting'))); fx(box,2500,'flash'); }
function showEject(ej){
  const r=ej.id&&G.roster.get(ej.id); SFX.eject();
  const box=h('div',{class:'eject'}); const stars=h('div',{class:'stars'}); for(let i=0;i<90;i++) stars.append(h('i',{style:`left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${-Math.random()*3}s;animation-duration:${1.5+Math.random()*2.5}s;transform:scale(${0.4+Math.random()*1.2})`})); box.append(stars);
  if(r){ const cv=crewCanvas(r.cos,120); cv.classList.add('floaty'); box.append(cv); }
  const txt=h('div',{class:'etext'},''); const sub=h('div',{class:'esub'},''); box.append(txt,sub); fx(box,6400,'space');
  let i=0; const full=ej.text; const iv=setInterval(()=>{ i++; txt.textContent=full.slice(0,i); if(i>=full.length){ clearInterval(iv); setTimeout(()=>sub.textContent=ej.sub||'',400);} },55);
}
function showEnd(e){
  closeModal(); toggleChat(false); const meImp=G.me&&G.me.team==='imp'; const spec=G.me&&G.me.spec; const won=(e.win==='imp')===meImp;
  if(!spec) (won?SFX.win:SFX.lose)();
  const box=h('div',{class:'end '+(e.win==='imp'?'impwin':'crewwin')}); box.append(h('div',{class:'etitle '+(spec?'':won?'win':'lose')},spec?(e.win==='imp'?'Impostors Win':'Crewmates Win'):won?'Victory':'Defeat'),h('div',{class:'ewhy'},e.why));
  const row=h('div',{class:'trow'}); const winners=[...G.roster.values()].filter(r=>!r.spec&&e.roles[r.id]&&((e.win==='imp')===e.imps.includes(r.id)));
  winners.forEach((r,i)=>row.append(h('div',{class:'tm',style:`animation-delay:${0.2+i*0.08}s`},crewCanvas(r.cos,96),h('span',{class:e.imps.includes(r.id)?'imp':''},r.name),h('small',null,ROLES[e.roles[r.id]].name))));
  box.append(row);
  const all=h('div',{class:'roles'}); [...G.roster.values()].filter(r=>e.roles[r.id]).forEach(r=>all.append(h('span',{class:e.imps.includes(r.id)?'imp':''},`${r.name} · ${ROLES[e.roles[r.id]].name}`))); box.append(all);
  const btns=h('div',{class:'ebtns'});
  if(G.isHost){ const a=h('button',{type:'button',class:'btn primary big',html:ICO('play')+' Play Again'}); a.addEventListener('click',()=>send({t:'again'})); btns.append(a); }
  else btns.append(h('div',{class:'dim'},'Waiting for the host to start the next round… you stay in the room'));
  const l=h('button',{type:'button',class:'btn',html:ICO('exit')+' Leave'}); l.addEventListener('click',()=>{ if(confirm('Leave this room?')) leaveGame(); }); btns.append(l);
  box.append(btns); fx(box,0,'endfx');
}
/* ---------- meeting ---------- */
const Meet={ sel:null,
  open(){ this.sel=null; const m=$('#meet'); show(m,true); m.innerHTML=`<div class="mt-head"><div class="mt-title">Who Is The Impostor?</div><div class="mt-timer" id="mtTimer"></div></div>
     <div class="mt-body"><div class="mt-grid" id="mtGrid"></div><div class="mt-chat" id="mtChat"><div class="clog" id="mtChatLog"></div><form id="mtForm" class="cform"><input id="mtIn" class="inp" maxlength="140" placeholder="Type a message…" autocomplete="off"><button class="btn primary">Send</button></form></div></div>
     <div class="mt-foot"><button type="button" class="btn" id="mtSkip">Skip Vote</button><button type="button" class="btn judge hidden" id="mtJudge">${ICO('gavel')} Overrule</button><button type="button" class="btn mtChatT" id="mtChatT">${ICO('chat')} Chat</button><span id="mtStatus" class="dim"></span></div>`;
    $('#mtForm').addEventListener('submit',e=>{ e.preventDefault(); const i=$('#mtIn'); if(i.value.trim()){ send({t:'chat',text:i.value}); i.value=''; } });
    $('#mtSkip').addEventListener('click',()=>this.pick('skip')); $('#mtChatT').addEventListener('click',()=>$('#meet').classList.toggle('chaton'));
    $('#mtJudge').addEventListener('click',()=>{ this.judgeMode=!this.judgeMode; $('#mtJudge').classList.toggle('on',this.judgeMode); toast(this.judgeMode?'Overrule: tap a player to eject them':'Overrule cancelled'); });
    this.judgeMode=false; renderChat(); this.render(); },
  close(){ show('#meet',false); $('#meet').innerHTML=''; $('#meet').classList.remove('chaton'); },
  pick(id){ const mt=G.mt; if(!mt||mt.st!=='vote'||amDead()||mt.my!==undefined) return;
    if(this.judgeMode&&id!=='skip'){ if(confirm(`Overrule and eject ${rosterName(id)}? If they are not an Impostor, YOU are ejected.`)){ send({t:'over',id}); this.judgeMode=false; } return; }
    if(this.sel===id){ send({t:'vote',id}); SFX.vote(); this.sel=null; } else { this.sel=id; SFX.click(); } this.render(); },
  render(){
    const mt=G.mt; if(!mt||!$('#mtGrid')) return; const g=$('#mtGrid');
    const ids=[...G.roster.values()].filter(r=>!r.spec&&(r.left?G.kd.has(r.id):true)).map(r=>r.id);
    const ordered=ids.sort((a,b)=>(G.kd.has(a)?1:0)-(G.kd.has(b)?1:0));
    const key=JSON.stringify([mt.st,mt.voted,mt.my,this.sel,mt.votes,mt.result,[...G.kd],ordered]);
    if(g._k!==key){ g._k=key; g.innerHTML='';
      ordered.forEach((id,i)=>{ const r=G.roster.get(id); if(!r) return; const dead=G.kd.has(id); const voted=mt.voted.includes(id);
        const c=h('div',{class:'vc'+(dead?' dead':'')+(this.sel===id?' sel':'')+(mt.my===id?' mine':'')+(mt.st==='res'&&mt.result===id?' out':''),style:`--c:${COLORS[r.cos.color][1]}`}); c.append(h('div',{class:'vav'},crewCanvas(r.cos,48)));
        const info=h('div',{class:'vinfo'},h('b',{class:G.me.fel&&G.me.fel.includes(id)?'imp':''},r.name+(id===G.pid?' (you)':'')));
        if(id===mt.caller) info.append(h('span',{class:'tag',html:ICO('report')})); if(voted&&mt.st!=='res') info.append(h('span',{class:'tag v'},'VOTED')); if(!r.on&&!r.bot) info.append(h('span',{class:'tag'},'⚠'));
        c.append(info);
        if(mt.st==='res'&&mt.votes){ const vs=h('div',{class:'voters'}); Object.entries(mt.votes).forEach(([vid,t])=>{ if(t===id){ const vr=G.roster.get(vid); vs.append(h('i',{style:`background:${vr&&!mt.anon?COLORS[vr.cos.color][1]:'#bbb'}`})); } }); c.append(vs); }
        if(this.sel===id&&mt.st==='vote'){ const ok=h('button',{type:'button',class:'yes'},'✔'), no=h('button',{type:'button',class:'no'},'✖'); ok.addEventListener('click',e=>{e.stopPropagation();this.pick(id);}); no.addEventListener('click',e=>{e.stopPropagation();this.sel=null;this.render();}); c.append(h('div',{class:'confirm'},ok,no)); }
        if(dead) c.append(h('div',{class:'xmark'},'✖'));
        if(!dead) c.addEventListener('click',()=>this.pick(id)); g.append(c); });
      if(mt.st==='res'&&mt.votes){ const sk=h('div',{class:'skipres'},'Skipped: '); Object.entries(mt.votes).forEach(([vid,t])=>{ if(t==='skip'){ const vr=G.roster.get(vid); sk.append(h('i',{style:`background:${vr&&!mt.anon?COLORS[vr.cos.color][1]:'#bbb'}`})); } }); g.append(sk); }
    }
    const st=mt.st==='disc'?`Discussion ${Math.ceil(mt.left)}s`:mt.st==='vote'?`Voting ends in ${Math.ceil(mt.left)}s`:mt.st==='res'?'Results':'';
    setText('#mtTimer',st); $('#mtTimer').classList.toggle('urgent',mt.st==='vote'&&mt.left<=10);
    const canVote=mt.st==='vote'&&!amDead()&&mt.my===undefined; $('#mtSkip').disabled=!canVote; $('#mtSkip').classList.toggle('sel',this.sel==='skip');
    setText('#mtSkip',this.sel==='skip'&&canVote?'Confirm Skip?':mt.my==='skip'?'Skipped':'Skip Vote');
    const j=G.me.judge; show('#mtJudge',G.me.role==='judge'&&!amDead()&&mt.st==='vote'&&j&&!j.used&&j.have>=j.need);
    setText('#mtStatus',amDead()?'You are dead — ghosts can only chat with ghosts.':mt.my!==undefined?'Vote cast. Waiting…':mt.st==='disc'?'Discuss! Voting opens soon.':mt.st==='vote'?'Tap a player, then ✔ to vote':'');
    const mi=$('#mtIn'); if(mi) mi.placeholder=amDead()?'Ghost chat…':'Type a message…';
  }
};
function onPhaseChange(prev,ph){
  if(ph!=='play'&&ph!=='lobby') closeModal();
  if(ph==='meeting'){ G.chat=[]; setTimeout(()=>{ if(G.phase==='meeting'){ hideFx(); Meet.open(); } },G.mt&&G.mt.st==='intro'?2400:0); }
  if(prev==='meeting'&&ph!=='meeting') Meet.close();
  if(ph==='eject'&&G.ej) showEject(G.ej);
  if(ph==='lobby'){ hideFx(); Meet.close(); G.chat=[]; }
  if(ph==='play'&&prev==='eject') G.chat=[];
  if(ph==='end'&&!G._endShown&&G.end){ G._endShown=true; showEnd(G.end); }
}
