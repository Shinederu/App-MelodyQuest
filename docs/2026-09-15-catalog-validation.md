# Catalogue remis en jeu et pistes de normalisation

## Operation executee

Demande explicite de l'utilisateur le 2026-09-15: remettre toutes les musiques
en statut valide, sans imposer la verification manuelle de tout le catalogue.

- Avant: 2 726 pistes, dont 24 deja validees et 2 702 en attente.
- Apres: 2 726 pistes validees et actives, aucune en attente.
- Seules les pistes en attente ont recu `is_validated=1` et une date de
  validation si elle etait absente. Aucun validateur individuel invente.
- Les 24 validations existantes sont conservees a l'identique.
- Titres, artistes, IDs YouTube, timecodes, notoriete historique, rattachements,
  activite et dates de modification sont compares au backup et inchanges.
- Aucune ecriture dans les œuvres, alias, avis, suggestions ou historiques.
- Operation transactionnelle avec verrouillage des pistes, compte attendu et
  sauvegarde exclusive verifiee avant ecriture. Pas de migration ni d'operation
  a rejouer au demarrage/deploiement.
- Aucun mail en masse. Les signalements YouTube existants restent en attente
  de traitement: une validation de catalogue ne prouve pas la disponibilite
  effective d'une video ni la qualite de ses timecodes.

Sauvegarde avant operation:
`P:\ARCHIVE\MelodyQuest\2026-09-15-before-catalog-validation-183337.json`

SHA-256: `9fe29d5b0fc95d1619d3b62191759dbf548b7dcf994203c84c5447761a52a8f1`.

Verification apres commit DB: comparaison de toutes les lignes de pistes au
backup, hors les deux champs volontairement changes; `listTracks` confirme
2 726 validees et `listCategories` expose 2 726 pistes jouables. Aucune
modification runtime frontend/API, du lecteur ou de la PWA.

Cette decision remplace la remise en attente du 14 septembre. Ne jamais
relancer `scripts/recheck_catalog.php --apply` sans nouvelle demande explicite.
Les nouvelles propositions et modifications futures gardent le circuit normal
de verification; leur validation n'est pas devenue automatique.

## Normalisation envisagee, pas encore implementee

Besoin exprime: isoler les annees et harmoniser les libelles pour reduire le
travail de correction manuelle. Ne pas lancer de remplacement global sur la
base de ces exemples: ils restent a cadrer avant implementation.

- Annee facultative separee du nom: distinguer l'annee de l'œuvre de celle de
  l'enregistrement musical si necessaire. Ne pas supprimer des nombres faisant
  partie d'un titre (ex. 1984, F1 2023) ni deviner une annee manquante.
- Opening/Ending: harmoniser la casse et les separateurs, distinguer saison et
  numero de generique. `Opening 1` ne prouve pas une saison 1.
- Format envisage: `Opening - Saison 1`, ou `Opening 2 - Saison 1` quand les
  deux informations sont connues. Saison 1 meme pour une serie a saison unique,
  seulement lorsque ce fait est etabli.
- Jeux: `Theme principal` uniquement pour un theme identifie comme principal.
  `OST` / `Bande originale` est generique; une seule piste presente dans notre
  catalogue ne signifie pas qu'il s'agit du theme principal du jeu.
- Conserver les vrais titres de chansons et les alias de reponse. Toute
  extraction future doit permettre de relire les changements avant application.

Exemples observes avant operation: `Opening` (189 pistes), `Opening 1` (32),
`Opening - saison 1` (78), `Bande originale` (250), `Theme du jeu` (246).
Ces nombres ne sont pas des preuves suffisantes pour attribuer les metadonnees.
