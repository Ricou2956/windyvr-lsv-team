# WindyVR LSV team 0.1.1

Première réécriture légère du plugin WindyVR LSV team pour comparer jusqu'à trois routages issus de Virtual Regatta.

## Fonctionnalités

- Jusqu'à 4 routes simultanées.
- Import CSV / GPX avec prise en charge ciblée d'Avalon, VRZen et eSail4VR, plus des variantes génériques proches.
- Synchronisation sur `store.timestamp`, donc sur le slider temporel natif de Windy.
- Interpolation de la position entre deux waypoints temporels.
- Une seule polyline et un seul marqueur bateau par route : pas de marqueur par waypoint.
- Comparaison ECMWF / GFS / ICON pour la position de chaque route à l'instant T.
- TWS, TWD, TWA des trois modèles + COG/SOG/TWS/TWA/voile du routeur lorsque ces champs existent.
- Debounce météo de 450 ms et cache borné pour limiter les appels lors du déplacement du slider.
- Nettoyage systématique de `store.on`, timers et couches cartographiques dans `onDestroy`.

## Installation / test dans Windy

1. Installer Node.js 18+.
2. Dans ce dossier : `npm install`
3. Lancer : `npm start`
4. Ouvrir `https://localhost:9999/plugin.js` une fois et accepter le certificat local.
5. Ouvrir `https://www.windy.com/developer-mode` puis charger `https://localhost:9999/plugin.js`.

Le projet suit le template Windy officiel actuel. Le plugin est marqué `private: true` pour les essais.

## Formats reconnus

### Avalon CSV
Colonnes typiques : `Date;Latitude;Longitude;Heading;Speed;SailSet;TWA;TWD;TWS`.

### CSV alternatifs / VRZen
Le parseur accepte plusieurs alias : `time/date/timestamp`, `lat/latitude`, `lon/longitude`, `COG/HDG/course`, `SOG/speed`, `TWS`, `TWD`, `TWA`, `sail`.

### GPX
Le parseur accepte `wpt`, `rtept` et `trkpt`. Il reprend les deux descriptions historiques du plugin WindyVR LSV team :
- `COG = ... SOG = ... TWS = ... TWA = ... SAIL = ...`
- `HDG:... TWA:... <voile> SOG:... kt TWS:... kt`

Il essaie aussi de lire des valeurs `cog/sog/tws/twd/twa` dans les extensions XML.

## Limite de cette première version

Les exports exacts de VRZen CSV et eSail4VR GPX peuvent varier selon les versions de ces routeurs. Si un de tes fichiers réels n'est pas reconnu, il faudra me donner un exemple d'export concerné ; le parseur est volontairement séparé dans `src/routeParser.js` pour qu'on puisse l'ajuster sans toucher au reste du plugin.


## v0.1.3
- Correction de la conversion du vent Windy ECMWF/GFS/ICON en reprenant `metrics.wind.convertValue`.
- Petit pictogramme bateau SVG à la place de la grande flèche.
