/* ICT بالعربي 7.0 — progressively refresh the free research monitor.
 * This is delayed GitHub Actions research, NOT executable or tick-by-tick signals. */
(function () {
  'use strict';
  const INTERVAL_MS = 5 * 60 * 1000;
  const MIN_GAP_MS = 2 * 60 * 1000;
  let lastRequestAt = 0;
  let timer;
  function refresh(force) {
    if (document.hidden) return false;
    const button = document.getElementById('dc-bg-free-check');
    if (!button || button.disabled) return false;
    const now = Date.now();
    if (!force && now - lastRequestAt < MIN_GAP_MS) return false;
    lastRequestAt = now;
    button.click();
    return true;
  }
  function begin() {
    if (!document.getElementById('dc-background-8c2')) return;
    refresh(false);
    timer = setInterval(function () { refresh(false); }, INTERVAL_MS);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refresh(false);
    });
    window.addEventListener('pagehide', function () { clearInterval(timer); }, {once:true});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin, {once:true});
  } else begin();
})();
