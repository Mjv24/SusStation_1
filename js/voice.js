/* ================= VOICE CHAT (WebRTC mesh via PeerJS media calls) ================= */
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const Voice={ ctx:null, silentTrack:null, micStream:null, micTrack:null, micOn:false, deaf:false, vol:+(localStorage.getItem('sus_vvol')??1),
  calls:new Map(), peer:null, analyser:null, speaking:false, keep:null,
  ensureCtx(){ if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; this.ctx=new AC(); } if(this.ctx.state==='suspended') this.ctx.resume().catch(()=>{}); return this.ctx; },
  setVol(v){ this.vol=v; localStorage.setItem('sus_vvol',v); },
  localStream(){
    if(this.micTrack&&this.micTrack.readyState==='live') return new MediaStream([this.micTrack]);
    if(!this.silentTrack||this.silentTrack.readyState!=='live'){ const c=this.ensureCtx(); const d=c.createMediaStreamDestination(); const o=c.createOscillator(); const g=c.createGain(); g.gain.value=0; o.connect(g); g.connect(d); o.start(); this.silentTrack=d.stream.getAudioTracks()[0]; }
    return new MediaStream([this.silentTrack]);
  },
  attachPeer(peer){ this.peer=peer; },
  onCall(call){
    if(LOCAL||G.settings.voice==='off'){ try{call.close();}catch(e){} return; }
    const pid=call.metadata&&call.metadata.pid; if(!pid) return;
    if(this.calls.get(pid)) this.drop(pid);
    call.answer(this.localStream()); this.wire(pid,call);
  },
  wire(pid,call){
    const ent={call,pid,t:Date.now(),gain:null,el:null}; this.calls.set(pid,ent);
    call.on('stream',s=>{ if(this.calls.get(pid)!==ent||ent.el) return; this.play(ent,s); });
    call.on('close',()=>{ if(this.calls.get(pid)===ent) this.calls.delete(pid); try{ent.el&&ent.el.remove();}catch(e){} });
    call.on('error',()=>{ if(this.calls.get(pid)===ent) this.drop(pid); });
  },
  play(ent,stream){
    const el=document.createElement('audio'); el.autoplay=true; el.playsInline=true; el.srcObject=stream; el.muted=true; document.body.append(el); ent.el=el; el.play().catch(()=>{});
    if(IOS){ ent.fallback=true; try{ const c=this.ensureCtx(); const src=c.createMediaStreamSource(stream); const an=c.createAnalyser(); an.fftSize=256; src.connect(an); Object.assign(ent,{an,buf:new Uint8Array(256)}); }catch(e){} return; }
    try{ const c=this.ensureCtx(); const src=c.createMediaStreamSource(stream); const g=c.createGain(); g.gain.value=0; const an=c.createAnalyser(); an.fftSize=256;
      src.connect(g); g.connect(c.destination); src.connect(an); Object.assign(ent,{src,gain:g,an,buf:new Uint8Array(256)}); }
    catch(e){ ent.fallback=true; }
  },
  drop(pid){ const e=this.calls.get(pid); if(!e) return; this.calls.delete(pid); try{e.call.close();}catch(_){} try{e.el&&e.el.remove();}catch(_){} },
  sync(){
    if(LOCAL||!this.peer||this.peer.destroyed||!this.peer.open) return;
    if(G.settings.voice==='off'){ [...this.calls.keys()].forEach(k=>this.drop(k)); return; }
    const want=new Set();
    G.roster.forEach(r=>{ if(r.id===G.pid||r.bot||r.left||!r.peer) return; want.add(r.id);
      const e=this.calls.get(r.id); const pc=e&&e.call.peerConnection; const bad=pc&&['failed','closed'].includes(pc.iceConnectionState);
      const stale=e&&!e.gain&&!e.fallback&&Date.now()-e.t>15000;
      if(e&&!bad&&!stale&&(!e.peer||e.peer===r.peer)){ e.peer=r.peer; return; }
      if(G.pid<r.id){ if(e) this.drop(r.id); try{ const call=this.peer.call(r.peer,this.localStream(),{metadata:{pid:G.pid}}); if(call){ this.wire(r.id,call); this.calls.get(r.id).peer=r.peer; } }catch(err){} }
      else if(e&&(bad||stale)) this.drop(r.id); });
    [...this.calls.keys()].forEach(k=>{ if(!want.has(k)) this.drop(k); });
  },
  async toggleMic(){
    this.ensureCtx();
    if(!this.micTrack||this.micTrack.readyState!=='live'){
      try{ this.micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}); }
      catch(e){ toast('Microphone blocked. Allow mic access (the site must be HTTPS).',4000); return; }
      this.micTrack=this.micStream.getAudioTracks()[0]; this.micOn=true;
      try{ const c=this.ensureCtx(); const s=c.createMediaStreamSource(this.micStream); this.analyser=c.createAnalyser(); this.analyser.fftSize=256; s.connect(this.analyser); this.abuf=new Uint8Array(256); }catch(e){}
      this.calls.forEach(e=>{ const pc=e.call.peerConnection; if(!pc) return; pc.getSenders().forEach(snd=>{ if(!snd.track||snd.track.kind==='audio') snd.replaceTrack(this.micTrack).catch(()=>{}); }); });
      toast('Mic on'); return; }
    this.micOn=!this.micOn; this.micTrack.enabled=this.micOn; toast(this.micOn?'Mic on':'Mic muted');
  },
  toggleDeaf(){ this.deaf=!this.deaf; this.ensureCtx(); toast(this.deaf?'Voice muted':'Voice on'); },
  level(an,buf){ an.getByteTimeDomainData(buf); let s=0; for(let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; s+=v*v; } return Math.sqrt(s/buf.length); },
  gainFor(pid){
    const S=G.settings; if(S.voice==='off'||this.deaf) return 0; const ph=G.phase; if(!G.me) return 0;
    const r=G.roster.get(pid); if(!r) return 0;
    if(ph==='lobby'||ph==='end') return 1;
    const pp=G.players.get(pid); const theyDead=G.kd.has(pid)||r.spec||(pp&&pp.g); const iDead=amDead();
    if(ph==='meeting'||ph==='eject'||ph==='intro'){ if(theyDead) return iDead?1:0; return 1; }
    if(iDead) return theyDead?1:0.85;
    if(theyDead) return 0;
    if(S.voice==='meetings') return 0; if(S.voice==='global') return 1;
    if(!pp) return 0;
    const d=Math.hypot(pp.x-G.local.x,pp.y-G.local.y); const R=Math.max(4,visionRadius()+2);
    let g=d<2?1:d>R?0:1-(d-2)/(R-2); if(g>0&&!lineOfSight(G.map,G.local.x,G.local.y,pp.x,pp.y,G.doors)) g*=0.45; return g;
  },
  frame(){
    if(LOCAL) return;
    this.speaking=!!(this.analyser&&this.micOn&&this.level(this.analyser,this.abuf)>0.035);
    const c=this.ctx;
    this.calls.forEach((e,pid)=>{ const g=this.gainFor(pid)*this.vol;
      if(e.gain&&c) e.gain.gain.setTargetAtTime(g,c.currentTime,0.08);
      else if(e.fallback&&e.el){ if(IOS){ const m=g<0.05; if(e.el.muted!==m){ e.el.muted=m; if(!m) e.el.play().catch(()=>{}); } } else { e.el.muted=false; e.el.volume=clamp(g,0,1); } }
      if(e.an) e.talk=this.level(e.an,e.buf)>0.03&&g>0.05; });
  },
  isTalking(pid){ const e=this.calls.get(pid); return !!(e&&e.talk); },
  keepAlive(on){
    try{ const c=this.ensureCtx();
      if(on&&!this.keep){ const o=c.createOscillator(), g=c.createGain(); o.frequency.value=40; g.gain.value=0; o.connect(g); g.connect(c.destination); o.start(); this.keep={o,g}; }
      else if(!on&&this.keep){ this.keep.o.stop(); this.keep=null; } }catch(e){}
    if('mediaSession' in navigator){ try{ navigator.mediaSession.metadata=new MediaMetadata({title:'Sus Station',artist:G.code?'Room '+G.code:'Lobby'}); navigator.mediaSession.playbackState='playing'; }catch(e){} }
  },
};
let wakeLock=null;
async function requestWake(){ try{ if('wakeLock' in navigator&&document.visibilityState==='visible'&&!wakeLock){ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>wakeLock=null); } }catch(e){} }
