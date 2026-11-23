/* Boot */
'use strict';
(function () {
  function bgPattern() {
    const rows = ['STOCK CAR MANAGER', 'CHASE THE CUP', 'IN THE DRAFT'];
    const sc = 4; const w = Math.max(...rows.map(PF.measure)) * sc + 60; const lh = 11 * sc; const h = lh * rows.length;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    rows.forEach((r, i) => { const off = (i * w / 3) % w; for (const dx of [-w, 0, w]) PF.draw(x, r, off + dx, i * lh + 4, '#1a1c21', sc); });
    const el = document.getElementById('bgpat'); el.style.backgroundImage = `url(${c.toDataURL()})`;
  }
  function rotateArt() {
    const c = document.createElement('canvas'); c.width = 20; c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#0d0e10'; x.fillRect(0, 0, 20, 32); x.fillStyle = '#e6ff2b'; x.fillRect(2, 3, 16, 24); x.fillStyle = '#d9342b'; x.fillRect(5, 12, 10, 5); x.fillStyle = '#f4f4f4'; x.fillRect(9, 29, 2, 2);
    document.getElementById('rotate').innerHTML = `<img class="pix phone" src="${c.toDataURL()}" style="width:80px;height:128px" alt="">${PF.img('ROTATE YOUR PHONE', { scale: 3, shadow: '#1b1b1b' })}${PF.img('STOCK CAR MANAGER\nPLAYS IN LANDSCAPE', { scale: 2 })}`;
  }
  window.addEventListener('DOMContentLoaded', () => {
    VIEW.fit(); bgPattern(); rotateArt();
    Game.load();
    document.addEventListener('click', UI.onClick);
    Input.init();
    // v1.2.1: refit the stage at once (desktop scaling), then redraw the screen once resizing settles
    let rt, zc = false; window.addEventListener('resize', () => { if (VIEW.fit()) zc = true; clearTimeout(rt); rt = setTimeout(() => { const z = zc; zc = false; UI.onResize(z); }, 150); });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    UI.hub();
    UI.maybeWhatsNew();
  });
  window.addEventListener('error', e => console.error('GAME ERROR', e.message));
})();
