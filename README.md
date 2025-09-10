# PokeKid Catcher

Un petit jeu 2D avec des Pokémon, conçu pour un enfant d'environ 7 ans.
Contrôle un avatar, explore une zone ouverte, approche-toi d'un Pokémon et appuie sur la barre **Espace** pour le capturer. Collectionne-les et observe leurs mini-évolutions après plusieurs captures.

## Lancer le jeu

- Ouvrez le fichier `index.html` dans votre navigateur (double-clic suffit).
- Ou servez le dossier avec un petit serveur web local pour éviter certaines restrictions de navigateur:
  - Python 3: `python3 -m http.server 8000` puis allez sur http://localhost:8000/

## Contrôles

- Flèches du clavier: déplacer le personnage.
- Barre Espace: capturer le Pokémon le plus proche.
- Bouton ↻ ou touche R: recommencer la session.
- Menu d’accueil: choisir un niveau ou utiliser « Continuer » pour reprendre au dernier niveau débloqué.
- Bouton « ? Aide »: ouvre le tutoriel (affiché automatiquement au premier lancement).

## Fonctionnalités

- Déplacement fluide du joueur sur un `canvas` 2D.
- Apparition aléatoire et continue de Pokémon (liste FR simplifiée, ex: Bulbizarre, Salamèche, Pikachu...).
- Sprites officiels chargés depuis PokeAPI (artwork officiel), CORS compatibles.
- Capture via barre Espace avec animation de particules et son (WebAudio).
- Inventaire/collection avec tri par nombre, type ou nom.
- Mini-évolution visuelle après plusieurs captures d'une même espèce (taille, halo plus marqué).
- Obstacles/buissons permettant aux Pokémon de se cacher partiellement.
- Minuteur de session (par défaut 7 minutes) avec écran de fin et option de rejouer.
- Pokémon éphémères: chaque Pokémon reste 3 secondes s’il n’est pas capturé.
- Pièges: différentes arènes possèdent des pièges (⚠) qui retirent des points en cas de collision.
- Arènes: sélectionnez l’arène en haut (Remoat Stadium, Shivre City, Mer Stadium, Auroma Park) avec visuels et pièges dédiés.
- Niveaux: difficulté croissante (vitesses, fréquence d’apparition). Succès du niveau quand vous capturez 20 Pokémon communs ou 10 rares.
- Progression: le dernier niveau débloqué est mémorisé (localStorage). Le bouton « Continuer » permet d’y revenir directement.
- Tutoriel: un overlay récapitule les règles de base (déplacement, capture, pièges, objectifs). Premier lancement automatique.

## Ajustements

- Pour modifier la durée de session, changez `SESSION_SECONDS` dans `main.js`.
- Pour ajuster la fréquence d'apparition, modifiez `SPAWN_INTERVAL`.
- Pour la difficulté, ajustez `MAX_CREATURES`, `EVOLVE_THRESHOLD`, `PLAYER_SPEED`.
- Durée de vie des Pokémon: champ `life` (ms) dans `createCreature()` (par défaut 3000).
- Pièges: modifiez `setArena()` (positions, `penalty`, couleurs);
- Types rares: `RARE_TYPES` (par défaut `spectre`, `dragon`, `fee`).
- Niveaux: réglez la montée de difficulté dans `applyLevel()` (facteur `lvlMul`).

## Crédit/Notes

- Sons générés via l'API WebAudio (aucun fichier audio requis).
- Sprites: PokeAPI (https://pokeapi.co/) via GitHub raw (official-artwork). Vous pouvez remplacer par des images Poképédia si nécessaire (attention à CORS/licences).
- Aucune dépendance externe. S'exécute entièrement côté client.
