# Notes d'amelioration de partie

Ce document sert de memoire de reprise pour les observations faites pendant les tests reels de MelodyQuest. Il ne remplace pas `README.md`: les comportements deja stabilises sont documentes dans le README frontend/API, et ce fichier garde surtout l'historique produit et les points a surveiller.

Date initiale des notes: 2026-06-15.

## Etat actuel des retours appliques

### Confort de saisie

Applique:

- auto-focus limite au vrai debut de manche;
- pas de refocus agressif pendant le scroll, les menus ou une interaction volontaire;
- historique local de saisie avec fleche haut/bas;
- derniers essais rates visibles et limites a 5;
- zone d'essais stabilisee pour eviter les mouvements de layout;
- correction des textes redondants autour des mauvaises reponses.

Points a surveiller:

- sur mobile, verifier regulierement que le clavier ne reapparait pas apres une action volontaire;
- garder l'action principale visible sans pousser la solution hors ecran.

### Solution et fin de manche

Applique:

- un joueur qui trouve voit la solution sans attendre la revelation globale;
- les joueurs ayant trouve peuvent voir les reponses validees des autres joueurs ayant trouve;
- les joueurs qui n'ont pas trouve ne voient pas ces reponses avant revelation globale;
- apres revelation, l'interface affiche la solution et garde les points gagnes visibles;
- les reponses affichees aux joueurs sont uniquement celles qui ont donne des points, pas l'historique complet.

Point a surveiller:

- si une piste manque de metadata, l'UI doit afficher une solution lisible plutot que `reponse inconnue`.

### Presence et joueurs

Applique:

- presence manuelle `present` / `absent`;
- le joueur peut se mettre absent/present;
- le createur peut mettre un joueur absent/present;
- le createur peut exclure un joueur;
- l'exclusion est non destructive pour l'historique de score;
- un joueur absent ne bloque pas les votes ou transitions;
- un joueur absent recoit 10% des points du premier joueur qui trouve.

Decision produit:

- la fermeture d'onglet ne marque plus automatiquement le joueur absent;
- si un joueur ferme sa page, le createur doit l'exclure ou le passer absent.

Point a surveiller:

- en partie longue, verifier que les votes et transitions ignorent bien tous les joueurs absents ou exclus.

### Catalogue et selection musicale

Applique:

- debut de lecture configurable par piste (`start_offset_seconds`);
- champ disponible dans les pages de gestion/validation;
- categories equilibrees lors du tirage quand plusieurs categories sont selectionnees;
- seuil de precision des reponses configurable, `80%` par defaut;
- historique des tentatives conserve en DB;
- page admin `#/management-answers` pour exploiter les tentatives comme source d'alias/corrections/idees;
- page admin `#/management-suggestions` pour editer, refuser, traiter ou appliquer les suggestions.

Points a surveiller:

- l'impression de repetition entre parties peut revenir si le catalogue selectionne est petit;
- une future passe pourrait ajouter une vraie logique anti-repetition inter-parties, sans bloquer les petits catalogues.

### Mode TV et player

Applique:

- TV liee par QR/code;
- mode joueur de salon sans video locale;
- TV sans header/footer;
- pas de scoreboard TV en mode passif;
- lecteur YouTube simple restaure apres essais non concluants de double lecteur;
- diagnostics de sync activables ponctuellement.

Decision produit:

- YouTube reste la source principale;
- pas d'hebergement local audio;
- ne pas restaurer le double lecteur TV ou `markTvRoundReady` sans nouvelle analyse.

Points a surveiller:

- les Smart TV peuvent encore avoir des temps de buffering variables selon navigateur/video/reseau;
- toute nouvelle strategie player doit etre testee sur PC, telephone et TV avant livraison.

### Interface de partie

Applique:

- zone reponse/solution sous la video;
- aides de manche et classement dans la colonne laterale;
- scroll de secours sur desktop pour les ecrans courts;
- actions joueur masquees derriere un menu compact;
- partage salon et liaison TV dans les actions principales;
- barre sous lecteur avec correction et volume;
- layout responsive mobile/tablette/desktop.

Points a surveiller:

- les ecrans desktop courts restent sensibles: verifier qu'aucune zone ne devient inaccessible;
- les menus d'action joueur doivent rester au-dessus du decor.

### Mode passif

Applique:

- mode passif rattache au systeme de salon;
- switch actif/passif sur `#/main`;
- salons passifs prives par defaut;
- partage et liaison TV conserves;
- pas de score, pas de vote, pas de saisie pendant la lecture passive;
- estimation de duree disponible dans l'ancien ecran de preparation;
- retour automatique au lobby a la fin de toutes les manches.

Point a surveiller:

- garder le mode passif separe dans les listes publiques pour ne pas melanger les attentes joueur.

## Parking d'idees (pas une roadmap)

Les points ci-dessous conservent du contexte, mais ne sont ni engages, ni
planifies. Ne pas les implementer parce qu'ils sont listes ici.

Regle d'activation:

1. partir d'un besoin observe en partie ou explicitement demande;
2. choisir une priorite et un resultat attendu;
3. verifier qu'une solution plus petite ne suffit pas;
4. n'ajouter une table, un cache, un service ou une dependance durable qu'avec
   une justification explicite.

### Anti-repetition inter-parties

Probleme:

- malgre l'equilibrage par categorie, les memes pistes peuvent revenir souvent si le catalogue choisi est petit ou si plusieurs parties se suivent.

Piste:

- conserver un historique recent par utilisateur/salon/categorie;
- penaliser les pistes recentes au tirage;
- ne jamais rendre impossible le lancement si le catalogue est trop petit.

Zones probables:

- API selection des rounds;
- nouvelle table ou cache historique si le besoin devient durable.

### Exploitation avancee des tentatives

Probleme:

- `#/management-answers` expose deja les essais, mais une vraie assistance admin pourrait aller plus loin.

Pistes:

- grouper automatiquement les fautes proches;
- proposer des alias candidats;
- detecter les confusions recurrentes entre deux oeuvres;
- filtrer par categorie, oeuvre, piste ou date.

Zones probables:

- `AdminInsightsService`;
- `ManagementAnswersController`;
- eventuelle migration pour metadata d'analyse si necessaire.

### Player TV nouvelle generation

Probleme:

- certains navigateurs TV restent peu previsibles avec YouTube iframe.

Contraintes:

- YouTube doit rester la source;
- pas d'audio local;
- pas de double lecteur restaure sans preuve.

Pistes a investiguer:

- reduction de charge DOM/CPU TV;
- monitoring diagnostique non permanent;
- comparaison stricte entre modeles/navigateurs TV;
- solution tierce seulement si elle respecte les contraintes legales et techniques.

### Nettoyage UX regulier

Probleme:

- MelodyQuest a beaucoup gagne en fonctionnalites; l'UI peut redevenir dense si on ajoute sans retirer.

Regle produit:

- privilegier les informations directement utiles au joueur;
- deplacer les details admin/dev vers les pages management ou docs;
- eviter les doublons de titres;
- garder les actions rares dans des menus compacts.

## Checklist de reprise apres test reel

Pendant une vraie partie, noter:

- appareil utilise: PC, mobile, tablette, TV;
- navigateur;
- mode actif/passif;
- nombre de joueurs;
- categories choisies;
- moment exact du probleme: lobby, debut manche, reponse, revelation, vote, fin;
- si la TV etait liee;
- si Mercure semblait actif ou si l'UI pollait seulement.

Apres test:

1. Reproduire en local/prod si possible.
2. Identifier si le probleme est frontend, API, DB, Mercure ou YouTube.
3. Corriger dans le repo concerne uniquement.
4. Mettre a jour `README.md` si le comportement durable change.
5. Lancer les checks documentes.
6. Commit/push et deployer uniquement le runtime necessaire si un changement applicatif a ete fait.
