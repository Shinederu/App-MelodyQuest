# Base a 60 et avis definitif

Version `20260915-notoriety-votes`; remplace les regles de la premiere livraison
du 15 septembre decrite dans `2026-09-15-notoriety-slider.md`.

- Toute nouvelle œuvre commence a 60 %. L'administration propose 60/75/100.
- Migration API 025: toutes les estimations existantes passent a 60 une fois,
  sans effacer les avis, validations, timecodes ou historiques. Rejouer preserve
  les estimations manuelles saisies apres migration. Ne pas rejouer le reset
  de validation du 14 septembre.
- Formule conservee: `floor((10 * seed + 100 * Oui) / (10 + nombre_avis))`.
  Sans avis: 60; premier Non: 54; premier Oui: 63. Pas de faux vote initial.
- Lobby inchange: Tout / Connues >= 60 / Tres connues >= 90. Defaut Tout.
- Sondage reserve aux comptes connectes. Les invites jouent normalement mais
  ne voient pas le sondage et ne peuvent pas appeler son API.
- Un seul avis definitif par compte et œuvre, pas un nouvel avis a chaque piste.
  Le premier choix est conserve sur doublon par une ecriture atomique utilisant
  la cle unique existante. Le serveur renvoie ce choix et `can_vote: false`.
- Les boutons sont desactives pendant la lecture de l'etat puis apres le vote,
  y compris si la reponse est Non. L'interface ne permet pas de changer d'avis.
- Les anciens avis invites ne sont pas supprimes. Les comptes multiples restent
  une limite; aucune nouvelle collecte d'IP ou empreinte appareil n'est ajoutee.

## Verification

32 tests frontend, 42 tests unitaires API et 13 tests d'integration locale passes.
Les tests couvrent comptes/invites, solution cachee/revelee, premier Oui/Non,
doublons, nouveau service/reconnexion logique et autre piste de la meme œuvre.
La migration a ete rejouee sur la base jetable avec comparaison des pistes et avis;
les estimations manuelles ulterieures sont preservees.

Navigateur local: sondage cache avant revelation; apres revelation, vote Non sur
une œuvre a 60, affichage 54 % / 1 avis, boutons verrouilles. Le controle visuel
du rechargement n'a pas ete conclu (ralentissement de la base locale sur le partage);
la persistance est couverte par le test d'integration. Aucun lecteur modifie.

## Deploiement

Sauvegarder, appliquer 025, deployer le runtime API, puis les assets frontend.
Ne copier ni SQL, tests, documentation, outils ni secrets en PROD.
La verification live reste en lecture seule: pas de vote artificiel ni nouvelle
partie dans le catalogue de production.
