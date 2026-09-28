# Compte rendu coordinateur Cloud — intégration SERMAR

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


Date : 28 septembre 2026. Départ : branche dev-v1.2.0, commit f614952 (securise workflow multi-PC et publication Windy), dépôt propre. README.md, PUBLISHING.md et AGENTS.md lus avant modification.

## Résultat et fichiers

Version maintenue à 1.2.0-rc.1. Intégration ciblée, sans modification du workflow de publication, du verrouillage main/version finale, des scripts multi-PC, de l'identifiant plugin ou du routerPath.

- src/routeParser.js : détection SERMAR CSV/GPX, sélection manuelle via ROUTE_SOURCES, colonnes et unités explicites, modes CAP/TWA uniquement si colonne mode ou mode_pilotage explicite, modèles ECMWF/GFS-V, aucun cycle SERMAR inféré.
- src/sermar.js : dates strictes JJ/MM HH:mm, hypothèses et contrôle relatif de temps_ecoule.
- src/timeUtils.js : conservation des points SERMAR aux heures exactes, propagation de la convention et TWA météo distinct lors de l'interpolation.
- src/plugin.svelte : source proposée, valeurs sources affichées sans arrondi aux points exacts, valeurs interpolées identifiées (affichage limité à trois décimales), message d'hypothèses CSV.
- src/qualityUtils.js, src/diagnostics.js : hypothèses et contrôle de temps écoulé visibles dans la qualité, reprise existante de la qualité dans le PDF et ajout aux diagnostics JSON.
- tests/sermar.test.mjs, tests/sermar.browser.html, tests/sermar.browser.mjs, package.json : tests Node intégrés à npm test et tests séparés dans le DOMParser natif d'Edge, sans nouvelle dépendance.
- README.md, PUBLISHING.md et ce compte rendu : notes préparatoires, suivi et checklist Windy.

## Règles exactes

CSV : signature date/lat/lon/cap_deg/twa_deg/twd_deg/tws_kn/vitesse_kn ; nom SERMAR complémentaire accepté avec le noyau date/lat/lon/cap_deg/twa_deg. Un nom SERMAR seul ne force pas le traitement d'un CSV générique. temps_ecoule et voile sont facultatifs. Degrés et nœuds sont lus directement ; aucun facteur de conversion appliqué aux champs explicitement suffixés _deg et _kn.

Dates SERMAR : aucune utilisation de Date.parse pour JJ/MM ; vérification des composantes, rejet des dates impossibles. Année de la première ligne choisie parmi année courante −1, courante, +1 selon l'instant le plus proche de l'import ; passage décembre–janvier incrémenté. Le fuseau par défaut est celui du navigateur, identifié dans le message et le diagnostic, avec ses règles saisonnières. Un paramétrage du parseur permet de fournir sermar.year et sermar.utcOffsetMinutes ; il n'est pas exposé dans l'interface. Pas de règle universelle UTC+02. temps_ecoule compare les écarts à la première paire date/durée disponible, même si celle-ci n'est pas +0:00, sans reconstruire un départ. Les incohérences sont signalées, sans correction silencieuse. GPX : dates explicites conservées.

Angles : cog/twa/twd SERMAR restent les nombres exportés, sans normalisation ni recalcul du TWA source. weatherTwa est un champ calculé distinct, égal à l'angle signé TWD − CAP. Une TWD manquante n'est pas reconstruite à partir du TWA SERMAR. Sur les 1 058 points fournis, le signe source est opposé à celui de ce calcul ; B correspond au signe positif et T au signe négatif. Ce contrôle n'explique pas les écarts de magnitude et n'introduit aucune correction. À la ligne 975 : CAP 260 et TWA −115.043 restent inchangés. Le calcul météo existant utilise la direction du modèle et le cap ; le comptage des manœuvres et l'échantillonnage reposent sur les changements de signe, invariants à une inversion globale. Les règles ETA/destination restent inchangées. Le PDF existant reprend la qualité et les synthèses, sans tableau de TWA individuels.

## Vérifications réalisées

- npm test : toutes les suites passent, dont SERMAR et les régressions des routeurs historiques. La suite SERMAR passe également sous UTC, America/New_York et Europe/Paris. git diff --check ne signale aucune erreur de contenu.
- npm run build:win : réussi, production de dist/plugin.js et dist/plugin.min.js ; RC maintenue.
- Tests Edge sans interface, DOMParser réel : GPX créateur/nom, unités, angles et dates explicites validés.
- Quatre fichiers locaux du lot fourni comparés point par point : SERMAR 1 058 CSV/GPX, AVALON 1 061 CSV/GPX. Horaires identiques ; coordonnées concordantes à 10⁻⁶ degré. Aucun doublon ni inversion temporelle.
- Départ commun 2026-09-29 10:00 UTC. Fin SERMAR 2026-10-06 18:08 UTC ; fin AVALON 2026-10-06 17:25 UTC.
- SERMAR : toutes les valeurs CAP/TWA/TWD/TWS/vitesse comparées à l'export ; 1 057 intervalles de temps écoulé cohérents.
- Tests synthétiques : format sans temps_ecoule, changement de mois/année, année la plus proche, dates impossibles, UTC explicite et fuseau navigateur saisonnier, mode absent/explicite, doublons/inversions, interpolation et antiméridien.

Commande de comparaison native : node tests/sermar.browser.mjs "chemin vers msedge.exe" "dossier contenant les quatre fichiers". Le lot de référence utilise Europe/Paris pour la vérification du comportement local AVALON/SERMAR. Sans dossier, seuls les GPX synthétiques sont testés. Les fichiers personnels ne sont pas copiés dans le dépôt. Le lanceur utilise un profil temporaire distinct et ferme le serveur local après le test.

## Reste à valider et limites

Depuis le premier compte rendu, Eric a effectué les essais réels consignés ci-dessous : imports, analyse, cache, couverture et PDF navigateur conformes sur ce lot. Le tracé à l'antiméridien a révélé un défaut et le sous-titre une mention fixe erronée ; leurs correctifs sont désormais validés par Eric et le coordinateur Cloud sur ce lot. La non-régression des autres routeurs et les essais restants de PUBLISHING.md restent à clôturer. Les anciens fichiers du 25 septembre n'ont pas été fournis pour cette mission ; le format sans temps_ecoule est testé synthétiquement.

Le CSV ne peut révéler son année ni son fuseau d'export. Pour des archives ou un autre fuseau, comparer au GPX ; un éventuel réglage utilisateur de l'année/fuseau relève d'une décision fonctionnelle supplémentaire du coordinateur. Le mode CAP/TWA du lot actuel est inconnu ; aucune consigne n'est inventée. Les écarts angulaires ne bloquent pas l'import et restent inexpliqués en magnitude.

État Git historique avant la demande de commit : modifications locales sur dev-v1.2.0, aucun commit créé ni poussé ; HEAD reste f614952. Aucun passage à 1.2.0, fusion main, tag final ou publication. Les artefacts dist sont ignorés par Git. Compte rendu préparé pour transmission au coordinateur, sans envoi externe automatique.

Prochaine étape : clôturer les essais hors lot et de cycle de vie/clavier encore non consignés ; le coordinateur autorise ensuite la finalisation 1.2.0, avant synchronisation multi-PC, fusion/tag et publication manuelle.

## Correctif RC1 — antiméridien et sous-titre (28 septembre 2026)

### Retours Windy transmis par Eric

- Les quatre imports SERMAR/AVALON sont conformes : sources, effectifs et horaires.
- Analyse météo terminée sans erreur. Actualisation : 324 appels servis par le cache, aucune nouvelle requête réseau.
- Couverture partielle et concordance non évaluable correctement affichées.
- Export via « Enregistrer au format PDF » du navigateur réussi et rendu vérifié sur ce lot. Le problème « Microsoft Print to PDF » ne donne lieu à aucune modification du mécanisme d'export.

### Cause confirmée et correction

createMapObjects envoyait directement les coordonnées canoniques [latitude, longitude] à L.Polyline. createRiskLayers faisait de même avec routeGeometryBetween. Le saut numérique entre −180° et +180° devenait donc un segment traversant la carte. fitBounds, les marqueurs et panTo utilisaient également ces longitudes canoniques. L'interpolation existante savait déjà franchir l'antiméridien, mais cette propriété ne corrigeait pas les tableaux réellement transmis aux tracés.

src/mapGeometry.js crée une copie d'affichage continue : chaque longitude est déplacée d'un multiple de 360° pour rester près de la précédente. Les routes partagent le repère de la première route importée, conservé pendant la vie du groupe. src/plugin.svelte utilise cette géométrie pour le tracé, le cadrage et les marqueurs ; les segments de risque sont alignés sur la même copie du monde à leur heure de départ. Le clic sur un passage sensible rejoint la position affichée. L'import, les points sources, l'interpolation canonique, les calculs de distance/météo/ETA et les règles SERMAR sont préservés. Aucun changement de projection ni calcul de nouvelle route.

Le sous-titre est désormais « Routes importées · valeurs natives et météo Windy à l’instant T ». Recherche dans src : seule occurrence courante d'Ocean Race Atlantique trouvée et supprimée ; aucune mention fixe de cette course trouvée dans l'export. Aucune détection automatique ajoutée.

Fichiers de cette correction : src/mapGeometry.js (nouveau), src/plugin.svelte, tests/mapRendering.test.mjs (nouveau), tests/sermar.browser.html, package.json, PUBLISHING.md et SERMAR_VALIDATION.md. Les modifications SERMAR précédentes sont conservées.

### Vérification locale et état de livraison

Les tests de rendu exécutent les fonctions réelles de plugin.svelte avec une interface Leaflet instrumentée. Ils inspectent les coordonnées reçues par L.Polyline (route et risques), L.Marker, setLatLng, fitBounds et panTo : franchissements est/ouest, ±180° exact, aller-retour, route ordinaire, quatre routes communes, segments de risque partiels, remplacement des calques, fermeture/réouverture et invariance des points sources. Les tests navigateur sur les quatre fichiers complètent ces contrôles par le lecteur GPX natif et l'alignement de chaque intervalle/marqueur/segment de risque. Cela ne remplace pas un nouvel essai visuel dans Windy.

État historique avant la demande de commit : branche dev-v1.2.0, HEAD f614952 ; modifications locales non commitées, aucun push. Version 1.2.0-rc.1 maintenue. Aucun merge main, tag final ou publication. Le serveur local sert le build corrigé à https://localhost:9999/plugin.js ; procédure de rechargement et essais restants dans PUBLISHING.md.

Résultats finaux du correctif : npm test réussi (toutes les suites, dont mapRendering) ; build Windows réussi ; git diff --check sans erreur. Contrôles Edge sur les quatre fichiers : un franchissement source par fichier, saut maximal affiché 0,07891° pour SERMAR et 0,07851° pour AVALON ; chaque marqueur et segment de risque vérifié. Les concordances CSV/GPX et valeurs SERMAR restent validées. Le serveur existant a finalement été retrouvé actif sur le port 9999 et réutilisé, sans instance supplémentaire ; réponse HTTPS 200 vérifiée avec la nouvelle géométrie et le nouveau sous-titre, manifeste 1.2.0-rc.1.


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
