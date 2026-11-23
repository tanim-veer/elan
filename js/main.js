/* Élan — démarrage : succès (silencieux au 1er lancement), routeur, service worker. */
(()=>{
'use strict';
Gamify.check(true);
Gamify.updateChip();
document.getElementById('lvlchip').addEventListener('click',()=>Hub.go('home'));
Hub.show(Hub.viewFromHash()||'home');
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
