# Notoriete des oeuvres et curseur du lobby

Version: `20260915-notoriety-slider`. API: migration additive 024.

## Regles produit

- Un curseur natif a trois crans remplace la liste du lobby, actif comme passif.
- Tout: aucun minimum. Connues: au moins 60 %. Tres connues: au moins 90 %.
- Les libelles sont toujours visibles, le choix actif est souligne par la couleur,
  et `aria-valuetext` indique le seuil au lecteur d'ecran. Fleches, Home/End et
  glissement fonctionnent. Seul le createur peut modifier le reglage.
- Comptages locaux, verification du nombre de musiques, tirage et preloads
  utilisent le meme minimum. L'equilibrage entre categories reste en place.
- Aucun changement des lecteurs YouTube, de la synchronisation ou du rendu TV.

## Calcul et edition

La notoriete appartient a l'oeuvre (`mq_families`), pas a chaque musique.
L'estimation initiale propose 50, 75 ou 100 %, par defaut 50. Elle est editable
dans Oeuvres, Musiques et A valider. Reutiliser une oeuvre recupere son estimation.
Les champs musique/validation n'envoient cette valeur que si elle a ete changee
explicitement; corriger une URL ou valider une autre piste ne la remet pas a 50.

Score utilise: `floor((10 * estimation + 100 * Oui) / (10 + nombre_avis))`.
Le poids initial de 10 amortit les premiers votes; les avis dominent progressivement.
Exemple: une oeuvre estimee a 100 avec un Non reste a 90. Aucun faux vote n'est
insere. Les avis anonymises sont conserves et les votes comptes restent uniques
par oeuvre. Le brut `known_percent` existe toujours; l'UI affiche le score pondere
sous le nom Notoriete, jamais comme une proportion brute de repondants.

## Fichiers et contrats

- Front: `Notoriety.js` pour les trois seuils, comptes et champ partage;
  `LobbyController.js`, les trois controles management et leurs vues;
  `FamilyKnowledge.js` pour le libelle du score; `play-layout.css` pour le curseur.
- API: `utils/notoriety.php` centralise calcul et validation; `CatalogService`,
  `FamilyKnowledgeService` et les trois filtres de `LobbyService` l'utilisent.
- Colonnes ajoutees: `mq_families.notoriety_seed`, `mq_lobbies.min_notoriety`.
- API `listCategories`: `track_counts_by_notoriety`, indexe par score entier.
- API familles/sondage: `notoriety_seed`, `notoriety_percent`, plus les anciens
  agregats et la reponse personnelle du sondage deja autorisee.
- Entree legacy `min_familiarity`: 1 -> 0, 2..8 -> 60, 9..10 -> 90.
  `min_notoriety` a priorite. Les anciennes notes DB restent conservees.

## Migration et reprise

Appliquer 024 avant le runtime API puis le frontend. Elle initialise une seule
fois les oeuvres depuis la moyenne des anciennes notes (preset le plus proche)
et traduit les seuils existants. Elle est rejouable sans recalculer les estimations.
SQL, tests, docs et outils restent exclusivement en DEV; runtime PROD par liste
autorisee documentee dans les deux README. Regenerer l'inventaire PWA.

Ne jamais relancer la remise en attente du 14 septembre: les validations et
timecodes saisis depuis sont a conserver, ainsi que les votes et historiques.

## Verifications realisees

- 30 tests frontend, 41 tests unitaires PHP, 13 tests d'integration MySQL locaux.
- Migration 024 rejouee; assertions de conservation des pistes, validations,
  avis et estimation editee; tests des seuils inclusifs et du filtre preloads.
- Analyse syntaxique de tous les JS et PHP, inventaire PWA regenere.
- Navigateur local: crans 0/60/90, compte 3/2/1, enregistrement et rechargement,
  fleches/Home/End, glissement; captures desktop, 390x844, 320x568, 800x480.
- Gestion: modifier l'estimation en validant une piste se repercute sur la
  suivante de la meme oeuvre; modifier seulement un titre garde l'estimation.
- Salon passif: filtre 90 %, persistance et lecture seule verifiee en rejoignant
  avec un invite non createur.
- Aucun test automatique ne remet le catalogue live en attente ou n'y ajoute
  de fausse proposition. La DB d'integration est uniquement `mq_ui_test` sur loopback.

Limites: le sondage reste volontaire, non representatif et non resistant aux
sessions invitees multiples. Le score peut evoluer entre l'ouverture des reglages
et le tirage; l'API reste autoritaire. L'estimation ne remplace pas les avis reels.
