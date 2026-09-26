import { Chess } from 'chess.js';
import './style.css';

const pieces = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};
const demo = `[Event "Exemple"]\n[White "Blancs"]\n[Black "Noirs"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *`;
const state = { game: new Chess(), moves: [], headers: {}, comments: new Map(), step: 0, flipped: false };

document.querySelector('#app').innerHTML = `
  <header class="topbar"><div class="brand"><span class="brand-mark">♞</span><span>ATELIER <strong>D’ANALYSE</strong></span></div><span class="top-note">Échecs · lecture de partie</span></header>
  <main class="workspace">
    <section class="board-column" aria-label="Échiquier">
      <div class="game-heading"><div><p class="eyebrow">PARTIE EN COURS</p><h1 id="game-title">Partie exemple</h1><p id="game-meta" class="muted"></p></div><button id="flip" class="icon-button" title="Retourner l’échiquier" aria-label="Retourner l’échiquier">⇅</button></div>
      <div class="board-wrap"><div id="board" class="board" role="img" aria-label="Position des pièces sur l’échiquier"></div><svg id="arrow-layer" class="arrow-layer" viewBox="0 0 800 800" aria-hidden="true"><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#e7aa50"/></marker></defs><line id="move-arrow" x1="0" y1="0" x2="0" y2="0" /></svg></div>
      <div class="transport"><button id="first" aria-label="Début de partie">⏮</button><button id="previous" aria-label="Coup précédent">←</button><span id="step-label" aria-live="polite">Position initiale</span><button id="next" aria-label="Coup suivant">→</button><button id="last" aria-label="Fin de partie">⏭</button></div>
      <p class="keyboard-hint">Touches ← et → pour parcourir les coups</p>
    </section>
    <aside class="side-panel">
      <section class="panel import-panel"><div class="panel-head"><span class="section-number">01</span><h2>Importer une partie</h2></div><p>Collez un PGN ou choisissez un fichier. La partie reste sur cet appareil.</p><textarea id="pgn" aria-label="Texte PGN" placeholder="[Event &quot;Ma partie&quot;]&#10;1. e4 e5 2. Nf3 ..."></textarea><div class="import-actions"><button id="load" class="primary">Afficher la partie <span>↗</span></button><label class="file-button">Choisir un .pgn<input id="file" type="file" accept=".pgn,text/plain" /></label></div><p id="error" class="error" role="alert"></p></section>
      <section class="panel moves-panel"><div class="panel-head"><span class="section-number">02</span><h2>Coups</h2></div><div id="moves" class="move-list" aria-label="Liste des coups"></div></section>
      <section class="panel insight-panel"><div class="panel-head"><span class="section-number">03</span><h2>Sur l’échiquier</h2></div><div id="insight"></div></section>
    </aside>
  </main>`;

const $ = (selector) => document.querySelector(selector);
const files = 'abcdefgh';
const squareAt = (row, col) => `${files[state.flipped ? 7 - col : col]}${state.flipped ? row + 1 : 8 - row}`;
const squareCenter = (square) => {
  const col = files.indexOf(square[0]);
  const row = 8 - Number(square[1]);
  return { x: (state.flipped ? 7 - col : col) * 100 + 50, y: (state.flipped ? 7 - row : row) * 100 + 50 };
};

function render() {
  const position = new Chess();
  for (let i = 0; i < state.step; i++) position.move(state.moves[i].san);
  const last = state.moves[state.step - 1];
  const board = $('#board');
  board.replaceChildren();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const square = squareAt(row, col);
    const piece = position.get(square);
    const cell = document.createElement('div');
    cell.className = `square ${(row + col) % 2 ? 'dark' : 'light'}`;
    if (last?.from === square) cell.classList.add('from');
    if (last?.to === square) cell.classList.add('to');
    if (position.isCheck() && piece?.type === 'k' && piece.color === position.turn()) cell.classList.add('check');
    cell.setAttribute('aria-label', `${square}${piece ? ` ${piece.color === 'w' ? 'blanc' : 'noir'} ${piece.type}` : ' vide'}`);
    if (col === 0) cell.innerHTML = `<span class="rank">${square[1]}</span>`;
    if (row === 7) cell.innerHTML += `<span class="file">${square[0]}</span>`;
    if (piece) {
      const span = document.createElement('span');
      span.className = `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`;
      span.textContent = pieces[piece.color + piece.type];
      cell.append(span);
    }
    board.append(cell);
  }
  const arrow = $('#move-arrow');
  if (last) {
    const from = squareCenter(last.from), to = squareCenter(last.to);
    arrow.setAttribute('x1', from.x); arrow.setAttribute('y1', from.y);
    arrow.setAttribute('x2', to.x); arrow.setAttribute('y2', to.y);
    arrow.style.display = '';
  } else arrow.style.display = 'none';
  $('#step-label').textContent = last ? `${Math.ceil(state.step / 2)}. ${state.step % 2 ? '' : '… '}${last.san}` : 'Position initiale';
  for (const button of document.querySelectorAll('.move')) button.classList.toggle('active', Number(button.dataset.step) === state.step);
  $('#first').disabled = $('#previous').disabled = state.step === 0;
  $('#next').disabled = $('#last').disabled = state.step === state.moves.length;
  const comment = state.comments.get(position.fen());
  const insight = $('#insight');
  insight.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = last ? `${last.color === 'w' ? 'Blancs' : 'Noirs'} : ${last.san}` : 'Position de départ';
  const body = document.createElement('p');
  body.textContent = comment || (last ? `${last.from} → ${last.to}${last.captured ? ' · prise' : ''}${last.san.includes('+') ? ' · échec' : ''}${last.san.includes('#') ? ' · échec et mat' : ''}. La flèche montre le dernier coup. Les conseils détaillés seront ajoutés lors de l’analyse de votre partie.` : 'Importez votre PGN pour parcourir la partie coup par coup.');
  insight.append(title, body);
}

function loadPgn(raw) {
  const text = raw.trim();
  if (!text) throw new Error('Collez un PGN ou choisissez un fichier.');
  const game = new Chess();
  try { game.loadPgn(text); } catch { throw new Error('PGN invalide : vérifiez les coups et les en-têtes.'); }
  const history = game.history({ verbose: true });
  if (!history.length) throw new Error('Aucun coup trouvé dans ce PGN.');
  state.game = game;
  state.moves = history;
  state.headers = game.header();
  state.comments = new Map(game.getComments().map(({ fen, comment }) => [fen, comment]));
  state.step = 0;
  $('#game-title').textContent = `${state.headers.White || 'Blancs'}  —  ${state.headers.Black || 'Noirs'}`;
  $('#game-meta').textContent = [state.headers.Date?.includes('?') ? '' : state.headers.Date?.replaceAll('.', '/'), state.headers.Result === '*' ? '' : state.headers.Result, `${history.length} demi-coups`].filter(Boolean).join('  ·  ');
  const list = $('#moves');
  list.replaceChildren();
  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';
    const num = document.createElement('span');
    num.className = 'move-number'; num.textContent = `${i / 2 + 1}.`;
    row.append(num);
    for (let j = i; j < Math.min(i + 2, history.length); j++) {
      const button = document.createElement('button');
      button.className = 'move'; button.dataset.step = j + 1; button.textContent = history[j].san;
      button.addEventListener('click', () => { state.step = j + 1; render(); });
      row.append(button);
    }
    list.append(row);
  }
  render();
}

$('#load').addEventListener('click', () => {
  try { loadPgn($('#pgn').value); $('#error').textContent = ''; }
  catch (error) { $('#error').textContent = error.message; }
});
$('#file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  $('#pgn').value = await file.text();
  $('#load').click();
});
$('#flip').addEventListener('click', () => { state.flipped = !state.flipped; render(); });
$('#first').addEventListener('click', () => { state.step = 0; render(); });
$('#previous').addEventListener('click', () => { state.step = Math.max(0, state.step - 1); render(); });
$('#next').addEventListener('click', () => { state.step = Math.min(state.moves.length, state.step + 1); render(); });
$('#last').addEventListener('click', () => { state.step = state.moves.length; render(); });
document.addEventListener('keydown', (event) => {
  if (['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); $('#next').click(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); $('#previous').click(); }
});
loadPgn(demo);
