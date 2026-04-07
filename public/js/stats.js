const DEFAULT_DIFF_STATS = { played: 0, won: 0, streak: 0, maxStreak: 0, dist: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }, totalScore: 0 };

let stats = JSON.parse(localStorage.getItem('letrax-stats-v2') || 'null') || {
  easy:   { ...DEFAULT_DIFF_STATS, dist: { ...DEFAULT_DIFF_STATS.dist } },
  normal: { ...DEFAULT_DIFF_STATS, dist: { ...DEFAULT_DIFF_STATS.dist } },
  hard:   { ...DEFAULT_DIFF_STATS, dist: { ...DEFAULT_DIFF_STATS.dist } }
};

// Migrate from old format
if (stats.played !== undefined) {
  const old = stats;
  stats = {
    easy:   { ...DEFAULT_DIFF_STATS, dist: { ...DEFAULT_DIFF_STATS.dist } },
    normal: { played: old.played, won: old.won, streak: old.streak, maxStreak: old.maxStreak, dist: { ...old.dist }, totalScore: 0 },
    hard:   { ...DEFAULT_DIFF_STATS, dist: { ...DEFAULT_DIFF_STATS.dist } }
  };
  saveStats();
}

function saveStats() {
  localStorage.setItem('letrax-stats-v2', JSON.stringify(stats));
}

function getStats() {
  return stats[difficulty];
}

// Points table: base points per guess count * difficulty multiplier
const SCORE_TABLE = {
  easy:   { 1: 50,  2: 40,  3: 30,  4: 20,  5: 15,  6: 10  },
  normal: { 1: 200, 2: 150, 3: 100, 4: 75,  5: 50,  6: 25  },
  hard:   { 1: 500, 2: 400, 3: 300, 4: 200, 5: 150, 6: 100 }
};

function calcScore(diff, guessCount) {
  return SCORE_TABLE[diff][guessCount] || 0;
}

function buildDistBars(diffStats, highlightRow) {
  const maxDist = Math.max(1, ...Object.values(diffStats.dist));
  let html = '';
  for (let i = 1; i <= 6; i++) {
    const cnt = diffStats.dist[i] || 0;
    const w = Math.max(8, (cnt / maxDist) * 100);
    const hl = i === highlightRow ? ' highlight' : '';
    html += `<div class="dist-bar-container">
      <span class="dist-label">${i}</span>
      <div class="dist-bar${hl}" style="width:${w}%">${cnt}</div>
    </div>`;
  }
  return html;
}

function buildStatGrid(diffStats) {
  const winRate = diffStats.played > 0 ? Math.round(diffStats.won / diffStats.played * 100) : 0;
  return `<div class="stat-grid">
    <div class="stat-item"><div class="num">${diffStats.played}</div><div class="label">Played</div></div>
    <div class="stat-item"><div class="num">${winRate}%</div><div class="label">Win %</div></div>
    <div class="stat-item"><div class="num">${diffStats.streak}</div><div class="label">Streak</div></div>
    <div class="stat-item"><div class="num">${diffStats.totalScore}</div><div class="label">Score</div></div>
  </div>`;
}

function showEndModal(won, guessCount, answer, earnedScore) {
  const mc = document.getElementById('modal-content');
  const ds = getStats();
  const highlightRow = won ? guessCount : -1;
  const scoreLabel = won ? `<p style="color:var(--accent);font-family:'Space Mono',monospace;font-size:1.1rem;margin-bottom:4px">+${earnedScore} pts</p>` : '';
  mc.innerHTML = `
    <h2>${won ? 'NICE!' : 'GAME OVER'}</h2>
    ${!won ? `<div class="answer-reveal">${answer}</div>` : `<p>You got it in ${guessCount} guess${guessCount > 1 ? 'es' : ''}!</p>`}
    ${scoreLabel}
    ${buildStatGrid(ds)}
    <div style="margin:16px 0 20px">${buildDistBars(ds, highlightRow)}</div>
    <button class="btn-play" onclick="closeModal();initGame();">PLAY AGAIN</button>`;
  document.getElementById('modal').classList.add('open');
}

function showStats() {
  const mc = document.getElementById('modal-content');
  const tabs = ['easy','normal','hard'];
  let tabsHtml = '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:16px">';
  tabs.forEach(t => {
    const active = t === difficulty ? `style="background:var(--accent);color:#0a0a0f"` : '';
    const label = t.charAt(0).toUpperCase() + t.slice(1);
    tabsHtml += `<button class="diff-btn" ${active} onclick="statsDiffView='${t}';showStats();">${label}</button>`;
  });
  tabsHtml += '</div>';

  const viewDiff = typeof statsDiffView !== 'undefined' ? statsDiffView : difficulty;
  const ds = stats[viewDiff];

  mc.innerHTML = `
    <h2>STATS</h2><p>Your LETRAX performance</p>
    ${tabsHtml}
    ${buildStatGrid(ds)}
    <div style="margin:16px 0 20px">${buildDistBars(ds, -1)}</div>
    <button class="btn-play" onclick="closeModal();">CLOSE</button>`;
  document.getElementById('modal').classList.add('open');
}

let statsDiffView;
