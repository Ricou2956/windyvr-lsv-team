# WindyVR LSV Team 1.2.0 — suivi de publication

## Publication technique 1.2.0 — 28 septembre 2026

Publication explicitement autorisée par Eric depuis la référence validée 383736eb11ae9d70d9bea6cc71b4dc186321f2a2. Fusion de dev-v1.2.0 vers main par avance rapide, sans conflit. Tests npm test et build Windows npm run build:win réussis sur ce résultat ; versions finales 1.2.0 concordantes. Identifiant, routerPath, scripts multi-PC et garde-fous inchangés. Réserve connue maintenue : Dorado non retesté, service indisponible selon Eric.

- Code publié : 383736eb11ae9d70d9bea6cc71b4dc186321f2a2, poussé sur main.
- Tag annoté v1.2.0 créé et poussé sur ce commit, sans écrasement de tag.
- [Workflow manuel publish-plugin](https://github.com/Ricou2956/windyvr-lsv-team/actions/runs/36416661225) lancé depuis main : terminé avec succès ; build Linux, contrôle de version finale et envoi Windy réussis.
- Réponse Windy : installUrl [plugin 1.2.0](https://windy-plugins.com/3653906/windy-plugin-windyvr-lsv-team/1.2.0/plugin.min.js). Fichier vérifié accessible en HTTPS (200, 116811 octets), identifiant et version 1.2.0 présents.
- **Publication technique réussie.**
- **Demande de validation Windy non envoyée pendant cette mission.** Eric doit transmettre cette URL à Windy pour revue ou confirmation de la mise à jour, selon la [procédure officielle](https://docs.windy-plugins.com/getting-started/updating-plugin.html).
- **Disponibilité publique dans la bibliothèque Windy non confirmée.** Un fichier hébergé accessible ne prouve pas son approbation ou sa présence dans la bibliothèque.

Ce compte rendu est un ajout documentaire postérieur à la publication ; le tag reste attaché au code effectivement envoyé. Cet état prévaut sur les restrictions et mentions de non-publication des étapes historiques ci-dessous.

## Préparation de la version finale 1.2.0 — 28 septembre 2026

Sur demande explicite d'Eric, passage de 1.2.0-rc.1 à 1.2.0 sur dev-v1.2.0, depuis b6e79d9. Versions synchronisées dans package.json, package-lock.json (racine et paquet racine) et src/pluginConfig.ts. Les deux guides PDF fournis sont ajoutés dans docs/ sans modification et référencés dans le README ; le guide utilisateur corrigé est validé par Eric.

Revue des points ouverts : validations Honolulu–Yokohama et RBR consignées, y compris imports, analyse météo, géométrie/risques, ETA non comparables, couverture, diagnostic/PDF, clavier, fermeture/réouverture et état hors plage. La présentation ETA a été corrigée et contrôlée dans Edge. Aucun défaut fonctionnel restant signalé dans le suivi sur ces lots.

Réserve maintenue : Dorado non retesté en conditions réelles, service indisponible selon Eric. La présente demande autorise la préparation finale en conservant explicitement cette réserve ; elle ne transforme pas cet essai en validation et n'autorise pas la publication.

Identifiant windy-plugin-windyvr-lsv-team, routerPath /windyvr-lsv-team, scripts multi-PC et garde-fous de publication inchangés. La publication demeure manuelle et réservée à main. À cette étape : commit/push uniquement sur dev-v1.2.0 ; aucune fusion main, aucun tag final, aucun déclenchement de publication. Installation publique V1.2.0 non annoncée comme disponible.

Les sections RC ci-dessous constituent l'historique des validations et des décisions précédentes. Le présent état 1.2.0 prévaut sur leurs mentions de version conservée en RC1.


## Validation réelle RBR acceptée — 28 septembre 2026

Eric et le coordinateur Cloud confirment : correction du décrochage AVALON et reconnaissance VRZen ; import/analyse des six fichiers sans erreur météo ; ETA non comparables correctement affichées ; couverture complète des routes partielles ZEZO et partielle des autres ; Tab et Maj+Tab fonctionnels, Échap ferme la synthèse ; fermeture/réouverture avec suppression des routes et objets cartographiques. L'état hors plage avait été observé sur Honolulu–Yokohama. Ces points sont désormais consignés et ne sont pas à rejouer sans raison.

Seul défaut de présentation signalé : titre « ETA non comparables » collé à l'explication. Correction ciblée dans src/plugin.svelte : conteneur en colonne avec un espacement de 4 px, titre et explication sur deux lignes distinctes. Aucun changement de calcul ni d'export.

Dorado reste non retesté en conditions réelles : service actuellement indisponible selon Eric. Ce point est explicitement non validé ; attendre sa disponibilité ou une décision du coordinateur sur cette réserve avant finalisation. La version reste 1.2.0-rc.1 ; commit/push des correctifs autorisés uniquement sur dev-v1.2.0, sans passage sur main, tag final ou publication.


## Validation acceptée — lot Honolulu–Yokohama (28 septembre 2026)

Eric et le coordinateur Cloud valident les essais Windy du lot SERMAR/AVALON après les corrections, y compris le suivi de la copie du monde visible : tracés, calque de risque, affichage météo, sous-titre, diagnostic et PDF conformes. Aucun défaut restant signalé sur ce lot. Cette confirmation clôt les demandes de revalidation du lot figurant dans l'historique ci-dessous.

Les imports, horaires/effectifs, analyse sans erreur, 324 appels servis par le cache sans nouvelle requête réseau et couverture partielle/concordance non évaluable avaient déjà été validés. Aucun de ces contrôles n'est recommencé pour cet enregistrement. Les derniers tests automatisés et le build Windows ont réussi sur le code corrigé ; seuls les documents de suivi sont mis à jour à cette étape.

### Vérifications réellement restantes avant publication

- Dorado : essai réel non réalisé, service indisponible selon Eric. Les validations RBR, ETA, clavier, fermeture/réouverture et hors plage sont consignées ci-dessus.
- Après clôture de ces points et décision de finalisation, synchroniser les versions finales, exécuter tests/build sur cette version, puis suivre la procédure manuelle de publication. Ces opérations ne sont pas réalisées à cette étape.

Version maintenue à **1.2.0-rc.1**, branche **dev-v1.2.0**. L'enregistrement et le push du commit de mission sont autorisés ; aucun passage sur main, tag final ou publication. L'identifiant du commit et l'état de synchronisation sont fournis dans le retour de livraison Git.


Cette branche correspond à la release candidate de la version 1.2.0.
Elle doit être validée dans Windy avant toute fusion/publication sur `main`.

## Vérifications RC

1. `npm ci`
2. `npm test`
3. `npm run build:win` sous Windows ou `npm run build` sous Linux/macOS
4. Charger `https://localhost:9999/plugin.js` en mode développeur Windy.
5. Rejouer le jeu de référence : Avalon, VRZen, ZEZO/RouteMarins et eSail4VR.
6. Contrôler l'import, l'analyse complète, la synthèse visuelle, les passages sensibles, l'ETA non comparable, la fenêtre météo, le PDF et le diagnostic JSON.
7. Vérifier fermeture du plugin, états hors plage et accessibilité clavier.

## Passage en 1.2.0 final

Après validation de la RC :

1. remplacer `1.2.0-rc.1` par `1.2.0` dans `package.json` et `src/pluginConfig.ts` ;
2. mettre à jour `package-lock.json` ;
3. exécuter à nouveau tests et build ;
4. fusionner la branche de développement vers `main` selon le workflow de l'équipe ;
5. lancer le workflow de publication Windy avec le secret `WINDY_API_KEY` configuré.

L'identifiant `windy-plugin-windyvr-lsv-team` et le `routerPath` `/windyvr-lsv-team` ne doivent pas changer.

## Validation SERMAR avant finalisation (28 septembre 2026)

Intégration locale vérifiée ; premiers essais réels Windy effectués par Eric (imports, analyse/cache, couverture et PDF navigateur conformes). **Correctifs validés par Eric et le coordinateur Cloud sur le lot SERMAR/AVALON** ; voir le suivi en fin de document. Version conservée : 1.2.0-rc.1. Résultats et règles détaillés dans [SERMAR_VALIDATION.md](SERMAR_VALIDATION.md).

1. Charger le build RC via le serveur local, navigateur en Europe/Paris pour le lot fourni. Importer les deux fichiers SERMAR et les deux AVALON. Vérifier la source, GFS, l'absence de cycle inventé et le message d'hypothèses CSV. Tester le sélecteur manuel SERMAR.
2. Vérifier 1 058 points SERMAR et 1 061 AVALON. Départ commun 29/09/2026 10:00 UTC ; fins SERMAR 06/10 18:08 UTC et AVALON 06/10 17:25 UTC (affichage local : ajouter 2 h pour ce lot).
3. Déplacer le curseur sur le passage septembre–octobre et sur l'antiméridien Honolulu–Yokohama. Contrôler tracés, marqueurs, interpolation, heures exactes et états hors plage.
4. Comparer les quatre routes ; vérifier que la comparabilité ETA dépend toujours des destinations. Une différence d'horaire d'arrivée seule ne valide pas le classement.
5. Lancer l'analyse complète et contrôler ECMWF/GFS/ICON, couverture, fenêtre réellement analysée, synthèse et passages sensibles. L'absence de vent natif dans le GPX SERMAR fourni est attendue.
6. Sur le CSV SERMAR, vérifier les décimales et le libellé TWA source/interpolé. À la ligne 975 du fichier : CAP 260°, TWA −115.043°. Les TWA météo restent des calculs distincts ; aucun mode de pilotage n'est supposé.
7. Exporter le PDF et le diagnostic JSON : vérifier lisibilité, hypothèses de dates, convention d'angles, absence d'écarts de temps écoulé, couverture et destinations. Contrôler la fermeture/réouverture du plugin et rejouer les routeurs historiques.

Consigner le résultat de chaque étape et les anomalies. Seulement après validation, appliquer les étapes de passage en 1.2.0 ci-dessus, synchroniser package.json, package-lock.json et src/pluginConfig.ts, refaire tests/build, puis préparer la fusion et le tag final selon le workflow d'équipe. Publication manuelle, sur main uniquement, version finale requise. Aucun de ces actes de finalisation n'a été effectué pour cette intégration.

## Revalidation du correctif antiméridien / sous-titre

Les imports des quatre fichiers, l'analyse sans erreur, les 324 appels servis par le cache sans requête réseau supplémentaire, la couverture partielle/concordance non évaluable et le PDF intégré au navigateur ont été validés par Eric sur le premier build SERMAR. Le mécanisme d'export PDF reste inchangé.

1. Serveur de développement : npm start depuis le dépôt, HTTPS sur le port 9999. Recharger Windy avec Ctrl+F5 puis charger de nouveau https://localhost:9999/plugin.js en mode développeur (accepter le certificat local si nécessaire). La page ouverte ne recharge pas automatiquement le code du plugin à la recompilation. Si Windy conserve le module en cache, utiliser https://localhost:9999/plugin.js?rc1=antimeridien-1.
2. Vérifier la version 1.2.0-rc.1 et le sous-titre exact « Routes importées · valeurs natives et météo Windy à l’instant T ».
3. Réimporter les quatre fichiers. Afficher chacun séparément puis les quatre ensemble, avant analyse : tracé continu sur le Pacifique, aucune ligne horizontale parasite, cadrage couvrant Honolulu–Yokohama sans tour du monde.
4. Placer le curseur juste avant, au passage et juste après l'antiméridien : marqueurs sur les tracés, aucun saut vers une autre copie du monde. Vérifier aussi zoom/déplacement de la carte et masquage/réaffichage des routes.
5. Relancer l'analyse ; refaire les quatre routes séparément puis ensemble avec les calques de risque. Contrôler leur superposition aux routes à l'antiméridien. Cliquer sur un passage sensible près du franchissement, si disponible : le centrage et le marqueur doivent désigner le même endroit. Une couverture insuffisante peut empêcher de produire un tel passage ; le signaler comme non testé.
6. Contrôler une route sans franchissement, puis fermer/réouvrir le plugin. Confirmer que sources, effectifs, dates et règles de comparaison ETA n'ont pas changé. Clôturer également les contrôles navigation/diagnostics et autres routeurs encore ouverts dans la checklist précédente.

Résultat visuel du correctif : **validé par Eric et le coordinateur Cloud sur ce lot**. Ne finaliser, fusionner, taguer ou publier qu'après validation du correctif et clôture des essais restants.


### Retour : routes invisibles avant analyse

La capture montre une carte centrée vers +159°, alors que le premier correctif maintenait les tracés dans une copie à longitudes négatives (environ −218° à −158°). Le repère fixe ne suivait pas le recentrage du fond Windy. Correction complémentaire : décalage commun de 360° selon le centre visible, actualisé sur moveend pour routes, marqueurs et risques ; abonnement retiré à la fermeture. Le cadrage et les passages sensibles utilisent ce même repère. Tests de régression : centres +159°, −201° et +519°, avant/après analyse, sans mutation des sources. Validation visuelle Windy reçue pour ce lot (voir validation acceptée en tête du document).

La page localhost/plugin.js affiche normalement du code. Pour recharger cette correction : dans le panneau Developer mode de Windy, saisir https://localhost:9999/plugin.js?rc1=antimeridien-2 puis cliquer « Install & open plugin ». Réimporter les quatre fichiers et vérifier leur visibilité avant analyse, puis après analyse et après déplacement/zoom de la carte. Version conservée : 1.2.0-rc.1 ; aucune publication.


## Correctif import — Round Britain Record du 28 septembre 2026

Départ propre sur dev-v1.2.0, commit 76cfe91 ; version maintenue à 1.2.0-rc.1. Les validations Honolulu–Yokohama précédentes restent acquises. Deux défauts confirmés dans le parseur : num tronquait les exposants, et la signature générique ZEZO précédait la signature VRZen sans reconnaître DTF(nm).

Lecture numérique : champ complet, décimale point/virgule, exposant E/e signé ou non, suffixes d'unités reconnus. Les exposants incomplets, valeurs non finies et textes parasites renvoient null ; aucun préfixe numérique trompeur n'est accepté. Les coordonnées réelles AVALON ne sont ni modifiées ni filtrées. La même lecture s'applique aux champs CSV et GPX (attributs, extensions, nombres des descriptions).

Détection : la signature spécifique VRZen (TTW, MODE, BestUpVMG, BestDwnVMG, HDG, TWA, DTF(nm)/DTF) précède la signature générique ZEZO. Le vrai export ZEZO du lot réutilise ces colonnes et ajoute BTW/ATWA/ABTW : cette signature d'extracteur reste prioritairement ZEZO. Les exports RouteMarins GPX restent ZEZO. DateHeure(UTC) est prioritaire et son interprétation UTC dépend uniquement de la colonne, pas du routeur détecté ; les dates GPX explicites restent inchangées.

Fichiers : src/routeParser.js, package.json, tests/rbrImport.test.mjs, tests/rbr.browser.html, lanceur tests/sermar.browser.mjs étendu pour choisir la page de test, fixtures tests/routes/2026-09-28 (copies inchangées des AVALON CSV/GPX, VRZen CSV, ZEZO CSV et RouteMarins GPX), et suivi existant.

Résultats sur fichiers réels, avec DOMParser natif Edge pour les GPX : 1 324 points AVALON CSV/GPX égaux, horaires uniques et croissants, aucun point écarté. Point 368 : latitude 55.35919952392578, longitude −0.0007279012352228165, instant 2026-09-30T21:45:00Z (23:45 Europe/Paris). Segment maximal : 2,23568 milles. VRZen : 204 points, premier instant 2026-09-28T08:54:00Z. ZEZO/RouteMarins inchangés. Tests numériques invalides/exposants/unités et UTC exécutés sous Europe/Paris, UTC et America/New_York.

Procédure historique, désormais validée sur le lot RBR : charger https://localhost:9999/plugin.js?rc1=rbr-import-1 dans Developer mode puis « Install & open plugin », réimporter AVALON CSV/GPX et VRZen du lot RBR. Vérifier l'absence d'excursion près de Greenwich autour du 30 septembre à 23:45 locale, les 1 324 points AVALON, la source VRZen avec 204 points et son départ à 10:54 Europe/Paris (08:54 UTC). Confirmer ZEZO sur le vrai export de l'extracteur. Les essais cycle de vie/clavier sont désormais consignés ; Dorado demeure non retesté. Aucun changement de version finale, fusion, tag ou publication.

Validation locale finale du correctif RBR : npm test réussi, y compris SERMAR et antiméridien ; tests RBR réussis sous Europe/Paris, UTC et America/New_York ; DOMParser natif Edge réussi sur les fichiers réels ; npm run build:win réussi. Les cinq fixtures sont identiques aux exports originaux (SHA-256). Le serveur existant répond en HTTPS 200 et sert bien parseRouteNumber, la nouvelle signature VRZen et la règle UTC indépendante ; manifeste 1.2.0-rc.1. git diff --check sans erreur. État historique avant la demande de commit/push : modifications locales sur dev-v1.2.0, HEAD 76cfe91. Validation visuelle Windy du lot RBR corrigé reçue d’Eric et du coordinateur Cloud.

Verification de presentation : controle Edge du titre et de son explication sur deux lignes, espacement minimal de 4 px confirme ; build Windows reussi. Les tests complets du correctif RBR avaient deja reussi et la validation reelle est recue ; ils ne sont pas rejoues pour cette seule modification CSS.

Validation de preparation finale : npm test et npm run build:win reussis en 1.2.0. Versions package.json, package-lock.json (racine et paquet racine), src/pluginConfig.ts et manifeste dist/plugin.json concordantes. Identifiant et routerPath verifies ; scripts multi-PC et workflow de publication identiques au commit b6e79d9. Deux PDF copies a l'identique (SHA-256). Aucun blocage technique constate pour le commit/push demande ; reserve Dorado maintenue. Publication non effectuee.
