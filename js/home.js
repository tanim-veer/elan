/* Élan — Accueil : tableau de bord qui réunit la routine et les objectifs. */
(()=>{
'use strict';
const {$,$$,esc,todayStr,addDays,dowOf,DL,DN,MF}=Hub;
const el=$('#view-home');
const MOODS=[
  {n:1,e:'😫',l:'Épuisé',c:'#ef4444'},{n:2,e:'😕',l:'Bof',c:'#f59e0b'},{n:3,e:'😐',l:'Neutre',c:'#94a3b8'},
  {n:4,e:'🙂',l:'Bien',c:'#22c55e'},{n:5,e:'🤩',l:'Au top',c:'#8b5cf6'}
];
const slot=()=>{const h=new Date().getHours();
  return h<5?['Bonne nuit','🌙','night']:h<12?['Bonjour','☀️','morning']:h<18?['Bon après-midi','🌤️','day']:['Bonsoir','🌆','evening']};

function goalsInfo(){
  const O=Objectifs.getState(),now=Date.now();
  const rows=[];
  O.categories.forEach(c=>Objectifs.flat(c.goals).forEach(n=>rows.push({n,c})));
  const leaves=rows.filter(r=>!r.n.children.length);
  const doneLeaves=leaves.filter(r=>r.n.done).length;
  const tops=O.categories.flatMap(c=>c.goals);
  const open=rows.filter(r=>r.n.deadline&&!Objectifs.isDone(r.n)).sort((a,b)=>a.n.deadline-b.n.deadline);
  const urgent=open.filter(r=>['over','crit'].includes(Objectifs.level(r.n.deadline-now))).length;
  return {total:leaves.length,doneLeaves,pct:leaves.length?Math.round(100*doneLeaves/leaves.length):0,
    topDone:tops.filter(Objectifs.isDone).length,topTotal:tops.length,open,urgent};
}

function routineMsg(st){
  if(!st)return 'Journée libre';
  if(st.pct===100)return 'Journée parfaite 🎉';
  if(st.pct>=Routine.goal())return 'Objectif atteint, continue !';
  return `Encore ${st.total-st.done} à faire`;
}

function render(fresh){
  el.classList.toggle('noanim',!fresh);
  const t=todayStr(),R=Routine;
  R.ensureDay(t);
  const st=R.stat(t),pct=st?st.pct:0;
  const [greet,emo,sl]=slot(),now=new Date();
  const x=Gamify.xpInfo(),sk=R.streaks(),G=goalsInfo(),H=Hub.getStore();
  const a7=R.agg(Array.from({length:7},(_,i)=>addDays(t,-i)).filter(d=>d>=R.start()));
  const fToday=(H.focus.log[t]||{minutes:0}).minutes;
  const items=R.itemsOf(t).slice().sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(a.time||'99:99').localeCompare(b.time||'99:99'));
  const shown=items.slice(0,8);
  const mood=H.mood[t];
  const ins=Gamify.insight();
  const badges=Gamify.badgeStates(),got=badges.filter(b=>b.got).length;

  // 7 derniers jours (routine + humeur)
  const week=Array.from({length:7},(_,i)=>addDays(t,i-6));
  const weekBars=week.map(d=>{const s=d>=R.start()?R.stat(d):null;
    return `<div class="wb ${d===t?'today':''}" title="${DL[dowOf(d)]} : ${s?s.pct+'%':'–'}"><i style="height:${s?Math.max(6,s.pct):6}%;background:${s?R.col(s.pct):'var(--s-pip)'}"></i><span>${DN[dowOf(d)][0]}</span></div>`}).join('');
  const moodBars=week.map(d=>{const m=H.mood[d],o=MOODS.find(k=>k.n===m);
    return `<div class="wb" title="${DL[dowOf(d)]}${o?' : '+o.l:''}"><i style="height:${o?o.n*20:6}%;background:${o?o.c:'var(--s-pip)'}"></i><span>${o?o.e:'·'}</span></div>`}).join('');

  el.innerHTML=`
  <div class="wrap home">
    <section class="hhero hero-${sl}">
      <div class="hh-top"><span class="hh-emoji">${emo}</span>
        <div><small>${DL[dowOf(t)]} ${now.getDate()} ${MF[now.getMonth()]}</small><h1>${greet} !</h1></div></div>
      <p class="hh-quote">« ${esc(Gamify.quoteOfDay())} »</p>
      <div class="hh-xp"><div class="xpbar"><i style="width:${x.pct}%"></i></div><span>Niveau ${x.level} · ${x.title} · ${x.xp} XP</span></div>
    </section>

    <div class="quick-actions">
      <button type="button" data-qa="task" style="--qc:#ff5a36">＋ Tâche</button>
      <button type="button" data-qa="goal" style="--qc:#4f6bff">＋ Objectif</button>
      <button type="button" data-go="focus" style="--qc:#f43f8e">▶ Focus</button>
    </div>

    <div class="grid2">
      <button type="button" class="rcard" data-go="routine">
        <div class="rwrap">${Hub.ring({pct,size:116,stroke:11,c1:'#ff8a3d',c2:'#ec4899',id:'rg-routine'})}<b>${pct}<small>%</small></b></div>
        <div class="rtxt"><small>Routine du jour</small><strong>${st?st.done+' / '+st.total+' tâches':'Aucune tâche'}</strong><span>${routineMsg(st)}</span></div>
      </button>
      <button type="button" class="rcard" data-go="objectifs">
        <div class="rwrap">${Hub.ring({pct:G.pct,size:116,stroke:11,c1:'#4f6bff',c2:'#06b6d4',id:'rg-goals'})}<b>${G.pct}<small>%</small></b></div>
        <div class="rtxt"><small>Objectifs</small><strong>${G.doneLeaves} / ${G.total} étapes</strong><span>${G.topDone}/${G.topTotal} objectifs terminés${G.urgent?` · <em class="warnchip">⚠ ${G.urgent} urgent${G.urgent>1?'s':''}</em>`:''}</span></div>
      </button>
    </div>

    <div class="kpi4">
      <div class="k" style="--kc:#ff5a36"><span>🔥</span><b>${sk.cur}<small> j</small></b><i>Série</i></div>
      <div class="k" style="--kc:#10b981"><span>📈</span><b>${a7==null?'–':a7}<small>${a7==null?'':'%'}</small></b><i>7 jours</i></div>
      <div class="k" style="--kc:#f43f8e"><span>🍅</span><b>${fToday}<small> min</small></b><i>Focus</i></div>
      <div class="k" style="--kc:#f59e0b"><span>🏅</span><b>${got}<small>/${badges.length}</small></b><i>Succès</i></div>
    </div>

    <h2 class="sec">À faire aujourd'hui</h2>
    <div class="card hlist">
      ${shown.length?shown.map(i=>`<div class="hrow2 ${i.done?'done':''}" data-htoggle="${i.id}"><span class="hbox">${i.done?'✓':''}</span><span class="hemo">${esc(i.em||'•')}</span><span class="hnm">${esc(i.name)}</span>${i.time?`<span class="htm">${i.time}</span>`:''}</div>`).join('')
        +(items.length>shown.length?`<button type="button" class="more" data-go="routine">+ ${items.length-shown.length} autres dans Routine</button>`:'')
        :`<div class="hempty"><b>Rien de prévu 🌤️</b>Ajoute une tâche avec « ＋ Tâche ».</div>`}
    </div>

    <h2 class="sec">Prochaines échéances</h2>
    <div class="card hlist">
      ${G.open.length?G.open.slice(0,4).map(r=>{const ms=r.n.deadline-Date.now(),lv=Objectifs.level(ms);
        return `<div class="hrow2 dl" data-hgoal="${r.n.id}" style="--cc:${r.c.color}"><span class="cdot">${esc(r.c.emoji||'')}</span><span class="hnm">${esc(r.n.title)}<small>${esc(r.c.name)}</small></span><span class="cdchip lv-${lv}" data-dl="${r.n.deadline}">${esc(Objectifs.fmtCd(ms))}</span></div>`}).join('')
        :`<div class="hempty"><b>Aucune échéance 🎯</b>Donne une date à un objectif pour le voir ici.</div>`}
    </div>

    <div class="grid2">
      <div class="card pad">
        <h3 class="ct">Humeur du jour</h3>
        <div class="moods">${MOODS.map(m=>`<button type="button" data-mood="${m.n}" class="${mood===m.n?'on':''}" style="--mc:${m.c}" aria-label="${m.l}"><span>${m.e}</span><i>${m.l}</i></button>`).join('')}</div>
        <div class="wbars sm">${moodBars}</div>
      </div>
      <div class="card pad">
        <h3 class="ct">Ta semaine</h3>
        <div class="wbars">${weekBars}</div>
        <p class="mute small" style="margin:10px 0 0">${ins?`💡 Tu es plus régulier le <b>${ins.best.day.toLowerCase()}</b> (${ins.best.p}%), le <b>${ins.worst.day.toLowerCase()}</b> est ton jour difficile (${ins.worst.p}%).`:'💡 Continue quelques jours : Élan te dira quand tu es le plus régulier.'}</p>
      </div>
    </div>

    <h2 class="sec">Succès <span class="mute">${got} / ${badges.length}</span></h2>
    <div class="badges">${badges.map(b=>`<div class="bd ${b.got?'got':''}" title="${esc(b.d)}"><span class="be">${b.e}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small>${b.got?'':`<div class="bp"><i style="width:${Math.round(100*b.cur/b.t)}%"></i></div>`}</div>`).join('')}</div>

    <h2 class="sec">Réglages & données</h2>
    <div class="card pad">
      <div class="fld2"><label>Thème</label>
        <div class="seg3">${[['auto','Auto'],['light','Clair'],['dark','Sombre']].map(([v,l])=>`<button type="button" data-theme-set="${v}" class="${Hub.theme()===v?'on':''}">${l}</button>`).join('')}</div></div>
      <div class="row2"><button type="button" class="hbtn" data-hub="export">⬇ Tout exporter</button><button type="button" class="hbtn" data-hub="import">⬆ Tout importer</button></div>
      <p class="mute small" style="margin:12px 0 0">Tes données restent sur cet appareil (aucun compte, aucun serveur). Une seule sauvegarde contient routine, objectifs, humeur, focus et succès — elle accepte aussi les anciens exports des deux applis.</p>
    </div>
  </div>`;
}

/* ----- événements ----- */
el.addEventListener('click',e=>{
  const tg=e.target.closest('[data-htoggle]');
  if(tg){Routine.toggleItem(todayStr(),tg.dataset.htoggle);Hub.keepScroll(render);return}
  const g=e.target.closest('[data-hgoal]');
  if(g){Hub.go('objectifs',{goto:g.dataset.hgoal});return}
  const m=e.target.closest('[data-mood]');
  if(m){const H=Hub.getStore(),t=todayStr(),n=+m.dataset.mood;
    if(H.mood[t]===n)delete H.mood[t];else H.mood[t]=n;
    Hub.saveStore();Hub.changed();Hub.keepScroll(render);
    if(H.mood[t])Hub.toast(MOODS[n-1].e+' Humeur du jour enregistrée');return}
  const th=e.target.closest('[data-theme-set]');
  if(th){Hub.setTheme(th.dataset.themeSet);Hub.keepScroll(render);return}
  const hb=e.target.closest('[data-hub]');
  if(hb){hb.dataset.hub==='export'?Hub.exportAll():Hub.importAll();return}
  const qa=e.target.closest('[data-qa]');
  if(qa)Hub.go(qa.dataset.qa==='task'?'routine':'objectifs',{add:true});
});

/* compte à rebours en direct */
setInterval(()=>{
  if(Hub.current()!=='home')return;
  $$('[data-dl]',el).forEach(c=>{const ms=+c.dataset.dl-Date.now(),txt=Objectifs.fmtCd(ms);
    if(c.textContent!==txt)c.textContent=txt;c.className='cdchip lv-'+Objectifs.level(ms)});
},1000);

Hub.register('home',{show(){render(true)}});
Hub.on('change',()=>{if(Hub.current()==='home')Hub.keepScroll(render)});
Hub.on('theme',()=>{if(Hub.current()==='home')Hub.keepScroll(render)});
})();
