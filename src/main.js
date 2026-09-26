import { Chess } from 'chess.js';
import review from './review.json';
import './style.css';

const pieces = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};
const demo = review.pgn;
const state = { game: new Chess(), moves: [], headers: {}, comments: new Map(), notes: new Map(), step: 0, flipped: false, alternative: false };

document.querySelector('#app').innerHTML = `
  <header class="topbar"><div class="brand"><span class="brand-mark">♞</span><span>ATELIER <strong>D’ANALYSE</strong></span></div><span class="top-note">Échecs · revue de partie</span></header>
  <main class="workspace">
    <section class="board-column" aria-label="Échiquier">
      <div class="game-heading"><div><p class="eyebrow">POSITION ANALYSÉE</p><h1 id="game-title">Partie exemple</h1><p id="game-meta" class="muted"></p></div><button id="flip" class="icon-button" title="Retourner l’échiquier" aria-label="Retourner l’échiquier">⇅</button></div>
      <div class="board-wrap"><div id="board" class="board" role="img" aria-label="Position des pièces sur l’échiquier"></div><svg id="arrow-layer" class="arrow-layer" viewBox="0 0 800 800" aria-hidden="true"><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#e7aa50"/></marker></defs><line id="move-arrow" x1="0" y1="0" x2="0" y2="0" /></svg></div>
      <div class="transport"><button id="first" aria-label="Début de partie">⏮</button><button id="previous" aria-label="Coup précédent">←</button><span id="step-label" aria-live="polite">Position initiale</span><button id="next" aria-label="Coup suivant">→</button><button id="last" aria-label="Fin de partie">⏭</button></div>
      <div class="board-tools"><button id="prev-critical" class="text-button">← Erreur précédente</button><button id="next-critical" class="text-button">Erreur suivante →</button></div>
      <div class="fen-bar"><span>FEN</span><code id="fen"></code><button id="copy-fen">Copier</button></div>
      <p class="keyboard-hint">Touches ← et → pour parcourir les coups</p>
    </section>
    <aside class="side-panel">
      <section class="panel moments-panel"><div class="panel-head"><span class="section-number">01</span><h2>Moments clés</h2></div><p id="review-status"></p><div id="summary" class="summary"></div><div id="moments" class="moment-list"></div></section>
      <section class="panel moves-panel"><div class="panel-head"><span class="section-number">02</span><h2>Coups</h2></div><div id="moves" class="move-list" aria-label="Liste des coups"></div></section>
      <section class="panel insight-panel"><div class="panel-head"><span class="section-number">03</span><h2>Conseil</h2></div><div id="insight"></div></section>
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
  const note = state.notes.get(state.step);
  const alternative = state.alternative && note?.betterFen;
  const position = alternative ? new Chess(note.betterFen) : new Chess();
  if (!alternative) for (let i = 0; i < state.step; i++) position.move(state.moves[i].san);
  const last = state.moves[state.step - 1];
  const arrowMove = alternative ? note.betterArrow : last;
  const board = $('#board');
  board.replaceChildren();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const square = squareAt(row, col);
    const piece = position.get(square);
    const cell = document.createElement('div');
    cell.className = `square ${(row + col) % 2 ? 'dark' : 'light'}`;
    if (arrowMove?.from === square) cell.classList.add('from');
    if (arrowMove?.to === square) cell.classList.add('to');
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
  if (arrowMove) {
    const from = squareCenter(arrowMove.from), to = squareCenter(arrowMove.to);
    arrow.setAttribute('x1', from.x); arrow.setAttribute('y1', from.y);
    arrow.setAttribute('x2', to.x); arrow.setAttribute('y2', to.y);
    arrow.style.display = '';
  } else arrow.style.display = 'none';
  $('#fen').textContent = alternative ? position.fen() : (note?.fen || position.fen());
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
  body.textContent = note?.explanation || comment || (last ? `${last.from} → ${last.to}${last.captured ? ' · prise' : ''}${last.san.includes('+') ? ' · échec' : ''}${last.san.includes('#') ? ' · échec et mat' : ''}. La flèche montre le dernier coup. Les conseils détaillés seront ajoutés lors de l’analyse de votre partie.` : 'Importez votre PGN pour parcourir la partie coup par coup.');
  if (note?.category) title.textContent += ' · ' + note.category;
  insight.append(title, body);
  if (note?.advice) { const advice = document.createElement('p'); advice.className = 'advice'; advice.textContent = 'À retenir : ' + note.advice; insight.append(advice); }
  if (note?.betterMove && note?.betterFen) { const button = document.createElement('button'); button.className = 'primary'; button.textContent = alternative ? 'Revoir le coup joué' : 'Voir le meilleur coup : ' + note.betterMove; button.addEventListener('click', () => { state.alternative = !state.alternative; render(); }); insight.append(button); }
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

$('#flip').addEventListener('click', () => { state.flipped = !state.flipped; render(); });
$('#first').addEventListener('click', () => go(0));
$('#previous').addEventListener('click', () => go(state.step - 1));
$('#next').addEventListener('click', () => go(state.step + 1));
$('#last').addEventListener('click', () => go(state.moves.length));
document.addEventListener('keydown', (event) => {
  if (['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName)) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); go(state.step + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); go(state.step - 1); }
});
function go(step) { state.step = Math.max(0, Math.min(state.moves.length, step)); state.alternative = false; render(); }
function goCritical(direction) {
  const stops = [...state.notes.entries()].filter(([, note]) => ['Imprécision', 'Erreur', 'Gaffe', 'Manqué'].includes(note.category)).map(([step]) => step).sort((a, b) => a - b);
  const target = direction > 0 ? stops.find((step) => step > state.step) : stops.reverse().find((step) => step < state.step);
  if (target != null) go(target);
}
$('#prev-critical').addEventListener('click', () => goCritical(-1));
$('#next-critical').addEventListener('click', () => goCritical(1));
$('#copy-fen').addEventListener('click', async () => { await navigator.clipboard.writeText($('#fen').textContent); $('#copy-fen').textContent = 'Copié'; });
loadPgn(demo);
state.notes = new Map(review.notes.map((note) => [note.ply, note]));
document.querySelector('.board-tools').hidden = !review.notes.some((note) => ['Imprécision', 'Erreur', 'Gaffe', 'Manqué'].includes(note.category));
for (const button of document.querySelectorAll('.move')) if (['Imprécision', 'Erreur', 'Gaffe', 'Manqué'].includes(state.notes.get(Number(button.dataset.step))?.category)) button.classList.add('flagged');
$('#game-title').textContent = review.title;
$('#game-meta').textContent = review.subtitle;
$('#review-status').textContent = review.complete ? 'Revue de partie complète' : 'Position d’exemple. Envoie-moi ton PGN complet pour que je prépare la revue.';
if (review.complete) {
  const categories = ['Brillant', 'Excellent', 'Théorique', 'Meilleur', 'Très bien', 'Bon', 'Imprécision', 'Erreur', 'Manqué', 'Gaffe'];
  const table = document.createElement('div'); table.className = 'summary-grid';
  for (const label of ['Classement', 'Blancs', 'Noirs']) { const head = document.createElement('strong'); head.textContent = label; table.append(head); }
  for (const category of categories) {
    const counts = [0, 0];
    for (const note of review.notes) if (note.category === category) counts[note.ply % 2 ? 0 : 1]++;
    if (!counts.some(Boolean)) continue;
    for (const value of [category, ...counts]) { const cell = document.createElement('span'); cell.textContent = value; table.append(cell); }
  }
  $('#summary').append(table);
}
for (const note of review.notes) {
  const button = document.createElement('button');
  button.className = 'moment';
  button.textContent = (state.moves[note.ply - 1]?.san || 'Départ') + ' · ' + note.category;
  button.addEventListener('click', () => go(note.ply));
  $('#moments').append(button);
}
go(review.initialStep ?? 0);
