// preload.js — Electron 프리로드 스크립트

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 필요시 Node 기능을 안전하게 노출
  // 예: 파일 읽기, 로그 등
});
