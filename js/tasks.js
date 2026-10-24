/* ================= TASK MINI-GAMES ================= */
function mgCanvas(root){ const cv=h('canvas',{class:'mgcv'}); root.append(cv); const r=root.getBoundingClientRect(); const dpr=Math.min(2,devicePixelRatio||1); cv.width=r.width*dpr; cv.height=r.height*dpr; cv.style.width=r.width+'px'; cv.style.height=r.height+'px'; return cv; }
function evPos(cv,e){ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]; }
function loopCanvas(cv,draw){ let on=true; const c=cv.getContext('2d'); const f=()=>{ if(!on) return; c.setTransform(cv.width,0,0,cv.height,0,0); draw(c); requestAnimationFrame(f); }; f(); return ()=>on=false; }
// draw text in unit-space canvases (tiny font sizes break on some browsers)
function ft(c,text,x,y){ const m=/([\d.]+)px/.exec(c.font); const sz=m?parseFloat(m[1]):0.04; const f=c.font; c.save(); c.translate(x,y); c.scale(sz/50,sz/50); c.font=f.replace(/[\d.]+px/,'50px'); c.fillText(text,0,0); c.restore(); c.font=f; }
const MGF='0.045px '+FONT_UI;

const MG={
  wires(root,done){
    const cols=['#ff3b3b','#3b7bff','#ffe600','#ff4fd8']; const L=shuffle([0,1,2,3]), R=shuffle([0,1,2,3]); const conn={}; let drag=null;
    const cv=mgCanvas(root); const ly=i=>0.2+i*0.2;
    cv.addEventListener('pointerdown',e=>{ const [x,y]=evPos(cv,e); if(x<0.3){ const i=Math.round((y-0.2)/0.2); if(i>=0&&i<4&&!(L[i] in conn)){ drag={i,x,y}; cv.setPointerCapture(e.pointerId);} } });
    cv.addEventListener('pointermove',e=>{ if(drag){ const [x,y]=evPos(cv,e); drag.x=x; drag.y=y; } });
    cv.addEventListener('pointerup',e=>{ if(!drag) return; const [x,y]=evPos(cv,e); const j=Math.round((y-0.2)/0.2); if(x>0.7&&j>=0&&j<4&&R[j]===L[drag.i]){ conn[L[drag.i]]=j; SFX.click(); if(Object.keys(conn).length===4) setTimeout(done,350);} drag=null; });
    return loopCanvas(cv,c=>{ const g=c.createLinearGradient(0,0,1,1); g.addColorStop(0,'#2e323d'); g.addColorStop(1,'#1d2028'); c.fillStyle=g; c.fillRect(0,0,1,1); c.fillStyle='#3a3e4a'; c.fillRect(0,0,0.14,1); c.fillRect(0.86,0,0.14,1);
      for(let i=0;i<4;i++){ c.fillStyle=cols[L[i]]; c.fillRect(0.02,ly(i)-0.025,0.14,0.05); c.fillStyle=cols[R[i]]; c.fillRect(0.84,ly(i)-0.025,0.14,0.05);
        c.fillStyle=Object.values(conn).includes(i)?'#ffe600':'#444'; c.beginPath(); c.arc(0.94,ly(i)-0.07,0.015,0,7); c.fill(); }
      c.lineCap='round'; c.lineWidth=0.035;
      Object.entries(conn).forEach(([col,j])=>{ const i=L.indexOf(+col); c.strokeStyle=cols[col]; c.beginPath(); c.moveTo(0.16,ly(i)); c.bezierCurveTo(0.45,ly(i),0.55,ly(j),0.84,ly(j)); c.stroke(); });
      if(drag){ c.strokeStyle=cols[L[drag.i]]; c.beginPath(); c.moveTo(0.16,ly(drag.i)); c.lineTo(drag.x,drag.y); c.stroke(); } });
  },
  card(root,done){
    const cv=mgCanvas(root); let st=0, cx=0.12, drag=null, t0=0, msg='Tap to take out your card';
    cv.addEventListener('pointerdown',e=>{ const [x,y]=evPos(cv,e); if(st===0){ st=1; msg='Please swipe card'; return; } if(st===1&&y>0.35&&y<0.65&&Math.abs(x-cx)<0.16){ drag=x-cx; t0=performance.now(); cv.setPointerCapture(e.pointerId);} });
    cv.addEventListener('pointermove',e=>{ if(drag!=null){ const [x]=evPos(cv,e); cx=clamp(x-drag,0.12,0.88);} });
    cv.addEventListener('pointerup',()=>{ if(drag==null) return; drag=null; const dt=(performance.now()-t0)/1000;
      if(cx<0.85){ msg='Bad read. Try again.'; } else if(dt<0.55){ msg='Too fast. Try again.'; SFX.err(); } else if(dt>1.6){ msg='Too slow. Try again.'; SFX.err(); } else { msg='Accepted. Thank you.'; st=2; SFX.ok(); setTimeout(done,500); }
      if(st!==2) cx=0.12; });
    return loopCanvas(cv,c=>{ c.fillStyle='#3b4050'; c.fillRect(0,0,1,1); c.fillStyle='#0d1f12'; c.fillRect(0.08,0.06,0.84,0.14); c.fillStyle=st===2?'#5ef38c':'#9fe8b0'; c.font='0.042px monospace'; c.textAlign='center'; ft(c,msg.toUpperCase(),0.5,0.15);
      c.fillStyle='#22252e'; c.fillRect(0.05,0.36,0.9,0.28); c.fillStyle='#111'; c.fillRect(0.05,0.47,0.9,0.06);
      c.fillStyle='#e5e5e5'; rr(c,cx-0.12,0.38,0.24,0.24,0.02); c.fill(); c.fillStyle='#3b7bff'; c.fillRect(cx-0.1,0.41,0.08,0.08); c.fillStyle='#999'; c.fillRect(cx,0.42,0.1,0.015); c.fillRect(cx,0.46,0.08,0.015); });
  },
  download(root,done){ return progressTask(root,done,'Download',ICO('folder')+ICO('arrow')+ICO('phone'),6); },
  upload(root,done){ return progressTask(root,done,'Upload',ICO('phone')+ICO('arrow')+ICO('dish'),6); },
  fuel(root,done){ return holdTask(root,done,'Hold to fill the fuel can','#f1c40f',3); },
  engine(root,done){ return holdTask(root,done,'Hold to fuel the engine','#f39c12',3); },
  garbage(root,done){ return holdTask(root,done,'Hold the lever to empty','#95a5a6',2.5,true); },
  scan(root,done){ return progressTask(root,done,'Scan',ICO('dna'),8,true); },
  simon(root,done){
    const grid=h('div',{class:'simon'}), info=h('div',{class:'mginfo'},'Watch the pattern'); root.append(info,grid);
    const btns=[...Array(9)].map(()=>{ const b=h('button',{type:'button',class:'sbtn'}); grid.append(b); return b; });
    const seq=[...Array(5)].map(()=>ri(9)); let round=1, inp=0, showing=true, alive=true;
    const flash=(i,ms=350)=>{ btns[i].classList.add('on'); SFX.beep(300+i*60); setTimeout(()=>btns[i].classList.remove('on'),ms); };
    const show=()=>{ showing=true; info.textContent=`Round ${round} / 5 — watch`; let k=0; const go=()=>{ if(!alive) return; if(k<round){ flash(seq[k]); k++; setTimeout(go,550);} else { showing=false; inp=0; info.textContent='Repeat it'; } }; setTimeout(go,600); };
    btns.forEach((b,i)=>b.addEventListener('pointerdown',()=>{ if(showing) return; flash(i,200); if(seq[inp]===i){ inp++; if(inp===round){ round++; if(round>5){ info.textContent='Done!'; SFX.ok(); setTimeout(done,400);} else show(); } } else { SFX.err(); info.textContent='Wrong — restarting'; round=1; show(); } }));
    show(); return ()=>alive=false;
  },
  asteroids(root,done){
    const cv=mgCanvas(root); let rocks=[], hit=0, shots=[]; const need=12; let last=performance.now();
    cv.addEventListener('pointerdown',e=>{ const [x,y]=evPos(cv,e); shots.push({x,y,t:performance.now()}); SFX.beep(900,0.04);
      rocks=rocks.filter(r=>{ if(Math.hypot(r.x-x,r.y-y)<r.s+0.03){ hit++; return false; } return true; }); if(hit>=need) setTimeout(done,300); });
    return loopCanvas(cv,c=>{ const n=performance.now(), dt=(n-last)/1000; last=n;
      if(rocks.length<5&&Math.random()<0.04) rocks.push({x:1.05,y:0.15+Math.random()*0.7,vx:-(0.12+Math.random()*0.15),vy:(Math.random()-0.5)*0.1,s:0.04+Math.random()*0.03,a:0});
      rocks.forEach(r=>{r.x+=r.vx*dt;r.y+=r.vy*dt;r.a+=dt;}); rocks=rocks.filter(r=>r.x>-0.1);
      c.fillStyle='#061019'; c.fillRect(0,0,1,1); c.strokeStyle='rgba(80,255,120,.3)'; c.lineWidth=0.003; for(let i=1;i<5;i++){c.beginPath();c.moveTo(i/5,0);c.lineTo(i/5,1);c.moveTo(0,i/5);c.lineTo(1,i/5);c.stroke();}
      rocks.forEach(r=>{ c.save(); c.translate(r.x,r.y); c.rotate(r.a); c.fillStyle='#8b8f7a'; c.beginPath(); for(let i=0;i<7;i++){const a=i/7*6.28, r2=r.s*(0.75+((i*7)%3)*0.12); c.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);} c.closePath(); c.fill(); c.restore(); });
      shots=shots.filter(s=>n-s.t<250); shots.forEach(s=>{ c.strokeStyle='rgba(80,255,120,.9)'; c.lineWidth=0.006; c.beginPath(); c.moveTo(0.5,1); c.lineTo(s.x,s.y); c.stroke(); c.beginPath(); c.arc(s.x,s.y,0.03,0,7); c.stroke(); });
      c.fillStyle='#5ef38c'; c.font='0.05px monospace'; c.textAlign='left'; ft(c,`DESTROYED: ${hit}/${need}`,0.04,0.07); });
  },
  shields(root,done){
    const cv=mgCanvas(root); const hex=[[0.5,0.5],[0.5,0.25],[0.5,0.75],[0.28,0.375],[0.72,0.375],[0.28,0.625],[0.72,0.625]]; const on=hex.map(()=>Math.random()<0.5); if(on.every(x=>x)) on[ri(7)]=false;
    cv.addEventListener('pointerdown',e=>{ const [x,y]=evPos(cv,e); hex.forEach((p,i)=>{ if(Math.hypot(p[0]-x,p[1]-y)<0.11){ on[i]=!on[i]; SFX.click(); } }); if(on.every(x=>x)) setTimeout(done,400); });
    return loopCanvas(cv,c=>{ c.fillStyle='#1d2433'; c.fillRect(0,0,1,1); hex.forEach((p,i)=>{ c.beginPath(); for(let k=0;k<6;k++){const a=k/6*6.28; c.lineTo(p[0]+Math.cos(a)*0.115,p[1]+Math.sin(a)*0.115);} c.closePath(); c.fillStyle=on[i]?'#e8f4ff':'#e84545'; c.fill(); c.strokeStyle='#0b0f18'; c.lineWidth=0.01; c.stroke(); }); });
  },
  manifold(root,done){
    const grid=h('div',{class:'manif'}); root.append(h('div',{class:'mginfo'},'Press 1 → 10 in order'),grid); let next=1;
    const nums=shuffle([...Array(10)].map((_,i)=>i+1)); const bs=nums.map(n=>{ const b=h('button',{type:'button',class:'mbtn'},String(n)); b.addEventListener('pointerdown',()=>{ if(n===next){ b.classList.add('on'); next++; SFX.click(); if(next>10) setTimeout(done,350);} else { SFX.err(); next=1; bs.forEach(x=>x.classList.remove('on')); } }); grid.append(b); return b; });
  },
  calibrate(root,done){
    const cv=mgCanvas(root); const dials=[0,1,2].map(i=>({a:Math.random()*6.28,sp:1.6+i*0.9,ok:false,zone:Math.random()*6.28})); let cur=0;
    cv.addEventListener('pointerdown',()=>{ const d=dials[cur]; if(!d) return; let diff=Math.abs(((d.a-d.zone)%6.283+6.283)%6.283); diff=Math.min(diff,6.283-diff);
      if(diff<0.35){ d.ok=true; cur++; SFX.ok(); if(cur>=3) setTimeout(done,350);} else { SFX.err(); dials.forEach(x=>x.ok=false); cur=0; } });
    let last=performance.now();
    return loopCanvas(cv,c=>{ const n=performance.now(), dt=(n-last)/1000; last=n; c.fillStyle='#262a33'; c.fillRect(0,0,1,1);
      dials.forEach((d,i)=>{ if(!d.ok) d.a+=d.sp*dt; const cx=0.5, cy=0.2+i*0.3, r=0.11; c.fillStyle=i===cur?'#3a4152':'#2e3340'; c.fillRect(0.05,cy-0.13,0.9,0.26);
        c.strokeStyle='#111'; c.lineWidth=0.025; c.beginPath(); c.arc(cx,cy,r,0,7); c.stroke(); c.strokeStyle=['#ffe600','#3b7bff','#5ef38c'][i]; c.lineWidth=0.03; c.beginPath(); c.arc(cx,cy,r,d.zone-0.35,d.zone+0.35); c.stroke();
        c.strokeStyle='#fff'; c.lineWidth=0.012; c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx+Math.cos(d.a)*r*1.1,cy+Math.sin(d.a)*r*1.1); c.stroke();
        c.fillStyle=d.ok?'#5ef38c':'#555'; c.beginPath(); c.arc(0.85,cy,0.03,0,7); c.fill(); });
      c.fillStyle='#ccc'; c.font=MGF; c.textAlign='center'; ft(c,'Tap when the needle is in the colored zone',0.5,0.98); });
  },
  align(root,done){
    const cv=mgCanvas(root); let y=Math.random()<0.5?0.15:0.85, drag=false, ok=false;
    cv.addEventListener('pointerdown',e=>{ drag=true; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove',e=>{ if(drag&&!ok){ y=clamp(evPos(cv,e)[1],0.08,0.92); } });
    cv.addEventListener('pointerup',()=>{ drag=false; if(Math.abs(y-0.5)<0.03&&!ok){ ok=true; y=0.5; SFX.ok(); setTimeout(done,400);} });
    return loopCanvas(cv,c=>{ c.fillStyle='#1b2130'; c.fillRect(0,0,1,1); c.strokeStyle='rgba(255,255,255,.5)'; c.setLineDash([0.02,0.02]); c.lineWidth=0.006; c.beginPath(); c.moveTo(0,0.5); c.lineTo(1,0.5); c.stroke(); c.setLineDash([]);
      const ang=(y-0.5)*1.2; c.strokeStyle=Math.abs(y-0.5)<0.03?'#5ef38c':'#ffb020'; c.lineWidth=0.012; c.beginPath(); c.moveTo(0.15,0.5); c.lineTo(0.15+Math.cos(ang)*0.7,0.5+Math.sin(ang)*0.7); c.stroke();
      c.fillStyle='#596273'; rr(c,0.06,0.42,0.18,0.16,0.03); c.fill(); c.fillStyle='#2b2f38'; c.fillRect(0.88,0.05,0.04,0.9); c.fillStyle='#e0e6ef'; rr(c,0.84,y-0.04,0.12,0.08,0.02); c.fill();
      c.fillStyle='#ccc'; c.font=MGF; c.textAlign='center'; ft(c,'Drag the slider to the dotted line',0.45,0.96); });
  },
  filter(root,done){
    const cv=mgCanvas(root); let leaves=[...Array(6)].map(()=>({x:0.35+Math.random()*0.55,y:0.15+Math.random()*0.7,a:Math.random()*6})); let drag=null;
    cv.addEventListener('pointerdown',e=>{ const [x,y]=evPos(cv,e); drag=leaves.find(l=>Math.hypot(l.x-x,l.y-y)<0.07); if(drag) cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove',e=>{ if(drag){ const [x,y]=evPos(cv,e); drag.x=x; drag.y=y; } });
    cv.addEventListener('pointerup',()=>{ if(drag&&drag.x<0.14){ leaves=leaves.filter(l=>l!==drag); SFX.click(); if(!leaves.length) setTimeout(done,300);} drag=null; });
    return loopCanvas(cv,c=>{ c.fillStyle='#2b3a33'; c.fillRect(0,0,1,1); c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=0.004; for(let i=0;i<20;i++){c.beginPath();c.moveTo(0,i/20);c.lineTo(1,i/20);c.stroke();}
      c.fillStyle='#111'; c.fillRect(0,0.3,0.12,0.4); c.fillStyle='#ccc'; c.font='0.035px '+FONT_UI; c.save(); c.translate(0.07,0.5); c.rotate(-Math.PI/2); c.textAlign='center'; ft(c,'◀ DRAG LEAVES HERE',0,0); c.restore();
      leaves.forEach(l=>{ l.a+=0.01; c.save(); c.translate(l.x,l.y); c.rotate(l.a); c.fillStyle='#6abf45'; c.beginPath(); c.ellipse(0,0,0.05,0.025,0,0,7); c.fill(); c.strokeStyle='#3d7a26'; c.lineWidth=0.005; c.beginPath(); c.moveTo(-0.05,0); c.lineTo(0.05,0); c.stroke(); c.restore(); }); });
  },
  divert(root,done){
    const cv=mgCanvas(root); const tgt=ri(8); const vals=[...Array(8)].fill(0); let drag=null;
    cv.addEventListener('pointerdown',e=>{ const [x]=evPos(cv,e); const i=Math.floor((x-0.06)/0.11); if(i===tgt){ drag=i; cv.setPointerCapture(e.pointerId);} });
    cv.addEventListener('pointermove',e=>{ if(drag!=null){ vals[drag]=clamp((0.85-evPos(cv,e)[1])/0.6,0,1); if(vals[drag]>=0.97){ vals[drag]=1; drag=null; SFX.ok(); setTimeout(done,350);} } });
    cv.addEventListener('pointerup',()=>{ if(drag!=null){ vals[drag]=0; drag=null; } });
    return loopCanvas(cv,c=>{ c.fillStyle='#2b2f38'; c.fillRect(0,0,1,1);
      for(let i=0;i<8;i++){ const x=0.06+i*0.11+0.055; c.fillStyle='#111'; c.fillRect(x-0.01,0.25,0.02,0.6); c.fillStyle=i===tgt?'#ffe600':'#7f8c8d'; rr(c,x-0.04,0.85-vals[i]*0.6-0.03,0.08,0.06,0.01); c.fill();
        c.fillStyle=i===tgt?'#ffe600':'#444'; c.beginPath(); c.arc(x,0.12,0.025,0,7); c.fill(); }
      c.fillStyle='#ccc'; c.font=MGF; c.textAlign='center'; ft(c,'Slide the lit switch all the way up',0.5,0.97); });
  },
  lights(root,done,ctx){
    const st=(ctx.sw||[0,0,0,0,0]).slice(); if(st.every(x=>x)) st[0]=0; const cv=mgCanvas(root);
    cv.addEventListener('pointerdown',e=>{ const [x,y]=evPos(cv,e); const i=Math.floor((x-0.05)/0.18); if(i>=0&&i<5&&y>0.35){ st[i]=st[i]?0:1; SFX.click(); if(st.every(v=>v)) setTimeout(done,250);} });
    return loopCanvas(cv,c=>{ c.fillStyle='#3c3a33'; c.fillRect(0,0,1,1); for(let i=0;i<5;i++){ const x=0.05+i*0.18+0.09; c.fillStyle=st[i]?'#5ef38c':'#2a2a2a'; c.beginPath(); c.arc(x,0.2,0.04,0,7); c.fill();
      c.fillStyle='#1f1f1f'; c.fillRect(x-0.04,0.4,0.08,0.4); c.fillStyle='#ddd'; c.fillRect(x-0.035,st[i]?0.42:0.6,0.07,0.17); }
      c.fillStyle='#eee'; c.font=MGF; c.textAlign='center'; ft(c,'Flip all switches ON',0.5,0.95); });
  },
  comms(root,done){
    const cv=mgCanvas(root); const target=Math.random()*0.8+0.1; let v=Math.random(), drag=false, good=0, last=performance.now(), fin=false;
    cv.addEventListener('pointerdown',e=>{ drag=true; cv.setPointerCapture(e.pointerId); v=clamp(evPos(cv,e)[0],0,1); });
    cv.addEventListener('pointermove',e=>{ if(drag) v=clamp(evPos(cv,e)[0],0,1); }); cv.addEventListener('pointerup',()=>drag=false);
    return loopCanvas(cv,c=>{ const n=performance.now(), dt=(n-last)/1000; last=n; const err=Math.abs(v-target); if(err<0.025) good+=dt; else good=0; if(good>1&&!fin){fin=true; SFX.ok(); setTimeout(done,200);}
      c.fillStyle='#14202b'; c.fillRect(0,0,1,1); c.strokeStyle=err<0.025?'#5ef38c':'#ff6b6b'; c.lineWidth=0.006; c.beginPath();
      for(let x=0;x<=1;x+=0.005){ const noise=err*0.35*(Math.random()-0.5)*4; const y=0.35+Math.sin(x*40+n/150)*0.08*(1-Math.min(1,err*3))+noise; x?c.lineTo(x,y):c.moveTo(x,y);} c.stroke();
      c.fillStyle='#2a3440'; c.fillRect(0.05,0.72,0.9,0.06); c.fillStyle='#e0e6ef'; c.beginPath(); c.arc(0.05+v*0.9,0.75,0.045,0,7); c.fill();
      c.fillStyle='#ccc'; c.font=MGF; c.textAlign='center'; ft(c,'Tune the frequency until the signal is clean',0.5,0.93); });
  },
  crit(root,done,ctx){
    const pad=h('div',{class:'hand'},h('div',{class:'handin',html:ICO('use')}),h('div',{class:'mginfo'},'Hold to stop the meltdown')); root.append(pad); const info=pad.lastChild;
    let holding=false; const on=e=>{ e.preventDefault(); holding=true; pad.classList.add('on'); ctx.hold(true); SFX.beep(500,0.05); }, off=()=>{ if(holding){holding=false; pad.classList.remove('on'); ctx.hold(false);} };
    pad.addEventListener('pointerdown',on); pad.addEventListener('pointerup',off); pad.addEventListener('pointerleave',off); pad.addEventListener('pointercancel',off);
    const iv=setInterval(()=>{ const s=G.sab; if(!s||!s.hold){ clearInterval(iv); info.textContent='Stabilized!'; setTimeout(done,300); return; } const other=s.hold[1-ctx.st]; info.textContent=holding?(other?'Both hands on — fixing...':'Waiting for second user...'):'Hold to stop the meltdown'; },150);
    return ()=>{ clearInterval(iv); off(); };
  },
  o2(root,done,ctx){
    const code=ctx.code||'00000'; let cur=''; const disp=h('div',{class:'kdisp'},''); const note=h('div',{class:'knote'},'Today\'s code: '+code);
    const pad=h('div',{class:'kpad'}); [1,2,3,4,5,6,7,8,9,'✕',0,'✓'].forEach(k=>{ const b=h('button',{type:'button',class:'kbtn'},String(k)); b.addEventListener('pointerdown',()=>{ SFX.click();
      if(k==='✕'){cur='';} else if(k==='✓'){ if(cur===code){ SFX.ok(); done(); } else { SFX.err(); cur=''; } } else if(cur.length<5) cur+=k; disp.textContent=cur; }); pad.append(b); });
    root.append(note,disp,pad);
  },
};
function progressTask(root,done,verb,icon,secs,isScan){
  const bar=h('div',{class:'pbar'},h('div',{class:'pfill'})), info=h('div',{class:'mginfo'},''), big=h('div',{class:'picon',html:icon});
  const btn=h('button',{type:'button',class:'btn primary'},verb); root.append(big,bar,info,btn); let iv=null;
  const go=()=>{ btn.remove(); const t0=performance.now(); iv=setInterval(()=>{ const k=Math.min(1,(performance.now()-t0)/1000/secs); bar.firstChild.style.width=(k*100)+'%';
    info.textContent=k<1?`${verb==='Scan'?'Scanning':verb+'ing'}… ${Math.ceil(secs*(1-k))}s`:'Complete'; if(k>=1){ clearInterval(iv); SFX.ok(); setTimeout(done,300);} },100); };
  btn.addEventListener('click',go); if(isScan) go();
  return ()=>clearInterval(iv);
}
function holdTask(root,done,label,color,secs,lever){
  const bar=h('div',{class:'pbar tall'},h('div',{class:'pfill',style:`background:${color}`})), info=h('div',{class:'mginfo'},label), btn=h('button',{type:'button',class:'btn primary hold'},lever?'⬇ PULL':'HOLD');
  root.append(info,bar,btn); let k=0, holding=false, last=performance.now(), fin=false;
  const on=e=>{e.preventDefault();holding=true;}, off=()=>holding=false; btn.addEventListener('pointerdown',on); btn.addEventListener('pointerup',off); btn.addEventListener('pointerleave',off); btn.addEventListener('pointercancel',off);
  const iv=setInterval(()=>{ const n=performance.now(), dt=(n-last)/1000; last=n; if(holding) k=Math.min(1,k+dt/secs); bar.firstChild.style.width=(k*100)+'%'; if(k>=1&&!fin){fin=true; clearInterval(iv); SFX.ok(); setTimeout(done,300);} },50);
  return ()=>clearInterval(iv);
}
