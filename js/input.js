/* v1.2.1 PC support: keyboard shortcuts and mouse-wheel scrolling.
   Buttons opt in with data-kb="keys" (see KB() in ui.js); the hint (data-kh) is drawn by CSS on
   mouse + keyboard computers only. Touch play is untouched: nothing here listens to touch events. */
'use strict';
const Input = (() => {
  const TYPING = 'input, textarea, select, [contenteditable="true"]';
  const visible = el => !!(el && el.getClientRects().length) && !el.disabled && !el.closest('[disabled]');
  // the top-most layer that should receive keys: an open modal, then a race pit menu, then the screen
  function layer() {
    const mods = document.querySelectorAll('.modal-wrap'); if (mods.length) return mods[mods.length - 1];
    const pc = document.querySelector('#pitcard .pitcard'); if (pc) return pc;
    return document.getElementById('app');
  }
  function keyName(e) {
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') return 'space';
    if (k === 'Esc') return 'escape';
    return String(k || '').toLowerCase();
  }
  function findKey(root, key) {
    const all = [...root.querySelectorAll('[data-kb]')].filter(el => el.dataset.kb.split(' ').includes(key) && visible(el));
    return all.length ? all[all.length - 1] : null; // last match wins (e.g. a form's BACK over the header's < HUB)
  }
  function press(el) { el.click(); return true; }
  // race day: arrow keys step the pace for the selected car
  function racePace(dir) {
    const btns = [...document.querySelectorAll('#side [data-act="raceMode"]')]; if (btns.length !== 3) return false;
    const order = ['push', 'normal', 'save']; let cur = btns.findIndex(b => b.classList.contains('sel')); if (cur < 0) cur = 1;
    const nx = Math.max(0, Math.min(2, cur + dir)); if (nx === cur) return true;
    return press(btns.find(b => b.dataset.arg === order[nx]));
  }
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const t = e.target; if (t && t.closest && t.closest(TYPING)) { if (keyName(e) === 'escape') t.blur(); return; }
    let key = keyName(e);
    const ae = document.activeElement;
    // a keyboard user tabbing through buttons keeps the browser's own Enter/Space on the focused one
    if ((key === 'enter' || key === 'space') && ae && ae !== document.body && ae.matches && ae.matches('button:focus-visible')) return;
    // a button that kept focus from a mouse click must not also get a native Space/Enter press
    if (ae && ae !== document.body && ae.tagName === 'BUTTON' && (key === 'enter' || key === 'space')) ae.blur();
    const root = layer(); if (!root) return;
    let el = findKey(root, key);
    if (!el && key === 'space') el = findKey(root, 'enter');
    let done = false;
    if (el) done = press(el);
    else if (root.id === 'app' && document.querySelector('#side')) {
      if (key === 'arrowup') done = racePace(-1);
      else if (key === 'arrowdown') done = racePace(1);
    } else if (key === 'escape' && root.classList && root.classList.contains('modal-wrap')) {
      // a modal without its own close button: Esc only closes it if it offers a plain cancel
      const c = root.querySelector('[data-act="closeModal"]'); if (c) done = press(c);
    }
    if (done || key === 'space') e.preventDefault(); // Space never scrolls the page behind the game
  }
  // Mouse wheel: vertical lists scroll natively. When nothing under the mouse can scroll up/down any
  // more, a sideways row (trophy shelves, card rows) turns the wheel into sideways scrolling.
  // (Shift+wheel and trackpad swipes scroll rows sideways natively, and desktop shows thin scrollbars.)
  function onWheel(e) {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 300 : 1; const dy = e.deltaY * mult; if (!dy) return;
    let row = null;
    for (let el = e.target; el && el.nodeType === 1 && el.id !== 'frame'; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        const atEnd = dy > 0 ? el.scrollTop + el.clientHeight >= el.scrollHeight - 1 : el.scrollTop <= 0;
        if (!atEnd) return; // a list can still scroll: leave it to the browser
      }
      if (!row && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        const atEnd = dy > 0 ? el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 : el.scrollLeft <= 0;
        if (!atEnd) row = el;
      }
    }
    if (row) { row.scrollLeft += dy; e.preventDefault(); }
  }
  function init() {
    document.addEventListener('keydown', onKey);
    document.addEventListener('wheel', onWheel, { passive: false });
  }
  return { init, onKey, onWheel };
})();
