/* ================= NETWORK TRANSPORTS ================= */
const PEER_PREFIX='susstation-v1-';
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
// Optional TURN server (helps strict mobile / office networks). Fill in if you have one:
// ICE.push({urls:'turn:your.turn.server:3478',username:'user',credential:'pass'});
const QS=new URLSearchParams(location.search);
const LOCAL=QS.has('local');   // ?local=1 -> BroadcastChannel transport (same-browser testing, no internet)

// Worker-driven timer: keeps running in background tabs (setInterval gets throttled there)
function makeTicker(ms,fn){
  try{ const w=new Worker(URL.createObjectURL(new Blob([`setInterval(()=>postMessage(0),${ms})`],{type:'text/javascript'})));
       w.onmessage=fn; return {stop:()=>w.terminate()}; }
  catch(e){ const h=setInterval(fn,ms); return {stop:()=>clearInterval(h)}; }
}

class PeerHost{
  constructor(h){this.h=h;this.conns=new Map();this.n=0;this.ready=false;}
  start(code){this.code=code;this._mk();}
  _mk(){
    const p=this.peer=new Peer(PEER_PREFIX+this.code,{config:{iceServers:ICE},debug:0});
    p.on('open',()=>{ if(!this.ready){this.ready=true;this.h.onReady(this.code);} this.h.onNet&&this.h.onNet('ok'); });
    p.on('connection',conn=>this._wire(conn));
    p.on('call',call=>this.h.onCall&&this.h.onCall(call));
    p.on('disconnected',()=>{ this.h.onNet&&this.h.onNet('sig'); });
    p.on('close',()=>{ if(this.dead)return; setTimeout(()=>{ if(this.peer===p) this._mk(); },2500); });
    p.on('error',e=>{
      if(e.type==='unavailable-id'){ if(!this.ready){ this.dead=true; try{p.destroy()}catch(_){}; this.h.onFail('taken'); } }
      else if(e.type==='browser-incompatible'){ this.h.onFail('browser'); }
      else if(!this.ready&&(e.type==='network'||e.type==='server-error'||e.type==='socket-error')){ this.h.onNet&&this.h.onNet('retry'); }
    });
  }
  // keep the signalling link alive without touching open data channels
  check(){ const p=this.peer; if(this.dead||!p) return; const t=Date.now();
    if(p.destroyed){ if(!this._mkT||t-this._mkT>4000){ this._mkT=t; this._mk(); } return; }
    if(p.disconnected&&(!this._rcT||t-this._rcT>3000)){ this._rcT=t; try{p.reconnect();}catch(e){} } }
  _wire(conn){ const cid=++this.n; this.conns.set(cid,conn);
    conn.on('open',()=>this.h.onConn(cid)); conn.on('data',d=>this.h.onMsg(cid,d));
    conn.on('close',()=>{this.conns.delete(cid);this.h.onClose(cid);}); conn.on('error',()=>{}); }
  send(cid,m){const c=this.conns.get(cid); if(c&&c.open){try{c.send(m);}catch(e){}}}
  drop(cid){const c=this.conns.get(cid); if(c){try{c.close();}catch(e){}} this.conns.delete(cid);}
  destroy(){this.dead=true; try{this.peer.destroy();}catch(e){}}
}
class PeerClient{
  constructor(h){this.h=h;this.last=Date.now();this.connStart=0;this.rt=null;}
  start(code){this.code=code;this._mk();}
  _mk(){
    if(this.dead) return;
    const p=this.peer=new Peer({config:{iceServers:ICE},debug:0});
    p.on('open',id=>{ this.myId=id; this.h.onPeerId&&this.h.onPeerId(id); this._connect(); });
    p.on('call',call=>this.h.onCall&&this.h.onCall(call));
    p.on('close',()=>{ if(!this.dead&&this.peer===p) setTimeout(()=>{ if(this.peer===p) this._mk(); },1500); });
    p.on('error',e=>{
      if(e.type==='peer-unavailable'){ this.h.onStatus('nohost'); this._retry(2500); }
      else if(e.type==='browser-incompatible'){ this.h.onStatus('browser'); }
      else this._retry(2000);
    });
  }
  _connect(){
    if(this.dead||!this.peer||this.peer.destroyed||this.peer.disconnected||!this.peer.open){ this.connStart=Date.now(); this._retry(1500); return; }
    if(this.conn){ const o=this.conn; this.conn=null; try{o.close();}catch(e){} }
    const c=this.conn=this.peer.connect(PEER_PREFIX+this.code,{reliable:true,serialization:'json'});
    this.connStart=Date.now(); this.last=Date.now();
    c.on('open',()=>{ if(this.conn!==c)return; this.last=Date.now(); this.h.onOpen(); });
    c.on('data',d=>{ if(this.conn!==c)return; this.last=Date.now(); this.h.onMsg(d); });
    c.on('close',()=>{ if(this.conn===c){ this.h.onStatus('down'); this._retry(800); } });
    c.on('error',()=>{});
  }
  _retry(ms){ if(this.rt) return; this.rt=setTimeout(()=>{ this.rt=null;
      if(this.dead) return;
      if(!this.peer||this.peer.destroyed){ this._mk(); return; }
      if(this.peer.disconnected){ try{this.peer.reconnect();}catch(e){} this._retry(1500); return; }
      if(this.peer.open) this._connect(); else this._retry(1500);
    },ms); }
  check(){ // watchdog: worker tick + visibility change
    const t=Date.now(); if(this.dead) return;
    if(this.peer&&this.peer.destroyed){ if(!this._mkT||t-this._mkT>4000){ this._mkT=t; this._mk(); } return; }
    if(this.peer&&this.peer.disconnected&&(!this._rcT||t-this._rcT>3000)){ this._rcT=t; try{this.peer.reconnect();}catch(e){} }
    if(this.conn&&this.conn.open&&t-this.last>9000){ this.h.onStatus('down'); this._connect(); }
    else if(this.conn&&!this.conn.open&&t-this.connStart>9000){ this._connect(); }
    else if(!this.conn&&this.peer&&this.peer.open&&t-this.connStart>4000){ this._connect(); }
  }
  isOpen(){return !!(this.conn&&this.conn.open);}
  send(m){ if(this.conn&&this.conn.open){try{this.conn.send(m);}catch(e){}} }
  destroy(){this.dead=true; try{this.conn&&this.conn.close();}catch(e){} try{this.peer.destroy();}catch(e){}}
}
/* ---------- Local (BroadcastChannel) transports for offline testing ---------- */
class LocalHost{
  constructor(h){this.h=h;this.known=new Set();}
  start(code){ this.code=code; this.bc=new BroadcastChannel('sus_'+code);
    this.bc.onmessage=e=>{const m=e.data; if(m.k==='c'){ this.known.add(m.cid); this.bc.postMessage({k:'a',cid:m.cid}); this.h.onConn(m.cid);} else if(m.k==='m'&&this.known.has(m.cid)) this.h.onMsg(m.cid,m.d); else if(m.k==='x'){ this.known.delete(m.cid); this.h.onClose(m.cid);} };
    setTimeout(()=>this.h.onReady(code),50); }
  check(){}
  send(cid,d){ if(this.known.has(cid)) this.bc.postMessage({k:'h',cid,d}); }
  drop(cid){ this.known.delete(cid); this.bc.postMessage({k:'x2',cid}); }
  destroy(){ try{this.bc.close();}catch(e){} }
}
class LocalClient{
  constructor(h){this.h=h;this.last=Date.now();this.paused=false;}
  start(code){ this.code=code; this.bc=new BroadcastChannel('sus_'+code); this.myId='L'+uid(6); this.h.onPeerId&&this.h.onPeerId(this.myId);
    this.bc.onmessage=e=>{ if(this.paused)return; const m=e.data; if(m.cid!==this.cid) return;
      if(m.k==='a'){ this.open=true; this.last=Date.now(); this.h.onOpen(); } else if(m.k==='h'){ this.last=Date.now(); this.h.onMsg(m.d);} else if(m.k==='x2'){ this.open=false; this.h.onStatus('down'); } };
    this._connect(); }
  _connect(){ if(this.cid) this.bc.postMessage({k:'x',cid:this.cid}); this.cid=uid(8); this.open=false; this.connStart=Date.now(); this.last=Date.now(); this.bc.postMessage({k:'c',cid:this.cid}); }
  check(){ if(this.paused) return; const t=Date.now(); if(this.open&&t-this.last>9000){this.h.onStatus('down');this._connect();} else if(!this.open&&t-this.connStart>3000) this._connect(); }
  isOpen(){return this.open&&!this.paused;}
  send(d){ if(this.open&&!this.paused) this.bc.postMessage({k:'m',cid:this.cid,d}); }
  destroy(){ try{this.bc.postMessage({k:'x',cid:this.cid}); this.bc.close();}catch(e){} }
  simulateDrop(ms){ this.paused=true; this.open=false; setTimeout(()=>{this.paused=false; this.h.onStatus('down'); this._connect();},ms); }
}
