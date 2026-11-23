/* Élan — XP, niveaux, succès, citations et « insights ». Tout est calculé à partir de tes données. */
(()=>{
'use strict';
const {$,esc,todayStr,addDays,dowOf,DL}=Hub;

const TITLES=['Curieux','Débutant','Apprenti','Régulier','Motivé','Discipliné','Persévérant','Expert','Maître','Légende'];
const QUOTES=[
  'Petit à petit, la routine fait le travail.','Une case cochée vaut mieux qu\'un grand plan.','Ce que tu répètes devient ce que tu es.',
  'Commence là où tu es, avec ce que tu as.','La régularité bat l\'intensité.','Un objectif sans date n\'est qu\'un souhait.',
  'Fais aujourd\'hui ce que ton futur toi te remerciera d\'avoir fait.','Pas à pas, c\'est quand même avancer.','Ta seule concurrence : le toi d\'hier.',
  'Découpe en petites étapes, avance en grands pas.','L\'élan se crée en démarrant.','Les grandes choses naissent de petites habitudes.',
  'Chaque jour compte, même les jours calmes.','Prends soin de ta routine, elle prendra soin de tes objectifs.','Mieux vaut 10 minutes que zéro minute.',
  'Tu n\'as pas besoin d\'être parfait, juste présent.','Un jour manqué n\'est pas un échec : reprends demain.','Vise la progression, pas la perfection.',
  'Ce qui se mesure s\'améliore.','Concentre-toi sur le prochain pas.','Le meilleur moment pour commencer, c\'est maintenant.',
  'Fais-le d\'abord, peaufine-le ensuite.','La motivation te lance, l\'habitude te porte.','Célèbre les petites victoires.',
  'Un bon rythme vaut mieux qu\'un sprint.','Rends ton futur fier de ton présent.','Tout objectif commence par une première tâche.',
  'Ton énergie va où va ton attention.','Sème aujourd\'hui, récolte plus tard.','Aujourd\'hui est une page blanche.'
];
function quoteOfDay(){
  const d=new Date(),n=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
  return QUOTES[n%QUOTES.length];
}

/* ----- statistiques globales (source unique pour XP, succès, accueil) ----- */
function ctx(){
  const R=Routine.getState(),O=Objectifs.getState(),H=Hub.getStore();
  let routineDone=0,perfectDays=0;
  for(const d of Object.values(R.days)){
    const done=d.items.filter(i=>i.done).length;routineDone+=done;
    if(d.items.length>=3&&done===d.items.length)perfectDays++;
  }
  const sk=Routine.streaks();
  const nodes=Objectifs.allNodes();
  const leavesDone=nodes.filter(n=>!n.children.length&&n.done).length;
  const tops=O.categories.flatMap(c=>c.goals);
  const topDone=tops.filter(Objectifs.isDone).length;
  const logs=Object.values(H.focus.log||{});
  const focusSessions=logs.reduce((a,l)=>a+l.sessions,0),focusMin=logs.reduce((a,l)=>a+l.minutes,0);
  const moodDays=Object.keys(H.mood||{}).length;
  return {routineDone,perfectDays,bestStreak:sk.best,curStreak:sk.cur,leavesDone,topDone,topGoals:tops.length,cats:O.categories.length,focusSessions,focusMin,moodDays};
}

/* ----- XP & niveau ----- */
function xpInfo(c=ctx()){
  const xp=c.routineDone*10+c.leavesDone*30+c.topDone*40+c.focusMin+c.moodDays*5+c.perfectDays*20;
  const lvl=Math.floor(Math.sqrt(xp/60))+1;
  const lo=60*(lvl-1)**2,hi=60*lvl**2;
  return {xp,level:lvl,lo,hi,pct:Math.round(100*(xp-lo)/(hi-lo)),title:TITLES[Math.min(lvl-1,TITLES.length-1)]};
}

/* ----- succès ----- */
const BADGES=[
  {id:'first',e:'🌱',n:'Premier pas',d:'Coche ta première tâche',v:c=>c.routineDone,t:1},
  {id:'t10',e:'✅',n:'Sur la lancée',d:'10 tâches accomplies',v:c=>c.routineDone,t:10},
  {id:'t100',e:'💯',n:'Centurion',d:'100 tâches accomplies',v:c=>c.routineDone,t:100},
  {id:'t500',e:'🏅',n:'Machine',d:'500 tâches accomplies',v:c=>c.routineDone,t:500},
  {id:'s3',e:'🔥',n:'Étincelle',d:'3 jours d\'affilée au-dessus de ton objectif',v:c=>c.bestStreak,t:3},
  {id:'s7',e:'⚡',n:'Semaine de feu',d:'7 jours d\'affilée',v:c=>c.bestStreak,t:7},
  {id:'s30',e:'🌋',n:'Inarrêtable',d:'30 jours d\'affilée',v:c=>c.bestStreak,t:30},
  {id:'perfect',e:'🌟',n:'Journée parfaite',d:'Termine 100 % d\'une journée (3 tâches min.)',v:c=>c.perfectDays,t:1},
  {id:'g1',e:'🎯',n:'Cible atteinte',d:'Termine un objectif',v:c=>c.topDone,t:1},
  {id:'g5',e:'🏆',n:'Ambitieux',d:'Termine 5 objectifs',v:c=>c.topDone,t:5},
  {id:'plan',e:'🗂️',n:'Organisé',d:'Aie 3 catégories et 6 objectifs',v:c=>Math.min(c.cats/3,c.topGoals/6)*10,t:10},
  {id:'f1',e:'🍅',n:'Première session',d:'Termine une session Focus',v:c=>c.focusSessions,t:1},
  {id:'f10',e:'🧘',n:'Concentré',d:'10 sessions Focus',v:c=>c.focusSessions,t:10},
  {id:'f300',e:'⏳',n:'Marathonien',d:'5 heures de Focus au total',v:c=>c.focusMin,t:300},
  {id:'m7',e:'😊',n:'À l\'écoute',d:'Note ton humeur 7 jours',v:c=>c.moodDays,t:7}
];
function badgeStates(c=ctx()){
  const H=Hub.getStore();
  return BADGES.map(b=>({...b,got:!!H.badges[b.id]||b.v(c)>=b.t,cur:Math.min(b.t,Math.floor(b.v(c))),when:H.badges[b.id]}));
}
function check(silent){
  const H=Hub.getStore(),c=ctx(),fresh=[];
  for(const b of BADGES)if(!H.badges[b.id]&&b.v(c)>=b.t){H.badges[b.id]=Date.now();fresh.push(b)}
  if(!fresh.length&&H.badgesInit)return;
  const first=!H.badgesInit;H.badgesInit=true;Hub.saveStore();
  if(!silent&&!first&&fresh.length){
    Hub.toast(fresh.length===1?`${fresh[0].e} Succès débloqué : ${fresh[0].n}`:`🏅 ${fresh.length} succès débloqués !`);
    Hub.confetti(40,fresh.map(b=>b.e).concat(['✨','🎉']));
  }
}

/* ----- niveau dans la barre du haut ----- */
let lastLevel=null;
function updateChip(){
  const x=xpInfo();
  $('#lvlN').textContent='Niv. '+x.level;
  $('#lvlBar').style.width=x.pct+'%';
  $('#lvlchip').title=`${x.title} · ${x.xp} XP (prochain niveau à ${x.hi})`;
  if(lastLevel!==null&&x.level>lastLevel){Hub.toast(`⭐ Niveau ${x.level} atteint : ${x.title} !`);Hub.confetti(50)}
  lastLevel=x.level;
}

/* ----- insight : meilleur / pire jour de la semaine ----- */
function insight(){
  const t=todayStr(),sums=Array.from({length:7},()=>({d:0,t:0}));
  for(let i=0;i<56;i++){
    const d=addDays(t,-i);if(d<Routine.start()||d===t)continue;
    const s=Routine.stat(d);if(!s)continue;
    const k=dowOf(d);sums[k].d+=s.done;sums[k].t+=s.total;
  }
  const rows=sums.map((s,i)=>({i,n:s.t,p:s.t?Math.round(100*s.d/s.t):null})).filter(r=>r.p!==null&&r.n>=3);
  if(rows.length<3)return null;
  rows.sort((a,b)=>b.p-a.p);
  const best=rows[0],worst=rows[rows.length-1];
  if(best.p===worst.p)return null;
  return {best:{day:DL[best.i],p:best.p},worst:{day:DL[worst.i],p:worst.p}};
}

Hub.on('change',()=>{check();updateChip()});
window.Gamify={ctx,xpInfo,badgeStates,check,updateChip,quoteOfDay,insight};
})();
