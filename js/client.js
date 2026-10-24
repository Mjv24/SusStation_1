/* ================= CLIENT: state, snapshots, prediction, interactions ================= */
const G={ screen:'home', pid:null, code:null, isHost:false, host:null, net:null, roster:new Map(), settings:defaultSettings(),
  mapIdx:0, map:LOBBY, phase:'lobby', me:null, players:new Map(), bodies:[], sab:null, doors:new Set(), tb:0, mt:null, ej:null, end:null,
  local:{x:11,y:7,d:1,m:0,sq:-1,walk:0}, kd:new Set(), fx:[], alarms:[], ventAnim:{}, modal:null, lastSnap:0,
  keys:{}, joy:null, tilePx:40, cam:{x:0,y:0}, pets:new Map(), chat:[], unread:0, pingMs:0, vw:innerWidth, vh:innerHeight };

function applySnap(s){
  G.lastSnap=performance.now();
  const prevPhase=G.phase; G.phase=s.ph;
  if(s.mi!==G.mapIdx){ G.mapIdx=s.mi; G.map=MAPS[s.mi]; G.pets.clear(); G.players.clear(); Particles.reset(); }
  const me=s.me; G.me=me;
  if(me.sq!==G.local.sq){ G.local.sq=me.sq; G.local.x=me.x; G.local.y=me.y; G.local.m=0; }
  if(me.vent!=null){ G.local.x=me.x; G.local.y=me.y; }
  const seen=new Set();
  s.pl.forEach(p=>{ seen.add(p.i); let q=G.players.get(p.i);
    if(!q){ q={x:p.x,y:p.y,walk:0}; G.players.set(p.i,q); }
    if(p.i!==G.pid){ if(Math.hypot(q.x-p.x,q.y-p.y)>4){q.x=p.x;q.y=p.y;} q.tx=p.x; q.ty=p.y; }
    Object.assign(q,{id:p.i,d:p.d,m:p.m,l:p.l,g:p.g,v:p.v,sp:p.sp,an:p.an,pr:p.pr,vt:p.vt});
  });
  [...G.players.keys()].forEach(k=>{ if(!seen.has(k)) G.players.delete(k); });
  G.bodies=s.bo||[]; G.doors=new Set(s.dr||[]); G.sab=s.sab||null; G.tb=s.tb; G.bc=s.bc||0; G.kd=new Set(s.kd||[]);
  G.mt=s.mt||null; G.ej=s.ej||null; G.end=s.end||null; G.il=s.il;
  if(prevPhase!==G.phase) onPhaseChange(prevPhase,G.phase);
}
function rosterName(id){ const r=G.roster.get(id); return r?r.name:'?'; }
function rosterCos(id){ const r=G.roster.get(id); return r?r.cos:{color:0,hat:0,outfit:0,visor:0,pet:0}; }
function amDead(){ return !!(G.me&&(G.me.dead||G.me.spec)); }
function amImp(){ return !!(G.me&&G.me.team==='imp'&&G.phase!=='lobby'); }
function visionRadius(){
  const S=G.settings; let r=5.4*(amImp()?S.impVision:S.crewVision);
  if(G.phase==='lobby') r=9;
  if(G.sab&&G.sab.k==='lights'&&!amImp()) r=Math.max(1.3,r*0.28);
  return clamp(r,1.2,16);
}
let visR=5;

function canMoveNow(){
  if(!G.me||G.screen!=='game') return false;
  if(!G.isHost&&performance.now()-G.lastSnap>4500) return false;
  if(!(G.phase==='lobby'||G.phase==='play')) return false;
  if(G.me.vent!=null) return false;
  if(G.modal&&G.modal.block) return false;
  return true;
}
function inputVec(){
  let x=0,y=0; const k=G.keys;
  if(k.ArrowLeft||k.KeyA)x--; if(k.ArrowRight||k.KeyD)x++; if(k.ArrowUp||k.KeyW)y--; if(k.ArrowDown||k.KeyS)y++;
  if(G.joy&&G.joy.active){ const dx=G.joy.cx-G.joy.ox, dy=G.joy.cy-G.joy.oy, d=Math.hypot(dx,dy); if(d>6){ const m=Math.min(1,d/G.joy.r); x=dx/d*m; y=dy/d*m; } }
  const d=Math.hypot(x,y); if(d>1){x/=d;y/=d;} return [x,y];
}
function stepLocal(dt){
  const L=G.local;
  if(!canMoveNow()){ L.m=0; return; }
  const [ix,iy]=inputVec(); const ghost=amDead()&&G.phase!=='lobby';
  const sp=3.3*G.settings.speed*(ghost?1.15:1);
  if(ix||iy){
    const dx=ix*sp*dt, dy=iy*sp*dt;
    if(ghost){ L.x=clamp(L.x+dx,0.5,G.map.w-0.5); L.y=clamp(L.y+dy,0.5,G.map.h-0.5); }
    else [L.x,L.y]=moveWithCollision(G.map,L.x,L.y,dx,dy,G.doors);
    if(ix) L.d=ix<0?-1:1; L.m=1; L.walk+=dt*11;
  } else L.m=0;
}
function eyePos(){ const L=G.local; const y=L.y-0.2; return cellFree(G.map,Math.floor(L.x),Math.floor(y),G.doors)?[L.x,y]:[L.x,L.y]; }
function visibleFrom(x,y,tx,ty,R){ const dx=tx-x, dy=ty-y; return dx*dx+dy*dy<(R+0.3)*(R+0.3)&&lineOfSight(G.map,x,y,tx,ty,G.doors); }
function sabPoints(){ const m=G.map, s=G.sab; if(!s) return []; if(s.k==='lights')return [m.sab.lights]; if(s.k==='comms')return [m.sab.comms];
  if(s.k==='o2') return m.sab.o2.filter((_,i)=>!(s.done&&s.done[i])); if(s.k==='reactor'||s.k==='seismic') return m.critStations; return []; }

function nearby(){
  const L=G.local, m=G.map, me=G.me, out={use:null,report:null,kill:null,vent:null};
  if(!me) return out;
  if(G.phase==='lobby'){ const c=m.consoles.customize; if(c&&Math.hypot(c[0]-L.x,c[1]-L.y)<1.8) out.use={k:'customize'}; return out; }
  if(G.phase!=='play') return out;
  const dead=amDead(); const D=(x,y)=>Math.hypot(x-L.x,y-L.y);
  let best=null,bd=9;
  if(me.team==='crew') (me.tasks||[]).forEach((tk,i)=>{ if(tk.done) return; const st=m.stations[tk.st]; if(!st) return; const d=D(st.x,st.y); if(d<1.5&&d<bd){bd=d;best={k:'task',ti:i};} });
  if(!dead){
    if(G.sab){ const s=G.sab;
      if(s.k==='lights'||s.k==='comms'){ const p=m.sab[s.k]; const d=D(p[0],p[1]); if(d<1.6&&d<bd){bd=d;best={k:'sab',s:s.k};} }
      if(s.k==='o2') m.sab.o2.forEach((p,i)=>{ const d=D(p[0],p[1]); if(d<1.6&&d<bd&&!(s.done&&s.done[i])){bd=d;best={k:'sab',s:'o2',st:i};} });
      if(s.hold) m.critStations.forEach((p,i)=>{ const d=D(p[0],p[1]); if(d<1.6&&d<bd){bd=d;best={k:'sab',s:'crit',st:i};} });
    }
    if(m.button){ const d=D(m.button[0],m.button[1]); if(d<2.0&&d<bd){bd=d;best={k:'button'};} }
  }
  Object.entries(m.consoles||{}).forEach(([k,v])=>{ if(k==='customize') return; const d=D(v[0],v[1]); if(d<1.7&&d<bd){bd=d;best={k};} });
  out.use=best;
  if(!dead){
    const [ex,ey]=eyePos();
    let bb=null,bdd=2.3; G.bodies.forEach(b=>{ const d=D(b.x,b.y); if(d<bdd&&visibleFrom(ex,ey,b.x,b.y,visR)){bdd=d;bb=b;} }); out.report=bb;
    if(me.team==='imp'){ let kt=null,kd=KILL_DIST[G.settings.killDist]; G.players.forEach((p,id)=>{ if(id===G.pid||p.g||p.vt) return; if(me.fel&&me.fel.includes(id)) return; const d=D(p.x,p.y); if(d<kd&&visibleFrom(ex,ey,p.x,p.y,visR)){kd=d;kt=id;} }); out.kill=kt; }
    if(me.team==='imp'||me.role==='engineer'){ let vv=null,vd=1.3; m.ventList.forEach(v=>{const d=D(v.x,v.y); if(d<vd){vd=d;vv=v;}}); out.vent=vv; }
  }
  return out;
}
function nearestPlayer(range,filter){ let best=null,bd=range; G.players.forEach((p,id)=>{ if(id===G.pid||p.vt) return; if(filter&&!filter(p,id)) return; const d=Math.hypot(p.x-G.local.x,p.y-G.local.y); if(d<bd){bd=d;best=id;} }); return best; }
