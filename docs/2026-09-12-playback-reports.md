# Ergonomie et videos indisponibles

Release frontend: `20260912-playback-reports`. API: migration additive `022`.

## Interface

- Categorie sous la video en actif, passif et TV, avec le style discret du site.
  Une seule occurrence lorsque la solution apparait; le reglage du salon reste respecte.
- Bouton de menu et tiroir a droite. Fiche joueur avec avatar, pseudo et etat
  compte/invite. Pas d'acces Administration dans le tiroir de partie.
- Actions du createur dans le lobby via `PlayerActions.js`, dialog natif hors
  des conteneurs avec overflow. Identifiants invites negatifs conserves.
- Modale de proposition: correction ou demande de suppression avec motif.
  La demande ne supprime rien. L'administrateur peut la refuser ou confirmer
  une suppression nommee. Une piste referencee par une manche reste protegee
  par la FK; fermer/reinitialiser le salon archive son historique avant nettoyage.

## Video indisponible

Les erreurs [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference#onError)
`100`, `101` et `150` declenchent un signalement. Les erreurs `2`, `5`, `153`,
le buffering, l'absence de reseau et le blocage d'autoplay ne le declenchent pas.
Il s'agit d'un constat du lecteur client, pas d'une verification universelle
de disponibilite par le serveur.

Le serveur verifie l'appartenance au salon ou le jeton d'une TV liee, la manche
courante et sa reference YouTube. Il cree au plus un signalement automatique
en attente par video, visible dans les propositions et notifie par le mail de
moderation existant, best-effort apres la reponse HTTP.

Un membre peut signaler; seul un constat du createur ou d'une TV liee programme
le passage du salon. Ainsi un probleme isole chez un participant ne coupe pas
la musique chez tous les autres. L'echeance est fixee par MySQL a six secondes,
transmise dans les snapshots ordinaires. Les clients affichent le message,
cessent de synchroniser le lecteur defaillant et demandent le passage a terme.
L'API verrouille la manche: les appels simultanes ne peuvent pas sauter deux
musiques. Une proposition en cours retient encore le passage. Les anciennes
requetes et les erreurs d'un lecteur de prechargement sont ignorees.

La nouvelle manche reprend le lecteur existant; aucun changement des seuils,
du nombre d'iframes TV, de la qualite YouTube ou de la synchronisation saine.
Une video signalee reste au catalogue tant qu'un administrateur ne la corrige
ou ne la supprime pas. Aucun effacement d'historique ni purge n'est ajoute.

## Verification

- Tests JS: filtrage des erreurs, callbacks obsoletes, deduplication, absence
  d'effet sur une lecture saine, attente de l'echeance et branche de rendu jeu.
- Integration MySQL jetable: droits compte/invite/TV, erreurs transitoires,
  deduplication DB, echeance six secondes, protection des propositions, passage
  idempotent, fin passive, suppression avec confirmation stricte et historique conserve.
- Migration 022 executee deux fois sur la DB locale pour verifier sa reprise.
- Navigateur integre: presence/exclusion d'un invite, menu de partie, proposition
  de suppression et confirmation admin annulee, categorie et solution, TV liee.
- Verification visuelle ordinateur 1366x768, telephone 390x844 et TV 800x480.
  Le contenu TV tient dans le viewport. Les iframes YouTube restent about:blank
  dans le navigateur de test: l'audio et un appareil TV physique ne sont pas certifies.

## Idee en attente: votes de notoriete

Pas activee dans cette livraison. Proposition: question facultative apres la
revelation, Oui/Non, un vote par participant et par oeuvre/piste, avec choix
du niveau exact a definir. Afficher le pourcentage et le nombre de votants;
ne pas le presenter comme une mesure universelle de popularite ni remplacer
directement la note editoriale 1..10. Prevoir un minimum de reponses et un
traitement des invites avant de modifier le filtrage des salons.

## Livraison

Commit/push main des deux depots. Migration 022 avant runtime API, puis frontend.
PROD recoit seulement index, assets et PWA pour le front, et les fichiers PHP
runtime modifies pour l'API. Aucun test, SQL, documentation ou secret copie.
