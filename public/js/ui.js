let toastTimeout;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 1800);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function shakeRow(row) {
  const r = document.getElementById(`row-${row}`);
  r.classList.add('shake');
  setTimeout(() => r.classList.remove('shake'), 400);
}

function bounceRow(row) {
  for (let c = 0; c < 5; c++) {
    const t = document.getElementById(`tile-${row}-${c}`);
    setTimeout(() => { t.style.animation = 'bounce 0.5s ease'; }, c * 80);
  }
}

function revealRow(row, result, guess, letterStates) {
  for (let c = 0; c < 5; c++) {
    const tile = document.getElementById(`tile-${row}-${c}`);
    const delay = c * 120;
    setTimeout(() => {
      tile.classList.add('reveal');
      setTimeout(() => {
        tile.classList.add(result[c]);
        tile.classList.remove('reveal');
      }, 250);
    }, delay);
    const letter = guess[c];
    const priority = { correct: 3, present: 2, absent: 1 };
    if (!letterStates[letter] || priority[result[c]] > priority[letterStates[letter]]) {
      letterStates[letter] = result[c];
    }
  }
  setTimeout(() => {
    Object.entries(letterStates).forEach(([l, s]) => {
      const k = document.getElementById(`key-${l}`);
      if (k) k.className = 'key ' + s;
    });
  }, 5 * 120 + 300);
}

// ====== SETTINGS PANEL ======
function toggleSettings() {
  document.getElementById('settings-panel').classList.toggle('open');
}

// ====== THEME ======
function toggleTheme(isDark) {
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('letrax-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('letrax-theme', 'light');
  }
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = isDark ? '#0a0a0f' : '#f4f4f8';
}

function loadTheme() {
  const saved = localStorage.getItem('letrax-theme') || 'dark';
  const toggle = document.getElementById('theme-toggle');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    toggle.checked = false;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#f4f4f8';
  } else {
    toggle.checked = true;
  }
}

// ====== DIFFICULTY MODE TOGGLE ======
let difficultyEnabled = localStorage.getItem('letrax-diff-enabled') === 'true';

function toggleDifficultyMode(enabled) {
  difficultyEnabled = enabled;
  localStorage.setItem('letrax-diff-enabled', enabled);
  document.getElementById('diff-row-container').style.display = enabled ? '' : 'none';
  if (!enabled) {
    setDifficulty('normal');
  }
}

function loadDifficultyMode() {
  const toggle = document.getElementById('diff-toggle');
  toggle.checked = difficultyEnabled;
  document.getElementById('diff-row-container').style.display = difficultyEnabled ? '' : 'none';
}
