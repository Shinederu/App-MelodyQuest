# MelodyQuest

## Role

MelodyQuest est le frontend statique du blindtest Shinede.

Le projet permet de jouer a un blindtest musical depuis un navigateur, avec deux modes:

- mode actif: les joueurs saisissent des reponses, gagnent des points et suivent un classement;
- mode passif: les musiques s'enchainent automatiquement, sans reponse attendue, sans score et sans vote.

Ce depot contient uniquement le client navigateur HTML/CSS/JS. Le backend source vit dans `P:\DEV\GitHub\App-MelodyQuest-API`.

## Statut et priorite

MelodyQuest est le seul produit Shinede en developpement continu. Ce statut
autorise une roadmap priorisee, mais ne transforme pas chaque idee documentee
en tache. Une evolution entre dans le travail planifie seulement apres une
decision explicite, avec un besoin clair et un perimetre borne. Preferer le plus
petit changement complet.

## Etat courant

- Front DEV: `P:\DEV\GitHub\App-MelodyQuest`
- Front PROD: `P:\PROD\MelodyQuest`
- Repo GitHub: `https://github.com/Shinederu/App-MelodyQuest.git`
- Front public: `https://melodyquest.shinederu.ch/`
- API MelodyQuest: `https://api.shinederu.ch/melodyquest/`
- API Auth: `https://api.shinederu.ch/auth/`
- Hub Mercure: `https://mercure.shinederu.ch/.well-known/mercure`
- Cache-bust JS/CSS courant: `20260828-ai-details`

Identite visuelle:

- surfaces charbon et texte blanc chaud, alignes sur le langage visuel de ShinedeWake;
- ambre/orange pour les actions principales et la selection;
- bleu pour l'information, vert menthe pour les succes et corail pour les dangers;
- les dispositions restent propres a MelodyQuest et adaptees aux parcours de jeu.

Etat player a preserver:

- YouTube reste la source principale des pistes.
- Le lecteur TV utilise un lecteur YouTube iframe simple.
- Le double lecteur TV, le prechargement TV agressif et le signal backend `markTvRoundReady` ont ete abandonnes apres regressions son/video.
- Le lecteur actif/tel/PC conserve la logique de resynchronisation backend tardive issue de la passe `20260613-backend-late-sync`.
- L'hebergement local de fichiers audio a ete refuse.

Le mode passif revient automatiquement au lobby a la fin de toutes les manches.

Les suppressions de categories, œuvres, musiques et salons passent par une modale commune qui nomme l'element avant confirmation.

## Reprise rapide agent

1. Lire `P:\AGENTS.md`, `P:\ECOSYSTEM.md` et `P:\DEV\GitHub\AGENTS.md`.
2. Lire ce README et `AGENTS.md`.
3. Si le changement touche l'API, la DB, les scores, les lobbies, le player ou les droits, lire aussi:
   - `P:\DEV\GitHub\App-MelodyQuest-API\README.md`
   - `P:\DEV\GitHub\App-MelodyQuest-API\AGENTS.md`
   - `P:\DEV\GitHub\App-MelodyQuest-API\sql\`
4. Verifier l'etat Git:

```powershell
git -c safe.directory=* status --short --branch
```

5. Verifier que `P:\PROD\MelodyQuest` reflete bien le contenu servi par Nginx avant de conclure qu'un changement est live.

## Organisation du depot

- `index.html`: point d'entree HTML, configuration API publique, preconnect YouTube et cache-bust principal.
- `robots.txt`: autorise l'exploration et declare le sitemap public.
- `sitemap.xml`: expose uniquement l'URL canonique indexable; les routes `#` restent des etats internes de la SPA.
- `favicon.svg`: favicon stable et carree pour les navigateurs et les resultats de recherche.
- `assets/css/main.css`: style global sombre et responsive.
- `assets/views/*View.html`: fragments HTML charges par route.
- `assets/js/controller/*Controller.js`: logique par vue.
- `assets/js/model/`: modeles UI transverses, notamment header/utilisateur.
- `assets/js/utils/`: helpers HTTP, etat lobby, horloge, UI, YouTube, QR et wake lock.
- `assets/js/vendor/`: dependances vendorees navigateur (`@shinederu/auth-core`, `jsQR`).
- `tests/`: tests Node des helpers sans dependance navigateur.
- `package.json`: commandes de test locales; ne fait pas partie du runtime public.

Helpers importants:

- `assets/js/utils/HttpService.js`: appels API JSON.
- `assets/js/utils/LobbyState.js`: lobby courant/persistant cote navigateur.
- `assets/js/utils/ClockSync.js`: correction d'horloge client/backend.
- `assets/js/utils/WakeLockService.js`: verrou d'ecran best-effort.
- `assets/js/utils/ui.js`: echappement HTML, normalisation de recherche, avatars, rangs et roles.
- `assets/js/utils/confirmDialog.js`: confirmation accessible et responsive des suppressions destructives.
- `assets/js/utils/youtube.js`: extraction d'ID YouTube et chargement partage de l'API iframe.
- `assets/js/utils/qr.js`: generation QR locale.

Il n'y a plus de dossier `client/` ou `backend/` actif dans ce repo. L'API MelodyQuest est dans `App-MelodyQuest-API`.

Le dossier `output/` n'est pas utilise. S'il reapparait vide, il peut etre supprime.

## Routes client

Les routes sont gerees dans `assets/js/controller/AppController.js`.

- `#/public`: connexion, inscription, presentation joueur et entree vers le mode TV.
- `#/suggest-track`: proposition publique de nouvelle musique.
- `/tv`: ecran TV public, sans header/footer.
- `#/tv-link`: liaison d'une TV au salon courant, avec saisie ou scan QR.
- `#/main`: accueil joueur, switch mode actif/passif, creation/rejoindre salon et liste des salons publics du mode choisi.
- `#/autoplay-setup`: ancien ecran de configuration passif; conserve pour compatibilite, cree un salon passif puis renvoie au lobby.
- `#/autoplay`: ecran de lecture du mode passif.
- `#/lobby-list`: ancienne liste dediee des salons publics, conservee pour compatibilite.
- `#/lobby`: salon, joueurs, partage, liaison TV et reglages.
- `#/game`: partie active participative.
- `#/result`: resultats, avec retour automatique en jeu si le createur relance une partie.
- `#/management`: hub administration catalogue.
- `#/management-categories`: categories.
- `#/management-families`: oeuvres/reponses attendues.
- `#/management-tracks`: pistes jouables.
- `#/management-validation`: validation/correction des pistes en attente.
- `#/management-suggestions`: suggestions joueurs, edition, refus, acceptation et application catalogue.
- `#/management-answers`: essais actifs et archives, candidats alias regroupes, idees de contenu et ajout direct d'alias.

Redirections importantes:

- utilisateur non connecte vers `#/public`;
- utilisateur connecte hors pages publiques vers `#/main`;
- non-admin hors pages management vers `#/main`;
- `#/game` sans salon valide renvoie vers `#/main`;
- `#/lobby?code=...` et `#/tv-link?code=...` conservent le code pendant la connexion.

## Fonctionnalites produit

- Authentification centralisee via `@shinederu/auth-core`.
- Salons publics ou prives, rejoignables par code ou URL partagee.
- Switch d'accueil entre mode actif et mode passif.
- Mode actif:
  - saisie de reponse;
  - scoring;
  - classement;
  - seuil de precision configurable, `80%` par defaut;
  - vote 100% des joueurs actifs pour reveler la reponse avant la fin si personne n'a trouve;
  - vote de manche suivante apres revelation;
  - historique local de saisie avec fleche haut/bas;
  - derniers essais rates visibles limites a 5;
  - reponses validees visibles entre joueurs ayant trouve, puis visibles a tous apres revelation.
- Mode passif:
  - salons prives par defaut;
  - partage et liaison TV conserves;
  - enchainement automatique ecoute/revelation;
  - pas de score, pas de vote, pas de reponse attendue;
  - retour automatique au lobby a la fin de toutes les manches.
- Reglages de lobby:
  - nombre de manches;
  - duree de reponse/ecoute;
  - duree de revelation;
  - categories;
  - salon public/prive;
  - categorie visible, activee par defaut;
  - revelation anticipee;
  - precision de validation.
- Presence:
  - chaque joueur peut se mettre present/absent;
  - le createur peut passer un joueur present/absent;
  - le createur peut exclure un joueur;
  - un joueur absent ne bloque pas les votes/transitions;
  - un joueur absent recoit un bonus de compensation de 10% des points du premier joueur qui trouve.
- TV et soiree locale:
  - `/tv` genere un QR code;
  - `#/tv-link` lie la TV au salon;
  - le mode joueur de salon evite de charger la video sur le telephone/PC quand une TV sert d'ecran principal;
  - le son TV est actif, sans bouton d'activation manuel.
- Ergonomie:
  - style sombre;
  - layout responsive desktop/tablette/mobile;
  - profil paysage compact dedie aux ecrans 7 pouces autour de `800 x 480`, avec TV plein ecran, partie active et mode passif testes sans debordement horizontal;
  - wake lock best-effort sur les routes de jeu/lobby/TV;
  - demande de plein ecran best-effort au lancement d'une partie active ou passive.
- Administration:
  - catalogue categories/oeuvres/pistes;
  - validation des pistes en attente avec modification des champs et alias;
  - suggestions de correction ou nouvelle musique;
  - application directe des suggestions au catalogue;
  - analyse des reponses joueurs avec filtres resultat/categorie/periode/texte;
  - regroupement des fautes proches et ajout d'un candidat comme alias;
  - idees de contenu transferables vers le formulaire de nouvelle musique.

## Authentification et permissions

- Auth navigateur via `@shinederu/auth-core`, vendore depuis `Module-Auth-Core`.
- Base auth: `https://api.shinederu.ch/auth/`.
- Cookie session partage: `sid`, domaine `.shinederu.ch`.
- Le frontend n'est pas source de verite des droits.
- Les pages management sont protegees cote interface, mais les controles reels restent cote API.
- Permission admin catalogue attendue cote backend:

```text
melodyquest.catalog.manage
```

En PHP:

```php
hasPermission($userId, 'melodyquest', 'catalog.manage')
```

## Base de donnees

La DB partagee est `ShinedeCore`. MelodyQuest utilise les tables `mq_*`.

Les migrations vivent dans:

```text
P:\DEV\GitHub\App-MelodyQuest-API\sql\
```

Le frontend n'ecrit jamais directement en DB.

Tables/fonctions principales cote API:

- catalogue: categories, familles, alias, pistes;
- lobbies et joueurs;
- manches, reponses, votes et scores;
- presence manuelle et exclusions;
- tentatives de reponse;
- bonus absent;
- suggestions joueurs;
- liaisons TV;
- file de pistes a venir.

## Dossiers runtime et fichiers partages

- Le frontend ne possede aucun stockage persistant.
- Les fichiers publics servis sont dans `P:\PROD\MelodyQuest`.
- Aucun fichier utilisateur ne doit etre ecrit dans le dossier frontend public.
- Les suggestions, lobbies, scores, tentatives et liaisons TV sont stockes via l'API dans les tables `mq_*`.

## Temps reel et evenements

Transport principal: Mercure.

Topics connus:

```text
https://api.shinederu.ch/melodyquest/topics/public-lobbies
https://api.shinederu.ch/melodyquest/topics/lobbies/{LOBBY_CODE}
```

Le frontend consomme `data.realtime` quand l'API le fournit.

Tout etat temps reel doit rester reconstructible par API HTTP:

- `listPublicLobbies`
- `getLobbyByCode`
- `getRoundState`
- `getTvState`

Il n'y a pas de fallback SSE supporte dans l'API actuelle.

## Dependances inter-projets

- `App-MelodyQuest-API`: gameplay, catalogue, suggestions, TV, DB et Mercure.
- `Module-Auth-API`: login/logout/session/utilisateur/avatar.
- `Module-Auth-Core`: client auth navigateur vendore.
- `Module-ShinedeCore-PHP`: permissions backend centralisees.
- Mercure: snapshots lobbies publics/prives.
- YouTube iframe API: lecture des pistes.

Le frontend ne communique pas avec un autre projet autrement que par API HTTP documentee ou abonnement Mercure.

## Configuration

La configuration publique est dans `index.html`:

```js
window.__SHINEDERU_API_ROOT__ = "https://api.shinederu.ch";
```

Aucun secret ne doit etre ajoute au frontend.

## Referencement

URL canonique indexable:

```text
https://melodyquest.shinederu.ch/
```

MelodyQuest utilise des routes avec fragment (`#/public`, `#/main`, etc.). Le
fragment n'est pas transmis au serveur et ne represente donc pas une page SEO
distincte. Seule la racine est declaree dans `sitemap.xml`; `/tv` et les routes
applicatives se consolident vers cette URL avec la balise canonique de
`index.html`.

La reponse HTML initiale contient une presentation statique du jeu avant le
chargement de la SPA. Elle permet aux moteurs et aux visiteurs sans JavaScript
de comprendre le produit sans dependre du rendu asynchrone des vues.

Fichiers et signaux publics:

- metadonnees description, robots, Open Graph et Twitter dans `index.html`;
- donnees structurees JSON-LD `WebSite` et `WebApplication`;
- favicon stable `/favicon.svg`;
- regles d'exploration `/robots.txt`;
- sitemap canonique `/sitemap.xml`;
- propriete Google Search Console de type prefixe d'URL pour le domaine public.

Apres une modification significative du contenu indexable, actualiser
`<lastmod>` dans `sitemap.xml`, deployer les fichiers racine, puis verifier la
racine avec l'outil d'inspection d'URL de Search Console.

## Cache-bust

Les assets sont servis avec cache long. En cas de changement deploye, mettre a jour:

- `index.html`;
- `assets/js/controller/AppController.js`;
- les imports directs des modules touches si necessaire.

Convention:

```text
YYYYMMDD-sujet-court
```

Cache-bust courant:

```text
20260828-ai-details
```

Historique utile:

- `20260828-ai-details`: note de transparence repliee par defaut pour alleger la page publique.
- `20260828-ai-disclosure`: ajout d'une note de transparence discrete sur l'experimentation du developpement assiste par IA en bas de la page publique.
- `20260828-wake-theme`: suppression des transitions directes ambre-bleu; les bandeaux utilisent un degrade ambre-orange et le bleu reste un accent separe.
- `20260813-wake-theme`: palette et composants visuels alignes sur ShinedeWake sans changement de disposition.
- `20260810-history-safety`: confirmations de suppression partagees et raccordement a l'historique backend.

- `20260613-backend-late-sync`: timing backend comme reference stricte, resync si retard notable.
- `20260615-ui-flow`: premiere passe ergonomie globale.
- `20260615-wake-lock`: verrou d'ecran best-effort.
- `20260615-playtest-improvements`: presence, essais, suggestions, start offset.
- `20260616-answer-history`: historique local fleche haut/bas.
- `20260616-game-flow-fixes`: presence manuelle, exclusion, redirection resultat.
- `20260616-answer-default-80`: precision par defaut a 80%.
- `20260616-answer-visibility`: essais rates limites et reponses validees visibles.
- `20260616-game-action-layout`: reponse/solution sous la video.
- `20260616-game-layout-scroll-fix`: scroll de secours et layout de partie corrige.
- `20260616-player-menu-cleanup`: actions joueur compactes.
- `20260616-game-header-tools-fit`: partage/TV dans les actions de manche.
- `20260617-autoplay-mode`: mode automatique/passif.
- `20260617-lobby-mode-review`: mode passif rattache aux salons.
- `20260617-passive-tv-cleanup`: pas de classement sur TV en mode passif.
- `20260617-category-default-visible`: categorie visible par defaut.
- `20260617-game-toolbar-cleanup`: volume/correction sous lecteur.
- `20260617-launch-fullscreen`: plein ecran best-effort au lancement.
- `20260617-admin-workflow`: suggestions et analyse des reponses admin.
- `20260619-autoplay-return-lobby`: retour au lobby en fin de mode passif.
- `20260717-compact-landscape`: responsive paysage `800 x 480`, TV plein viewport et interfaces de partie compactes.

## Diagnostics player

Les diagnostics de synchronisation sont desactives par defaut.

Activation ponctuelle:

```text
https://melodyquest.shinederu.ch/?mqDebugSync=1
```

Ou dans la console navigateur:

```js
localStorage.setItem("mq_sync_diagnostics", "1");
```

Les evenements sont conserves en memoire dans:

```js
window.__mqSyncDiagnostics
```

## Verifications

Verification minimale frontend:

```powershell
Get-ChildItem P:\DEV\GitHub\App-MelodyQuest\assets\js -Recurse -Filter *.js | % { node --check $_.FullName }
node --test P:\DEV\GitHub\App-MelodyQuest\tests\confirmDialog.test.js
git -c safe.directory=* diff --check
rg -n "console\.|alert\(|debugger" P:\DEV\GitHub\App-MelodyQuest\assets
```

Smoke test recommande:

1. `#/public`: login/register et entree TV.
2. `#/main`: switch actif/passif, creation/rejoindre, liste publique.
3. `#/lobby`: reglages, categories, joueurs, partage, liaison TV.
4. Mode actif: `#/game`, champ reponse, timer, video cachee, solution, votes, classement.
5. Mode passif: lancement depuis lobby, lecture `#/autoplay`, retour automatique au lobby en fin de partie.
6. `/tv` + `#/tv-link`: QR, scan/saisie, affichage TV actif et TV passive sans score.
7. Pages `#/management*` si catalogue, suggestions ou analyse admin sont touches.

## Deploiement

Copier uniquement le runtime public:

```powershell
Copy-Item P:\DEV\GitHub\App-MelodyQuest\index.html P:\PROD\MelodyQuest\index.html -Force
Copy-Item P:\DEV\GitHub\App-MelodyQuest\robots.txt P:\PROD\MelodyQuest\robots.txt -Force
Copy-Item P:\DEV\GitHub\App-MelodyQuest\sitemap.xml P:\PROD\MelodyQuest\sitemap.xml -Force
Copy-Item P:\DEV\GitHub\App-MelodyQuest\favicon.svg P:\PROD\MelodyQuest\favicon.svg -Force
robocopy P:\DEV\GitHub\App-MelodyQuest\assets P:\PROD\MelodyQuest\assets /E /NFL /NDL /NJH /NJS /NP
```

`robocopy` retourne `1` quand des fichiers ont ete copies avec succes.

Le dossier `P:\PROD\MelodyQuest` ne doit pas contenir:

- `.git`
- `.github`
- `README.md`
- `AGENTS.md`
- docs internes
- `package.json`
- tests
- caches
- brouillons
- `output\`

Verification PROD:

```powershell
Get-ChildItem P:\PROD\MelodyQuest -Force |
  Where-Object { $_.Name -in @('README.md','AGENTS.md','.git','.github','output') }
```

## Nginx attendu

Le domaine `melodyquest.shinederu.ch` doit servir `P:\PROD\MelodyQuest` avec fallback vers `index.html`, notamment pour `/tv`.

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

## Points a surveiller

- Les performances YouTube sur certaines Smart TV restent variables selon navigateur, video et reseau.
- Ne pas restaurer le double lecteur TV sans nouvelle preuve qu'il corrige le probleme sans casser le son.
- Tester un vrai salon avec au moins deux joueurs si la modification touche `#/lobby`, `#/game`, votes, presence, scores ou suggestions.
- Tester `#/management-answers` avec des essais archives et a `800 x 480` si l'analyse ou le catalogue change.
- Tester `/tv` + `#/tv-link` si la modification touche le player, la TV, le mode passif ou le partage.
- Pour les changements responsive, verifier au minimum `800 x 480` en paysage sur l'appairage TV, une manche cachee, la solution TV, `#/game` et `#/autoplay`.
- Garder `#/lobby-list` et `#/autoplay-setup` pour compatibilite, meme si le flux principal passe par `#/main` et `#/lobby`.

## Checklist avant livraison

- Aucun secret ajoute.
- Aucun dossier temporaire inutile.
- Pas de `console.log`, `alert()` ou `debugger` dans le code applicatif.
- JS valide avec `node --check`.
- Tests Node valides avec `node --test tests\confirmDialog.test.js`.
- Cache-bust mis a jour si un asset deploye change.
- Runtime public copie en PROD si le changement touche le site.
- Aucun README/AGENTS/docs internes copies en PROD.
- Commit et push effectues sur `main` si la tache demande une livraison complete.
