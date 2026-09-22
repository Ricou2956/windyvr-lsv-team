# WindyVR LSV Team 1.2.0-rc.1 — validation avant publication

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
