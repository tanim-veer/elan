/* Objectifs — ancienne appli « Mes objectifs », intégrée telle quelle (fonctionnalités inchangées). */
(()=>{
'use strict';
const KEY='objectifs.v1';
const $=s=>document.querySelector(s);
const root=document.getElementById('view-objectifs');
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PR={h:{label:'Haute',rank:0},m:{label:'Moyenne',rank:1},l:{label:'Basse',rank:2}};
const COLORS=['#6366f1','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#8b5cf6','#84cc16'];
const ICO_PLUS='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',ICO_EDIT='<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/></svg>',ICO_DOWN='<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',ICO_UP='<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const DAY=864e5,HOUR=36e5,MIN=6e4;
const MAXDEPTH=3;

/* ---------- state ---------- */
const now=()=>Date.now();
function seed(){
  const t=now();
  const mk=(title,priority,days,children=[],extra={})=>({id:uid(),title,notes:'',priority,deadline:days==null?null:t+days*DAY,done:false,open:true,children,...extra});
  return {
    categories:[
      {id:uid(),name:'Santé & Sport',emoji:'💪',color:'#10b981',collapsed:false,goals:[
        mk('Courir un 10 km','h',26,[mk('Courir 3×/semaine','m',7),mk('Atteindre 5 km sans pause','m',14),mk("S'inscrire à une course",'l',10)]),
        mk('Dormir 8h par nuit','m',60)]},
      {id:uid(),name:'Carrière',emoji:'🚀',color:'#6366f1',collapsed:false,goals:[
        mk('Finir le projet principal','h',2,[mk('Rédiger la documentation','m',1),mk('Tests finaux','h',2)]),
        mk('Apprendre une nouvelle techno','m',90)]},
      {id:uid(),name:'Perso',emoji:'✨',color:'#ec4899',collapsed:false,goals:[
        mk('Lire 12 livres cette année','l',200,[mk('Livre n°1','l',20)])]}
    ],
    prefs:{filter:'all',hideDone:false,sort:'prio',theme:null},
    notified:{}
  };
}
let S=load();
function load(){
  try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&Array.isArray(d.categories)){d.prefs=Object.assign({filter:'all',hideDone:false,sort:'prio',theme:null},d.prefs);d.notified=d.notified||{};return d}}catch(e){}
  return seed();
}
let saveT;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Stockage plein ou bloqué')}Hub.changed()},50)}
window.addEventListener('pagehide',()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}});

/* ---------- tree helpers ---------- */
function find(id){
  for(const c of S.categories){
    const r=walk(c.goals,id,null,c);
    if(r)return r;
  }
  return null;
}
function walk(list,id,parent,cat,depth=0){
  for(const n of list){
    if(n.id===id)return{node:n,parent,list,cat,depth};
    const r=walk(n.children,id,n,cat,depth+1);
    if(r)return r;
  }
  return null;
}
const isDone=n=>n.children.length?n.children.every(isDone):!!n.done;
function leaves(n,out=[]){n.children.length?n.children.forEach(k=>leaves(k,out)):out.push(n);return out}
function progress(n){const l=leaves(n);return[l.filter(x=>x.done).length,l.length]}
function setAll(n,v){n.done=v;n.children.forEach(k=>setAll(k,v))}
function flat(list,out=[]){list.forEach(n=>{out.push(n);flat(n.children,out)});return out}
const allNodes=()=>S.categories.flatMap(c=>flat(c.goals));

/* ---------- time ---------- */
function level(ms){
  if(ms<0)return'over';
  if(ms<48*HOUR)return'crit';
  if(ms<7*DAY)return'warn';
  if(ms<30*DAY)return'mid';
  return'ok';
}
function fmtCd(ms){
  const over=ms<0,a=Math.abs(ms);
  const d=Math.floor(a/DAY),h=Math.floor(a%DAY/HOUR),m=Math.floor(a%HOUR/MIN),s=Math.floor(a%MIN/1000);
  let t;
  if(d>=7)t=`${Math.floor(d/7)} sem : ${d%7} j`;
  else if(d>=1)t=`${d} j : ${h} h`;
  else if(h>=1)t=`${h} h : ${String(m).padStart(2,'0')} min`;
  else t=`${m} min : ${String(s).padStart(2,'0')} s`;
  return over?`En retard · ${t}`:t;
}
const dfmt=ts=>new Date(ts).toLocaleString('fr-FR',{day:'numeric',month:'short',year:new Date(ts).getFullYear()!==new Date().getFullYear()?'numeric':undefined,hour:'2-digit',minute:'2-digit'}).replace(',','');
const toLocalInput=ts=>{const d=new Date(ts-new Date(ts).getTimezoneOffset()*MIN);return d.toISOString().slice(0,16)};

/* ---------- sorting / filtering ---------- */
function sortNodes(list){
  const sort=S.prefs.sort;
  return [...list].sort((a,b)=>{
    const da=isDone(a),db=isDone(b);
    if(da!==db)return da?1:-1;
    const pa=PR[a.priority].rank,pb=PR[b.priority].rank;
    const ta=a.deadline??Infinity,tb=b.deadline??Infinity;
    if(sort==='date')return ta-tb||pa-pb;
    return pa-pb||ta-tb;
  });
}
function hasUrgent(n){
  if(isDone(n))return false;
  if(n.deadline&&!n.done&&['over','crit'].includes(level(n.deadline-now())))return true;
  return n.children.some(hasUrgent);
}
function textMatch(n,q){return n.title.toLowerCase().includes(q)||(n.notes||'').toLowerCase().includes(q)||n.children.some(k=>textMatch(k,q))}
function visible(n){
  const f=S.prefs.filter,q=($('#o-q').value||'').trim().toLowerCase();
  if(S.prefs.hideDone&&isDone(n))return false;
  if(['h','m','l'].includes(f)&&n.priority!==f)return false;
  if(f==='urgent'&&!hasUrgent(n))return false;
  if(q&&!textMatch(n,q))return false;
  return true;
}

/* ---------- render ---------- */
function cdChip(n){
  if(isDone(n))return'<span class="cd done">Terminé</span>';
  if(!n.deadline)return'';
  return`<span class="cd" data-dl="${n.deadline}"></span><span class="dt">${dfmt(n.deadline)}</span>`;
}
function nodeHTML(n,depth){
  const done=isDone(n),kids=n.children,open=n.open!==false;
  const[dn,tot]=progress(n);
  const lv=!done&&n.deadline?level(n.deadline-now()):'';
  return`<div class="node d${depth} pr-${n.priority} ${done?'done':''} ${lv?'lv-'+lv:''}" id="n-${n.id}" data-id="${n.id}">
    <div class="row">
      <button class="chk" data-a="toggle" aria-label="Terminer">${done?CHECK:''}</button>
      <div class="main" data-a="${kids.length?'fold':'edit'}">
        <div class="ttl">${esc(n.title)}</div>
        <div class="meta"><span class="badge">${PR[n.priority].label}</span>${cdChip(n)}${kids.length?`<span class="cnt">${dn}/${tot}</span>`:''}</div>
        ${n.notes?`<div class="notes">${esc(n.notes)}</div>`:''}
        ${kids.length?`<div class="bar"><i style="width:${tot?dn/tot*100:0}%"></i></div>`:''}
      </div>
      <div class="acts">
        ${kids.length?`<button data-a="fold" aria-label="Plier">${open?ICO_UP:ICO_DOWN}</button>`:''}
        ${depth<MAXDEPTH?`<button data-a="addsub" aria-label="Sous-objectif" title="Ajouter un sous-objectif">${ICO_PLUS}</button>`:''}
        <button data-a="edit" aria-label="Modifier">${ICO_EDIT}</button>
      </div>
    </div>
    ${kids.length&&open?`<div class="kids">${sortNodes(kids).map(k=>nodeHTML(k,depth+1)).join('')}</div>`:''}
  </div>`;
}
function render(){
  const app=$('#o-app');
  const scrollY=window.scrollY;
  app.innerHTML=S.categories.length?S.categories.map(c=>{
    const vis=sortNodes(c.goals).filter(visible);
    const ls=c.goals.flatMap(g=>leaves(g)),dn=ls.filter(l=>l.done).length;
    return`<section class="cat" style="--cc:${c.color}" data-cat="${c.id}">
      <div class="cat-h">
        <button class="cat-t" data-a="cattoggle">${c.emoji?`<span class="cat-em">${esc(c.emoji)}</span>`:'<span class="dot"></span>'}<b>${esc(c.name)}</b><small>${dn}/${ls.length} · ${c.collapsed?'déplier':'plier'}</small></button>
        <button class="small-btn" data-a="catedit">Modifier</button>
      </div>
      <div class="mini"><i style="width:${ls.length?dn/ls.length*100:0}%"></i></div>
      ${c.collapsed?'':`<div class="cat-b">${vis.length?vis.map(g=>nodeHTML(g,0)).join(''):`<div class="empty">${c.goals.length?'Aucun objectif ne correspond aux filtres.':'Rien ici pour l\'instant.'}</div>`}</div>
      <button class="addgoal" data-a="addgoal">+ Ajouter un objectif</button>`}
    </section>`;
  }).join('')+'<button class="newcat" data-a="addcat">+ Nouvelle catégorie</button>':`<div class="hello"><p>Commence par créer une catégorie.</p></div><button class="newcat" data-a="addcat">+ Nouvelle catégorie</button>`;
  window.scrollTo(0,scrollY);
  tick();
  header();
}
function header(){
  const ls=S.categories.flatMap(c=>c.goals.flatMap(g=>leaves(g)));
  const dn=ls.filter(l=>l.done).length,p=ls.length?Math.round(dn/ls.length*100):0;
  $('#o-pbar').style.width=p+'%';
  const goals=S.categories.reduce((a,c)=>a+c.goals.length,0);
  const done=S.categories.reduce((a,c)=>a+c.goals.filter(isDone).length,0);
  $('#o-sub').textContent=`${p} % accompli · ${done} objectif${done>1?'s':''} sur ${goals}`;
  root.querySelectorAll('[data-f]').forEach(b=>b.classList.toggle('on',b.dataset.f===S.prefs.filter));
  $('#o-hidedone').classList.toggle('on',S.prefs.hideDone);
  $('#o-sort').value=S.prefs.sort;
  applyTheme();
}
function alertBanner(){
  const t=now();
  const urgent=allNodes().filter(n=>!isDone(n)&&!n.children.length&&n.deadline&&level(n.deadline-t)!=='ok'&&['over','crit'].includes(level(n.deadline-t)))
    .sort((a,b)=>a.deadline-b.deadline);
  const box=$('#o-alert');
  const over=urgent.filter(n=>n.deadline<t).length;
  // parents with own deadline too
  const parents=allNodes().filter(n=>n.children.length&&!isDone(n)&&n.deadline&&['over','crit'].includes(level(n.deadline-t)));
  const list=[...urgent,...parents].sort((a,b)=>a.deadline-b.deadline);
  Hub.setTitle({alerts:list.length});
  if(!list.length){box.innerHTML='';return}
  const html=`<div class="alert" role="alert"><h3>${list.length} objectif${list.length>1?'s':''} à traiter en urgence${over?` · ${list.filter(n=>n.deadline<t).length} en retard`:''}</h3><ul>${list.slice(0,4).map(n=>`<li data-goto="${n.id}"><span>${esc(n.title)}</span><span data-dl="${n.deadline}"></span></li>`).join('')}</ul>${list.length>4?`<div style="margin-top:6px;font-size:12px;opacity:.9">+ ${list.length-4} autre(s) — filtre « Urgents »</div>`:''}</div>`;
  if(box.dataset.h!==html){box.innerHTML=html;box.dataset.h=html}
}
function tick(){
  const t=now();
  document.querySelectorAll('[data-dl]').forEach(el=>{
    const ms=+el.dataset.dl-t,txt=fmtCd(ms);
    if(el.textContent!==txt)el.textContent=txt;
    if(el.classList.contains('cd')){
      const c='cd lv-'+level(ms);
      if(el.className!==c)el.className=c;
    }
  });
  alertBanner();
  document.querySelectorAll('[data-dl]').forEach(el=>{ // banner freshly added
    if(!el.textContent){el.textContent=fmtCd(+el.dataset.dl-t)}
  });
}

/* ---------- toast ---------- */
function toast(msg,undo){Hub.toast(msg,undo)}
function snapshot(){return JSON.stringify(S)}
function restore(s){S=JSON.parse(s);save();render()}

/* ---------- goal dialog ---------- */
function openGoal({id,parentId,catId}={}){
  const f=$('#o-fGoal');
  let n=null,parent=null,cat=null;
  if(id){const r=find(id);n=r.node;parent=r.parent;cat=r.cat}
  else if(parentId){const r=find(parentId);parent=r.node;cat=r.cat}
  else cat=S.categories.find(c=>c.id===catId)||S.categories[0];
  if(!cat){toast('Crée d\'abord une catégorie');return openCat()}
  const pr=n?n.priority:(parent?parent.priority:'m');
  const dl=n?n.deadline:null;
  f.innerHTML=`
    <h2>${n?'Modifier':parent?'Nouveau sous-objectif':'Nouvel objectif'}${parent?`<div style="font-size:12.5px;color:var(--mut);font-weight:500;margin-top:3px">dans « ${esc(parent.title)} »</div>`:''}</h2>
    <label>Titre<input type="text" name="title" required maxlength="140" value="${esc(n?.title||'')}" placeholder="Ex : Courir un semi-marathon" autocomplete="off"></label>
    ${parent?'':`<label>Catégorie<select name="cat">${S.categories.map(c=>`<option value="${c.id}" ${c.id===cat.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`}
    <div><div style="font-size:12px;color:var(--mut);font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Priorité</div>
      <div class="seg">${['h','m','l'].map(k=>`<label class="${k}"><input type="radio" name="prio" value="${k}" ${pr===k?'checked':''}><span>${PR[k].label}</span></label>`).join('')}</div></div>
    <label>Échéance (optionnel)<input type="datetime-local" name="dl" value="${dl?toLocalInput(dl):''}"></label>
    <div class="quick">${[['+3 j',3],['+1 sem',7],['+2 sem',14],['+1 mois',30],['+3 mois',91],['+1 an',365]].map(([l,d])=>`<button type="button" data-add="${d}">${l}</button>`).join('')}<button type="button" data-add="0">Aucune</button></div>
    <label>Notes<textarea name="notes" placeholder="Détails, motivation, étapes…">${esc(n?.notes||'')}</textarea></label>
    <div class="btns">${n?'<button type="button" class="dng" data-del>Supprimer</button>':''}<button type="button" data-close>Annuler</button><button class="pri" value="ok">${n?'Enregistrer':'Ajouter'}</button></div>`;
  f.dataset.ctx=JSON.stringify({id,parentId});
  f.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
    const d=+b.dataset.add,inp=f.elements.dl;
    if(!d){inp.value='';return}
    const t=new Date(now()+d*DAY);t.setHours(18,0,0,0);inp.value=toLocalInput(t.getTime());
  });
  f.querySelector('[data-close]').onclick=()=>$('#o-dGoal').close();
  const del=f.querySelector('[data-del]');
  if(del)del.onclick=()=>{
    const cnt=flat(n.children).length;
    if(!confirm(`Supprimer « ${n.title} »${cnt?` et ses ${cnt} sous-objectif(s)`:''} ?`))return;
    const snap=snapshot();
    const r=find(n.id);r.list.splice(r.list.indexOf(n),1);
    save();$('#o-dGoal').close();render();toast('Objectif supprimé',()=>restore(snap));
  };
  $('#o-dGoal').showModal();
  if(!n)setTimeout(()=>f.elements.title.focus(),50);
}
$('#o-fGoal').addEventListener('submit',e=>{
  e.preventDefault();
  if(e.submitter&&e.submitter.value!=='ok')return;
  const f=e.target,ctx=JSON.parse(f.dataset.ctx||'{}');
  const title=f.elements.title.value.trim();if(!title)return;
  const dlv=f.elements.dl.value,deadline=dlv?new Date(dlv).getTime():null;
  const data={title,priority:f.elements.prio.value,deadline,notes:f.elements.notes.value.trim()};
  if(ctx.id){
    const r=find(ctx.id);Object.assign(r.node,data);
    if(f.elements.cat&&!r.parent&&f.elements.cat.value!==r.cat.id){
      r.list.splice(r.list.indexOf(r.node),1);
      S.categories.find(c=>c.id===f.elements.cat.value).goals.push(r.node);
    }
  }else if(ctx.parentId){
    const r=find(ctx.parentId);
    const n={id:uid(),done:false,open:true,children:[],...data};
    if(!r.node.children.length&&r.node.done){r.node.done=false}
    r.node.children.push(n);r.node.open=true;
  }else{
    const cat=S.categories.find(c=>c.id===f.elements.cat.value);
    cat.goals.push({id:uid(),done:false,open:true,children:[],...data});cat.collapsed=false;
  }
  save();$('#o-dGoal').close();render();toast('Enregistré');
});

/* ---------- category dialog ---------- */
function openCat(id){
  const c=id?S.categories.find(x=>x.id===id):null;
  const f=$('#o-fCat');
  const col=c?.color||COLORS[S.categories.length%COLORS.length];
  f.innerHTML=`
    <h2>${c?'Modifier la catégorie':'Nouvelle catégorie'}</h2>
    <label>Nom<input type="text" name="name" required maxlength="40" value="${esc(c?.name||'')}" placeholder="Ex : Finances"></label>
    <div><div style="font-size:12px;color:var(--mut);font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Icône</div>
      <input type="hidden" name="emoji" value="${esc(c?.emoji||'')}">
      <div class="quick emo-pick">${['🎯','💪','🚀','✨','📚','💰','🏠','🎨','✈️','🧠','❤️','🌱','🎓','💻','🎸','🍎'].map(e=>`<button type="button" data-emo="${e}" class="${c?.emoji===e?'sel':''}">${e}</button>`).join('')}<button type="button" data-emo="" class="${c?.emoji?'':'sel'}">Aucune</button></div></div>
    <div><div style="font-size:12px;color:var(--mut);font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Couleur</div><div class="swatches">${COLORS.map(k=>`<label><input type="radio" name="color" value="${k}" ${k===col?'checked':''}><span style="--sw:${k}"></span></label>`).join('')}</div></div>
    <div class="btns">${c?'<button type="button" class="dng" data-del>Supprimer</button>':''}<button type="button" data-close>Annuler</button><button class="pri" value="ok">${c?'Enregistrer':'Créer'}</button></div>`;
  f.dataset.id=id||'';
  f.querySelectorAll('[data-emo]').forEach(b=>b.onclick=()=>{f.elements.emoji.value=b.dataset.emo;f.querySelectorAll('[data-emo]').forEach(x=>x.classList.toggle('sel',x===b))});
  f.querySelector('[data-close]').onclick=()=>$('#o-dCat').close();
  const del=f.querySelector('[data-del]');
  if(del)del.onclick=()=>{
    const cnt=c.goals.length;
    if(!confirm(`Supprimer la catégorie « ${c.name} »${cnt?` et ses ${cnt} objectif(s)`:''} ?`))return;
    const snap=snapshot();S.categories=S.categories.filter(x=>x!==c);save();$('#o-dCat').close();render();toast('Catégorie supprimée',()=>restore(snap));
  };
  $('#o-dCat').showModal();
  if(!c)setTimeout(()=>f.elements.name.focus(),50);
}
$('#o-fCat').addEventListener('submit',e=>{
  e.preventDefault();
  if(e.submitter&&e.submitter.value!=='ok')return;
  const f=e.target,name=f.elements.name.value.trim();if(!name)return;
  const data={name,color:f.elements.color.value,emoji:f.elements.emoji.value};
  if(f.dataset.id)Object.assign(S.categories.find(c=>c.id===f.dataset.id),data);
  else S.categories.push({id:uid(),collapsed:false,goals:[],...data});
  save();$('#o-dCat').close();render();
});

/* ---------- settings ---------- */
function openSettings(){
  const perm='Notification' in window?Notification.permission:'unsupported';
  $('#o-setBox').innerHTML=`
    <h2>Réglages</h2>
    <div class="setrow">
      <button data-a="notif">Notifications d'échéance<small>${perm==='granted'?'Activées (l\'app doit être ouverte ou installée)':perm==='denied'?'Bloquées dans le navigateur':perm==='unsupported'?'Non supportées ici':'Toucher pour activer (alertes à J-3, J-1 et en cas de retard)'}</small></button>
      <button data-a="export">Exporter mes données<small>Sauvegarde un fichier JSON (à faire de temps en temps)</small></button>
      <button data-a="import">Importer une sauvegarde<small>Remplace les données actuelles</small></button>
      <button data-a="collapseall">Tout plier / déplier</button>
      <button data-a="reset" style="color:var(--crit)">Tout effacer<small>Repart de zéro</small></button>
    </div>
    <p style="margin:0;color:var(--mut);font-size:13px">Les données sont enregistrées sur cet appareil (dans le navigateur). Exporte-les pour les transférer sur un autre appareil. Sur mobile : menu du navigateur → « Ajouter à l'écran d'accueil » pour l'installer comme une appli.</p>
    <div class="btns"><button type="button" data-a="closeset">Fermer</button></div>`;
  $('#o-dSet').showModal();
}
async function notify(title,body,tag){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
    const reg=await navigator.serviceWorker?.getRegistration();
    if(reg)reg.showNotification(title,{body,tag,icon:'icon-192.png',badge:'icon-192.png',vibrate:[200,100,200]});
    else new Notification(title,{body,tag,icon:'icon-192.png'});
  }catch(e){}
}
function checkNotifs(){
  const t=now();let changed=false;
  allNodes().forEach(n=>{
    if(isDone(n)||!n.deadline)return;
    const ms=n.deadline-t;
    const lvl=ms<0?'over':ms<DAY?'d1':ms<3*DAY?'d3':null;
    if(!lvl)return;
    const k=n.id+':'+lvl;
    if(S.notified[k])return;
    S.notified[k]=1;changed=true;
    notify(lvl==='over'?'Objectif en retard':'Échéance proche',`${n.title} — ${fmtCd(ms)}`,k);
  });
  if(changed)save();
}
function applyTheme(){$('#o-themebtn').textContent=Hub.themeNow()==='dark'?'Clair':'Sombre'}

/* ---------- aller à un objectif (bandeau urgent, accueil, calendrier) ---------- */
function focusGoal(id){
  const r=find(id);if(r){
    let p=r.parent;while(p){p.open=true;p=find(p.id).parent}
    r.cat.collapsed=false;S.prefs.filter='all';$('#o-q').value='';save();render();
  }
  const el=document.getElementById('n-'+id);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.animate([{transform:'scale(1.03)'},{transform:'scale(1)'}],{duration:400})}
}
/* ---------- cocher / décocher un objectif ---------- */
function doToggle(id){
  const r=find(id);if(!r)return;
  const n=r.node,v=!isDone(n);
  setAll(n,v);
  if(v&&navigator.vibrate)navigator.vibrate(30);
  save();render();
  if(v){
    const top=r.cat.goals.filter(g=>isDone(g)).length===r.cat.goals.length;
    toast(top?`Catégorie « ${r.cat.name} » terminée.`:'Bien joué.');
    if(top)Hub.confetti(60);else if(!r.parent)Hub.confetti(28);
  }
}

/* ---------- events ---------- */
root.addEventListener('click',e=>{
  const g=e.target.closest('[data-goto]');
  if(g){focusGoal(g.dataset.goto);return}
  const f=e.target.closest('[data-f]');
  if(f){S.prefs.filter=f.dataset.f;save();render();return}
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,nodeEl=b.closest('.node'),catEl=b.closest('.cat');
  const id=nodeEl?.dataset.id;
  switch(a){
    case'toggle':doToggle(id);break;
    case'fold':{const n=find(id).node;n.open=n.open===false;save();render();break}
    case'edit':openGoal({id});break;
    case'addsub':openGoal({parentId:id});break;
    case'addgoal':openGoal({catId:catEl?.dataset.cat});break;
    case'addcat':openCat();break;
    case'catedit':openCat(catEl.dataset.cat);break;
    case'cattoggle':{const c=S.categories.find(x=>x.id===catEl.dataset.cat);c.collapsed=!c.collapsed;save();render();break}
    case'hidedone':S.prefs.hideDone=!S.prefs.hideDone;save();render();break;
    case'theme':Hub.toggleTheme();break;
    case'settings':openSettings();break;
    case'closeset':$('#o-dSet').close();break;
    case'notif':
      if(!('Notification' in window))return toast('Non supporté sur ce navigateur');
      Notification.requestPermission().then(p=>{toast(p==='granted'?'Notifications activées':'Notifications refusées');openSettings();if(p==='granted')checkNotifs()});break;
    case'export':{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));
      a.download=`objectifs-${new Date().toISOString().slice(0,10)}.json`;a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),2000);break}
    case'import':$('#o-file').click();break;
    case'collapseall':{const any=S.categories.some(c=>!c.collapsed);S.categories.forEach(c=>c.collapsed=any);save();render();$('#o-dSet').close();break}
    case'reset':
      if(confirm('Tout effacer définitivement ?')){const snap=snapshot();S={categories:[],prefs:S.prefs,notified:{}};save();render();$('#o-dSet').close();toast('Données effacées',()=>restore(snap))}break;
  }
});
$('#o-file').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  file.text().then(t=>{
    const d=JSON.parse(t);
    if(!Array.isArray(d.categories))throw 0;
    d.prefs=Object.assign({filter:'all',hideDone:false,sort:'prio',theme:null},d.prefs);d.notified=d.notified||{};
    const snap=snapshot();S=d;save();render();$('#o-dSet').close();toast('Données importées',()=>restore(snap));
  }).catch(()=>toast('Fichier invalide'));
  e.target.value='';
});
$('#o-q').addEventListener('input',()=>render());
$('#o-sort').addEventListener('change',e=>{S.prefs.sort=e.target.value;save();render()});
root.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));

/* ---------- boot ---------- */
render();
setInterval(tick,1000);
setInterval(()=>{if(Hub.current()==='objectifs')render();checkNotifs()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(Hub.current()==='objectifs')render();checkNotifs()}});
setTimeout(checkNotifs,1500);

/* ---------- intégration Élan ---------- */
Hub.on('theme',applyTheme);
Hub.register('objectifs',{show(o={}){render();if(o.add)setTimeout(()=>openGoal({}),60);if(o.goto)setTimeout(()=>focusGoal(o.goto),60);else if(o.filter){S.prefs.filter=o.filter;save();render()}}});
window.Objectifs={
  getState:()=>S,
  setState(d){
    d.prefs=Object.assign({filter:'all',hideDone:false,sort:'prio',theme:null},d.prefs);d.notified=d.notified||{};
    S=d;save();render();
  },
  allNodes,isDone,leaves,progress,level,fmtCd,PR,flat,
  goto:focusGoal,toggle:doToggle,
  render:()=>render()
};

})();
