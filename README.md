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

- **Toutes les variantes** : le parcours **Rotation**, sélectionné par défaut, propose les variantes dans l’ordre de la liste. Le parcours **Aléatoire** varie cet ordre sans répétition pendant un tour complet. « Variante suivante » ou « Autre variante » passe à la suite ; le compteur indique les variantes vues dans le tour en cours. Le parcours est conservé par attaque pendant la session.
- Le nom et le numéro de la variante en cours sont affichés au-dessus des commandes. Les différentes réponses noires présentes dans le répertoire sont acceptées ; la suite et son libellé s’adaptent au choix joué. Lorsqu’un choix de réponse change de branche, une variante encore non vue est privilégiée.
- **Variante précise** : sélectionner une ligne pour la répéter. « Recommencer » conserve cette ligne.
- Après chaque réponse, un commentaire explique le coup. Une tentative incorrecte conserve la position et indique un déplacement illégal, un mat en un ou une fourchette vérifiable, ou un coup légal hors du répertoire. Un tel coup n’est pas automatiquement une erreur aux échecs.
- La suite et les explications du prochain coup sont masquées pendant l’exercice. Les trois indices et « Voir la réponse » restent disponibles. Les réponses trouvées, tentatives à revoir et aides sont comptées pour l’exercice en cours.

Le répertoire comprend **12 variantes** : 7 des Deux Cavaliers / Fégatello et 5 du Berger. Les lignes risquées avec `4…Nxe4` sont identifiées ; leur présence ne signifie pas qu’elles donnent un avantage noir. Les trajets illégaux du texte initial ont été corrigés : `Bxc6+` intervient après `Bxb5 Qxd5` et la dame passe par f3 avant de rejoindre b3. Les commentaires corrigent également la prétendue protection supplémentaire de f7 par `Nf6` et le faux clouage du pion f3.

Sur grand écran, l’échiquier, les commandes avec leurs commentaires et les sélecteurs occupent trois colonnes. Les panneaux restent entièrement accessibles sans barre de défilement sur la colonne de droite. Sur une fenêtre plus étroite, la disposition revient à deux colonnes, puis à une seule sur mobile ; le défilement de la page reste possible si la hauteur disponible l’exige.

Les règles de `chess.js` sont embarquées dans le fichier HTML, avec leur licence BSD, pour conserver le fonctionnement hors ligne. Pour vérifier la légalité des lignes, les plateaux et les réponses alternatives :

```powershell
npm test
```

## Apprendre les ouvertures sans serveur

Ouvrir `ouvertures.html` directement dans un navigateur (double-clic sur le fichier). La page contient ses styles, son JavaScript, 11 ouvertures classiques et 12 variantes d’entraînement contre les attaques ; elle ne demande ni installation, ni connexion, ni serveur. Les modes Blancs et Noirs font jouer l’autre camp après une seconde et placent le camp choisi en bas ; le mode Autonome laisse jouer les deux camps. Un clic sur une pièce puis une case trace une flèche sans jouer ; il faut glisser la pièce sur sa destination pour effectuer le coup. On peut flouter la suite, suivre trois indices progressifs (pièce, destination, coup complet), afficher la réponse ou revenir à une position précédente.

Les pièces SVG « Kaneo » de [Kadagaden](https://github.com/Kadagaden/chess-pieces) sont inspirées du style Neo de Chess.com. Elles sont fournies localement sous licence [CC BY 4.0](pieces/kaneo/LICENSE.txt).
