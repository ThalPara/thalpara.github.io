const COLS = 10;
const ROWS = 20;

// Shapes definitions: each is a list of rotation matrices
const SHAPES = {
  I: [
    [ [0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0] ],
    [ [0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0] ],
  ],
  J: [
    [ [1,0,0], [1,1,1], [0,0,0] ],
    [ [0,1,1], [0,1,0], [0,1,0] ],
    [ [0,0,0], [1,1,1], [0,0,1] ],
    [ [0,1,0], [0,1,0], [1,1,0] ],
  ],
  L: [
    [ [0,0,1], [1,1,1], [0,0,0] ],
    [ [0,1,0], [0,1,0], [0,1,1] ],
    [ [0,0,0], [1,1,1], [1,0,0] ],
    [ [1,1,0], [0,1,0], [0,1,0] ],
  ],
  O: [
    [ [1,1], [1,1] ],
  ],
  S: [
    [ [0,1,1], [1,1,0], [0,0,0] ],
    [ [0,1,0], [0,1,1], [0,0,1] ],
  ],
  T: [
    [ [0,1,0], [1,1,1], [0,0,0] ],
    [ [0,1,0], [0,1,1], [0,1,0] ],
    [ [0,0,0], [1,1,1], [0,1,0] ],
    [ [0,1,0], [1,1,0], [0,1,0] ],
  ],
  Z: [
    [ [1,1,0], [0,1,1], [0,0,0] ],
    [ [0,0,1], [0,1,1], [0,1,0] ],
  ],
};
const TYPES = Object.keys(SHAPES);

const THEMES = [
  {
    name: "Aqua Glow",
    vars: {
      "--bg-from": "#0f2027",
      "--bg-to": "#203a43",
      "--accent": "#00e5ff",
      "--cell": "#22d3ee",
      "--text": "#e6f7ff",
    }
  },
  {
    name: "Sunset Pop",
    vars: {
      "--bg-from": "#f83600",
      "--bg-to": "#f9d423",
      "--accent": "#ff6b6b",
      "--cell": "#f59e0b",
      "--text": "#1a1a1a",
    }
  },
  {
    name: "Violet Dream",
    vars: {
      "--bg-from": "#2b1055",
      "--bg-to": "#7597de",
      "--accent": "#a78bfa",
      "--cell": "#7c3aed",
      "--text": "#edf2ff",
    }
  },
  {
    name: "Minty Fresh",
    vars: {
      "--bg-from": "#134e5e",
      "--bg-to": "#71b280",
      "--accent": "#34d399",
      "--cell": "#10b981",
      "--text": "#f0fff4",
    }
  },
];

const state = {
  grid: [],
  current: null,
  next: null,
  isPaused: false,
  isGameOver: false,
  score: 0,
  lines: 0,
  tickMs: 700,
  dropAccumulator: 0,
  themeIndex: 0,
  lastTime: 0,
  justLockedCells: [], // cells to bounce
};

// DOM
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const nextEl = document.getElementById('next');
const overlayEl = document.getElementById('overlay');
const messageEl = document.getElementById('message');
const themeNameEl = document.getElementById('themeName');

function init() {
  createBoardCells();
  state.grid = createEmptyGrid();
  state.next = randomPiece();
  spawnPiece();
  applyTheme(0);
  updateNextPreview();
  updateHUD();
  window.addEventListener('keydown', onKey);
  state.lastTime = performance.now();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);

function createBoardCells() {
  boardEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const d = document.createElement('div');
      d.className = 'cell';
      d.dataset.r = String(r);
      d.dataset.c = String(c);
      boardEl.appendChild(d);
    }
  }
}

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const rotations = SHAPES[type];
  return {
    type,
    rotations,
    rotationIndex: 0,
    matrix: rotations[0],
    row: 0,
    col: Math.floor((COLS - rotations[0][0].length) / 2)
  };
}

function spawnPiece() {
  state.current = state.next || randomPiece();
  state.current.row = 0;
  state.current.col = Math.floor((COLS - state.current.matrix[0].length) / 2);
  state.next = randomPiece();
  updateNextPreview();
  if (collides(state.current, state.grid, 0, 0)) {
    gameOver();
  }
}

function rotate(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      rotated[c][size - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
}

function tryRotate() {
  const { current, grid } = state;
  const rotations = current.rotations;
  const nextIdx = (current.rotationIndex + 1) % rotations.length;
  const nextMatrix = rotations[nextIdx].map(row => row.slice());

  // Wall kicks: simple left/right nudges
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides({ ...current, matrix: nextMatrix }, grid, 0, kick)) {
      current.matrix = nextMatrix;
      current.rotationIndex = nextIdx;
      current.col += kick;
      return;
    }
  }
}

function collides(piece, grid, dRow, dCol) {
  const { matrix, row, col } = piece;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = row + r + dRow;
      const nc = col + c + dCol;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return true;
      if (grid[nr][nc]) return true;
    }
  }
  return false;
}

function mergePiece() {
  const { matrix, row, col, type } = state.current;
  const landedCells = [];
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = row + r;
      const nc = col + c;
      state.grid[nr][nc] = type;
      landedCells.push([nr, nc]);
    }
  }
  state.justLockedCells = landedCells;
  playBounceAnimation(landedCells);
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.grid[r].every(Boolean)) {
      state.grid.splice(r, 1);
      state.grid.unshift(Array(COLS).fill(0));
      cleared++;
      r++; // re-check the same index since we unshifted
    }
  }
  if (cleared > 0) {
    state.lines += cleared;
    state.score += [0, 100, 300, 500, 800][cleared];
    cycleTheme();
  }
}

function hardDrop() {
  let distance = 0;
  while (!collides(state.current, state.grid, 1, 0)) {
    state.current.row++;
    distance++;
  }
  state.score += distance * 2;
  lockPiece();
}

function softDrop() {
  if (!collides(state.current, state.grid, 1, 0)) {
    state.current.row++;
    state.score += 1;
  } else {
    lockPiece();
  }
}

function move(dx) {
  if (!collides(state.current, state.grid, 0, dx)) {
    state.current.col += dx;
  }
}

function lockPiece() {
  mergePiece();
  clearLines();
  updateHUD();
  spawnPiece();
}

function updateNextPreview() {
  nextEl.innerHTML = '';
  const preview = document.createDocumentFragment();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const d = document.createElement('div');
      d.className = 'p';
      preview.appendChild(d);
    }
  }
  nextEl.appendChild(preview);
  const matrix = padMatrix(state.next.matrix, 4);
  const children = Array.from(nextEl.children);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const idx = r * 4 + c;
      const el = children[idx];
      el.style.visibility = matrix[r][c] ? 'visible' : 'hidden';
      el.style.background = getPieceGradient(state.next.type);
    }
  }
}

function padMatrix(matrix, size) {
  const m = Array.from({ length: size }, () => Array(size).fill(0));
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[0].length; c++) {
      m[r][c] = matrix[r][c] ? 1 : 0;
    }
  }
  return m;
}

function onKey(e) {
  if (state.isGameOver) {
    if (e.key.toLowerCase() === 'r') restart();
    return;
  }
  if (e.key === 'p' || e.key === 'P') { state.isPaused = !state.isPaused; togglePauseOverlay(); return; }
  if (state.isPaused) return;

  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); move(-1); break;
    case 'ArrowRight': e.preventDefault(); move(1); break;
    case 'ArrowDown': e.preventDefault(); softDrop(); break;
    case 'ArrowUp': e.preventDefault(); tryRotate(); break;
    case ' ': e.preventDefault(); hardDrop(); break;
    case 'r': case 'R': restart(); break;
  }
}

function togglePauseOverlay() {
  overlayEl.classList.toggle('show', state.isPaused);
  messageEl.textContent = state.isPaused ? 'Paused' : '';
}

function gameOver() {
  state.isGameOver = true;
  overlayEl.classList.add('show');
  messageEl.textContent = 'Game Over — Press R to restart';
}

function restart() {
  state.grid = createEmptyGrid();
  state.score = 0;
  state.lines = 0;
  state.isGameOver = false;
  state.isPaused = false;
  state.justLockedCells = [];
  overlayEl.classList.remove('show');
  messageEl.textContent = '';
  state.next = randomPiece();
  spawnPiece();
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = String(state.score);
  linesEl.textContent = String(state.lines);
}

function applyTheme(index) {
  state.themeIndex = index % THEMES.length;
  const theme = THEMES[state.themeIndex];
  Object.entries(theme.vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  themeNameEl.textContent = theme.name;
}

function cycleTheme() {
  applyTheme(state.themeIndex + 1);
}

function getPieceGradient(type) {
  const mapping = {
    I: 'linear-gradient(180deg, #a5f3fc, #06b6d4)',
    J: 'linear-gradient(180deg, #93c5fd, #2563eb)',
    L: 'linear-gradient(180deg, #fcd34d, #f59e0b)',
    O: 'linear-gradient(180deg, #fde68a, #f59e0b)',
    S: 'linear-gradient(180deg, #86efac, #16a34a)',
    T: 'linear-gradient(180deg, #d8b4fe, #7c3aed)',
    Z: 'linear-gradient(180deg, #fca5a5, #ef4444)'
  };
  return mapping[type] || 'var(--cell)';
}

function loop(time) {
  const delta = time - state.lastTime;
  state.lastTime = time;
  if (!state.isPaused && !state.isGameOver) {
    state.dropAccumulator += delta;
    const speed = Math.max(100, state.tickMs - Math.floor(state.lines / 10) * 60);
    while (state.dropAccumulator >= speed) {
      step();
      state.dropAccumulator -= speed;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

function step() {
  if (!collides(state.current, state.grid, 1, 0)) {
    state.current.row++;
  } else {
    lockPiece();
  }
}

function draw() {
  drawBoard();
  drawCurrent();
  drawGhost();
}

function drawBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const el = boardEl.children[idx];
      const val = state.grid[r][c];
      el.className = 'cell';
      if (val) {
        el.classList.add('filled', `t-${val}`);
      }
    }
  }
}

function drawCurrent() {
  const { matrix, row, col, type } = state.current;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = row + r; const nc = col + c;
      if (nr < 0) continue;
      const idx = nr * COLS + nc;
      const el = boardEl.children[idx];
      el.classList.add('active', `t-${type}`);
    }
  }
}

function drawGhost() {
  // compute ghost position
  const ghost = { ...state.current, row: state.current.row, col: state.current.col };
  while (!collides(ghost, state.grid, 1, 0)) {
    ghost.row++;
  }
  const { matrix, row, col, type } = ghost;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = row + r; const nc = col + c;
      if (nr < 0) continue;
      const idx = nr * COLS + nc;
      const el = boardEl.children[idx];
      if (!el.classList.contains('filled')) {
        el.classList.add('ghost', `t-${type}`);
      }
    }
  }
}

function playBounceAnimation(cells) {
  // Apply transient bounce class to newly locked cells
  const durationMs = 420;
  for (const [r, c] of cells) {
    const idx = r * COLS + c;
    const el = boardEl.children[idx];
    if (!el) continue;
    // ensure it has filled class first
    el.classList.add('filled');
    requestAnimationFrame(() => {
      el.classList.add('bounce');
      setTimeout(() => el.classList.remove('bounce'), durationMs + 30);
    });
  }
}