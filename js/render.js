/* ================= RENDERER: map art, lighting, particles, vision ================= */
const IS_TOUCH=matchMedia('(pointer:coarse)').matches;
let TSB=IS_TOUCH?44:60, TSF=1;          // baked map px per tile, and integer upscale factor to device pixels
// Choose a tile size so the baked map is drawn 1:1 (or at an exact integer scale) on screen -> no resampling shimmer
function setRenderScale(tpCss,dpr){ const D=Math.round(tpCss*dpr), cap=IS_TOUCH?48:64; TSF=Math.max(1,Math.ceil(D/cap)); const nb=Math.max(16,Math.round(D/TSF)); if(nb!==TSB){ Object.keys(mapCache).forEach(k=>{ if(!k.endsWith('_8')) delete mapCache[k]; }); } TSB=nb; return TSB*TSF/dpr; }
const mapCache={};

function roomMat(R){
  if(R.o.mat) return R.o.mat; const k=R.o.k; if(k&&k!=='in') return k;
  const n=R.name.toLowerCase();
  if(/cafeteria|mess|kitchen|office|locker/.test(n)) return 'checker';
  if(/med|lab|specimen|decon/.test(n)) return 'clean';
  if(/reactor/.test(n)) return 'hex';
  if(/admin|navigation|security|comm|sonar|weapons|shields/.test(n)) return 'tech';
  return 'plates';
}
/* ---------- baked map ---------- */
function getMapCanvas(idx,T=TSB){
  const key=idx+'_'+T; if(mapCache[key]) return mapCache[key];
  if(T===TSB) Object.keys(mapCache).forEach(k=>{ if(k.endsWith('_'+TSB)&&k!==key&&!k.startsWith('0_')) delete mapCache[k]; });
  const m=MAPS[idx], th=m.theme, W=m.w, H=m.h;
  const cv=document.createElement('canvas'); cv.width=W*T; cv.height=H*T; const c=cv.getContext('2d');
  const rng=mulberry(idx*7919+13);
  const isW=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&m.walk[y*W+x]===1;
  // corridors (map canvas is transparent outside the walkable area: the parallax backdrop shows through)
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const k=y*W+x; if(!m.walk[k]||m.room[k]>=0) continue;
    const X=x*T,Y=y*T; const g=c.createLinearGradient(X,Y,X,Y+T); g.addColorStop(0,shade(th.floor2,0.04)); g.addColorStop(1,shade(th.floor2,-0.06)); c.fillStyle=g; c.fillRect(X,Y,T,T);
    c.fillStyle='rgba(0,0,0,.22)'; for(let i=1;i<4;i++) c.fillRect(X+i*T/4-0.5,Y,1,T);
    c.fillStyle='rgba(255,255,255,.05)'; c.fillRect(X,Y,T,1.5); }
  (m.cors||[]).forEach(cr=>{ const horiz=cr[2]>=cr[3]; const n=horiz?cr[2]:cr[3];
    for(let i=0;i<n;i++){ const x=horiz?cr[0]+i+0.5:cr[0]+cr[2]/2, y=horiz?cr[1]+cr[3]/2:cr[1]+i+0.5; if(m.roomAt(x,y)>=0) continue;
      c.fillStyle='rgba(255,214,90,.55)'; c.beginPath(); c.arc(x*T,y*T,T*0.05,0,7); c.fill(); } });
  m.roomList.forEach(R=>drawRoomFloor(c,m,R,T,rng));
  // ambient occlusion along walls
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(!isW(x,y)) continue; const X=x*T,Y=y*T;
    if(!isW(x,y-1)){ const g=c.createLinearGradient(0,Y,0,Y+T*0.75); g.addColorStop(0,'rgba(0,0,0,.5)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(X,Y,T,T*0.75); }
    if(!isW(x,y+1)){ const g=c.createLinearGradient(0,Y+T,0,Y+T*0.7); g.addColorStop(0,'rgba(0,0,0,.3)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(X,Y+T*0.7,T,T*0.3); }
    if(!isW(x-1,y)){ const g=c.createLinearGradient(X,0,X+T*0.4,0); g.addColorStop(0,'rgba(0,0,0,.32)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(X,Y,T*0.4,T); }
    if(!isW(x+1,y)){ const g=c.createLinearGradient(X+T,0,X+T*0.6,0); g.addColorStop(0,'rgba(0,0,0,.32)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(X+T*0.6,Y,T*0.4,T); } }
  // baked ceiling light pools
  c.save(); c.globalCompositeOperation='lighter';
  m.roomList.forEach(R=>{ if(R.o.k&&R.o.k!=='in'&&R.o.k!=='pad') return; const cx=(R.x+R.w/2)*T, cy=(R.y+R.h/2)*T, r=Math.max(R.w,R.h)*0.62*T;
    const g=c.createRadialGradient(cx,cy,0,cx,cy,r); g.addColorStop(0,th.light||'rgba(180,210,255,.1)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(cx-r,cy-r,r*2,r*2); });
  c.restore();
  // door tracks
  m.doors.forEach(d=>d.cells.forEach(k=>{ const x=k%W, y=(k/W)|0; c.fillStyle='rgba(0,0,0,.28)'; c.fillRect(x*T,y*T,T,T);
    c.fillStyle='rgba(255,200,40,.5)'; for(let i=0;i<4;i++) c.fillRect(x*T+i*T/4,y*T+(isW(x,y-1)?0:T*0.05),T/8,T*0.06); }));
  // room stencils
  if(T<16) (m.props||[]).forEach(p=>drawProp(c,p[0],p[1]*T,p[2]*T,T,rng));
  if(T>=30) m.roomList.forEach(R=>{ if(R.w<6||(R.o.k&&R.o.k!=='in'&&R.o.k!=='pad')) return; c.save(); c.globalAlpha=0.07; c.fillStyle='#fff'; c.font=`700 ${T*0.62}px ${FONT_D}`; c.textAlign='center';
    c.fillText(R.name.toUpperCase(),(R.x+R.w/2)*T,(R.y+R.h-0.45)*T); c.restore(); });
  // props, stations, vents, consoles
  // Props are drawn in the depth-sorted world pass.
  m.stations.forEach(s=>drawStation(c,s.type,s.x*T,s.y*T,T));
  m.ventList.forEach(v=>drawVent(c,v.x*T,v.y*T,T,0));
  Object.entries(m.consoles||{}).forEach(([k,v])=>{ if(k==='admin') return; drawConsole(c,k,v[0]*T,v[1]*T,T); });
  if(m.sab){ ['lights','comms'].forEach(k=>{ if(m.sab[k]) drawStation(c,'sab_'+k,m.sab[k][0]*T,m.sab[k][1]*T,T); });
    (m.critStations||[]).forEach(s=>drawStation(c,'sab_crit',s[0]*T,s[1]*T,T)); (m.sab.o2||[]).forEach(s=>drawStation(c,'sab_o2',s[0]*T,s[1]*T,T)); }
  (m.cams||[]).forEach(cm=>{ c.fillStyle='#1b1f27'; c.beginPath(); c.arc(cm[0]*T,cm[1]*T-T*0.4,T*0.13,0,7); c.fill(); c.fillStyle='#ff3b3b'; c.beginPath(); c.arc(cm[0]*T+T*0.05,cm[1]*T-T*0.42,T*0.04,0,7); c.fill(); });
  mapCache[key]=cv; return cv;
}
function drawBackdrop(c,m,T,rng){
  const W=c.canvas.width,H=c.canvas.height, th=m.theme; const g=c.createLinearGradient(0,0,0,H);
  if(th.water){ g.addColorStop(0,'#05395a'); g.addColorStop(1,'#010a14'); }
  else if(th.sky){ g.addColorStop(0,'#1d3b78'); g.addColorStop(1,'#86b3e0'); }
  else if(th.fx==='snow'){ g.addColorStop(0,'#1f3346'); g.addColorStop(1,'#0e1b28'); }
  else if(th.fx==='fireflies'){ g.addColorStop(0,'#0d2a1b'); g.addColorStop(1,'#041009'); }
  else { g.addColorStop(0,'#04050d'); g.addColorStop(1,'#0b0e22'); }
  c.fillStyle=g; c.fillRect(0,0,W,H);
  const blob=(x,y,r,col)=>{ const gg=c.createRadialGradient(x,y,0,x,y,r); gg.addColorStop(0,col); gg.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=gg; c.fillRect(x-r,y-r,r*2,r*2); };
  if(th.space){
    for(let i=0;i<5;i++) blob(rng()*W,rng()*H,(6+rng()*10)*T,['rgba(120,60,200,.16)','rgba(40,120,220,.14)','rgba(220,60,140,.10)'][i%3]);
    for(let i=0;i<W*H/(T*T)*1.6;i++){ const s=rng(); c.fillStyle=`rgba(${200+rng()*55|0},${210+rng()*45|0},255,${0.35+s*0.65})`; const r=s>0.97?T*0.05:T*0.018; c.beginPath(); c.arc(rng()*W,rng()*H,r,0,7); c.fill(); }
    const px=W*0.92, py=H*0.9, pr=T*7; const pg=c.createRadialGradient(px-pr*0.4,py-pr*0.4,pr*0.1,px,py,pr); pg.addColorStop(0,'#e7a96b'); pg.addColorStop(0.6,'#9c4f3a'); pg.addColorStop(1,'#2a1420');
    c.fillStyle=pg; c.beginPath(); c.arc(px,py,pr,0,7); c.fill(); c.strokeStyle='rgba(255,220,180,.35)'; c.lineWidth=T*0.25; c.beginPath(); c.ellipse(px,py,pr*1.6,pr*0.35,-0.35,0,7); c.stroke();
  } else if(th.sky){
    for(let i=0;i<W*H/(T*T)*0.25;i++){ const x=rng()*W, y=rng()*H, r=T*(0.8+rng()*2.2); c.fillStyle=`rgba(255,255,255,${0.25+rng()*0.35})`; c.beginPath(); c.ellipse(x,y,r*1.8,r,0,0,7); c.fill(); }
  } else if(th.water){
    for(let i=0;i<8;i++){ const x=rng()*W; c.fillStyle='rgba(140,220,255,.05)'; c.beginPath(); c.moveTo(x,0); c.lineTo(x+T*3,0); c.lineTo(x+T*9,H); c.lineTo(x+T*5,H); c.closePath(); c.fill(); }
    for(let i=0;i<W*H/(T*T)*0.8;i++){ c.fillStyle=`rgba(160,230,255,${rng()*0.25})`; c.fillRect(rng()*W,rng()*H,T*0.04,T*0.04); }
    for(let i=0;i<40;i++){ const x=rng()*W,y=rng()*H; c.fillStyle='rgba(10,40,60,.6)'; c.beginPath(); c.ellipse(x,y,T*(1+rng()*2),T*(0.5+rng()),0,0,7); c.fill(); }
  } else if(th.fx==='snow'){
    for(let i=0;i<W*H/(T*T)*0.6;i++){ c.fillStyle=`rgba(220,235,255,${0.08+rng()*0.15})`; c.beginPath(); c.ellipse(rng()*W,rng()*H,T*(0.5+rng()*1.5),T*(0.3+rng()*0.6),0,0,7); c.fill(); }
  } else {
    for(let i=0;i<W*H/(T*T)*0.9;i++){ c.fillStyle=`rgba(${20+rng()*30|0},${60+rng()*50|0},${30+rng()*20|0},${0.4+rng()*0.4})`; c.beginPath(); c.arc(rng()*W,rng()*H,T*(0.5+rng()*1.3),0,7); c.fill(); }
  }
}
function drawRoomFloor(c,m,R,T,rng){
  const mat=roomMat(R), X=R.x*T, Y=R.y*T, Wp=R.w*T, Hp=R.h*T;
  const base=R.o.floor||ROOMK[R.o.k]||m.theme.floor;
  c.save(); c.beginPath(); c.rect(X,Y,Wp,Hp); c.clip();
  const g=c.createLinearGradient(X,Y,X+Wp*0.3,Y+Hp); g.addColorStop(0,shade(base,0.07)); g.addColorStop(1,shade(base,-0.09)); c.fillStyle=g; c.fillRect(X,Y,Wp,Hp);
  const each=(fn)=>{ for(let y=R.y;y<R.y+R.h;y++)for(let x=R.x;x<R.x+R.w;x++) fn(x*T,y*T,x,y); };
  switch(mat){
    case 'plates': for(let y=R.y;y<R.y+R.h;y+=2)for(let x=R.x;x<R.x+R.w;x+=2){ const px=x*T,py=y*T,s=2*T, v=(rng()-0.5)*0.06;
        c.fillStyle=v>0?`rgba(255,255,255,${v})`:`rgba(0,0,0,${-v})`; c.fillRect(px,py,s,s);
        c.fillStyle='rgba(255,255,255,.10)'; c.fillRect(px+2,py+2,s-4,1.5); c.fillRect(px+2,py+2,1.5,s-4);
        c.fillStyle='rgba(0,0,0,.28)'; c.fillRect(px+2,py+s-3,s-4,2); c.fillRect(px+s-3,py+2,2,s-4);
        c.fillStyle='rgba(0,0,0,.35)'; [[6,6],[s-6,6],[6,s-6],[s-6,s-6]].forEach(([a,b])=>{ c.beginPath(); c.arc(px+a,py+b,T*0.035,0,7); c.fill(); });
        if(rng()<0.12){ c.strokeStyle='rgba(0,0,0,.18)'; c.lineWidth=1; c.beginPath(); c.moveTo(px+s*0.2,py+s*0.3); c.lineTo(px+s*0.45,py+s*0.35); c.stroke(); } } break;
    case 'checker': each((px,py,x,y)=>{ c.fillStyle=(x+y)&1?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)'; c.fillRect(px,py,T,T); c.strokeStyle='rgba(0,0,0,.12)'; c.lineWidth=1.5; c.strokeRect(px+.75,py+.75,T-1.5,T-1.5);
        c.fillStyle='rgba(255,255,255,.04)'; c.beginPath(); c.moveTo(px,py); c.lineTo(px+T*0.5,py); c.lineTo(px,py+T*0.5); c.closePath(); c.fill(); }); break;
    case 'clean': each((px,py)=>{ c.strokeStyle='rgba(255,255,255,.22)'; c.lineWidth=1.5; c.strokeRect(px+1,py+1,T-2,T-2); c.strokeStyle='rgba(0,0,0,.12)'; c.strokeRect(px+.5,py+.5,T-1,T-1); });
      c.fillStyle='rgba(80,170,230,.18)'; c.fillRect(X,Y+Hp*0.5-T*0.15,Wp,T*0.3); break;
    case 'hex': { const r=T*0.55, hw=r*Math.sqrt(3); c.strokeStyle='rgba(0,0,0,.28)'; c.lineWidth=2;
      for(let row=-1;row<R.h/(r*1.5/T)+1;row++) for(let col=-1;col<R.w/(hw/T)+1;col++){ const cx=X+col*hw+(row&1?hw/2:0), cy=Y+row*r*1.5; c.beginPath(); for(let k=0;k<6;k++){ const a=Math.PI/6+k*Math.PI/3; c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);} c.closePath();
        c.fillStyle=rng()<0.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)'; c.fill(); c.stroke(); } break; }
    case 'tech': each((px,py)=>{ c.strokeStyle='rgba(0,0,0,.2)'; c.lineWidth=1; c.strokeRect(px+.5,py+.5,T-1,T-1);
        if(rng()<0.45){ c.strokeStyle='rgba(120,230,255,.16)'; c.lineWidth=1.5; c.beginPath(); const a=rng()*T, b=rng()*T; c.moveTo(px,py+a); c.lineTo(px+b,py+a); c.lineTo(px+b,py+T); c.stroke(); c.fillStyle='rgba(120,230,255,.3)'; c.beginPath(); c.arc(px+b,py+a,T*0.04,0,7); c.fill(); } }); break;
    case 'pad': each((px,py)=>{ for(let i=0;i<5;i++){ c.fillStyle=`rgba(0,0,0,${rng()*0.08})`; c.fillRect(px+rng()*T,py+rng()*T,T*0.2,T*0.2);} c.strokeStyle='rgba(0,0,0,.2)'; c.strokeRect(px+.5,py+.5,T-1,T-1); });
      c.save(); c.strokeStyle='rgba(255,200,40,.6)'; c.lineWidth=T*0.18; c.setLineDash([T*0.4,T*0.4]); c.strokeRect(X+T*0.3,Y+T*0.3,Wp-T*0.6,Hp-T*0.6); c.restore();
      c.strokeStyle='rgba(255,255,255,.28)'; c.lineWidth=T*0.12; c.beginPath(); c.arc(X+Wp/2,Y+Hp/2,Math.min(Wp,Hp)*0.3,0,7); c.stroke(); break;
    case 'snow': for(let i=0;i<R.w*R.h*0.5;i++){ const x=X+rng()*Wp, y=Y+rng()*Hp; const gg=c.createRadialGradient(x,y,0,x,y,T*1.5); gg.addColorStop(0,'rgba(255,255,255,.22)'); gg.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=gg; c.fillRect(x-T*1.5,y-T*1.5,T*3,T*3); }
      for(let i=0;i<R.w*R.h*6;i++){ c.fillStyle=rng()<0.5?'rgba(150,175,205,.4)':'rgba(255,255,255,.7)'; c.fillRect(X+rng()*Wp,Y+rng()*Hp,2,2); }
      for(let i=0;i<R.w*R.h*0.12;i++){ const x=X+rng()*Wp,y=Y+rng()*Hp; c.fillStyle='rgba(120,150,190,.25)'; c.beginPath(); c.ellipse(x,y,T*0.08,T*0.13,0.3,0,7); c.ellipse(x+T*0.25,y+T*0.3,T*0.08,T*0.13,0.3,0,7); c.fill(); } break;
    case 'jungle': case 'grass': for(let i=0;i<R.w*R.h*0.6;i++){ const x=X+rng()*Wp, y=Y+rng()*Hp; c.fillStyle=`rgba(${10+rng()*30|0},${50+rng()*40|0},${15+rng()*20|0},.35)`; c.beginPath(); c.ellipse(x,y,T*(0.4+rng()*0.8),T*(0.3+rng()*0.5),rng()*3,0,7); c.fill(); }
      c.lineWidth=2; for(let i=0;i<R.w*R.h*10;i++){ const x=X+rng()*Wp, y=Y+rng()*Hp; c.strokeStyle=rng()<0.5?'rgba(25,70,25,.55)':'rgba(140,200,100,.45)'; c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+2,y-T*0.1,x+rng()*6-3,y-T*(0.12+rng()*0.12)); c.stroke(); }
      for(let i=0;i<R.w*R.h*0.25;i++){ c.fillStyle=pick(['#ffd34d','#ff7ab8','#fff','#9bd2ff']); c.beginPath(); c.arc(X+rng()*Wp,Y+rng()*Hp,T*0.04,0,7); c.fill(); } break;
    case 'sand': for(let i=0;i<R.h*3;i++){ const y=Y+rng()*Hp; c.strokeStyle='rgba(150,115,60,.22)'; c.lineWidth=2; c.beginPath(); for(let x=X;x<=X+Wp;x+=T*0.5) c.lineTo(x,y+Math.sin(x/T*1.3+i)*T*0.12); c.stroke(); }
      for(let i=0;i<R.w*R.h*8;i++){ c.fillStyle=rng()<0.5?'rgba(140,105,55,.35)':'rgba(255,245,215,.45)'; c.fillRect(X+rng()*Wp,Y+rng()*Hp,2,2); } break;
    case 'reef': for(let i=0;i<R.h*3;i++){ const y=Y+rng()*Hp; c.strokeStyle='rgba(60,100,110,.25)'; c.lineWidth=2; c.beginPath(); for(let x=X;x<=X+Wp;x+=T*0.5) c.lineTo(x,y+Math.sin(x/T*1.1+i)*T*0.15); c.stroke(); }
      for(let i=0;i<R.w*R.h*6;i++){ c.fillStyle=rng()<0.5?'rgba(50,80,90,.35)':'rgba(220,240,230,.4)'; c.fillRect(X+rng()*Wp,Y+rng()*Hp,2,2); }
      for(let i=0;i<R.w*R.h*0.15;i++){ const x=X+rng()*Wp,y=Y+rng()*Hp; c.fillStyle=pick(['#f2c6a0','#e8e0d0','#d79bb5']); c.beginPath(); c.arc(x,y,T*0.08,Math.PI,0); c.fill(); } break;
  }
  c.restore();
}
function drawWalls(c,m,T,rng,isW){
  const W=m.w,H=m.h, th=m.theme; m._leds=[];
  const near=(x,y,r)=>{ for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++) if(isW(x+dx,y+dy)) return true; return false; };
  const outN=(x,y)=>{ for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){ const nx=x+dx,ny=y+dy; if(isW(nx,ny)&&m.out[ny*W+nx]) { const R=m.roomList[m.room[ny*W+nx]]; return R?R.o.k:'snow'; } } return null; };
  const cap=shade(th.wall,-0.3);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ if(isW(x,y)) continue; const n1=near(x,y,1); if(!n1&&!near(x,y,2)) continue;
    const X=x*T,Y=y*T; const kind=outN(x,y)||(n1?null:outN2(x,y));
    if(kind){ natural(c,kind,X,Y,T,rng,n1); continue; }
    if(!n1){ c.fillStyle=cap; c.globalAlpha=0.75; c.fillRect(X,Y,T,T); c.globalAlpha=1; continue; }
    c.fillStyle=cap; c.fillRect(X,Y,T,T);
    for(let i=0;i<2;i++){ c.fillStyle=`rgba(255,255,255,${rng()*0.03})`; c.fillRect(X+rng()*T,Y+rng()*T,T*0.3,T*0.3); }
    if(isW(x,y+1)){ // front face
      const fh=T*0.86, fy=Y+T-fh; const g=c.createLinearGradient(0,fy,0,Y+T); g.addColorStop(0,shade(th.wallTop,0.08)); g.addColorStop(0.35,th.wallTop); g.addColorStop(1,shade(th.wall,-0.1));
      c.fillStyle=g; c.fillRect(X,fy,T,fh);
      c.fillStyle='rgba(255,255,255,.25)'; c.fillRect(X,fy,T,2);
      c.fillStyle='rgba(0,0,0,.22)'; c.fillRect(X,fy+fh*0.42,T,2); c.fillStyle='rgba(255,255,255,.07)'; c.fillRect(X,fy+fh*0.42+2,T,1.5);
      c.fillStyle='rgba(0,0,0,.18)'; c.fillRect(X+T-1,fy,1,fh);
      const r=rng();
      if(r<0.12){ c.fillStyle='rgba(0,0,0,.35)'; rr(c,X+T*0.2,fy+fh*0.55,T*0.6,fh*0.28,3); c.fill(); c.fillStyle='rgba(255,255,255,.12)'; for(let i=0;i<3;i++) c.fillRect(X+T*0.26,fy+fh*0.6+i*fh*0.07,T*0.48,1.5); }
      else if(r<0.24){ m._leds.push([x+0.3+rng()*0.4,y+1-fh/T*0.75,pick(['#4dff9a','#ffd34d','#4fd1ff','#ff5a5a'])]); c.fillStyle='rgba(0,0,0,.4)'; rr(c,X+T*0.25,fy+fh*0.12,T*0.5,fh*0.2,3); c.fill(); }
      else if(r<0.3){ c.fillStyle='rgba(255,200,40,.5)'; for(let i=0;i<4;i++){ c.beginPath(); c.moveTo(X+i*T/4,Y+T-T*0.12); c.lineTo(X+i*T/4+T/8,Y+T-T*0.12); c.lineTo(X+i*T/4+T/4,Y+T); c.lineTo(X+i*T/4+T/8,Y+T); c.closePath(); c.fill(); } }
      c.fillStyle='rgba(0,0,0,.45)'; c.fillRect(X,Y+T-3,T,3);
    }
    c.fillStyle='rgba(255,255,255,.14)';
    if(isW(x-1,y)&&!isW(x,y+1)) c.fillRect(X,Y,2,T);
    if(isW(x+1,y)&&!isW(x,y+1)) c.fillRect(X+T-2,Y,2,T);
    if(isW(x,y-1)) c.fillRect(X,Y,T,2);
  }
  function outN2(x,y){ for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){ const nx=x+dx,ny=y+dy; if(isW(nx,ny)&&m.out[ny*W+nx]){ const R=m.roomList[m.room[ny*W+nx]]; return R?R.o.k:'snow'; } } return null; }
}
function natural(c,kind,X,Y,T,rng,inner){
  const pal={snow:['#9fb2c6','#e9f2fa','#c7d6e5'],sand:['#6f5a3a','#a88d62','#8a7350'],jungle:['#163a1c','#2f6a33','#245028'],grass:['#163a1c','#3d7a3a','#2a5a2c'],reef:['#123a4a','#2f7f87','#d0648a']}[kind]||['#333','#555','#444'];
  for(let i=0;i<(inner?4:2);i++){ const x=X+rng()*T, y=Y+rng()*T, r=T*(0.35+rng()*0.35);
    const g=c.createRadialGradient(x-r*0.3,y-r*0.4,r*0.1,x,y,r); g.addColorStop(0,pal[1]); g.addColorStop(1,pal[0]); c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,7); c.fill(); }
  if(kind==='reef'&&rng()<0.4){ c.fillStyle=pal[2]; c.beginPath(); c.arc(X+rng()*T,Y+rng()*T,T*0.15,0,7); c.fill(); }
  if((kind==='jungle'||kind==='grass')&&rng()<0.3){ c.fillStyle='#ff6fa8'; c.beginPath(); c.arc(X+rng()*T,Y+rng()*T,T*0.06,0,7); c.fill(); }
}
/* ---------- props ---------- */
function drawProp(c,k,x,y,T,rng){
  c.save(); c.lineWidth=2; c.strokeStyle='rgba(0,0,0,.45)';
  const RR=(f,a,b,w,h,r)=>{c.fillStyle=f;rr(c,a,b,w,h,r);c.fill();c.stroke();};
  const LG=(y0,y1,a,b)=>{ const g=c.createLinearGradient(0,y0,0,y1); g.addColorStop(0,a); g.addColorStop(1,b); return g; };
  switch(k){
    case 'table': c.fillStyle=LG(y-T*0.9,y+T*0.9,'#d6dee8','#8d98a8'); c.beginPath(); c.ellipse(x,y,T*1.45,T*0.9,0,0,7); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x-T*0.3,y-T*0.35,T*0.7,T*0.22,-0.2,0,7); c.fill(); break;
    case 'admintable': RR(LG(y-T*0.7,y+T*0.7,'#4a5d70','#25313d'),x-T*1.3,y-T*0.7,T*2.6,T*1.4,10); c.fillStyle='rgba(79,209,197,.55)'; rr(c,x-T*1.1,y-T*0.5,T*2.2,T,6); c.fill(); c.strokeStyle='rgba(255,255,255,.35)';
      for(let i=1;i<4;i++){c.beginPath();c.moveTo(x-T*1.1,y-T*0.5+i*T*0.25);c.lineTo(x+T*1.1,y-T*0.5+i*T*0.25);c.stroke();} break;
    case 'bed': RR('#dfe6ee',x-T*0.5,y-T*0.9,T,T*1.8,8); RR(LG(y-T*0.15,y+T*0.85,'#b5d6f2','#6f9fd0'),x-T*0.45,y-T*0.15,T*0.9,T*1.0,6); RR('#fff',x-T*0.35,y-T*0.8,T*0.7,T*0.35,6); break;
    case 'crate': RR(LG(y-T*0.45,y+T*0.45,'#b08850','#6e5130'),x-T*0.45,y-T*0.45,T*0.9,T*0.9,4); c.beginPath(); c.moveTo(x-T*0.45,y-T*0.45); c.lineTo(x+T*0.45,y+T*0.45); c.moveTo(x+T*0.45,y-T*0.45); c.lineTo(x-T*0.45,y+T*0.45); c.stroke(); break;
    case 'engine': RR(LG(y-T*1.2,y+T*1.2,'#7a8394','#3f4552'),x-T*1.6,y-T*1.2,T*3.2,T*2.4,16); c.fillStyle='#22262e'; c.beginPath(); c.arc(x-T*0.6,y,T*0.8,0,7); c.fill(); RR('#8e97a8',x+T*0.4,y-T*0.8,T*1,T*1.6,8); break;
    case 'reactorcore': c.fillStyle='#22324a'; c.beginPath(); c.arc(x,y,T*1.6,0,7); c.fill(); c.stroke(); { const g=c.createRadialGradient(x,y,2,x,y,T*1.3); g.addColorStop(0,'#e5fbff'); g.addColorStop(0.5,'#4fc3f7'); g.addColorStop(1,'#0d47a1'); c.fillStyle=g; c.beginPath(); c.arc(x,y,T*1.2,0,7); c.fill(); } break;
    case 'navdesk': RR('#3d4a63',x-T*0.6,y-T*2,T*1.2,T*4,10); c.fillStyle='rgba(98,210,255,.5)'; rr(c,x-T*0.45,y-T*1.8,T*0.9,T*3.6,8); c.fill(); break;
    case 'shieldcore': c.fillStyle='#3d4a63'; c.beginPath(); c.arc(x,y,T,0,7); c.fill(); c.stroke(); c.fillStyle='rgba(120,200,255,.7)'; for(let i=0;i<6;i++){const a=i/6*6.28; c.beginPath(); c.arc(x+Math.cos(a)*T*0.55,y+Math.sin(a)*T*0.55,T*0.22,0,7); c.fill();} break;
    case 'gun': RR('#4a5263',x-T*0.8,y-T*0.8,T*1.6,T*1.6,T*0.8); RR('#2b2f38',x-T*0.15,y-T*1.6,T*0.3,T*1.1,4); break;
    case 'panel': RR('#53514a',x-T*0.9,y-T*0.4,T*1.8,T*0.8,4); c.fillStyle='#f1c40f'; for(let i=0;i<4;i++) c.fillRect(x-T*0.7+i*T*0.42,y-T*0.15,T*0.2,T*0.3); break;
    case 'monitor': RR('#2c3340',x-T*1.2,y-T*0.5,T*2.4,T*0.9,6); c.fillStyle='#5ad'; for(let i=0;i<4;i++) c.fillRect(x-T*1.05+i*T*0.55,y-T*0.35,T*0.45,T*0.55); break;
    case 'plant': RR('#7a4c26',x-T*0.3,y,T*0.6,T*0.4,4); c.fillStyle='#3faa4f'; for(let i=0;i<5;i++){c.beginPath();c.ellipse(x+(i-2)*T*0.15,y-T*0.15,T*0.15,T*0.4,(i-2)*0.4,0,7);c.fill();} break;
    case 'locker': RR(LG(y-T*0.9,y+T*0.3,'#8293ad','#56647c'),x-T*0.45,y-T*0.9,T*0.9,T*1.2,3); c.beginPath(); c.moveTo(x,y-T*0.9); c.lineTo(x,y+T*0.3); c.stroke(); break;
    case 'labdesk': RR('#d8e1ea',x-T*1.5,y-T*0.5,T*3,T,6); ['#6cf','#f6c','#6f9'].forEach((cc,i)=>{c.fillStyle=cc;c.beginPath();c.arc(x-T*0.8+i*T*0.8,y,T*0.18,0,7);c.fill();}); break;
    case 'ship': RR(LG(y-T*1.2,y+T*1.2,'#c4cddb','#7a8597'),x-T*2.2,y-T*1.2,T*4.4,T*2.4,T*1.0); c.fillStyle='#5fc3e4'; rr(c,x+T*0.6,y-T*0.7,T*1.2,T*0.8,T*0.3); c.fill(); RR('#6c768a',x-T*2.6,y-T*0.5,T*0.6,T,4); break;
    case 'window': c.fillStyle='#071028'; rr(c,x-T*2,y-T*0.05,T*4,T*0.9,6); c.fill(); c.fillStyle='#fff'; for(let i=0;i<10;i++) c.fillRect(x-T*1.8+rng()*T*3.6,y+rng()*T*0.8,2,2); break;
    case 'bench': RR('#6c5a46',x-T*1.5,y-T*0.25,T*3,T*0.4,4); break;
    case 'specimen': c.fillStyle='rgba(120,255,200,.35)'; c.beginPath(); c.arc(x,y,T*1.4,0,7); c.fill(); c.stroke(); c.fillStyle='#8f7'; c.beginPath(); c.arc(x,y,T*0.5,0,7); c.fill(); break;
    case 'boiler': RR(LG(y-T,y+T,'#9a5e48','#5e3628'),x-T*1.2,y-T*1,T*2.4,T*2,12); c.fillStyle='#ff9f43'; c.beginPath(); c.arc(x,y,T*0.4,0,7); c.fill(); break;
    case 'rock': c.fillStyle=LG(y-T*0.55,y+T*0.55,'#8a93a3','#4c5462'); c.beginPath(); c.ellipse(x,y,T*0.8,T*0.55,0.3,0,7); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x-T*0.2,y-T*0.25,T*0.35,T*0.12,0.3,0,7); c.fill(); break;
    case 'tree': c.fillStyle='#5b3b1f'; c.fillRect(x-T*0.12,y-T*0.4,T*0.24,T*0.7); { const g=c.createRadialGradient(x-T*0.3,y-T*1.1,T*0.1,x,y-T*0.8,T*0.85); g.addColorStop(0,'#5fbf54'); g.addColorStop(1,'#1f5a23'); c.fillStyle=g; c.beginPath(); c.arc(x,y-T*0.8,T*0.8,0,7); c.fill(); } break;
    case 'pine': c.fillStyle='#4a3020'; c.fillRect(x-T*0.1,y-T*0.2,T*0.2,T*0.45); [[0.9,0],[0.7,-0.5],[0.5,-0.95]].forEach(([w,o])=>{ c.fillStyle='#1f4f3a'; c.beginPath(); c.moveTo(x-T*w,y+o*T); c.lineTo(x,y+(o-0.9)*T); c.lineTo(x+T*w,y+o*T); c.closePath(); c.fill(); c.fillStyle='rgba(240,248,255,.85)'; c.beginPath(); c.moveTo(x-T*w*0.5,y+(o-0.45)*T); c.lineTo(x,y+(o-0.9)*T); c.lineTo(x+T*w*0.5,y+(o-0.45)*T); c.closePath(); c.fill(); }); break;
    case 'palm': c.strokeStyle='#7b5a33'; c.lineWidth=T*0.2; c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+T*0.3,y-T*0.8,x+T*0.1,y-T*1.5); c.stroke(); c.fillStyle='#3a9a3e'; for(let i=0;i<5;i++){c.beginPath();c.ellipse(x+T*0.1,y-T*1.5,T*0.9,T*0.2,i*1.25,0,7);c.fill();} break;
    case 'campfire': c.fillStyle='#5a3e22'; for(let i=0;i<4;i++){c.save();c.translate(x,y);c.rotate(i*0.8);c.fillRect(-T*0.6,-T*0.08,T*1.2,T*0.16);c.restore();} c.fillStyle='#444'; for(let i=0;i<8;i++){ const a=i/8*6.28; c.beginPath(); c.arc(x+Math.cos(a)*T*0.7,y+Math.sin(a)*T*0.45,T*0.13,0,7); c.fill(); } break;
    case 'log': RR('#7b5a33',x-T*0.9,y-T*0.25,T*1.8,T*0.5,T*0.25); break;
    case 'satellite': c.fillStyle='#c9d3df'; c.beginPath(); c.ellipse(x,y,T*0.8,T*0.4,-0.6,0,7); c.fill(); c.stroke(); break;
    case 'mushroom': c.fillStyle='#e8dcc8'; c.fillRect(x-T*0.08,y-T*0.3,T*0.16,T*0.35); { const g=c.createRadialGradient(x,y-T*0.4,0,x,y-T*0.35,T*0.4); g.addColorStop(0,'#d9ff8a'); g.addColorStop(1,'#5b8f20'); c.fillStyle=g; c.beginPath(); c.ellipse(x,y-T*0.35,T*0.38,T*0.22,0,Math.PI,0); c.fill(); } break;
    case 'kelp': c.lineCap='round'; for(let i=0;i<3;i++){ c.strokeStyle=i%2?'#2f8a4a':'#3fae5a'; c.lineWidth=T*0.12; c.beginPath(); c.moveTo(x+(i-1)*T*0.2,y); c.bezierCurveTo(x+(i-1)*T*0.2-T*0.3,y-T*0.6,x+(i-1)*T*0.2+T*0.3,y-T*1.0,x+(i-1)*T*0.2,y-T*1.6); c.stroke(); } break;
    case 'coral': c.fillStyle='#ff7aa8'; for(let i=0;i<5;i++){ c.beginPath(); c.ellipse(x+(i-2)*T*0.18,y-T*0.3-Math.abs(i-2)*-T*0.05,T*0.1,T*0.45,(i-2)*0.35,0,7); c.fill(); } c.fillStyle='#ffb36b'; c.beginPath(); c.arc(x+T*0.4,y,T*0.2,0,7); c.fill(); break;
    case 'clam': c.fillStyle=LG(y-T*0.4,y+T*0.2,'#f2d9c4','#b08a7a'); c.beginPath(); c.ellipse(x,y,T*0.55,T*0.32,0,Math.PI,0); c.fill(); c.stroke(); c.fillStyle='#fff'; c.beginPath(); c.arc(x,y-T*0.05,T*0.1,0,7); c.fill(); break;
    case 'crystal': [[-0.25,0.7],[0,1],[0.25,0.6]].forEach(([o,hh])=>{ const g=c.createLinearGradient(x,y-T*hh,x,y); g.addColorStop(0,'#f2e3ff'); g.addColorStop(1,'#7b45d6'); c.fillStyle=g; c.beginPath(); c.moveTo(x+o*T-T*0.12,y); c.lineTo(x+o*T,y-T*hh); c.lineTo(x+o*T+T*0.12,y); c.closePath(); c.fill(); c.stroke(); }); break;
    case 'dome': c.strokeStyle='rgba(180,240,255,.5)'; c.lineWidth=3; c.beginPath(); c.arc(x,y,T*2.4,0,7); c.stroke(); c.fillStyle='rgba(120,220,255,.07)'; c.fill(); for(let i=0;i<6;i++){ c.beginPath(); c.moveTo(x,y); c.lineTo(x+Math.cos(i)*T*2.4,y+Math.sin(i)*T*2.4); c.stroke(); } break;
    case 'sub': RR(LG(y-T,y+T,'#ffd23f','#d08a00'),x-T*2.2,y-T*0.9,T*4.4,T*1.8,T*0.9); c.fillStyle='#7fd3ff'; [-1,0,1].forEach(i=>{ c.beginPath(); c.arc(x+i*T*1.1,y-T*0.1,T*0.32,0,7); c.fill(); c.stroke(); }); RR('#8a6400',x-T*0.4,y-T*1.4,T*0.8,T*0.6,4); break;
    case 'sonar': c.fillStyle='#0f2a1c'; c.beginPath(); c.arc(x,y,T*1.4,0,7); c.fill(); c.stroke(); c.strokeStyle='rgba(77,255,154,.45)'; c.lineWidth=1.5; [0.45,0.9,1.3].forEach(r=>{ c.beginPath(); c.arc(x,y,T*r,0,7); c.stroke(); }); break;
    case 'torpedo': RR(LG(y-T*0.35,y+T*0.35,'#c7cfda','#6c7686'),x-T*1.8,y-T*0.32,T*3.4,T*0.64,T*0.32); RR('#d64545',x+T*1.4,y-T*0.32,T*0.5,T*0.64,T*0.3); break;
    case 'tank': RR('#46505e',x-T*0.6,y-T*1.4,T*1.2,T*2.2,T*0.5); { const g=c.createLinearGradient(x-T*0.5,0,x+T*0.5,0); g.addColorStop(0,'rgba(110,240,255,.5)'); g.addColorStop(0.5,'rgba(200,255,255,.8)'); g.addColorStop(1,'rgba(60,180,220,.5)'); c.fillStyle=g; rr(c,x-T*0.45,y-T*1.2,T*0.9,T*1.8,T*0.4); c.fill(); } break;
  }
  c.restore();
}
function drawStation(c,type,x,y,T){
  c.save(); c.lineWidth=2; c.strokeStyle='rgba(0,0,0,.55)';
  let col='#3c4656', acc='#8fd3ff';
  if(type.startsWith('sab_')){ col='#4a3434'; acc=type==='sab_crit'?'#ff6b6b':'#ffd166'; }
  c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x,y-T*0.06,T*0.36,T*0.12,0,0,7); c.fill();
  const g=c.createLinearGradient(0,y-T*0.62,0,y-T*0.1); g.addColorStop(0,shade(col,0.15)); g.addColorStop(1,shade(col,-0.2)); c.fillStyle=g; rr(c,x-T*0.3,y-T*0.62,T*0.6,T*0.52,5); c.fill(); c.stroke();
  const sg=c.createLinearGradient(0,y-T*0.55,0,y-T*0.25); sg.addColorStop(0,'#fff'); sg.addColorStop(0.2,acc); sg.addColorStop(1,shade(acc,-0.4)); c.fillStyle=sg; c.globalAlpha=.85; rr(c,x-T*0.22,y-T*0.55,T*0.44,T*0.3,3); c.fill();
  c.restore();
}
function drawConsole(c,k,x,y,T){
  c.save(); c.lineWidth=2; c.strokeStyle='rgba(0,0,0,.5)';
  c.fillStyle='#2b3442'; rr(c,x-T*0.55,y-T*0.75,T*1.1,T*0.72,6); c.fill(); c.stroke();
  const acc=k==='vitals'?'#5fe39b':k==='cams'?'#6cb8ff':k==='customize'?'#ff7ad9':'#4fd1c5';
  const g=c.createLinearGradient(0,y-T*0.67,0,y-T*0.22); g.addColorStop(0,'#fff'); g.addColorStop(0.25,acc); g.addColorStop(1,shade(acc,-0.45)); c.fillStyle=g;
  rr(c,x-T*0.45,y-T*0.67,T*0.9,T*0.45,4); c.fill(); c.restore();
}
function drawVent(c,x,y,T,open){
  c.save(); c.fillStyle='#1d2129'; c.strokeStyle='#0d0f14'; c.lineWidth=2; rr(c,x-T*0.42,y-T*0.26,T*0.84,T*0.52,5); c.fill(); c.stroke();
  if(open>0){ c.fillStyle='#000'; rr(c,x-T*0.36,y-T*0.2,T*0.72,T*0.4,4); c.fill(); c.translate(0,-open*T*0.35); }
  const g=c.createLinearGradient(0,y-T*0.2,0,y+T*0.2); g.addColorStop(0,'#7a8496'); g.addColorStop(1,'#464e5c'); c.fillStyle=g; rr(c,x-T*0.36,y-T*0.2,T*0.72,T*0.4,4); c.fill(); c.strokeStyle='#2a2f38';
  for(let i=1;i<4;i++){ c.beginPath(); c.moveTo(x-T*0.36+i*T*0.18,y-T*0.17); c.lineTo(x-T*0.36+i*T*0.18,y+T*0.17); c.stroke(); }
  c.restore();
}
/* ---------- dynamic lights ---------- */
const GLOWK={reactorcore:['#56d8ff',3.2,'pulse'],specimen:['#7dffb0',2.6,'pulse'],campfire:['#ff9a3c',4.5,'fire'],navdesk:['#5fd0ff',2.2],monitor:['#5fb8ff',1.6],admintable:['#4fd1c5',2],
  shieldcore:['#8fd3ff',2.2,'pulse'],boiler:['#ff8c42',2.4,'fire'],sonar:['#4dff9a',2.4,'pulse'],tank:['#6ff0ff',1.6],crystal:['#c58bff',2.2,'pulse'],dome:['#7fe0ff',3.2],mushroom:['#b6ff6a',1.4,'pulse'],labdesk:['#9fe8ff',1.6],gun:['#ff6a6a',1.2]};
function mapGlows(m){
  if(m._glows) return m._glows; const g=[];
  (m.props||[]).forEach(p=>{ const k=GLOWK[p[0]]; if(k) g.push({x:p[1],y:p[2],c:k[0],r:k[1],k:k[2]||'',ph:Math.random()*6,kind:p[0]}); });
  m.stations.forEach(s=>g.push({x:s.x,y:s.y-0.4,c:'#8fd3ff',r:0.9,k:'flick',ph:Math.random()*6,a:0.5}));
  Object.entries(m.consoles||{}).forEach(([k,v])=>g.push({x:v[0],y:v[1]-0.45,c:k==='vitals'?'#5fe39b':k==='customize'?'#ff7ad9':'#6cb8ff',r:1.3,k:'flick',ph:Math.random()*6,a:0.7}));
  (m._leds||[]).forEach(l=>g.push({x:l[0],y:l[1],c:l[2],r:0.35,k:'blink',ph:Math.random()*6,a:1}));
  if(m.button) g.push({x:m.button[0],y:m.button[1]-0.1,c:'#ff3030',r:1.4,k:'pulse',ph:0});
  return m._glows=g;
}
const _glowS={};
function glowSprite(col){ let c=_glowS[col]; if(c) return c; c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,rgba(col,0.55)); g.addColorStop(0.4,rgba(col,0.2)); g.addColorStop(1,rgba(col,0)); x.fillStyle=g; x.fillRect(0,0,128,128); return _glowS[col]=c; }
let glowL=null;
function drawGlows(ctx,m,X,Y,tp,t,x0,y0,x1,y1){
  // all light pools are accumulated in a quarter-resolution buffer, then added to the scene in ONE blend
  const W=ctx.canvas.width/(ctx.getTransform().a||1), H=ctx.canvas.height/(ctx.getTransform().d||1), Q=4;
  if(!glowL) glowL=document.createElement('canvas'); const gw=Math.ceil(W/Q), gh=Math.ceil(H/Q); if(glowL.width!==gw||glowL.height!==gh){ glowL.width=gw; glowL.height=gh; }
  const g2=glowL.getContext('2d'); g2.setTransform(1,0,0,1,0,0); g2.clearRect(0,0,gw,gh); g2.globalCompositeOperation='lighter'; let n=0;
  for(const g of mapGlows(m)){ if(g.x<x0-g.r||g.x>x1+g.r||g.y<y0-g.r||g.y>y1+g.r) continue;
    let a=g.a||0.55; if(g.k==='pulse') a*=0.7+0.3*Math.sin(t*2+g.ph); else if(g.k==='fire') a*=0.88+0.12*Math.sin(t*3.1+g.ph)*Math.sin(t*1.7); else if(g.k==='flick') a*=0.94+0.06*Math.sin(t*1.3+g.ph); else if(g.k==='blink') a*=0.55+0.45*Math.sin(t*1.4+g.ph);
    const r=g.r*tp/Q, x=X(g.x)/Q, y=Y(g.y)/Q; g2.globalAlpha=clamp(a,0,1); g2.drawImage(glowSprite(g.c),x-r,y-r,r*2,r*2); n++; }
  if(n){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.imageSmoothingEnabled=true; ctx.drawImage(glowL,0,0,gw*Q,gh*Q); ctx.restore(); }
  // animated details
  for(const g of mapGlows(m)){ if(g.x<x0-3||g.x>x1+3||g.y<y0-3||g.y>y1+3) continue;
    if(g.kind==='campfire'){ const x=X(g.x), y=Y(g.y); for(let i=0;i<3;i++){ const h=tp*(0.9+0.25*Math.sin(t*12+i*2)), w=tp*(0.35-i*0.08); const gr=ctx.createLinearGradient(0,y-h,0,y); gr.addColorStop(0,'rgba(255,240,150,0)'); gr.addColorStop(0.4,['#ffd34d','#ff9a1f','#ff5a1a'][i]); gr.addColorStop(1,'#ff3d00');
        ctx.fillStyle=gr; ctx.beginPath(); ctx.moveTo(x-w,y); ctx.quadraticCurveTo(x-w*0.6,y-h*0.6,x+Math.sin(t*9+i)*w*0.4,y-h); ctx.quadraticCurveTo(x+w*0.6,y-h*0.6,x+w,y); ctx.closePath(); ctx.fill(); } }
    else if(g.kind==='sonar'){ const x=X(g.x), y=Y(g.y), r=tp*1.35, a=t*1.8; ctx.save(); ctx.globalCompositeOperation='lighter'; const gr=ctx.createConicGradient?ctx.createConicGradient(a,x,y):null;
        if(gr){ gr.addColorStop(0,'rgba(77,255,154,.55)'); gr.addColorStop(0.12,'rgba(77,255,154,0)'); gr.addColorStop(1,'rgba(77,255,154,0)'); ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); } ctx.restore(); }
    else if(g.kind==='reactorcore'){ const x=X(g.x), y=Y(g.y); ctx.save(); ctx.strokeStyle=`rgba(200,250,255,${0.4+0.3*Math.sin(t*3)})`; ctx.lineWidth=2; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.ellipse(x,y,tp*(0.5+i*0.3),tp*(0.2+i*0.12),t*(0.8+i*0.4),0,7); ctx.stroke(); } ctx.restore(); }
  }
}
/* ---------- ambient particles ---------- */
const Particles={ list:[], reset(){ this.list=[]; },
  run(ctx,m,X,Y,tp,dt,x0,y0,x1,y1,t){
    const fx=m.theme.fx||'dust'; const N=fx==='snow'?150:fx==='bubbles'?60:fx==='fireflies'?45:55; const L=this.list;
    const spawn=(p,top)=>{ p.x=x0+Math.random()*(x1-x0); p.y=top?(fx==='bubbles'?y1+0.5:y0-0.5):y0+Math.random()*(y1-y0); p.s=Math.random(); p.ph=Math.random()*6; p.vx=(Math.random()-0.5)*0.3; return p; };
    while(L.length<N) L.push(spawn({},false));
    const W=m.w;
    ctx.save();
    for(const p of L){
      if(fx==='snow'){ p.y+=dt*(0.7+p.s*0.9); p.x+=dt*(Math.sin(t+p.ph)*0.35+0.15); }
      else if(fx==='bubbles'){ p.y-=dt*(0.5+p.s*0.9); p.x+=Math.sin(t*2+p.ph)*dt*0.3; }
      else if(fx==='fireflies'){ p.x+=Math.sin(t*0.7+p.ph)*dt*0.5; p.y+=Math.cos(t*0.9+p.ph*1.3)*dt*0.4; }
      else { p.x+=p.vx*dt*0.4; p.y+=Math.sin(t*0.5+p.ph)*dt*0.08-dt*0.03; }
      if(p.x<x0-1||p.x>x1+1||p.y<y0-1||p.y>y1+1){ spawn(p,fx==='snow'||fx==='bubbles'); if(fx!=='snow'&&fx!=='bubbles') {} }
      const cx=p.x|0, cy=p.y|0; const k=cy*W+cx; const walk=cx>=0&&cy>=0&&cx<W&&cy<m.h&&m.walk[k]===1; const out=walk&&m.out[k]===1;
      if((fx==='snow'||fx==='fireflies')&&walk&&!out) continue;
      if(fx==='dust'&&!walk) continue;
      const x=X(p.x), y=Y(p.y);
      if(fx==='snow'){ ctx.fillStyle=`rgba(255,255,255,${0.5+p.s*0.5})`; ctx.beginPath(); ctx.arc(x,y,tp*(0.03+p.s*0.04),0,7); ctx.fill(); }
      else if(fx==='bubbles'){ ctx.strokeStyle=`rgba(190,240,255,${0.35+p.s*0.3})`; ctx.lineWidth=1.3; ctx.beginPath(); ctx.arc(x,y,tp*(0.04+p.s*0.08),0,7); ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(x-tp*0.02,y-tp*0.04,2,2); }
      else if(fx==='fireflies'){ const a=0.4+0.6*Math.max(0,Math.sin(t*2.5+p.ph)); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=a; ctx.drawImage(glowSprite('#e6ff78'),x-tp*0.35,y-tp*0.35,tp*0.7,tp*0.7); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
      else { ctx.fillStyle=`rgba(255,255,255,${0.08+0.12*Math.sin(t+p.ph)**2})`; ctx.beginPath(); ctx.arc(x,y,tp*0.025,0,7); ctx.fill(); }
    }
    ctx.restore();
  }};
/* ---------- world ---------- */
function renderWorld(ctx,cx,cy,tp,W,H,opt){
  const m=G.map, mc=getMapCanvas(G.mapIdx), t=performance.now()/1000;
  ctx.fillStyle=m.theme.bg; ctx.fillRect(0,0,W,H);
  drawBackdropLayer(ctx,m,cx,cy,tp,W,H,t);
  let sx=cx-W/2/tp, sy=cy-H/2/tp;
  if(opt.main){ // snap the camera to whole baked pixels: every frame the floor maps to identical screen pixels
    sx=Math.round(sx*TSB)/TSB; sy=Math.round(sy*TSB)/TSB;
    const dp=ctx.getTransform().a||1, f=tp*dp/TSB, sw=Math.ceil(W*dp/f)+1, sh=Math.ceil(H*dp/f)+1;
    ctx.imageSmoothingEnabled=f>1.01; ctx.drawImage(mc,Math.round(sx*TSB),Math.round(sy*TSB),sw,sh,0,0,sw*f/dp,sh*f/dp); ctx.imageSmoothingEnabled=true;
  } else { const S=tp/TSB; ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(mc,sx*TSB,sy*TSB,W/S,H/S,0,0,W,H); }
  const X=wx=>(wx-sx)*tp, Y=wy=>(wy-sy)*tp;
  const x0=sx, y0=sy, x1=sx+W/tp, y1=sy+H/tp;
  drawGlows(ctx,m,X,Y,tp,t,x0,y0,x1,y1);
  if(m.theme.water&&opt.main){ ctx.save(); ctx.globalCompositeOperation='lighter'; for(let i=0;i<5;i++){ const bx=((i*0.23+t*0.012)%1.2-0.1)*W; const gr=ctx.createLinearGradient(bx,0,bx+W*0.15,H); gr.addColorStop(0,'rgba(140,220,255,.07)'); gr.addColorStop(1,'rgba(140,220,255,0)'); ctx.fillStyle=gr; ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx+W*0.06,0); ctx.lineTo(bx+W*0.2,H); ctx.lineTo(bx+W*0.1,H); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  m.ventList.forEach(v=>{ const a=G.ventAnim[v.i]; if(a&&t-a<0.5){ drawVent(ctx,X(v.x),Y(v.y),tp,Math.sin((t-a)/0.5*Math.PI)); } });
  if(m.button){ const bx=X(m.button[0]), by=Y(m.button[1]); ctx.fillStyle='#5d6b7a'; ctx.beginPath(); ctx.ellipse(bx,by,tp*0.42,tp*0.28,0,0,7); ctx.fill();
    const g=ctx.createRadialGradient(bx-tp*0.08,by-tp*0.2,1,bx,by-tp*0.12,tp*0.32); g.addColorStop(0,'#ff8a8a'); g.addColorStop(0.5,'#e02424'); g.addColorStop(1,'#8a0f0f'); ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(bx,by-tp*0.12,tp*0.3,tp*0.2,0,0,7); ctx.fill(); }
  const viewer=opt.viewer, fog=opt.fog; const vx=viewer?viewer[0]:cx, vy=viewer?viewer[1]:cy;
  const canSee=(x,y)=>!fog||visibleFrom(vx,vy,x,y,visR);
  if(opt.highlights&&G.me&&G.phase==='play'&&!G.me.spec){
    ctx.save(); ctx.lineWidth=3; ctx.shadowBlur=12;
    if(G.me.team==='crew') (G.me.tasks||[]).forEach(tk=>{ if(tk.done) return; const st=m.stations[tk.st]; if(!st) return; ctx.strokeStyle=`rgba(255,230,0,${0.6+0.35*Math.sin(t*5)})`; ctx.shadowColor='#ffe600'; rr(ctx,X(st.x)-tp*0.34,Y(st.y)-tp*0.66,tp*0.68,tp*0.6,7); ctx.stroke(); });
    if(G.sab) sabPoints().forEach(p=>{ ctx.strokeStyle=`rgba(255,60,60,${0.6+0.4*Math.sin(t*8)})`; ctx.shadowColor='#ff3030'; rr(ctx,X(p[0])-tp*0.36,Y(p[1])-tp*0.68,tp*0.72,tp*0.64,7); ctx.stroke(); });
    ctx.restore();
  }
  G.bodies.forEach(b=>{ if(!canSee(b.x,b.y)) return; ctx.save(); ctx.globalAlpha=b.a; drawCrew(ctx,X(b.x),Y(b.y)+tp*0.2,tp*0.95,rosterCos(b.i),{body:true});
    if(b.a<1){ ctx.fillStyle='rgba(120,255,80,.35)'; ctx.beginPath(); ctx.ellipse(X(b.x),Y(b.y)+tp*0.15,tp*0.6,tp*0.25,0,0,7); ctx.fill(); } ctx.restore(); });
  const list=[];
  G.players.forEach((p,id)=>{ const self=id===G.pid; const x=self?G.local.x:p.x, y=self?G.local.y:p.y;
    if(!self&&!canSee(x,y)&&!(p.g&&amDead())) return; if(p.vt&&!self) return; list.push({p,id,x,y,self}); });
  if(opt.main) list.forEach(o=>{ const mv=o.self?G.local.m:o.p.m; if(!mv||o.p.g) return; if(t-(o.p._dust||0)>0.26){ o.p._dust=t; G.fx.push({k:'dust',x:o.x+(Math.random()-0.5)*0.3,y:o.y+0.02,t,d:0.55}); } });
  G.fx.forEach(f=>{ if(f.k!=='dust') return; const k=(t-f.t)/f.d; if(k>1||(fog&&!canSee(f.x,f.y))) return; ctx.fillStyle=`rgba(220,225,235,${0.35*(1-k)})`; ctx.beginPath(); ctx.arc(X(f.x),Y(f.y),tp*(0.06+k*0.14),0,7); ctx.fill(); });
  // ---- vision fog sits on the floor; walls and actors are drawn above it with their own lighting ----
  if(fog) drawFog(ctx,W,H,tp,vx,vy,visR,X,Y);
  const items=[];
  (m.props||[]).forEach(p=>{ if(p[1]<x0-4||p[1]>x1+4||p[2]<y0-4||p[2]>y1+4)return;
    items.push({key:p[2]+0.12,f:()=>{ctx.save(); if(fog&&!canSee(p[1],p[2]))ctx.globalAlpha=.22;
      drawProp(ctx,p[0],X(p[1]),Y(p[2]),tp,mulberry(Math.floor(p[1]*137+p[2]*791)));ctx.restore();}});
  });
  list.forEach(o=>{ const cos=rosterCos(o.p.l||o.id); if(!cos.pet||o.p.g||o.p.vt) return; let pet=G.pets.get(o.id); const tx=o.x-0.55*(o.self?G.local.d:o.p.d), ty=o.y+0.05;
    if(!pet){pet={x:tx,y:ty,d:1};G.pets.set(o.id,pet);} if(opt.main){ const k=Math.min(1,G.dt*5); if(Math.hypot(tx-pet.x,ty-pet.y)>4){pet.x=tx;pet.y=ty;} pet.x+=(tx-pet.x)*k; pet.y+=(ty-pet.y)*k; if(Math.abs(tx-pet.x)>0.02) pet.d=tx>pet.x?1:-1; }
    if(!o.self&&o.p.v) return; if(fog&&!canSee(pet.x,pet.y)) return;
    items.push({key:pet.y,f:()=>drawPet(ctx,X(pet.x),Y(pet.y),tp*0.5,cos.pet,COLORS[cos.color],o.p.m?t:0,pet.d<0)}); });
  list.forEach(o=>items.push({key:o.y,f:()=>{
    const p=o.p, look=p.l||o.id, cos=rosterCos(look); const d=o.self?G.local.d:p.d, mv=o.self?G.local.m:p.m, walk=o.self?G.local.walk:(p.walk||0);
    let alpha=1; if(p.g) alpha=0.5; if(p.v) alpha=0.33;
    if(p.an==='scan'){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(60,255,120,.25)'; ctx.beginPath(); ctx.ellipse(X(o.x),Y(o.y),tp*0.6,tp*0.24,0,0,7); ctx.fill(); const sy2=Y(o.y)-tp*0.9*(0.5+0.5*Math.sin(t*3)); ctx.strokeStyle='rgba(60,255,120,.9)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(X(o.x)-tp*0.45,sy2); ctx.lineTo(X(o.x)+tp*0.45,sy2); ctx.stroke(); ctx.restore(); }
    drawCrew(ctx,X(o.x),Y(o.y),tp*0.95,cos,{flip:d<0,walk:mv?walk:0,ghost:!!p.g,alpha});
    if(p.an&&p.an!=='scan'){ ctx.save(); ctx.strokeStyle=`rgba(255,220,80,${0.5+0.4*Math.sin(t*10)})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(X(o.x),Y(o.y)-tp*0.45,tp*0.62,0,7); ctx.stroke(); ctx.restore(); }
    if(p.pr){ ctx.save(); ctx.strokeStyle='rgba(120,200,255,.9)'; ctx.fillStyle='rgba(120,200,255,.16)'; ctx.lineWidth=3; ctx.shadowColor='#8fd3ff'; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(X(o.x),Y(o.y)-tp*0.45,tp*0.7,0,7); ctx.fill(); ctx.stroke(); ctx.restore(); } }}));
  const vcache=new Map();
  const vis=(fx,fy)=>{ if(!fog) return 1; const key=(fx*4|0)*4096+(fy*4|0); let v=vcache.get(key); if(v!=null) return v; const d=Math.hypot(fx-vx,fy-vy);
    v=d>visR+0.9?0:(lineOfSight(m,vx,vy,fx,fy,G.doors)?clamp((visR+0.7-d)/1.4,0,1):0); vcache.set(key,v); return v; };
  worldPass(ctx,m,cx,cy,tp,W,H,X,Y,items,vis,fog);
  list.forEach(o=>{ const p=o.p, look=p.l||o.id, cos=rosterCos(look); let alpha=1; if(p.g) alpha=0.5; if(p.v) alpha=0.33;
    nameTag(ctx,X(o.x),Y(o.y)-tp*1.13-(cos.hat?tp*0.3:0),tp,rosterName(look),{fel:G.me&&G.me.fel&&G.me.fel.includes(o.id)&&G.phase!=='lobby',alpha,talk:p.sp||(!o.self&&typeof Voice!=='undefined'&&Voice.isTalking(o.id)),off:(()=>{const r=G.roster.get(o.id); return r&&!r.on&&!r.bot;})(),col:COLORS[cos.color][1]}); });
  if(opt.main){ G.fx=G.fx.filter(f=>t-f.t<f.d);
    G.fx.forEach(f=>{ const k=(t-f.t)/f.d; if(fog&&!canSee(f.x,f.y)) return;
      if(f.k==='puff'){ ctx.save(); ctx.globalAlpha=1-k; for(let i=0;i<12;i++){ const a=i/12*6.28; ctx.fillStyle=f.soft?'rgba(200,180,255,.85)':'rgba(235,235,240,.9)'; ctx.beginPath(); ctx.arc(X(f.x)+Math.cos(a)*k*tp*0.9,Y(f.y)-tp*0.45+Math.sin(a)*k*tp*0.7,tp*0.22*(1-k*0.5),0,7); ctx.fill(); } ctx.restore(); }
      if(f.k==='shield'){ ctx.save(); ctx.globalAlpha=1-k; ctx.strokeStyle='#8fd3ff'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(X(f.x),Y(f.y)-tp*0.45,tp*(0.6+k),0,7); ctx.stroke(); ctx.restore(); } });
    Particles.run(ctx,m,X,Y,tp,Math.min(G.dt||0.016,0.05),x0,y0,x1,y1,t); }
}
function nameTag(ctx,x,y,tp,name,o){
  const fs=Math.max(11,tp*0.3); ctx.save(); ctx.globalAlpha=o.alpha; ctx.font=`800 ${fs}px ${FONT_UI}`; ctx.textAlign='center'; ctx.textBaseline='middle';
  const tw=ctx.measureText(name).width, pw=tw+fs*1.1+(o.talk?fs:0), ph=fs*1.45;
  ctx.fillStyle='rgba(8,12,26,.62)'; rr(ctx,x-pw/2,y-ph/2,pw,ph,ph/2); ctx.fill();
  ctx.strokeStyle=o.talk?'rgba(94,243,140,.95)':'rgba(255,255,255,.12)'; ctx.lineWidth=o.talk?2:1; ctx.stroke();
  ctx.fillStyle=o.col; ctx.beginPath(); ctx.arc(x-pw/2+fs*0.55,y,fs*0.22,0,7); ctx.fill();
  ctx.fillStyle=o.fel?'#ff5a5a':'#fff'; ctx.fillText(name,x+fs*0.12-(o.talk?fs*0.5:0),y+1);
  if(o.talk){ ctx.fillStyle='#5ef38c'; const bx=x+pw/2-fs*0.75; for(let i=0;i<3;i++){ const hh=fs*(0.25+0.35*Math.abs(Math.sin(performance.now()/120+i))); ctx.fillRect(bx+i*fs*0.22,y-hh/2,fs*0.13,hh); } }
  if(o.off){ ctx.fillStyle='#ffb020'; ctx.font=`800 ${fs*0.8}px ${FONT_UI}`; ctx.fillText('reconnecting…',x,y-ph); }
  ctx.restore();
}
/* ---------- vision / fog (exact polygon, soft edges via low-res mask upscale) ---------- */
let fogC=null, vigC=null;
function drawFog(ctx,W,H,tp,ex,ey,R,PX,PY){
  const S=2, mw=Math.ceil(W/S)+2, mh=Math.ceil(H/S)+2;
  if(!fogC||fogC.width!==mw||fogC.height!==mh){ fogC=document.createElement('canvas'); fogC.width=mw; fogC.height=mh; }
  const f=fogC.getContext('2d'); f.setTransform(1,0,0,1,0,0); f.globalCompositeOperation='source-over'; f.clearRect(0,0,mw,mh);
  const lights=G.sab&&G.sab.k==='lights';
  f.fillStyle=lights?'rgba(2,3,8,.95)':'rgba(3,5,14,.84)'; f.fillRect(0,0,mw,mh);
  f.setTransform(1/S,0,0,1/S,0,0);
  const X=PX, Y=PY;
  const pts=visPoly(G.map,ex,ey,R+0.6,G.doors);
  f.globalCompositeOperation='destination-out';
  const g=f.createRadialGradient(X(ex),Y(ey),R*tp*0.55,X(ex),Y(ey),(R+0.6)*tp); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.75,'rgba(0,0,0,.6)'); g.addColorStop(1,'rgba(0,0,0,0)');
  f.fillStyle=g; f.beginPath(); for(let i=0;i<pts.length;i+=2){ const x=X(pts[i]), y=Y(pts[i+1]); i?f.lineTo(x,y):f.moveTo(x,y); } f.closePath(); f.fill();
  ctx.save(); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(fogC,0,0,mw*S,mh*S); ctx.restore();
}
function drawVignette(ctx,W,H){
  if(!vigC||vigC.width!==W||vigC.height!==H){ vigC=document.createElement('canvas'); vigC.width=W; vigC.height=H; const v=vigC.getContext('2d'); const g=v.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.45)'); v.fillStyle=g; v.fillRect(0,0,W,H); }
  ctx.drawImage(vigC,0,0);
}
function renderFrame(ctx,W,H,dt){
  G.dt=dt; const L=G.local, tp=G.tilePx, ghost=amDead()&&G.phase!=='lobby';
  const tx=L.x, ty=L.y-0.4; if(!G.camInit||Math.hypot(tx-G.cam.x,ty-G.cam.y)>3){ G.cam.x=tx; G.cam.y=ty; G.camInit=1; } else { const k=Math.min(1,dt*14); G.cam.x+=(tx-G.cam.x)*k; G.cam.y+=(ty-G.cam.y)*k; }
  const fog=G.phase==='play'&&!ghost;
  visR+=(visionRadius()-visR)*Math.min(1,dt*2.5);
  G.players.forEach((p,id)=>{ if(id===G.pid||p.tx==null) return; const k=Math.min(1,dt*14); p.x+=(p.tx-p.x)*k; p.y+=(p.ty-p.y)*k; if(p.m) p.walk=(p.walk||0)+dt*11; });
  const eye=eyePos();
  G.shake=Math.max(0,(G.shake||0)-dt*2.2); const sh=G.shake*G.shake*0.35;
  renderWorld(ctx,G.cam.x+(Math.random()-0.5)*sh,G.cam.y+(Math.random()-0.5)*sh,tp,W,H,{fog,viewer:eye,highlights:true,main:true});
  if(!PostFX.on) drawVignette(ctx,W,H);
  drawArrows(ctx,W,H,tp);
}
function drawArrows(ctx,W,H,tp){
  if(G.phase!=='play'||!G.me) return; const t=performance.now()/1000;
  const targets=[];
  if(!G.me.spec&&G.me.team==='crew'&&!(G.sab&&G.sab.k==='comms')) (G.me.tasks||[]).forEach(tk=>{ if(!tk.done){ const st=G.map.stations[tk.st]; if(st) targets.push([st.x,st.y,'#ffe600']); } });
  if(G.sab&&G.sab.crit) sabPoints().forEach(p=>targets.push([p[0],p[1],'#ff3b3b']));
  if(G.me.track) targets.push([G.me.track.x,G.me.track.y,'#4fc3f7']);
  G.alarms=G.alarms.filter(a=>t-a.t<6); G.alarms.forEach(a=>targets.push([a.x,a.y,'#ff8c00']));
  targets.forEach(([x,y,col])=>{ const sx=(x-G.cam.x)*tp+W/2, sy=(y-G.cam.y)*tp+H/2; const m=44; if(sx>m&&sy>m&&sx<W-m&&sy<H-m) return;
    const a=Math.atan2(sy-H/2,sx-W/2); const ex=clamp(sx,m,W-m), ey=clamp(sy,m+30,H-m);
    ctx.save(); ctx.translate(ex,ey); ctx.rotate(a); ctx.shadowColor=col; ctx.shadowBlur=12; ctx.fillStyle=col; ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(17,0); ctx.lineTo(-8,-12); ctx.lineTo(-3,0); ctx.lineTo(-8,12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
}
function drawJoy(c){ const j=G.joy; if(!j) return; c.save();
  const g=c.createRadialGradient(j.ox,j.oy,j.r*0.3,j.ox,j.oy,j.r); g.addColorStop(0,'rgba(255,255,255,.06)'); g.addColorStop(1,'rgba(255,255,255,.18)'); c.fillStyle=g; c.beginPath(); c.arc(j.ox,j.oy,j.r,0,7); c.fill();
  c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=2; c.stroke();
  const dx=j.cx-j.ox, dy=j.cy-j.oy, d=Math.hypot(dx,dy), k=Math.min(1,j.r/(d||1)); const kx=j.ox+dx*k, ky=j.oy+dy*k;
  const g2=c.createRadialGradient(kx-6,ky-6,2,kx,ky,j.r*0.45); g2.addColorStop(0,'#fff'); g2.addColorStop(1,'#9fb3d1'); c.fillStyle=g2; c.globalAlpha=0.85; c.beginPath(); c.arc(kx,ky,j.r*0.42,0,7); c.fill(); c.restore(); }
