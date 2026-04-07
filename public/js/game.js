let answer = '';
let currentRow = 0;
let currentCol = 0;
let guesses = [];
let gameOver = false;
let letterStates = {};

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function buildBoard() {
  const b = document.getElementById('board');
  b.innerHTML = '';
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;
    for (let c = 0; c < 5; c++) {
      const t = document.createElement('div');
      t.className = 'tile';
      t.id = `tile-${r}-${c}`;
      row.appendChild(t);
    }
    b.appendChild(row);
  }
}

function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';
  const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['ENTER','z','x','c','v','b','n','m','⌫']
  ];
  rows.forEach(r => {
    const rd = document.createElement('div');
    rd.className = 'kb-row';
    r.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'key' + (k === 'ENTER' || k === '⌫' ? ' wide' : '');
      btn.textContent = k;
      btn.id = `key-${k}`;
      btn.addEventListener('click', () => handleKey(k));
      rd.appendChild(btn);
    });
    kb.appendChild(rd);
  });
}

function evaluate(guess, ans) {
  const result = Array(5).fill('absent');
  const a = ans.split(''), g = guess.split(''), used = Array(5).fill(false);
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) { result[i] = 'correct'; used[i] = true; g[i] = null; }
  }
  for (let i = 0; i < 5; i++) {
    if (g[i] === null) continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && g[i] === a[j]) { result[i] = 'present'; used[j] = true; break; }
    }
  }
  return result;
}

function handleKey(key) {
  if (gameOver) return;
  if (key === '⌫' || key === 'Backspace') return deleteLetter();
  if (key === 'ENTER' || key === 'Enter') return submitGuess();
  if (/^[a-zA-Z]$/.test(key)) return addLetter(key.toLowerCase());
}

function addLetter(l) {
  if (currentCol >= 5) return;
  const t = document.getElementById(`tile-${currentRow}-${currentCol}`);
  t.textContent = l;
  t.classList.add('filled');
  currentCol++;
}

function deleteLetter() {
  if (currentCol <= 0) return;
  currentCol--;
  const t = document.getElementById(`tile-${currentRow}-${currentCol}`);
  t.textContent = '';
  t.classList.remove('filled');
}

function submitGuess() {
  if (currentCol < 5) { shakeRow(currentRow); showToast('Not enough letters'); return; }
  let guess = '';
  for (let c = 0; c < 5; c++) guess += document.getElementById(`tile-${currentRow}-${c}`).textContent;
  if (!VALID.has(guess)) { shakeRow(currentRow); showToast('Not in word list'); return; }

  const result = evaluate(guess, answer);
  revealRow(currentRow, result, guess, letterStates);
  guesses.push(guess);
  const won = guess === answer;
  const thisRow = currentRow;

  if (!won && currentRow < 5) { currentRow++; currentCol = 0; }
  else { gameOver = true; }

  setTimeout(() => {
    if (won) {
      stats.played++; stats.won++; stats.streak++;
      if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
      stats.dist[thisRow + 1] = (stats.dist[thisRow + 1] || 0) + 1;
      saveStats(); bounceRow(thisRow);
      setTimeout(() => showEndModal(true, guesses.length, answer), 600);
    } else if (thisRow >= 5) {
      stats.played++; stats.streak = 0; saveStats();
      setTimeout(() => showEndModal(false, guesses.length, answer), 400);
    }
  }, 5 * 120 + 400);
}

function confirmNewGame() {
  if (gameOver || currentRow === 0) {
    initGame();
    return;
  }
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <h2>NEW GAME?</h2>
    <p>The word was <strong style="color:var(--correct);font-family:'Space Mono',monospace;letter-spacing:4px;text-transform:uppercase">${answer}</strong></p>
    <p style="margin-top:8px">This will count as a loss. Continue?</p>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:20px">
      <button class="btn-play" style="background:var(--absent);color:var(--text)" onclick="closeModal();">Cancel</button>
      <button class="btn-play" onclick="closeModal();stats.played++;stats.streak=0;saveStats();initGame();">New Game</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

function initGame() {
  answer = pickWord();
  currentRow = 0;
  currentCol = 0;
  guesses = [];
  gameOver = false;
  letterStates = {};
  buildBoard();
  buildKeyboard();
}
