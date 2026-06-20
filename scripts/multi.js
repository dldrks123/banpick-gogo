// scripts/multi.js — 멀티 모드 로직 모듈

import { fetchChampions, setupVolume, setupFilters } from './common.js';

// DOM 요소 참조
const GRID          = document.getElementById("champion-grid");
const CONFIRM       = document.getElementById("confirm-btn");
const CUR_SET       = document.getElementById("current-set");
const NEXT_SET      = document.getElementById("next-set-btn");
const STAGE         = document.getElementById("stage-indicator");
const TIME_LABEL    = document.querySelector(".timer .time");
const blueBanRow    = document.getElementById("blue-ban-row");
const redBanRow     = document.getElementById("red-ban-row");
const bluePickCol   = document.getElementById("blue-pick-col");
const redPickCol    = document.getElementById("red-pick-col");
const clickFx       = document.getElementById("click-sound");
const selectFx      = document.getElementById("select-sound");
const SEARCH_INPUT  = document.getElementById("search-input"); // 검색창

let champData    = [];
let roleFilter   = "";       // 포지션 필터 상태
let queryFilter  = "";       // 검색어 필터 상태
let curSet       = 1;
let stageIdx     = 0;
const MAX_SET    = 5;
const picksBySet = [], banned = [];
let previewSlot  = null, selected = null;

// 타이머
let timerMode    = 'unlimited'; // 'unlimited' | '60s'
let timerHandle  = null;
let remainingSec = 0;

// 밴/픽 단계 정의 (solo.js와 동일)
const stages = [
  "블루 1밴","레드 1밴","블루 2밴","레드 2밴",
  "블루 3밴","레드 3밴","블루 1픽","레드 1픽",
  "레드 2픽","블루 2픽","블루 3픽","레드 3픽",
  "레드 4밴","블루 4밴","레드 5밴","블루 5밴",
  "레드 4픽","블루 4픽","블루 5픽","레드 5픽"
];

// URL에서 타이머 모드 읽기
const params = new URLSearchParams(location.search);
if (params.get('timer') === '60s') timerMode = '60s';

function formatTime(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s<10?'0':''}${s}`;
}

// 자동 랜덤 밴/픽
function autoBanPick() {
  if (selected) {
    onConfirm(selected.querySelector('.champion-name').textContent);
    return;
  }
  const used = new Set(banned.concat(...picksBySet.slice(0, curSet)));
  const candidates = champData.map(c=>c.key_kr).filter(k=>!used.has(k));
  if (candidates.length) onConfirm(candidates[Math.floor(Math.random()*candidates.length)]);
}

// 단계 갱신 및 타이머 초기화
function updateStage() {
  STAGE.textContent = "단계: " + stages[stageIdx];
  if (timerHandle) clearInterval(timerHandle);
  if (timerMode==='60s') {
    remainingSec = 60;
    TIME_LABEL.textContent = formatTime(remainingSec);
    timerHandle = setInterval(()=>{
      remainingSec--;
      TIME_LABEL.textContent = formatTime(remainingSec);
      if (remainingSec <= 0) {
        clearInterval(timerHandle);
        timerHandle = null;
        autoBanPick();
      }
    },1000);
  } else {
    TIME_LABEL.textContent = '∞';
  }
}

// 멀티 모드 초기화
function initMultiMode(data) {
  champData = data.map(r=>({ ...r, pos: r.pos.toLowerCase() }))
                  .sort((a,b)=>a.key_kr.localeCompare(b.key_kr,'ko'));
  for (let i=0;i<MAX_SET;i++) picksBySet[i]=[];

  // 검색창 이벤트
  SEARCH_INPUT.addEventListener('input', e=>{
    queryFilter = e.target.value.trim().toLowerCase();
    renderGrid(queryFilter, roleFilter);
  });

  // 포지션 필터 이벤트
  setupFilters((query, role)=>{
    roleFilter = role;
    renderGrid(queryFilter, roleFilter);
  });

  setupVolume();
  renderGrid('','');
  updateStage();

  CONFIRM.addEventListener('click',()=>{
    const name = selected && selected.querySelector('.champion-name').textContent;
    if (name) onConfirm(name);
  });
  NEXT_SET.addEventListener('click', onNextSet);
}

// 역할 매칭
function matchRole(pos, role) {
  if (role==='top')     return pos.includes('top');
  if (role==='jungle')  return pos.includes('jungle');
  if (role==='mid')     return pos.includes('mid');
  if (role==='adc')     return pos.includes('bot')||pos.includes('adcarry');
  if (role==='support') return pos.includes('support')||pos.includes('suppot');
  return false;
}

// 그리드 렌더링
function renderGrid(query, role) {
  GRID.innerHTML = '';
  champData.forEach(c=>{
    const disabled = banned.includes(c.key_kr) ||
      picksBySet.slice(0,curSet).some(arr=>arr.includes(c.key_kr));
    // 검색어 필터
    if (query) {
      const ne = c.key_en.toLowerCase(), nk = c.key_kr.toLowerCase();
      if (!ne.includes(query) && !nk.includes(query)) return;
    }
    // 포지션 필터
    if (role && !matchRole(c.pos, role)) return;
    const item = document.createElement('div');
    item.className = 'champion-item' + (disabled?' disabled':'');
    if (disabled) {
      const ov=document.createElement('div'); ov.className='grid-ban-overlay'; item.append(ov);
    }
    const img=document.createElement('img'); img.src=`../icons/${c.icon}`; img.alt=c.key_kr;
    const lbl=document.createElement('div'); lbl.className='champion-name'; lbl.textContent=c.key_kr;
    item.append(img,lbl);
    item.addEventListener('click',()=>onCellClick(c,item));
    GRID.append(item);
  });
}

// 셀 클릭 핸들러
function onCellClick(c,item) {
  clickFx.currentTime=0; clickFx.play().catch(()=>{});
  if (item.classList.contains('disabled')) return;
  if (stages[stageIdx].includes('밴')) banPreview(c);
  else pickPreview(c);
  selected?.classList.remove('selected');
  selected=item; item.classList.add('selected');
}

// 밴 미리보기
function banPreview(c) {
  previewSlot?.querySelector('img.preview')?.remove();
  const row = stages[stageIdx].startsWith('블루')?blueBanRow:redBanRow;
  for (const b of row.children) {
    if (!b.querySelector('img')) {
      const pi=document.createElement('img'); pi.src=`../icons/${c.icon}`; pi.className='preview';
      b.append(pi); previewSlot=b; break;
    }
  }
}

// 픽 미리보기
function pickPreview(c) {
  previewSlot?.querySelector('img.preview')?.remove();
  previewSlot?.querySelector('.picked-label')?.remove();
  const col = stages[stageIdx].startsWith('블루')?bluePickCol:redPickCol;
  for (const b of col.children) {
    if (!b.querySelector('img')) {
      const pi=document.createElement('img'); pi.src=`../splash/${c.splash}`; pi.className='preview';
      b.append(pi);
      const pl=document.createElement('div'); pl.className='picked-label'; pl.textContent=c.key_kr;
      b.append(pl); previewSlot=b; break;
    }
  }
}

// 확정 로직
function onConfirm(key) {
  selectFx.currentTime=0; selectFx.play().catch(()=>{});
  if (!key||!previewSlot) return;
  const overlay=document.createElement('div'); overlay.className='ban-overlay';
  previewSlot.querySelector('img.preview').classList.replace('preview','confirmed');
  previewSlot.append(overlay);

  if (stages[stageIdx].includes('밴')) {
    banned.push(key);
  } else {
    picksBySet[curSet-1].push(key);
    if (curSet<5) {
      const fb=document.querySelectorAll('.fearless-zone')[curSet-1]
                    .querySelector('.fearless-ban-box:not(:has(img))');
      if (fb) {
        const mark=document.createElement('img');
        mark.src=`../icons/${champData.find(x=>x.key_kr===key).icon}`;
        fb.append(mark);
        const bo=document.createElement('div'); bo.className='ban-overlay'; fb.append(bo);
      }
    }
  }

  previewSlot=null;
  selected.classList.remove('selected');
  renderGrid(queryFilter, roleFilter);

  if (stageIdx>=stages.length-1) {
    alert('모든 밴픽 단계가 완료되었습니다!');
    return;
  }
  stageIdx++; updateStage();
}

// 다음 세트
function onNextSet() {
  if (curSet>=5) return;
  stageIdx=0;
  banned.length=0;
  picksBySet[curSet]=[];
  previewSlot=null; selected=null;
  [blueBanRow,redBanRow].forEach(r=>{
    r.innerHTML=''; for(let i=0;i<5;i++){ const b=document.createElement('div'); b.className='ban-box'; r.append(b); }
  });
  [bluePickCol,redPickCol].forEach((col,i)=>{
    col.innerHTML=''; const team=i===0?'블루':'레드';
    ["탑","정글","미드","봇","서폿"].forEach(l=>{
      const pb=document.createElement('div'); pb.className='pick-box';
      const lb=document.createElement('div'); lb.className='lane-label'; lb.textContent=`${team} ${l}`;
      pb.append(lb); col.append(pb);
    });
  });
  curSet++; CUR_SET.textContent=curSet;
  renderGrid(queryFilter, roleFilter);
  updateStage();
}

fetchChampions('../data/champion.json').then(initMultiMode).catch(console.error);

export { initMultiMode as initSoloMode, updateStage, onConfirm, onNextSet };
