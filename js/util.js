/* ================= UTIL ================= */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const ri=n=>Math.floor(Math.random()*n);
const pick=a=>a[ri(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const uid=(n=8)=>{const c='abcdefghijkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++)s+=c[ri(c.length)];return s;};
const now=()=>performance.now()/1000;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomCode=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<5;i++)s+=c[ri(c.length)];return s;};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const _shadeCache=new Map();
function shade(hex,a){ const k=hex+a; let r=_shadeCache.get(k); if(r) return r;
  let R,G,B; if(hex[0]==='r'){ const q=hex.match(/[\d.]+/g); R=+q[0]; G=+q[1]; B=+q[2]; } else { let c=hex.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join(''); const n=parseInt(c,16); R=n>>16; G=n>>8&255; B=n&255; }
  const f=a<0?0:255, t=Math.abs(a); R=Math.round(R+(f-R)*t); G=Math.round(G+(f-G)*t); B=Math.round(B+(f-B)*t);
  r=`rgb(${R},${G},${B})`; if(_shadeCache.size>4096)_shadeCache.clear(); _shadeCache.set(k,r); return r; }
function rgba(hex,a){ let c=hex.replace('#',''); if(c.length===3) c=c.split('').map(x=>x+x).join(''); const n=parseInt(c,16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; }
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function h(tag,attrs,...kids){ const e=document.createElement(tag); if(attrs) for(const k in attrs){ if(k==='style') e.style.cssText=attrs[k]; else if(k.startsWith('on')) e.addEventListener(k.slice(2),attrs[k]); else if(k==='html') e.innerHTML=attrs[k]; else e.setAttribute(k,attrs[k]); } kids.flat().forEach(k=>k!=null&&e.append(k.nodeType?k:document.createTextNode(k))); return e; }
const FONT_UI='Nunito, system-ui, -apple-system, Segoe UI, sans-serif';
const FONT_D='Fredoka, Nunito, system-ui, sans-serif';

/* ================= SVG ICONS ================= */
const IP={
 use:'M7 11V5.5a1.5 1.5 0 013 0V10 M10 10V4a1.5 1.5 0 013 0v6 M13 10V5a1.5 1.5 0 013 0v6 M16 11V8a1.5 1.5 0 013 0v6a7 7 0 01-7 7h-1a6 6 0 01-5-3l-2.5-4a1.5 1.5 0 012.5-1.6L7 14',
 report:'M3 10v4h3l7 4V6L6 10H3z M16 9a3 3 0 010 6 M18.5 6.5a7 7 0 010 11',
 kill:'M14.5 3.5c3 0 6 3 6 3l-9 9-3-3z M8.5 12.5l-5 5 3 3 5-5',
 vent:'M3 7h18v10H3z M7 7v10 M11 7v10 M15 7v10 M19 7v10',
 sabo:'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
 shift:'M3 6c4-2 14-2 18 0 0 7-4 12-9 12S3 13 3 6z M8 10h2 M14 10h2 M9 14c2 1.5 4 1.5 6 0',
 ghost:'M5 21V10a7 7 0 0114 0v11l-2.3-2-2.3 2-2.4-2-2.4 2-2.3-2z M9.5 10h.01 M14.5 10h.01',
 track:'M3 12a9 9 0 1018 0a9 9 0 10-18 0 M8 12a4 4 0 108 0a4 4 0 10-8 0 M12 12l7-5',
 vitals:'M3 12h4l2-5 4 10 2-5h6',
 shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
 shirt:'M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-1 2-2 3-4 3S9 5 8 3z',
 siren:'M6 18v-6a6 6 0 0112 0v6 M4 18h16v3H4z M12 2v2 M4 5.5L5.5 7 M20 5.5L18.5 7',
 map:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
 cams:'M3 8h12v8H3z M15 11l6-3v8l-6-3',
 fix:'M14.7 6.3a4 4 0 005 5L11 20a2.1 2.1 0 01-3-3l8.7-8.7a4 4 0 01-2-2z',
 chat:'M4 5h16v11H9l-5 4z',
 mic:'M9 5a3 3 0 016 0v6a3 3 0 01-6 0z M5 11a7 7 0 0014 0 M12 18v3',
 micoff:'M9 5a3 3 0 016 0v6a3 3 0 01-6 0z M5 11a7 7 0 0014 0 M12 18v3 M3 3l18 18',
 spk:'M4 9v6h4l5 4V5L8 9z M16 9a4 4 0 010 6 M18.5 6.5a8 8 0 010 11',
 spkoff:'M4 9v6h4l5 4V5L8 9z M16.5 9.5l5 5 M21.5 9.5l-5 5',
 menu:'M4 6h16 M4 12h16 M4 18h16',
 link:'M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1 M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1',
 gear:'M12 9a3 3 0 100 6 3 3 0 000-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
 folder:'M3 6h6l2 2h10v11H3z', phone:'M7 2h10v20H7z M11 18h2', arrow:'M4 12h15 M14 6l6 6-6 6',
 dish:'M5 15a7 7 0 009-9z M9.5 10.5L15 5 M15 5h.01 M8 20h8 M10 17l-1 3 M14 17l1 3',
 dna:'M7 3c0 6 10 6 10 12s-10 6-10 6 M17 3c0 6-10 6-10 12 M8 7h8 M8 17h8 M10 12h4',
 bulb:'M9 18h6 M10 21h4 M12 3a6 6 0 00-4 10.5c1 1 1 2 1 3h6c0-1 0-2 1-3A6 6 0 0012 3z',
 o2:'M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z',
 gavel:'M14 4l6 6 M11 7l6 6 M12.5 5.5l-4 4 3 3 4-4 M10 11l-7 7 2 2 7-7 M3 21h9',
 rotate:'M4 12a8 8 0 0114-5l2 2 M20 4v5h-5 M20 12a8 8 0 01-14 5l-2-2 M4 20v-5h5',
 bot:'M5 8h14v11H5z M12 4v4 M9 13h.01 M15 13h.01 M9 16h6',
 play:'M7 4l13 8-13 8z', users:'M9 11a4 4 0 100-8 4 4 0 000 8z M2 21a7 7 0 0114 0 M16 3.5a4 4 0 010 7.5 M22 21a7 7 0 00-5-6.7',
 full:'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5', exit:'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
};
const ICO=n=>`<svg class="svgi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${IP[n]||''}"/></svg>`;
