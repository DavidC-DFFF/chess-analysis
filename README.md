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

## S’entraîner à répondre à une attaque

Ouvrir `ouvertures.html`, puis choisir **Répondre à Fégatello** ou **Répondre au coup du Berger** dans « Choisir un entraînement ». Les Noirs sont placés en bas et l’exercice commence devant la menace blanche : après `4.Ng5` pour les Deux Cavaliers, après `2.Qh5` ou `2.Bc4` pour le Berger.

- **Variantes mélangées** : une variante est proposée à chaque exercice. Les différentes réponses noires présentes dans le répertoire sont acceptées ; la suite s’adapte au choix joué. « Autre variante » renouvelle l’exercice.
- **Variante précise** : sélectionner une ligne pour la répéter. « Recommencer » conserve cette ligne.
- Après chaque réponse, un commentaire explique le coup. Une tentative incorrecte conserve la position et indique un déplacement illégal, un mat en un ou une fourchette vérifiable, ou un coup légal hors du répertoire. Un tel coup n’est pas automatiquement une erreur aux échecs.
- La suite et les explications du prochain coup sont masquées pendant l’exercice. Les trois indices et « Voir la réponse » restent disponibles. Les réponses trouvées, tentatives à revoir et aides sont comptées pour l’exercice en cours.

Le répertoire comprend **12 variantes** : 7 des Deux Cavaliers / Fégatello et 5 du Berger. Les lignes risquées avec `4…Nxe4` sont identifiées ; leur présence ne signifie pas qu’elles donnent un avantage noir. Les trajets illégaux du texte initial ont été corrigés : `Bxc6+` intervient après `Bxb5 Qxd5` et la dame passe par f3 avant de rejoindre b3. Les commentaires corrigent également la prétendue protection supplémentaire de f7 par `Nf6` et le faux clouage du pion f3.

Les règles de `chess.js` sont embarquées dans le fichier HTML, avec leur licence BSD, pour conserver le fonctionnement hors ligne. Pour vérifier la légalité des lignes, les plateaux et les réponses alternatives :

```powershell
npm test
```

## Apprendre les ouvertures sans serveur

Ouvrir `ouvertures.html` directement dans un navigateur (double-clic sur le fichier). La page contient ses styles, son JavaScript, 11 ouvertures classiques et 12 variantes d’entraînement contre les attaques ; elle ne demande ni installation, ni connexion, ni serveur. Les modes Blancs et Noirs font jouer l’autre camp après une seconde et placent le camp choisi en bas ; le mode Autonome laisse jouer les deux camps. Un clic sur une pièce puis une case trace une flèche sans jouer ; il faut glisser la pièce sur sa destination pour effectuer le coup. On peut flouter la suite, suivre trois indices progressifs (pièce, destination, coup complet), afficher la réponse ou revenir à une position précédente.

Les pièces SVG « Kaneo » de [Kadagaden](https://github.com/Kadagaden/chess-pieces) sont inspirées du style Neo de Chess.com. Elles sont fournies localement sous licence [CC BY 4.0](pieces/kaneo/LICENSE.txt).
