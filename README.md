# WindyVR LSV Team 1.1.0

Plugin Windy destiné à l'analyse météo de routes issues de routeurs Virtual Regatta. Il ne calcule pas une nouvelle route : il compare les routes importées et mesure leur exposition aux modèles ECMWF, GFS et ICON.

## Fonctionnalités

- Import de 6 routes au maximum, dont 4 affichées simultanément sur la carte.
- Formats GPX et CSV issus de Dorado, Avalon, VRZen, eSail4VR, ZEZO et formats proches.
- Identification structurelle d'eSail4VR, indépendante du nom du skipper.
- Reconnaissance des exports Dorado ECMWF et GFS ainsi que de leur cycle météo.
- Position interpolée de chaque bateau au temps sélectionné dans le curseur Windy.
- Comparaison ECMWF / GFS / ICON à l'instant T et le long de chaque route.
- Échantillonnage adaptatif de 30 minutes à 12 heures, renforcé aux changements de route.
- Synthèse visuelle verte, orange ou rouge selon la concordance des modèles.
- Passages sensibles cliquables pour ouvrir directement le lieu et l'heure dans Windy.
- Segments colorés sur la carte, contrôle qualité, comparaison des ETA et rapport PDF.
- Heures dans le fuseau local du navigateur, avec passage été/hiver automatique. Les cycles météo restent exprimés en Z.

## Installation depuis Windy

1. Ouvrir [Windy.com](https://www.windy.com/) et se connecter.
2. Ouvrir le menu puis **Installer des plugins Windy**.
3. Sélectionner **WindyVR LSV Team** dans la bibliothèque.
4. Cliquer sur **Installer**, puis ouvrir le plugin.

Aucun logiciel supplémentaire n'est nécessaire pour les équipiers. Sur téléphone ou tablette, ouvrir le site Windy dans Chrome, Edge ou Safari.

## Utilisation

1. Cliquer sur **+ Route** et sélectionner un fichier GPX ou CSV.
2. Importer les routes à comparer ; l'œil commande leur affichage sur la carte.
3. Placer le curseur temporel Windy à l'heure voulue.
4. Consulter la comparaison ECMWF, GFS et ICON à l'instant T.
5. Ouvrir **Analyse complète**, puis **Lancer l'analyse** pour étudier toute la route.
6. Ouvrir **Synthèse visuelle** pour identifier les routes et périodes sensibles.
7. Cliquer sur un passage sensible pour déplacer automatiquement la carte et le temps Windy.
8. Utiliser **Exporter PDF** pour partager le bilan avec l'équipe.

## Interprétation

- **Vert — bonne concordance** : les trois modèles donnent un scénario proche.
- **Orange — à surveiller** : un écart significatif apparaît sur la force ou la direction du vent.
- **Rouge — divergence forte** : le choix de route devient très dépendant du modèle météo.
- **Couverture** : proportion des positions pour lesquelles le modèle a fourni une donnée exploitable. Une faible couverture impose de rester prudent.
- **ETA** : estimation fournie par le routeur importé ; elle n'est pas recalculée par le plugin.

Les couleurs évaluent la confiance météorologique, jamais la performance sportive. Une route rouge n'est donc pas forcément mauvaise : son résultat est simplement plus incertain.

## Téléphone et tablette

- Ouverture plein écran avec `mobileUI: 'fullscreen'`.
- Boutons tactiles agrandis et actions empilées sur téléphone.
- Tableaux défilables horizontalement avec première colonne conservée à l'écran.
- Synthèse en une colonne sur téléphone et deux colonnes sur tablette.
- Le mode paysage est recommandé pour l'analyse détaillée.

## Développement local

Prérequis : Node.js 18 ou version ultérieure.

```bash
npm install
npm start
```

Accepter une fois le certificat de `https://localhost:9999/plugin.js`, puis charger cette URL depuis le mode développeur de Windy.

Pour vérifier et compiler :

```bash
npm test
npm run build
```

## Publication d'une mise à jour

1. Incrémenter la même version dans `package.json` et `src/pluginConfig.ts`.
2. Envoyer les fichiers modifiés sur la branche `main`.
3. Vérifier que le secret GitHub Actions `WINDY_API_KEY` est configuré.
4. Ouvrir **Actions**, sélectionner le workflow de publication Windy et cliquer sur **Run workflow**.

L'identifiant `windy-plugin-windyvr-lsv-team` et le chemin `/windyvr-lsv-team` doivent rester inchangés afin que Windy reconnaisse les versions suivantes comme des mises à jour.

## Limites

- La couverture dépend des échéances réellement disponibles dans Windy pour chaque modèle.
- Les fichiers sans horodatage ou sans données de vent natives produisent une analyse partielle.
- Le plugin n'analyse pas les vagues, les rafales ni les précipitations, sans incidence pour une course virtuelle.
- La proximité des côtes et les pénalités propres à Virtual Regatta ne sont pas évaluées.

## Licence

MIT
