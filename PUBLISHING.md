# WindyVR LSV team 1.0.0 — publication équipe

Cette version est configurée avec `private: true`.
Après publication sur windy-plugins.com, l'URL obtenue peut être partagée directement avec l'équipe.
Aucune approbation publique Windy n'est nécessaire pour ce partage privé.

Étapes:
1. Créer un compte GitHub.
2. Créer un dépôt et y envoyer le contenu de ce dossier.
3. Créer une clé `Windy Plugins API` sur https://api.windy.com/keys
4. Dans GitHub: Settings > Secrets and variables > Actions > New repository secret.
5. Nom du secret: WINDY_API_KEY
6. Actions > publish-plugin > Run workflow.
7. Dans le journal de l'action, étape Publish Plugin, copier l'URL d'installation windy-plugins.com.
