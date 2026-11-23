/* Routine — ancienne appli « Everyday », intégrée telle quelle (fonctionnalités inchangées). */
(()=>{
"use strict";

/* ============ utils ============ */
const $ = s => document.querySelector(s);
const root = document.getElementById("view-routine");
const pad = n => String(n).padStart(2, "0");
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate()+n); return fmt(d); };
const dowOf = s => (parse(s).getDay()+6)%7;           // 0 = lundi
const mondayOf = s => addDays(s, -dowOf(s));
const todayStr = () => fmt(new Date());
const uid = () => Math.random().toString(36).slice(2,9);
const esc = t => String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const DN = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const MN = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const MF = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const EMOJIS = ["💧","🏃","🧘","📚","💪","🛏️","🍎","💊","🧹","☀️","💻","🎸","✍️","🚿","🦷","🚶","🥗","📵","🧠","🌙"];
const ICONS = {
  today:'<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 12.5l3 3 5-6"/></svg>',
  week:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  stats:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/></svg>',
  routine:'<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>'
};

/* ============ state ============ */
const KEY = "everyday-routine-v1";
function load(){
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.habits && s.days) return s; } catch(e){}
  return { v:1, start:todayStr(), habits:[], days:{}, theme:"auto", goal:80 };
}
let S = load();
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){ toast("Stockage plein ou bloqué"); } Hub.changed(); }
const habitById = id => S.habits.find(h => h.id === id);
const sortItems = items => items.slice().sort((a,b) => (a.x?1:0)-(b.x?1:0) || (a.time||"99:99").localeCompare(b.time||"99:99"));

/* Un jour = liste figée d'items {id,hid,name,em,time,done,x}. Créé depuis la routine, puis modifiable. */
function ensureDay(date){
  if (!S.days[date]) S.days[date] = { items: [] };
  syncDay(date, true);
  return S.days[date];
}
function syncDay(date, force){
  const day = S.days[date]; if (!day) return;
  const today = todayStr();
  if (!force && date < today) return;
  const dw = dowOf(date);
  if (date >= today || !day.init){
    for (const h of S.habits) if (h.days.includes(dw) && !day.items.some(i => i.hid === h.id))
      day.items.push({ id:uid(), hid:h.id, name:h.name, em:h.em, time:h.time||"", done:false });
  }
  day.init = true;
  day.items = day.items.filter(i => {
    if (!i.hid || date < today) return true;
    const h = habitById(i.hid);
    if (!h || !h.days.includes(dw)) return i.done;
    i.name = h.name; i.em = h.em; i.time = h.time||"";
    return true;
  });
}
function syncFuture(){
  const t = todayStr();
  for (const d of Object.keys(S.days)) if (d >= t) syncDay(d);
  ensureDay(t);
}
function materialize(){
  const t = todayStr();
  if (S.start > t) S.start = t;
  for (let d = S.start; d <= t; d = addDays(d,1)) ensureDay(d);
}
const stat = date => {
  const d = S.days[date]; if (!d || !d.items.length) return null;
  const done = d.items.filter(i => i.done).length;
  return { done, total:d.items.length, pct: Math.round(100*done/d.items.length) };
};
const agg = dates => {
  let done=0,total=0;
  for (const d of dates){ const s = stat(d); if (s){ done+=s.done; total+=s.total; } }
  return total ? Math.round(100*done/total) : null;
};
const col = p => p==null ? "var(--pip)" : p >= S.goal ? "var(--ok)" : p >= 50 ? "var(--warn)" : "var(--bad)";

/* ============ UI state ============ */
let view = "today", cur = todayStr(), weekAnchor = mondayOf(todayStr()), weekMode = "grid", range = "days", rDay = dowOf(todayStr()), selBar = null;

function toast(t){ Hub.toast(t); }
function confetti(){ Hub.confetti(); }
function toggleItem(date, id){
  const it = S.days[date].items.find(i => i.id === id); if (!it) return;
  it.done = !it.done; save();
  const s = stat(date); render(true);
  if (it.done && s && s.pct === 100) confetti();
}

/* ============ views ============ */
function render(keepScroll){
  const y = scrollY;
  const tabs = [["today","Jour"],["week","Semaine"],["stats","Stats"],["routine","Routine"]];
  $("#r-nav").innerHTML = tabs.map(([k,l]) => `<button data-nav="${k}" class="${view===k?"on":""}">${ICONS[k]}${l}</button>`).join("");
  $("#r-app").innerHTML = ({today:vToday, week:vWeek, stats:vStats, routine:vRoutine})[view]();
  $("#r-fab").style.display = (view==="today"||view==="week") ? "grid" : "none";
  if (keepScroll) scrollTo(0,y);
}

function vToday(){
  const t = todayStr(), day = ensureDay(cur), st = stat(cur);
  const isToday = cur === t, isFuture = cur > t;
  const items = sortItems(day.items);
  const left = day.items.length - (st ? st.done : 0);
  let msg;
  if (!st) msg = ["Journée libre","Appuie sur + pour ajouter une tâche."];
  else if (st.pct === 100) msg = ["Journée parfaite 🎉","Tout est fait. Bravo !"];
  else if (isFuture) msg = ["À venir",`${st.total} tâche${st.total>1?"s":""} prévue${st.total>1?"s":""}`];
  else if (isToday) msg = [`Encore ${left} à faire`, st.pct >= S.goal ? "Objectif atteint, continue !" : `Objectif du jour : ${S.goal}%`];
  else msg = [st.pct >= S.goal ? "Objectif atteint ✅" : "Objectif manqué","Bilan de la journée"];
  const d = parse(cur);
  return `
  <div class="head">
    <div class="d"><small>${isToday?"Aujourd'hui":isFuture?"À venir":"Passé"} · ${d.getDate()} ${MF[d.getMonth()]} ${d.getFullYear()}</small><h1>${DL[dowOf(cur)]}<span>.</span></h1></div>
    <div class="arrows">
      ${isToday?"":`<button class="pill" data-act="gototoday">Aujourd'hui</button>`}
      <button class="ib" data-act="day" data-n="-1" ${cur<=S.start?"disabled":""} aria-label="Jour précédent">‹</button>
      <button class="ib" data-act="day" data-n="1" aria-label="Jour suivant">›</button>
    </div>
  </div>
  <div class="hero ${st&&st.pct===100?"full":""}">
    <span class="cnt">${st?st.done+" / "+st.total:""}</span>
    <div class="big">${st?st.pct:0}<small>%</small></div>
    <div class="msg">${msg[0]}</div><div class="sub">${msg[1]}</div>
    <div class="track"><i style="width:${st?st.pct:0}%"></i></div>
  </div>
  <div class="card">
    ${items.length ? items.map(i => `
      <div class="item ${i.done?"done":""}" data-act="toggle" data-id="${i.id}">
        <div class="box">${i.done?"✓":""}</div>
        <div class="emo">${esc(i.em||"•")}</div>
        <div class="nm">${esc(i.name)}${i.x?'<span class="badge">ponctuel</span>':""}</div>
        ${i.time?`<span class="tm">${i.time}</span>`:""}
        ${i.x?`${!i.done&&cur>=t?`<button class="x" data-act="push" data-id="${i.id}" title="Reporter à demain" aria-label="Reporter à demain">⤳</button>`:""}<button class="x" data-act="delx" data-id="${i.id}" aria-label="Supprimer">✕</button>`:""}
      </div>`).join("") : `<div class="empty"><b>Rien de prévu 🌤️</b>Ajoute une tâche avec le bouton +</div>`}
  </div>`;
}

function weekRows(dates){
  const map = new Map();
  dates.forEach((d,idx) => {
    if (d < S.start) return;
    for (const i of ensureDay(d).items){
      const k = i.hid || ("x:"+i.name.toLowerCase());
      if (!map.has(k)) map.set(k, { name:i.name, em:i.em||"•", x:!i.hid, time:i.time||"", cells:Array(7).fill(null) });
      const r = map.get(k); r.cells[idx] = { it:i, d }; if (i.time && !r.time) r.time = i.time;
    }
  });
  return [...map.values()].sort((a,b) => (a.x?1:0)-(b.x?1:0) || (a.time||"99").localeCompare(b.time||"99") || a.name.localeCompare(b.name));
}
function vWeek(){
  const t = todayStr(), all = Array.from({length:7}, (_,i) => addDays(weekAnchor,i));
  const rows = weekRows(all);
  const valid = all.filter(d => d >= S.start && S.days[d]);
  const wp = agg(valid);
  const a = parse(weekAnchor), b = parse(addDays(weekAnchor,6));
  const label = `${a.getDate()} ${MN[a.getMonth()]} → ${b.getDate()} ${MN[b.getMonth()]}`;
  const head = `
  <div class="head">
    <div class="d"><small>${weekAnchor===mondayOf(t)?"Cette semaine":"Semaine"} · ${label}</small><div class="wkhead"><b style="color:${col(wp)}">${wp==null?"–":wp+"%"}</b><span class="mute small">accompli</span></div></div>
    <div class="arrows">
      ${weekAnchor===mondayOf(t)?"":`<button class="pill" data-act="gotoweek">Actuelle</button>`}
      <button class="ib" data-act="week" data-n="-1" aria-label="Semaine précédente">‹</button>
      <button class="ib" data-act="week" data-n="1" aria-label="Semaine suivante">›</button>
    </div>
  </div>
  <div class="seg"><button data-act="wmode" data-m="grid" class="${weekMode==="grid"?"on":""}">Planning</button><button data-act="wmode" data-m="prog" class="${weekMode==="prog"?"on":""}">Progression</button></div>`;
  if (weekMode === "grid"){
    return head + `<div class="card pad" style="padding:8px 10px 12px"><div class="grid">
      <div></div>${all.map(d => `<div class="gh ${d===t?"today":""}" data-act="opendate" data-d="${d}"><small>${DN[dowOf(d)][0]}</small><b>${parse(d).getDate()}</b></div>`).join("")}
      ${rows.length ? rows.map(r => `
        <div class="gn"><span class="e">${esc(r.em)}</span><span>${esc(r.name)}</span></div>
        ${r.cells.map((c,i) => { if (!c) return `<div class="gc"><span class="dot"></span></div>`;
          const d = c.d, st = c.it.done ? "d" : d < t ? "m" : d === t ? "t" : "f";
          return `<div class="gc"><button class="cell ${st}" data-act="cell" data-d="${d}" data-id="${c.it.id}" aria-label="${esc(r.name)} ${DL[i]}">${c.it.done?"✓":""}</button></div>`; }).join("")}`).join("")
        : `<div style="grid-column:1/-1" class="empty"><b>Semaine vide</b>Appuie sur + pour ajouter des tâches.</div>`}
      ${rows.length ? `<div class="gp lab">Bilan</div>${all.map(d => { const s = d>=S.start ? stat(d) : null; return `<div class="gp" style="color:${s?col(s.pct):"var(--mute)"}">${s?s.pct+"%":"–"}</div>`; }).join("")}` : ""}
    </div></div>
    <div class="legend"><span><i style="background:var(--ok)"></i>fait</span><span><i style="background:var(--bad);opacity:.6"></i>manqué</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn)"></i>aujourd'hui</span><span><i style="box-shadow:inset 0 0 0 2px var(--line)"></i>à venir</span></div>
    <p class="mute small" style="margin:0 4px">Touche une case pour la cocher, ou un jour pour l'ouvrir.</p>`;
  }
  const list = rows.map(r => { const cs = r.cells.filter(Boolean);
    return { name:r.name, em:r.em, total:cs.length, done:cs.filter(c=>c.it.done).length, missed:cs.filter(c=>!c.it.done&&c.d<t).length,
      pips:cs.map(c => c.it.done?"d":c.d<t?"m":c.d===t?"t":"f") }; })
    .sort((a,b) => b.missed-a.missed || (a.done/a.total)-(b.done/b.total));
  const late = list.filter(r => r.missed>0).length;
  return head + `<h2 style="margin-top:6px">Avancement par tâche ${late?`· <span style="color:var(--bad)">${late} en retard</span>`:""}</h2>
  <div class="card">
    ${list.length ? list.map(r => {
      const tag = r.missed>0 ? `<span class="tag late">en retard −${r.missed}</span>` : r.done===r.total ? `<span class="tag ok">terminé ✓</span>` : `<span class="tag run">dans les temps</span>`;
      return `<div class="hab"><div class="top"><span class="emo" style="width:32px;height:32px;font-size:1.05rem">${esc(r.em)}</span><b class="sp" style="font-weight:600">${esc(r.name)}</b>${tag}<span class="mute small" style="width:32px;text-align:right;font-weight:700">${r.done}/${r.total}</span></div>
      <div class="pips">${r.pips.map(p => `<div class="pip ${p==="f"?"":p}"></div>`).join("")}</div></div>`; }).join("")
      + `<div class="legend"><span><i style="background:var(--ok)"></i>fait</span><span><i style="background:var(--bad)"></i>manqué</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn)"></i>aujourd'hui</span><span><i style="background:var(--pip)"></i>à venir</span></div>`
      : `<div class="empty"><b>Aucune tâche</b>Rien cette semaine.</div>`}
  </div>`;
}

function periodSeries(){
  const t = todayStr(), out = [];
  if (range === "days"){
    for (let i=29;i>=0;i--){ const d = addDays(t,-i), dd = parse(d); out.push({ l: dd.getDate(), sub: `${DL[dowOf(d)]} ${dd.getDate()} ${MF[dd.getMonth()]}`, p: d>=S.start ? (stat(d)?.pct ?? null) : null }); }
  } else if (range === "weeks"){
    for (let i=11;i>=0;i--){ const m = addDays(mondayOf(t), -7*i); const ds = Array.from({length:7},(_,k)=>addDays(m,k)).filter(d=>d<=t && d>=S.start);
      const mm = parse(m); out.push({ l: mm.getDate()+"/"+(mm.getMonth()+1), sub:"Semaine du "+mm.getDate()+" "+MF[mm.getMonth()], p: agg(ds) }); }
  } else {
    const now = new Date();
    for (let i=11;i>=0;i--){ const d = new Date(now.getFullYear(), now.getMonth()-i, 1); const ds = [];
      for (let x=new Date(d); x.getMonth()===d.getMonth(); x.setDate(x.getDate()+1)){ const f = fmt(x); if (f<=t && f>=S.start) ds.push(f); }
      out.push({ l: MN[d.getMonth()].replace(".",""), sub: MF[d.getMonth()]+" "+d.getFullYear(), p: agg(ds) }); }
  }
  return out;
}
function chartSVG(data){
  const W=340,H=190,L=26,B=22,T=8,n=data.length,bw=(W-L)/n,ch=H-B-T;
  const y = p => T + ch*(1-p/100);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Taux d'accomplissement">`;
  [0,50,100].forEach(g => s += `<line x1="${L}" x2="${W}" y1="${y(g)}" y2="${y(g)}" stroke="var(--line)"/><text x="0" y="${y(g)+3}">${g}</text>`);
  s += `<line x1="${L}" x2="${W}" y1="${y(S.goal)}" y2="${y(S.goal)}" stroke="var(--acc)" stroke-dasharray="4 3"/>`;
  data.forEach((d,i) => {
    const x = L + i*bw + bw*.15, w = bw*.7, h = d.p==null ? 0 : Math.max(2, ch*d.p/100);
    s += `<rect class="bar" x="${x}" y="${T+ch-h}" width="${w}" height="${h}" rx="${Math.min(4,w/2)}" fill="${col(d.p)}" opacity="${selBar!=null&&selBar!==i?.4:1}"/>`;
    s += `<rect class="bar" data-act="bar" data-i="${i}" x="${L+i*bw}" y="${T}" width="${bw}" height="${ch}" fill="transparent"/>`;
    if (n<=12 || i%5===0 || i===n-1) s += `<text x="${x+w/2}" y="${H-7}" text-anchor="middle">${d.l}</text>`;
  });
  return s + "</svg>";
}
function streaks(){
  const t = todayStr(); let cur_ = 0, best = 0, run = 0;
  for (let d = S.start; d <= t; d = addDays(d,1)){ const s = stat(d); if (!s) continue; if (s.pct >= S.goal){ run++; best = Math.max(best,run); } else if (d !== t) run = 0; }
  for (let d = t; d >= S.start; d = addDays(d,-1)){ const s = stat(d); if (!s) continue; if (s.pct >= S.goal) cur_++; else if (d !== t) break; }
  return { cur:cur_, best };
}
function vStats(){
  const t = todayStr(), data = periodSeries();
  const last = n => Array.from({length:n},(_,i)=>addDays(t,-i)).filter(d=>d>=S.start);
  const a7 = agg(last(7)), a30 = agg(last(30)), sk = streaks();
  const doneAll = Object.values(S.days).reduce((a,d)=>a+d.items.filter(i=>i.done).length,0);
  const sel = selBar!=null && data[selBar] ? data[selBar] : null;
  const start = addDays(mondayOf(t), -7*15); let heat = "";
  for (let i=0;i<16*7;i++){ const d = addDays(start,i); const s = d<=t && d>=S.start ? stat(d) : null;
    heat += `<i title="${d}${s?" : "+s.pct+"%":""}" style="${s?`background:${col(s.pct)};opacity:${.4+.6*s.pct/100}`:d>t?"opacity:.35":""}"></i>`; }
  const hm = new Map();
  for (const d of last(30)){ const day = S.days[d]; if (!day) continue; for (const i of day.items){ if (!i.hid) continue;
    if (!hm.has(i.hid)) hm.set(i.hid,{name:i.name,em:i.em,d:0,t:0}); const m = hm.get(i.hid); m.t++; if (i.done) m.d++; m.name = i.name; m.em = i.em; } }
  const hr = [...hm.values()].map(m => ({...m,p:Math.round(100*m.d/m.t)})).sort((a,b)=>a.p-b.p);
  const journal = last(10).map(d => [d, stat(d)]).filter(x=>x[1]);
  return `
  <div class="head"><div class="d"><small>Vue d'ensemble</small><h1>Statistiques<span>.</span></h1></div></div>
  <div class="kpis">
    <div class="kpi"><span class="mute small">🔥 Série (≥${S.goal}%)</span><b>${sk.cur} j</b><span class="mute small">record : ${sk.best} j</span></div>
    <div class="kpi"><span class="mute small">Moyenne 7 jours</span><b style="color:${col(a7)}">${a7==null?"–":a7+"%"}</b><span class="mute small">30 j : ${a30==null?"–":a30+"%"}</span></div>
  </div>
  <div class="card pad">
    <div class="seg">${[["days","Jours"],["weeks","Semaines"],["months","Mois"]].map(([k,l])=>`<button data-act="range" data-r="${k}" class="${range===k?"on":""}">${l}</button>`).join("")}</div>
    <div class="row small" style="min-height:22px;margin-bottom:4px"><span class="cap mute">${sel?sel.sub:"Touche une barre pour le détail"}</span><span class="sp"></span><b style="color:${col(sel?.p)}">${sel?(sel.p==null?"–":sel.p+"%"):""}</b></div>
    ${chartSVG(data)}
    <div class="legend" style="padding-bottom:0"><span><i style="background:var(--ok)"></i>≥ objectif (${S.goal}%)</span><span><i style="background:var(--warn)"></i>≥ 50%</span><span><i style="background:var(--bad)"></i>&lt; 50%</span></div>
  </div>
  <h2>16 dernières semaines</h2>
  <div class="card pad"><div class="heat">${heat}</div><div class="mute small" style="margin-top:10px">${doneAll} tâches accomplies depuis le début</div></div>
  <h2>Taux par habitude · 30 jours</h2>
  <div class="card">${hr.length ? hr.map(h=>`<div class="hrow"><span>${esc(h.em||"•")}</span><span class="nm">${esc(h.name)}</span><div class="meter"><i style="width:${h.p}%;background:${col(h.p)}"></i></div><span class="v">${h.p}%</span></div>`).join("") : `<div class="empty">Pas encore de données.</div>`}</div>
  <h2>Journal des bilans</h2>
  <div class="card">${journal.length ? journal.map(([d,s])=>{ const dd=parse(d); return `<div class="hrow" data-act="opendate" data-d="${d}" style="cursor:pointer"><span class="nm">${DL[dowOf(d)]} ${dd.getDate()} ${MN[dd.getMonth()]}</span><div class="meter"><i style="width:${s.pct}%;background:${col(s.pct)}"></i></div><span class="v">${s.pct}%</span></div>`; }).join("") : `<div class="empty">Aucun bilan pour l'instant.</div>`}</div>`;
}

function vRoutine(){
  const list = S.habits.filter(h => h.days.includes(rDay)).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  return `
  <div class="head"><div class="d"><small>Habitudes fixes</small><h1>Ma routine<span>.</span></h1></div></div>
  <p class="mute small" style="margin:-6px 4px 12px">Les changements s'appliquent à aujourd'hui et aux jours à venir. L'historique reste intact.</p>
  <div class="chips">${DN.map((n,i)=>{ const c = S.habits.filter(h=>h.days.includes(i)).length; return `<button class="chip ${i===rDay?"on":""}" data-act="rday" data-i="${i}">${n}${c?`<s>${c}</s>`:""}</button>`; }).join("")}</div>
  <h2>${DL[rDay]}</h2>
  <div class="card">
    ${list.length ? list.map(h=>`<div class="item" data-act="edit" data-id="${h.id}"><div class="emo">${esc(h.em||"•")}</div><div class="nm">${esc(h.name)}</div>${h.time?`<span class="tm">${h.time}</span>`:""}<span class="mute">✎</span></div>`).join("") : `<div class="empty"><b>Rien pour ${DL[rDay].toLowerCase()}</b>Ajoute ta première habitude.</div>`}
  </div>
  <div class="acts"><button class="btn acc" data-act="addrec">＋ Ajouter une habitude</button>${list.length?`<button class="btn sec" data-act="copyday">Copier vers…</button>`:""}</div>
  <h2>Réglages</h2>
  <div class="card pad">
    <div class="two">
      <div class="fld"><label>Objectif du jour (%)</label><input type="number" min="10" max="100" step="5" value="${S.goal}" data-set="goal"></div>
      <div class="fld"><label>Thème</label><select data-set="theme">${[["auto","Auto"],["light","Clair"],["dark","Sombre"]].map(([v,l])=>`<option value="${v}" ${Hub.theme()===v?"selected":""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="acts" style="margin-top:0"><button class="btn sec" data-act="export">⬇ Exporter</button><button class="btn sec" data-act="import">⬆ Importer</button></div>
    <p class="mute small">Données stockées sur cet appareil. Exporte pour sauvegarder ou transférer PC ⇄ téléphone.</p>
    <button class="btn del" style="width:100%" data-act="reset">Tout réinitialiser</button>
  </div>
  <input type="file" id="file" accept="application/json" hidden>`;
}

/* ============ modals ============ */
function openSheet(html){
  closeSheet();
  const o = document.createElement("div"); o.className = "ov"; o.id = "r-ov";
  o.innerHTML = `<div class="sheet">${html}</div>`;
  o.addEventListener("click", e => { if (e.target === o) closeSheet(); });
  root.appendChild(o);
  return o;
}
const closeSheet = () => $("#r-ov")?.remove();
const dayChips = sel => `<div class="chips" id="dchips">${DN.map((n,i)=>`<button type="button" class="chip ${sel.includes(i)?"sel":""}" data-d="${i}">${n}</button>`).join("")}</div>`;

/* Feuille unique : tâche ponctuelle (un jour précis) ou habitude récurrente (jours de la semaine). */
function taskSheet(opt = {}){
  const h = opt.habit, editing = !!h;
  let mode = editing ? "rec" : (opt.mode || "once");
  const base = view === "today" ? cur : todayStr();
  const days = h ? h.days : [opt.day != null ? opt.day : dowOf(base)];
  const date = opt.date || base;
  const o = openSheet(`
    <h3>${editing ? "Modifier l'habitude" : "Nouvelle tâche"}</h3>
    ${editing ? "" : `<div class="seg"><button type="button" data-m="once">Une seule fois</button><button type="button" data-m="rec">Chaque semaine</button></div>`}
    <div class="fld"><label>Nom</label><input type="text" id="tn" maxlength="70" value="${h?esc(h.name):""}" placeholder="Ex : Appeler le médecin" autocomplete="off"></div>
    <div class="fld"><label>Icône</label>
      <div class="emojis" id="emos"><button type="button" data-e="⭐">⭐</button>${EMOJIS.map(e=>`<button type="button" data-e="${e}">${e}</button>`).join("")}</div></div>
    <div class="fld" id="f-once"><label>Date</label><input type="date" id="td" value="${date}" min="${S.start}"></div>
    <div class="fld" id="f-rec"><label>Jours de la semaine</label>${dayChips(days)}</div>
    <div class="fld"><label>Heure (facultatif)</label><input type="time" id="tt" value="${h?h.time||"":""}"></div>
    <div class="acts">${editing?`<button type="button" class="btn del" id="td-del" style="flex:0 0 auto">Supprimer</button>`:""}<button type="button" class="btn sec" id="t-c">Annuler</button><button type="button" class="btn acc" id="t-s">${editing?"Enregistrer":"Ajouter"}</button></div>`);
  let em = h ? h.em : "⭐";
  const setEm = () => o.querySelectorAll("#emos button").forEach(b => b.classList.toggle("on", b.dataset.e === em));
  const setMode = () => {
    o.querySelectorAll(".seg button").forEach(b => b.classList.toggle("on", b.dataset.m === mode));
    $("#f-once").style.display = mode === "once" ? "" : "none";
    $("#f-rec").style.display = mode === "rec" ? "" : "none";
  };
  o.querySelectorAll("#emos button").forEach(b => b.onclick = () => { em = b.dataset.e; setEm(); });
  o.querySelectorAll(".seg button").forEach(b => b.onclick = () => { mode = b.dataset.m; setMode(); });
  o.querySelectorAll("#dchips .chip").forEach(b => b.onclick = () => b.classList.toggle("sel"));
  setEm(); setMode();
  $("#tn").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); $("#t-s").click(); } });
  $("#t-c").onclick = closeSheet;
  $("#t-s").onclick = () => {
    const name = $("#tn").value.trim(), time = $("#tt").value;
    if (!name){ $("#tn").focus(); return toast("Donne un nom à la tâche"); }
    if (mode === "once"){
      const d = $("#td").value || base;
      if (d < S.start) return toast("Date trop ancienne");
      ensureDay(d).items.push({ id:uid(), hid:null, name, em, time, done:false, x:true });
      if (view === "today") cur = d;
    } else {
      const ds = [...o.querySelectorAll("#dchips .chip.sel")].map(b => +b.dataset.d);
      if (!ds.length) return toast("Choisis au moins un jour");
      const data = { name, em, time, days:ds };
      if (editing) Object.assign(h, data); else S.habits.push({ id:uid(), ...data });
    }
    syncFuture(); save(); closeSheet(); render(true); toast(editing ? "Enregistré ✓" : "Ajouté ✓");
  };
  if (editing) $("#td-del").onclick = () => {
    if (!confirm("Supprimer cette habitude ? L'historique déjà coché est conservé.")) return;
    S.habits = S.habits.filter(x => x.id !== h.id);
    syncFuture(); save(); closeSheet(); render(true);
  };
  setTimeout(() => { if (!editing) try { $("#tn").focus(); } catch(e){} }, 250);
}
function copySheet(){
  const o = openSheet(`<h3>Copier ${DL[rDay].toLowerCase()} vers…</h3><p class="mute small">Ajoute toutes les habitudes de ${DL[rDay].toLowerCase()} aux jours choisis.</p>
    <div class="fld">${dayChips([])}</div><div class="acts"><button class="btn sec" id="cc">Annuler</button><button class="btn acc" id="cs">Copier</button></div>`);
  o.querySelectorAll("#dchips .chip").forEach(b => b.onclick = () => b.classList.toggle("sel"));
  $("#cc").onclick = closeSheet;
  $("#cs").onclick = () => {
    const tg = [...o.querySelectorAll("#dchips .chip.sel")].map(b => +b.dataset.d).filter(d => d !== rDay);
    S.habits.filter(h => h.days.includes(rDay)).forEach(h => tg.forEach(d => { if (!h.days.includes(d)) h.days.push(d); }));
    syncFuture(); save(); closeSheet(); render(true); toast("Routine copiée ✓");
  };
}

/* ============ events ============ */
root.addEventListener("click", e => {
  const nav = e.target.closest("[data-nav]"); if (nav){ view = nav.dataset.nav; selBar = null; render(); scrollTo(0,0); return; }
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act, t = todayStr();
  if (a === "toggle"){
    if (e.target.closest("[data-act=delx],[data-act=push]")) return;
    toggleItem(cur, el.dataset.id);
  } else if (a === "cell") toggleItem(el.dataset.d, el.dataset.id);
  else if (a === "delx"){ const d = S.days[cur]; d.items = d.items.filter(i => i.id !== el.dataset.id); save(); render(true); }
  else if (a === "push"){ const it = S.days[cur].items.find(i => i.id === el.dataset.id); S.days[cur].items = S.days[cur].items.filter(i => i !== it);
    ensureDay(addDays(cur,1)).items.push({ ...it, id:uid(), done:false }); save(); render(true); toast("Reportée à demain"); }
  else if (a === "day"){ const n = addDays(cur, +el.dataset.n); if (n >= S.start){ cur = n; render(); } }
  else if (a === "gototoday"){ cur = t; render(); }
  else if (a === "week"){ weekAnchor = addDays(weekAnchor, 7*el.dataset.n); render(); }
  else if (a === "gotoweek"){ weekAnchor = mondayOf(t); render(); }
  else if (a === "wmode"){ weekMode = el.dataset.m; render(true); }
  else if (a === "opendate"){ const d = el.dataset.d; if (d >= S.start){ cur = d; view = "today"; render(); scrollTo(0,0); } else toast("Avant le début du suivi"); }
  else if (a === "range"){ range = el.dataset.r; selBar = null; render(true); }
  else if (a === "bar"){ selBar = +el.dataset.i; render(true); }
  else if (a === "rday"){ rDay = +el.dataset.i; render(true); }
  else if (a === "new") taskSheet();
  else if (a === "addrec") taskSheet({ mode:"rec", day:rDay });
  else if (a === "edit") taskSheet({ habit: habitById(el.dataset.id) });
  else if (a === "copyday") copySheet();
  else if (a === "export"){
    const b = new Blob([JSON.stringify(S,null,1)], {type:"application/json"}), l = document.createElement("a");
    l.href = URL.createObjectURL(b); l.download = `routine-${t}.json`; l.click(); setTimeout(()=>URL.revokeObjectURL(l.href),1000);
  } else if (a === "import") $("#r-file").click();
  else if (a === "reset"){ if (confirm("Effacer TOUTES les données ? Cette action est irréversible.")){ localStorage.removeItem(KEY); S = load(); materialize(); save(); cur = t; render(); } }
});
root.addEventListener("change", e => {
  const s = e.target.dataset.set;
  if (s === "goal") S.goal = Math.min(100, Math.max(10, +e.target.value || 80));
  else if (s === "theme"){ S.theme = e.target.value; Hub.setTheme(S.theme); }
  else if (e.target.id === "r-file"){
    const f = e.target.files[0]; if (!f) return;
    f.text().then(txt => { try { const d = JSON.parse(txt); if (!d.habits || !d.days) throw 0;
      if (!confirm("Remplacer les données actuelles par ce fichier ?")) return; S = d; materialize(); save(); render(); toast("Import réussi ✓"); } catch(_){ toast("Fichier invalide"); } });
    return;
  } else return;
  save(); render(true);
});

/* ============ boot ============ */
materialize(); syncFuture(); save();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible"){ const t = todayStr(); if (!S.days[t]){ materialize(); syncFuture(); save(); cur = t; weekAnchor = mondayOf(t); if (Hub.current()==="routine") render(); } }
});

/* ============ intégration Élan ============ */
Hub.register("routine", { show(o = {}){
  const t = todayStr();
  if (!S.days[t]){ materialize(); syncFuture(); save(); cur = t; weekAnchor = mondayOf(t); }
  if (o.date && o.date >= S.start){ cur = o.date; view = "today"; }
  render();
  if (o.add) setTimeout(() => $("#r-fab").click(), 60);
}});
window.Routine = {
  getState: () => S,
  setState(d){
    S = Object.assign({ v:1, start:todayStr(), habits:[], days:{}, theme:"auto", goal:80 }, d);
    materialize(); syncFuture(); save(); cur = todayStr(); weekAnchor = mondayOf(cur); render(true);
  },
  todayStr, ensureDay, stat, agg, streaks, toggleItem, col,
  goal: () => S.goal, start: () => S.start, habitCount: () => S.habits.length,
  render: () => render(true),
  itemsOf: date => (S.days[date] ? S.days[date].items : [])
};
})();
