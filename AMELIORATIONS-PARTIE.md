# Notes d'amelioration apres partie

Document de reprise pour les ameliorations observees pendant une vraie partie.
Ces points ne sont pas encore implementes sauf mention contraire. Ils servent a
clarifier le besoin avant une prochaine passe frontend/API/DB.

Date des notes: 2026-06-15.

Passe appliquee le 2026-06-15 (`20260615-playtest-improvements`):

- auto-focus du champ reponse rendu moins agressif;
- mode absent/inactif ajoute, avec joueurs absents exclus des votes;
- exclusion/quitte non destructif cote score;
- solution renvoyee au joueur qui a trouve avant revelation globale;
- historique des essais enregistre en DB et affiche selon les droits de vision;
- historique local de saisie ajoute: fleche haut/bas reprend les dernieres
  reponses envoyees depuis ce navigateur;
- bloc des essais rates stabilise;
- debut de lecture des pistes expose en management/validation;
- equilibrage categories confirme cote API existante.

Passe appliquee le 2026-06-16 (`20260616-game-flow-fixes`):

- focus du champ reponse replace au vrai debut des manches apres synchronisation;
- essais rates visibles pendant la manche apres mauvaise reponse;
- reponses/essais entre joueurs ayant trouve rafraichis via etat personnel;
- presence automatique `inactive` retiree: seul le joueur bascule present/absent;
- exclusion joueur disponible depuis le lobby et depuis le classement de partie;
- ecran resultat redirige automatiquement vers le jeu si le createur relance une partie.

Passe appliquee le 2026-06-16 (`20260616-answer-default-80`):

- nouveaux salons crees avec une precision de validation des reponses a `80%` par defaut;
- fallback de l'ecran de reglages aligne sur `80%`;
- aucune modification de strategie player.

Passe appliquee le 2026-06-16 (`20260616-owner-presence`):

- le createur peut mettre un autre joueur absent ou present depuis le lobby;
- la meme action est disponible depuis le classement de partie;
- aucune modification de strategie player.

Passe appliquee le 2026-06-16 (`20260616-answer-visibility`):

- derniers essais rates visibles limites a 5;
- affichage joueur des reponses limite aux reponses validees ayant donne des points;
- historique complet des tentatives conserve cote API/DB pour un futur usage admin/statistiques;
- joueurs absents credites de 10% des points du premier joueur qui trouve la manche;
- aucune modification de strategie player.

Points encore a affiner apres nouveaux tests reels:

- qualite exacte des delais d'inactivite (`MQ_PLAYER_INACTIVE_TIMEOUT_SECONDS`);
- ergonomie finale du panneau des reponses proposees selon le volume d'essais;
- exploitation admin des essais comme source d'alias ou statistiques.

## Priorite haute - confort de jeu

### Auto-focus du champ reponse trop agressif

Constat: le champ de reponse reprend le focus trop souvent.

Effets observes:

- sur desktop, cela peut interrompre un scroll ou une interaction dans un menu;
- sur mobile, si le joueur masque le clavier pour lire les informations sous le
  champ, le focus revient et le clavier reapparait.

Attendu:

- garder un focus pratique au debut d'une manche;
- ne pas reprendre le focus si le joueur a volontairement clique ailleurs,
  masque le clavier, ouvert un panneau, scrolle ou interagit avec les reglages;
- limiter le refocus automatique aux moments vraiment utiles: debut de manche,
  retour volontaire au mode reponse, ou apres validation si le champ est encore
  naturellement actif.

Zone probable: frontend `GameController`, gestion focus/mobile.

### Reponse trouvee affichee comme inconnue

Constat: lorsqu'un joueur trouve, la video se revele, mais le bloc de reponse
peut afficher `reponse inconnue` au lieu d'afficher aussi la bonne reponse.

Attendu:

- des qu'un joueur a trouve, il doit voir clairement la solution;
- l'oeuvre/reponse principale doit rester plus visible que les details de piste;
- l'affichage doit rester coherent avec l'etat revele partiel ou global.

Zone probable: frontend `GameController` + payload API de l'etat de manche.

### Garder les points gagnes visibles

Constat: l'affichage des points gagnes ne doit pas disparaitre trop vite au
moment ou la solution apparait.

Attendu:

- conserver les points gagnes pendant la phase de solution;
- permettre au joueur de comprendre pourquoi le classement a bouge.

Zone probable: frontend `GameController`, rendu solution/classement.

### Stabiliser les essais rates

Constat: la zone `Derniers essais rates` apparait/disparait et fait bouger
l'interface au debut des manches.

Attendu:

- garder la zone visible tout le temps;
- afficher un etat vide discret quand aucun essai rate n'existe;
- eviter les mouvements de layout pendant la saisie.

Zone probable: frontend HTML/CSS/game.

### Texte duplique sur les mauvaises reponses

Constat: `mauvaise reponses` apparait deux fois.

Attendu:

- garder une seule information claire;
- corriger aussi l'accent/pluriel si necessaire: `mauvaises reponses`.

Zone probable: frontend `GameController` ou fragment `gameView.html`.

## Fin de manche et informations visibles

### Afficher les reponses proposees apres revelation

Constat: les fautes et propositions des joueurs sont amusantes et peuvent faire
partie de l'ambiance de la partie.

Attendu:

- quand la solution est revelee a tout le monde, afficher les entrees proposees
  par les joueurs;
- afficher ces reponses de facon lisible et compacte;
- eviter de polluer la phase de recherche avant revelation.

Zone probable: API et frontend. Il faut que l'API conserve et expose les essais
utiles de la manche.

### Partage des reponses entre joueurs qui ont deja trouve

Constat: si plusieurs joueurs ont trouve avant la fin du timer, ils pourraient
voir les reponses trouvees des autres joueurs.

Attendu:

- un joueur qui a trouve peut voir les reponses des autres joueurs qui ont
  aussi trouve;
- un joueur qui n'a pas encore trouve ne doit pas voir ces reponses avant la
  revelation globale;
- apres revelation globale, tout le monde peut voir les propositions utiles.

Zone probable: API round state avec filtrage par utilisateur + frontend.

## Presence, lobby et joueurs

### Mode absent / AFK

Constat: un joueur peut partir temporairement sans quitter le salon.

Attendu:

- ajouter un mode `absent`;
- un joueur absent reste visible mais n'est plus attendu pour les reponses,
  votes skip ou votes de manche suivante;
- le joueur peut se remettre present sans perdre son score.

Zone probable: API lobby/player state + frontend lobby/game.

### Ne plus attendre les joueurs qui ont quitte la page

Constat: si un joueur ferme l'onglet ou quitte la page, la partie peut continuer
a l'attendre.

Attendu:

- detecter l'absence de heartbeat ou de presence active;
- marquer le joueur comme inactif/absent apres un delai raisonnable;
- ne plus l'attendre pour les votes et transitions;
- garder son score pour un retour eventuel.

Zone probable: API presence/heartbeat + Mercure + frontend lifecycle.

### Le createur du salon peut retirer un joueur

Constat: le createur doit pouvoir gerer les joueurs du salon.

Attendu:

- proposer une action claire pour retirer un joueur;
- reserver l'action au createur du salon ou a un role autorise;
- ne pas supprimer le score historique du joueur retire;
- si le joueur revient avec le meme compte, restaurer son score dans le salon si
  c'est encore pertinent.

Zone probable: API lobby permissions + frontend lobby.

## Catalogue et selection musicale

### Ajouter un debut de lecture par piste

Constat: certaines videos ont une intro trop longue avant la partie utile.

Attendu:

- ajouter un champ de demarrage en secondes sur les pistes;
- utiliser ce decalage au lancement du lecteur;
- rendre le champ modifiable dans l'administration/validation;
- conserver `0` par defaut pour les pistes sans intro.

Zone probable: DB `mq_*`, API catalogue/round, frontend management et player.

### Reduire le trop de suggestions

Constat: il y a trop de suggestions ou de points de suggestion visibles pendant
la partie.

Attendu a clarifier:

- identifier si le probleme concerne le nombre de boutons de suggestion, la
  frequence d'apparition, le contenu de la modale ou la liste admin;
- simplifier l'acces sans retirer la possibilite de proposer une correction.

Zone probable: frontend game/suggestion modal, potentiellement management.

### Eviter de retomber trop souvent sur les memes musiques

Constat: on a l'impression que les memes pistes reviennent souvent entre les
parties.

Attendu:

- reduire les repetitions recentes;
- tenir compte de l'historique de parties ou de l'historique local du salon;
- ne pas bloquer la generation si le catalogue selectionne est petit;
- garder une part de hasard.

Zone probable: API selection des rounds + historique DB ou cache recent.

### Equilibrer les categories selectionnees

Constat: quand plusieurs categories sont choisies, la selection doit etre
equilibree.

Attendu:

- prendre un nombre equivalent de musiques dans chaque categorie selectionnee;
- si une categorie n'a pas assez de musiques, prendre le maximum disponible;
- redistribuer les manches restantes entre les autres categories;
- eviter qu'une categorie majoritaire ecrase les autres.

Zone probable: API generation de playlist/manches.

### Exploiter les reponses joueurs comme source d'amelioration

Idee: enregistrer certaines reponses proposees par les joueurs pour aider a
ajouter des alias, corriger les libelles ou identifier des pistes a enrichir.

Points d'attention:

- ne pas transformer toutes les fautes en alias automatiquement;
- passer par une page d'administration/revue;
- limiter le bruit et les doublons;
- respecter le contexte utilisateur et ne pas exposer inutilement des donnees
  nominatives.

Zone probable: API stockage des essais + management suggestions/alias.

## Questions ouvertes avant implementation

- Quel delai avant de considerer un joueur hors page comme inactif ?
- Le retrait automatique d'un joueur doit-il seulement le passer absent, ou le
  sortir vraiment du salon ?
- Le score conserve apres exclusion doit-il survivre jusqu'a la fin du salon
  uniquement, ou aussi apres fermeture/recreation ?
- Le champ de debut de lecture doit-il etre visible uniquement admin, ou aussi
  pendant la validation des propositions publiques ?
- Que signifie exactement `trop de suggestion`: trop de boutons cote joueur,
  trop de suggestions admin, ou trop de propositions generees ?
