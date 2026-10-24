/* ================= COSMETICS & CHARACTER RENDERING ================= */
const COLORS=[
 ['Red','#C51111','#7A0838'],['Blue','#132ED1','#09158E'],['Green','#117F2D','#0A4D2E'],['Pink','#ED54BA','#AB2BAD'],
 ['Orange','#EF7D0D','#B33E15'],['Yellow','#F5F557','#C38823'],['Black','#3F474E','#1E1F26'],['White','#D6E0F0','#8394BF'],
 ['Purple','#6B2FBB','#3B177C'],['Brown','#71491E','#5E2615'],['Cyan','#38FEDC','#24A8BE'],['Lime','#50EF39','#15A742'],
 ['Maroon','#6B2B3C','#41131F'],['Rose','#ECC0D3','#DE92B3'],['Banana','#FFFEBE','#D2BC89'],['Gray','#758593','#46565F'],
 ['Tan','#918877','#51413F'],['Coral','#D76464','#B43E5B']];
const HATS=['None','Top Hat','Party Hat','Crown','Beanie','Cowboy','Chef','Halo','Devil Horns','Cat Ears','Flower','Headphones',
 'Propeller Cap','Baseball Cap','Police Cap','Sprout','Egg','Pumpkin','Wizard','Viking','Toilet Paper','Bandana','Antenna','Mini Crew','Fez','Hard Hat','Santa','Bunny Ears',
 'Goggles','Ninja Band','Flame','Snorkel','Unicorn','Graduate'];
const OUTFITS=['None','Suit','Lab Coat','Police','Military','Hazmat','Mechanic','Tuxedo','Hoodie','Scarf','Captain','Doctor','Astronaut','Pirate','Ninja','Diver','Neon'];
const VISORS=['Classic','Sunset','Mint','Gold','Night','Rose','Hologram'];
const VISORC=[['#93C8DA','#D6F0F8','#4E7C8E'],['#FFA36B','#FFDCC0','#B5552D'],['#7FF2C2','#D4FFEC','#2F9C74'],['#F2C94C','#FFF3C4','#A87D12'],
 ['#3B4256','#8A96B6','#161A24'],['#F5A3C7','#FFE6F2','#B04A7C'],['#B49CFF','#EEE8FF','#6748C9']];
const PETS=['None','Mini Crew','Doggo','Kitty','Robo','UFO','Birb','Slime','Hamster','Fish','Ghosty'];

function defaultCos(){return {color:ri(COLORS.length),hat:ri(HATS.length),outfit:0,visor:0,pet:0};}
function bodyPath(c){ c.beginPath(); c.moveTo(-26,-22); c.bezierCurveTo(-26,-56,30,-58,30,-22); c.lineTo(30,22); c.quadraticCurveTo(30,30,22,30); c.lineTo(-18,30); c.quadraticCurveTo(-26,30,-26,22); c.closePath(); }
// x,y = feet in screen px; s = height px. opts:{flip,walk,ghost,alpha,body}
function drawCrew(c,x,y,s,cos,o={}){
  const col=COLORS[cos.color]||COLORS[0]; const u=s/95;
  c.save(); c.translate(x,y); c.scale(u,u);
  if(!o.body&&!o.ghost){ let sx=1,sy=1; if(o.walk){ const q=Math.sin(o.walk*2); sy=1+0.04*q; sx=1-0.035*q; } else { const q=Math.sin(performance.now()/1000*2.4); sy=1+0.014*q; sx=1-0.008*q; } c.scale(sx,sy); }
  c.translate(0,-38);
  const A=(o.alpha==null?1:o.alpha)*c.globalAlpha; c.globalAlpha=A;
  if(o.flip) c.scale(-1,1);
  const L=5.5; c.lineWidth=L; c.lineJoin='round'; c.strokeStyle='#07080d';
  if(o.body){ drawBody(c,col,cos); c.restore(); return; }
  if(!o.ghost){ const sg=c.createRadialGradient(0,40,2,0,40,34); sg.addColorStop(0,'rgba(0,0,0,.45)'); sg.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=sg; c.beginPath(); c.ellipse(0,40,34,9,0,0,7); c.fill(); }
  const ph=o.walk||0, sw=Math.sin(ph)*7, lift=o.walk?Math.max(0,Math.sin(ph))*4:0, lift2=o.walk?Math.max(0,-Math.sin(ph))*4:0, bob=o.walk?Math.abs(Math.cos(ph))*-2.5:Math.sin(performance.now()/600)*0.8;
  if(o.ghost) c.translate(0,Math.sin(performance.now()/300)*3);
  c.translate(0,bob);
  if(!o.ghost){
    c.fillStyle=col[2]; rr(c,-24+sw,18-lift,20,22,8); c.fill(); c.stroke();
    const lg=c.createLinearGradient(0,18,0,40); lg.addColorStop(0,shade(col[1],0.08)); lg.addColorStop(1,col[2]); c.fillStyle=lg; rr(c,6-sw,18-lift2,20,22,8); c.fill(); c.stroke();
  }
  // backpack
  const bp=c.createLinearGradient(-38,-18,-20,22); bp.addColorStop(0,shade(col[1],-0.05)); bp.addColorStop(1,col[2]); c.fillStyle=bp; rr(c,-38,-18,18,40,7); c.fill(); c.stroke();
  // body with soft 3D shading
  const bg=c.createLinearGradient(-26,-52,26,30); bg.addColorStop(0,shade(col[1],0.22)); bg.addColorStop(0.45,col[1]); bg.addColorStop(1,shade(col[2],-0.05));
  bodyPath(c); c.fillStyle=bg; c.fill();
  c.save(); bodyPath(c); c.clip();
  c.globalAlpha=A*0.55; c.fillStyle=col[2]; c.beginPath(); c.ellipse(-32,0,16,50,0,0,7); c.fill();
  c.globalAlpha=A*0.35; c.strokeStyle='#fff'; c.lineWidth=4; c.beginPath(); c.arc(4,-24,30,-1.25,-0.35); c.stroke();
  c.globalAlpha=A*0.3; c.fillStyle='#fff'; c.beginPath(); c.ellipse(10,-44,9,4,-0.3,0,7); c.fill();
  c.globalAlpha=A*0.28; c.strokeStyle='#9fe8ff'; c.lineWidth=4; c.beginPath(); c.arc(0,4,28,1.75,2.85); c.stroke();
  c.globalAlpha=A; drawOutfit(c,cos.outfit,col); c.restore();
  c.strokeStyle='#07080d'; c.lineWidth=L;
  if(o.ghost){ c.fillStyle=col[1]; c.beginPath(); c.moveTo(-26,22); for(let i=0;i<=4;i++){c.quadraticCurveTo(-26+i*14-7,38,-26+i*14,28);} c.lineTo(30,22); c.fill(); }
  bodyPath(c); c.stroke();
  // visor
  const v=VISORC[cos.visor]||VISORC[0];
  const vg=c.createLinearGradient(0,-34,0,-10); vg.addColorStop(0,v[1]); vg.addColorStop(0.45,v[0]); vg.addColorStop(1,v[2]);
  c.fillStyle=vg; rr(c,0,-34,36,24,12); c.fill(); c.stroke();
  c.save(); c.globalAlpha=A*0.9; c.fillStyle='#fff'; rr(c,14,-30,15,5,2.5); c.fill(); c.globalAlpha=A*0.5; rr(c,31,-29,3,3,1.5); c.fill(); c.restore();
  if(cos.visor===6){c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;c.beginPath();c.moveTo(4,-26);c.lineTo(32,-26);c.moveTo(4,-18);c.lineTo(32,-18);c.stroke();c.lineWidth=L;c.strokeStyle='#07080d';}
  drawHat(c,cos.hat,col);
  c.restore();
}
function drawBody(c,col,cos){
  c.save(); c.beginPath(); c.rect(-60,-2,120,60); c.clip();
  c.fillStyle=col[2]; rr(c,-24,18,20,22,8); c.fill(); c.stroke(); rr(c,6,18,20,22,8); c.fill(); c.stroke();
  rr(c,-38,-18,18,40,7); c.fill(); c.stroke();
  bodyPath(c); c.fillStyle=col[1]; c.fill(); c.stroke(); c.restore();
  c.fillStyle='#9b1b1b'; c.beginPath(); c.ellipse(1,0,26,6,0,0,7); c.fill();
  c.fillStyle='#e9e4d8'; c.strokeStyle='#07080d'; c.lineWidth=4;
  rr(c,-4,-16,10,18,3); c.fill(); c.stroke();
  c.beginPath(); c.arc(-2,-18,5,0,7); c.arc(5,-18,5,0,7); c.fill(); c.stroke();
}
function drawOutfit(c,id,col){
  if(!id) return;
  c.save(); c.lineWidth=3; c.strokeStyle='rgba(0,0,0,.5)';
  const F=(f,p)=>{c.fillStyle=f;p();c.fill();};
  switch(id){
    case 1: F('#2b2f3a',()=>{c.beginPath();c.rect(-30,-6,64,40);}); F('#fff',()=>{c.beginPath();c.moveTo(-2,-6);c.lineTo(14,-6);c.lineTo(6,10);c.closePath();});
      F('#c0392b',()=>{c.beginPath();c.moveTo(4,-4);c.lineTo(8,-4);c.lineTo(9,16);c.lineTo(6,20);c.lineTo(3,16);c.closePath();}); break;
    case 2: F('#f4f6f8',()=>{c.beginPath();c.rect(-30,-8,64,42);}); c.strokeStyle='#aab';c.beginPath();c.moveTo(6,-8);c.lineTo(6,30);c.stroke(); F('#9fd3ff',()=>{c.beginPath();c.rect(14,4,8,6);}); break;
    case 3: F('#1f3b8c',()=>{c.beginPath();c.rect(-30,-6,64,40);}); F('#f2c94c',()=>{c.beginPath();c.moveTo(16,2);c.lineTo(22,6);c.lineTo(16,12);c.lineTo(10,6);c.closePath();}); break;
    case 4: F('#556b2f',()=>{c.beginPath();c.rect(-30,-8,64,42);}); F('#3d4f22',()=>{c.beginPath();c.ellipse(-10,6,8,5,0,0,7);c.ellipse(14,18,9,5,0,0,7);c.ellipse(20,0,6,4,0,0,7);}); break;
    case 5: F('#f2d43d',()=>{c.beginPath();c.rect(-30,-60,64,96);}); F('#222',()=>{c.beginPath();c.rect(-30,8,64,5);}); break;
    case 6: F('#3a5f9e',()=>{c.beginPath();c.rect(-30,2,64,32);c.rect(-2,-10,8,14);c.rect(18,-10,8,14);}); F('#f2c94c',()=>{c.beginPath();c.arc(2,8,2.5,0,7);c.arc(22,8,2.5,0,7);}); break;
    case 7: F('#111',()=>{c.beginPath();c.rect(-30,-6,64,40);}); F('#fff',()=>{c.beginPath();c.moveTo(-4,-6);c.lineTo(18,-6);c.lineTo(7,20);c.closePath();});
      F('#111',()=>{c.beginPath();c.moveTo(1,-2);c.lineTo(7,1);c.lineTo(13,-2);c.lineTo(13,4);c.lineTo(7,1);c.lineTo(1,4);c.closePath();}); break;
    case 8: F('#6c5ce7',()=>{c.beginPath();c.rect(-30,-6,64,40);}); F('#5848c9',()=>{c.beginPath();c.rect(-6,14,26,12);}); c.strokeStyle='#fff';c.beginPath();c.moveTo(2,-4);c.lineTo(2,8);c.moveTo(12,-4);c.lineTo(12,8);c.stroke(); break;
    case 9: F('#e74c3c',()=>{c.beginPath();c.rect(-30,-8,64,10);c.rect(14,0,10,20);}); F('#c0392b',()=>{c.beginPath();c.rect(-30,-1,64,3);c.rect(14,10,10,3);}); break;
    case 10:F('#fff',()=>{c.beginPath();c.rect(-30,-6,64,40);}); F('#d4af37',()=>{c.beginPath();c.rect(-30,-6,64,4);c.arc(8,6,2,0,7);c.arc(8,14,2,0,7);c.arc(8,22,2,0,7);}); break;
    case 11:F('#3fb59e',()=>{c.beginPath();c.rect(-30,-6,64,40);}); F('#ddd',()=>{c.beginPath();c.arc(18,6,5,0,7);}); c.strokeStyle='#222';c.beginPath();c.moveTo(-6,-6);c.quadraticCurveTo(8,14,18,6);c.stroke(); break;
    case 12:F('#eceff4',()=>{c.beginPath();c.rect(-30,-10,64,44);}); F('#e67e22',()=>{c.beginPath();c.rect(-30,8,64,4);}); F('#3498db',()=>{c.beginPath();c.rect(10,0,12,6);}); break;
    case 13:F('#222',()=>{c.beginPath();c.rect(-30,0,64,34);}); F('#f5f5f5',()=>{c.beginPath();c.rect(-30,0,64,6);}); F('#c0392b',()=>{c.beginPath();c.rect(-30,14,64,5);}); break;
    case 14:F('#15161c',()=>{c.beginPath();c.rect(-30,-60,64,96);}); F('#c0392b',()=>{c.beginPath();c.rect(-30,10,64,5);}); F('#2a2c36',()=>{c.beginPath();c.moveTo(-30,-8);c.lineTo(34,20);c.lineTo(34,26);c.lineTo(-30,-2);c.closePath();}); break;
    case 15:F('#ff7a1a',()=>{c.beginPath();c.rect(-30,-4,64,38);}); F('#333',()=>{c.beginPath();c.rect(-4,-4,6,38);c.rect(18,-4,6,38);c.rect(-30,12,64,4);}); F('#ffd34d',()=>{c.beginPath();c.arc(-1,14,3,0,7);c.arc(21,14,3,0,7);}); break;
    case 16:F('#14121f',()=>{c.beginPath();c.rect(-30,-60,64,96);}); c.strokeStyle='#3cf0ff'; c.lineWidth=2.5; c.shadowColor='#3cf0ff'; c.shadowBlur=8;
      c.beginPath(); c.moveTo(-26,-2);c.lineTo(0,-2);c.lineTo(8,8);c.lineTo(30,8); c.moveTo(-26,18);c.lineTo(10,18);c.lineTo(16,24); c.stroke(); c.strokeStyle='#ff3cd2'; c.beginPath(); c.moveTo(-20,-40);c.lineTo(-20,26); c.stroke(); break;
  }
  c.restore();
}
function drawHat(c,id,col){
  if(!id) return; c.save(); c.lineWidth=5; c.strokeStyle='#07080d';
  const P=(f,fn)=>{c.fillStyle=f;c.beginPath();fn();c.fill();c.stroke();};
  const t=performance.now()/1000;
  switch(id){
    case 1: P('#222',()=>rr(c,-24,-58,48,8,3)); P('#222',()=>rr(c,-14,-92,30,36,4)); c.fillStyle='#c0392b'; c.fillRect(-14,-66,30,6); break;
    case 2: P('#ff5fa2',()=>{c.moveTo(-14,-50);c.lineTo(4,-96);c.lineTo(20,-50);c.closePath();}); c.fillStyle='#ffe66d';[[-4,-62],[8,-72],[2,-82]].forEach(p=>{c.beginPath();c.arc(p[0],p[1],3.5,0,7);c.fill();}); P('#ffe66d',()=>c.arc(4,-97,5,0,7)); break;
    case 3: { const g=c.createLinearGradient(0,-82,0,-50); g.addColorStop(0,'#fff3a0'); g.addColorStop(1,'#d9a30f'); P(g,()=>{c.moveTo(-18,-50);c.lineTo(-20,-78);c.lineTo(-8,-64);c.lineTo(2,-82);c.lineTo(12,-64);c.lineTo(24,-78);c.lineTo(22,-50);c.closePath();}); c.fillStyle='#e74c3c';c.beginPath();c.arc(2,-60,3.5,0,7);c.fill(); c.fillStyle='#3ba3ff';c.beginPath();c.arc(-10,-56,2.5,0,7);c.arc(14,-56,2.5,0,7);c.fill(); break; }
    case 4: P('#2d98da',()=>{c.moveTo(-26,-46);c.bezierCurveTo(-26,-80,30,-80,30,-46);c.closePath();}); P('#ecf0f1',()=>c.arc(2,-79,6,0,7)); c.fillStyle='#1b6fa8';c.fillRect(-26,-52,56,7); break;
    case 5: P('#8b5a2b',()=>c.ellipse(2,-54,40,8,0,0,7)); P('#8b5a2b',()=>{c.moveTo(-16,-54);c.quadraticCurveTo(-14,-86,2,-80);c.quadraticCurveTo(18,-86,20,-54);c.closePath();}); c.fillStyle='#5a3a1a';c.fillRect(-15,-62,34,5); break;
    case 6: P('#fff',()=>rr(c,-20,-62,44,14,5)); P('#fff',()=>{c.arc(-8,-74,13,0,7);}); P('#fff',()=>c.arc(12,-76,14,0,7)); P('#fff',()=>c.arc(2,-86,12,0,7)); break;
    case 7: c.strokeStyle='#ffe066';c.lineWidth=6;c.shadowColor='#ffe066';c.shadowBlur=14;c.beginPath();c.ellipse(2,-78+Math.sin(t*2)*2,22,6,0,0,7);c.stroke(); break;
    case 8: P('#c0392b',()=>{c.moveTo(-18,-50);c.quadraticCurveTo(-26,-70,-16,-80);c.quadraticCurveTo(-14,-62,-4,-54);c.closePath();}); P('#c0392b',()=>{c.moveTo(18,-50);c.quadraticCurveTo(28,-70,20,-80);c.quadraticCurveTo(16,-62,8,-54);c.closePath();}); break;
    case 9: P(col[1],()=>{c.moveTo(-22,-44);c.lineTo(-18,-74);c.lineTo(-4,-54);c.closePath();}); P(col[1],()=>{c.moveTo(26,-44);c.lineTo(22,-74);c.lineTo(8,-54);c.closePath();});
      c.fillStyle='#ffb3c6';c.beginPath();c.moveTo(-17,-50);c.lineTo(-16,-66);c.lineTo(-9,-54);c.fill();c.beginPath();c.moveTo(21,-50);c.lineTo(20,-66);c.lineTo(13,-54);c.fill(); break;
    case 10: c.fillStyle='#ff6b9d';for(let i=0;i<5;i++){const a=i/5*6.28;c.beginPath();c.arc(14+Math.cos(a)*8,-56+Math.sin(a)*8,6,0,7);c.fill();c.stroke();} P('#ffd93d',()=>c.arc(14,-56,5,0,7)); break;
    case 11: c.strokeStyle='#222';c.lineWidth=7;c.beginPath();c.arc(2,-34,30,Math.PI*1.05,Math.PI*1.95);c.stroke();c.lineWidth=5;P('#e74c3c',()=>rr(c,-32,-40,12,22,5)); P('#e74c3c',()=>rr(c,24,-40,12,22,5)); break;
    case 12: { P('#e74c3c',()=>{c.moveTo(-26,-46);c.bezierCurveTo(-26,-74,30,-74,30,-46);c.closePath();}); c.fillStyle='#3498db';c.fillRect(-2,-80,6,10);c.strokeRect(-2,-80,6,10);
      c.save();c.translate(1,-82);c.scale(Math.cos(t*11),1);P('#f1c40f',()=>rr(c,-22,-3,44,6,3));c.restore(); break; }
    case 13: P('#e74c3c',()=>{c.moveTo(-26,-46);c.bezierCurveTo(-26,-76,30,-76,30,-46);c.closePath();}); P('#c0392b',()=>rr(c,20,-52,26,8,4)); break;
    case 14: P('#1f3b8c',()=>rr(c,-24,-64,52,18,6)); P('#111',()=>rr(c,10,-52,30,7,3)); c.fillStyle='#f2c94c';c.beginPath();c.arc(4,-56,4,0,7);c.fill(); break;
    case 15: c.strokeStyle='#2e7d32';c.beginPath();c.moveTo(2,-50);c.lineTo(2,-70);c.stroke(); P('#66bb6a',()=>c.ellipse(-8,-74,11,6,-0.5+Math.sin(t*2)*0.15,0,7)); P('#66bb6a',()=>c.ellipse(12,-74,11,6,0.5-Math.sin(t*2)*0.15,0,7)); break;
    case 16: P('#fdfdf6',()=>{c.moveTo(-22,-46);c.bezierCurveTo(-24,-88,28,-88,26,-46);c.closePath();}); c.fillStyle='#f5c542';c.beginPath();c.arc(2,-56,9,0,7);c.fill(); c.strokeStyle='#07080d';c.beginPath();c.moveTo(-22,-56);c.lineTo(-12,-62);c.lineTo(-2,-54);c.lineTo(8,-62);c.lineTo(18,-54);c.lineTo(26,-60);c.stroke(); break;
    case 17: P('#e67e22',()=>c.ellipse(2,-62,26,18,0,0,7)); c.strokeStyle='#b35400';c.beginPath();c.moveTo(-8,-78);c.quadraticCurveTo(-12,-62,-8,-46);c.moveTo(12,-78);c.quadraticCurveTo(16,-62,12,-46);c.stroke(); c.fillStyle='#2e7d32';c.fillRect(-1,-86,6,8); break;
    case 18: P('#5b3fa8',()=>{c.moveTo(-28,-48);c.lineTo(32,-48);c.lineTo(10,-104);c.closePath();}); c.fillStyle='#ffd93d';[[2,-66],[12,-80],[-6,-58]].forEach(p=>{c.beginPath();c.arc(p[0],p[1],3,0,7);c.fill();}); break;
    case 19: P('#9e9e9e',()=>{c.moveTo(-26,-46);c.bezierCurveTo(-26,-78,30,-78,30,-46);c.closePath();}); P('#f5f0dc',()=>{c.moveTo(-22,-62);c.quadraticCurveTo(-40,-70,-34,-90);c.quadraticCurveTo(-30,-72,-14,-68);c.closePath();}); P('#f5f0dc',()=>{c.moveTo(26,-62);c.quadraticCurveTo(44,-70,38,-90);c.quadraticCurveTo(34,-72,18,-68);c.closePath();}); break;
    case 20: P('#fff',()=>rr(c,-16,-82,36,32,8)); P('#ddd',()=>c.ellipse(2,-82,18,6,0,0,7)); P('#aaa',()=>c.ellipse(2,-82,5,2,0,0,7)); break;
    case 21: P('#e74c3c',()=>{c.moveTo(-28,-40);c.bezierCurveTo(-26,-66,30,-66,30,-40);c.lineTo(-28,-40);}); c.fillStyle='#fff';[[-12,-50],[4,-56],[18,-48]].forEach(p=>{c.beginPath();c.arc(p[0],p[1],2.5,0,7);c.fill();}); P('#e74c3c',()=>{c.moveTo(-26,-42);c.lineTo(-44,-36);c.lineTo(-40,-48);c.closePath();}); break;
    case 22: c.strokeStyle='#222';c.beginPath();c.moveTo(2,-50);c.quadraticCurveTo(2+Math.sin(t*3)*4,-66,2,-80);c.stroke(); c.shadowColor='#ff4757'; c.shadowBlur=10; P('#ff4757',()=>c.arc(2,-84,7,0,7)); break;
    case 23: { const mc=COLORS[(COLORS.indexOf(col)+5)%18]; c.save();c.translate(2,-50);c.scale(0.42,0.42);c.translate(0,-38); c.lineWidth=8;
      c.fillStyle=mc[2];rr(c,-38,-18,18,40,7);c.fill();c.stroke(); bodyPath(c);c.fillStyle=mc[1];c.fill();c.stroke(); c.fillStyle='#93C8DA';rr(c,0,-34,36,24,12);c.fill();c.stroke(); c.restore(); break; }
    case 24: P('#c0392b',()=>{c.moveTo(-14,-50);c.lineTo(-10,-80);c.lineTo(16,-80);c.lineTo(20,-50);c.closePath();}); c.strokeStyle='#111';c.lineWidth=3;c.beginPath();c.moveTo(2,-80);c.quadraticCurveTo(-6,-74,-8,-62);c.stroke(); break;
    case 25: P('#f1c40f',()=>{c.moveTo(-28,-46);c.bezierCurveTo(-26,-82,30,-82,30,-46);c.closePath();}); P('#f1c40f',()=>rr(c,-32,-50,68,7,3)); c.fillStyle='#d4a00f';c.fillRect(-2,-78,8,28); break;
    case 26: P('#e74c3c',()=>{c.moveTo(-24,-48);c.quadraticCurveTo(0,-100,40,-74);c.quadraticCurveTo(10,-76,28,-48);c.closePath();}); P('#fff',()=>rr(c,-26,-54,58,10,5)); P('#fff',()=>c.arc(42,-72,6,0,7)); break;
    case 27: P('#fff',()=>c.ellipse(-8,-76,7,24,-0.2,0,7)); P('#fff',()=>c.ellipse(14,-76,7,24,0.2,0,7)); c.fillStyle='#ffb3c6';c.beginPath();c.ellipse(-8,-76,3,16,-0.2,0,7);c.ellipse(14,-76,3,16,0.2,0,7);c.fill(); break;
    case 28: P('#3b2f2a',()=>rr(c,-27,-52,58,7,3)); { const g=c.createRadialGradient(8,-54,1,8,-52,8); g.addColorStop(0,'#fff'); g.addColorStop(0.4,'#ffbf47'); g.addColorStop(1,'#a8560c'); P(g,()=>c.arc(6,-52,8,0,7)); const g2=c.createRadialGradient(24,-54,1,24,-52,8); g2.addColorStop(0,'#fff'); g2.addColorStop(0.4,'#ffbf47'); g2.addColorStop(1,'#a8560c'); P(g2,()=>c.arc(22,-52,8,0,7)); } break;
    case 29: P('#d62839',()=>rr(c,-28,-50,60,9,3)); P('#d62839',()=>{c.moveTo(-26,-46);c.quadraticCurveTo(-40,-44+Math.sin(t*6)*3,-48,-34+Math.sin(t*6)*4);c.lineTo(-44,-32);c.quadraticCurveTo(-36,-40,-26,-42);c.closePath();}); break;
    case 30: { const f=Math.sin(t*14)*3; c.lineWidth=3; const g=c.createLinearGradient(0,-100,0,-48); g.addColorStop(0,'#fff27a'); g.addColorStop(0.5,'#ff9a1f'); g.addColorStop(1,'#e8340c'); c.shadowColor='#ff6a00'; c.shadowBlur=18;
      P(g,()=>{c.moveTo(-20,-50);c.quadraticCurveTo(-24,-74,-8,-84+f);c.quadraticCurveTo(-6,-70,2,-72);c.quadraticCurveTo(0,-90,12,-100-f);c.quadraticCurveTo(14,-80,20,-76);c.quadraticCurveTo(30,-66,24,-50);c.closePath();}); break; }
    case 31: c.lineWidth=4; P('#ffd23f',()=>rr(c,30,-80,8,52,4)); P('#ff7a1a',()=>rr(c,27,-86,14,10,4)); P('#2a3d4f',()=>rr(c,-27,-40,58,6,3)); break;
    case 32: { const g=c.createLinearGradient(0,-96,0,-52); g.addColorStop(0,'#fff9d6'); g.addColorStop(1,'#ffc2e8'); P(g,()=>{c.moveTo(-2,-52);c.lineTo(12,-52);c.lineTo(8,-98);c.closePath();}); c.lineWidth=2; c.beginPath(); for(let i=0;i<4;i++){c.moveTo(0+i*0.8,-58-i*9);c.lineTo(11-i*0.8,-62-i*9);} c.stroke(); c.lineWidth=5;
      ['#ff7ac6','#8fd3ff','#c79bff'].forEach((cc,i)=>P(cc,()=>c.ellipse(-16+i*4,-48-i*6,7,10,-0.6,0,7))); break; }
    case 33: P('#1b1d2a',()=>rr(c,-18,-60,42,12,3)); P('#1b1d2a',()=>{c.moveTo(-34,-64);c.lineTo(4,-78);c.lineTo(42,-64);c.lineTo(4,-52);c.closePath();}); c.strokeStyle='#ffcc33'; c.lineWidth=3; c.beginPath(); c.moveTo(4,-65); c.lineTo(30,-60); c.lineTo(30+Math.sin(t*3)*2,-44); c.stroke(); break;
  }
  c.restore();
}
function drawPet(c,x,y,s,id,col,t,flip){
  if(!id) return; const u=s/60; c.save(); c.translate(x,y); c.scale(u*(flip?-1:1),u); c.lineWidth=4; c.strokeStyle='#07080d';
  const b=Math.sin((t||0)*8)*2;
  c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(0,2,16,4,0,0,7);c.fill(); c.translate(0,b);
  const P=(f,fn)=>{c.fillStyle=f;c.beginPath();fn();c.fill();c.stroke();};
  const T=performance.now()/1000;
  switch(id){
    case 1: { const cc=COLORS[(COLORS.indexOf(col)+9)%18]; P(cc[2],()=>rr(c,-16,-26,8,16,3)); P(cc[1],()=>{c.moveTo(-10,-16);c.bezierCurveTo(-10,-38,14,-38,14,-16);c.lineTo(14,0);c.lineTo(-10,0);c.closePath();}); P('#93C8DA',()=>rr(c,2,-26,14,10,5)); break; }
    case 2: P('#c8955a',()=>c.ellipse(0,-10,16,10,0,0,7)); P('#c8955a',()=>c.arc(14,-20,9,0,7)); P('#7a4e24',()=>c.ellipse(9,-26,4,7,-0.5,0,7)); c.fillStyle='#000';c.beginPath();c.arc(17,-21,1.8,0,7);c.arc(22,-18,2.2,0,7);c.fill(); break;
    case 3: P('#f0a35e',()=>c.ellipse(0,-10,15,9,0,0,7)); P('#f0a35e',()=>c.arc(13,-20,9,0,7)); P('#f0a35e',()=>{c.moveTo(7,-26);c.lineTo(9,-34);c.lineTo(13,-28);c.closePath();c.moveTo(15,-28);c.lineTo(19,-34);c.lineTo(20,-25);c.closePath();}); c.fillStyle='#000';c.beginPath();c.arc(16,-21,1.8,0,7);c.fill(); c.strokeStyle='#f0a35e';c.lineWidth=5;c.beginPath();c.moveTo(-14,-10);c.quadraticCurveTo(-24,-22,-18,-30);c.stroke(); break;
    case 4: P('#b0bec5',()=>rr(c,-12,-30,24,26,6)); P('#37474f',()=>rr(c,-6,-24,16,8,3)); c.fillStyle='#4fc3f7';c.fillRect(-3,-22,4,4);c.fillRect(4,-22,4,4); c.strokeStyle='#222';c.beginPath();c.moveTo(0,-30);c.lineTo(0,-38);c.stroke(); P('#ff5252',()=>c.arc(0,-40,3,0,7)); break;
    case 5: c.translate(0,-14+Math.sin((t||T)*3)*4); P('#90a4ae',()=>c.ellipse(0,0,18,6,0,0,7)); P('#80deea',()=>c.ellipse(0,-5,9,7,0,Math.PI,0)); c.fillStyle='#ffeb3b';[-10,0,10].forEach(xx=>{c.beginPath();c.arc(xx,2,2,0,7);c.fill();}); break;
    case 6: P('#4fc3f7',()=>c.ellipse(0,-12,12,11,0,0,7)); P('#ffb300',()=>{c.moveTo(10,-14);c.lineTo(18,-12);c.lineTo(10,-9);c.closePath();}); c.fillStyle='#000';c.beginPath();c.arc(5,-15,2,0,7);c.fill(); P('#29b6f6',()=>c.ellipse(-4,-10,7,4,0.4+Math.sin((t||0)*14)*0.4,0,7)); break;
    case 7: P('rgba(102,187,106,.85)',()=>{c.moveTo(-16,0);c.bezierCurveTo(-18,-28,18,-28,16,0);c.closePath();}); c.fillStyle='#fff';c.beginPath();c.arc(-4,-12,4,0,7);c.arc(7,-12,4,0,7);c.fill();c.fillStyle='#000';c.beginPath();c.arc(-3,-12,2,0,7);c.arc(8,-12,2,0,7);c.fill(); break;
    case 8: P('#e0b080',()=>c.ellipse(0,-10,14,11,0,0,7)); P('#fff',()=>c.ellipse(5,-7,6,5,0,0,7)); P('#e0b080',()=>c.arc(-6,-20,4,0,7)); P('#e0b080',()=>c.arc(6,-20,4,0,7)); c.fillStyle='#000';c.beginPath();c.arc(8,-13,1.8,0,7);c.fill(); break;
    case 9: c.translate(0,-16+Math.sin(T*2.5)*3); P('#ff8c2a',()=>c.ellipse(0,0,14,9,0,0,7)); P('#ff8c2a',()=>{c.moveTo(-12,0);c.lineTo(-22,-8+Math.sin(T*10)*2);c.lineTo(-22,8+Math.sin(T*10)*2);c.closePath();}); c.fillStyle='#fff'; c.fillRect(-4,-8,3,16); c.fillStyle='#000';c.beginPath();c.arc(7,-2,2,0,7);c.fill(); break;
    case 10: c.translate(0,-18+Math.sin(T*2)*4); c.globalAlpha*=0.85; P('#eef3ff',()=>{c.moveTo(-12,8);c.lineTo(-12,-6);c.bezierCurveTo(-12,-22,12,-22,12,-6);c.lineTo(12,8);c.lineTo(6,4);c.lineTo(0,8);c.lineTo(-6,4);c.closePath();}); c.fillStyle='#223';c.beginPath();c.ellipse(-4,-6,2,3,0,0,7);c.ellipse(5,-6,2,3,0,0,7);c.fill(); break;
  }
  c.restore();
}
function crewCanvas(cos,size=72,o={}){
  const cv=document.createElement('canvas'); const dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=size*dpr; cv.height=size*dpr; cv.style.width=size+'px'; cv.style.height=size+'px';
  const c=cv.getContext('2d'); c.scale(dpr,dpr);
  drawCrew(c,size*0.5,size*0.93,size*0.62,cos,o);
  if(o.pet&&cos.pet) drawPet(c,size*0.82,size*0.95,size*0.3,cos.pet,COLORS[cos.color],0);
  return cv;
}
