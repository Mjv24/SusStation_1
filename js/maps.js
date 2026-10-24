/* ================= MAPS ================= */
// Coordinates are in tiles. rooms: [name,x,y,w,h,opts]  cors: [x,y,w,h]
// opts: {k:'in'|'snow'|'jungle'|'sand'|'pad'|'grass'|'reef', doors:bool, floor:'#hex', mat:'plates'|'checker'|'clean'|'hex'|'tech'|'pad'}
const TASKDEF = {
  wires:    {name:'Fix Wiring',        cat:'common'},
  card:     {name:'Swipe Card',        cat:'common'},
  download: {name:'Download Data',     cat:'long', chain:'upload', stageName:['Download Data','Upload Data']},
  fuel:     {name:'Fuel Engines',      cat:'long', chain:'engine', stageName:['Fill Fuel Can','Fuel Engine']},
  simon:    {name:'Start Sequence',    cat:'long'},
  scan:     {name:'Submit Scan',       cat:'long', visual:true},
  asteroids:{name:'Clear Asteroids',   cat:'short', visual:true},
  shields:  {name:'Prime Shields',     cat:'short', visual:true},
  garbage:  {name:'Empty Garbage',     cat:'short', visual:true},
  manifold: {name:'Unlock Manifolds',  cat:'short'},
  calibrate:{name:'Calibrate Distributor', cat:'short'},
  align:    {name:'Align Engine Output', cat:'short'},
  filter:   {name:'Clean O2 Filter',   cat:'short'},
  divert:   {name:'Divert Power',      cat:'short'},
  upload:   {name:'Upload Data',       cat:'stage'},
  engine:   {name:'Fuel Engine',       cat:'stage'},
};

const MAPDEFS = [
{ id:'lobby', name:'Dropship', w:22, h:14, lobby:true,
  theme:{bg:'#05060d', wall:'#2a3142', wallTop:'#4a5674', floor:'#4f586e', floor2:'#3a4256', light:'rgba(150,190,255,0.16)', fx:'dust', space:true},
  rooms:[['Dropship',2,2,18,10,{mat:'plates'}]], cors:[],
  spawn:[11,7], tasks:[], vents:[], consoles:{customize:[18,3.2]}, cams:[], sab:{},
  props:[['crate',4,3],['crate',4.9,3],['crate',4,10.3],['window',11,2.1],['bench',8,10.6],['bench',14,10.6],['plant',19,10.5]]
},
{ id:'orbital', name:'The Orbital', desc:'Classic space station orbiting a gas giant', w:74, h:46,
  theme:{bg:'#03040a', wall:'#2b3244', wallTop:'#4c5774', floor:'#6c7488', floor2:'#5a6274', light:'rgba(170,200,255,0.11)', fx:'dust', space:true},
  rooms:[
    ['Upper Engine',2,2,9,8,{doors:true,mat:'plates'}], ['Cafeteria',28,1,16,12,{floor:'#7b8396',mat:'checker'}], ['Weapons',52,3,8,7,{mat:'tech'}],
    ['MedBay',15,10,8,7,{doors:true,floor:'#8aa4b4',mat:'clean'}], ['Reactor',1,17,8,10,{floor:'#5f6a80',mat:'hex'}], ['Security',13,19,6,6,{doors:true,mat:'tech'}],
    ['Lower Engine',2,32,9,8,{doors:true,mat:'plates'}], ['Electrical',17,27,8,7,{doors:true,floor:'#6b6656',mat:'plates'}], ['Storage',29,27,11,11,{doors:true,floor:'#6e6a60',mat:'plates'}],
    ['Admin',42,18,8,6,{floor:'#6f7a6c',mat:'tech'}], ['O2',47,12,6,5,{mat:'clean',floor:'#7f9a8c'}], ['Navigation',63,17,9,9,{floor:'#647392',mat:'tech'}],
    ['Shields',53,31,8,7,{mat:'hex'}], ['Communications',43,38,8,6,{floor:'#6a6f86',mat:'tech'}]],
  cors:[[11,5,17,3],[18,8,3,2],[44,5,8,3],[53,13,2,3],[55,10,3,21],[58,19,5,3],[34,13,4,14],[38,20,4,3],
        [40,32,13,3],[45,35,3,3],[11,35,18,3],[20,34,3,1],[4,10,3,22],[9,21,4,2]],
  spawn:[36,7], button:[36,7], table:[36,7,2.2],
  tasks:[['wires',19.5,27.6],['wires',29,1.8],['wires',43.2,18.8],['wires',64,17.8],['wires',30,27.8],['wires',14,19.8],
    ['card',48.5,23.2],['download',42.8,2],['download',58.8,4],['download',70.8,24.8],['download',49.8,38.8],['download',23.5,32.8],
    ['upload',44.8,18.8],['fuel',38.6,36.6],['engine',3,8.6],['engine',3,38.6],['asteroids',56,6.2],['shields',59.6,36.4],
    ['garbage',42.6,11.6],['garbage',51.6,16.2],['garbage',35,37.2],['simon',2.2,19.8],['manifold',2.2,25.6],['calibrate',24.2,30],
    ['align',9.6,6],['align',9.6,36],['filter',48,13.2],['scan',17.5,14.5],['divert',18,32.6],['divert',70.5,19]],
  vents:[[8.5,3.2,0],[6.5,18,0],[8.5,38.6,0],[17.6,23.6,1],[21.6,15.6,1],[23.6,28.2,1],[42.4,1.8,2],[48.8,19,2],[37.5,22,2],
         [59,8.6,3],[64.2,24.6,3],[66.5,18,4],[58.6,36.6,4]],
  consoles:{admin:[45.5,21],cams:[14.5,23.2]},
  cams:[[20,6.4],[36,20],[56.5,21],[16,36.4]],
  sab:{lights:[20.6,27.6], comms:[47,42.6], reactor:[[1.8,18.2],[1.8,25.6]], o2:[[52.4,12.8],[49.4,23.2]]},
  props:[['table',36,7],['table',31,4],['table',41,4],['table',31,10],['table',41,10],['bed',16.5,11.5],['bed',19,11.5],
    ['crate',31,30],['crate',37.6,30.5],['crate',33,34],['engine',6,6],['engine',6,36],['reactorcore',4.5,21.5],
    ['navdesk',69.5,21.5],['shieldcore',56.5,34],['gun',56,5],['panel',21,30.5],['admintable',45.5,21],['monitor',14.5,20.2],['plant',27.5,12],['plant',43.5,12]]
},
{ id:'skylab', name:'Sky Lab', desc:'Research headquarters floating above the clouds', w:64, h:40,
  theme:{bg:'#0b1a3a', wall:'#33405e', wallTop:'#5a6c94', floor:'#8792a8', floor2:'#727d94', light:'rgba(210,230,255,0.13)', fx:'dust', sky:true},
  rooms:[
    ['Launchpad',1,24,10,12,{k:'pad'}], ['MedBay',14,28,7,6,{floor:'#9db7c5',mat:'clean'}], ['Communications',24,28,6,6,{mat:'tech'}],
    ['Locker Room',14,18,9,7,{mat:'checker'}], ['Decontamination',26,18,4,5,{floor:'#9aa6a0',mat:'clean'}], ['Reactor',6,4,10,9,{floor:'#7a7ea0',mat:'hex'}],
    ['Laboratory',19,3,10,9,{floor:'#a5b2c0',mat:'clean'}], ['Greenhouse',33,2,12,8,{k:'grass'}], ['Office',34,14,8,7,{mat:'checker',floor:'#8f8a80'}],
    ['Admin',45,14,7,7,{floor:'#8a9a84',mat:'tech'}], ['Cafeteria',48,25,12,10,{floor:'#a09b8a',mat:'checker'}], ['Balcony',34,32,11,6,{k:'pad'}],
    ['Storage',55,6,7,8,{floor:'#8a8478',mat:'plates'}]],
  cors:[[11,30,3,2],[21,30,3,2],[17,25,2,3],[23,20,3,2],[30,30,1,2],[30,19,1,2],[29,10,4,2],[31,10,2,26],
        [16,7,3,2],[36,10,3,4],[33,16,1,2],[42,16,3,2],[49,21,2,4],[45,33,3,2],[33,33,1,2],[57,14,2,11]],
  spawn:[5,30], button:[54,29.5], table:[54,29.5,2.2],
  tasks:[['wires',15,18.8],['wires',20,3.8],['wires',43.6,2.8],['wires',60.6,6.8],['wires',25,28.8],
    ['card',50.6,14.8],['download',28.6,32.6],['download',27.6,10.4],['download',34,2.8],['upload',46,19.6],
    ['fuel',2,25],['engine',9.6,34.6],['engine',7,4.8],['asteroids',40,36.6],['garbage',58.6,33.6],['simon',14.6,5],
    ['align',9.6,26],['filter',38,8.6],['filter',41,2.8],['scan',17.5,30.5],['divert',7,11.6],['divert',40.6,19.6],
    ['calibrate',22,23.6],['manifold',60.6,12.6],['shields',44,32.8]],
  vents:[[3,34.6,0],[14.6,11.6,0],[28.6,21.6,0],[25,5,1],[36,19.6,1],[44,8.6,1],[50,33.6,2],[50.4,19.6,2],[35,36.6,2],[56,12.6,2]],
  consoles:{admin:[48.5,17.5],vitals:[38,16]},
  cams:[],
  sab:{lights:[21.6,23.6], comms:[28.6,28.8], reactor:[[8,4.8],[13,4.8]], o2:[[34.2,8.6],[41,15]]},
  props:[['table',54,29.5],['table',51,27],['table',57,27],['table',51,32.5],['table',57,32.5],['bed',15.5,32],['bed',18.5,32],
    ['reactorcore',11,8.5],['plant',35,4],['plant',38,6.5],['plant',42,5],['plant',36,8],['locker',15,23.6],['locker',17,23.6],['locker',19,23.6],
    ['crate',58,9],['crate',59.6,10.6],['admintable',48.5,17.5],['labdesk',23.5,6.5],['ship',5,28.5]]
},
{ id:'frost', name:'Frost Base', desc:'Frozen outpost on an icy moon', w:70, h:48,
  theme:{bg:'#0d1a26', wall:'#3d4a5c', wallTop:'#687a94', floor:'#7b8597', floor2:'#677184', light:'rgba(190,230,255,0.11)', fx:'snow'},
  rooms:[
    ['Dropship',2,2,10,7,{floor:'#80889a',mat:'plates'}], ['North Snowfield',2,10,22,10,{k:'snow'}], ['Electrical',4,22,8,7,{doors:true,floor:'#6e6a5c',mat:'plates'}],
    ['O2',14,22,8,7,{doors:true,mat:'clean',floor:'#83a091'}], ['Communications',13,32,8,6,{doors:true,mat:'tech'}], ['Weapons',3,32,7,6,{doors:true,mat:'tech'}],
    ['Central Snowfield',24,20,14,20,{k:'snow'}], ['Office',26,6,12,10,{doors:true,floor:'#8a8c80',mat:'checker'}], ['Storage',42,8,8,8,{doors:true,floor:'#7d776a',mat:'plates'}],
    ['Laboratory',52,4,14,9,{doors:true,floor:'#a2b0bf',mat:'clean'}], ['Specimen Room',58,22,9,9,{doors:true,floor:'#8a9fa8',mat:'hex'}],
    ['East Snowfield',40,20,16,12,{k:'snow'}], ['Boiler Room',40,36,9,7,{doors:true,floor:'#7a6a62',mat:'plates'}]],
  cors:[[6,9,3,1],[6,20,2,2],[16,20,2,2],[6,29,2,3],[16,29,2,3],[21,34,3,2],[24,17,4,3],[30,16,3,4],
        [38,10,4,3],[50,8,2,3],[38,24,2,4],[56,25,2,3],[54,13,2,7],[43,32,3,4],[38,37,2,2]],
  spawn:[7,5], button:[32,10.5], table:[32,10.5,2.2],
  tasks:[['wires',5,22.8],['wires',15,22.8],['wires',27,6.8],['wires',53,4.8],['wires',65.6,22.8],['wires',12,12],
    ['card',36.6,14.6],['download',19.6,32.8],['download',4,32.8],['download',59,29.6],['upload',27,14.6],
    ['fuel',48.6,9],['engine',10.6,2.8],['engine',47.6,41.6],['asteroids',8.6,36.6],['garbage',43,14.6],['simon',65.6,27],
    ['manifold',59,22.8],['calibrate',10.6,27.6],['align',41,36.8],['filter',20.6,27.6],['scan',60,10],['divert',10.6,23],
    ['divert',44,41.6],['shields',33,36],['calibrate',52,26]],
  vents:[[9,25,0],[19,25,0],[14,36.6,0],[35.6,7,1],[45,11,1],[63,6,1],[62,28,2],[46,39.6,2],[52,29,2],[5,36.6,3],[26,38,3]],
  consoles:{admin:[29,8.6],vitals:[57,6.4],cams:[17,36.6]},
  cams:[[12,15],[31,30],[47,25],[60,9.5]],
  sab:{lights:[7,27.6], comms:[15,35], seismic:[[53,11.6],[64.6,11.6]]},
  props:[['table',32,10.5],['admintable',29,8.6],['crate',44,10],['crate',47,13],['labdesk',58,8],['specimen',62.5,26.5],
    ['ship',7,5.5],['boiler',44.5,38.5],['panel',8,24.5],['rock',8,14],['rock',18,17],['rock',30,25],['rock',34,34],['rock',47,23],['rock',51,29],
    ['pine',4,12],['pine',21,12],['pine',27,37],['pine',53,22],['satellite',16,37],['crystal',35,29],['crystal',45,27]]
},
{ id:'jungle', name:'Jungle Outpost', desc:'Overgrown camp on a wild alien island', w:72, h:46,
  theme:{bg:'#071510', wall:'#2c3a33', wallTop:'#4f6a5b', floor:'#7d7f78', floor2:'#696b64', light:'rgba(255,220,150,0.09)', fx:'fireflies'},
  rooms:[
    ['Campfire',30,18,12,10,{k:'sand'}], ['Dropship',2,18,9,8,{floor:'#80889a',mat:'plates'}], ['West Jungle',12,8,16,30,{k:'jungle'}],
    ['Kitchen',2,2,9,10,{doors:true,floor:'#8f8270',mat:'checker'}], ['Beach',12,40,34,5,{k:'sand'}], ['Splash Zone',2,30,8,8,{floor:'#6f93a6',mat:'clean'}],
    ['Storage',30,4,10,9,{doors:true,floor:'#7d776a',mat:'plates'}], ['Laboratory',44,2,12,9,{doors:true,floor:'#a2b0bf',mat:'clean'}], ['Greenhouse',44,30,12,9,{k:'grass'}],
    ['East Jungle',44,13,10,15,{k:'jungle'}], ['Reactor',58,4,12,10,{doors:true,floor:'#6f7088',mat:'hex'}], ['Mining Pit',58,17,12,10,{k:'sand'}],
    ['Communications',60,30,10,9,{doors:true,mat:'tech'}]],
  cors:[[11,20,1,3],[11,8,1,3],[10,32,2,3],[16,38,3,2],[28,21,2,3],[34,13,3,5],[42,21,2,3],[47,11,3,2],[47,28,3,2],
        [45,39,2,1],[54,20,4,3],[56,6,2,3],[62,14,3,3],[63,27,3,3],[40,6,4,2]],
  spawn:[6,21.5], button:[36,22.5], table:[36,22.5,2.2],
  tasks:[['wires',3,2.8],['wires',31,4.8],['wires',45,2.8],['wires',68.6,30.8],['wires',3,30.8],['wires',14,30],
    ['card',38.6,11.6],['download',9.6,10.6],['download',54.6,37.6],['download',68.6,25.6],['upload',61,37.6],
    ['fuel',31,11.6],['engine',68.6,12.6],['engine',9.6,24.6],['asteroids',40,42.6],['garbage',5,10.6],['simon',60,4.8],
    ['manifold',54.6,9.6],['calibrate',60,25.6],['calibrate',52,15],['align',68.6,4.8],['filter',46,31],['filter',53,31],
    ['scan',50,6.5],['divert',64,12.6],['divert',8.6,36.6],['shields',61,30.8]],
  vents:[[9.6,2.8,0],[3,24.6,0],[7,30.8,0],[38.6,4.8,1],[55,2.8,1],[59,12.6,1],[50,37.6,2],[66,18,2],[69,37.6,2],[25,10,3],[30,43.6,3]],
  consoles:{vitals:[48,9.4],cams:[66,37.4]},
  cams:[[20,20],[36,42],[49,20],[64,21]],
  sab:{comms:[62.6,33], reactor:[[59.6,8],[68.4,8]], lights:[33,5]},
  props:[['campfire',36,22.5],['log',33,20.5],['log',39,20.5],['log',33,25],['log',39,25],['ship',6,21],['reactorcore',64,8.5],
    ['crate',33,8],['crate',36,10],['labdesk',50,4],['plant',46,33],['plant',49,35],['plant',52,33],['tree',14,10],['tree',25,14],['tree',15,26],
    ['tree',25,33],['tree',46,15],['tree',51,24],['rock',62,20],['rock',67,23],['palm',20,42],['palm',35,41.5],['rock',13,43],['mushroom',19,18],['mushroom',22,29],['mushroom',49,26]]
},
{ id:'trench', name:'Deep Trench', desc:'Pressurised research base on the ocean floor', w:70, h:44,
  theme:{bg:'#021422', wall:'#1d3a50', wallTop:'#41779a', floor:'#5d7c8e', floor2:'#4a6676', light:'rgba(90,210,255,0.11)', fx:'bubbles', water:true},
  rooms:[
    ['Docking Bay',2,2,11,8,{floor:'#6d8090',mat:'plates'}], ['Mess Hall',30,2,14,10,{floor:'#8a8d86',mat:'checker'}], ['Sonar',50,2,9,7,{mat:'tech'}],
    ['Torpedo Bay',61,4,8,8,{mat:'plates'}], ['Med Pod',16,12,7,6,{doors:true,floor:'#9fb9c4',mat:'clean'}], ['Kelp Farm',2,14,11,14,{k:'reef'}],
    ['Admin',30,16,8,6,{floor:'#6f8a7c',mat:'tech'}], ['Electrical',18,22,8,7,{doors:true,floor:'#6e6a5a',mat:'plates'}], ['Observatory',40,16,14,12,{k:'reef'}],
    ['Pressure Control',58,16,9,7,{doors:true,mat:'hex'}], ['Reactor',2,32,11,9,{floor:'#5e6a86',mat:'hex'}], ['Hydro Lab',18,33,12,8,{doors:true,floor:'#8fb0bc',mat:'clean'}],
    ['Abyss Gate',36,33,16,9,{k:'reef'}], ['Communications',56,30,10,8,{doors:true,mat:'tech'}]],
  cors:[[13,5,17,3],[44,4,6,3],[59,5,2,3],[6,10,3,4],[18,8,3,4],[34,12,3,4],[38,18,2,3],[13,24,5,3],[26,24,7,2],[31,22,2,2],
        [63,12,3,4],[54,19,4,3],[61,23,3,7],[45,28,3,5],[52,34,4,3],[30,36,6,3],[13,36,5,3],[6,28,3,4],[21,29,3,4]],
  spawn:[7,6], button:[37,7], table:[37,7,2.2],
  tasks:[['wires',19,22.8],['wires',31,2.8],['wires',51,2.8],['wires',57,30.8],['wires',3,32.8],
    ['card',36,17],['download',57.6,3.2],['download',67.6,4.8],['download',28.6,33.8],['download',64.6,36.8],['upload',31.5,17],
    ['fuel',3,3],['engine',11.6,40],['engine',65,17],['asteroids',65,10.6],['shields',47,26.5],['garbage',42.6,10.6],['garbage',24.6,28],
    ['simon',7,33],['manifold',11.6,33],['calibrate',24.6,22.8],['align',59,22],['filter',4,16],['filter',10,25],['filter',48,40],
    ['scan',19.5,15],['divert',19,40],['divert',3,8.6]],
  vents:[[10,8.6,0],[4,20,0],[9,39,0],[42,3,1],[36,20.5,1],[57.5,8,1],[52,20,2],[66,21.6,2],[64,32,2],[25,38,3],[50,35,3],[22,17,3]],
  consoles:{admin:[34,19],vitals:[21,13.2],cams:[60,36]},
  cams:[[8,6],[44,20],[43,38],[62,20]],
  sab:{lights:[20,27.6], comms:[59,36.8], reactor:[[3.2,38.5],[11.6,36.5]], o2:[[60.5,17.2],[32,20.6]]},
  props:[['table',37,7],['table',33,4.5],['table',41,4.5],['table',33,9.5],['table',41,9.5],['sub',7.5,5.5],['sonar',54.5,5.5],['torpedo',65,8],
    ['bed',18,14.5],['tank',22,36],['tank',25,36],['reactorcore',7,36.5],['admintable',34,19],['panel',22,25.5],['shieldcore',62.5,19.5],
    ['kelp',3.5,18],['kelp',6,22],['kelp',9.5,15.5],['kelp',11,20],['kelp',4,26],['coral',8,17],['coral',11.5,26],['coral',42,18],['coral',51.5,26],
    ['kelp',44,24],['kelp',50,18],['dome',47,21],['coral',38,40],['kelp',41,35],['kelp',49,37],['coral',44.5,40.5],['clam',39,36],['crystal',47,35.5]]
}];

const ROOMK = { in:null, snow:'#cbd8e6', jungle:'#3e6b3c', sand:'#cdb27c', pad:'#6b6e78', grass:'#4f7d43', reef:'#8fa79c' };

function buildMap(def){
  const m = Object.assign({}, def);
  const W=def.w, H=def.h, N=W*H;
  m.walk = new Uint8Array(N); m.room = new Int16Array(N).fill(-1); m.out = new Uint8Array(N);
  m.roomList = def.rooms.map((r,i)=>({i,name:r[0],x:r[1],y:r[2],w:r[3],h:r[4],o:r[5]||{}}));
  m.roomList.forEach(r=>{
    for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){const k=y*W+x;m.walk[k]=1;m.room[k]=r.i;if(r.o.k&&r.o.k!=='in'&&r.o.k!=='pad')m.out[k]=1;}
  });
  def.cors.forEach(c=>{for(let y=c[1];y<c[1]+c[3];y++)for(let x=c[0];x<c[0]+c[2];x++){m.walk[y*W+x]=1;}});
  m.doors=[]; const doorMap={};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const k=y*W+x; if(!m.walk[k]||m.room[k]>=0) continue;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H)return;
      const r=m.room[ny*W+nx]; if(r<0) return; if(!m.roomList[r].o.doors) return;
      (doorMap[r]=doorMap[r]||new Set()).add(k);
    });
  }
  Object.keys(doorMap).forEach(r=>{
    const seen=new Set();
    [...doorMap[r]].forEach(c=>{ if(seen.has(c))return; const grp=[];const st=[c];seen.add(c);
      while(st.length){const q=st.pop();grp.push(q);const qx=q%W,qy=(q/W)|0;
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const n=(qy+dy)*W+qx+dx; if(doorMap[r].has(n)&&!seen.has(n)){seen.add(n);st.push(n);}});}
      m.doors.push({room:+r,cells:grp});
    });
  });
  m.doorRooms=[...new Set(m.doors.map(d=>d.room))];
  m.doorCell=new Int16Array(N).fill(-1);
  m.doors.forEach(d=>d.cells.forEach(c=>m.doorCell[c]=d.room));
  m.ventList=(def.vents||[]).map((v,i)=>({i,x:v[0],y:v[1],net:v[2]}));
  m.ventList.forEach(v=>v.links=m.ventList.filter(o=>o.net===v.net&&o!==v).map(o=>o.i));
  m.stations=(def.tasks||[]).map((t,i)=>({i,type:t[0],x:t[1],y:t[2]}));
  m.critical = def.sab.reactor?'reactor':def.sab.seismic?'seismic':null;
  m.critStations = def.sab.reactor||def.sab.seismic||null;
  m.roomAt=(x,y)=>{ x=x|0; y=y|0; if(x<0||y<0||x>=W||y>=H) return -1; return m.room[y*W+x]; };
  return m;
}
const MAPS = MAPDEFS.map(buildMap);
const LOBBY = MAPS[0];
const GAME_MAPS = MAPS.slice(1);

function cellFree(m,cx,cy,closed){
  if(cx<0||cy<0||cx>=m.w||cy>=m.h) return false;
  const k=cy*m.w+cx; if(!m.walk[k]) return false;
  if(closed&&closed.size&&m.doorCell[k]>=0&&closed.has(m.doorCell[k])) return false;
  return true;
}
const PR=0.26;
function canStand(m,x,y,closed){
  return cellFree(m,Math.floor(x-PR),Math.floor(y-PR),closed)&&cellFree(m,Math.floor(x+PR),Math.floor(y-PR),closed)&&
         cellFree(m,Math.floor(x-PR),Math.floor(y+PR*0.6),closed)&&cellFree(m,Math.floor(x+PR),Math.floor(y+PR*0.6),closed);
}
function moveWithCollision(m,x,y,dx,dy,closed){
  let nx=x+dx, ny=y+dy;
  if(canStand(m,nx,y,closed)) x=nx; else if(dx&&!dy){ if(canStand(m,nx,y+0.12,closed)){x=nx;y+=0.06;} else if(canStand(m,nx,y-0.12,closed)){x=nx;y-=0.06;} }
  if(canStand(m,x,ny,closed)) y=ny; else if(dy&&!dx){ if(canStand(m,x+0.12,ny,closed)){y=ny;x+=0.06;} else if(canStand(m,x-0.12,ny,closed)){y=ny;x-=0.06;} }
  return [x,y];
}
function opaque(m,x,y,closed){ return !cellFree(m,Math.floor(x),Math.floor(y),closed); }
// exact grid line-of-sight (DDA). Diagonal corner squeezes are blocked so light never leaks between two walls.
function lineOfSight(m,x0,y0,x1,y1,closed){
  let cx=Math.floor(x0), cy=Math.floor(y0); const tx=Math.floor(x1), ty=Math.floor(y1);
  const dx=x1-x0, dy=y1-y0, sx=dx>0?1:-1, sy=dy>0?1:-1;
  const tdx=dx?Math.abs(1/dx):Infinity, tdy=dy?Math.abs(1/dy):Infinity;
  let tmx=dx?(sx>0?cx+1-x0:x0-cx)*tdx:Infinity, tmy=dy?(sy>0?cy+1-y0:y0-cy)*tdy:Infinity, n=0;
  while((cx!==tx||cy!==ty)&&n++<500){
    if(Math.abs(tmx-tmy)<1e-9){ if(!cellFree(m,cx+sx,cy,closed)||!cellFree(m,cx,cy+sy,closed)) return false; cx+=sx; cy+=sy; tmx+=tdx; tmy+=tdy; }
    else if(tmx<tmy){ cx+=sx; tmx+=tdx; } else { cy+=sy; tmy+=tdy; }
    if(!cellFree(m,cx,cy,closed)) return false;
  }
  return true;
}
// Axis-aligned wall boundary segments (cached per closed-door set).
// Walls that sit ABOVE a floor are lifted 0.62 tiles so their front faces stay lit, like the original game.
const WALL_LIFT=0.62;
function wallSegments(m,closed){
  const key=closed&&closed.size?[...closed].sort().join(','):'-'; m._seg=m._seg||{}; if(m._seg[key]) return m._seg[key];
  const W=m.w,H=m.h,f=(x,y)=>cellFree(m,x,y,closed), hs=[], vs=[];
  for(let y=0;y<=H;y++){ let st=0,kd=0; for(let x=0;x<=W;x++){ const a=x<W&&f(x,y-1), b=x<W&&f(x,y); const k=a===b?0:(b?1:2);
      if(k!==kd){ if(kd) hs.push([kd===1?y-WALL_LIFT:y,st,x]); st=x; kd=k; } } }
  for(let x=0;x<=W;x++){ let st=0,kd=0; for(let y=0;y<=H;y++){ const a=y<H&&f(x-1,y), b=y<H&&f(x,y); const k=a===b?0:1;
      if(k!==kd){ if(kd){ const top=(f(x-1,st)||f(x,st))&&!(f(x-1,st-1)||f(x,st-1))?st-WALL_LIFT:st; vs.push([x,top,y]); } st=y; kd=k; } } }
  return m._seg[key]={hs,vs};
}
// Exact visibility polygon: cast rays at every wall corner (±ε) plus a smooth circle. Returns flat [x0,y0,x1,y1,...]
function visPoly(m,ox,oy,R,closed){
  const {hs,vs}=wallSegments(m,closed), HS=[], VS=[], ang=[], R2=(R+1.5)*(R+1.5), E=1e-4;
  for(const s of hs){ if(Math.abs(s[0]-oy)>R+1||s[2]<ox-R-1||s[1]>ox+R+1) continue; HS.push(s);
    for(const px of [s[1],s[2]]){ const dx=px-ox,dy=s[0]-oy; if(dx*dx+dy*dy<R2){ const a=Math.atan2(dy,dx); ang.push(a-E,a+E); } } }
  for(const s of vs){ if(Math.abs(s[0]-ox)>R+1||s[2]<oy-R-1||s[1]>oy+R+1) continue; VS.push(s);
    for(const py of [s[1],s[2]]){ const dx=s[0]-ox,dy=py-oy; if(dx*dx+dy*dy<R2){ const a=Math.atan2(dy,dx); ang.push(a-E,a+E); } } }
  for(let i=0;i<120;i++) ang.push(-Math.PI+i/120*Math.PI*2);
  ang.sort((a,b)=>a-b); const pts=[];
  for(const a of ang){ const dx=Math.cos(a), dy=Math.sin(a); let t=R;
    if(dy) for(const s of HS){ const tt=(s[0]-oy)/dy; if(tt>0&&tt<t){ const x=ox+dx*tt; if(x>=s[1]&&x<=s[2]) t=tt; } }
    if(dx) for(const s of VS){ const tt=(s[0]-ox)/dx; if(tt>0&&tt<t){ const y=oy+dy*tt; if(y>=s[1]&&y<=s[2]) t=tt; } }
    pts.push(ox+dx*t, oy+dy*t); }
  return pts;
}
// BFS path on grid (returns list of [x,y] cell centers)
function findPath(m,sx,sy,tx,ty,closed,ghost){
  const W=m.w,H=m.h; const s=(sy|0)*W+(sx|0), t=(ty|0)*W+(tx|0);
  if(s===t) return [[tx,ty]];
  const prev=new Int32Array(W*H).fill(-1); prev[s]=s; const q=[s]; let qi=0;
  while(qi<q.length){const c=q[qi++]; if(c===t)break; const cx=c%W, cy=(c/W)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy; if(nx<0||ny<0||nx>=W||ny>=H)continue; const n=ny*W+nx;
      if(prev[n]>=0)continue; if(!ghost&&!cellFree(m,nx,ny,closed))continue; prev[n]=c; q.push(n);} }
  if(prev[t]<0) return null;
  const path=[]; let c=t; while(c!==s){path.push([(c%W)+0.5,((c/W)|0)+0.5]); c=prev[c];}
  path.reverse(); path[path.length-1]=[tx,ty]; return path;
}
