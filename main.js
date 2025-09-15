  // (setPaused sera défini plus bas après les références DOM)

/*
  PokeKid Catcher - Jeu 2D simple pour enfant (7+)
  - Déplacement du joueur (flèches)
  - Apparition aléatoire de créatures mignonnes (types/couleurs/patterns)
  - Capture par clic/touch avec animation de particules et son WebAudio
  - Inventaire/collection triable (nombre, type, couleur)
  - Mini-évolution: après N captures d'une espèce, version évoluée
  - Minuteur de session et écran de fin + redémarrage
*/

(() => {
  // --- Références DOM
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const timerEl = document.getElementById('timer');
  const scoreEl = document.getElementById('score');
  const bestScoreHUD = document.getElementById('bestScoreHUD');
  const objectivesHUD = document.getElementById('objectivesHUD');
  const sortSelect = document.getElementById('sortSelect');
  const arenaSelect = document.getElementById('arenaSelect');
  const collectionList = document.getElementById('collectionList');
  const overlay = document.getElementById('overlay');
  const statsText = document.getElementById('statsText');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnRestart = document.getElementById('btnRestart');
  const menuOverlay = document.getElementById('menuOverlay');
  const levelOverlay = document.getElementById('levelOverlay');
  const levelResultTitle = document.getElementById('levelResultTitle');
  const levelResultText = document.getElementById('levelResultText');
  const btnNextLevel = document.getElementById('btnNextLevel');
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  const btnContinue = document.getElementById('btnContinue');
  const btnHelp = document.getElementById('btnHelp');
  const tutorialOverlay = document.getElementById('tutorialOverlay');
  const btnStartTutorial = document.getElementById('btnStartTutorial');
  const playerNameInput = document.getElementById('playerNameInput');
  const btnScores = document.getElementById('btnScores');
  const scoresOverlay = document.getElementById('scoresOverlay');
  const scoresList = document.getElementById('scoresList');
  const btnCloseScores = document.getElementById('btnCloseScores');
  const btnClearScores = document.getElementById('btnClearScores');
  // Panneau scores dans la sidebar (derrière le jeu)
  // Demande de nom: drapeau de session (déclaré tôt pour éviter la TDZ)
  let askedNameThisSession = false;
  let scoresPanel = document.getElementById('scoresPanel');
  if (!scoresPanel) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <h2 style="margin:0;">Scores</h2>
          <button id="btnChangeName" class="btn btn-secondary" title="Changer de nom">👤 Nom</button>
        </div>
        <div id="scoresPanel" style="max-height:50vh;overflow:auto;margin-top:8px;"></div>`;
      sidebar.appendChild(panel);
      scoresPanel = panel.querySelector('#scoresPanel');
      // Panneau Niveaux sous Scores
      const levelsPanel = document.createElement('div');
      levelsPanel.className = 'panel';
      levelsPanel.innerHTML = `
        <h2 style="margin-top:0;">Niveaux</h2>
        <div id="levelsSidebarGrid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;"></div>
      `;
      sidebar.appendChild(levelsPanel);
      // Construire immédiatement les boutons de niveaux dans la sidebar
      buildSidebarLevelButtons(40);
    }
  }

  function buildLevelButtons(count=40) {
    if (!levelGrid) return;
    levelGrid.innerHTML = '';
    levelButtons = [];
    for (let i = 1; i <= count; i++) {
      const b = document.createElement('button');
      b.id = `btnLevel${i}`;
      b.className = 'btn';
      b.textContent = `Niveau ${i}`;
      b.disabled = i > highestLevel;
      b.addEventListener('click', () => startLevel(i));
      levelGrid.appendChild(b);
      levelButtons.push(b);
    }
  }

  function buildSidebarLevelButtons(count=40) {
    const grid = document.getElementById('levelsSidebarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    // Récupère un niveau max sans supposer que highestLevel est déjà défini
    let hl;
    try { hl = (typeof highestLevel !== 'undefined') ? highestLevel : null; } catch { hl = null; }
    if (!Number.isFinite(hl)) {
      try { hl = parseInt(localStorage.getItem('highestLevel') || '1', 10); } catch { hl = 1; }
    }
    for (let i = 1; i <= count; i++) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = `Niveau ${i}`;
      b.disabled = i > hl;
      b.addEventListener('click', () => startLevel(i));
      grid.appendChild(b);
    }
  }

  function refreshBestScoreHUD() {
    if (!bestScoreHUD) return;
    try {
      const best = parseInt(localStorage.getItem('best_score') || '0', 10);
      bestScoreHUD.textContent = `Meilleur: ${isFinite(best) ? best : 0}`;
    } catch {
      bestScoreHUD.textContent = 'Meilleur: 0';
    }
  }
  const btnPause = document.getElementById('btnPause');
  const pausedBadge = document.getElementById('pausedBadge');
  const btnFullscreen = document.getElementById('btnFullscreen');
  // (Réglages supprimés)
  // Intro de niveau
  const levelIntroOverlay = document.getElementById('levelIntroOverlay');
  const levelIntroTitle = document.getElementById('levelIntroTitle');
  const levelIntroContent = document.getElementById('levelIntroContent');
  const btnStartLevelNow = document.getElementById('btnStartLevelNow');
  const btnBackToMenuFromIntro = document.getElementById('btnBackToMenuFromIntro');
  const levelGrid = document.querySelector('.level-grid');
  let levelButtons = [];
  function buildLevelButtons(count=40) {
    if (!levelGrid) return;
    levelGrid.innerHTML = '';
    levelButtons = [];
    for (let i = 1; i <= count; i++) {
      const b = document.createElement('button');
      b.id = `btnLevel${i}`;
      b.className = 'btn';
      b.textContent = `Niveau ${i}`;
      b.disabled = i > highestLevel;
      b.addEventListener('click', () => startLevel(i));
      levelGrid.appendChild(b);
      levelButtons.push(b);
    }
  }
  const levelPill = document.getElementById('levelPill');

  // --- Constantes de jeu
  const WORLD = { w: canvas.width, h: canvas.height };
  const SESSION_SECONDS = 7 * 60; // 7 minutes par défaut (entre 5-10)
  const BASE_SPAWN_INTERVAL = 1600; // ms
  const MAX_CREATURES = 14;
  const CREATURE_BASE_SIZE = 26;
  const PLAYER_SPEED = 2.8;
  const PARTICLE_COUNT = 18;
  const EVOLVE_THRESHOLD = 3; // captures d'une même espèce pour évoluer
  const POKEMON_BASE_SPEED = 0.7; // vitesse de déplacement des Pokémon

  // variables dynamiques pour accélération
  let spawnInterval = BASE_SPAWN_INTERVAL;
  let playerSpeed = PLAYER_SPEED;
  let creatureSpeedMul = 1.0;
  let accelerated = false;
  let levelDurationSec = 7 * 60; // sera recalculé par niveau

  // Niveaux et progression
  const RARE_TYPES = new Set(['spectre','dragon','fee']);
  let currentLevel = 1;
  let highestLevel = parseInt(localStorage.getItem('highestLevel') || '1', 10);
  // Objectif unifié: il faut atteindre une valeur cible; un rare compte double
  let capturedTotalWeighted = 0; // +1 pour commun, +2 pour rare
  let targetTotal = 5; // Niveau 1 = 5, puis +5 par niveau
  let inMenu = true;
  let levelStartTime = 0;
  let currentArena = 'remoat';
  let hp = 1.0; // 0..1

  function updateLevelPill() {
    if (levelPill) levelPill.textContent = `Niveau ${currentLevel}`;
  }
  function applyLevel(level) {
    currentLevel = level;
    updateLevelPill();
    // ajuster les paramètres selon le niveau
    // croît linéairement: plus haut niveau => plus rapide et spawns plus fréquents
    const lvlMul = 1 + (level - 1) * 0.15; // +15% par niveau
    playerSpeed = PLAYER_SPEED * lvlMul;
    creatureSpeedMul = 1.0 * lvlMul;
    spawnInterval = Math.max(500, Math.floor(BASE_SPAWN_INTERVAL / lvlMul));
    // durée du niveau: base 7min moins 30s par niveau (niveau 1 = 7:00)
    levelDurationSec = Math.max(60, (7 * 60) - ((currentLevel - 1) * 30));
    // Objectif par niveau: base 15 et +5 par niveau
    targetTotal = getLevelTarget(currentLevel);
  }

  // Durée de vie des Pokémon selon le niveau: 4.0s au niveau 1, -0.2s par niveau (min 1.0s)
  function getCreatureLifeMs() {
    const seconds = Math.max(1.0, 4.0 - 0.2 * (currentLevel - 1));
    return Math.round(seconds * 1000);
  }

  // Objectif selon le niveau: base 5, +5 par niveau
  function getLevelTarget(level){
    const lvl = Math.max(1, Math.min(40, level));
    return 5 + 5 * (lvl - 1);
  }

  // Sélectionne quelques Pokémon faciles (types fréquents) et durs (types rares)
  function pickSpeciesByDifficulty() {
    const easyTypes = ['normal','eau','plante','electrik','feu'];
    const hardTypes = Array.from(RARE_TYPES);
    const easy = POKEMON_LIST.filter(p => easyTypes.includes(p.type)).slice(0, 6);
    const hard = POKEMON_LIST.filter(p => hardTypes.includes(p.type)).slice(0, 6);
    return { easy, hard };
  }

  function renderLevelIntro() {
    if (!levelIntroOverlay || !levelIntroContent || !levelIntroTitle) return;
    levelIntroTitle.textContent = `Niveau ${currentLevel}`;
    const { easy, hard } = pickSpeciesByDifficulty();
    const timeStr = `${Math.floor(levelDurationSec/60)}:${String(Math.floor(levelDurationSec%60)).padStart(2,'0')}`;
    const easyHtml = easy.map(p => `<div class="poke"><img alt="${p.name}" src="${spriteUrl(p.id)}"/><span>${p.name}</span></div>`).join('');
    const hardHtml = hard.map(p => `<div class="poke"><img alt="${p.name}" src="${spriteUrl(p.id)}"/><span>${p.name}</span></div>`).join('');
    levelIntroContent.innerHTML = `
      <p>Temps: <strong>${timeStr}</strong> • Objectif: <strong>${targetTotal} captures</strong> (les rares comptent double)</p>
      <div class="intro-grid">
        <div>
          <h3>Plus faciles</h3>
          <div class="poke-row">${easyHtml}</div>
        </div>
        <div>
          <h3>Plus difficiles</h3>
          <div class="poke-row">${hardHtml}</div>
        </div>
      </div>
    `;
    // Mettre à jour la ligne du tutoriel concernant l'objectif et la durée de vie
    try {
      const lifeSec = (getCreatureLifeMs() / 1000).toFixed(1);
      const tutoItems = document.querySelectorAll('#tutorialOverlay li');
      for (const li of tutoItems) {
        if (li.textContent && li.textContent.includes('Objectif')) {
          li.innerHTML = `Objectif: <strong>${targetTotal}</strong> captures (les rares comptent double).`;
        }
        if (li.textContent && li.textContent.includes('disparaissent')) {
          li.innerHTML = `Les Pokémon disparaissent après <strong>${lifeSec}s</strong>.`;
        }
      }
    } catch {}
  }

  function showLevelIntro() {
    renderLevelIntro();
    if (levelIntroOverlay) levelIntroOverlay.classList.remove('hidden');
  }
  function hideLevelIntro() {
    if (levelIntroOverlay) levelIntroOverlay.classList.add('hidden');
  }
  function lockLevelButtons() {
    levelButtons.forEach((btn, idx) => {
      const lvl = idx + 1;
      btn.disabled = lvl > highestLevel;
    });
    // Met à jour aussi la grille de niveaux dans la sidebar
    buildSidebarLevelButtons(40);
  }
  function showMenu() {
    inMenu = true;
    running = false;
    if (menuOverlay) menuOverlay.classList.remove('hidden');
    lockLevelButtons();
    // Pré-remplir le nom s'il existe et focus sinon
    maybeAskNameOnce();
  }
  function startLevel(levelToStart) {
    // Récupère/sauvegarde le nom depuis le champ si saisi
    if (playerNameInput && playerNameInput.value.trim()) {
      try { localStorage.setItem('player_name', playerNameInput.value.trim()); } catch {}
    }
    applyLevel(levelToStart);
    inMenu = false;
    running = false;
    if (menuOverlay) menuOverlay.classList.add('hidden');
    // arène automatique en fonction du niveau (déjà avant démarrage)
    const arenaCycle = ['remoat','shivre','mer','theia','auroma','ruins','desert','jungle'];
    const autoArena = arenaCycle[(currentLevel - 1) % arenaCycle.length];
    setArena(autoArena);
    showLevelIntro();
  }

  function actuallyBeginLevel() {
    hideLevelIntro();
    restartGame();
    running = true;
    levelStartTime = performance.now();
    // Burst de départ: remplir rapidement avec beaucoup de Pokémon lents
    const desired = Math.min(MAX_CREATURES, 12 + Math.floor(currentLevel * 0.5));
    for (let i = 0; i < desired; i++) {
      const c = createCreature();
      if (c) creatures.push(c);
    }
  }
  function onLevelSuccess() {
    running = false;
    if (levelOverlay) levelOverlay.classList.remove('hidden');
    if (levelResultTitle) levelResultTitle.textContent = 'Niveau réussi !';
    // Calcul stats
    const elapsedSec = Math.max(0, Math.round((performance.now() - levelStartTime) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    if (levelResultText) {
      levelResultText.innerHTML = `Temps: <strong>${timeStr}</strong><br>` +
        `Captures (pondéré): <strong>${capturedTotalWeighted}/${targetTotal}</strong> • Captures brutes: <strong>${totalCaptures}</strong><br>` +
        `Score: <strong>${score}</strong>`;
    }
    if (currentLevel >= highestLevel) {
      highestLevel = Math.min(currentLevel + 1, 40);
      localStorage.setItem('highestLevel', String(highestLevel));
      // Rebuild la grille de niveaux dans la sidebar lorsque l'on débloque un niveau
      buildSidebarLevelButtons(40);
    }
    playLevelSuccessSound();
    saveScore('level_success');
  }

  // Dictionnaire simplifié de Pokémon (id Pokédex, nom FR, type principal)
  const POKEMON_LIST = [
    { id: 1, name: 'Bulbizarre', type: 'plante' },
    { id: 4, name: 'Salamèche', type: 'feu' },
    { id: 7, name: 'Carapuce', type: 'eau' },
    { id: 25, name: 'Pikachu', type: 'electrik' },
    { id: 39, name: 'Rondoudou', type: 'fee' },
    { id: 52, name: 'Miaouss', type: 'normal' },
    { id: 60, name: 'Ptitard', type: 'eau' },
    { id: 92, name: 'Fantominus', type: 'spectre' },
    { id: 133, name: 'Évoli', type: 'normal' },
    { id: 147, name: 'Minidraco', type: 'dragon' },
    { id: 152, name: 'Germignon', type: 'plante' },
    { id: 155, name: 'Héricendre', type: 'feu' },
    { id: 158, name: 'Kaiminus', type: 'eau' },
    { id: 173, name: 'Mélo', type: 'fee' },
    { id: 175, name: 'Togepi', type: 'fee' },
    { id: 172, name: 'Pichu', type: 'electrik' },
  ];

  const TYPE_COLORS = {
    feu: '#ff6b6b',
    eau: '#4dabf7',
    plante: '#57cc99',
    electrik: '#f7d154',
    normal: '#cfd8dc',
    spectre: '#9c6ade',
    fee: '#f99fc9',
    dragon: '#8fa8ff'
  };

  // Pondération d'apparition par type: plus élevé = plus fréquent
  // Types rares (spectre, dragon, fée) ont un poids plus faible
  const TYPE_WEIGHTS = {
    normal: 3.0,
    eau: 3.0,
    plante: 3.0,
    feu: 2.2,
    electrik: 2.0,
    // Rares un peu plus fréquents
    fee: 1.6,
    spectre: 1.5,
    dragon: 1.3
  };

  function weightedRandomPokemon() {
    // Calcule un tirage pondéré sur POKEMON_LIST en fonction du type
    let total = 0;
    for (const p of POKEMON_LIST) total += (TYPE_WEIGHTS[p.type] || 1);
    let r = Math.random() * total;
    for (const p of POKEMON_LIST) {
      r -= (TYPE_WEIGHTS[p.type] || 1);
      if (r <= 0) return p;
    }
    return POKEMON_LIST[0];
  }

  // Score: inversement proportionnel à la fréquence
  function pointsForType(typeKey) {
    const w = TYPE_WEIGHTS[typeKey] || 1;
    // Base: normal/eau/plante ~ 3 => 50 pts, rare ~0.8 => ~180 pts
    const base = Math.round(150 / w);
    // multiplicateur de niveau (plus le niveau est haut, plus ça rapporte)
    const lvlMul = 1 + (currentLevel - 1) * 0.1; // +10% par niveau
    return Math.round(base * lvlMul);
  }

  function spriteUrl(id) {
    // Sprites officiels PokeAPI (CORS OK)
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }
  const imageCache = new Map();
  function getPokemonImage(id) {
    if (imageCache.has(id)) return imageCache.get(id);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = spriteUrl(id);
    imageCache.set(id, img);
    return img;
  }

  // --- Images d'arrière-plan d'arène ---
  const arenaBgCache = new Map(); // key -> HTMLImageElement | null (si échec)
  function loadArenaBg(key) {
    if (arenaBgCache.has(key)) return arenaBgCache.get(key);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { arenaBgCache.set(key, img); };
    img.onerror = () => { arenaBgCache.set(key, null); };
    img.src = 'assets/arenas/official.jpg';
    return img;
  }

  // --- Sprite joueur (Sacha) ---
  const PLAYER_SPRITE_URLS = [
    'assets/sprites/ash.png',
    'assets/sprites/sacha.png',
    'sprites/ash.png',
    'sprites/sacha.png',
  ];
  let playerSprite = null; // HTMLImageElement ou null
  (function initPlayerSprite(){
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let i = 0;
    const userSprite = localStorage.getItem('playerSpriteUrl');
    const urls = userSprite ? [userSprite, ...PLAYER_SPRITE_URLS] : PLAYER_SPRITE_URLS;
    function tryNext(){
      if (i >= urls.length) {
        // Fallback intégré: petit SVG de Sacha
        const svg = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 96'>\n  <defs>\n    <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>\n      <stop offset='0' stop-color='#42a5f5'/>\n      <stop offset='1' stop-color='#1e88e5'/>\n    </linearGradient>\n  </defs>\n  <rect x='18' y='28' width='28' height='38' rx='6' fill='url(#g)' stroke='#0d47a1' stroke-width='2'/>\n  <circle cx='32' cy='20' r='12' fill='#ffe0b2' stroke='#d1a374' stroke-width='2'/>\n  <path d='M16,18 h32 l-6,-8 h-20 z' fill='#ef5350' stroke='#b71c1c' stroke-width='2'/>\n  <circle cx='32' cy='18' r='4' fill='#ffffff' stroke='#b71c1c' stroke-width='2'/>\n  <rect x='22' y='66' width='8' height='20' rx='3' fill='#37474f'/>\n  <rect x='34' y='66' width='8' height='20' rx='3' fill='#37474f'/>\n</svg>")}`;
        const im2 = new Image();
        im2.onload = () => { playerSprite = im2; };
        im2.src = svg;
        return;
      }
      img.src = urls[i++];
    }
    img.onload = () => { playerSprite = img; };
    img.onerror = () => { tryNext(); };
    tryNext();
  })();

  // (Utilitaires réglages supprimés)

  // Utilitaires (déclarés tôt car utilisés dans l'init d'arène)
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist2(a, b, x, y) { const dx = a - x, dy = b - y; return dx*dx + dy*dy; }

  // Obstacles décoratifs pour cacher des créatures (occlusion simple)
  let obstacles = [];
  function regenObstacles(bounds) {
    // Désactivé: plus d'obstacles verts
    obstacles = [];
  }

  // Pièges par arène
  let arena = 'remoat';
  let traps = [];
  let meds = [];
  let lastTrapSpawn = 0;
  let lastMedSpawn = 0;
  const TRAP_LIFE_MS = 2000;
  const TRAP_SPAWN_INTERVAL = 1000;
  const MAX_TRAPS = 5;
  const MED_LIFE_MS = 6000;
  const MED_SPAWN_INTERVAL = 9999999; // désactivé (spawn contrôlé par règle 1 med / 10 pièges)
  const MAX_MEDS = 3;
  let trapColor = '#d84315';
  let trapPenalty = 100; // points
  let trapRadiusRange = [16, 22];
  let medColor = '#00c853';
  let totalTrapSpawns = 0; // compte cumulatif
  const ARENA_CONFIGS = {
    // Arènes officielles (Pokémon Unite) et bonus
    remoat: { name: 'Remoat Stadium', bg: ['#bde4a7','#a8db95'], bounds: { x: 40, y: 40, w: 880, h: 460 } },
    shivre: { name: 'Shivre City', bg: ['#e0f7fa','#b3e5fc'], bounds: { x: 60, y: 36, w: 840, h: 468 } },
    mer:    { name: 'Mer Stadium',   bg: ['#b3e5fc','#81d4fa'], bounds: { x: 80, y: 60, w: 800, h: 420 } },
    theia:  { name: 'Theia Sky Ruins', bg: ['#ede7f6','#d1c4e9'], bounds: { x: 64, y: 48, w: 832, h: 444 } },
    auroma: { name: 'Auroma Park',   bg: ['#f3e5f5','#e1bee7'], bounds: { x: 48, y: 72, w: 864, h: 396 } },
    ruins:  { name: 'Ruins',         bg: ['#d7ccc8','#bcaaa4'], bounds: { x: 96, y: 48, w: 768, h: 444 } },
    desert: { name: 'Desert',        bg: ['#ffe0b2','#ffcc80'], bounds: { x: 80, y: 80, w: 800, h: 380 } },
    jungle: { name: 'Jungle',        bg: ['#c8e6c9','#a5d6a7'], bounds: { x: 60, y: 60, w: 840, h: 420 } },
  };
  let arenaBounds = ARENA_CONFIGS.remoat.bounds;
  let arenaNameTimer = 0;

  function setArena(key) {
    arena = key;
    currentArena = key;
    // paramètres de pièges/soins selon arène (couleur/gravité)
    if (arena === 'remoat') { trapColor = '#d84315'; trapPenalty = 80; }
    else if (arena === 'shivre') { trapColor = '#1e88e5'; trapPenalty = 90; }
    else if (arena === 'mer') { trapColor = '#1565c0'; trapPenalty = 100; }
    else if (arena === 'theia') { trapColor = '#8e24aa'; trapPenalty = 130; }
    else if (arena === 'auroma') { trapColor = '#6a1b9a'; trapPenalty = 120; }
    else if (arena === 'ruins') { trapColor = '#5d4037'; trapPenalty = 110; }
    else if (arena === 'desert') { trapColor = '#f9a825'; trapPenalty = 100; }
    else if (arena === 'jungle') { trapColor = '#2e7d32'; trapPenalty = 90; }
    // reset dynamique
    traps = [];
    meds = [];
    lastTrapSpawn = performance.now();
    lastMedSpawn = performance.now();
    // limites d'arène
    const conf = ARENA_CONFIGS[arena] || ARENA_CONFIGS.remoat;
    // Étend l'arène à tout l'écran
    arenaBounds = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };
    regenObstacles(arenaBounds);
    arenaNameTimer = 2000; // ms
    loadArenaBg(arena); // tenter de charger l'image de fond de cette arène
  }
  setArena('remoat');

  // Etat de jeu
  let keys = new Set();
  let player = { x: WORLD.w * 0.5, y: WORLD.h * 0.5, r: 16, vx: 0, vy: 0, facing: 1, lastTrapHitAt: 0 };
  let creatures = []; // pokémon visibles sur la carte
  let particles = []; // particules d'animation
  let lastSpawn = 0;
  let running = true;
  let isPaused = false;
  // Contrôle souris (position cible + interpolation)
  let targetMouseX = null, targetMouseY = null;
  function setMouseTarget(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    // clamp dans l'arène
    const margin = 16;
    targetMouseX = clamp(mx, arenaBounds.x + margin, arenaBounds.x + arenaBounds.w - margin);
    targetMouseY = clamp(my, arenaBounds.y + margin, arenaBounds.y + arenaBounds.h - margin);
  }
  // attacher sur le canvas: définir la cible
  canvas.addEventListener('mousemove', setMouseTarget, { passive: true });

  // Gestion pause (maintenant que les refs DOM existent)
  function setPaused(v) {
    isPaused = !!v;
    if (btnPause) btnPause.textContent = isPaused ? '▶ Reprendre' : '⏸ Pause';
    if (pausedBadge) pausedBadge.classList.toggle('hidden', !isPaused);
  }
  let sessionLeft = SESSION_SECONDS; // secondes
  let lastTime = performance.now();
  let totalCaptures = 0;
  let score = 0;

  // Collection des captures par speciesId -> { id, name, count, type, imgSrc }
  const collection = new Map();

  // WebAudio simple
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Sprites pour pièges et médicaments
  let trapSprite = null, medSprite = null;
  (function initItemSprites(){
    // Utiliser directement des SVG inline pour éviter toute 404 réseau
    const bombSvg = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='28' cy='36' r='18' fill='#37474f'/><rect x='38' y='16' width='10' height='8' rx='2' fill='#546e7a'/><path d='M48 12 l6 -6' stroke='#fdd835' stroke-width='3' stroke-linecap='round'/><path d='M52 10 l6 -6' stroke='#ff7043' stroke-width='3' stroke-linecap='round'/></svg>")}`;
    const aidSvg = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='8' y='18' width='48' height='32' rx='6' fill='#e53935'/><rect x='28' y='22' width='8' height='24' fill='white'/><rect x='20' y='30' width='24' height='8' fill='white'/><rect x='20' y='12' width='24' height='8' rx='3' fill='#c62828'/></svg>")}`;
    const t = new Image(); t.src = bombSvg; trapSprite = t;
    const m = new Image(); m.src = aidSvg; medSprite = m;
  })();

  function drawTraps() {
    for (const t of traps) {
      ctx.save();
      if (trapSprite && trapSprite.width) {
        // Petite bombe (sprite)
        const s = t.r * 1.8; // légèrement plus petit
        ctx.drawImage(trapSprite, t.x - s/2, t.y - s/2, s, s);
      } else {
        // Fallback vectoriel: petite bombe simple
        // corps
        ctx.fillStyle = '#37474f';
        ctx.beginPath(); ctx.arc(t.x, t.y + 2, t.r * 0.9, 0, Math.PI*2); ctx.fill();
        // mèche
        ctx.strokeStyle = '#546e7a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(t.x + t.r*0.4, t.y - t.r*0.2); ctx.lineTo(t.x + t.r*0.8, t.y - t.r*0.5); ctx.stroke();
        // étincelles
        ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(t.x + t.r*0.9, t.y - t.r*0.6); ctx.lineTo(t.x + t.r*1.1, t.y - t.r*0.8); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawMeds() {
    for (const m of meds) {
      ctx.save();
      if (medSprite && medSprite.width) {
        const s = m.r * 2.6; // un peu plus grand
        ctx.drawImage(medSprite, m.x - s/2, m.y - s/2, s, s);
      } else {
        ctx.fillStyle = medColor;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(m.x - m.r*0.5, m.y); ctx.lineTo(m.x + m.r*0.5, m.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m.x, m.y - m.r*0.5); ctx.lineTo(m.x, m.y + m.r*0.5); ctx.stroke();
      }
      ctx.restore();
    }
  }
  function playCaptureSound() {
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      const now = audioCtx.currentTime;
      o.frequency.setValueAtTime(660, now);
      o.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o.connect(g).connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.26);
    } catch (e) {
      // silencieux si l'audio est bloqué
    }
  }
  function playRareCaptureSound() {
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      const now = audioCtx.currentTime;
      o.frequency.setValueAtTime(880, now);
      o.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.36);
    } catch {}
  }
  function playTrapSound() {
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      const now = audioCtx.currentTime;
      o.frequency.setValueAtTime(240, now);
      o.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      o.connect(g).connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.22);
    } catch {}
  }
  function playLevelSuccessSound() {
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      const now = audioCtx.currentTime;
      o.frequency.setValueAtTime(523.25, now); // C5
      o.frequency.setValueAtTime(659.25, now + 0.1); // E5
      o.frequency.setValueAtTime(783.99, now + 0.2); // G5
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      o.connect(g).connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.42);
    } catch {}
  }

  // (utilitaires déclarés plus haut)

  // Création d'un Pokémon
  let idCounter = 1;
  function createCreature() {
    const base = weightedRandomPokemon();
    const size = CREATURE_BASE_SIZE + Math.floor(rand(-2, 6));
    const x = rand(arenaBounds.x + 20, arenaBounds.x + arenaBounds.w - 20);
    const y = rand(arenaBounds.y + 20, arenaBounds.y + arenaBounds.h - 20);

    // éviter de spawn trop près du joueur
    if (dist2(x, y, player.x, player.y) < 120*120) return null;

    return {
      id: idCounter++,
      x, y,
      baseX: x, baseY: y, // pour oscillation légère
      t: 0,
      size,
      speciesId: base.id,
      name: base.name,
      typeKey: base.type,
      img: getPokemonImage(base.id),
      imgLoaded: false,
      vx: (Math.random()*2 - 1),
      vy: (Math.random()*2 - 1),
      born: performance.now(),
      life: getCreatureLifeMs(),
      stage: 1, // évolue visuellement plus tard
      hiddenBehind: null,
      hover: 0,
    };
  }

  // Dessin d'un Pokémon
  function drawCreature(cre) {
    const { x, y, size, stage, img, typeKey } = cre;
    ctx.save();
    ctx.translate(x, y - (stage-1) * 2); // léger flottement avec stage

    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, size*0.55, size*0.6, size*0.22, 0, 0, Math.PI*2);
    ctx.fill();

    // sprite
    const scale = 0.9 + (stage-1) * 0.2;
    const drawW = size * 1.8 * scale;
    const drawH = size * 1.8 * scale;
    // halo léger selon type
    const halo = TYPE_COLORS[typeKey] || '#ffffff';
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = halo + '99';
    if (img && img.complete) {
      const iw = img.naturalWidth || 128;
      const ih = img.naturalHeight || 128;
      const ratio = drawW / Math.max(iw, ih);
      const w = iw * ratio; const h = ih * ratio;
      ctx.drawImage(img, -w/2, -h*0.65, w, h);
    } else {
      // fallback simple disque coloré si l'image n'est pas prête
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, -size*0.2, size*0.7, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }

  // (formes utilitaires retirées: remplacées par sprites)

  // Dessin du joueur
  function drawPlayer() {
    const p = player;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Ombre
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, p.r*0.9, p.r*0.9, p.r*0.3, 0, 0, Math.PI*2);
    ctx.fill();

    if (playerSprite) {
      // Dessin via sprite image, orientable
      const w = p.r * 2.2;
      const h = p.r * 2.6;
      ctx.save();
      if (p.facing < 0) { ctx.scale(-1, 1); }
      ctx.drawImage(playerSprite, -w/2 * (p.facing < 0 ? -1 : 1), -h*0.9, w, h);
      ctx.restore();
    } else {
      // Fallback vectoriel (si image absente)
      // Torse (gilet bleu) plus étroit
      ctx.fillStyle = '#42a5f5';
      ctx.strokeStyle = '#0d47a1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-p.r*0.7, -p.r*0.6, p.r*1.4, p.r*1.6, 8);
      ctx.fill();
      ctx.stroke();
      // Tête simplifiée
      ctx.save();
      ctx.translate(0, -p.r*0.9);
      ctx.fillStyle = '#ffe0b2';
      ctx.beginPath(); ctx.arc(0, 0, p.r*0.55, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // Spawn et mise à jour
  function maybeSpawn(dt) {
    if (creatures.length >= MAX_CREATURES) return;
    const now = performance.now();
    // Courbe de spawn par niveau: niveau 1 très facile au début, plus raide ensuite
    const elapsedSec = Math.max(0, (now - levelStartTime) / 1000);
    const totalSec = levelDurationSec || (7 * 60);
    const progress = Math.max(0, Math.min(1, elapsedSec / totalSec));
    // Départ rapide et fin plus lente; plus le niveau est élevé, plus le départ est moins rapide et la fin plus lente
    const startFactor = Math.max(0.3, 0.4 + (currentLevel - 1) * 0.1); // L1≈0.4, L5≈0.8
    const endFactor = Math.min(2.4, 1.6 + (currentLevel - 1) * 0.15); // L1≈1.6, L5≈2.2+
    const factor = startFactor + (endFactor - startFactor) * progress;
    const dynInterval = spawnInterval * factor;
    if (now - lastSpawn > dynInterval) {
      const c = createCreature();
      lastSpawn = now;
      if (c) creatures.push(c);
    }
  }

  function updateCreatures(dt) {
    // Au début: très lent, puis accélère progressivement au fil du niveau
    const elapsedSecForSpeed = Math.max(0, (performance.now() - levelStartTime) / 1000);
    const totalSecForSpeed = levelDurationSec || (7 * 60);
    const progForSpeed = Math.max(0, Math.min(1, elapsedSecForSpeed / totalSecForSpeed));
    const startSpeedFactor = 0.3; // très lent au début
    const endSpeedFactor = 1.0;   // vitesse normale en fin de niveau
    const dynamicSpeedFactor = startSpeedFactor + (endSpeedFactor - startSpeedFactor) * progForSpeed;
    const speed = POKEMON_BASE_SPEED * creatureSpeedMul * dynamicSpeedFactor;
    const now = performance.now();
    for (const c of creatures) {
      c.t += dt * 0.002;
      // léger flottement + déplacement
      c.x += c.vx * speed;
      c.y += c.vy * speed;
      c.baseX = c.x; c.baseY = c.y;
      c.hover = Math.min(1, c.hover * 0.92 + 0.02);

      // gérer collisions bordures dans les limites de l'arène
      const m = c.size * 0.5;
      const minX = arenaBounds.x + m, maxX = arenaBounds.x + arenaBounds.w - m;
      const minY = arenaBounds.y + m, maxY = arenaBounds.y + arenaBounds.h - m;
      if (c.x < minX) { c.x = minX; c.vx *= -1; }
      if (c.x > maxX) { c.x = maxX; c.vx *= -1; }
      if (c.y < minY) { c.y = minY; c.vy *= -1; }
      if (c.y > maxY) { c.y = maxY; c.vy *= -1; }

      // petite variation de direction
      if (Math.random() < 0.01) {
        c.vx += (Math.random()*2 - 1) * 0.2;
        c.vy += (Math.random()*2 - 1) * 0.2;
        const len = Math.hypot(c.vx, c.vy) || 1;
        c.vx /= len; c.vy /= len;
      }
    }
    // disparition après 2 secondes
    creatures = creatures.filter(c => now - c.born <= c.life);
  }

  function updatePlayer(dt) {
    const p = player;
    const margin = 16;
    if (targetMouseX != null && targetMouseY != null) {
      // interpolation lissée vers la souris
      const dx = targetMouseX - p.x;
      const dy = targetMouseY - p.y;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        // facteur en fonction du dt pour une sensation fluide (0.12..0.25)
        const alpha = Math.max(0.12, Math.min(0.25, dt / 60 / 16));
        p.x += dx * alpha;
        p.y += dy * alpha;
        if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
      } else {
        p.x = targetMouseX; p.y = targetMouseY;
      }
    }
    p.x = clamp(p.x, arenaBounds.x + margin, arenaBounds.x + arenaBounds.w - margin);
    p.y = clamp(p.y, arenaBounds.y + margin, arenaBounds.y + arenaBounds.h - margin);

    // collision pièges (cooldown 800ms)
    const now = performance.now();
    const COOLDOWN = 800;
    if (now - p.lastTrapHitAt > COOLDOWN) {
      for (const t of traps) {
        if (dist2(p.x, p.y, t.x, t.y) <= (p.r + t.r) * (p.r + t.r)) {
          p.lastTrapHitAt = now;
          const loss = t.penalty;
          score = Math.max(0, score - loss);
          if (scoreEl) scoreEl.textContent = `Score: ${score}`;

          // particules rouges + son de piège
          spawnCaptureParticles(p.x, p.y, '#ff5252');
          playTrapSound();
          // vie -10%
          hp = Math.max(0, hp - 0.10);
          updateHealthHUD();
          if (hp <= 0) { endSession(); }
          break;
        }
      }
    }

    // collision médicaments
    for (let i = meds.length - 1; i >= 0; i--) {
      const m = meds[i];
      if (dist2(p.x, p.y, m.x, m.y) <= (p.r + m.r) * (p.r + m.r)) {
        meds.splice(i, 1);
        hp = Math.min(1, hp + 0.20);
        updateHealthHUD();
        spawnCaptureParticles(p.x, p.y, '#66bb6a');
        playCaptureSound();
      }
    }

    // Auto-capture en passant sur un Pokémon (overlap joueur / Pokémon)
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      const R = p.r + c.size * 0.45; // seuil d'overlap
      if (dist2(p.x, p.y, c.x, c.y) <= R * R) {
        captureCreature(i);
      }
    }
  }

  // Particules
  function spawnCaptureParticles(x, y, baseColor) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x, y,
        vx: Math.cos((i / PARTICLE_COUNT) * Math.PI * 2) * rand(0.8, 2.4),
        vy: Math.sin((i / PARTICLE_COUNT) * Math.PI * 2) * rand(0.8, 2.4) - rand(0.2, 1.0),
        life: rand(300, 700),
        born: performance.now(),
        color: baseColor,
        size: rand(2, 4)
      });
    }
  }
  function updateParticles(dt) {
    const now = performance.now();
    particles = particles.filter(p => now - p.born < p.life);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02; // gravité légère
    }
  }
  function drawParticles() {
    const now = performance.now();
    for (const p of particles) {
      const t = (now - p.born) / p.life;
      const a = Math.max(0, 1 - t);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Capture
  function hitTestCreature(x, y) {
    // itérer en ordre inverse pour capter celle au-dessus en cas de chevauchement
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      if (dist2(x, y, c.x, c.y) <= (c.size*0.7) * (c.size*0.7)) {
        return { c, index: i };
      }
    }
    return null;
  }
  function captureCreature(index) {
    const c = creatures[index];
    if (!c) return;
    creatures.splice(index, 1);
    totalCaptures += 1;
    // score
    const gained = pointsForType(c.typeKey);
    score += gained;
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;

    // Objectif unifié: rares comptent double
    capturedTotalWeighted += RARE_TYPES.has(c.typeKey) ? 2 : 1;
    updateObjectives();
    if (capturedTotalWeighted >= targetTotal) {
      onLevelSuccess();
    }

    // accélération après 5 captures
    if (!accelerated && totalCaptures >= 5) {
      accelerated = true;
      playerSpeed *= 1.3;
      creatureSpeedMul *= 1.4;
      spawnInterval = Math.max(600, Math.floor(spawnInterval * 0.7));
    }

    // inventaire
    const key = c.speciesId;
    const existing = collection.get(key) || {
      id: c.speciesId,
      name: c.name,
      count: 0,
      type: c.typeKey,
      imgSrc: spriteUrl(c.speciesId)
    };
    existing.count += 1;
    collection.set(key, existing);

    // mini-évolution: si on en a capturé assez, évoluer ce type dans le monde
    if (existing.count >= EVOLVE_THRESHOLD) {
      for (const other of creatures) {
        if (other.speciesId === c.speciesId && other.stage < 2) {
          other.stage = 2; // plus grand + halo accentué
          other.size += 6;
        }
      }
    }

    // effets
    spawnCaptureParticles(c.x, c.y, TYPE_COLORS[c.typeKey] || '#ffffff');
    if (RARE_TYPES.has(c.typeKey)) playRareCaptureSound(); else playCaptureSound();

    // maj UI
    renderCollection();
  }

  // UI Collection
  function renderCollection() {
    const items = Array.from(collection.values());
    const sortBy = sortSelect.value;
    items.sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'type') return a.type.localeCompare(b.type) || b.count - a.count;
      if (sortBy === 'name') return a.name.localeCompare(b.name) || b.count - a.count;
      return 0;
    });

    collectionList.innerHTML = '';
    for (const it of items) {
      const li = document.createElement('li');
      li.className = 'collection-item';

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.style.background = TYPE_COLORS[it.type] || '#dde7f0';

      const img = document.createElement('img');
      img.src = it.imgSrc; img.alt = it.name; img.width = 36; img.height = 36; img.style.objectFit = 'contain';
      badge.textContent = '';
      badge.appendChild(img);

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      const title = document.createElement('strong');
      title.textContent = `${it.name}`;
      const small = document.createElement('small');
      small.textContent = it.type;
      meta.appendChild(title);
      meta.appendChild(small);

      const count = document.createElement('div');
      count.className = 'count';
      count.textContent = `×${it.count}`;

      li.appendChild(badge);
      li.appendChild(meta);
      li.appendChild(count);
      collectionList.appendChild(li);
    }
  }

  // Minuteur
  function updateTimer(dt) {
    // dt en ms -> secondes
    sessionLeft = Math.max(0, sessionLeft - dt / 1000);
    const m = Math.floor(sessionLeft / 60);
    const s = Math.floor(sessionLeft % 60);
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (sessionLeft <= 0 && running) endSession();
  }
  function endSession() {
    running = false;
    statsText.textContent = `Tu as capturé ${totalCaptures} Pokémon !`;
    overlay.classList.remove('hidden');
    saveScore('session_end');
  }

  function restartGame() {
    creatures = [];
    particles = [];
    collection.clear();
    totalCaptures = 0;
    score = 0;
    if (scoreEl) scoreEl.textContent = `Score: 0`;
    player.x = WORLD.w * 0.5; player.y = WORLD.h * 0.5; player.vx = 0; player.vy = 0;
    // Durée de niveau dépendante
    sessionLeft = levelDurationSec;
    lastSpawn = 0;
    running = true;
    overlay.classList.add('hidden');
    renderCollection();
    // reset vitesse
    spawnInterval = BASE_SPAWN_INTERVAL;
    playerSpeed = PLAYER_SPEED;
    creatureSpeedMul = 1.0;
    accelerated = false;
    capturedTotalWeighted = 0;
    updateLevelPill();
    // appliquer nouveau niveau après reset
    applyLevel(currentLevel);
    updateObjectives();
    hp = 1.0; updateHealthHUD();
    setPaused(false);
  }

  // HUD objectifs (unifié)
  function updateObjectives() {
    const left = Math.max(0, targetTotal - capturedTotalWeighted);
    if (objectivesHUD) {
      objectivesHUD.textContent = `Captures restantes: ${left}`;
    }
  }

  // Entrées clavier
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    keys.add(e.key);
    if (e.key === 'r' || e.key === 'R') restartGame();
    if (e.key === 'p' || e.key === 'P') setPaused(!isPaused);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key));


  // Dessin décor: herbe, chemins, obstacles
  function drawBackground() {
    // herbe principale (déjà via CSS de canvas), ajouter chemins/patchs
    const conf = ARENA_CONFIGS[arena] || ARENA_CONFIGS.remoat;
    const bg = arenaBgCache.get(arena);
    if (bg && bg.width && bg.height) {
      // Dessiner l'image en "cover" sur les limites d'arène
      const bx = arenaBounds.x, by = arenaBounds.y, bw = arenaBounds.w, bh = arenaBounds.h;
      const scale = Math.max(bw / bg.width, bh / bg.height);
      const dw = bg.width * scale;
      const dh = bg.height * scale;
      const dx = bx + (bw - dw) / 2;
      const dy = by + (bh - dh) / 2;
      ctx.drawImage(bg, dx, dy, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      g.addColorStop(0, conf.bg[0]);
      g.addColorStop(1, conf.bg[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }

    // suppression des fleurs décoratives

    // assombrir hors limites et dessiner bordure
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    // haut
    ctx.fillRect(0, 0, WORLD.w, arenaBounds.y);
    // bas
    ctx.fillRect(0, arenaBounds.y + arenaBounds.h, WORLD.w, WORLD.h - (arenaBounds.y + arenaBounds.h));
    // gauche
    ctx.fillRect(0, arenaBounds.y, arenaBounds.x, arenaBounds.h);
    // droite
    ctx.fillRect(arenaBounds.x + arenaBounds.w, arenaBounds.y, WORLD.w - (arenaBounds.x + arenaBounds.w), arenaBounds.h);
    // bordure
    ctx.strokeStyle = 'rgba(31,45,61,0.6)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(arenaBounds.x, arenaBounds.y, arenaBounds.w, arenaBounds.h);
    ctx.setLineDash([]);
    ctx.restore();

    // bandeau nom d'arène
    if (arenaNameTimer > 0) {
      arenaNameTimer -= 16; // approx par frame
      const conf2 = ARENA_CONFIGS[arena] || ARENA_CONFIGS.remoat;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, arenaNameTimer / 600));
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      const text = conf2.name;
      ctx.font = 'bold 24px Fredoka, sans-serif';
      const tw = ctx.measureText(text).width + 24;
      ctx.fillRect(WORLD.w * 0.5 - tw*0.5, 8, tw, 36);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, WORLD.w * 0.5, 26);
      ctx.restore();
    }

    // obstacles supprimés
  }

  function drawObstacles(above=false) { /* plus d'obstacles */ }

  function shadeColor(hex, percent) {
    // percent: -100..100
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + Math.round(2.55 * percent);
    let g = (num >> 8 & 0x00FF) + Math.round(2.55 * percent);
    let b = (num & 0x0000FF) + Math.round(2.55 * percent);
    r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
    return '#' + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  // Boucle principale
  function frame(now) {
    const dt = now - lastTime; lastTime = now;
    // Arrêt immédiat si la vie est à 0
    if (hp <= 0 && running) {
      endSession();
    }
    if (running && !isPaused) {
      updateTimer(dt);
      maybeSpawn(dt);
      updateCreatures(dt);
      updatePlayer(dt);
      updateParticles(dt);
      maybeSpawnTraps();
      maybeSpawnMeds();
    }

    // DRAW
    ctx.clearRect(0, 0, WORLD.w, WORLD.h);
    drawBackground();

    // obstacles sous
    drawObstacles(false);

    // pièges (dessin unique, au-dessus du sol, sous les pokémon/joueur)
    drawTraps();
    drawMeds();

    // pokémon (qui ne sont pas cachés au-dessus)
    for (const c of creatures) {
      if (c.hiddenBehind) {
        // dessiner la créature si elle est devant le bord supérieur du buisson
        if (c.y + c.size*0.4 < c.hiddenBehind.y + c.hiddenBehind.r * 0.3) {
          drawCreature(c);
        }
      } else {
        drawCreature(c);
      }
    }

    // obstacles au-dessus (occlusion)
    drawObstacles(true);

    drawParticles();
    drawPlayer();

    requestAnimationFrame(frame);
  }

  // UI events
  sortSelect.addEventListener('change', renderCollection);
  if (arenaSelect) {
    arenaSelect.addEventListener('change', (e) => setArena(e.target.value));
  }
  btnPlayAgain.addEventListener('click', restartGame);
  btnRestart.addEventListener('click', () => {
    // si une session est en cours et qu'il y a eu des captures, enregistrer un score minimal
    try {
      if (running && totalCaptures > 0) {
        saveScore('manual_restart');
      }
    } catch {}
    restartGame();
  });
  if (btnContinue) btnContinue.addEventListener('click', () => startLevel(Math.min(highestLevel, 40)));
  // les listeners de niveaux sont ajoutés dans buildLevelButtons
  if (btnNextLevel) btnNextLevel.addEventListener('click', () => {
    const next = Math.min(currentLevel + 1, 40);
    if (levelOverlay) levelOverlay.classList.add('hidden');
    startLevel(next);
  });
  if (btnBackToMenu) btnBackToMenu.addEventListener('click', () => {
    if (levelOverlay) levelOverlay.classList.add('hidden');
    showMenu();
  });
  if (btnStartLevelNow) btnStartLevelNow.addEventListener('click', actuallyBeginLevel);
  if (btnBackToMenuFromIntro) btnBackToMenuFromIntro.addEventListener('click', () => { hideLevelIntro(); showMenu(); });

  // Init
  renderCollection();
  // Construire 40 niveaux dans le menu au chargement
  buildLevelButtons(40);
  lockLevelButtons();
  // Mettre à jour la ligne de tutoriel (objectifs dynamiques)
  try {
    const tuto = document.querySelector('#tutorialOverlay li:last-child');
    if (tuto) {
      const obj = getLevelObjectives(currentLevel);
      tuto.innerHTML = `Objectif d’un niveau: <strong>${obj.common} communs</strong> ou <strong>${obj.rare} rares</strong>.`;
    }
  } catch {}
  // démarrer la boucle mais afficher le menu et mettre running=false tant que le joueur n'a pas choisi
  showMenu();
  // Tutoriel: s'affiche automatiquement au premier lancement
  const seenTutorial = localStorage.getItem('seenTutorial') === '1';
  function showTutorial() {
    if (tutorialOverlay) tutorialOverlay.classList.remove('hidden');
  }
  function hideTutorial() {
    if (tutorialOverlay) tutorialOverlay.classList.add('hidden');
  }
  if (!seenTutorial) {
    showTutorial();
  }
  if (btnHelp) btnHelp.addEventListener('click', showTutorial);
  if (btnStartTutorial) btnStartTutorial.addEventListener('click', () => {
    localStorage.setItem('seenTutorial', '1');
    hideTutorial();
  });
  if (btnPause) btnPause.addEventListener('click', () => setPaused(!isPaused));
  if (btnFullscreen) btnFullscreen.addEventListener('click', async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      }
    } catch (e) { console.warn('Fullscreen error', e); }
  });
  // Suivre le statut plein écran pour appliquer une classe CSS
  function onFsChange(){
    const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('fullscreen', fs);
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // (Événements réglages supprimés)

  // Fermer les popups: bouton ✖ et clic fond overlay (après init des refs DOM)
  function closeOverlay(el) {
    if (!el) return;
    el.classList.add('hidden');
    // Déclencher l’action principale si pertinent
    if (el === menuOverlay) {
      // Équivaut à "Continuer" -> démarrer le niveau courant (affiche l'intro)
      startLevel(currentLevel || 1);
    } else if (el === levelIntroOverlay) {
      // Équivaut à "Démarrer !"
      actuallyBeginLevel();
    } else if (el === overlay) {
      // Fin de session: équivaut à "Rejouer"
      restartGame();
    } else if (el === scoresOverlay) {
      // rien de spécial
    } else if (el === tutorialOverlay) {
      // rien de spécial
    } else if (el === levelOverlay) {
      // Fermer l'écran de niveau réussi sans action
    }
  }
  function parentOverlayOf(node) {
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('overlay')) return node;
      node = node.parentNode;
    }
    return null;
  }
  document.addEventListener('click', (e) => {
    const t = e.target;
    // Bouton ✖ Fermer
    if (t && t.classList && t.classList.contains('btn-close-dialog')) {
      const ov = parentOverlayOf(t);
      if (ov) closeOverlay(ov);
    }
    // Clic fond overlay
    if (t && t.classList && t.classList.contains('overlay')) {
      closeOverlay(t);
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [tutorialOverlay, levelIntroOverlay, scoresOverlay].forEach(el => el && !el.classList.contains('hidden') && el.classList.add('hidden'));
    }
  });

  // Leaderboard: stockage et rendu (+ nom joueur et meilleur score persistant)
  function loadScores() {
    try {
      const raw = localStorage.getItem('pokedex_scores');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveScores(arr) {
    try { localStorage.setItem('pokedex_scores', JSON.stringify(arr)); } catch {}
  }
  function getPlayerName() {
    const stored = localStorage.getItem('player_name');
    if (stored && stored.trim()) return stored;
    const v = playerNameInput && playerNameInput.value ? playerNameInput.value.trim() : '';
    if (v) { try { localStorage.setItem('player_name', v); } catch {} return v; }
    return 'Anonyme';
  }
  function maybeAskNameOnce() {
    if (askedNameThisSession) return;
    const existing = localStorage.getItem('player_name') || '';
    if (playerNameInput) {
      playerNameInput.value = existing;
      if (!existing) {
        try { playerNameInput.focus(); } catch {}
      }
    }
    askedNameThisSession = true;
  }
  function saveBestScoreIfNeeded(newScore) {
    try {
      const best = parseInt(localStorage.getItem('best_score') || '0', 10);
      if (newScore > best) localStorage.setItem('best_score', String(newScore));
    } catch {}
    refreshBestScoreHUD();
  }
  function saveScore(reason) {
    try {
      const arr = loadScores();
      const entry = {
        name: getPlayerName(),
        ts: Date.now(),
        level: currentLevel,
        arena: currentArena,
        time: Math.max(0, Math.round((performance.now() - levelStartTime) / 1000)),
        score,
        commons: undefined,
        rares: undefined,
        total_weighted: capturedTotalWeighted,
        total_raw: totalCaptures,
        reason
      };
      arr.push(entry);
      saveScores(arr);
      saveBestScoreIfNeeded(score);
    } catch {}
  }
  function renderScores() {
    const arr = loadScores().slice().reverse();
    const rows = arr.map((e) => {
      const m = Math.floor(e.time/60); const s = e.time%60;
      const t = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      return `<div style="border:2px solid #eef3f9;border-radius:10px;padding:8px;margin:6px 0;background:#fbfdff">
        <strong>${new Date(e.ts).toLocaleString()}</strong> – <em>${e.name||'Anonyme'}</em><br>
        Niveau ${e.level} • Arène: ${e.arena} • Temps: ${t}<br>
        Score: <strong>${e.score}</strong> • Captures (pondéré): ${e.total_weighted ?? '?'} • Brutes: ${e.total_raw ?? '?'}
      </div>`;
    }).join('');
    if (scoresList) scoresList.innerHTML = rows || '<p>Aucun score encore.</p>';
    if (scoresPanel) scoresPanel.innerHTML = rows || '<p>Aucun score encore.</p>';
  }
  // Bouton changer de nom si présent dans le DOM
  const btnChangeName = document.getElementById('btnChangeName');
  if (btnChangeName) btnChangeName.addEventListener('click', () => {
    try { localStorage.removeItem('player_name'); } catch {}
    askedNameThisSession = false;
    maybeAskNameOnce();
    renderScores();
  });
  let wasInMenuWhenOpeningScores = false;
  function showScores() { renderScores(); /* panneau dans sidebar, pas d'overlay */ }
  function hideScores() { /* plus d'overlay bloquant */ }
  if (btnScores) btnScores.addEventListener('click', showScores);
  if (btnCloseScores) btnCloseScores.addEventListener('click', hideScores);
  if (scoresOverlay) scoresOverlay.addEventListener('click', (e) => { if (e.target === scoresOverlay) hideScores(); });
  if (btnClearScores) btnClearScores.addEventListener('click', () => { saveScores([]); renderScores(); });
  // Initialiser le HUD meilleur score et démarrer la boucle
  refreshBestScoreHUD();
  requestAnimationFrame((t) => { lastTime = t; requestAnimationFrame(frame); });

  // Spawns dynamiques de pièges et médicaments
  function maybeSpawnTraps() {
    const now = performance.now();
    // purge expirés
    traps = traps.filter(tr => now - tr.born <= tr.life);
    if (traps.length < MAX_TRAPS && now - lastTrapSpawn > TRAP_SPAWN_INTERVAL) {
      lastTrapSpawn = now;
      const r = rand(trapRadiusRange[0], trapRadiusRange[1]);
      traps.push({
        x: rand(arenaBounds.x + 20, arenaBounds.x + arenaBounds.w - 20),
        y: rand(arenaBounds.y + 20, arenaBounds.y + arenaBounds.h - 20),
        r,
        penalty: trapPenalty,
        color: trapColor,
        born: now,
        life: TRAP_LIFE_MS
      });
      totalTrapSpawns += 1;
      // 1 médicament après chaque 10 pièges apparus
      if (totalTrapSpawns % 10 === 0 && meds.length < MAX_MEDS) {
        meds.push({ x: rand(arenaBounds.x + 20, arenaBounds.x + arenaBounds.w - 20), y: rand(arenaBounds.y + 20, arenaBounds.y + arenaBounds.h - 20), r: 14, born: now, life: MED_LIFE_MS });
      }
    }
  }
  function maybeSpawnMeds() {
    const now = performance.now();
    meds = meds.filter(m => now - m.born <= m.life);
  }

  // HUD vie
  function updateHealthHUD() {
    const bar = document.getElementById('healthBar');
    const txt = document.getElementById('healthText');
    if (!bar || !txt) return;
    bar.style.width = `${Math.round(hp * 100)}%`;
    txt.textContent = `${Math.round(hp * 100)}%`;
  }
})();
