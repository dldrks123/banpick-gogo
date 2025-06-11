// server/server.js

const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');
const { startTimer, cancelTimer } = require('./utils/timer');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;

// --- 정적 파일 제공 설정 ---
// 프로젝트 루트에서 필요한 폴더를 각각 정적 제공
app.use(express.static(path.join(__dirname, '..')));

// 루트 경로 요청 시 index.html 전송
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'room.html'));
});

// ─── 대기실 상태 저장 ────────────────────────────────────────────
const rooms = {};  // { [roomId]: { blue: [...], red: [...] } }

// ─── 밴픽 게임 전역 상태 ─────────────────────────────────────────
let state = {
  players: {},           // socket.id → { role, team, ready }
  phase: 'waiting',      // 'waiting' | 'playing' | 'set-wait'
  timerMode: 'unlimited',
  stageIdx: -1,
  curSet: 1,
  banned: [],
  picksBySet: [ [], [], [], [], [] ],
  timerHandle: null
};

const stages = [
  "blue-ban-1","red-ban-1","blue-ban-2","red-ban-2",
  "blue-ban-3","red-ban-3","blue-pick-1","red-pick-1",
  "red-pick-2","blue-pick-2","blue-pick-3","red-pick-3",
  "red-ban-4","blue-ban-4","red-ban-5","blue-ban-5",
  "red-pick-4","blue-pick-4","blue-pick-5","red-pick-5"
];

io.on('connection', socket => {
  // ── 대기실 입장 이벤트 ─────────────────────────────────────────
  socket.on('join-room', ({ room, nick, team }) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { blue: [], red: [] };
    const list = rooms[room][team];
    if (!list.find(p => p.nick === nick)) list.push({ nick, ready: false });
    io.to(room).emit('room-state', rooms[room]);
  });

  socket.on('toggle-ready', ({ room, nick, team }) => {
    const entry = rooms[room]?.[team].find(p => p.nick === nick);
    if (!entry) return;
    entry.ready = !entry.ready;
    io.to(room).emit('room-state', rooms[room]);
  });

  socket.on('dev-start', ({ room }) => {
    const r = rooms[room];
    if (!r) return;
    const roles = [
      ...r.blue.map(p => `blue-${p.nick}`),
      ...r.red .map(p => `red-${p.nick}`)
    ];
    io.to(room).emit('start-game', { roles, timer: state.timerMode });
  });

  // ── 밴픽 게임 이벤트 ───────────────────────────────────────────
  socket.on('join', role => {
    const team = role.split('-')[0];
    state.players[socket.id] = { role, team, ready: false };
    socket.join(team);
    socket.emit('phaseChange', state.phase);
    socket.emit('stageChange', state.stageIdx);
  });

  socket.on('setTimerMode', mode => {
    if (state.phase === 'waiting') state.timerMode = mode;
  });

  socket.on('toggleReady', () => {
    const p = state.players[socket.id];
    if (!p) return;
    p.ready = !p.ready;
    io.emit('stateUpdate', state);

    if (state.phase === 'waiting' && Object.values(state.players).some(x => x.ready)) {
      startGame();
    } else if (state.phase === 'set-wait' && Object.values(state.players).some(x => x.ready)) {
      advanceStage();
    }
  });

  socket.on('banPick', champ => {
    const p = state.players[socket.id];
    if (!p || state.phase !== 'playing') return;
    const [teamName, action] = stages[state.stageIdx].split('-', 2);
    if (p.team !== teamName) return;

    if (action === 'ban') {
      state.banned.push(champ);
    } else {
      state.picksBySet[state.curSet - 1].push(champ);
    }

    if (state.timerHandle) {
      cancelTimer(state.timerHandle);
      state.timerHandle = null;
    }

    io.emit('banPickConfirmed', {
      stageIdx: state.stageIdx,
      championKey: champ
    });
    advanceStage();
  });

  socket.on('nextSet', () => {
    if (state.phase !== 'playing') return;
    state.phase    = 'set-wait';
    state.stageIdx = -1;
    state.curSet++;
    state.banned = [];
    state.picksBySet = [ [], [], [], [], [] ];
    io.emit('phaseChange', state.phase);
  });

  socket.on('chatMessage', ({ role, text }) => {
    const team = role.split('-')[0];
    io.to(team).emit('chatMessage', { fromRole: role, text });
  });

  socket.on('disconnect', () => {
    delete state.players[socket.id];
    io.emit('stateUpdate', state);
  });
});

function startGame() {
  state.phase = 'playing';
  io.emit('phaseChange', state.phase);
  advanceStage();
}

function advanceStage() {
  state.stageIdx++;
  if (state.stageIdx >= stages.length) {
    io.emit('gameOver');
    return;
  }
  io.emit('stageChange', state.stageIdx);
  if (state.timerMode !== 'unlimited') {
    const sec = state.timerMode === '60s' ? 60 : 30;
    state.timerHandle = startTimer(sec, () => {
      const randomKey = '랜덤챔피언';
      if (stages[state.stageIdx].includes('ban')) {
        state.banned.push(randomKey);
      } else {
        state.picksBySet[state.curSet - 1].push(randomKey);
      }
      io.emit('timerExpired', {
        stageIdx: state.stageIdx,
        championKey: randomKey
      });
      advanceStage();
    });
  }
}

server.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});
