# LETRAX Multiplayer — Arquitetura e Plano de Implementação

---

## 1. Arquitetura Recomendada

### Diagrama Lógico

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL (Edge)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Static Files │  │ API Routes   │  │ Cron (cleanup) │  │
│  │ /public/*    │  │ /api/*       │  │ stale rooms    │  │
│  └─────────────┘  └──────┬───────┘  └───────────────┘  │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │ REST (create room, join)
                           │
┌──────────────────────────┼───────────────────────────────┐
│                    PARTYKIT SERVER                        │
│                          │                               │
│  ┌───────────────────────▼────────────────────────────┐  │
│  │              Room (Durable Object)                  │  │
│  │                                                     │  │
│  │  state: lobby | playing | round_result | finished   │  │
│  │  players: Map<id, Player>                           │  │
│  │  rounds: Round[]                                    │  │
│  │  config: { rounds, timePerRound, difficulty }       │  │
│  │                                                     │  │
│  │  ◄──── WebSocket ────► Client A                     │  │
│  │  ◄──── WebSocket ────► Client B                     │  │
│  │  ◄──── WebSocket ────► Client C                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Escolha de Tecnologias

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Realtime** | **PartyKit** | WebSocket serverless com Durable Objects. Cada room = 1 instância isolada com estado em memória. Zero config, free tier generoso (100 conexões simultâneas), deploy em 1 comando. Alternativa ao Socket.IO sem precisar gerenciar servidor. |
| **Frontend** | Vanilla JS (atual) | Sem mudança. Adiciona `js/multiplayer.js` como módulo separado. Reutiliza `evaluate()`, `buildBoard()`, `buildKeyboard()`, `revealRow()`. |
| **QR Code** | `qrcode-generator` (4KB, CDN) | Lib mínima, sem dependência, gera SVG inline. |
| **Persistência** | Nenhuma (MVP) | Estado vive na memória do Durable Object enquanto a room existe. Rooms morrem após inatividade. Não precisa de DB para MVP. |
| **Deploy** | PartyKit CLI (`partykit deploy`) | Separado do Vercel. Frontend continua no Vercel, realtime no PartyKit. Custo: $0 no free tier. |

### Por que NÃO outras opções

| Opção | Motivo da rejeição |
|-------|-------------------|
| Socket.IO + Node.js (Railway/Fly) | Precisa de servidor persistente, cold starts, custo mensal mesmo sem uso |
| Supabase Realtime | Broadcast é fire-and-forget, sem lógica server-side. Não tem como validar guesses ou controlar timer no servidor |
| Firebase RTDB | Vendor lock-in, regras de segurança complexas para lógica de jogo, custo imprevisível |
| WebRTC (peer-to-peer) | Sem autoridade central = impossível prevenir trapaça. NAT traversal adiciona complexidade |
| Liveblocks/Ably | Bom mas caro para o que precisa. PartyKit faz o mesmo grátis |

---

## 2. Modelo de Dados

### Room

```typescript
interface Room {
  id: string;              // nanoid(8), ex: "aB3x9kLm"
  hostId: string;          // player_id do criador
  state: 'lobby' | 'playing' | 'round_result' | 'finished';
  config: {
    totalRounds: number;   // 3 | 5 | 10
    timePerRound: number;  // 60 | 90 | 120 (seconds)
    difficulty: 'easy' | 'normal' | 'hard';
  };
  players: Map<string, Player>;
  rounds: Round[];
  currentRound: number;    // 0-indexed
  createdAt: number;       // timestamp
}
```

### Player

```typescript
interface Player {
  id: string;              // nanoid(6)
  name: string;            // max 12 chars
  avatar: string;          // "avatar_01" .. "avatar_12" (pré-definidos)
  connected: boolean;
  totalScore: number;      // acumulado na sessão
  // Estado da rodada atual (resetado a cada round)
  currentGuesses: string[];
  currentResult: ('correct' | 'present' | 'absent')[][];
  finished: boolean;       // acertou ou esgotou tentativas
  finishedAt: number | null; // timestamp de quando terminou
  roundScore: number;
}
```

### Round

```typescript
interface Round {
  number: number;          // 1-indexed
  word: string;            // a palavra da rodada
  startedAt: number;       // timestamp
  endedAt: number | null;
  rankings: {              // ordenado por score desc
    playerId: string;
    score: number;
    guesses: number;       // 0 = não acertou
    timeMs: number;        // tempo até acertar
  }[];
}
```

---

## 3. Fluxo Completo

### 3.1 Criar Sala

```
Host clica "Multiplayer" → "Create Room"
  → POST /api/rooms (Vercel API Route)
    → Gera room_id (nanoid)
    → Retorna { roomId, partyUrl }
  → Frontend conecta WebSocket ao PartyKit
  → Exibe:
    - Link: letrax.vercel.app/room/aB3x9kLm
    - QR Code (SVG)
    - Config panel (rounds, time, difficulty)
    - Player list (host aparece primeiro)
```

### 3.2 Entrar na Sala

```
Jogador acessa /room/{id}
  → Tela de entrada:
    - Input: nome (max 12 chars)
    - Grid de avatares (12 opções, click to select)
    - Botão "Join"
  → Conecta WebSocket com { name, avatar }
  → Server adiciona Player, broadcast "player_joined" para todos
  → Lobby atualiza lista em tempo real
```

### 3.3 Iniciar Partida

```
Host clica "Start Game"
  → Server valida: min 2 players
  → Server seleciona palavra para round 1 (server-side, do WORDS array)
  → Broadcast "game_started" com config
  → Broadcast "round_started" com { roundNumber, timeLimit }
  → NÃO envia a palavra (anti-cheat)
  → Cada client inicia o board + timer countdown
```

### 3.4 Gameplay de uma Rodada

```
Jogador digita e submete guess
  → Client envia "submit_guess" { guess }
  → Server valida:
    - guess está no VALID set?
    - jogador não terminou?
    - rodada ainda ativa?
  → Server executa evaluate(guess, word)
  → Responde ao jogador: { result: ['correct','absent',...] }
  → Broadcast para TODOS: "player_progress" { playerId, guessNumber }
    (não revela o guess nem o result — só que o jogador tentou)
  → Se acertou: marca finished, calcula score
  → Broadcast: "player_finished" { playerId, guesses, timeMs }
```

### 3.5 Fim da Rodada

```
Rodada termina quando:
  a) Todos terminaram (acertaram ou 6 tentativas)  OU
  b) Timer expirou

→ Server broadcast "round_ended" {
    word,
    rankings: [{ name, avatar, score, guesses, timeMs }],
    standings: [{ name, avatar, totalScore }]  // acumulado
  }
→ Client exibe tela de resultado da rodada (5s auto-advance ou click)
```

### 3.6 Próxima Rodada / Fim

```
Se currentRound < totalRounds:
  → Server seleciona nova palavra
  → Broadcast "round_started"
  → Repete 3.4

Se currentRound === totalRounds:
  → Broadcast "game_finished" {
      finalStandings: [{ name, avatar, totalScore, roundsWon }]
    }
  → Client exibe podium + opção "Play Again" (host) ou "Leave"
  → "Play Again" reseta scores, volta ao lobby
```

### Diagrama de Estados

```
  ┌───────┐   host: start   ┌─────────┐   all done / timeout   ┌──────────────┐
  │ LOBBY │ ───────────────► │ PLAYING │ ─────────────────────► │ ROUND_RESULT │
  └───────┘                  └─────────┘                        └──────┬───────┘
      ▲                                                                │
      │                          ┌─────────────────────────────────────┘
      │                          │ more rounds?
      │                     YES: │ "round_started" → PLAYING
      │                     NO:  ▼
      │                   ┌──────────┐
      └── play again ◄──  │ FINISHED │
                          └──────────┘
```

---

## 4. Algoritmo de Pontuação Multiplayer

### Fórmula

```
score = base_points + speed_bonus + streak_bonus - penalties

Onde:
  base_points  = (7 - guesses) * 100        → max 600 (1 guess), min 100 (6 guesses)
  speed_bonus  = floor(time_remaining / time_limit * 200)  → max 200, min 0
  streak_bonus = consecutive_correct_rounds * 50  → 0, 50, 100, 150...
  penalties    = invalid_guesses * 10        → words not in list (shakes)

  Se não acertou: score = 0
  Se tempo esgotou sem acertar: score = 0
```

### Difficulty Multiplier (aplica no final)

| Difficulty | Multiplier |
|-----------|-----------|
| Easy | x0.5 |
| Normal | x1.0 |
| Hard | x2.0 |

`final_score = floor(score * multiplier)`

### Exemplos

**Cenário 1: Acertou em 2 tentativas, 45s restando de 90s, Normal, 1st streak**

```
base    = (7 - 2) * 100 = 500
speed   = floor(45/90 * 200) = 100
streak  = 1 * 50 = 50
penalty = 0
total   = (500 + 100 + 50) * 1.0 = 650 pts
```

**Cenário 2: Acertou em 5 tentativas, 10s restando de 60s, Hard, no streak**

```
base    = (7 - 5) * 100 = 200
speed   = floor(10/60 * 200) = 33
streak  = 0
penalty = 0
total   = (200 + 33) * 2.0 = 466 pts
```

**Cenário 3: Acertou em 1 tentativa, 85s restando de 90s, Easy, 3rd streak**

```
base    = (7 - 1) * 100 = 600
speed   = floor(85/90 * 200) = 188
streak  = 3 * 50 = 150
penalty = 0
total   = (600 + 188 + 150) * 0.5 = 469 pts
```

**Cenário 4: Não acertou**

```
total = 0 pts (independente de tentativas)
```

---

## 5. Eventos em Tempo Real

### Client → Server

| Evento | Payload | Quando |
|--------|---------|--------|
| `join_room` | `{ name, avatar }` | Jogador entra na sala |
| `update_config` | `{ totalRounds?, timePerRound?, difficulty? }` | Host altera config no lobby |
| `start_game` | `{}` | Host inicia partida |
| `submit_guess` | `{ guess }` | Jogador submete tentativa |
| `leave_room` | `{}` | Jogador sai |
| `play_again` | `{}` | Host reinicia após game_finished |
| `kick_player` | `{ playerId }` | Host remove jogador do lobby |

### Server → Client(s)

| Evento | Payload | Destino |
|--------|---------|---------|
| `room_state` | `{ room completo }` | Quem acabou de entrar (sync) |
| `player_joined` | `{ player }` | Broadcast |
| `player_left` | `{ playerId }` | Broadcast |
| `config_updated` | `{ config }` | Broadcast |
| `game_started` | `{ config }` | Broadcast |
| `round_started` | `{ roundNumber, timeLimit }` | Broadcast |
| `guess_result` | `{ result[], guessNumber }` | Apenas quem submeteu |
| `player_progress` | `{ playerId, guessNumber }` | Broadcast (exceto quem submeteu) |
| `player_finished` | `{ playerId, guesses, timeMs }` | Broadcast |
| `round_ended` | `{ word, rankings[], standings[] }` | Broadcast |
| `game_finished` | `{ finalStandings[] }` | Broadcast |
| `player_kicked` | `{ playerId }` | Broadcast |
| `error` | `{ message }` | Apenas quem causou |
| `timer_sync` | `{ remaining }` | Broadcast (a cada 10s, anti-drift) |

### Anti-Cheat: Por que o server avalia

A palavra **nunca** é enviada ao client. O client envia `submit_guess`, o server roda `evaluate()` e retorna só o `result[]`. Isso impede:
- Inspecionar WebSocket messages para ver a resposta
- Manipular JS local para revelar a palavra
- Enviar guess falso já avaliado

---

## 6. Plano de Implementação

### MVP (Fase 1) — Multiplayer Funcional

**Estrutura de arquivos novos:**

```
party/
  room.ts              # PartyKit server (Durable Object)
  utils/
    words.ts           # WORDS array (cópia server-side)
    scoring.ts         # calcMultiplayerScore()
public/
  js/
    multiplayer.js     # Client multiplayer (WebSocket, lobby UI, room UI)
  room.html            # Página da sala (ou SPA route)
```

**Tarefas:**

| # | Tarefa | Detalhe |
|---|--------|---------|
| 1 | Setup PartyKit | `npx create-partykit@latest`, config `partykit.json` |
| 2 | Room server | `party/room.ts`: onConnect, onMessage, onClose. State machine (lobby→playing→result→finished). Timer server-side com `setInterval`. |
| 3 | Word list server-side | Copiar `WORDS` para `party/utils/words.ts`. Server seleciona palavra — client nunca vê até `round_ended`. |
| 4 | Scoring server-side | `party/utils/scoring.ts`: implementar fórmula. Calcular rankings ao fim de cada round. |
| 5 | Lobby UI | Nova tela em `multiplayer.js`: create room, join room, player list, config, QR code. Renderiza dentro de `#game-area` substituindo o board. |
| 6 | Room gameplay UI | Reutilizar `buildBoard()`, `buildKeyboard()`, `revealRow()`. Substituir `submitGuess()` por versão que envia via WebSocket e espera `guess_result`. Adicionar sidebar/bar com progresso dos outros jogadores. |
| 7 | Round result UI | Modal com ranking da rodada + standings acumulados. Auto-advance ou click. |
| 8 | Final result UI | Podium (1st/2nd/3rd) + tabela completa. Botão "Play Again" / "Leave". |
| 9 | Integração no header | Botão "Multi" no header, ao lado de "New" e "Stats". Abre modal com "Create Room" / "Join Room (code)". |
| 10 | Deploy | `partykit deploy` para o server. Vercel para o frontend. Configurar CORS. |

**O que NÃO entra no MVP:**
- Chat entre jogadores
- Spectator mode
- Reconnect automático
- Persistência de histórico de partidas
- Matchmaking público
- Ranking global

### Evolução (Fase 2+)

| Feature | Prioridade | Dependência |
|---------|-----------|-------------|
| Reconnect (player volta após disconnect) | Alta | PartyKit `onClose` + timeout de 30s antes de remover player |
| Spectator mode | Média | Novo role "spectator" que recebe broadcasts mas não joga |
| Chat no lobby | Baixa | Novo evento `chat_message`, renderiza na sidebar |
| Ranking global (Supabase) | Média | Depende do PLAN_CLOUD_STATS. Ao fim de `game_finished`, POST score para Supabase |
| Matchmaking público | Baixa | Fila de espera, auto-create room quando 2+ players |
| Emotes em jogo | Baixa | Reações rápidas tipo "wow", "gg" durante gameplay |
| Mobile share (Web Share API) | Alta | `navigator.share()` para compartilhar link da sala |
| Rematch com mesmos players | Média | `play_again` mantém players, reseta scores |
| Torneio (bracket) | Baixa | Complexo, requer múltiplas rooms coordenadas |

---

## 7. Impacto no Código Existente

### O que NÃO muda

- `words.js` — mantém para modo solo
- `stats.js` — mantém para stats do modo solo
- `ui.js` — `showToast()`, `bounceRow()`, `shakeRow()`, `revealRow()` são reutilizados
- `style.css` — base visual mantida, adiciona estilos multiplayer
- Modo solo continua funcionando 100% sem backend

### O que muda

| Arquivo | Mudança |
|---------|---------|
| `index.html` | Adiciona botão "Multi" no header. Adiciona `<script src="/js/multiplayer.js">` |
| `game.js` | Extrair `evaluate()`, `buildBoard()`, `buildKeyboard()` para funções reutilizáveis (já são globais, OK). `submitGuess()` precisa de um branch: se `isMultiplayer`, envia via WS ao invés de avaliar local. |
| `app.js` | Detectar `/room/{id}` na URL e inicializar modo multiplayer ao invés de solo |

### Estimativa de Código Novo

| Arquivo | ~LOC |
|---------|------|
| `party/room.ts` | ~300 |
| `party/utils/words.ts` | ~10 (import) |
| `party/utils/scoring.ts` | ~30 |
| `public/js/multiplayer.js` | ~400 |
| CSS adicional (lobby, ranking, podium) | ~150 |
| **Total** | **~890** |
