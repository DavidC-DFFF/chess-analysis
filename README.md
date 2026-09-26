# Atelier d’analyse d’échecs

Support visuel pour les revues de parties préparées par Codex. Il affiche les positions, les conseils, les coups à revoir et les variantes fournies dans src/review.json. Le site ne calcule pas lui-même les évaluations.

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

Le fichier src/review.json contient pour le moment la position FEN transmise après 1.d4. Quand David enverra le PGN complet, Codex analysera la partie et remplacera cette revue par ses classifications, conseils et variantes. Les fichiers PGN personnels sont ignorés par Git.
