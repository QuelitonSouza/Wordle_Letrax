let stats = JSON.parse(localStorage.getItem('letrax-stats-en') || 'null') || {
  played: 0, won: 0, streak: 0, maxStreak: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
};

function saveStats() {
  localStorage.setItem('letrax-stats-en', JSON.stringify(stats));
}

function buildDistBars(highlightRow) {
  const maxDist = Math.max(1, ...Object.values(stats.dist));
  let html = '';
  for (let i = 1; i <= 6; i++) {
    const cnt = stats.dist[i] || 0;
    const w = Math.max(8, (cnt / maxDist) * 100);
    const hl = i === highlightRow ? ' highlight' : '';
    html += `<div class="dist-bar-container">
      <span class="dist-label">${i}</span>
      <div class="dist-bar${hl}" style="width:${w}%">${cnt}</div>
    </div>`;
  }
  return html;
}

function buildStatGrid() {
  const winRate = stats.played > 0 ? Math.round(stats.won / stats.played * 100) : 0;
  return `<div class="stat-grid">
    <div class="stat-item"><div class="num">${stats.played}</div><div class="label">Played</div></div>
    <div class="stat-item"><div class="num">${winRate}%</div><div class="label">Win %</div></div>
    <div class="stat-item"><div class="num">${stats.streak}</div><div class="label">Streak</div></div>
    <div class="stat-item"><div class="num">${stats.maxStreak}</div><div class="label">Best</div></div>
  </div>`;
}

function showEndModal(won, guessCount, answer) {
  const mc = document.getElementById('modal-content');
  const highlightRow = won ? guessCount : -1;
  mc.innerHTML = `
    <h2>${won ? 'NICE!' : 'GAME OVER'}</h2>
    ${!won ? `<div class="answer-reveal">${answer}</div>` : `<p>You got it in ${guessCount} guess${guessCount > 1 ? 'es' : ''}!</p>`}
    ${buildStatGrid()}
    <div style="margin:16px 0 20px">${buildDistBars(highlightRow)}</div>
    <button class="btn-play" onclick="closeModal();initGame();">PLAY AGAIN</button>`;
  document.getElementById('modal').classList.add('open');
}

function showStats() {
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <h2>STATS</h2><p>Your LETRAX performance</p>
    ${buildStatGrid()}
    <div style="margin:16px 0 20px">${buildDistBars(-1)}</div>
    <button class="btn-play" onclick="closeModal();">CLOSE</button>`;
  document.getElementById('modal').classList.add('open');
}
