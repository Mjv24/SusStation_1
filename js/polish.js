
/* ORBITAL EDITION: progressive enhancements, no protocol replacement. */
const Polish={selected:0,practice:false,lastRoster:'',lastHint:'',comfort:localStorage.getItem('sus_comfort')!=='0',lastFocus:null};
document.body.classList.toggle('comfort',Polish.comfort);
function applyComfort(on){Polish.comfort=!!on;document.body.classList.toggle('comfort',Polish.comfort);localStorage.setItem('sus_comfort',on?'1':'0');if(on){G.shake=0;PostFX.set(false);}const b=$('#hComfort');if(b){b.textContent=on?'Comfort: on':'Comfort: off';b.setAttribute('aria-pressed',String(on));}}
const oldUIInit=UI.init;
UI.init=function(){oldUIInit.call(this);applyComfort(Polish.comfort);
 $('#hComfort').addEventListener('click',()=>applyComfort(!Polish.comfort));
 $('#hHelp').addEventListener('click',openHelp);
 $('#hPractice').addEventListener('click',()=>{if(!readHome())return;Polish.practice=true;createRoom();});
 const palette=['#80d5dd','#b3c6ff','#c3e8f7','#b6d792','#85dcd2'];
 GAME_MAPS.forEach((m,i)=>{const b=h('button',{type:'button',class:'destination-card'+(i===0?' selected':''),style:'--dest:'+palette[i],'aria-pressed':String(i===0)},h('span',{class:'dest-number'},'DESTINATION / 0'+(i+1)),h('b',null,m.name),h('small',null,m.desc),h('span',{class:'dest-check'},i===0?'✓':''));b.addEventListener('click',()=>{Polish.selected=i;$('#destinationGrid').querySelectorAll('button').forEach((x,j)=>{x.classList.toggle('selected',i===j);x.setAttribute('aria-pressed',String(i===j));x.querySelector('.dest-check').textContent=i===j?'✓':'';});SFX.click();});$('#destinationGrid').append(b);});
 const roster=h('aside',{id:'lobbyRoster',class:'lobby-roster hidden','aria-label':'Crew manifest'});$('#hud').append(roster);
 $('#hud').append(h('div',{id:'missionChip',class:'mission-chip hidden','aria-live':'polite'}));
 const names={bMic:'Toggle microphone',bSpk:'Toggle voice audio',bMenu:'Game menu',bMap:'Open map',bChat:'Open chat',mClose:'Close dialog',lbBotAdd:'Add practice bot',lbBotRem:'Remove practice bot',rotX:'Dismiss rotation hint'};Object.entries(names).forEach(([id,label])=>$('#'+id).setAttribute('aria-label',label));
 $('#hCode').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,5);});
 document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!G.modal)return;const nodes=[...$('#modal').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
};
function openHelp(){openModal({kind:'help',title:'Your first mission',cls:'wide',build:body=>{const grid=h('div',{class:'how-grid'});[['01 / Crew','Complete your tasks, keep track of who you pass, and report a body when you find one.'],['02 / Impostor','Blend in, use sabotage to split the crew, and avoid witnesses. Your actions have cooldowns.'],['03 / Discuss','Share what you saw. Select a player and confirm your vote, or skip if you have no evidence.']].forEach(([title,text])=>grid.append(h('div',{class:'how-card'},h('b',null,title),h('p',null,text))));body.append(grid,h('div',{class:'how-controls'},'Desktop: WASD / arrows to move. E interact, R report, Q kill, V vent, F ability, M map. Phone: drag on the world to move, then tap the action buttons.\nRooms: share the room link. Only the host can start or return everyone to the lobby. Keep the host tab open. Voice needs microphone permission and HTTPS.'));}});}
const originalEnterGame=enterGame;
enterGame=function(){const first=G.screen!=='game';originalEnterGame();if(first&&G.isHost){send({t:'set',settings:{...G.settings,map:Polish.selected}});if(Polish.practice){Polish.practice=false;for(let i=0;i<5;i++)send({t:'bot+'});toast('Practice crew ready. Press Start when you are ready.',4000);}}};
const originalFrame=UI.frame;
UI.frame=function(){originalFrame.call(this);if(G.screen!=='game'||!G.me)return;
 const lobby=G.phase==='lobby',el=$('#lobbyRoster');show(el,lobby);
 if(lobby){const key=JSON.stringify([...G.roster.values()].map(r=>[r.id,r.name,r.on,r.bot,r.host,r.cos]));if(key!==Polish.lastRoster){Polish.lastRoster=key;el.replaceChildren(h('h3',null,'CREW MANIFEST'));G.roster.forEach(r=>{if(r.left)return;el.append(h('div',{class:'roster-mini'+(!r.on&&!r.bot?' offline':'')},crewCanvas(r.cos,28),h('span',null,r.name),h('small',null,r.host?'HOST':r.bot?'BOT':r.on?'ONLINE':'AWAY')));});}}
 const chip=$('#missionChip');show(chip,G.phase==='play'&&!G.modal);if(G.phase==='play'){const u=G.near&&G.near.use;const text=G.me.spec?'Spectating this mission':amDead()?'Your crew still needs you':u?u.k==='task'?'Task console in range':u.k==='button'?'Emergency console in range':'Console in range':'Stay observant. Keep your story straight.';if(text!==Polish.lastHint){Polish.lastHint=text;chip.replaceChildren(h('b',null,amDead()?'GHOST CHANNEL':G.me.team==='imp'?'STAY UNDERCOVER':'MISSION ACTIVE'),document.createTextNode(text));}}
};
// Modal lifecycle: restore focus and guard delayed task completion after closing.
const originalOpenModal=openModal,originalCloseModal=closeModal;
openModal=function(o){Polish.lastFocus=document.activeElement;originalOpenModal(o);requestAnimationFrame(()=>{const close=$('#mClose');if(G.modal)close.focus({preventScroll:true});});};
closeModal=function(){const had=!!G.modal;originalCloseModal();if(had&&Polish.lastFocus&&Polish.lastFocus.isConnected)Polish.lastFocus.focus({preventScroll:true});};
Object.keys(MG).forEach(k=>{const original=MG[k];MG[k]=function(root,done,options){let completed=false,active=true;const cleanup=original.call(this,root,()=>{if(!active||completed||!root.isConnected)return;completed=true;done();},options);return()=>{active=false;if(typeof cleanup==='function')cleanup();};};});
const taskHints={wires:'Drag each wire to the matching color on the opposite side.',card:'Take out the card, then drag it smoothly across the reader.',simon:'Watch the illuminated sequence, then repeat it.',calibrate:'Tap when the needle reaches the colored segment.',align:'Drag the slider until the output meets the dotted center line.',filter:'Drag each leaf into the opening on the left.',divert:'Slide the highlighted power switch all the way up.',asteroids:'Tap the moving asteroids to clear the field.'};
const originalOpenTask=openTask;
openTask=function(ti){originalOpenTask(ti);const tk=G.me&&G.me.tasks[ti];if(tk&&taskHints[tk.type]&&G.modal&&G.modal.kind==='task')$('#mBody').prepend(h('p',{class:'task-help'},taskHints[tk.type]));};
const originalOpenMenu=openMenu;
openMenu=function(){originalOpenMenu();const label=h('label',{class:'srow'},h('span',null,'Comfort mode (less motion and glow)'));const c=h('input',{type:'checkbox',class:'tog'});c.checked=Polish.comfort;c.addEventListener('change',()=>applyComfort(c.checked));label.append(c);$('#mBody .menu').prepend(label);};
// Consistent, quieter motion and rendering without removing task feedback.
const originalRenderFrame=renderFrame;
renderFrame=function(c,w,hh,dt){if(Polish.comfort)G.shake=0;originalRenderFrame(c,w,hh,dt);};
const originalDrawGlows=drawGlows;
drawGlows=function(c,...args){c.save();c.globalAlpha*=Polish.comfort?.55:.8;originalDrawGlows(c,...args);c.restore();};
const originalParticles=Particles.run;
Particles.run=function(c,...args){c.save();c.globalAlpha*=Polish.comfort?.45:.8;originalParticles.call(this,c,...args);c.restore();};
// Home key art is an image layer. Do not render ten floating actors behind the launch UI.
renderHome=function(c,W,H){c.fillStyle='#080e18';c.fillRect(0,0,W,H);};
// A coherent equipment treatment: dimensional feet, panel edges and contextual detail.
const originalDrawProp=drawProp;
drawProp=function(c,k,x,y,T,rng){c.save();c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(x,y+T*.25,T*(k==='table'?1.4:.65),T*.23,0,0,Math.PI*2);c.fill();
 if(k==='crate'){const g=c.createLinearGradient(x,y-T*.55,x,y+T*.5);g.addColorStop(0,'#627b85');g.addColorStop(1,'#30444e');c.fillStyle=g;c.strokeStyle='#14232c';c.lineWidth=2;rr(c,x-T*.48,y-T*.5,T*.96,T*.94,T*.08);c.fill();c.stroke();c.fillStyle='#93b7bb';rr(c,x-T*.48,y-T*.58,T*.96,T*.22,T*.05);c.fill();c.fillStyle='#152e38';c.fillRect(x-T*.31,y-T*.16,T*.62,T*.28);c.fillStyle='#b9d6d4';c.fillRect(x-T*.23,y-T*.08,T*.24,T*.035);c.fillStyle='#d7b87c';c.fillRect(x+T*.14,y-T*.1,T*.1,T*.14);c.strokeStyle='#aecbd64d';c.lineWidth=1;c.strokeRect(x-T*.38,y-T*.25,T*.76,T*.57);}
 else if(k==='table'){c.fillStyle='#263f4a';c.beginPath();c.ellipse(x,y+T*.17,T*1.45,T*.9,0,0,7);c.fill();originalDrawProp(c,k,x,y,T,rng);c.strokeStyle='#f0fcff44';c.lineWidth=1;c.beginPath();c.ellipse(x,y-T*.04,T*1.27,T*.73,0,0,7);c.stroke();c.fillStyle='#3b6371';rr(c,x-T*.33,y-T*.17,T*.66,T*.35,T*.07);c.fill();c.fillStyle='#b5eadb';c.fillRect(x-T*.21,y-T*.08,T*.42,T*.04);}
 else{originalDrawProp(c,k,x,y,T,rng);if(['engine','labdesk','panel','monitor','navdesk','boiler','tank','ship','sub'].includes(k)){c.fillStyle='#a2efda';c.fillRect(x-T*.15,y-T*.2,T*.12,T*.04);c.fillStyle='#e9c28b';c.fillRect(x+T*.04,y-T*.2,T*.07,T*.04);}}
 c.restore();};
// Release WebAudio graph nodes when a voice peer leaves.
const originalVoiceDrop=Voice.drop;
Voice.drop=function(pid){const e=this.calls.get(pid);if(e){try{e.src&&e.src.disconnect();e.gain&&e.gain.disconnect();e.an&&e.an.disconnect();}catch(_){}}originalVoiceDrop.call(this,pid);};
const originalOnCall=Voice.onCall;
Voice.onCall=function(call){const pid=call.metadata&&call.metadata.pid,r=pid&&G.roster.get(pid);if(!r||r.bot||r.left||r.peer!==call.peer){try{call.close();}catch(_){}return;}originalOnCall.call(this,call);};

// Guard the final close timer against a different dialog being opened meanwhile.
openTask=function(ti){
 const tk=G.me&&G.me.tasks[ti];if(!tk||tk.done)return;const def=TASKDEF[tk.type];let type=tk.type;
 if(tk.stage>0&&def.chain)type=def.chain;
 if(def.visual&&G.settings.visual)send({t:'anim',k:tk.type});
 let token,finished=false;
 openModal({kind:'task',title:def.stageName?def.stageName[Math.min(tk.stage,1)]:def.name,cls:'task',build:body=>{
  token=G.modal;if(taskHints[type])body.append(h('p',{class:'task-help'},taskHints[type]));const root=h('div',{class:'mg'});body.append(root);
  return MG[type](root,()=>{if(finished||G.modal!==token)return;finished=true;send({t:'task',ti});SFX.ok();setTimeout(()=>{if(G.modal===token)closeModal();},250);},{});
 },onClose:()=>{if(def.visual)send({t:'anim',k:null});}});
};
openSabFix=function(u){
 const s=G.sab;if(!s)return;let options={},token,finished=false;
 if(u.s==='crit')options={st:u.st,hold:on=>send({t:'hold',st:u.st,on})};
 if(u.s==='o2')options={code:s.code};if(u.s==='lights')options={sw:s.sw};
 openModal({kind:'sab',title:sabLabel(s),cls:'task',build:body=>{token=G.modal;const root=h('div',{class:'mg'});body.append(root);
  return MG[u.s](root,()=>{if(finished||G.modal!==token)return;finished=true;if(u.s==='o2')send({t:'fix',k:'o2',st:u.st});else if(u.s!=='crit')send({t:'fix',k:u.s});setTimeout(()=>{if(G.modal===token)closeModal();},200);},options);
 }});
};
