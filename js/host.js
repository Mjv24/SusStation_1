/* ================= HOST (authoritative game server running in the host's browser) ================= */
const ROLES={
  crewmate:{team:'crew',name:'Crewmate',desc:'Complete your tasks and find the Impostor.'},
  impostor:{team:'imp',name:'Impostor',desc:'Sabotage and kill the Crewmates.'},
  engineer:{team:'crew',name:'Engineer',desc:'You can use vents. Limited time inside, with a cooldown.',opt:{cd:['Vent Cooldown',20,5,60,5],max:['Max Time in Vents',15,5,60,5]}},
  scientist:{team:'crew',name:'Scientist',desc:'Check Vitals from anywhere. Tasks recharge your battery.',opt:{bat:['Battery Duration',10,5,30,5],cd:['Vitals Cooldown',15,5,60,5]}},
  noisemaker:{team:'crew',name:'Noisemaker',desc:'When you are killed, an alarm alerts everyone to your body.',opt:{imp:['Impostors Get Alert',1,0,1,1]}},
  tracker:{team:'crew',name:'Tracker',desc:'Place a tracker on a nearby player and follow them.',opt:{dur:['Tracking Duration',15,5,60,5],cd:['Tracking Cooldown',25,5,60,5]}},
  judge:{team:'crew',name:'Judge',desc:'Finish tasks to charge Overrule: eject anyone during a meeting. Pick a Crewmate and YOU get ejected.',opt:{tasks:['Tasks to Charge',3,1,10,1]}},
  guardian:{team:'crew',ghost:true,name:'Guardian Angel',desc:'You died, but you can still protect Crewmates from kills.',opt:{dur:['Protect Duration',10,5,30,5],cd:['Protect Cooldown',30,10,60,5]}},
  shapeshifter:{team:'imp',name:'Shapeshifter',desc:'Transform into another player to frame them.',opt:{dur:['Shift Duration',25,5,60,5],cd:['Shift Cooldown',25,5,60,5]}},
  phantom:{team:'imp',name:'Phantom',desc:'Vanish from sight. You cannot kill while invisible.',opt:{dur:['Vanish Duration',10,5,30,5],cd:['Vanish Cooldown',25,5,60,5]}},
  viper:{team:'imp',name:'Viper',desc:'Bodies you leave dissolve with acid after a short time.',opt:{dis:['Dissolve Time',15,5,40,5]}},
};
const SPECIAL_ROLES=['engineer','scientist','noisemaker','tracker','judge','guardian','shapeshifter','phantom','viper'];
const KILL_DIST=[1.05,1.55,2.1];
function defaultSettings(){
  const roles={}; SPECIAL_ROLES.forEach(r=>{roles[r]={n:0,ch:100}; const o=ROLES[r].opt||{}; Object.keys(o).forEach(k=>roles[r][k]=o[k][1]);});
  return {map:0,imp:1,killCd:25,killDist:1,speed:1,crewVision:1,impVision:1.5,meetings:1,btnCd:15,discuss:30,vote:60,
    anon:false,confirm:true,taskbar:'always',common:1,long:1,short:2,visual:true,voice:'proximity',roles};
}
const BOT_NAMES=['Nova','Pixel','Echo','Orbit','Comet','Blip','Zed','Mochi','Pluto','Quark','Vega','Tofu','Nimbus','Rex'];
const BOT_LINES={start:['where','who?','wait what','i was doing tasks','sus','not me'],skip:['skip','skip no proof','idk skip'],
  self:['i was in {room}','doing {task} in {room}','was at {room}'],acc:['{name} sus','{name} was near the body','i saw {name}!!','its {name}'],
  wit:['{name} KILLED!! i saw it','{name} vented','100% {name}']};

class Host{
  constructor(code,hostPid,transport){
    this.code=code; this.hostPid=hostPid; this.net=transport; this.players=new Map(); this.cidToPid=new Map(); this.local=new Map();
    this.settings=defaultSettings(); this.phase='lobby'; this.map=LOBBY; this.mapIdx=0; this.t=0; this.tick=0;
    this.bodies=[]; this.sab=null; this.saboCd=0; this.doors={}; this.doorCd={}; this.btnCd=0; this.meeting=null; this.ej=null; this.end=null;
    this.phaseLeft=0; this.chatLog=[]; this.rosterDirty=true; this.botN=0; this.taskTotal=0; this.taskDone=0; this.tbShown=0; this.revealed=new Set();
    this.lastReal=now();
  }
  onConn(cid){}
  onClose(cid){ const pid=this.cidToPid.get(cid); this.cidToPid.delete(cid); const p=pid&&this.players.get(pid); if(p&&p.cid===cid){p.cid=null; p.online=false; p.offT=this.t; this.rosterDirty=true;} }
  onMsg(cid,m){
    if(!m||typeof m!=='object') return;
    if(m.t==='hello') return this.hello(cid,m);
    const pid=this.cidToPid.get(cid); if(!pid) return; this.recv(pid,m);
  }
  hello(cid,m){
    let p=this.players.get(m.pid);
    if(!p){
      const n=[...this.players.values()].filter(x=>!x.left).length;
      if(n>=15){ this.net.send(cid,{t:'reject',why:'Room is full (15 players).'}); return; }
      p=this.addPlayer(m.pid,m.name,m.cos,false); if(this.phase!=='lobby'){ p.spec=true; p.dead=true; }
    } else if(p.kicked){ this.net.send(cid,{t:'reject',why:'You were removed by the host.'}); return; }
    if(p.cid&&p.cid!==cid){ this.cidToPid.delete(p.cid); this.net.drop(p.cid); }
    p.sq++; p.cid=cid; p.online=true; p.lastSeen=this.t; p.peer=m.peer||p.peer; this.cidToPid.set(cid,p.id);
    if(m.name) p.name=cleanName(m.name);
    this.rosterDirty=true;
    this.sendTo(p.id,{t:'welcome',you:p.id,host:p.id===this.hostPid,code:this.code,settings:this.settings});
    this.sendTo(p.id,{t:'chatlog',log:this.chatLog.slice(-40)});
    this.sendRoster(); this.sendSnap(p);
  }
  attachLocal(pid,fn){ this.local.set(pid,fn); }
  sendTo(pid,m){ const lf=this.local.get(pid); if(lf){ lf(m); return; } const p=this.players.get(pid); if(p&&p.cid!=null&&!p.bot) this.net.send(p.cid,m); }
  broadcast(m,filter){ this.players.forEach(p=>{ if(!p.bot&&(!filter||filter(p))) this.sendTo(p.id,m); }); }
  addPlayer(pid,name,cos,bot){
    cos=sanitizeCos(cos);
    const used=new Set([...this.players.values()].filter(p=>!p.left).map(p=>p.cos.color));
    if(used.has(cos.color)){ const free=COLORS.map((_,i)=>i).filter(i=>!used.has(i)); cos.color=free.length?pick(free):0; }
    const sp=this.spawnPoint([...this.players.values()].length);
    const p={id:pid,name:cleanName(name),cos,bot,cid:null,online:bot,lastSeen:this.t,peer:null,x:sp[0],y:sp[1],d:1,m:0,sq:0,
      role:'crewmate',team:'crew',dead:false,tasks:[],killCd:0,ml:0,vent:null,ventCd:0,ventT:0,abCd:0,shift:null,invis:0,track:null,prot:0,
      judgeUsed:false,bat:0,panel:null,anim:null,sp:0,joined:this.t, brain:bot?{}:null};
    this.players.set(pid,p); this.rosterDirty=true; return p;
  }
  addBot(){ if([...this.players.values()].filter(x=>!x.left).length>=15) return; this.botN++;
    const cos={color:0,hat:ri(HATS.length),outfit:ri(OUTFITS.length),visor:ri(VISORS.length),pet:Math.random()<.4?1+ri(PETS.length-1):0};
    const p=this.addPlayer('bot'+uid(6),'Bot '+BOT_NAMES[(this.botN-1)%BOT_NAMES.length],cos,true); if(this.phase!=='lobby'){p.spec=true;p.dead=true;} }
  removeBot(){ const b=[...this.players.values()].filter(p=>p.bot); if(b.length&&this.phase==='lobby'){ this.players.delete(b[b.length-1].id); this.rosterDirty=true; } }
  spawnPoint(i){ const m=this.map; const [sx,sy]=m.spawn; for(let k=0;k<40;k++){ const a=(i+k)*2.39996, r=k===0&&i===0?0:0.9+((i+k)%3)*0.6; const x=sx+Math.cos(a)*r, y=sy+Math.sin(a)*r*0.7; if(canStand(m,x,y)) return [x,y]; } return [sx,sy]; }
  living(){ return [...this.players.values()].filter(p=>!p.dead&&!p.spec&&!p.left); }
  inGame(){ return [...this.players.values()].filter(p=>!p.spec&&!p.left); }
  closedSet(){ const s=new Set(); for(const r in this.doors) if(this.doors[r]>this.t) s.add(+r); return s; }

  recv(pid,m){
    const p=this.players.get(pid); if(!p) return; p.lastSeen=this.t; if(!p.online){p.online=true;this.rosterDirty=true;}
    const isHost=pid===this.hostPid, S=this.settings, M=this.map;
    switch(m.t){
      case 'ping': this.sendTo(pid,{t:'pong',c:m.c}); break;
      case 'in': {
        if(m.sq!==p.sq) break;
        p.sp=m.sp?1:0;
        if(p.vent!=null||this.phase==='meeting'||this.phase==='eject'||this.phase==='intro'||this.phase==='end') break;
        const x=+m.x,y=+m.y; if(!isFinite(x)||!isFinite(y)) break;
        const ghost=p.dead||p.spec;
        if(Math.hypot(x-p.x,y-p.y)>8){ p.sq++; break; }
        if(ghost){ p.x=clamp(x,0,M.w); p.y=clamp(y,0,M.h); } else {
          const closed=this.closedSet(), dist=Math.hypot(x-p.x,y-p.y), steps=Math.max(1,Math.ceil(dist/0.12));
          let valid=true; for(let j=1;j<=steps;j++) if(!canStand(M,p.x+(x-p.x)*j/steps,p.y+(y-p.y)*j/steps,closed)){valid=false;break;}
          if(valid){p.x=x;p.y=y;} else p.sq++;
        }
        p.d=m.d<0?-1:1; p.m=m.m?1:0; break; }
      case 'cos': {
        if(m.name) p.name=cleanName(m.name);
        if(m.cos){ const c=sanitizeCos(m.cos); const taken=[...this.players.values()].some(o=>o!==p&&!o.left&&o.cos.color===c.color);
          if(taken&&c.color!==p.cos.color){ c.color=p.cos.color; this.sendTo(pid,{t:'ev',e:'toast',msg:'That color is taken'}); } p.cos=c; }
        this.rosterDirty=true; break; }
      case 'peer': p.peer=m.peer; this.rosterDirty=true; break;
      case 'set': if(isHost&&this.phase==='lobby'&&m.settings){ this.settings=sanitizeSettings(m.settings); this.broadcast({t:'settings',settings:this.settings}); } break;
      case 'bot+': if(isHost&&this.phase==='lobby') this.addBot(); break;
      case 'bot-': if(isHost) this.removeBot(); break;
      case 'kick': if(isHost&&m.id!==this.hostPid){ const k=this.players.get(m.id); if(k){ this.sendTo(k.id,{t:'reject',why:'You were removed by the host.'}); if(this.phase==='lobby')this.players.delete(k.id); else {k.left=true;k.dead=true;} k.kicked=true; this.rosterDirty=true; this.checkWin(); } } break;
      case 'start': if(isHost&&this.phase==='lobby') this.startGame(); break;
      case 'again': if(isHost&&this.phase==='end') this.toLobby(); break;
      case 'leave': this.playerLeft(p); break;
      case 'chat': this.chat(p,m.text); break;
      case 'kill': this.kill(p,this.players.get(m.id)); break;
      case 'report': this.report(p,m.id); break;
      case 'btn': this.button(p); break;
      case 'task': this.taskDoneMsg(p,m.ti); break;
      case 'anim': if(S.visual&&!p.dead) p.anim=m.k?{k:m.k,until:this.t+(m.k==='scan'?10:6)}:null; break;
      case 'vent': this.ventMsg(p,m); break;
      case 'sabo': this.sabotage(p,m.k,m.room); break;
      case 'fix': this.fix(p,m.k,m.st); break;
      case 'hold': if(this.canAct(p)&&this.sab&&this.sab.hold&&Number.isInteger(m.st)&&m.st>=0&&m.st<2&&Math.hypot(p.x-M.critStations[m.st][0],p.y-M.critStations[m.st][1])<2.2){ const st=m.st; if(m.on){ this.sab.hold[st]=p.id; } else if(this.sab.hold[st]===p.id) this.sab.hold[st]=null; } break;
      case 'ab': this.ability(p,m); break;
      case 'panel': p.panel=(m.k==='vitals'||m.k==='admin')?m.k:null; if(p.panel==='vitals'&&p.role==='scientist'&&m.port){ if(p.bat<=0||p.abCd>0) p.panel=null; else p.portVit=true; } else p.portVit=false; break;
      case 'vote': this.vote(p,m.id); break;
      case 'over': this.overrule(p,m.id); break;
    }
  }
  chat(p,text){
    text=String(text||'').slice(0,140).trim(); if(!text) return;
    if(this.phase==='play'&&!p.dead&&!p.spec) return;
    if(p.lastChat&&this.t-p.lastChat<0.6) return; p.lastChat=this.t;
    const ghost=p.dead||p.spec; const msg={t:'chat',from:p.id,text,ghost};
    if(this.phase==='lobby'||this.phase==='end') { this.chatLog.push(msg); if(this.chatLog.length>80)this.chatLog.shift(); }
    this.broadcast(msg,q=>!ghost||q.dead||q.spec||this.phase==='lobby'||this.phase==='end');
  }
  playerLeft(p){
    if(this.phase==='lobby'||p.spec){ this.players.delete(p.id); }
    else { p.left=true; p.dead=true; p.online=false; this.broadcast({t:'ev',e:'toast',msg:p.name+' left the game'}); this.checkWin(); }
    this.rosterDirty=true;
  }
  startGame(){
    const S=this.settings; const ps=[...this.players.values()].filter(p=>!p.left&&(p.online||p.bot));
    if(ps.length<minPlayers(S.imp)) { this.sendTo(this.hostPid,{t:'ev',e:'toast',msg:`Need at least ${minPlayers(S.imp)} players`}); return; }
    this.mapIdx=S.map<0?1+ri(GAME_MAPS.length):S.map+1; this.map=MAPS[this.mapIdx];
    this.players.forEach(p=>{p.spec=!ps.includes(p);});
    const order=shuffle(ps.slice()); const imps=order.slice(0,S.imp);
    ps.forEach(p=>{ const imp=imps.includes(p); Object.assign(p,{team:imp?'imp':'crew',role:imp?'impostor':'crewmate',dead:false,vent:null,ventCd:0,ventT:0,
      abCd:10,shift:null,invis:0,track:null,prot:0,judgeUsed:false,bat:0,panel:null,anim:null,killCd:10,ml:S.meetings,m:0,brain:p.bot?{}:null}); p.sq++; });
    SPECIAL_ROLES.forEach(r=>{ const R=ROLES[r], cfg=S.roles[r]; if(!cfg||!cfg.n||R.ghost) return;
      for(let i=0;i<cfg.n;i++){ if(Math.random()*100>=cfg.ch) continue; const pool=shuffle(ps.filter(p=>p.team===R.team&&p.role===(R.team==='imp'?'impostor':'crewmate'))); if(pool.length) pool[0].role=r; } });
    ps.forEach(p=>{ if(p.role==='scientist') p.bat=S.roles.scientist.bat; });
    this.assignTasks(ps);
    const crew=ps.filter(p=>p.team==='crew'); this.taskTotal=crew.reduce((a,p)=>a+p.tasks.length,0); this.taskDone=0; this.tbShown=0;
    const sp=this.map.spawn; ps.forEach((p,i)=>{ const a=i/ps.length*Math.PI*2; let x=sp[0]+Math.cos(a)*1.6, y=sp[1]+Math.sin(a)*1.2; if(!canStand(this.map,x,y)){x=sp[0];y=sp[1];} p.x=x;p.y=y; });
    this.bodies=[]; this.sab=null; this.saboCd=10; this.doors={}; this.doorCd={}; this.btnCd=S.btnCd; this.meeting=null; this.ej=null; this.end=null; this.revealed=new Set();
    this.phase='intro'; this.phaseLeft=6.2; this.rosterDirty=true;
    ps.forEach(p=>this.sendTo(p.id,{t:'ev',e:'intro',role:p.role,team:p.team,mates:p.team==='imp'?imps.map(i=>i.id):ps.map(q=>q.id),nimp:S.imp,map:this.mapIdx}));
  }
  assignTasks(ps){
    const M=this.map,S=this.settings; const byType={}; M.stations.forEach(s=>(byType[s.type]=byType[s.type]||[]).push(s.i));
    const types=c=>Object.keys(byType).filter(t=>TASKDEF[t]&&TASKDEF[t].cat===c);
    const mk=t=>{ const st=[pick(byType[t])]; const ch=TASKDEF[t].chain; if(ch&&byType[ch]) st.push(pick(byType[ch])); return {type:t,st,stage:0,done:false}; };
    const common=shuffle(types('common')).slice(0,S.common).map(mk);
    ps.forEach(p=>{ const L=shuffle(types('long')).slice(0,S.long).map(mk), Sh=shuffle(types('short')).slice(0,S.short).map(mk);
      p.tasks=[...common.map(t=>({...t,st:t.st.slice()})),...L,...Sh]; });
  }
  toLobby(){
    this.phase='lobby'; this.map=LOBBY; this.mapIdx=0; this.bodies=[]; this.sab=null; this.doors={}; this.meeting=null; this.ej=null; this.end=null;
    [...this.players.values()].forEach(p=>{ if(p.left) this.players.delete(p.id); });
    [...this.players.values()].forEach((p,i)=>{ const sp=this.spawnPoint(i); Object.assign(p,{x:sp[0],y:sp[1],dead:false,spec:false,role:'crewmate',team:'crew',tasks:[],vent:null,shift:null,invis:0,track:null,panel:null,anim:null}); p.sq++; });
    this.rosterDirty=true; this.broadcast({t:'ev',e:'lobby'});
  }
  checkWin(){
    if(this.phase!=='play'&&this.phase!=='eject') return false;
    const ps=this.inGame(); const li=ps.filter(p=>!p.dead&&p.team==='imp').length, lc=ps.filter(p=>!p.dead&&p.team==='crew').length;
    if(li===0) return this.gameOver('crew','All Impostors were ejected'),true;
    if(li>=lc) return this.gameOver('imp','Impostors outnumbered the crew'),true;
    if(this.taskTotal>0&&this.taskDone>=this.taskTotal) return this.gameOver('crew','All tasks completed'),true;
    return false;
  }
  gameOver(win,why){
    this.phase='end'; this.sab=null;
    const ps=this.inGame(); const roles={}; ps.forEach(p=>roles[p.id]=p.role);
    this.end={win,why,imps:ps.filter(p=>p.team==='imp').map(p=>p.id),roles};
    this.broadcast({t:'ev',e:'end',...this.end}); this.rosterDirty=true;
  }
  canAct(p){ return this.phase==='play'&&!p.dead&&!p.spec; }
  kill(p,v){
    const S=this.settings;
    if(!this.canAct(p)||p.team!=='imp'||!v||v.dead||v.spec||v.team==='imp'||p.vent!=null||v.vent!=null||p.killCd>0||p.invis>this.t) return;
    if(Math.hypot(p.x-v.x,p.y-v.y)>KILL_DIST[S.killDist]+0.35 || !lineOfSight(this.map,p.x,p.y,v.x,v.y,this.closedSet())) return;
    if(v.prot>this.t){ p.killCd=S.killCd; v.prot=0; this.broadcast({t:'ev',e:'shield',x:v.x,y:v.y},q=>q.id===p.id||q.id===v.id||q.role==='guardian'); return; }
    v.dead=true; v.panel=null; v.anim=null; v.deathT=this.t;
    this.bodies.push({id:v.id,x:v.x,y:v.y,dis:p.role==='viper'?this.t+S.roles.viper.dis:0,born:this.t});
    p.x=v.x; p.y=v.y; p.sq++; p.killCd=S.killCd; p.anim=null;
    this.sendTo(v.id,{t:'ev',e:'killed',by:p.shift?p.shift.as:p.id});
    this.sendTo(p.id,{t:'ev',e:'kill',id:v.id});
    if(v.role==='noisemaker'){ this.broadcast({t:'ev',e:'alarm',x:v.x,y:v.y,id:v.id},q=>q.team==='crew'||S.roles.noisemaker.imp); }
    const g=S.roles.guardian; if(v.team==='crew'&&g&&g.n>0){ const cur=this.inGame().filter(q=>q.role==='guardian').length; if(cur<g.n&&Math.random()*100<g.ch){ v.role='guardian'; v.abCd=5; this.sendTo(v.id,{t:'ev',e:'ghostrole',role:'guardian'}); } }
    this.players.forEach(b=>{ if(b.bot&&!b.dead&&b!==p&&b.team==='crew'&&Math.hypot(b.x-v.x,b.y-v.y)<6&&lineOfSight(this.map,b.x,b.y,v.x,v.y,this.closedSet())){ b.brain.saw=p.id; } });
    this.checkWin();
  }
  report(p,bid){ if(!this.canAct(p)) return; const b=this.bodies.find(x=>x.id===bid); if(!b||Math.hypot(p.x-b.x,p.y-b.y)>2.4||!lineOfSight(this.map,p.x,p.y,b.x,b.y,this.closedSet())) return; this.startMeeting(p,b.id); }
  button(p){
    const M=this.map; if(!this.canAct(p)||!M.button||p.ml<=0||this.btnCd>0) return;
    if(this.sab&&this.sab.crit) return;
    if(Math.hypot(p.x-M.button[0],p.y-M.button[1])>2.3) return;
    p.ml--; this.startMeeting(p,null);
  }
  taskDoneMsg(p,ti){
    if(this.phase!=='play'||p.spec||p.team!=='crew') return; const t=p.tasks[ti|0]; if(!t||t.done) return;
    const st=this.map.stations[t.st[t.stage]]; if(!st||Math.hypot(p.x-st.x,p.y-st.y)>2) return;
    t.stage++; p.anim=null;
    if(t.stage>=t.st.length){ t.done=true; this.taskDone++;
      if(p.role==='scientist') p.bat=Math.min(p.bat+this.settings.roles.scientist.bat*0.5,this.settings.roles.scientist.bat*3);
      this.checkWin(); }
  }
  ventMsg(p,m){
    if(!this.canAct(p)) return; const M=this.map;
    if(!(p.team==='imp'||p.role==='engineer')) return;
    if(m.a==='in'&&p.vent==null){
      if(p.role==='engineer'&&p.ventCd>0) return; if(p.invis>this.t) return;
      const v=M.ventList.find(v=>Math.hypot(v.x-p.x,v.y-p.y)<1.4); if(!v) return;
      p.vent=v.i; p.x=v.x; p.y=v.y; p.sq++; p.ventT=this.t; p.anim=null; this.ventFx(v);
    } else if(m.a==='go'&&p.vent!=null){
      const v=M.ventList[p.vent]; if(!v.links.includes(m.to)) return; const n=M.ventList[m.to]; p.vent=n.i; p.x=n.x; p.y=n.y; p.sq++;
    } else if(m.a==='out'&&p.vent!=null){ this.exitVent(p); }
  }
  exitVent(p){ const v=this.map.ventList[p.vent]; p.vent=null; p.sq++; if(v)this.ventFx(v); if(p.role==='engineer') p.ventCd=this.settings.roles.engineer.cd; }
  ventFx(v){ this.broadcast({t:'ev',e:'vent',i:v.i}); }
  sabotage(p,k,room){
    if(this.phase!=='play'||p.team!=='imp') return; const M=this.map;
    if(k==='doors'){ room=room|0; if(!M.doorRooms.includes(room)) return; if((this.doorCd[room]||0)>this.t) return; this.doors[room]=this.t+10; this.doorCd[room]=this.t+25; return; }
    if(this.sab||this.saboCd>0) return;
    if(k==='lights'&&M.sab.lights) this.sab={k,sw:shuffle([1,0,1,0,0])};
    else if(k==='comms'&&M.sab.comms) this.sab={k};
    else if((k==='reactor'||k==='seismic')&&M.critStations&&M.critical===k) this.sab={k,crit:true,left:45,hold:[null,null]};
    else if(k==='o2'&&M.sab.o2) this.sab={k,crit:true,left:40,done:[false,false],code:String(10000+ri(90000))};
    else return;
    this.saboCd=30; this.broadcast({t:'ev',e:'sab',k});
  }
  fix(p,k,st){
    if(this.phase!=='play'||!this.sab||this.sab.k!==k||p.dead) return; const M=this.map;
    const near=pt=>pt&&Math.hypot(p.x-pt[0],p.y-pt[1])<2.2;
    if(k==='lights'&&near(M.sab.lights)) this.endSab();
    else if(k==='comms'&&near(M.sab.comms)) this.endSab();
    else if(k==='o2'){ st=st|0; if(near(M.sab.o2[st])){ this.sab.done[st]=true; if(this.sab.done.every(x=>x)) this.endSab(); } }
  }
  endSab(){ if(!this.sab) return; this.broadcast({t:'ev',e:'fixed',k:this.sab.k}); this.sab=null; this.saboCd=Math.max(this.saboCd,15); }
  ability(p,m){
    const S=this.settings, R=S.roles[p.role]; if(this.phase!=='play'||p.spec) return;
    const tgt=m.id&&this.players.get(m.id);
    switch(p.role){
      case 'shapeshifter': if(p.dead) return;
        if(m.k==='unshift'&&p.shift){ p.shift=null; p.abCd=R.cd; this.broadcast({t:'ev',e:'puff',x:p.x,y:p.y}); return; }
        if(p.abCd>0||p.shift||!tgt||tgt===p||tgt.spec) return; p.shift={as:tgt.id,until:this.t+R.dur}; this.broadcast({t:'ev',e:'puff',x:p.x,y:p.y}); this.rosterDirty=true; break;
      case 'phantom': if(p.dead) return;
        if(m.k==='appear'&&p.invis>this.t){ p.invis=0; p.abCd=R.cd; p.killCd=Math.max(p.killCd,2); return; }
        if(p.abCd>0||p.vent!=null) return; p.invis=this.t+R.dur; this.broadcast({t:'ev',e:'puff',x:p.x,y:p.y,soft:1}); break;
      case 'tracker': if(p.dead||p.abCd>0||!tgt||tgt===p||tgt.dead||Math.hypot(tgt.x-p.x,tgt.y-p.y)>3.2) return; p.track={id:tgt.id,until:this.t+R.dur}; p.abCd=R.cd+R.dur; break;
      case 'guardian': if(!p.dead||p.abCd>0||!tgt||tgt.dead||Math.hypot(tgt.x-p.x,tgt.y-p.y)>3.5) return; tgt.prot=this.t+R.dur; p.abCd=R.cd; break;
    }
  }
  startMeeting(caller,bodyId){
    this.players.forEach(p=>{ p.vent=null; p.shift=null; p.invis=0; p.panel=null; p.anim=null; p.track=null; });
    this.sab=null; this.doors={};
    this.inGame().filter(p=>p.dead).forEach(p=>this.revealed.add(p.id));
    this.bodies=[]; this.seatAll(); this.phase='meeting';
    this.meeting={caller:caller.id,body:bodyId,st:'intro',left:2.6,votes:{}};
    this.broadcast({t:'ev',e:'meeting',caller:caller.id,body:bodyId});
    this.players.forEach(b=>{ if(b.bot) b.brain.voteAt=null; });
  }
  seatAll(){
    const M=this.map, ps=this.inGame(), [tx,ty]=M.table||M.spawn; const n=ps.length;
    ps.forEach((p,i)=>{ const a=-Math.PI/2+i/n*Math.PI*2; let r=2.6,x,y; for(let k=0;k<8;k++){ x=tx+Math.cos(a)*r; y=ty+Math.sin(a)*r*0.8; if(canStand(M,x,y))break; r-=0.25; }
      if(!canStand(M,x,y)){x=tx;y=ty+1.8;} p.x=x;p.y=y;p.sq++;p.m=0;p.d=Math.cos(a)>0?-1:1; });
  }
  vote(p,id){
    const mt=this.meeting; if(this.phase!=='meeting'||!mt||mt.st!=='vote'||p.dead||p.spec||mt.votes[p.id]!==undefined) return;
    if(id!=='skip'){ const t=this.players.get(id); if(!t||t.dead||t.spec) return; }
    mt.votes[p.id]=id;
    if(this.living().every(q=>mt.votes[q.id]!==undefined||!q.online)) mt.left=Math.min(mt.left,0.8);
  }
  overrule(p,id){
    const mt=this.meeting, S=this.settings; if(this.phase!=='meeting'||!mt||mt.st!=='vote'||p.dead||p.role!=='judge'||p.judgeUsed) return;
    if(p.tasks.filter(t=>t.done).length<Math.min(S.roles.judge.tasks,p.tasks.length)) return;
    const t=this.players.get(id); if(!t||t.dead||t===p) return;
    p.judgeUsed=true; mt.over={judge:p.id,target:id}; mt.st='res'; mt.left=4; mt.result=t.team==='imp'?id:p.id;
    this.broadcast({t:'ev',e:'overrule',judge:p.id,target:id});
  }
  tallyVotes(){
    const mt=this.meeting, c={}; Object.values(mt.votes).forEach(v=>c[v]=(c[v]||0)+1);
    let best=null,bn=0,tie=false; Object.entries(c).forEach(([k,n])=>{ if(n>bn){bn=n;best=k;tie=false;} else if(n===bn) tie=true; });
    mt.result=(!best||tie||best==='skip')?null:best;
  }
  doEject(){
    const mt=this.meeting, S=this.settings; const id=mt.result; const p=id&&this.players.get(id);
    const remainBefore=this.inGame().filter(q=>!q.dead&&q.team==='imp').length;
    if(p){ p.dead=true; const imp=p.team==='imp'; this.revealed.add(p.id);
      const remain=remainBefore-(imp?1:0);
      let text=S.confirm?`${p.name} was ${imp?'':'not '}${imp?(S.imp>1?'An':'The'):'An'} Impostor.`:`${p.name} was ejected.`;
      if(mt.over&&mt.over.judge===p.id) text=`${p.name} was overruled and ejected.`;
      this.ej={id:p.id,text,sub:S.confirm?`${remain} Impostor${remain===1?'':'s'} remain${remain===1?'s':''}.`:''};
    } else this.ej={id:null,text:'No one was ejected.'+(Object.keys(mt.votes).length?' (Tie or skipped)':' (Skipped)'),sub:''};
    this.phase='eject'; this.phaseLeft=6.5;
  }
  afterEject(){
    this.ej=null; this.meeting=null; const S=this.settings;
    this.phase='play'; if(this.checkWin()) return;
    this.seatAll(); this.btnCd=S.btnCd; this.inGame().forEach(p=>{ if(p.team==='imp') p.killCd=S.killCd; p.abCd=Math.max(p.abCd,8); if(p.role==='engineer')p.ventCd=Math.max(p.ventCd,8); });
    this.saboCd=Math.max(this.saboCd,10); if(S.taskbar==='meetings') this.tbShown=this.taskDone;
  }
  update(){
    const real=now(); let dt=real-this.lastReal; this.lastReal=real; dt=clamp(dt,0,0.5); this.t+=dt; this.tick++;
    this.players.forEach(p=>{ if(!p.bot&&p.id!==this.hostPid&&p.online&&this.t-p.lastSeen>25){ p.online=false; this.rosterDirty=true; }
      if(this.phase==='lobby'&&!p.bot&&!p.online&&p.id!==this.hostPid&&this.t-p.lastSeen>900){ this.players.delete(p.id); this.rosterDirty=true; } });
    if(this.phase==='intro'){ this.phaseLeft-=dt; if(this.phaseLeft<=0) this.phase='play'; }
    else if(this.phase==='play') this.updatePlay(dt);
    else if(this.phase==='meeting') this.updateMeeting(dt);
    else if(this.phase==='eject'){ this.phaseLeft-=dt; if(this.phaseLeft<=0) this.afterEject(); }
    if(this.phase==='lobby') this.updateBotsLobby(dt);
    if(this.rosterDirty){ this.rosterDirty=false; this.sendRoster(); }
    if(this.tick%2===0) this.players.forEach(p=>{ if(!p.bot) this.sendSnap(p); });
  }
  updatePlay(dt){
    const S=this.settings, t=this.t;
    this.saboCd=Math.max(0,this.saboCd-dt); this.btnCd=Math.max(0,this.btnCd-dt);
    this.inGame().forEach(p=>{
      if(p.team==='imp'&&p.vent==null&&!p.dead) p.killCd=Math.max(0,p.killCd-dt);
      p.abCd=Math.max(0,p.abCd-dt); p.ventCd=Math.max(0,p.ventCd-dt);
      if(p.shift&&p.shift.until<=t){ p.shift=null; p.abCd=S.roles.shapeshifter.cd; this.broadcast({t:'ev',e:'puff',x:p.x,y:p.y}); }
      if(p.invis&&p.invis<=t){ p.invis=0; p.abCd=S.roles.phantom.cd; }
      if(p.track&&p.track.until<=t) p.track=null;
      if(p.anim&&p.anim.until<=t) p.anim=null;
      if(p.role==='engineer'&&p.vent!=null&&t-p.ventT>S.roles.engineer.max) this.exitVent(p);
      if(p.panel==='vitals'&&p.portVit){ p.bat-=dt; if(p.bat<=0){p.bat=0;p.panel=null;p.portVit=false;p.abCd=S.roles.scientist.cd;} }
      if(p.dead&&p.vent!=null) p.vent=null;
    });
    this.bodies=this.bodies.filter(b=>!b.dis||b.dis>t);
    if(this.sab&&this.sab.crit){
      if(this.sab.hold){ const M=this.map; this.sab.hold=this.sab.hold.map((pid,i)=>{ const p=pid&&this.players.get(pid); if(!p||p.dead) return null; const st=M.critStations[i]; return Math.hypot(p.x-st[0],p.y-st[1])<2.2?pid:null; });
        if(this.sab.hold[0]&&this.sab.hold[1]&&this.sab.hold[0]!==this.sab.hold[1]) this.endSab(); }
      if(this.sab){ this.sab.left-=dt; if(this.sab.left<=0){ this.gameOver('imp',this.sab.k==='o2'?'Oxygen depleted':this.sab.k==='seismic'?'Seismic stabilizers failed':'Reactor meltdown'); return; } }
    }
    if(S.taskbar==='always') this.tbShown=this.taskDone;
    this.updateBots(dt);
  }
  updateMeeting(dt){
    const mt=this.meeting, S=this.settings; mt.left-=dt;
    if(mt.st==='intro'&&mt.left<=0){ if(S.discuss>0){mt.st='disc';mt.left=S.discuss;} else {mt.st='vote';mt.left=S.vote;} this.botMeetingChat(); }
    else if(mt.st==='disc'&&mt.left<=0){ mt.st='vote'; mt.left=S.vote; }
    else if(mt.st==='vote'){ this.botVotes(); if(mt.left<=0){ this.tallyVotes(); mt.st='res'; mt.left=4.5; } }
    else if(mt.st==='res'&&mt.left<=0){ this.doEject(); }
  }
  sendRoster(){
    const list=[...this.players.values()].map(p=>({id:p.id,name:p.name,cos:p.cos,peer:p.peer,on:p.online,bot:p.bot,spec:!!p.spec,left:!!p.left,host:p.id===this.hostPid}));
    this.broadcast({t:'r',list,host:this.hostPid,code:this.code});
  }
  sendSnap(viewer){
    const t=this.t, S=this.settings, M=this.map; const vd=viewer.dead||viewer.spec, vimp=viewer.team==='imp'&&this.phase!=='lobby';
    const pl=[];
    this.players.forEach(p=>{
      if(p.left&&this.phase!=='lobby') return;
      const self=p===viewer;
      if(!self){ if((p.dead||p.spec)&&!vd&&this.phase!=='lobby') return; if(p.vent!=null&&!vd) return; if(p.invis>t&&!vd&&!vimp) return; }
      pl.push({i:p.id,x:+p.x.toFixed(2),y:+p.y.toFixed(2),d:p.d,m:p.m,l:p.shift?p.shift.as:p.id,g:(p.dead||p.spec)?1:0,
        v:p.invis>t?1:0,sp:p.sp,an:p.anim?p.anim.k:0,pr:(p.prot>t&&(self||viewer.role==='guardian'||vd))?1:0,vt:p.vent!=null?1:0});
    });
    const s={t:'s',ph:this.phase,mi:this.mapIdx,pl};
    if(this.phase!=='lobby'){
      s.bo=this.bodies.map(b=>({i:b.id,x:b.x,y:b.y,a:b.dis?clamp((b.dis-t)/S.roles.viper.dis,0,1):1}));
      s.dr=Object.keys(this.doors).filter(r=>this.doors[r]>t).map(Number);
      s.sab=this.sab?{k:this.sab.k,crit:!!this.sab.crit,left:this.sab.left!=null?+this.sab.left.toFixed(1):null,hold:this.sab.hold?this.sab.hold.map(x=>!!x):null,done:this.sab.done||null,code:this.sab.code||null,sw:this.sab.sw||null}:null;
      s.tb=S.taskbar==='never'?-1:(this.taskTotal?this.tbShown/this.taskTotal:0);
      s.bc=+this.btnCd.toFixed(1); s.kd=[...this.revealed];
      if(this.meeting){ const mt=this.meeting; s.mt={st:mt.st,left:+Math.max(0,mt.left).toFixed(1),caller:mt.caller,body:mt.body,voted:Object.keys(mt.votes),over:mt.over||null};
        if(mt.st==='res'){ s.mt.votes=S.anon?Object.fromEntries(Object.entries(mt.votes).map(([k,v],i)=>['a'+i,v])):mt.votes; s.mt.result=mt.result; s.mt.anon=S.anon; }
        if(viewer.id in mt.votes) s.mt.my=mt.votes[viewer.id]; }
      if(this.ej) s.ej=this.ej; if(this.end) s.end=this.end;
      if(this.phase==='intro') s.il=this.phaseLeft;
    }
    const me={role:viewer.role,team:viewer.team,dead:viewer.dead,spec:!!viewer.spec,sq:viewer.sq,x:viewer.x,y:viewer.y,vent:viewer.vent,
      tasks:viewer.tasks.map(tk=>({type:tk.type,st:tk.st[Math.min(tk.stage,tk.st.length-1)],stage:tk.stage,n:tk.st.length,done:tk.done})),
      kc:+viewer.killCd.toFixed(1),ab:+viewer.abCd.toFixed(1),ml:viewer.ml,vc:+viewer.ventCd.toFixed(1)};
    if(viewer.team==='imp') me.fel=this.inGame().filter(q=>q.team==='imp').map(q=>q.id);
    if(viewer.role==='engineer'&&viewer.vent!=null) me.vleft=+(S.roles.engineer.max-(t-viewer.ventT)).toFixed(1);
    if(viewer.shift) me.shift=+(viewer.shift.until-t).toFixed(1);
    if(viewer.invis>t) me.invis=+(viewer.invis-t).toFixed(1);
    if(viewer.role==='scientist') me.bat=+viewer.bat.toFixed(1);
    if(viewer.track){ const q=this.players.get(viewer.track.id); if(q) me.track={id:q.id,x:+q.x.toFixed(1),y:+q.y.toFixed(1),left:+(viewer.track.until-t).toFixed(1)}; }
    if(viewer.role==='judge'){ me.judge={need:Math.min(S.roles.judge.tasks,viewer.tasks.length),have:viewer.tasks.filter(x=>x.done).length,used:viewer.judgeUsed}; }
    if(viewer.panel==='vitals') me.vit=this.inGame().map(q=>[q.id,q.dead?(q.left?2:1):0]);
    if(viewer.panel==='admin'){ const c={}; this.inGame().forEach(q=>{ if(q.dead) return; const r=M.roomAt(q.x,q.y); if(r>=0)c[r]=(c[r]||0)+1; }); this.bodies.forEach(b=>{const r=M.roomAt(b.x,b.y); if(r>=0)c[r]=(c[r]||0)+1;}); me.adm=c; }
    if(this.phase==='lobby') me.min=minPlayers(S.imp);
    s.me=me;
    this.sendTo(viewer.id,s);
  }
  /* ---------- bots ---------- */
  updateBotsLobby(dt){
    this.players.forEach(b=>{ if(!b.bot) return; const br=b.brain||(b.brain={});
      if(!br.path||!br.path.length){ if((br.wait||0)>this.t){b.m=0;return;} br.path=findPath(LOBBY,b.x,b.y,2.5+Math.random()*16,2.8+Math.random()*8.5)||[]; br.wait=this.t+1+Math.random()*4; }
      this.botStep(b,dt,null); });
  }
  botStep(b,dt,closed){
    const br=b.brain; if(!br.path||!br.path.length){b.m=0;return true;}
    const [tx,ty]=br.path[0]; const sp=3.2*this.settings.speed*dt; const dx=tx-b.x, dy=ty-b.y, d=Math.hypot(dx,dy);
    if(d<=sp){ b.x=tx;b.y=ty;br.path.shift(); } else { b.x+=dx/d*sp; b.y+=dy/d*sp; b.d=dx<0?-1:1; }
    b.m=1; return !br.path.length;
  }
  botGo(b,x,y,closed){ const p=findPath(this.map,b.x,b.y,x,y,closed,b.dead); b.brain.path=p||[]; b.brain.goal=[x,y]; return !!p; }
  updateBots(dt){
    const M=this.map, S=this.settings, t=this.t, closed=this.closedSet();
    const living=this.living();
    this.players.forEach(b=>{
      if(!b.bot||b.spec||b.left) return; const br=b.brain||(b.brain={});
      if(b.dead&&b.team==='imp'){ b.m=0; return; }
      if(!b.dead){ const body=this.bodies.find(x=>Math.hypot(x.x-b.x,x.y-b.y)<(b.team==='imp'?1.5:3.5)&&lineOfSight(M,b.x,b.y,x.x,x.y,closed));
        if(body&&(b.team==='crew'||Math.random()<0.004)){ if(Math.hypot(body.x-b.x,body.y-b.y)<2.2){ this.report(b,body.id); return; } if(!br.toBody){br.toBody=1;this.botGo(b,body.x,body.y,closed);} } }
      if(b.team==='imp'&&!b.dead){
        if(b.killCd<=0&&b.vent==null){
          const kd=KILL_DIST[S.killDist];
          const target=living.find(v=>v.team==='crew'&&v.vent==null&&Math.hypot(v.x-b.x,v.y-b.y)<kd);
          if(target){ const wit=living.filter(w=>w!==b&&w!==target&&w.team==='crew'&&Math.hypot(w.x-b.x,w.y-b.y)<6&&lineOfSight(M,w.x,w.y,b.x,b.y,closed));
            if(!wit.length){ this.kill(b,target); br.path=[]; return; } }
          if(!br.hunt||br.huntT<t){ const prey=living.filter(v=>v.team==='crew'&&Math.hypot(v.x-b.x,v.y-b.y)<9); if(prey.length&&Math.random()<0.6){ const v=pick(prey); br.hunt=v.id; br.huntT=t+3; this.botGo(b,v.x,v.y,closed);} }
        }
        if(this.saboCd<=0&&!this.sab&&Math.random()<dt*0.04){ const opts=[]; if(M.sab.lights)opts.push('lights'); if(M.sab.comms)opts.push('comms'); if(Math.random()<0.3){ if(M.critical)opts.push(M.critical); if(M.sab.o2)opts.push('o2'); } if(opts.length) this.sabotage(b,pick(opts)); }
        if(Math.random()<dt*0.02&&M.doorRooms.length) this.sabotage(b,'doors',pick(M.doorRooms));
        if(!br.path||!br.path.length){ if((br.wait||0)<t){ const st=pick(M.stations); this.botGo(b,st.x,st.y,closed); br.wait=t+2+Math.random()*3; } else b.m=0; }
        if(br.path&&br.path.length) this.botStep(b,dt,closed);
        return;
      }
      if(this.sab&&!b.dead){ const sb=this.sab; let goal=null; const fixers=living.filter(q=>q.bot&&q.team==='crew'); const idx=fixers.indexOf(b);
        if(sb.k==='lights'||sb.k==='comms'){ if(idx===0) goal=['fix',M.sab[sb.k]]; }
        else if(sb.hold){ if(idx===0||idx===1) goal=['hold',M.critStations[idx],idx]; }
        else if(sb.done){ if(idx===0||idx===1) goal=['o2',M.sab.o2[idx],idx]; }
        if(goal){ const pt=goal[1]; const d=Math.hypot(pt[0]-b.x,pt[1]-b.y);
          if(d<1.4){ b.m=0; br.path=[]; if(!br.fixT) br.fixT=t+2.5; if(goal[0]==='hold') sb.hold[goal[2]]=b.id; else if(t>br.fixT){ br.fixT=0; if(goal[0]==='o2') this.fix(b,'o2',goal[2]); else this.fix(b,sb.k); } return; }
          if(!br.path||!br.path.length||!br.goal||br.goal[0]!==pt[0]||br.goal[1]!==pt[1]) this.botGo(b,pt[0],pt[1],closed);
          this.botStep(b,dt,closed); return; }
      }
      const ti=b.tasks.findIndex(x=>!x.done);
      if(ti<0){ if(!br.path||!br.path.length){ if((br.wait||0)<t){const st=pick(M.stations); this.botGo(b,st.x,st.y,closed); br.wait=t+3;} else b.m=0; } else this.botStep(b,dt,closed); return; }
      const tk=b.tasks[ti], st=M.stations[tk.st[tk.stage]];
      const d=Math.hypot(st.x-b.x,st.y-b.y);
      if(d<1.0){ b.m=0; br.path=[]; if(!br.taskT){ br.taskT=t+2+Math.random()*3; if(TASKDEF[tk.type].visual&&S.visual) b.anim={k:tk.type,until:t+6}; } if(t>br.taskT){ br.taskT=0; b.anim=null; this.taskDoneMsg(b,ti); } return; }
      if(!br.path||!br.path.length||!br.goal||br.goal[0]!==st.x||br.goal[1]!==st.y){ if(!this.botGo(b,st.x,st.y,closed)){ b.m=0; return; } }
      this.botStep(b,dt,closed);
    });
  }
  botMeetingChat(){
    const M=this.map;
    this.players.forEach(b=>{ if(!b.bot||b.dead||b.spec) return; if(Math.random()<0.55) return;
      let line; const room=M.roomList[M.roomAt(b.x,b.y)]; const rn=room?room.name:'hallway';
      if(b.brain.saw&&b.team==='crew'){ const k=this.players.get(b.brain.saw); line=pick(BOT_LINES.wit).replace('{name}',k?k.name:'?'); }
      else if(Math.random()<0.4){ const tk=b.tasks.find(x=>x.done)||b.tasks[0]; line=pick(BOT_LINES.self).replace('{room}',rn).replace('{task}',tk?TASKDEF[tk.type].name.toLowerCase():'tasks'); }
      else if(Math.random()<0.3){ const o=pick(this.living().filter(q=>q!==b)); line=o?pick(BOT_LINES.acc).replace('{name}',o.name):'skip'; }
      else line=pick(BOT_LINES.start);
      setTimeout(()=>{ if(this.phase==='meeting') this.chat(b,line); },400+Math.random()*5000);
    });
  }
  botVotes(){
    const mt=this.meeting;
    this.players.forEach(b=>{ if(!b.bot||b.dead||b.spec||mt.votes[b.id]!==undefined) return;
      if(b.brain.voteAt==null) b.brain.voteAt=mt.left-(2+Math.random()*Math.min(12,mt.left*0.6));
      if(mt.left>b.brain.voteAt) return;
      let v='skip'; const alive=this.living().filter(q=>q!==b);
      if(b.team==='crew'&&b.brain.saw&&alive.some(q=>q.id===b.brain.saw)) v=b.brain.saw;
      else { const c={}; Object.values(mt.votes).forEach(x=>{ if(x!=='skip')c[x]=(c[x]||0)+1; }); const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];
        if(top&&top[1]>=2&&Math.random()<0.6&&!(b.team==='imp'&&this.players.get(top[0])&&this.players.get(top[0]).team==='imp')) v=top[0];
        else if(Math.random()<0.35){ const pool=alive.filter(q=>!(b.team==='imp'&&q.team==='imp')); if(pool.length) v=pick(pool).id; } }
      this.vote(b,v); });
  }
}
function minPlayers(imp){ return imp===1?4:imp===2?7:9; }
function cleanName(n){ n=String(n||'').replace(/[<>]/g,'').trim().slice(0,12); return n||'Player'; }
function sanitizeCos(c){ c=c||{}; const f=(v,n)=>{v=v|0; return v>=0&&v<n?v:0;}; return {color:f(c.color,COLORS.length),hat:f(c.hat,HATS.length),outfit:f(c.outfit,OUTFITS.length),visor:f(c.visor,VISORS.length),pet:f(c.pet,PETS.length)}; }
function sanitizeSettings(s){
  const d=defaultSettings(); const n=(v,a,b,def)=>{v=+v; return isFinite(v)?clamp(v,a,b):def;};
  const o={map:n(s.map,-1,GAME_MAPS.length-1,0)|0,imp:n(s.imp,1,3,1)|0,killCd:n(s.killCd,10,60,25),killDist:n(s.killDist,0,2,1)|0,speed:n(s.speed,0.5,3,1),
    crewVision:n(s.crewVision,0.25,5,1),impVision:n(s.impVision,0.25,5,1.5),meetings:n(s.meetings,0,9,1)|0,btnCd:n(s.btnCd,0,60,15),discuss:n(s.discuss,0,120,30),
    vote:n(s.vote,15,300,60),anon:!!s.anon,confirm:!!s.confirm,taskbar:['always','meetings','never'].includes(s.taskbar)?s.taskbar:'always',
    common:n(s.common,0,2,1)|0,long:n(s.long,0,3,1)|0,short:n(s.short,0,5,2)|0,visual:!!s.visual,voice:['proximity','global','meetings','off'].includes(s.voice)?s.voice:'proximity',roles:{}};
  SPECIAL_ROLES.forEach(r=>{ const src=(s.roles||{})[r]||{}; const R={n:n(src.n,0,3,0)|0,ch:n(src.ch,0,100,100)}; const op=ROLES[r].opt||{};
    Object.keys(op).forEach(k=>R[k]=n(src[k],op[k][2],op[k][3],op[k][1])); o.roles[r]=R; });
  return o;
}
