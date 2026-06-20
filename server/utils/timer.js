// server/utils/timer.js

/**
 * startTimer(seconds, callback)
 *  지정된 초(seconds) 후 callback을 호출하는 타이머를 시작합니다.
 *  반환된 핸들을 clearTimeout에 사용해 취소할 수 있습니다.
 */
exports.startTimer = function startTimer(seconds, callback) {
  return setTimeout(callback, seconds * 1000);
};

/**
 * cancelTimer(handle)
 *  startTimer로 반환된 핸들을 사용해 타이머를 취소합니다.
 */
exports.cancelTimer = function cancelTimer(handle) {
  clearTimeout(handle);
};
