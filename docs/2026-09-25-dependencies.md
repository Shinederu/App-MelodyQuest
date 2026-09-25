# Verification des dependances - 2026-09-25

## Perimetre et resultat

Verification demandee par l'utilisateur, sans installation de mise a jour.
MelodyQuest n'utilise pas React: frontend HTML/CSS/JavaScript natif, API PHP,
Mercure et lecteur YouTube iframe. Aucun JSX/TSX ou gestionnaire de build React.
Le `package.json` du frontend ne declare aucune dependance npm: uniquement les
commandes Node de test et de generation de l'inventaire PWA.

`npm outdated --json` retourne `{}`. Ce resultat ne couvre pas les bibliotheques
copiees dans `assets/js/vendor`, controlees separement ci-dessous.

## Frontend

- `jsQR`: copie locale et PROD identiques a la distribution publiee 1.4.0.
  Le registre npm confirme 1.4.0 comme derniere version publiee.
  SHA-256 du JS: `BC40C8A15196236B2314DB0856F72CA0B49980CD5413B8C852A7349F5FEE0859`.
- `@shinederu/auth-core`: module interne annonce en 0.1.0. La copie MelodyQuest
  differe du `dist` local du module dans `AuthClient.js` et `helpers.js`:
  methodes `listUsers` / `updateUserRole` et normalisation de `role` / `is_admin`
  absentes de la copie embarquee. Les trois autres fichiers JS sont identiques.
  La copie DEV de MelodyQuest correspond a sa PROD. Pas de version publique
  npm a comparer; une synchronisation exige de tester les droits et sessions.
- Le generateur `utils/qr.js` est du code local, pas une dependance npm.
- YouTube iframe API est chargee directement depuis YouTube, sans version npm
  a installer. Aucun changement du lecteur ou des reglages TV.

## PHP partage, lecture seule

MelodyQuest API ne possede pas de manifeste Composer autonome. Son point
d'entree reutilise `P:\PROD\API\auth\vendor\autoload.php`: PHPMailer pour les
mails, phpdotenv pour la configuration et dependances transitives associees.
Les versions installees ci-dessous viennent du `vendor/composer/installed.json`
runtime Auth; les versions disponibles viennent du registre Packagist.

| Paquet | Installe | Dernier stable observe |
| --- | --- | --- |
| phpmailer/phpmailer | 6.10.0 | 7.1.1 |
| vlucas/phpdotenv | 5.6.2 | 5.7.0 |
| graham-campbell/result-type | 1.1.3 | 1.2.0 |
| phpoption/phpoption | 1.9.3 | 1.10.0 |
| symfony/polyfill-ctype | 1.32.0 | 1.37.0 |
| symfony/polyfill-mbstring | 1.32.0 | 1.38.2 |
| symfony/polyfill-php80 | 1.32.0 | 1.37.0 |

Medoo est egalement present dans le vendor Auth (2.2.0, dernier stable 2.6.0),
mais MelodyQuest utilise PDO directement. Il ne faut pas traiter cette
bibliotheque comme une dependance directe du jeu.

Le manifeste Auth demande PHPMailer `^6.9`. La derniere 6.x est 6.12.0;
son annonce indique qu'elle reprend le code de 6.10.0 apres annulation d'une
rupture involontaire en 6.11.x. Ne pas presenter ce seul changement de numero
comme une amelioration fonctionnelle. La branche 7 requiert une decision et
des tests de compatibilite dans le projet proprietaire Auth.

L'API d'avis de securite Packagist a ete interrogee pour les sept paquets du
tableau: les plages d'affectation renvoyees ne couvrent pas les versions
installees. Ce controle ponctuel n'est pas un audit de securite complet et ne
garantit pas l'absence de vulnerabilites non referencees.

## Suite eventuelle

Les mises a jour du vendor PHP appartiennent a `Module-Auth-API`, pas au repo
MelodyQuest. Ne pas modifier ce module ou son runtime au passage: demander
un perimetre explicite, puis tester connexion, permissions et mails des
consommateurs. La copie du client Auth de MelodyQuest peut faire l'objet d'une
synchronisation separee avec tests de sessions et permissions.

Verification locale: 35 tests frontend valides. Aucun changement applicatif,
deploiement runtime, modification DB ou installation effectue pendant ce controle.

## Sources

- [Registre jsQR](https://registry.npmjs.org/jsqr/latest)
- [Distribution jsQR 1.4.0](https://unpkg.com/jsqr@1.4.0/dist/jsQR.js)
- [Versions PHPMailer](https://github.com/PHPMailer/PHPMailer/releases)
- [Note PHPMailer 6.12.0](https://github.com/PHPMailer/PHPMailer/releases/tag/v6.12.0)
- [Versions phpdotenv](https://github.com/vlucas/phpdotenv/releases)
- [Metadonnees Packagist](https://packagist.org/apidoc)
