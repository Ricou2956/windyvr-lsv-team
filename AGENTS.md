# Règles essentielles WindyVR

- Commencer par lire `README.md` et `PUBLISHING.md`.
- La branche de développement est `dev-v1.2.0`.
- `main` est réservée à la préparation et à la publication des versions validées.
- La publication Windy reste manuelle.
- Ne jamais publier depuis Codex sans demande explicite de l'utilisateur.

## Livrables de relecture et de transmission — NAS

Le dossier de transmission WindyVR est :\
`\\Ricou_DS918\RECUPDOC_PROJETS_VR\WINDYVR`

Cette règle s’applique aux ateliers Codex du PC fixe et du PC portable. Vérifier le nom et l’accessibilité du dossier avant toute copie.

- Copier uniquement les livrables destinés à une relecture ou à un échange : diffs sélectionnés, rapports, captures et documents utiles. Ne pas copier automatiquement tous les fichiers modifiés.
- Conserver les originaux à leur emplacement de travail. Le dépôt Git reste la référence du code et des documents suivis ; le NAS contient des copies de transmission. Ne pas déplacer le dépôt sur le NAS.
- Ne pas utiliser OneDrive ou Téléchargements comme emplacement de transmission.
- Préfixer chaque copie par la date locale `AAAA-MM-JJ_`. Si le nom existe déjà, ajouter `_01`, `_02`, etc., avant l’extension. Ne jamais écraser un fichier existant, y compris si une collision survient entre le contrôle et la copie.
- Vérifier l’absence de secrets avant copie, y compris dans les diffs, rapports et captures. Ne jamais déposer de `.env`, mot de passe, token, clé, dump ou données de base de données.
- Si nécessaire, préparer une version expurgée distincte, sans modifier l’original, puis vérifier cette version avant transmission.
- Après copie, comparer les empreintes SHA-256 du fichier source de transmission et de la copie NAS. Pour une version expurgée, comparer cette version à sa copie. Ne déclarer la transmission réussie que si les empreintes concordent.
- Indiquer dans le compte rendu le chemin NAS complet de chaque livrable et le résultat du contrôle d’intégrité.
- Si le NAS est inaccessible ou si un contrôle échoue, le signaler et préserver l’original. Ne pas utiliser automatiquement un autre emplacement de transmission.
- Le coordinateur Cloud ne peut pas ouvrir directement ce partage. Indiquer à Eric les noms des fichiers à joindre au chat depuis ce dossier.

Ce dossier est distinct des sauvegardes sous `SAUVEGARDES_PROJETS_VR`. Cette règle ne modifie ni les scripts de sauvegarde, ni les chemins des dépôts locaux, ni le workflow de publication Windy.
