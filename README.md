# ✨ Élan — routine & objectifs, au même endroit

Fusion de deux applis : **Everyday** (suivi de routine, [`suivi-habitudes`](https://github.com/tanim-veer/suivi-habitudes))
et **Mes objectifs** ([`suivi-objectifs`](https://github.com/tanim-veer/suivi-objectifs)), plus de nouvelles vues.
Application web installable (PWA), hors ligne, sans compte ni serveur.

## Ce qui est repris tel quel

**Routine** (onglet *Routine*) — vue du jour, planning et progression de la semaine, statistiques (calendrier
des 16 semaines, taux par habitude, séries), habitudes récurrentes par jour de la semaine, tâches ponctuelles,
report à demain, objectif quotidien, export / import.

**Objectifs** (onglet *Objectifs*) — catégories, priorités, sous-objectifs (jusqu'à 3 niveaux), compte à rebours,
bandeau « urgents », filtres, recherche, tri, notifications d'échéance, annulation après suppression, export / import.

## Ce qui est nouveau

| | |
|---|---|
| 🏠 **Accueil** | Salutation selon l'heure, citation du jour, anneaux de progression routine + objectifs, série, moyenne 7 jours, tâches du jour cochables, prochaines échéances en direct |
| 📅 **Calendrier** | Mois entier : couleur = bilan de la routine, pastilles = échéances des objectifs ; détail du jour avec cases à cocher |
| 🍅 **Focus** | Minuteur Pomodoro (durées réglables), lié à une tâche ou un objectif, coche la tâche à la fin, son + notification, historique |
| ⭐ **XP & niveaux** | Calculés à partir de ce que tu accomplis (tâches, objectifs, focus, humeur) |
| 🏅 **15 succès** | Premier pas, séries 3/7/30 jours, journée parfaite, objectifs terminés, sessions focus… |
| 😊 **Humeur du jour** | 5 niveaux + historique sur 7 jours |
| 💡 **Insight** | Ton jour de la semaine le plus / le moins régulier |
| 🎨 **Couleurs** | Thème clair / sombre commun, dégradés, catégories avec icône (emoji), priorités colorées, confettis |
| 💾 **Sauvegarde unique** | Un seul fichier pour tout exporter / importer (accepte aussi les anciens exports des deux applis) |

## Tes données existantes

Les deux applis d'origine stockent leurs données dans le navigateur (`localStorage`) sous les clés
`everyday-routine-v1` et `objectifs.v1`. Élan lit exactement les mêmes clés : si le site est servi depuis la même
origine (par ex. `tanim-veer.github.io`), tes données apparaissent directement. Sinon, exporte depuis l'ancienne
appli et importe le fichier depuis **Accueil → Réglages & données**.

## Technique

- HTML, CSS et JavaScript sans framework ni dépendance
- `js/routine.js` et `js/objectifs.js` : les deux applis d'origine, isolées dans leur propre portée (CSS préfixé par vue)
- `js/hub.js` : thème, navigation, toasts, sauvegarde ; `gamify.js`, `home.js`, `calendar.js`, `focus.js` : nouvelles vues
- Service worker + manifeste (hors ligne, installation, raccourcis)

## Lancer en local

```
python -m http.server 8000
```

puis ouvrir `http://localhost:8000` (le service worker nécessite HTTP).
