# Guide Agents - MelodyQuest

Ce depot contient le frontend statique MelodyQuest. Il doit rester simple a reprendre: pas de build obligatoire, pas de backend local et pas de dependance Node runtime.

## Priorite produit

MelodyQuest est le seul produit en developpement continu. Les idees et pistes
documentees ne sont toutefois pas des taches automatiques: les implementer
uniquement apres priorisation explicite d'un besoin concret. Garder le perimetre
borne et choisir le plus petit changement complet; ne pas creer un service, un
flux, une table ou une dependance durable « au cas ou ».

## Lecture de demarrage

1. Lire `P:\AGENTS.md`.
2. Lire `P:\ECOSYSTEM.md`.
3. Lire `P:\DEV\GitHub\AGENTS.md`.
4. Lire ce fichier.
5. Lire `README.md`.
6. Si le changement touche l'API, la DB, les droits, les salons, les scores, le player, la TV ou Mercure, lire aussi:
   - `P:\DEV\GitHub\App-MelodyQuest-API\README.md`
   - `P:\DEV\GitHub\App-MelodyQuest-API\AGENTS.md`
   - `P:\DEV\GitHub\App-MelodyQuest-API\sql\`

## Source de verite

- Frontend DEV: `P:\DEV\GitHub\App-MelodyQuest`
- Frontend PROD: `P:\PROD\MelodyQuest`
- Backend DEV: `P:\DEV\GitHub\App-MelodyQuest-API`
- Backend PROD: `P:\PROD\API\melodyquest`
- Endpoint front: `https://melodyquest.shinederu.ch/`
- Endpoint API: `https://api.shinederu.ch/melodyquest/`
- Hub Mercure: `https://mercure.shinederu.ch/.well-known/mercure`

Le repo frontend ne contient pas de dossier `client/` ou `backend/` actif. Ne pas recreer ces miroirs sans demande explicite.

## Etat a preserver

- MelodyQuest a deux modes: `participative` (actif) et `autoplay` (passif).
- Le mode passif passe par un vrai salon, garde le partage et la liaison TV, puis revient au lobby en fin de partie.
- La TV utilise un lecteur YouTube iframe simple. Le double lecteur TV et `markTvRoundReady` ont ete abandonnes.
- YouTube reste la source principale. Ne pas introduire d'hebergement audio local.
- La presence est manuelle: un joueur ou le createur bascule present/absent; fermer l'onglet ne marque pas automatiquement absent.
- Les pages management reposent sur la permission backend `melodyquest.catalog.manage`.
- Toute suppression de catalogue ou de salon demande une confirmation nommee via `confirmDialog.js`.

## Organisation

- `index.html`: point d'entree, configuration API publique et cache-bust global.
- `assets/css/main.css`: style global sombre/responsive.
- `assets/views/*View.html`: fragments HTML par route.
- `assets/js/controller/*Controller.js`: logique par vue.
- `assets/js/model/`: header/utilisateur.
- `assets/js/utils/`: helpers HTTP, lobby, horloge, UI, YouTube, QR, wake lock.
- `assets/js/vendor/`: bibliotheques vendorees navigateur.
- `tests/` et `package.json`: tests locaux, jamais deployes en runtime public.

Helpers a reutiliser:

- `ui.js`: echappement HTML/attribut, recherche, slugs, dates, avatars, rangs.
- `confirmDialog.js`: modale partagee pour confirmer les suppressions destructives.
- `youtube.js`: extraction/build d'URL YouTube, API iframe.
- `ClockSync.js`: synchronisation d'horloge backend/client.
- `LobbyState.js`: stockage du lobby courant.

Le dossier `output/` n'est pas requis. S'il reapparait vide, il peut etre supprime.

## Routes

- Publiques: `#/public`, `#/suggest-track`, `/tv`
- Joueur: `#/main`, `#/lobby`, `#/game`, `#/result`, `#/autoplay`, `#/tv-link`
- Compatibilite: `#/lobby-list`, `#/autoplay-setup`
- Admin: `#/management`, `#/management-categories`, `#/management-families`, `#/management-tracks`, `#/management-validation`, `#/management-suggestions`, `#/management-answers`

## Cache-bust

Quand un JS, une vue HTML ou le CSS change, mettre a jour:

- `index.html`;
- `assets/js/controller/AppController.js`;
- les imports directs des modules touches si besoin.

Format conseille: `YYYYMMDD-sujet`.

Cache-bust courant: `20260828-wake-theme`.

Le theme visuel partage la palette de ShinedeWake: surfaces charbon, action
principale ambre/orange, information bleue, succes vert menthe et danger
corail. Conserver ces roles semantiques lors des evolutions UI.
Ne pas creer de degrade direct ambre-bleu: utiliser ambre-orange pour les
transitions continues et garder le bleu dans un composant ou un fond separe.

Le CSS contient un profil paysage compact pour les petits ecrans autour de `800 x 480`. Toute modification de la TV, de `#/game` ou de `#/autoplay` doit conserver un viewport sans debordement horizontal a cette resolution.

## Verification

Verification minimale:

```powershell
Get-ChildItem P:\DEV\GitHub\App-MelodyQuest\assets\js -Recurse -Filter *.js | % { node --check $_.FullName }
node --test P:\DEV\GitHub\App-MelodyQuest\tests\confirmDialog.test.js
git -c safe.directory=* diff --check
rg -n "console\.|alert\(|debugger" P:\DEV\GitHub\App-MelodyQuest\assets
```

Smoke test a privilegier selon la zone touchee:

1. `#/public`: connexion et inscription.
2. `#/main`: switch actif/passif, creation/rejoindre, liste publique.
3. `#/lobby`: reglages, joueurs, partage, TV.
4. `#/game`: reponse, video cachee, solution, votes, classement.
5. `#/autoplay`: lecture passive et retour lobby en fin de partie.
6. `/tv` + `#/tv-link`: QR et liaison.
7. `#/management*`: catalogue, suggestions et analyse admin.

## Deploiement

Copier uniquement les fichiers runtime publics vers `P:\PROD\MelodyQuest`:

- `index.html`
- `assets\css\`
- `assets\views\`
- `assets\js\`
- assets publics necessaires au navigateur

Ne pas copier:

- `.git`, `.github`
- `README.md`, `AGENTS.md`
- docs internes
- `package.json`
- tests, caches, brouillons
- `output\`

Commande type:

```powershell
Copy-Item P:\DEV\GitHub\App-MelodyQuest\index.html P:\PROD\MelodyQuest\index.html -Force
robocopy P:\DEV\GitHub\App-MelodyQuest\assets P:\PROD\MelodyQuest\assets /E /NFL /NDL /NJH /NJS /NP
```

## Encodage

Les fichiers UI contiennent du texte francais avec accents. En PowerShell, preferer:

```powershell
Get-Content -Encoding UTF8 <fichier>
```

Cela evite l'affichage mojibake dans les terminaux qui lisent l'UTF-8 sans BOM comme ANSI.
