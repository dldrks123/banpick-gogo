// scripts/lobby.js

// 1) DOM 참조
const BLUE_INPUT  = document.getElementById('blue-link');
const RED_INPUT   = document.getElementById('red-link');
const COPY_BLUE   = document.getElementById('copy-blue');
const COPY_RED    = document.getElementById('copy-red');

// 2) 랜덤 방 ID 생성 함수
function genRoomId(len = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len })
    .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
    .join('');
}

// 3) 페이지 로드 시 링크 세팅
const roomId = genRoomId();
const origin = window.location.origin;
const base   = `${origin}/views/lobby2.html?room=${roomId}`;

BLUE_INPUT.value = `${base}&team=blue`;
RED_INPUT.value  = `${base}&team=red`;

// 복사 버튼 핸들러
COPY_BLUE.addEventListener('click', () => {
  BLUE_INPUT.select();
  document.execCommand('copy');
});
COPY_RED.addEventListener('click', () => {
  RED_INPUT.select();
  document.execCommand('copy');
});
