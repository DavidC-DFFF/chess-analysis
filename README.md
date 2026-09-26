# Atelier d’analyse d’échecs

Lecteur local de parties PGN avec échiquier interactif. Il affiche la position, le dernier coup, les commentaires inclus dans le PGN et permet de parcourir les coups au clavier.

## Démarrer

```powershell
npm install
npm run dev
```

Ouvrir ensuite l’adresse indiquée par Vite (par défaut `http://127.0.0.1:5173/`).

## Vérifier la compilation

```powershell
npm run build
```

Le site accepte actuellement une partie PGN à la fois. Il ne calcule pas encore d’évaluation moteur ni de conseils stratégiques : cette étape sera ajoutée sur une partie fournie par David. Les fichiers PGN personnels sont ignorés par Git.
