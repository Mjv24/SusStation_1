/* ================= 2.5D WORLD: extruded walls, parallax backdrop, depth-sorted actors ================= */
// Walls are real blocks: each wall cell is projected with a camera tilt + radial perspective,
// so you see their faces from the side and they shift with parallax as you move.
const WALL_T=0.62;     // camera tilt — how tall a wall looks (tiles); matches WALL_LIFT in the vision code
const WALL_K=0;     // radial perspective strength (per screen pixel from the centre)
const FOG_COL='#03050e';

const KIND_PAL={
  in:   null,
  door: {face:'#8f9aae', top:'#262c38'},
  snow: {face:'#8fa6bd', top:'#eef5fb', blob:'#ffffff', blob2:'#cfdceb'},
  jungle:{face:'#173d1e', top:'#2c6a31', blob:'#3f8c3c', blob2:'#225526', dot:'#ff6fa8'},
  grass:{face:'#1c4a22', top:'#357a35', blob:'#4c9a45', blob2:'#2b5e2d', dot:'#ffd34d'},
  sand: {face:'#6b5435', top:'#a88d62', blob:'#c4a97a', blob2:'#8f744c'},
  reef: {face:'#123c48', top:'#2a7480', blob:'#3d9aa3', blob2:'#1d5862', dot:'#ff7aa8'},
};
function wallInfo(m){
  if(m._wi) return m._wi;
  const W=m.w,H=m.h,N=W*H, near=new Uint8Array(N), kind=new Array(N).fill('in'), hv=new Float32Array(N), rng=mulberry(W*131+H);
  const walk=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&m.walk[y*W+x]===1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const k=y*W+x; hv[k]=rng(); if(m.walk[k]) continue;
    let d=9; for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) if(walk(x+dx,y+dy)) d=Math.min(d,Math.max(Math.abs(dx),Math.abs(dy)));
    if(d<=2) near[k]=d;
    let best=null,bd=9; for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){ const nx=x+dx,ny=y+dy; if(!walk(nx,ny)) continue; const r=m.room[ny*W+nx]; const R=r>=0?m.roomList[r]:null; const dd=Math.abs(dx)+Math.abs(dy);
      if(dd<bd){ bd=dd; best=R&&R.o.k&&R.o.k!=='in'&&R.o.k!=='pad'?R.o.k:'in'; } }
    if(best) kind[k]=best; }
  return m._wi={near,kind,hv};
}
/* ---------- parallax backdrop ---------- */
const backCache={};
function getBackdrop(idx){
  if(backCache[idx]) return backCache[idx];
  const m=MAPS[idx], Tb=20, PAD=10; const cv=document.createElement('canvas'); cv.width=(m.w+PAD*2)*Tb; cv.height=(m.h+PAD*2)*Tb;
  drawBackdrop(cv.getContext('2d'),m,Tb,mulberry(idx*31+7));
  return backCache[idx]={cv,Tb,PAD};
}
function drawBackdropLayer(ctx,m,cx,cy,tp,W,H,t){
  const b=getBackdrop(G.mapIdx), P=0.55, bs=tp*0.8;            // moves at 55% of the world speed -> depth
  const bx=cx*P+m.w*(1-P)/2+b.PAD, by=cy*P+m.h*(1-P)/2+b.PAD;
  ctx.drawImage(b.cv,(bx-W/2/bs)*b.Tb,(by-H/2/bs)*b.Tb,W/bs*b.Tb,H/bs*b.Tb,0,0,W,H);
  if(m.theme.space||m.theme.sky){ // a second, slower star/cloud layer for extra depth
    const r=mulberry(77); ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<70;i++){ const u=r(), v=r(), s=r(); const x=((u*W*1.6-cx*tp*0.18)%(W*1.6)+W*1.6)%(W*1.6)-W*0.3, y=((v*H*1.6-cy*tp*0.18)%(H*1.6)+H*1.6)%(H*1.6)-H*0.3;
      const a=(0.25+0.6*s)*(0.6+0.4*Math.sin(t*(1+s*3)+i));
      if(m.theme.space){ ctx.fillStyle=`rgba(200,220,255,${a})`; ctx.fillRect(x,y,1.5+s*1.5,1.5+s*1.5); }
      else { ctx.fillStyle=`rgba(255,255,255,${a*0.08})`; ctx.beginPath(); ctx.ellipse(x,y,tp*(1.5+s*2),tp*(0.6+s),0,0,7); ctx.fill(); } }
    ctx.restore(); }
}
/* ---------- wall rendering ---------- */
function worldPass(ctx,m,cx,cy,tp,W,H,X,Y,items,vis,fogOn){
  const wi=wallInfo(m), closed=G.doors, Wm=m.w, Hm=m.h;
  const x0=Math.max(0,Math.floor(cx-W/2/tp)-2), x1=Math.min(Wm-1,Math.ceil(cx+W/2/tp)+2), y0=Math.max(0,Math.floor(cy-H/2/tp)-2), y1=Math.min(Hm-1,Math.ceil(cy+H/2/tp)+4);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){ const k=y*Wm+x;
    if(m.walk[k]){ if(!(closed.size&&m.doorCell[k]>=0&&closed.has(m.doorCell[k]))) continue; items.push({key:y+1,w:x,h:y,door:1}); }
    else if(wi.near[k]) items.push({key:y+1,w:x,h:y,door:0}); }
  items.sort((a,b)=>a.key-b.key||(a.w==null?1:0)-(b.w==null?1:0));
  const free=(x,y)=>cellFree(m,x,y,closed);
  const cxs=W/2, cys=H/2, T=WALL_T*tp, K=WALL_K;
  const PX=sx=>sx+(sx-cxs)*K, PY=sy=>sy-T+(sy-cys)*K;
  const t=performance.now()/1000;
  for(const it of items){
    if(it.w==null){ it.f(); continue; }
    const x=it.w, y=it.h, k=y*Wm+x, kind=it.door?'door':wi.kind[k], pal=KIND_PAL[kind];
    const bx0=X(x), bx1=X(x+1), by0=Y(y), by1=Y(y+1);
    const tx0=PX(bx0), tx1=PX(bx1), ty0=PY(by0), ty1=PY(by1);
    const midx=(bx0+bx1)/2, midy=(by0+by1)/2, shx=PX(midx)-midx, shy=PY(midy)-midy;
    const faceBase=pal?pal.face:m.theme.wallTop;
    const face=(ax,ay,bx,by,cx2,cy2,dx,dy,v,dir,vertical)=>{ // a,b = base edge ; c,d = top edge (c above b, d above a)
      const lit=Math.round(clamp(dir*(fogOn?0.3+0.7*v:1),0,1)*64)/64;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(cx2,cy2); ctx.lineTo(dx,dy); ctx.closePath();
      ctx.fillStyle=shade(faceBase,-(1-lit)*0.75); ctx.fill();
      // vertical gradient: dark at the floor (AO), light at the top lip
      const g=ctx.createLinearGradient((ax+bx)/2,(ay+by)/2,(cx2+dx)/2,(cy2+dy)/2);
      g.addColorStop(0,'rgba(0,0,0,.42)'); g.addColorStop(0.55,'rgba(0,0,0,0)'); g.addColorStop(1,`rgba(255,255,255,${0.14*lit})`); ctx.fillStyle=g; ctx.fill();
      if(lit>0.25&&!pal){ // panel seams, lip and status LEDs on station walls
        const L=(f)=>[ax+(dx-ax)*f,ay+(dy-ay)*f,bx+(cx2-bx)*f,by+(cy2-by)*f];
        ctx.strokeStyle=`rgba(0,0,0,${0.35*lit})`; ctx.lineWidth=1.5; let s=L(0.42); ctx.beginPath(); ctx.moveTo(s[0],s[1]); ctx.lineTo(s[2],s[3]); ctx.stroke();
        ctx.strokeStyle=`rgba(255,255,255,${0.12*lit})`; s=L(0.47); ctx.beginPath(); ctx.moveTo(s[0],s[1]); ctx.lineTo(s[2],s[3]); ctx.stroke();
        ctx.strokeStyle=`rgba(0,0,0,${0.3*lit})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(dx,dy); ctx.stroke();
        const h=wi.hv[k]; if(h<0.2&&!vertical){ const f=0.68, px=ax+(dx-ax)*f+(bx-ax)*(0.3+h*2), py=ay+(dy-ay)*f+(by-ay)*(0.3+h*2);
          const col=['#4dff9a','#ffd34d','#4fd1ff','#ff5a5a'][(h*20|0)%4]; const on=true;
          ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(px-tp*0.12,py-tp*0.05,tp*0.24,tp*0.1);
          if(on){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=lit; ctx.drawImage(glowSprite(col),px-tp*0.3,py-tp*0.3,tp*0.6,tp*0.6); ctx.restore(); ctx.fillStyle=col; ctx.fillRect(px-tp*0.03,py-tp*0.03,tp*0.06,tp*0.06); } }
        else if(h>0.9&&!vertical){ const f=0.15; const s2=L(f), s3=L(f+0.12); ctx.fillStyle=`rgba(255,200,40,${0.55*lit})`;
          for(let i=0;i<4;i++){ const u=i/4, u2=u+0.12; ctx.beginPath(); ctx.moveTo(s2[0]+(s2[2]-s2[0])*u,s2[1]+(s2[3]-s2[1])*u); ctx.lineTo(s2[0]+(s2[2]-s2[0])*u2,s2[1]+(s2[3]-s2[1])*u2); ctx.lineTo(s3[0]+(s3[2]-s3[0])*u2,s3[1]+(s3[3]-s3[1])*u2); ctx.lineTo(s3[0]+(s3[2]-s3[0])*u,s3[1]+(s3[3]-s3[1])*u); ctx.fill(); } }
      }
      if(it.door&&lit>0.2){ const f=0.5, s=[ax+(dx-ax)*f,ay+(dy-ay)*f,bx+(cx2-bx)*f,by+(cy2-by)*f]; ctx.strokeStyle='rgba(255,200,40,.9)'; ctx.lineWidth=tp*0.1; ctx.beginPath(); ctx.moveTo(s[0],s[1]); ctx.lineTo(s[2],s[3]); ctx.stroke();
        ctx.fillStyle=`rgba(255,60,60,${0.5+0.5*Math.sin(t*6)})`; ctx.beginPath(); ctx.arc((s[0]+s[2])/2,(s[1]+s[3])/2-tp*0.22,tp*0.07,0,7); ctx.fill(); }
      // bright rim on the top lip
      ctx.strokeStyle=pal&&pal.blob?shade(pal.top,0.1):`rgba(170,200,255,${0.1+0.3*lit})`; ctx.lineWidth=Math.max(1,tp*0.04); ctx.beginPath(); ctx.moveTo(dx,dy); ctx.lineTo(cx2,cy2); ctx.stroke();
      if(fogOn&&v<0.98){ ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(cx2,cy2); ctx.lineTo(dx,dy); ctx.closePath(); ctx.fillStyle=FOG_COL; ctx.globalAlpha=0.82*(1-v); ctx.fill(); ctx.globalAlpha=1; }
    };
    if(free(x,y+1)&&shy<0) face(bx0,by1,bx1,by1,tx1,ty1,tx0,ty1,vis(x+0.5,y+1.4),1,false);
    if(free(x,y-1)&&shy>0) face(bx1,by0,bx0,by0,tx0,ty0,tx1,ty0,vis(x+0.5,y-0.5),0.62,false);
    if(free(x+1,y)&&shx<0) face(bx1,by1,bx1,by0,tx1,ty0,tx1,ty1,vis(x+1.5,y+0.5),0.8,true);
    if(free(x-1,y)&&shx>0) face(bx0,by0,bx0,by1,tx0,ty1,tx0,ty0,vis(x-0.5,y+0.5),0.8,true);
    // top cap (visibility first, so dark caps never get re-brightened by neighbouring blobs)
    let vc=1; if(fogOn){ vc=0; [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([dx,dy])=>{ if(free(x+dx,y+dy)) vc=Math.max(vc,vis(x+0.5+dx,y+0.5+dy)); });
      if(vc===0&&wi.near[k]===2){ const d=Math.hypot(x+0.5-G.local.x,y+0.5-G.local.y); vc=clamp((visR+0.2-d)/1.4,0,1)*0.6; } }
    const dim=c0=>vc>=0.98?c0:shade(c0,-0.85*(1-vc));
    ctx.beginPath(); ctx.moveTo(tx0,ty0); ctx.lineTo(tx1,ty0); ctx.lineTo(tx1,ty1); ctx.lineTo(tx0,ty1); ctx.closePath();
    const capCol=dim(pal?pal.top:shade(m.theme.wall,-0.55));
    ctx.fillStyle=capCol; ctx.fill(); ctx.strokeStyle=capCol; ctx.lineWidth=1.2; ctx.stroke();
    if(pal&&pal.blob){ const h=wi.hv[k], cx3=(tx0+tx1)/2, cy3=(ty0+ty1)/2, r=(tx1-tx0)*0.62;
      ctx.fillStyle=dim(pal.blob2); ctx.beginPath(); ctx.arc(cx3+(h-0.5)*r*0.5,cy3+r*0.12,r,0,7); ctx.fill();
      if(vc>0.05){ const g=ctx.createRadialGradient(cx3-r*0.3,cy3-r*0.35,r*0.1,cx3,cy3,r); g.addColorStop(0,dim(shade(pal.blob,0.25))); g.addColorStop(1,dim(pal.blob)); ctx.fillStyle=g; } else ctx.fillStyle=dim(pal.blob);
      ctx.beginPath(); ctx.arc(cx3+(h-0.5)*r*0.4,cy3-r*0.08,r*0.82,0,7); ctx.fill();
      if(pal.dot&&h>0.75&&vc>0.3){ ctx.fillStyle=pal.dot; ctx.beginPath(); ctx.arc(cx3+r*0.2,cy3-r*0.2,r*0.12,0,7); ctx.fill(); } }
    if(vc<0.3) continue;
    if(!pal){ // station roof: inner panel + rim highlight on edges that border a room
      const ix=(tx1-tx0)*0.18; ctx.strokeStyle='rgba(255,255,255,.035)'; ctx.lineWidth=1; ctx.strokeRect(tx0+ix,ty0+ix,tx1-tx0-ix*2,ty1-ty0-ix*2);
      ctx.strokeStyle='rgba(150,180,240,.28)'; ctx.lineWidth=Math.max(1,tp*0.035); ctx.beginPath();
      if(free(x,y+1)){ ctx.moveTo(tx0,ty1); ctx.lineTo(tx1,ty1); } if(free(x,y-1)){ ctx.moveTo(tx0,ty0); ctx.lineTo(tx1,ty0); }
      if(free(x-1,y)){ ctx.moveTo(tx0,ty0); ctx.lineTo(tx0,ty1); } if(free(x+1,y)){ ctx.moveTo(tx1,ty0); ctx.lineTo(tx1,ty1); } ctx.stroke(); }
  }
}
