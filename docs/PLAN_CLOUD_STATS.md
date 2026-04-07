# Plano: Cloud Stats via Supabase

Salvar estatísticas dos jogadores no Supabase (Postgres), acessado diretamente pelo client JS sem API intermediária.

---

## 1. Setup Supabase

- [ ] Criar projeto no [supabase.com](https://supabase.com)
- [ ] Anotar a **Project URL** e **anon key** (Settings > API)
- [ ] Criar a tabela `player_stats` com o SQL abaixo:

```sql
CREATE TABLE player_stats (
  player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  distribution JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- [ ] Habilitar RLS e criar policies:

```sql
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode criar seu próprio registro (INSERT)
CREATE POLICY "player_insert" ON player_stats
  FOR INSERT WITH CHECK (true);

-- SELECT apenas a própria row
CREATE POLICY "player_select" ON player_stats
  FOR SELECT USING (player_id::text = current_setting('request.headers', true)::json->>'x-player-id');

-- UPDATE apenas a própria row
CREATE POLICY "player_update" ON player_stats
  FOR UPDATE USING (player_id::text = current_setting('request.headers', true)::json->>'x-player-id');
```

---

## 2. Adicionar Supabase Client no index.html

- [ ] Adicionar o SDK via CDN no `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

- [ ] Inicializar o client:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## 3. Identificação do Jogador (player_id)

- [ ] Na primeira visita, gerar UUID e salvar no `localStorage`:

```js
function getPlayerId() {
  let id = localStorage.getItem('letrax-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('letrax-player-id', id);
  }
  return id;
}
```

- [ ] Exibir o player_id no modal de Stats (truncado, com botão de copiar)
- [ ] Adicionar campo "Restaurar ID" para o jogador colar um ID existente e puxar stats de outro device

---

## 4. Funções de Sync

- [ ] **Salvar stats no Supabase** (chamado após cada partida):

```js
async function syncStatsToCloud() {
  const playerId = getPlayerId();
  const { error } = await supabase
    .from('player_stats')
    .upsert({
      player_id: playerId,
      played: stats.played,
      won: stats.won,
      streak: stats.streak,
      max_streak: stats.maxStreak,
      distribution: stats.dist,
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_id' });

  if (error) console.warn('Sync failed:', error.message);
}
```

- [ ] **Carregar stats do Supabase** (chamado ao abrir o app):

```js
async function loadStatsFromCloud() {
  const playerId = getPlayerId();
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (data) {
    stats.played = data.played;
    stats.won = data.won;
    stats.streak = data.streak;
    stats.maxStreak = data.max_streak;
    stats.dist = data.distribution;
    saveStats(); // atualiza localStorage também
  }
}
```

- [ ] **Restaurar por ID** (jogador digita ID de outro device):

```js
async function restoreFromId(inputId) {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', inputId)
    .single();

  if (data) {
    localStorage.setItem('letrax-player-id', inputId);
    stats = { played: data.played, won: data.won, streak: data.streak, maxStreak: data.max_streak, dist: data.distribution };
    saveStats();
    showToast('Stats restored!');
  } else {
    showToast('ID not found');
  }
}
```

---

## 5. Atualizar Fluxo do Jogo

- [ ] No `initGame()`: chamar `loadStatsFromCloud()` apenas na primeira carga
- [ ] No `submitGuess()` (após win/lose): chamar `syncStatsToCloud()` depois de `saveStats()`
- [ ] Manter `localStorage` como cache local (app funciona offline, synca quando voltar)

---

## 6. UI — Modal de Stats

- [ ] Mostrar player ID truncado (ex: `LX-a3f8...k2d9`) com botão copiar
- [ ] Adicionar link/botão "Restaurar Stats" que abre input para colar um ID
- [ ] Indicador de sync (icone pequeno: cloud ok / offline)

---

## 7. Tratamento Offline

- [ ] Se o Supabase estiver inacessível, usar apenas localStorage (comportamento atual)
- [ ] Quando voltar online, sincronizar automaticamente
- [ ] Estratégia de merge: cloud `updated_at` vs local — o mais recente vence

---

## Ordem de Execução

| Etapa | Dependência | Estimativa |
|-------|-------------|------------|
| 1. Setup Supabase | Nenhuma | Config manual |
| 2. SDK no HTML | Etapa 1 | Rápido |
| 3. Player ID | Nenhuma | Rápido |
| 4. Funções de sync | Etapas 1, 2, 3 | Core do trabalho |
| 5. Fluxo do jogo | Etapa 4 | Rápido |
| 6. UI do modal | Etapas 3, 4 | Médio |
| 7. Offline handling | Etapa 4 | Médio |
