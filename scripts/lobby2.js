// scripts/lobby2.js

import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

const params     = new URLSearchParams(window.location.search);
const room       = params.get('room');
const team       = params.get('team');   // "blue" or "red"

const nickInput  = document.getElementById('nick-input');
const nickOk     = document.getElementById('nick-ok');
const readyBtn   = document.getElementById('btn-ready');
const devStart   = document.getElementById('btn-dev-start');
const readyCount = document.getElementById('ready-count');
const blueSlots  = Array.from(document.getElementById('blue-slots').children);
const redSlots   = Array.from(document.getElementById('red-slots').children);

const socket     = io();

// 로컬 상태
let nick = null;

// 1) 닉네임 확인
nickOk.addEventListener('click', () => {
  const v = nickInput.value.trim();
  if (!v) {
    alert('닉네임을 입력해주세요.');
    return;
  }
  nick = v;
  socket.emit('join-room', { room, nick, team });
  nickInput.disabled = true;
  nickOk.disabled    = true;
});

// 2) 준비 토글
readyBtn.addEventListener('click', () => {
  if (!nick) {
    alert('먼저 닉네임을 확인해주세요.');
    return;
  }
  socket.emit('toggle-ready', { room, nick, team });
});

// 3) 개발자용 시작
devStart.addEventListener('click', () => {
  if (!nick) {
    alert('먼저 닉네임을 확인해주세요.');
    return;
  }
  socket.emit('dev-start', { room });
});

// 4) 서버로부터 방 상태 업데이트
socket.on('room-state', state => {
  // 슬롯 갱신
  state.blue.forEach((p, i) => {
    const slot = blueSlots[i];
    slot.textContent = p.nick;
    slot.classList.toggle('ready', p.ready);
  });
  state.red.forEach((p, i) => {
    const slot = redSlots[i];
    slot.textContent = p.nick;
    slot.classList.toggle('ready', p.ready);
  });
  // 빈 슬롯 초기화
  blueSlots.slice(state.blue.length).forEach(s => {
    s.textContent = '';
    s.classList.remove('ready');
  });
  redSlots.slice(state.red.length).forEach(s => {
    s.textContent = '';
    s.classList.remove('ready');
  });

  // 준비된 인원 수 표시
  const totalReady = state.blue.filter(p => p.ready).length
                   + state.red.filter(p => p.ready).length;
  readyCount.textContent = `${totalReady}/10`;

  // 내가 준비된 상태면 버튼 회색 처리
  const myList = team === 'blue' ? state.blue : state.red;
  const me     = myList.find(p => p.nick === nick);
  if (me && me.ready) {
    readyBtn.textContent = '준비완료!';
    readyBtn.disabled    = true;
  }

  // — 자동 시작 로직 (1번 방식) —
  if (totalReady === 10) {
    // 10명이 모두 준비되면 자동으로 dev-start 이벤트 emit
    socket.emit('dev-start', { room });
  }
});

// 5) 게임 시작 이벤트 수신
socket.on('start-game', ({ roles, timer }) => {
  // roles: ["blue-닉네임", "red-닉네임", ...]
  // timer: 기존에 설정된 모드
  const qs = new URLSearchParams({
    roles: roles.join(','),
    timer
  }).toString();
  window.location.href = `/views/multi.html?${qs}`;
});
