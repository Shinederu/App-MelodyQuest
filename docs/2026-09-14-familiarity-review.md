# Connaissance des oeuvres et verification du catalogue

Release: `20260914-familiarity-review`. API associee: migration `023`.
Perimetre: App-MelodyQuest et App-MelodyQuest-API uniquement.

## Choix produit

- La question "Tu connaissais cette oeuvre ?" porte sur l'oeuvre a deviner,
  pas sur la musique precise. Elle apparait avec la solution, jamais avant.
- Le sondage est facultatif en mode actif, salon et passif. Il ne bloque ni
  les votes de manche ni le passage automatique et n'attribue aucun point.
- Une TV partagee n'est pas un votant: chacun repond sur son propre appareil.
- Un compte, ou une session invitee, conserve un avis modifiable par oeuvre.
  Rejouer une autre musique de cette oeuvre ne multiplie pas les votes.
- Le resultat affiche le pourcentage de Oui et le nombre de votes. Le joueur
  voit ce resultat seulement apres avoir choisi, pour limiter l'influence.
- L'admin retrouve l'agregat dans les oeuvres et l'editeur de validation.
  La note admin 1..10 et le filtre de notoriete du lobby restent independants.
  Un petit echantillon et les sessions invitees ne permettent pas de mesurer
  une notoriete universelle ou de garantir un votant unique par personne.

## Contrat technique

- `FamilyKnowledge.js`: widget partage, un GET par nouvelle solution revelee,
  POST au clic uniquement, aucun polling. Reponses obsoletes ignorees et
  nouvelle tentative explicite en cas d'erreur. Choix Oui/Non accessibles
  au clavier, etat `aria-pressed`, resultat annonce par `role=status`.
- `FamilyKnowledgeService.php`: identite joueur authentifiee, appartenance au
  salon et visibilite de la solution controlees avec le snapshot serveur.
  L'oeuvre est derivee de la manche courante, jamais d'un ID choisi par le client.
- `mq_family_knowledge`: cle unique oeuvre/compte ou oeuvre/session invitee,
  agregats partages mais choix individuel prive. L'expiration d'un invite
  anonymise son avis par `ON DELETE SET NULL`, sans conserver son pseudo.
- Pas de changement Auth/core, de nouvelle permission, de nouvel evenement
  Mercure ou de reglage du lecteur. Seeks, synchronisation et iframe TV
  restent ceux de la release precedente.

## Verification des musiques

`#/management-validation` accepte maintenant plusieurs milliers de pistes:

1. Filtrer par categorie ou chercher une oeuvre, une musique, un artiste ou
   une reference YouTube. La file est paginee, 50 pistes par page par defaut.
2. Choisir une piste. Sur mobile, la selection amene a l'editeur.
3. Regler le debut et la fin pres du lecteur. Les champs acceptent secondes,
   `m:ss` ou `h:mm:ss`; une fin vide signifie la fin naturelle de la video.
4. "Ecouter l'extrait" applique les bornes sans recharger a chaque frappe.
5. Corriger oeuvre, alias et metadonnees puis "Valider et continuer".
   Les secondes normalisees sont sauvegardees et la piste suivante est selectionnee.

Le contrat `listPendingTracks` renvoie `items`, `total` filtre, `pending_total`
global, `page`, `pages`, `page_size`. Ne plus compter `items.length` pour le
badge global. Pagination et filtres sont calcules par l'API.

## Corrections d'ergonomie

- Retours vers la gestion retires des sous-pages: la navigation existante
  propose deja "Vue d'ensemble". Compteurs et introductions repetes alleges.
- Filtres admin plus larges; boutons de la barre d'actions regroupes.
- Apercu et timecodes places avant les metadonnees dans la validation.
- Proposition publique et liaison TV: textes repetes ou inapplicables au
  mode passif retires. "Oeuvre a deviner" remplace le terme ambigu de morceau.
- Un nouveau lien partage prend la priorite sur l'ancien salon memorise.
- Ordre du bouton de manche suivante corrige en mode salon sur mobile.
- Une navigation de page repart en haut; aucun recentrage lors des snapshots
  de jeu, aucun header rendu fixe a l'ecran.

## Controles realises

- 27 tests frontend, 39 tests unitaires PHP, 12 tests d'integration MySQL.
- Integration exclusivement sur `mq_ui_test`, serveur local jetable, jamais
  sur `ShinedeCore`. Vote cache avant revelation, membre non autorise,
  votes comptes/invites, modification sans doublon, anonymisation, passif,
  pagination, timecodes et sauvegarde de remise en attente couverts.
- Syntaxe: 43 modules JS, service worker et 54 fichiers PHP. Manifest PWA
  regenere; checks de diff propres.
- Navigateur integre, donnees de test: accueil, presentation, lobby,
  jeu actif/salon/passif, liaison TV/QR, proposition de musique et les sept
  pages admin parcourus. Largeurs principales 390, 800 et 1366 pixels.
- Validation: edition `0:05` -> `1:05`, apercu borne et sauvegarde 5/65 secondes
  verifies en DB locale, puis selection de la piste suivante.
- Vote actif: Oui puis Non donne toujours un seul avis. En passif 800 x 480,
  solution longue, sondage et volume restent visibles; fin de partie -> lobby.
- TV 800 x 480 liee: QR, attente, solution, categorie, compteur, votes et
  classement observes. Actions joueur au-dessus de la page verifiees.
- Aucune erreur console dans les deux onglets de verification finale.

Limites: ce sont des tests dans un navigateur de bureau avec tailles simulees,
pas une certification de tous les navigateurs de Smart TV. La restitution
audio et la synchronisation sur des appareils physiques n'ont pas ete
requalifiees. Les inscriptions, mails et suppressions reelles n'ont pas ete
declenches sur le catalogue de production.

## Operation exceptionnelle sur le catalogue

Demande explicite: remettre toutes les musiques en attente pour permettre la
verification manuelle des timecodes. Aucun effacement de piste, d'oeuvre,
d'alias, de score ou d'historique.

Outil source: `App-MelodyQuest-API/scripts/recheck_catalog.php`. Dry-run par
defaut, confirmation du nom de DB et du nombre attendu, refus si un salon
joue, sauvegarde JSON exclusive hors PROD avant UPDATE et comparaison de
toutes les metadonnees protegees dans une transaction.

Operation executee le 14 septembre 2026 a 19:37 (Europe/Zurich):

- Precontrole: 2 726 pistes validees, aucune en attente, aucun salon en cours.
- Apres transaction: 2 726 pistes en attente, aucune piste encore validee.
- Sauvegarde: `P:\ARCHIVE\MelodyQuest\2026-09-14-before-timecode-review-193737.json`.
  Les 2 726 lignes completes ont ete relues et verifiees. SHA-256:
  `4d29a32194d12868acb7554ba0eacdeb8be3bbff87c6a3aa1732f140bda94b83`.
- Comparaison independante live/backup: aucune difference hors validation et
  date de modification. Totaux inchanges: 2 146 oeuvres, 74 salons,
  29 propositions joueurs et 57 sessions archivees.
- API de verification: 50 pistes sur la premiere page, 55 pages, total 2 726.
- Migration 023 appliquee, source frontend `47ff3a4` et API `eb059c0` poussees
  sur `origin/main`. 25 fichiers publics frontend et 4 fichiers runtime API
  deployes, empreintes source/PROD identiques. Les fichiers non-runtime restent
  dans DEV et aucun secret n'a ete copie.
- Verification HTTP live: page, nouveau module et catalogue repondent;
  agregats de connaissance presents. Aucun faux vote ou faux ajout live.
  Un controle sans cookie a revele une creation de session invitee inutile
  avant le refus d'acces au salon. Les deux routes du sondage utilisent
  maintenant une identite existante et refusent sans creer de session (401).

**Ne pas rejouer cette operation** apres le debut de la verification manuelle.
Elle ne fait pas partie d'un deploiement normal. Sans piste revalidee, aucune
nouvelle partie ne dispose de musique jouable. Les pistes revalidees redeviennent
disponibles progressivement. Aucun envoi de 2 726 mails n'est effectue.

Pour reprendre: lire les deux README/AGENTS, ce document et les migrations
022/023. Sources dans DEV/GitHub, runtime seul dans PROD; scripts, SQL, tests,
documentation et sauvegardes ne sont jamais deployes publiquement.
