/* Élan — noyau commun : thème, navigation, toasts, confettis, stockage partagé, sauvegarde complète. */
(()=>{
'use strict';
const KEY='elan.v1';
const ROUTINE_KEY='everyday-routine-v1';      // données de l'ancienne appli « Everyday »
const OBJ_KEY='objectifs.v1';                  // données de l'ancienne appli « Mes objectifs »

/* ---------- utilitaires partagés ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return fmt(d)};
const dowOf=s=>(parse(s).getDay()+6)%7;                 // 0 = lundi
const mondayOf=s=>addDays(s,-dowOf(s));
const todayStr=()=>fmt(new Date());
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DN=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const DL=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const MN=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const MF=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* ---------- événements ---------- */
const subs={};
const on=(e,f)=>{(subs[e]=subs[e]||[]).push(f)};
const emit=(e,d)=>(subs[e]||[]).forEach(f=>{try{f(d)}catch(err){console.error(err)}});
let chT;
const changed=()=>{clearTimeout(chT);chT=setTimeout(()=>emit('change'),40)};

/* ---------- stockage propre à Élan (humeur, focus, succès, thème) ---------- */
const defaults=()=>({theme:null,mood:{},badges:{},badgesInit:false,
  focus:{mode:'focus',dur:{focus:25,short:5,long:15},endAt:null,left:null,cycle:0,task:null,autoCheck:false,log:{}}});
function loadStore(){
  try{const s=JSON.parse(localStorage.getItem(KEY));
    if(s&&typeof s==='object'){const d=defaults();return Object.assign(d,s,{focus:Object.assign(d.focus,s.focus,{dur:Object.assign(d.focus.dur,(s.focus||{}).dur)})})}}catch(e){}
  return defaults();
}
let store=loadStore();
function saveStore(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}
const getStore=()=>store;
const setStore=s=>{store=Object.assign(defaults(),s);saveStore()};

/* ---------- thème (commun aux deux applis) ---------- */
function migrateTheme(){
  if(store.theme)return;
  let t='auto';
  try{const r=JSON.parse(localStorage.getItem(ROUTINE_KEY));if(r&&['light','dark'].includes(r.theme))t=r.theme}catch(e){}
  if(t==='auto')try{const o=JSON.parse(localStorage.getItem(OBJ_KEY));if(o&&o.prefs&&['light','dark'].includes(o.prefs.theme))t=o.prefs.theme}catch(e){}
  store.theme=t;
}
migrateTheme();
const mq=matchMedia('(prefers-color-scheme:dark)');
const themePref=()=>store.theme||'auto';
const themeNow=()=>themePref()==='auto'?(mq.matches?'dark':'light'):themePref();
const ICO_SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>';
const ICO_MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
function applyTheme(){
  const t=themeNow();
  document.documentElement.dataset.theme=t;
  const m=$('meta[name=theme-color]');if(m)m.content=t==='dark'?'#131211':'#f5f1e8';
  const b=$('#themeBtn');if(b){b.innerHTML=t==='dark'?ICO_SUN:ICO_MOON;b.title=t==='dark'?'Passer en clair':'Passer en sombre'}
  emit('theme',t);
}
function setTheme(p){store.theme=p;saveStore();applyTheme()}
const toggleTheme=()=>setTheme(themeNow()==='dark'?'light':'dark');
mq.addEventListener?.('change',()=>{if(themePref()==='auto')applyTheme()});

/* ---------- toast (avec « Annuler » facultatif) ---------- */
let toastT;
function toast(msg,undo){
  const el=$('#hub-toast');if(!el)return;
  el.innerHTML=`<span>${esc(msg)}</span>${undo?'<button type="button">Annuler</button>':''}`;
  el.classList.add('on');
  if(undo)el.querySelector('button').onclick=()=>{undo();el.classList.remove('on')};
  clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),undo?6000:2400);
}

/* ---------- confettis ---------- */
function confetti(n=36,set=['🎉','✨','⭐','🎊','🔥','💛','💜','🩷']){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  for(let i=0;i<n;i++){
    const e=document.createElement('span');e.className='hub-cf';e.textContent=set[i%set.length];
    e.style.left=Math.random()*100+'vw';e.style.animationDelay=Math.random()*.5+'s';e.style.fontSize=(1+Math.random()*.9)+'rem';
    document.body.appendChild(e);setTimeout(()=>e.remove(),2800);
  }
}

/* ---------- titre de l'onglet ---------- */
const tt={alerts:0,timer:''};
function setTitle(o){Object.assign(tt,o);document.title=(tt.timer?tt.timer+' · ':'')+(tt.alerts?`(${tt.alerts}) `:'')+'Élan'}

/* ---------- anneau de progression SVG ---------- */
function ring({pct=0,size=120,stroke=12,c1='#ff5a36',c2='#ec4899',id='rg',track='var(--s-pip)'}){
  const r=(size-stroke)/2,C=2*Math.PI*r,off=C*(1-Math.max(0,Math.min(100,pct))/100),h=size/2;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle class="ring-arc" cx="${h}" cy="${h}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" style="--c:${C}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}

/* ---------- navigation entre les vues ---------- */
const VIEWS=[
  {id:'home',label:'Accueil',color:'#7c5cff',icon:'<path d="M3.5 11.2 12 4l8.5 7.2V19a1.5 1.5 0 0 1-1.5 1.5h-4v-5.5h-6v5.5H5A1.5 1.5 0 0 1 3.5 19z"/>'},
  {id:'routine',label:'Routine',color:'#ff5a36',icon:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 12.5l3 3 5-6"/>'},
  {id:'objectifs',label:'Objectifs',color:'#4f6bff',icon:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>'},
  {id:'calendar',label:'Calendrier',color:'#10b981',icon:'<rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'},
  {id:'focus',label:'Focus',color:'#f43f8e',icon:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.6 1.6M9.5 2.8h5"/>'}
];
const handlers={};
let current=null;
const register=(name,h)=>{handlers[name]=h};
function buildDock(){
  $('#dock').innerHTML=VIEWS.map(v=>`<button type="button" data-go="${v.id}" style="--va:${v.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${v.icon}</svg><span>${v.label}</span></button>`).join('');
}
function viewFromHash(){const m=/^#\/(\w+)/.exec(location.hash);return m&&VIEWS.some(v=>v.id===m[1])?m[1]:null}
function show(name,opts={}){
  if(!VIEWS.some(v=>v.id===name))name='home';
  const prev=current;current=name;
  $$('.view').forEach(s=>{s.hidden=s.dataset.view!==name});
  $$('#dock button').forEach(b=>b.classList.toggle('on',b.dataset.go===name));
  document.body.dataset.view=name;
  const v=VIEWS.find(x=>x.id===name);document.documentElement.style.setProperty('--va',v.color);
  if(prev&&handlers[prev]&&handlers[prev].hide)handlers[prev].hide();
  if(handlers[name]&&handlers[name].show)handlers[name].show(opts);
  if(prev!==name&&!opts.keepScroll)window.scrollTo(0,0);
  store.lastView=name;saveStore();
  emit('view',name);
}
const go=(name,opts)=>{
  if(location.hash==='#/'+name){show(name,opts);return}
  Hub._pending=opts;location.hash='#/'+name;
};
addEventListener('hashchange',()=>{const o=Hub._pending;Hub._pending=null;show(viewFromHash()||'home',o||{})});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');
  if(b){e.preventDefault();go(b.dataset.go)}
});

const keepScroll=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};

/* ---------- sauvegarde complète (routine + objectifs + Élan) ---------- */
function exportAll(){
  const data={elan:1,date:new Date().toISOString(),routine:Routine.getState(),objectifs:Objectifs.getState(),hub:store};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
  a.download=`elan-sauvegarde-${todayStr()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast('Sauvegarde complète exportée ✓');
}
function importAll(file){
  file.text().then(txt=>{
    const d=JSON.parse(txt);
    const isRoutine=x=>x&&x.habits&&x.days, isObj=x=>x&&Array.isArray(x.categories);
    let what=[];
    if(d.elan&&(isRoutine(d.routine)||isObj(d.objectifs)||d.hub)){
      if(isRoutine(d.routine))what.push('la routine');
      if(isObj(d.objectifs))what.push('les objectifs');
      if(d.hub)what.push('les données Élan');
    }else if(isRoutine(d))what.push('la routine');
    else if(isObj(d))what.push('les objectifs');
    else throw 0;
    if(!confirm('Remplacer '+what.join(', ')+' par le contenu de ce fichier ?'))return;
    if(d.elan){
      if(isRoutine(d.routine))Routine.setState(d.routine);
      if(isObj(d.objectifs))Objectifs.setState(d.objectifs);
      if(d.hub){const t=store.theme;setStore(d.hub);store.theme=d.hub.theme||t;saveStore()}
    }else if(isRoutine(d))Routine.setState(d);
    else Objectifs.setState(d);
    applyTheme();changed();show(current||'home',{keepScroll:true});toast('Import réussi ✓');
  }).catch(()=>toast('Fichier invalide'));
}
$('#hub-file').addEventListener('change',e=>{const f=e.target.files[0];if(f)importAll(f);e.target.value=''});

/* ---------- init (le routeur démarre dans main.js) ---------- */
buildDock();
applyTheme();
$('#themeBtn').addEventListener('click',toggleTheme);

const Hub={$,$$,pad,fmt,parse,addDays,dowOf,mondayOf,todayStr,esc,DN,DL,MN,MF,
  on,emit,changed,getStore,saveStore,setStore,
  theme:themePref,themeNow,setTheme,toggleTheme,
  toast,confetti,setTitle,ring,
  VIEWS,register,show,go,current:()=>current,viewFromHash,keepScroll,exportAll,
  importAll:()=>$('#hub-file').click(),_pending:null};
window.Hub=Hub;
})();
