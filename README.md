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

## Apprendre les ouvertures sans serveur

Ouvrir `ouvertures.html` directement dans un navigateur (double-clic sur le fichier). La page contient ses styles, son JavaScript et 11 lignes d’ouverture ; elle ne demande ni installation, ni connexion, ni serveur. Les modes Blancs et Noirs font jouer l’autre camp après une seconde et placent le camp choisi en bas ; le mode Autonome laisse jouer les deux camps. On peut flouter la suite, suivre trois indices progressifs (pièce, destination, coup complet), afficher la réponse ou revenir à une position précédente.

Les pièces SVG « Kaneo » de [Kadagaden](https://github.com/Kadagaden/chess-pieces) sont inspirées du style Neo de Chess.com. Elles sont fournies localement sous licence [CC BY 4.0](pieces/kaneo/LICENSE.txt).
