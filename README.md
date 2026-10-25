# Atelier d’analyse d’échecs

## Apparence de l’échiquier

Les trois pages utilisent par défaut les **pièces Neo** et le **plateau Walnut (noyer)**, identifiés à partir de la capture Chess.com de David. Les fichiers sont locaux : `pieces/neo/` et `boards/walnut.webp`. Leur provenance et les crédits sont conservés dans `boards/SOURCE.md`. Le style commun est maintenu dans `src/chess-theme.css` et intégré aux pages autonomes par `npm run build`. Les surbrillances de sélection, de dernier coup et d’indice restent disponibles sur le plateau texturé.

## Sons Default

La banque **Default** est stockée localement dans `audio/default/`, avec sa provenance dans `SOURCE.md`. Les leçons, ouvertures et la revue de partie utilisent les sons de déplacement, prise, roque, promotion et échec. Une tentative refusée joue le son `illegal` ; la fin d’un exercice joue `game-end` après le son du déplacement. Ces deux signaux remplacent les sons de correction spécifiques, absents de cette copie de la banque. Les voix des commentaires ne sont pas incluses.

Le bouton **Son : activé / Son : coupé** est présent sur les trois pages ; son choix est conservé dans le navigateur lorsque le stockage local est disponible. Aucun son ne joue au chargement. Les retours en arrière et les sauts de plusieurs coups restent silencieux. Les fichiers audio fonctionnent aussi hors ligne et sont copiés dans `dist/audio/` à la compilation.

## Répéter les leçons

Les réponses adverses sont jouées après **0,7 seconde**, pour laisser le temps de voir son propre coup. Les déplacements et indices sont bloqués pendant cette attente ; changer d’exercice, de leçon ou revenir à l’explication annule la réponse programmée. Le son de chaque camp accompagne son propre déplacement.

Le catalogue contient **176 leçons et 916 exercices** : les leçons déjà importées et les 40 leçons débloquées manquantes du parcours personnel enregistré. Toutes sont réunies dans une progression par difficulté et par thème, avec une numérotation continue. Le classement est défini dans `tools/lesson-library-order.mjs` et conserve l’ordre interne de chaque cours ; il est adapté à cette bibliothèque, sans reproduire exactement un parcours Chess.com particulier. Les 53 leçons débloquées de la sauvegarde sont présentes ; les cinq encore verrouillées n’ont pas été ajoutées. L’écran conserve uniquement le menu, l’échiquier et les commandes utiles. La provenance et les limites de synchronisation se consultent par le bouton **i** en haut à droite, dans une fenêtre fermable avec Échap. Sur ordinateur, l’échiquier adapte sa taille à la hauteur disponible pour éviter le défilement de la page ; sur mobile, la page reste accessible verticalement. Les explications en plusieurs écrans, les exercices et la répétition sont disponibles hors ligne ; les exercices réussis sont conservés dans le navigateur.

Pour préparer un nouvel instantané depuis une page Learn enregistrée : `node tools/prepare-personal-curriculum.mjs "chemin-vers-la-page.html"`. Puis importer les leçons manquantes : `node tools/import-lesson-catalog.mjs data/personal-lesson-curriculum.json data/personal-lesson-import-report.json --only-missing`, et reconstruire avec `npm run build`. Aucune donnée de connexion n’est nécessaire ni conservée. Le fichier `data/personal-lesson-curriculum.json` conserve seulement le classement des leçons débloquées de la sauvegarde, sans synchronisation automatique du compte.

L’état connecté du compte n’est pas accessible à cet import : les leçons affichées ne sont pas présentées comme toutes débloquées sur Chess.com. La page publique utilise un parcours où Tempo ne figure pas ; cette leçon reste disponible à part, sans numéro de progression inventé. Les données brutes, y compris les variantes originales, restent dans `data/lessons/`. L’inventaire et les rapports sont dans `data/lesson-curriculum.json`, `data/lesson-import-report.json` et `data/lesson-playback-report.json`.

Pour actualiser une copie publique de la page Learn : `node tools/prepare-lesson-curriculum.mjs`, puis `node tools/import-lesson-catalog.mjs`. Le premier script lit `.analysis-tools/chesscom-learn-fr.html` ; le second conserve un cache local et signale les échecs de téléchargement. `npm run build` intègre les données et les scripts au lecteur autonome.

L’onglet **Leçons** ouvre `lecons.html`, également utilisable par double-clic sans serveur ni connexion. La première leçon, **Le fou**, comprend l’explication du déplacement et trois exercices de capture d’étoiles. Clique sur le fou puis sur sa destination, ou fais-le glisser. Les déplacements diagonaux intermédiaires sont acceptés ; les coups incorrects conservent la position et affichent une explication. Un indice, la sélection d’un exercice et les boutons pour répéter un exercice ou toute la leçon restent disponibles. La progression concerne la séance en cours.

Le sélecteur **Mes leçons** propose aussi **Tempo**, avec six exercices de développement avec menace. Les consignes, indices, commentaires de réussite et explications des mauvaises variantes proviennent des données importées. Les solutions sont masquées avant la réponse. L’échiquier place le camp à jouer en bas, vérifie la légalité des coups et conserve la position après une réponse incorrecte.

Les données importées sont conservées dans `data/lessons/le-fou.json` et `data/lessons/tempo-aux-echecs.json`. Après un nouvel import avec `tools/import-chesscom-lesson.ps1`, exécuter `node tools/build-lessons.mjs` pour actualiser la copie intégrée à la page. Le moteur de Tempo et l’interface sont maintenus dans `src/tempo-lesson.js` et `src/lessons-ui.js`, puis intégrés à la page autonome par ce script. `npm run build` le fait automatiquement et produit aussi les pages Ouvertures et Leçons avec leurs pièces locales.

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
- Le nom et le numéro de la variante en cours sont affichés au-dessus des commandes. Un coup appartenant à une autre branche du répertoire est accepté en **Rotation**, en **Aléatoire**, en **Learn**, en **Test** et lorsqu’une variante précise est sélectionnée : la suite, le libellé et le sélecteur s’adaptent au coup joué, en privilégiant une branche encore non vue. « Variante suivante » poursuit l’ordre cyclique à partir de la variante affichée en sautant celles déjà vues ; le retour au tour suivant ne répète pas immédiatement la même variante.
- **Variante précise** : sélectionner une ligne pour la répéter. « Recommencer » conserve cette ligne.
- **Learn · apprendre** : commencer à la position initiale, avancer ou reculer d’un coup avec les flèches, lire l’explication du coup joué et suivre la flèche bleue du prochain coup. Les deux camps avancent à la demande, sans réponse automatique.
- **Test · mémoriser** : retrouver les réponses des Noirs sans afficher le prochain coup. Les Blancs répondent automatiquement. Passer de Learn à Test redémarre la même variante, sans faire avancer le parcours.
- Après chaque réponse, un commentaire explique le coup. Une tentative incorrecte conserve la position et indique un déplacement illégal, un mat en un ou une fourchette vérifiable, ou un coup légal hors du répertoire. Un tel coup n’est pas automatiquement une erreur aux échecs.
- En Test, la suite et les explications du prochain coup sont masquées. Les trois indices et « Voir la réponse » restent disponibles. Les réponses trouvées, tentatives à revoir et aides sont comptées pour l’exercice en cours. Avancer avec la flèche droite en Test compte comme une réponse montrée.

Le répertoire comprend **11 variantes** : 6 des Deux Cavaliers / Fégatello et 5 du Berger. Les lignes risquées avec `4…Nxe4` sont identifiées ; leur présence ne signifie pas qu’elles donnent un avantage noir. Les trajets illégaux du texte initial ont été corrigés : `Bxc6+` intervient après `Bxb5 Qxd5` et la dame passe par f3 avant de rejoindre b3. Les commentaires corrigent également la prétendue protection supplémentaire de f7 par `Nf6` et le faux clouage du pion f3.

La contre-attaque « 5…b5 » conserve une seule entrée, avec la suite complète jusqu’à `10…O-O-O` : l’échange en c6 prolonge cette même ligne. Un test contrôle que les réponses ne sont ni identiques ni entièrement incluses dans une autre suite.

La variante « Capture du fou · 5.Bxd5 » continue après `6…Qxg5` par `7.dxc6 Qxg2 8.Rf1 Qxc6`. Elle illustre la menace sur la tour h1 et la perte du droit au petit roque après son déplacement. Le grand roque reste autorisé en principe ; le bilan final est un pion de plus pour les Noirs, avec autant de pièces mineures de chaque côté.

Sur grand écran, l’échiquier, les commandes avec leurs commentaires et les sélecteurs occupent trois colonnes. Les panneaux restent entièrement accessibles sans barre de défilement sur la colonne de droite. Sur une fenêtre plus étroite, la disposition revient à deux colonnes, puis à une seule sur mobile ; le défilement de la page reste possible si la hauteur disponible l’exige.

Les règles de `chess.js` sont embarquées dans le fichier HTML, avec leur licence BSD, pour conserver le fonctionnement hors ligne. Pour vérifier la légalité des lignes, les plateaux et les réponses alternatives :

```powershell
npm test
```

## Apprendre les ouvertures sans serveur

Ouvrir `ouvertures.html` directement dans un navigateur (double-clic sur le fichier). La page contient ses styles, son JavaScript, 11 ouvertures classiques et 11 variantes d’entraînement contre les attaques ; elle ne demande ni installation, ni connexion, ni serveur. Les modes Blancs et Noirs font jouer l’autre camp après une seconde et placent le camp choisi en bas ; le mode Autonome laisse jouer les deux camps. Pour jouer, glisser la pièce sur sa destination ou cliquer sur la pièce puis sur la case d’arrivée. Le déplacement est animé, y compris pendant la navigation coup par coup et les réponses automatiques ; les préférences de mouvement réduit sont respectées. On peut flouter la suite, suivre trois indices progressifs (pièce, destination, coup complet), afficher la réponse ou revenir à une position précédente.

Les pièces SVG « Kaneo » de [Kadagaden](https://github.com/Kadagaden/chess-pieces) sont inspirées du style Neo de Chess.com. Elles sont fournies localement sous licence [CC BY 4.0](pieces/kaneo/LICENSE.txt).
