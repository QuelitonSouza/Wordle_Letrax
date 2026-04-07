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
