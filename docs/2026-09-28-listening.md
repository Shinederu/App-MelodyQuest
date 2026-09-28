# Ecran d'ecoute et cadre 16:9 - 2026-09-28

## Perimetre

Frontend MelodyQuest uniquement. Actif, passif, TV active et TV passive.
Release `20260928-listening`. Aucun changement de DB, Auth, API, protocole,
prechargement, synchronisation, volume ou cycle de vie du lecteur YouTube.

## Interface

- « Video cachee » devient « Reponse cachee », avec « Reponse dans N s ».
- La categorie occupe le centre de la zone opaque pendant l'ecoute. L'option
  `show_track_category` reste respectee; les titres des œuvres restent caches.
- A la revelation, la categorie accompagne la solution, sans doublon sous le
  lecteur pendant l'ecoute. Le mode salon sans lecteur reste inchange.
- Cinq barres ambre animees par `transform` uniquement evoquent l'ecoute. Ce
  n'est pas un indicateur de chargement reel ou un analyseur audio. Aucun timer,
  appel reseau ou nouvelle dependance n'est ajoute. Animation decorative,
  ignoree par les lecteurs d'ecran et desactivee en mouvement reduit.
- Le cadre est toujours en 16:9, avec la meme taille avant/apres revelation.
  La contrainte de hauteur se traduit en largeur maximale pour ne pas etirer
  la video. Les dimensions internes du player TV masque (192x108) sont inchangees.

## Verification

`scripts/check-listening-layout.mjs` ouvre un Chrome isole et ferme navigateur
et serveur a la fin. Les vues et methodes de presentation sont reelles; l'iframe
est factice et les appels API/YouTube ne sont pas executes. Ce test n'atteste
donc pas une lecture YouTube reelle ou une partie multijoueur en reseau.

Formats: 1920x1080, 1366x768, 1024x768, 800x480, 390x844, 320x568, 844x390.
Modes: actif, passif, TV active, TV passive. Etats: preparation, ecoute,
revelation puis nouvelle ecoute. Verification du ratio, stabilite de taille,
masque, conservation de l'iframe, absence de debordement horizontal et contenu
centre non tronque. Cas complementaires: categorie longue/desactivee et
`prefers-reduced-motion`. Les controles unitaires sont dans `listening.test.js`.

Captures locales: `P:\DEV\Temp\melodyquest-listening-20260928`.
Ni les fixtures, ni les scripts, ni les captures ne doivent aller dans PROD.

Resultats: 45 tests unitaires frontend valides et 112 etats de presentation
valides dans Chrome isole. Inspection visuelle des captures PC, mobile et TV
800x480. Le navigateur integre n'a pas pu demarrer; les tests visuels utilisent
un navigateur de test independant, sans acceder aux onglets utilisateur.
