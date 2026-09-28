# WindyVR LSV Team 1.2.0-rc.1 — validation avant publication

## Validation acceptée — lot Honolulu–Yokohama (28 septembre 2026)

Eric et le coordinateur Cloud valident les essais Windy du lot SERMAR/AVALON après les corrections, y compris le suivi de la copie du monde visible : tracés, calque de risque, affichage météo, sous-titre, diagnostic et PDF conformes. Aucun défaut restant signalé sur ce lot. Cette confirmation clôt les demandes de revalidation du lot figurant dans l'historique ci-dessous.

Les imports, horaires/effectifs, analyse sans erreur, 324 appels servis par le cache sans nouvelle requête réseau et couverture partielle/concordance non évaluable avaient déjà été validés. Aucun de ces contrôles n'est recommencé pour cet enregistrement. Les derniers tests automatisés et le build Windows ont réussi sur le code corrigé ; seuls les documents de suivi sont mis à jour à cette étape.

### Vérifications réellement restantes avant publication

- Consigner les essais Windy des routeurs historiques hors lot validé : Dorado, VRZen, ZEZO/RouteMarins et eSail4VR (dont une route ne franchissant pas l'antiméridien). AVALON est validé sur le lot présent ; ne pas le rejouer sans motif.
- Consigner fermeture/réouverture, états hors plage et navigation clavier dans Windy : aucune validation réelle explicite de ces points n'est encore enregistrée. Les tests automatisés ne valent pas validation Windy.
- Confirmer le scénario ETA non comparable entre destinations différentes si aucun résultat réel n'est disponible ; le lot actuel seul ne prouve pas ce scénario.
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
