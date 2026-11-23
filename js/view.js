/* v1.2.1 PC support: the game stage.
   Phones / touch: the stage is the whole screen, exactly as before (zoom 1).
   Desktop (mouse + hover): the game is laid out at a phone-like logical size (~800-960 x 480-540)
   and scaled up with CSS zoom, centred, with a sensible aspect ratio. Zoom steps are chosen so
   devicePixelRatio * zoom is a multiple of 0.25, which keeps the pixel art and pixel font crisp. */
'use strict';
const VIEW = (() => {
  const V = { desktop: false, zoom: 1, w: 0, h: 0, eff: 1, fit, isDesktop };
  const MIN_W = 800, MIN_H = 470, MIN_ASPECT = 1.5, MAX_ASPECT = 2.2;
  function isDesktop() {
    try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; }
  }
  // returns true when the zoom (and so the logical size of everything) changed
  function fit() {
    const W = window.innerWidth, H = window.innerHeight, dpr = window.devicePixelRatio || 1;
    const frame = document.getElementById('frame'); const stage = document.getElementById('stage'); const body = document.body;
    const oldZ = V.zoom, oldD = V.desktop;
    V.desktop = isDesktop();
    if (!V.desktop) {
      V.zoom = 1; V.w = W; V.h = H;
      if (body) body.classList.remove('pc');
      if (frame) { frame.style.width = ''; frame.style.height = ''; frame.style.zoom = ''; }
      if (stage) { stage.style.left = ''; stage.style.top = ''; stage.style.width = ''; stage.style.height = ''; }
    } else {
      let sw = W, sh = H;
      if (sw / sh > MAX_ASPECT) sw = sh * MAX_ASPECT;
      if (sw / sh < MIN_ASPECT) sh = sw / MIN_ASPECT;
      let z = Math.min(sw / MIN_W, sh / MIN_H);
      z = Math.floor(z * dpr * 4 + 1e-6) / 4 / dpr;
      if (!(z >= 1)) z = 1; // never shrink: small windows lay out like a phone
      // logical size whose on-screen size is a whole number of device pixels, placed on whole device pixels
      const whole = n => Math.abs(n * z * dpr - Math.round(n * z * dpr)) < 1e-6;
      let w = Math.floor(Math.min(W, sw) / z + 1e-6), h = Math.floor(Math.min(H, sh) / z + 1e-6);
      for (let i = 0; i < 8 && !whole(w); i++) w--;
      for (let i = 0; i < 8 && !whole(h); i++) h--;
      V.zoom = z; V.w = w; V.h = h;
      const vw = w * z, vh = h * z; const snap = n => Math.round(n * dpr) / dpr;
      if (body) body.classList.add('pc');
      if (stage) { stage.style.left = snap((W - vw) / 2) + 'px'; stage.style.top = snap((H - vh) / 2) + 'px'; stage.style.width = vw + 'px'; stage.style.height = vh + 'px'; }
      if (frame) { frame.style.width = w + 'px'; frame.style.height = h + 'px'; frame.style.zoom = z === 1 ? '' : String(z); }
    }
    V.eff = dpr * V.zoom;
    return oldZ !== V.zoom || oldD !== V.desktop;
  }
  fit();
  return V;
})();
