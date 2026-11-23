/* Élan — Calendrier : bilans de la routine (couleur du jour) + échéances des objectifs (pastilles). */
(()=>{
'use strict';
const {$,esc,fmt,parse,todayStr,addDays,dowOf,DL,DN,MF,pad}=Hub;
const el=$('#view-calendar');
let ym=null,sel=null;

function deadlineMap(){
  const map={};
  Objectifs.getState().categories.forEach(c=>Objectifs.flat(c.goals).forEach(n=>{
    if(!n.deadline)return;
    const k=fmt(new Date(n.deadline));(map[k]=map[k]||[]).push({n,c});
  }));
  Object.values(map).forEach(l=>l.sort((a,b)=>a.n.deadline-b.n.deadline));
  return map;
}
const hhmm=ts=>{const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes())};

function render(fresh){
  const R=Routine,t=todayStr();
  if(!ym){const d=parse(t);ym={y:d.getFullYear(),m:d.getMonth()}}
  if(!sel)sel=t;
  const first=new Date(ym.y,ym.m,1),lead=(first.getDay()+6)%7,nd=new Date(ym.y,ym.m+1,0).getDate();
  const dl=deadlineMap();
  let sumD=0,sumT=0,perfect=0,dlCount=0;
  const cells=[];
  for(let i=0;i<lead;i++)cells.push('<span class="cc empty"></span>');
  for(let d=1;d<=nd;d++){
    const ds=`${ym.y}-${pad(ym.m+1)}-${pad(d)}`;
    const s=ds>=R.start()&&ds<=t?R.stat(ds):null;
    if(s){sumD+=s.done;sumT+=s.total;if(s.total>=3&&s.done===s.total)perfect++}
    const list=dl[ds]||[];dlCount+=list.length;
    const tint=s?`background:color-mix(in srgb,${R.col(s.pct)} ${16+Math.round(s.pct*.4)}%,transparent);`:'';
    const dots=list.slice(0,3).map(x=>`<i style="background:${x.c.color};${Objectifs.isDone(x.n)?'opacity:.35':''}"></i>`).join('')+(list.length>3?'<em>+</em>':'');
    cells.push(`<button type="button" class="cc ${ds===t?'today':''} ${ds===sel?'sel':''} ${ds>t?'future':''}" data-cd="${ds}" style="${tint}" aria-label="${d} ${MF[ym.m]}"><b>${d}</b><span class="dots">${dots}</span></button>`);
  }
  const avg=sumT?Math.round(100*sumD/sumT):null;

  // détail du jour sélectionné
  let items=[];
  if(sel>=R.start()){R.ensureDay(sel);items=R.itemsOf(sel).slice().sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(a.time||'99:99').localeCompare(b.time||'99:99'))}
  const st=sel>=R.start()?R.stat(sel):null;
  const dsel=parse(sel),dls=dl[sel]||[];

  el.innerHTML=`
  <div class="wrap cal ${fresh?'':'noanim'}">
    <div class="vhead"><div><small>Vue d'ensemble</small><h1>${MF[ym.m][0].toUpperCase()+MF[ym.m].slice(1)} <span>${ym.y}</span></h1></div>
      <div class="arrows">
        ${(ym.y===parse(t).getFullYear()&&ym.m===parse(t).getMonth())?'':'<button type="button" class="pill" data-cal="today">Aujourd\'hui</button>'}
        <button type="button" class="ib" data-cal="-1" aria-label="Mois précédent">‹</button>
        <button type="button" class="ib" data-cal="1" aria-label="Mois suivant">›</button>
      </div></div>
    <div class="cal-stats">
      <div style="--kc:#10b981"><b>${avg==null?'–':avg+'%'}</b><span>routine du mois</span></div>
      <div style="--kc:#f59e0b"><b>${perfect}</b><span>jour${perfect>1?'s':''} parfait${perfect>1?'s':''}</span></div>
      <div style="--kc:#4f6bff"><b>${dlCount}</b><span>échéance${dlCount>1?'s':''}</span></div>
    </div>
    <div class="card pad calbox">
      <div class="calhead">${DN.map(n=>`<span>${n[0]}</span>`).join('')}</div>
      <div class="calgrid">${cells.join('')}</div>
      <div class="legend"><span><i style="background:var(--ok)"></i>objectif atteint</span><span><i style="background:var(--warn)"></i>≥ 50 %</span><span><i style="background:var(--bad)"></i>&lt; 50 %</span><span><i class="dotl"></i>échéance</span></div>
    </div>

    <h2 class="sec cap">${DL[dowOf(sel)]} ${dsel.getDate()} ${MF[dsel.getMonth()]}${sel===t?' · aujourd\'hui':''}</h2>
    <div class="card pad">
      <div class="dayhead"><h3 class="ct" style="margin:0">Routine</h3>${st?`<span class="pctchip" style="--pc:${R.col(st.pct)}">${st.pct}%</span>`:''}<span class="sp"></span><button type="button" class="pill" data-open="${sel}">Ouvrir ›</button></div>
      ${items.length?items.map(i=>`<div class="hrow2 ${i.done?'done':''}" data-ctoggle="${i.id}"><span class="hbox">${i.done?'✓':''}</span><span class="hemo">${esc(i.em||'•')}</span><span class="hnm">${esc(i.name)}</span>${i.time?`<span class="htm">${i.time}</span>`:''}</div>`).join('')
        :`<div class="hempty">${sel<R.start()?'Avant le début du suivi.':'Aucune tâche ce jour-là.'}</div>`}
    </div>
    <div class="card pad">
      <h3 class="ct">Échéances</h3>
      ${dls.length?dls.map(({n,c})=>{const done=Objectifs.isDone(n),lv=Objectifs.level(n.deadline-Date.now());
        return `<div class="hrow2 dl ${done?'done':''}" data-cgoal="${n.id}" style="--cc:${c.color}"><span class="cdot">${esc(c.emoji||'')}</span><span class="hnm">${esc(n.title)}<small>${esc(c.name)} · ${Objectifs.PR[n.priority].label}</small></span><span class="cdchip ${done?'ok':'lv-'+lv}">${done?'Terminé ✓':hhmm(n.deadline)}</span></div>`}).join('')
        :`<div class="hempty">Aucune échéance ce jour-là.</div>`}
    </div>
  </div>`;
}

el.addEventListener('click',e=>{
  const c=e.target.closest('[data-cd]');
  if(c){sel=c.dataset.cd;Hub.keepScroll(()=>render(false));return}
  const nav=e.target.closest('[data-cal]');
  if(nav){
    if(nav.dataset.cal==='today'){const d=parse(todayStr());ym={y:d.getFullYear(),m:d.getMonth()};sel=todayStr()}
    else{const n=+nav.dataset.cal,d=new Date(ym.y,ym.m+n,1);ym={y:d.getFullYear(),m:d.getMonth()};
      const t=todayStr(),td=parse(t);sel=(ym.y===td.getFullYear()&&ym.m===td.getMonth())?t:`${ym.y}-${pad(ym.m+1)}-01`}
    render(true);return}
  const tg=e.target.closest('[data-ctoggle]');
  if(tg){Routine.toggleItem(sel,tg.dataset.ctoggle);Hub.keepScroll(()=>render(false));return}
  const g=e.target.closest('[data-cgoal]');
  if(g){Hub.go('objectifs',{goto:g.dataset.cgoal});return}
  const o=e.target.closest('[data-open]');
  if(o)Hub.go('routine',{date:o.dataset.open});
});

Hub.register('calendar',{show(){render(true)}});
Hub.on('change',()=>{if(Hub.current()==='calendar')Hub.keepScroll(()=>render(false))});
})();
