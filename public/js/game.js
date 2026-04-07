let answer = '';
let currentRow = 0;
let currentCol = 0;
let guesses = [];
let gameOver = false;
let letterStates = {};

// Difficulty
let difficulty = localStorage.getItem('letrax-difficulty') || 'normal';
let gameTimer = null;
let gameStartTime = 0;
let hintShown = false;

const HARD_TIME_LIMIT = 90; // seconds

function setDifficulty(diff) {
  difficulty = diff;
  localStorage.setItem('letrax-difficulty', diff);
  updateDifficultyUI();
  initGame();
}

function updateDifficultyUI() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.className = 'diff-btn';
  });
  const active = document.getElementById(`diff-${difficulty}`);
  if (active) active.classList.add(`active-${difficulty}`);
}

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
      stopTimer();
      const ds = getStats();
      const earned = difficultyEnabled ? calcScore(difficulty, guesses.length) : calcScore('normal', guesses.length);
      ds.played++; ds.won++; ds.streak++;
      if (ds.streak > ds.maxStreak) ds.maxStreak = ds.streak;
      ds.dist[thisRow + 1] = (ds.dist[thisRow + 1] || 0) + 1;
      ds.totalScore += earned;
      saveStats(); bounceRow(thisRow);
      setTimeout(() => showEndModal(true, guesses.length, answer, earned), 600);
    } else if (thisRow >= 5) {
      stopTimer();
      const ds = getStats();
      ds.played++; ds.streak = 0;
      saveStats();
      setTimeout(() => showEndModal(false, guesses.length, answer, 0), 400);
    }
  }, 5 * 120 + 400);
}

// ====== TIMER ======
function startTimer() {
  stopTimer();
  gameStartTime = Date.now();
  hintShown = false;

  const timerEl = document.getElementById('timer');
  const hintEl = document.getElementById('hint');
  const scoreEl = document.getElementById('score-display');
  timerEl.textContent = '';
  timerEl.className = 'timer-display';
  hintEl.textContent = '';
  hintEl.className = 'hint-display';
  scoreEl.textContent = '';

  // Only show timer/hint mechanics when difficulty mode is enabled and not normal
  if (!difficultyEnabled || difficulty === 'normal') {
    timerEl.style.display = 'none';
    hintEl.style.display = 'none';
    return;
  }

  timerEl.style.display = '';
  hintEl.style.display = '';

  gameTimer = setInterval(() => {
    if (gameOver) { stopTimer(); return; }
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);

    if (difficulty === 'easy') {
      timerEl.textContent = formatTime(elapsed);
      if (elapsed >= 30 && !hintShown) {
        showHint();
      }
    }

    if (difficulty === 'hard') {
      const remaining = Math.max(0, HARD_TIME_LIMIT - elapsed);
      timerEl.textContent = formatTime(remaining);
      if (remaining <= 15) {
        timerEl.className = 'timer-display warning';
      }
      if (remaining <= 0) {
        timeUp();
      }
    }
  }, 250);
}

function stopTimer() {
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showHint() {
  hintShown = true;
  const hintEl = document.getElementById('hint');
  const unrevealed = [];
  for (let i = 0; i < 5; i++) {
    let alreadyCorrect = false;
    for (const g of guesses) {
      if (g[i] === answer[i]) { alreadyCorrect = true; break; }
    }
    if (!alreadyCorrect) unrevealed.push(i);
  }
  if (unrevealed.length === 0) return;
  const pos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  const hint = answer.split('').map((ch, i) => i === pos ? ch : '_').join(' ');
  hintEl.textContent = hint;
  hintEl.classList.add('visible');
  showToast('Hint revealed!');
}

function timeUp() {
  stopTimer();
  gameOver = true;
  const ds = getStats();
  ds.played++; ds.streak = 0;
  saveStats();
  showEndModal(false, guesses.length, answer, 0);
}

// ====== NEW GAME / INIT ======
function confirmNewGame() {
  if (gameOver || currentRow === 0) {
    initGame();
    return;
  }
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <h2>NEW GAME?</h2>
    <p style="margin-top:8px">This will count as a loss. Continue?</p>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:20px">
      <button class="btn-play" style="background:var(--absent);color:var(--text)" onclick="closeModal();">Cancel</button>
      <button class="btn-play" onclick="closeModal();getStats().played++;getStats().streak=0;saveStats();initGame();">New Game</button>
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
  hintShown = false;
  updateDifficultyUI();
  buildBoard();
  buildKeyboard();
  startTimer();

  const scoreEl = document.getElementById('score-display');
  const ds = getStats();
  scoreEl.textContent = ds.totalScore > 0 ? ds.totalScore + ' pts' : '';
}
