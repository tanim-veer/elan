/* Élan — Focus : minuteur Pomodoro lié à tes tâches et objectifs (garde l'heure même si l'onglet dort). */
(()=>{
'use strict';
const {$,esc,todayStr,addDays,dowOf,DN}=Hub;
const el=$('#view-focus');
const F=()=>Hub.getStore().focus;
const MODES={
  focus:{label:'Focus',emoji:'🍅',c1:'#ff5a36',c2:'#ec4899'},
  short:{label:'Pause courte',emoji:'☕',c1:'#10b981',c2:'#06b6d4'},
  long:{label:'Pause longue',emoji:'🌴',c1:'#4f6bff',c2:'#8b5cf6'}
};
const total=()=>F().dur[F().mode]*60000;
const running=()=>F().endAt!=null;
const remaining=()=>running()?Math.max(0,F().endAt-Date.now()):F().left!=null?F().left:total();
const mmss=ms=>{const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const save=()=>Hub.saveStore();

/* ----- son + notification ----- */
let ac;
function unlockAudio(){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}}
function beep(){
  try{unlockAudio();const t=ac.currentTime;
    [660,880,1100].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(.0001,t+i*.2);g.gain.exponentialRampToValueAtTime(.22,t+i*.2+.03);g.gain.exponentialRampToValueAtTime(.0001,t+i*.2+.18);
      o.connect(g).connect(ac.destination);o.start(t+i*.2);o.stop(t+i*.2+.2)});
  }catch(e){}
  if(navigator.vibrate)navigator.vibrate([200,100,200]);
}
async function notify(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{const reg=await navigator.serviceWorker?.getRegistration();
    if(reg)reg.showNotification(title,{body,tag:'elan-focus',icon:'icon-192.png',badge:'icon-192.png',vibrate:[200,100,200]});
    else new Notification(title,{body,icon:'icon-192.png'});
  }catch(e){}
}

/* ----- actions ----- */
function start(){unlockAudio();const f=F();f.endAt=Date.now()+remaining();f.left=null;save();render()}
function pause(){const f=F();f.left=remaining();f.endAt=null;save();render()}
function reset(){const f=F();f.endAt=null;f.left=null;save();render()}
function setMode(m){const f=F();f.mode=m;f.endAt=null;f.left=null;save();render()}
function nextMode(){const f=F();f.mode=f.mode==='focus'?(f.cycle>0&&f.cycle%4===0?'long':'short'):'focus';f.endAt=null;f.left=null}
function skip(){nextMode();save();render()}

function complete(){
  const f=F(),wasFocus=f.mode==='focus',t=todayStr();
  if(wasFocus){
    const l=f.log[t]=f.log[t]||{sessions:0,minutes:0};l.sessions++;l.minutes+=f.dur.focus;f.cycle++;
    if(f.autoCheck&&f.task)doneTask(f.task);
  }
  nextMode();save();beep();
  const msg=wasFocus?`Session terminée ! Prends une ${f.mode==='long'?'longue ':''}pause 🎉`:'Pause terminée, c\'est reparti 💪';
  Hub.toast((wasFocus?'🍅 ':'☕ ')+msg);if(wasFocus)Hub.confetti(30,['🍅','✨','⭐','🎉']);
  notify(wasFocus?'Session Focus terminée':'Pause terminée',msg);
  Hub.setTitle({timer:''});
  Hub.changed();
  if(Hub.current()==='focus')render();
}
function doneTask(task){
  try{
    if(task.type==='r'){const it=Routine.itemsOf(todayStr()).find(i=>i.id===task.id);if(it&&!it.done)Routine.toggleItem(todayStr(),task.id)}
    else{const n=Objectifs.allNodes().find(x=>x.id===task.id);if(n&&!Objectifs.isDone(n))Objectifs.toggle(task.id)}
  }catch(e){}
}

/* ----- rendu ----- */
function taskOptions(){
  const f=F(),t=todayStr();Routine.ensureDay(t);
  const r=Routine.itemsOf(t).filter(i=>!i.done);
  const g=Objectifs.allNodes().filter(n=>!n.children.length&&!n.done).sort((a,b)=>(a.deadline??Infinity)-(b.deadline??Infinity)).slice(0,30);
  const cur=f.task?f.task.type+':'+f.task.id:'';
  return `<option value="">Session libre</option>`
    +(r.length?`<optgroup label="Routine du jour">${r.map(i=>`<option value="r:${i.id}" ${cur==='r:'+i.id?'selected':''}>${esc((i.em||'')+' '+i.name)}</option>`).join('')}</optgroup>`:'')
    +(g.length?`<optgroup label="Objectifs">${g.map(n=>`<option value="g:${n.id}" ${cur==='g:'+n.id?'selected':''}>${esc(n.title)}</option>`).join('')}</optgroup>`:'');
}
function taskLabel(){
  const f=F();if(!f.task)return '';
  const t=todayStr();
  if(f.task.type==='r'){const i=Routine.itemsOf(t).find(x=>x.id===f.task.id);return i?`${i.em||''} ${i.name}`:''}
  const n=Objectifs.allNodes().find(x=>x.id===f.task.id);return n?`🎯 ${n.title}`:'';
}
function render(){
  const f=F(),m=MODES[f.mode],t=todayStr(),log=f.log[t]||{sessions:0,minutes:0};
  const week=Array.from({length:7},(_,i)=>addDays(t,i-6));
  const max=Math.max(60,...week.map(d=>(f.log[d]||{minutes:0}).minutes));
  const dots=f.cycle>0&&f.cycle%4===0?4:f.cycle%4;
  const perm='Notification' in window?Notification.permission:'unsupported';
  if(f.task&&!taskLabel())f.task=null;
  el.innerHTML=`
  <div class="wrap focus mode-${f.mode}">
    <div class="vhead"><div><small>Concentration</small><h1>Focus<span>.</span></h1></div></div>
    <div class="seg3 modes">${Object.entries(MODES).map(([k,v])=>`<button type="button" data-fmode="${k}" class="${f.mode===k?'on':''}">${v.emoji} ${v.label}<i>${f.dur[k]} min</i></button>`).join('')}</div>
    <div class="card fcard">
      <div class="fring">${Hub.ring({pct:100*(1-remaining()/total()),size:270,stroke:15,c1:m.c1,c2:m.c2,id:'rg-focus'})}
        <div class="ftime"><b id="f-time">${mmss(remaining())}</b><span>${m.emoji} ${m.label}</span><em id="f-task">${esc(taskLabel())}</em></div></div>
      <div class="fbtns">
        <button type="button" class="fsm" data-f="reset" aria-label="Réinitialiser" title="Réinitialiser">↺</button>
        <button type="button" class="fplay" data-f="${running()?'pause':'start'}" aria-label="${running()?'Pause':'Démarrer'}">${running()?'<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>':'<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>'}</button>
        <button type="button" class="fsm" data-f="skip" aria-label="Passer" title="Passer à l'étape suivante">⏭</button>
      </div>
      <div class="cycle" title="Sessions du cycle (pause longue toutes les 4)">${[0,1,2,3].map(i=>`<i class="${i<dots?'on':''}"></i>`).join('')}</div>
    </div>

    <div class="card pad">
      <div class="fld2"><label>Je me concentre sur</label>
        <select id="f-task-sel">${taskOptions()}</select></div>
      <label class="chk2"><input type="checkbox" id="f-auto" ${f.autoCheck?'checked':''}><span>Cocher la tâche à la fin de la session</span></label>
    </div>

    <div class="kpi4 k3">
      <div class="k" style="--kc:#ff5a36"><span>🍅</span><b>${log.sessions}</b><i>sessions aujourd'hui</i></div>
      <div class="k" style="--kc:#f43f8e"><span>⏱️</span><b>${log.minutes}<small> min</small></b><i>concentré</i></div>
      <div class="k" style="--kc:#4f6bff"><span>📅</span><b>${week.reduce((a,d)=>a+(f.log[d]||{minutes:0}).minutes,0)}<small> min</small></b><i>7 derniers jours</i></div>
    </div>
    <div class="card pad"><h3 class="ct">Minutes de focus par jour</h3>
      <div class="wbars tall">${week.map(d=>{const v=(f.log[d]||{minutes:0}).minutes;return `<div class="wb ${d===t?'today':''}" title="${v} min"><em>${v||''}</em><i style="height:${v?Math.max(8,100*v/max):4}%;background:${v?'linear-gradient(180deg,#ff5a36,#ec4899)':'var(--s-pip)'}"></i><span>${DN[dowOf(d)][0]}</span></div>`}).join('')}</div></div>

    <details class="card pad fset"><summary>Réglages du minuteur</summary>
      <div class="three">${Object.entries(MODES).map(([k,v])=>`<div class="fld2"><label>${v.label} (min)</label><input type="number" min="1" max="180" value="${f.dur[k]}" data-fdur="${k}"></div>`).join('')}</div>
      ${perm==='default'?`<button type="button" class="hbtn" data-f="notif" style="margin-top:6px">🔔 Activer les notifications de fin de session</button>`:`<p class="mute small" style="margin:6px 0 0">Notifications : ${perm==='granted'?'activées':perm==='denied'?'bloquées dans le navigateur':'non supportées ici'}.</p>`}
    </details>
  </div>`;
}

/* ----- mise à jour légère à chaque tick ----- */
function tick(){
  const f=F();
  if(running()&&Date.now()>=f.endAt){complete();return}
  const rem=remaining();
  Hub.setTitle({timer:running()?`${MODES[f.mode].emoji} ${mmss(rem)}`:''});
  if(Hub.current()!=='focus')return;
  const t=$('#f-time');if(t&&t.textContent!==mmss(rem))t.textContent=mmss(rem);
  const arc=el.querySelector('.ring-arc');
  if(arc){const C=+arc.style.getPropertyValue('--c');arc.style.strokeDashoffset=C*(remaining()/total())}
}

/* ----- événements ----- */
el.addEventListener('click',e=>{
  const b=e.target.closest('[data-f]');
  if(b){const a=b.dataset.f;
    if(a==='start')start();else if(a==='pause')pause();else if(a==='reset')reset();else if(a==='skip')skip();
    else if(a==='notif')Notification.requestPermission().then(p=>{Hub.toast(p==='granted'?'Notifications activées':'Notifications refusées');render()});
    return}
  const m=e.target.closest('[data-fmode]');
  if(m)setMode(m.dataset.fmode);
});
el.addEventListener('change',e=>{
  const f=F();
  if(e.target.id==='f-task-sel'){const v=e.target.value;f.task=v?{type:v[0],id:v.slice(2)}:null;save();$('#f-task').textContent=taskLabel()}
  else if(e.target.id==='f-auto'){f.autoCheck=e.target.checked;save()}
  else if(e.target.dataset.fdur){const k=e.target.dataset.fdur,v=Math.max(1,Math.min(180,+e.target.value||25));
    f.dur[k]=v;e.target.value=v;if(f.mode===k&&!running())f.left=null;save();render();
    el.querySelector('.fset').open=true}
});

Hub.register('focus',{show(){render()}});
setInterval(tick,250);
tick();
})();
