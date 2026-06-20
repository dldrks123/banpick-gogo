// scripts/common.js

/**
 * 챔피언 목록을 JSON으로부터 가져옵니다.
 * @param {string} path - JSON 파일 경로 (예: '/data/champion.json')
 * @returns {Promise<Array>} 챔피언 데이터 배열
 */
export function fetchChampions(path) {
  return fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load champions: ${res.status}`);
      return res.json();
    })
    .then(data => {
      // JSON 구조가 [{ id, key_en, key_kr, icon, splash, pos }, …] 이어야 합니다.
      return data.map(r => ({
        id:     r.id,
        key_en: r.key_en,
        key_kr: r.key_kr,
        icon:   r.icon,
        splash: r.splash,
        pos:    r.pos.toLowerCase()
      }));
    });
}

/**
 * 볼륨 컨트롤(버튼, 슬라이더)을 초기화합니다.
 * - BGM, 클릭 음, 선택 음을 제어
 */
export function setupVolume() {
  const bgm     = document.getElementById('bgm-player');
  const clickFx = document.getElementById('click-sound');
  const selectFx= document.getElementById('select-sound');
  const btnMute = document.getElementById('btn-mute');
  const slider  = document.getElementById('volume-slider');

  if (!bgm || !btnMute || !slider) return;

  bgm.volume = 0.5;
  btnMute.addEventListener('click', () => {
    bgm.muted = !bgm.muted;
    btnMute.textContent = bgm.muted ? '🔈' : '🔇';
  });
  slider.addEventListener('input', () => {
    bgm.volume = slider.value;
    if (bgm.muted && slider.value > 0) {
      bgm.muted = false;
      btnMute.textContent = '🔇';
    }
  });
}

/**
 * 역할 필터 버튼(탑/정글/미드/원딜/서폿) 초기화
 * @param {Function} renderCallback - 필터/검색 변경 시 그리드를 다시 그릴 함수
 */
export function setupFilters(renderCallback) {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  const roleBtns = filterBar.querySelectorAll('button[data-role]');
  let currentRole = '';

  roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      if (currentRole === role) {
        // 토글 오프
        currentRole = '';
        roleBtns.forEach(b => b.classList.remove('active', 'not-active'));
      } else {
        currentRole = role;
        roleBtns.forEach(b => {
          if (b === btn) {
            b.classList.add('active');
            b.classList.remove('not-active');
          } else {
            b.classList.remove('active');
            b.classList.add('not-active');
          }
        });
      }
      // 검색어는 그대로, 역할만 변경
      const searchInput = document.getElementById('search-input');
      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      renderCallback(query, currentRole);
    });
  });

  // 검색 입력에도 연동
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      renderCallback(query, currentRole);
    });
  }
}
