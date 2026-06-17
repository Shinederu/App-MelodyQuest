# MelodyQuest

## Role

Frontend statique du blindtest multijoueur MelodyQuest.

Ce depot contient uniquement le client navigateur. Le backend source vit dans `P:\DEV\GitHub\App-MelodyQuest-API` et expose `https://api.shinederu.ch/melodyquest/` une fois deploye sous `P:\PROD\API\melodyquest`.

## Etat de pause - 2026-06-12

Le projet est mis en pause dans un etat stable de reprise. Les changements applicatifs de reference ont restaure le mode TV sur un lecteur YouTube iframe simple, puis une passe player a reduit le buffering sans retenter le double lecteur:

- cache-bust JS courant: `20260617-lobby-mode-review`;
- cache-bust CSS courant: `20260617-lobby-mode-review`;
- commit frontend applicatif de reference: `295dd11 Restore basic MelodyQuest TV player`;
- commit API applicatif de reference: `28dbdda Remove MelodyQuest TV ready playback flow`;
- fichiers deployes dans `P:\PROD\MelodyQuest` et `P:\PROD\API\melodyquest`.

Etat player 2026-06-13: la qualite YouTube n'est plus forcee en 1080p, les domaines YouTube sont preconnectes, l'API iframe est prechauffee en entrant dans le lobby/game/TV, les erreurs YouTube sont affichees clairement et la resynchronisation du player joueur est moins agressive. La TV garde un lecteur YouTube unique: elle limite les re-renders via la revision backend, poll moins vite hors phase d'ecoute, met son timer a jour toutes les 500 ms, peut preparer la prochaine piste avec `cueVideoById` seulement quand aucune manche n'est active et reduit la surface reelle de l'iframe quand la video est masquee. La cle de rendu TV inclut les champs de solution pour eviter qu'un snapshot revele mais encore masque bloque l'affichage de la reponse. Pendant la phase solution/vote, le lecteur courant n'est plus touche: avec un iframe unique, cue la piste suivante remplace visuellement la video revelee. La passe `20260613-player-clock-sync` ajoute une horloge navigateur corrigee par RTT pour les snapshots HTTP, puis limite les seeks en cours de manche aux recuperations bufferisees. La passe `20260613-player-subsecond-sync` resserre l'objectif sous la seconde. La passe `20260613-mobile-catchup` corrige le cas ou le telephone reste en retard. La passe `20260613-backend-late-sync` fait du timing backend la reference stricte: les joueurs comparent leur lecteur a `started_at_unix` + l'horloge serveur corrigee et se resynchronisent si le retard depasse `0.65s`; la TV utilise aussi `0.65s` pour les corrections bufferisees. Point sensible a reprendre plus tard: le chargement YouTube sur TV peut encore avoir des delais ou coupures selon la video/le navigateur. Les essais avec double lecteur TV, prechargement TV actif et signal backend "TV prete" ont ete abandonnes car ils ont provoque des cas sans video/son. Ne pas les remettre sans nouvelle piste verifiee. L'hebergement local de fichiers audio a ete refuse; YouTube doit rester la source principale.

Passe UI 2026-06-15: le lecteur reste sur `20260613-backend-late-sync`. Le cache-bust `20260615-ui-flow` concerne uniquement l'ergonomie des affichages: accueil plus oriente creation/rejoindre, lobby avec code/joueurs/visibilite visibles, reponse de jeu regroupee avec son bouton, vote de manche suivante remonte avant les outils, et navigation admin clarifiee.

Passe lobby mobile 2026-06-15: le cache-bust `20260615-lobby-mobile` deplace l'action `Supprimer le salon` a cote de `Quitter le salon` dans les actions principales du lobby et epure le header du lobby en retirant les chips manches/timer. Le lecteur reste inchange.

Passe wake lock 2026-06-15: le cache-bust `20260615-wake-lock` ajoute un verrou d'ecran best-effort via `navigator.wakeLock` sur les routes `lobby`, `game`, `result`, `tv-link` et `tv`. Les navigateurs qui ne supportent pas l'API continuent de fonctionner normalement, mais peuvent encore laisser le telephone se mettre en veille selon leurs reglages systeme.

Passe retours de partie 2026-06-15: le cache-bust `20260615-playtest-improvements` ajoute le mode absent, rend l'auto-focus du champ reponse moins agressif, conserve l'affichage des essais rates, affiche les reponses proposees quand elles sont autorisees, garde la solution/les points visibles pour les joueurs ayant trouve, expose le debut de lecture des pistes en management/validation et s'appuie sur l'API `012` pour conserver les scores des joueurs retires.

Passe historique reponses 2026-06-16: le cache-bust `20260616-answer-history` ajoute un historique local du champ reponse avec fleche haut/bas, conserve uniquement les 50 dernieres entrees dans le navigateur, et ne modifie ni l'API ni la strategie du player.

Passe flux de partie 2026-06-16: le cache-bust `20260616-game-flow-fixes` corrige le focus au vrai debut des manches, preserve les essais rates visibles pendant la manche, rafraichit les reponses visibles entre joueurs ayant trouve, retire la detection automatique `inactive`, ajoute l'exclusion joueur depuis l'ecran de jeu pour le createur, et redirige les joueurs restes sur l'ecran resultat quand une nouvelle partie demarre.

Passe precision reponses 2026-06-16: le cache-bust `20260616-answer-default-80` passe les nouveaux salons a `80%` de correspondance par defaut, cote creation rapide et fallback des reglages de lobby. Le lecteur reste inchange.

Passe presence createur 2026-06-16: le cache-bust `20260616-owner-presence` ajoute au createur la possibilite de mettre un autre joueur absent ou present depuis le lobby et le classement de partie. Le lecteur reste inchange.

Passe visibilite reponses 2026-06-16: le cache-bust `20260616-answer-visibility` limite les essais rates visibles a 5, remplace l'historique joueur par les seules reponses validees qui ont donne des points, et s'aligne sur le bonus absent API. Le lecteur reste inchange.

Passe disposition jeu 2026-06-16: le cache-bust `20260616-game-action-layout` deplace la zone `Ta reponse` sous la video et la transforme en panneau de solution quand le joueur trouve ou quand la reponse est revelee. La colonne droite garde les infos de salon, classement, outils et vote de manche suivante. Le lecteur reste inchange.

Passe correction disposition jeu 2026-06-16: le cache-bust `20260616-game-layout-scroll-fix` garde uniquement la saisie/solution sous la video, replace les aides de manche dans la colonne laterale et reactive un scroll de secours sur desktop pour eviter qu'un ecran court bloque l'interface. Le lecteur reste inchange.

Passe nettoyage classement 2026-06-16: le cache-bust `20260616-player-menu-cleanup` retire les libelles redondants de la solution revelee, garde un seul titre de classement et remplace les actions visibles sur les joueurs par un menu discret dans le lobby et en partie. Le lecteur reste inchange.

Passe outils de manche 2026-06-16: le cache-bust `20260616-game-header-tools-fit` supprime le titre redondant de la carte de reponse, deplace `Partager` / `Lier une TV` dans les actions principales de manche et compacte ces actions en grille sur mobile. Le lecteur reste inchange.

Passe actions compactes 2026-06-17: le cache-bust `20260617-game-action-compact-v2` corrige la superposition des menus d'action joueur dans le classement et compacte les blocs de vote revelation/suite de manche pour reduire les textes repetitifs. Le lecteur reste inchange.

Passe mode automatique 2026-06-17: le cache-bust `20260617-autoplay-mode` ajoute un mode de blindtest automatique separe du mode participatif. Le joueur configure categories, nombre de musiques, duree d'ecoute et duree de revelation, puis l'ecran `#/autoplay` enchaine les manches sans saisie, sans score et sans votes. L'API stocke le mode via `mq_lobbies.game_mode`.

Passe estimation mode automatique 2026-06-17: le cache-bust `20260617-autoplay-estimate` reorganise `#/autoplay-setup` en panneau de preparation avec resume dynamique, duree totale estimee, heure de fin indicative et synthese des categories selectionnees. Le fonctionnement du lecteur et l'API restent inchanges.

Passe switch actif/passif 2026-06-17: le cache-bust `20260617-lobby-mode-review` integre le mode automatique dans le principe de salon. La page `#/main` propose un switch `Actif`/`Passif`: le mode actif cree/liste des salons `participative`, le mode passif cree/liste des salons `autoplay`, avec salon prive par defaut. Les salons passifs passent par `#/lobby`, gardent le partage de code et la liaison TV, puis le createur lance l'ecoute vers `#/autoplay`. L'ancien ecran `#/autoplay-setup` cree aussi un salon passif et revient maintenant vers le lobby au lieu de lancer directement.

Dernieres verifications connues:

- `Get-ChildItem .\assets\js -Recurse -Filter *.js | % { node --check $_.FullName }`
- `git -c safe.directory=* diff --check`
- `rg -n "console\.|alert\(|debugger" assets`
- smoke test `/tv`: QR affiche, script `20260616-answer-visibility`, CSS `20260616-answer-visibility`, aucun conteneur `tv-video-preload-player`, aucune erreur console.

## Reprise rapide agent

1. Lire `AGENTS.md`.
2. Verifier l'etat Git:

```powershell
git -c safe.directory=* status --short
```

3. Pour lire les fichiers avec accents dans PowerShell:

```powershell
Get-Content -Encoding UTF8 README.md
```

4. Lancer les checks apres modification:

```powershell
Get-ChildItem .\assets\js -Recurse -Filter *.js | % { node --check $_.FullName }
git -c safe.directory=* diff --check
rg -n "console\.|alert\(|debugger" assets
```

5. Si le changement touche l'API, lire aussi `P:\DEV\GitHub\App-MelodyQuest-API\README.md`.
6. Lire `AMELIORATIONS-PARTIE.md` si la reprise concerne l'ergonomie de partie,
   le lobby ou la selection musicale.
7. Deployer uniquement les fichiers runtime publics (`index.html` et `assets\`) vers `P:\PROD\MelodyQuest`, puis commit/push sur `main`.

## Organisation du depot

- `index.html`: point d'entree HTML, configuration API publique et cache-bust principal.
- `assets/css/main.css`: style global sombre et responsive.
- `assets/views/*View.html`: fragments HTML charges par route.
- `assets/js/controller/*Controller.js`: logique de chaque vue.
- `assets/js/model/`: modeles UI transverses.
- `assets/js/utils/`: helpers HTTP, etat lobby, UI commune, YouTube et QR.
- `assets/js/vendor/`: dependances vendorees pour navigateur (`@shinederu/auth-core`, `jsQR`).

Les helpers reutilisables doivent rester dans `assets/js/utils/`:

- `ui.js`: echappement HTML/attribut, recherche normalisee, slug, dates, rangs, roles joueurs et avatars.
- `youtube.js`: extraction/build d'URL YouTube et chargement partage de l'API iframe.

Eviter de recopier ces helpers dans les controleurs.

Il n'y a plus de dossier `client/` ou `backend/` actif dans ce repo. L'API MelodyQuest est centralisee dans le repo `App-MelodyQuest-API`.

Le dossier `output/` n'est pas utilise par l'application. S'il reapparait vide, il peut etre supprime.

## Repo et deploiement

- Front DEV: `P:\DEV\GitHub\App-MelodyQuest`
- Front PROD: `P:\PROD\MelodyQuest`
- Repo GitHub: `https://github.com/Shinederu/App-MelodyQuest.git`

Le dossier PROD ne doit pas etre un clone du repo. Il ne doit contenir que:

- `index.html`;
- `assets\css\`;
- `assets\views\`;
- `assets\js\`;
- les assets publics necessaires au navigateur.

Ne pas deployer `README.md`, `AGENTS.md`, `.git`, `.github`, fichiers de test, caches, brouillons, dossiers `output\` ou autres documents internes.

## Endpoints

- Front public: `https://melodyquest.shinederu.ch/`
- API MelodyQuest: `https://api.shinederu.ch/melodyquest/`
- API Auth: `https://api.shinederu.ch/auth/`
- Hub Mercure: `https://mercure.shinederu.ch/.well-known/mercure`

Le serveur Nginx doit servir `P:\PROD\MelodyQuest` avec fallback vers `index.html`, notamment pour `/tv`.

## Routes client

Les routes principales sont gerees par `assets/js/controller/AppController.js`.

- `#/public`: connexion/inscription.
- `#/suggest-track`: proposition publique de musique.
- `/tv`: ecran TV public.
- `#/tv-link`: liaison d'une TV au salon courant.
- `#/main`: accueil joueur, creation/rejoindre salon et liste des salons publics.
- `#/autoplay-setup`: ancien ecran de configuration d'un blindtest automatique sans score; le flux principal passe maintenant par `#/main` puis `#/lobby` en mode passif, et cet ancien ecran renvoie aussi vers le lobby apres creation.
- `#/autoplay`: lecture automatique ecoute/reponse/prochaine musique.
- `#/lobby-list`: ancienne liste dediee des salons publics, conservee pour compatibilite.
- `#/lobby`: salon, joueurs, invitations et reglages.
- `#/game`: manche en cours.
- `#/result`: resultats.
- `#/management`: hub administration catalogue.
- `#/management-categories`: categories.
- `#/management-families`: oeuvres/reponses attendues.
- `#/management-tracks`: pistes jouables.
- `#/management-validation`: validation/correction des pistes en attente.
- `#/management-suggestions`: suggestions joueurs.

## Fonctionnalites produit

- Blindtest multijoueur en ligne.
- Mode automatique separe: configuration des categories et du rythme, puis enchainement ecoute/reponse sans joueurs attendus, sans saisie, sans score et sans votes.
- Authentification centralisee via le package `@shinederu/auth-core` fourni par `Module-Auth-Core`.
- Salons publics ou prives, rejoignables par code ou URL partagee.
- Presence joueur manuelle avec mode absent: les joueurs absents restent visibles, mais ne bloquent plus les votes et transitions. Fermer l'onglet ne change pas automatiquement le statut; le createur peut passer un joueur absent/present ou exclure un joueur qui ne revient pas. Quand le premier joueur trouve une manche, les joueurs absents recoivent un bonus de compensation de 10% des points gagnes par ce premier joueur.
- Reglages de lobby: nombre de manches, timer, categories, visibilite de la categorie, vote de revelation, precision de validation des reponses avec `80%` par defaut sur les nouveaux salons.
- Validation souple des reponses geree cote API selon le seuil du lobby.
- Jeu responsive desktop/mobile avec lecteur YouTube cache avant revelation.
- Auto-focus du champ reponse au vrai debut de manche, apres l'eventuelle phase de synchronisation, sans reprendre le focus apres une interaction volontaire du joueur pendant la manche.
- Historique local du champ reponse: fleche haut pour reprendre les dernieres entrees envoyees, fleche bas pour revenir vers les plus recentes ou le brouillon en cours.
- Verrou d'ecran best-effort sur les routes de partie pour limiter la mise en veille des telephones quand le navigateur le supporte.
- Mode joueur de salon: interface reponse seule quand une TV est liee.
- Mode TV: QR code, liaison depuis mobile, affichage plein ecran sans navigation et lecteur YouTube actif simple. Le lecteur d'avance et le signal "TV prete" sont des pistes abandonnees pour revenir a un comportement stable.
- Suggestions joueurs: alias, correction URL/libelle/artiste/licence, proposition publique de nouvelle musique.
- Derniers essais rates limites a 5 pour les joueurs; les reponses visibles des autres joueurs sont uniquement les reponses validees qui ont rapporte des points. L'historique complet reste cote API/DB pour un futur usage admin/statistiques.
- Administration catalogue: categories, oeuvres, musiques, validation, suggestions.

## Authentification et permissions

- Authentification navigateur via `@shinederu/auth-core`, vendore depuis `Module-Auth-Core`.
- Base API auth: `https://api.shinederu.ch/auth/`.
- Cookie session partage: `sid`, domaine `.shinederu.ch`.
- Le frontend ne decide pas des droits. Les pages management s'appuient sur l'etat utilisateur renvoye par les APIs; les controles reels restent cote API.
- Permission admin catalogue attendue cote backend: `melodyquest.catalog.manage`.

## Base de donnees

Le backend source est dans `P:\DEV\GitHub\App-MelodyQuest-API`.

La DB partagee est `ShinedeCore`. MelodyQuest utilise les tables `mq_*`.

Les migrations MelodyQuest sont dans:

```text
P:\DEV\GitHub\App-MelodyQuest-API\sql\
```

Les droits admin catalogue passent par les tables `core_*`. La permission stable attendue est:

```text
melodyquest.catalog.manage
```

En PHP, elle correspond a:

```php
hasPermission($userId, 'melodyquest', 'catalog.manage')
```

## Dossiers runtime et fichiers partages

- Le frontend ne possede aucun stockage persistant.
- Les fichiers publics servis sont uniquement dans `P:\PROD\MelodyQuest`.
- Aucun fichier utilisateur ne doit etre ecrit dans le dossier frontend public.
- Les propositions de musiques, suggestions, lobbies, scores et liaisons TV sont stockes en DB via l'API `melodyquest`.

## Temps reel et evenements

- Le frontend consomme Mercure quand `data.realtime.transport=mercure` est fourni par l'API.
- Topics documentes cote API:
  - `https://api.shinederu.ch/melodyquest/topics/public-lobbies`
  - `https://api.shinederu.ch/melodyquest/topics/lobbies/{LOBBY_CODE}`
- Il n'y a pas de fallback SSE supporte dans l'API actuelle.
- Apres une reconnexion ou une erreur temps reel, l'etat est reconstruit par API HTTP (`listPublicLobbies`, `getLobbyByCode`, `getRoundState`).

## Dependances inter-projets

- `App-MelodyQuest-API`: toutes les actions de jeu, catalogue, TV, suggestions et temps reel.
- `Module-Auth-API`: login, logout, session, details compte.
- `Module-Auth-Core`: client auth navigateur vendore.
- Mercure: snapshots lobbies publics/prives.
- YouTube iframe API: lecture des pistes, a partir d'identifiants video stockes par l'API.

Le frontend n'ecrit jamais directement en DB et ne communique pas avec un autre projet autrement que par API HTTP documentee ou abonnement Mercure.

## Configuration

La configuration publique est dans `index.html`:

```js
window.__SHINEDERU_API_ROOT__ = "https://api.shinederu.ch";
```

Changer cette valeur uniquement si l'hote API public change. Aucun secret ne doit etre ajoute au frontend.

## Cache-bust

Les assets sont servis avec cache long. En cas de changement frontend, mettre a jour la version dans:

- `index.html`;
- imports de `assets/js/controller/AppController.js`;
- imports directs des modules touches.

Convention conseillee: `YYYYMMDD-sujet-court`, par exemple `20260610-agent-audit`.

Le cache-bust `20260612-tv-basic-player` marque le rollback volontaire du mode TV vers un lecteur YouTube actif simple. Le cache-bust `20260613-player-warmup` garde ce lecteur simple, retire le 1080p force, prechauffe YouTube et ajoute les erreurs player explicites. Le cache-bust JS `20260613-tv-preload-loop` reduit la charge de la vue TV et ajoute le prechargement de la piste suivante via le lecteur unique. Le cache-bust JS `20260613-tv-reveal-fix` corrige l'affichage de la solution TV quand les champs de reponse arrivent dans un snapshot sans nouvelle revision. Le cache-bust JS `20260613-tv-no-reveal-cue` empeche le lecteur TV de cue la piste suivante pendant la phase solution/vote. Le cache-bust JS `20260613-player-clock-sync` ajoute la correction RTT de l'horloge client et rend les seeks de recuperation buffer-aware. Le cache-bust JS `20260613-player-subsecond-sync` resserre l'objectif sous la seconde. Le cache-bust JS `20260613-mobile-catchup` autorise un rattrapage dur cote joueur quand le telephone reste nettement en retard. Le cache-bust JS `20260613-backend-late-sync` fixe le seuil de retard maximum a `0.65s` par rapport au timing backend. Le cache-bust CSS `20260613-tv-hidden-video` force le rafraichissement du style qui reduit la surface de l'iframe TV quand la video est masquee. Le cache-bust `20260615-ui-flow` ne modifie pas le lecteur et sert uniquement les optimisations de placement/responsive des interfaces. Le cache-bust `20260615-lobby-mobile` garde cette passe et ajuste uniquement le lobby mobile. Le cache-bust `20260615-wake-lock` ajoute le verrou d'ecran best-effort sur les routes de partie. Le cache-bust `20260615-playtest-improvements` ajoute les retours de partie sans modifier la strategie de synchronisation du lecteur. Le cache-bust `20260616-answer-history` ajoute l'historique local fleche haut/bas du champ reponse, sans changer le player ni l'API. Le cache-bust `20260616-game-flow-fixes` corrige les flux de presence manuelle, focus de debut de manche, essais visibles, exclusion joueur en partie et redirection resultat vers nouvelle partie. Le cache-bust `20260616-answer-default-80` passe la precision de validation par defaut des nouveaux salons a `80%`, sans changer le player. Le cache-bust `20260616-owner-presence` ajoute la gestion present/absent des autres joueurs par le createur, sans changer le player. Le cache-bust `20260616-answer-visibility` limite l'affichage joueur des essais/reponses et accompagne le bonus absent API, sans changer le player. Le cache-bust `20260616-game-action-layout` reorganise uniquement l'interface de manche autour de la video. Le cache-bust `20260616-game-layout-scroll-fix` corrige cette passe en separant aides de manche et zone de saisie, avec scroll de secours. Le cache-bust `20260616-player-menu-cleanup` nettoie les libelles de solution/classement et masque les actions joueur dans un menu. Le cache-bust `20260616-game-header-tools-fit` deplace les outils de partage/TV dans les actions de manche, retire le titre de la carte reponse et ajuste le mobile. Le cache-bust `20260617-autoplay-mode` ajoute le mode blindtest automatique separe. Le cache-bust `20260617-autoplay-estimate` ameliore uniquement son ecran de preparation avec estimation de duree. Le cache-bust `20260617-lobby-mode-review` rattache le mode automatique au flux salon avec partage et TV.

## Diagnostics player

Les diagnostics de synchronisation sont desactives par defaut. Pour mesurer une partie sans ajouter de logs permanents, ouvrir le site avec `?mqDebugSync=1` ou executer dans la console navigateur:

```js
localStorage.setItem("mq_sync_diagnostics", "1")
```

Les evenements sont conserves en memoire dans `window.__mqSyncDiagnostics` avec les offsets d'horloge, derives et decisions de seek ignorees ou appliquees.

## Verifications

```powershell
Get-ChildItem P:\DEV\GitHub\App-MelodyQuest\assets\js -Recurse -Filter *.js | % { node --check $_.FullName }
git -c safe.directory=* diff --check
rg -n "console\.|alert\(|debugger" P:\DEV\GitHub\App-MelodyQuest\assets
```

Smoke test recommande:

1. `#/public`: login/register.
2. `#/main`: creation/rejoindre salon et liste publique.
3. `#/lobby`: reglages, categories, joueurs.
4. `#/game`: manche, champ reponse, timer, video cachee.
5. `/tv` + `#/tv-link`: QR/lien TV si la zone TV est touchee.
6. Pages `#/management*` si catalogue/suggestions sont touches.

## Deploiement

Copier uniquement le runtime public:

```powershell
Copy-Item P:\DEV\GitHub\App-MelodyQuest\index.html P:\PROD\MelodyQuest\index.html -Force
Copy-Item P:\DEV\GitHub\App-MelodyQuest\assets\* P:\PROD\MelodyQuest\assets -Recurse -Force
```

Apres copie, verifier qu'aucun fichier interne n'est present en PROD:

```powershell
Get-ChildItem P:\PROD\MelodyQuest -Force |
  Where-Object { $_.Name -in @('README.md','AGENTS.md','.git','.github','output') }
```

## Points a surveiller a la reprise

- Verifier que `P:\PROD` reflete bien le contenu servi par Nginx avant de conclure qu'un deploiement est live.
- Tester un vrai salon avec au moins deux joueurs si le changement touche `#/lobby`, `#/game`, les votes, suggestions ou scores.
- Tester `/tv` + `#/tv-link` uniquement avec le lecteur TV simple actuel, sans recreer de lecteur d'avance.
- Garder `#/lobby-list` pour compatibilite, meme si la liste publique est maintenant visible depuis `#/main`.
- Les optimisations de chargement YouTube TV restent ouvertes, mais doivent etre traitees comme une nouvelle recherche technique, pas comme une restauration du double lecteur precedent.
- Les retours de partie du 2026-06-15 sont clarifies dans `AMELIORATIONS-PARTIE.md`.

## Nginx attendu

Exemple minimal:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name melodyquest.shinederu.ch;
    root /var/www/MelodyQuest;

    index index.html;

    location ^~ /assets/ {
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Checklist avant livraison

- Aucun dossier temporaire vide inutile dans le repo.
- Aucun secret ajoute.
- Pas de `console.log`, `alert()` ou `debugger` dans le code applicatif.
- JS valide avec `node --check`.
- Cache-bust mis a jour si un asset deploye change.
- Fichiers runtime modifies copies en PROD, sans README/AGENTS/docs internes.
- Commit et push effectues sur `main`.
