// scripts/chat.js
import io from '/socket.io/socket.io.js';

let socket, role, team;
let chatMsgsEl, chatInputEl, chatSendEl;

export function initChat() {
  // 1) DOM 참조
  chatMsgsEl  = document.getElementById('chat-messages');
  chatInputEl = document.getElementById('chat-input');
  chatSendEl  = document.getElementById('chat-send');

  // 2) role, team 파싱 (URL 검색자)
  role = new URLSearchParams(location.search).get('role') || '';
  team = role.split('-')[0]; // "blue" or "red"

  // 3) 소켓 연결
  socket = io();

  // 4) Enter 키 → 전송
  chatInputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      chatSendEl.click();
    }
  });

  // 5) 버튼 클릭 → emit
  chatSendEl.addEventListener('click', () => {
    const txt = chatInputEl.value.trim();
    if (!txt) return;
    socket.emit('chatMessage', { role, text: txt });
    appendChat(role, txt);
    chatInputEl.value = '';
  });

  // 6) 서버로부터 메시지 수신
  socket.on('chatMessage', ({ fromRole, text }) => {
    // 같은 팀끼리만
    if (!fromRole.startsWith(team + '-')) return;
    appendChat(fromRole, text);
  });
}

// 메시지 DOM 추가
function appendChat(fromRole, msg) {
  const [t, pos] = fromRole.split('-');
  const teamKr    = t === 'blue' ? '블루' : '레드';
  const posMap    = { top:'탑', jungle:'정글', mid:'미드', adc:'원딜', support:'서폿' };
  const labelText = `[${teamKr} ${posMap[pos]}] : `;

  const line = document.createElement('div');
  line.className = 'chat-line';

  const lbl = document.createElement('span');
  lbl.textContent = labelText;
  lbl.style.color = t === 'blue' ? '#4babff' : '#ff7070';
  lbl.style.fontWeight = 'bold';

  const txt = document.createElement('span');
  txt.textContent = msg;

  line.append(lbl, txt);
  chatMsgsEl.append(line);
  chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
}
