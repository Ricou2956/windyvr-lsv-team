# WindyVR LSV team v1.0.0

Plugin Windy destiné à la comparaison de routes issues de différents routeurs pour Virtual Regatta.

WindyVR LSV team permet d'afficher simultanément jusqu'à quatre routages sur la carte Windy et de comparer leur situation à un instant donné en utilisant directement le slider temporel de Windy.

## Fonctionnalités

- Jusqu'à 4 routes simultanées.
- Import automatique des fichiers CSV et GPX compatibles.
- Reconnaissance des routages Avalon, VRZen, eSail4VR et ZEZO.
- Détection automatique du format et du routeur lorsque les informations disponibles le permettent.
- Une couleur distincte pour chaque route.
- Affichage d'un marqueur bateau compact sur chaque route.
- Synchronisation automatique de la position des bateaux avec le slider temporel Windy.
- Interpolation de la position entre deux points temporels.
- Comparaison météo simultanée des modèles :
  - ECMWF
  - GFS
  - ICON
- Affichage des données du routeur disponibles à l'instant sélectionné :
  - COG
  - SOG
  - Voile
  - TWA
  - TWS
  - TWD
- Les données non fournies par le routeur sont affichées avec `-`.
- Harmonisation des noms de voiles avec les abréviations :
  - Jib : `Jib`
  - Spi : `Spi`
  - Génois léger / Light Jib : `LJ`
  - Spi léger / Light Gennaker : `LG`
  - Trinquette / Staysail : `Stay`
  - Spi lourd / Heavy Gennaker : `HG`
  - C0 : `C0`
- Optimisation des requêtes météo afin de limiter l'impact sur les performances de Windy.

## Comparaison des modèles météo

Pour chaque route et pour la position correspondant à l'heure sélectionnée avec le slider Windy, le plugin affiche les données provenant des modèles :

**ECMWF / GFS / ICON**

Les informations disponibles comprennent :

- TWS : True Wind Speed
- TWD : True Wind Direction
- TWA : True Wind Angle

Les informations du routeur sont affichées séparément afin de permettre une comparaison rapide entre le routage prévu et les différents modèles météo Windy.

## Routeurs et formats pris en charge

### Avalon

Formats pris en charge :

- CSV
- GPX

Lorsque les informations sont présentes dans le fichier, le plugin récupère notamment COG, SOG, TWS, TWD, TWA et la voile.

### VRZen

Formats pris en charge :

- CSV
- GPX

Les informations disponibles dans l'export VRZen sont utilisées automatiquement.

### eSail4VR

Format pris en charge :

- GPX

Certaines informations de navigation ne sont pas fournies par les exports eSail4VR. Dans ce cas, les valeurs correspondantes restent affichées avec `-`.

### ZEZO

Formats pris en charge :

- CSV
- GPX

Le plugin détecte automatiquement ZEZO à partir des informations disponibles dans le fichier.

## Utilisation

1. Ouvrir Windy.
2. Ouvrir le plugin **WindyVR LSV team**.
3. Ajouter jusqu'à quatre routes.
4. Utiliser le slider temporel de Windy pour choisir l'instant à comparer.
5. Les bateaux se déplacent automatiquement sur leurs routes respectives.
6. Les informations de navigation et les données ECMWF, GFS et ICON sont automatiquement actualisées.

Cela permet de comparer rapidement les choix proposés par plusieurs routeurs sur une même situation météo.

## Version

**WindyVR LSV team v1.0.0**

Version destinée au partage avec l'équipe LSV.
