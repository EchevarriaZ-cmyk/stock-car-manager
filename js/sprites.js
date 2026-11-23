/* Pixel art drawn in code: car sprites, hub tile scenes, icons */
'use strict';
const Art = (() => {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return [c, x]; };
  const OUT = '#141414', GLASS = '#1e2a3a', GLASS_HI = '#5d7891';
  const cache = {};
  // number panel helper: 2 digits (3x5 font) on a white panel, rotated 180 when the sprite is flipped
  function numPanel(x, number, px, py, pw, ph, col, flip) {
    x.fillStyle = '#f4f4f4'; x.fillRect(px, py, pw, ph);
    const s = String(number).slice(0, 2); const w = s.length * 4 - 1; col = col === '#f4f4f4' || col === '#f2f2f2' ? '#141414' : col;
    const ox = Math.floor((pw - w) / 2), oy = Math.floor((ph - 5) / 2);
    if (!flip) PF.digits3(x, s, px + ox, py + oy, col);
    else { const t = document.createElement('canvas'); t.width = pw; t.height = ph; const tx = t.getContext('2d'); PF.digits3(tx, s, ox, ph - 5 - oy, col);
      x.save(); x.translate(px + pw, py + ph); x.rotate(Math.PI); x.drawImage(t, 0, 0); x.restore(); }
  }
  // v1.3: every series has its own car. model: kart | arca | truck | oreilly | cup (default) | usf | pro | nxt | indy
  function carBig(lv, number, flip) {
    const m = lv.model || 'cup';
    if (m !== 'cup' && !lv.pace) {
      const key = 'B' + m + lv.body + lv.stripe + lv.num + number + (flip ? 'f' : '');
      if (cache[key]) return cache[key];
      const [c, x] = mk(32, 16);
      if (m === 'kart') drawKart(x, lv, number, flip); else if (m === 'usf' || m === 'pro' || m === 'nxt' || m === 'indy') drawOW(x, lv, number, flip, m); else drawStock(x, lv, number, flip, m);
      cache[key] = c; return c;
    }
    const key = 'B' + lv.body + lv.stripe + lv.num + number + (lv.pace ? 'p' : '') + (flip ? 'f' : '');
    if (cache[key]) return cache[key];
    const [c, x] = mk(32, 16);
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    // tires
    r(OUT, 5, 0, 6, 2); r(OUT, 22, 0, 6, 2); r(OUT, 5, 14, 6, 2); r(OUT, 22, 14, 6, 2);
    // outline + body
    r(OUT, 2, 1, 28, 14); r(OUT, 1, 2, 30, 12);
    r(lv.body, 2, 2, 28, 12);
    r(OUT, 2, 2, 1, 1); r(OUT, 2, 13, 1, 1); r(OUT, 29, 2, 1, 1); r(OUT, 29, 13, 1, 1);
    // side shading
    r(U.shade(lv.body, -0.25), 3, 12, 26, 1); r(U.shade(lv.body, 0.25), 3, 2, 26, 1);
    // stripes along hood & trunk
    r(lv.stripe, 21, 6, 8, 4); r(lv.stripe, 2, 6, 4, 4);
    r(U.shade(lv.stripe, -0.3), 21, 9, 8, 1);
    // spoiler
    r('#2a2a2a', 2, 3, 1, 10);
    // rear window
    r(GLASS, 6, 4, 3, 8); r(GLASS_HI, 7, 5, 1, 2);
    // roof + number panel
    r(lv.body, 9, 3, 9, 10);
    if (!lv.pace) {
      r('#f4f4f4', 9, 4, 9, 8);
      const s = String(number).slice(0, 2); const w = s.length * 4 - 1;
      const col = lv.num === '#f4f4f4' || lv.num === '#f2f2f2' ? '#141414' : lv.num;
      if (!flip) PF.digits3(x, s, 9 + Math.floor((9 - w) / 2), 5 + 1, col);
      else { const t = document.createElement('canvas'); t.width = 9; t.height = 8; const tx = t.getContext('2d'); PF.digits3(tx, s, Math.floor((9 - w) / 2), 2, col);
        x.save(); x.translate(9 + 9, 4 + 8); x.rotate(Math.PI); x.drawImage(t, 0, 0); x.restore(); }
    } else { r('#d92020', 11, 4, 2, 8); r('#2050e0', 14, 4, 2, 8); }
    // windshield
    r(GLASS, 18, 3, 3, 10); r(GLASS_HI, 19, 4, 1, 3);
    // headlight decals
    r('#f2e9a0', 29, 4, 1, 2); r('#f2e9a0', 29, 10, 1, 2);
    cache[key] = c; return c;
  }
  // ARCA (older boxy car, roof number, full-length stripe), Truck (cab + bed), O'Reilly (short roof, split hood stripes)
  function drawStock(x, lv, number, flip, m) {
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    r(OUT, 5, 0, 6, 2); r(OUT, 22, 0, 6, 2); r(OUT, 5, 14, 6, 2); r(OUT, 22, 14, 6, 2);
    r(OUT, 2, 1, 28, 14); r(OUT, 1, 2, 30, 12); r(lv.body, 2, 2, 28, 12);
    r(OUT, 2, 2, 1, 1); r(OUT, 2, 13, 1, 1); r(OUT, 29, 2, 1, 1); r(OUT, 29, 13, 1, 1);
    r(U.shade(lv.body, -0.25), 3, 12, 26, 1); r(U.shade(lv.body, 0.25), 3, 2, 26, 1);
    if (m === 'truck') {
      // bed (rear) with liner and tailgate, cab roof with the number, short hood
      r(U.shade(lv.body, -0.45), 3, 4, 10, 8); r('#2a2a2a', 4, 5, 8, 6); r(U.shade(lv.body, -0.2), 2, 3, 1, 10); r(lv.stripe, 5, 7, 6, 2);
      r(OUT, 13, 3, 1, 10); r(GLASS, 14, 3, 1, 10);
      r(lv.body, 15, 3, 8, 10); numPanel(x, number, 15, 4, 8, 8, lv.num, flip);
      r(GLASS, 23, 3, 2, 10); r(GLASS_HI, 23, 4, 1, 3);
      r(lv.stripe, 25, 4, 4, 8); r('#d8d8d8', 29, 3, 1, 10); r('#f2e9a0', 29, 4, 1, 2); r('#f2e9a0', 29, 10, 1, 2);
      return;
    }
    if (m === 'arca') {
      r(lv.stripe, 2, 7, 28, 2); r('#2a2a2a', 2, 3, 2, 10); r('#5a5a5a', 2, 3, 1, 10);
      r(GLASS, 7, 4, 3, 8); r(lv.body, 10, 3, 8, 10); numPanel(x, number, 10, 4, 8, 8, lv.num, flip); r(lv.stripe, 10, 7, 0, 0);
      r(GLASS, 18, 3, 3, 10); r(GLASS_HI, 19, 4, 1, 3); r('#f2e9a0', 29, 3, 1, 3); r('#f2e9a0', 29, 10, 1, 3);
      return;
    }
    // oreilly
    r(lv.stripe, 22, 4, 7, 2); r(lv.stripe, 22, 10, 7, 2); r(lv.stripe, 2, 5, 3, 6);
    r('#2a2a2a', 2, 3, 1, 10); r(GLASS, 6, 4, 4, 8); r(GLASS_HI, 7, 5, 1, 2);
    r(lv.body, 10, 3, 8, 10); numPanel(x, number, 10, 4, 8, 8, lv.num, flip);
    r(GLASS, 18, 3, 4, 10); r(GLASS_HI, 19, 4, 1, 3); r('#f2e9a0', 29, 4, 1, 2); r('#f2e9a0', 29, 10, 1, 2);
  }
  // kart: exposed tyres, side pods, nose fairing with the number, driver in the seat
  function drawKart(x, lv, number, flip) {
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    r(OUT, 3, 0, 7, 4); r('#2b2b2b', 4, 1, 5, 2); r(OUT, 3, 12, 7, 4); r('#2b2b2b', 4, 13, 5, 2);
    r(OUT, 21, 1, 5, 3); r('#2b2b2b', 22, 2, 3, 1); r(OUT, 21, 12, 5, 3); r('#2b2b2b', 22, 13, 3, 1);
    r('#8a8a8a', 6, 4, 18, 1); r('#8a8a8a', 6, 11, 18, 1); r('#8a8a8a', 9, 4, 1, 8); r('#8a8a8a', 20, 4, 1, 8);
    r(OUT, 11, 3, 10, 2); r(lv.body, 12, 3, 8, 1); r(OUT, 11, 11, 10, 2); r(lv.body, 12, 12, 8, 1);
    r(OUT, 1, 4, 3, 8); r(lv.stripe, 2, 5, 1, 6);
    r(OUT, 24, 3, 7, 10); r(lv.body, 25, 4, 5, 8); numPanel(x, number, 24, 5, 7, 6, lv.num, flip);
    r(OUT, 11, 5, 8, 6); r('#3a3a3a', 12, 6, 6, 4);
    r(OUT, 13, 5, 6, 6); r(lv.stripe, 14, 6, 4, 4); r(lv.body, 14, 7, 4, 1); r('#1e2a3a', 17, 6, 1, 4); r('#9fd4ff', 17, 7, 1, 1);
  }
  // open-wheel ladder: usf (simple junior car), pro (bigger wings), nxt (sidepods), indy (sidepods + aeroscreen)
  function drawOW(x, lv, number, flip, m) {
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const big = m === 'nxt' || m === 'indy';
    r(OUT, 2, 0, 7, 4); r('#2b2b2b', 3, 1, 5, 2); r(OUT, 2, 12, 7, 4); r('#2b2b2b', 3, 13, 5, 2);
    r(OUT, 22, 1, 5, 3); r('#2b2b2b', 23, 2, 3, 1); r(OUT, 22, 12, 5, 3); r('#2b2b2b', 23, 13, 3, 1);
    // rear wing
    r(OUT, 0, m === 'usf' ? 3 : 2, 3, m === 'usf' ? 10 : 12); r(lv.stripe, 1, m === 'usf' ? 4 : 3, 1, m === 'usf' ? 8 : 10);
    // sidepods / body
    if (big) { r(OUT, 8, 3, 11, 10); r(lv.body, 9, 4, 9, 8); r(U.shade(lv.body, -0.25), 9, 11, 9, 1); r(lv.stripe, 10, 4, 7, 1); r(lv.stripe, 10, 11, 7, 1); }
    else { r(OUT, 8, 4, 11, 8); r(lv.body, 9, 5, 9, 6); r(U.shade(lv.body, -0.25), 9, 10, 9, 1); }
    // engine cover + airbox
    r(OUT, 3, 6, 6, 4); r(lv.body, 4, 7, 5, 2); r(lv.stripe, 5, 7, 3, 1);
    // nose
    r(OUT, 18, 5, 11, 6); r(lv.body, 19, 6, 9, 4);
    numPanel(x, number, 19, 5, 8, 6, lv.num, flip);
    // front wing
    r(OUT, 28, 1, 3, 14); r(lv.stripe, 29, 2, 1, 12); if (m !== 'usf') { r(OUT, 27, 1, 1, 3); r(OUT, 27, 12, 1, 3); }
    // cockpit + helmet (+ aeroscreen on the IndyCar)
    r(OUT, 12, 6, 5, 4); r(lv.stripe, 13, 7, 3, 2); r('#1e2a3a', 15, 7, 1, 2);
    if (m === 'indy') { r(OUT, 17, 5, 2, 6); r(GLASS_HI, 17, 6, 1, 4); }
  }
  function carSmall(lv) {
    const m = lv.pace ? 'cup' : lv.model || 'cup';
    const key = 'S' + (m === 'cup' ? '' : m) + lv.body + lv.stripe + (lv.pace ? 'p' : '');
    if (cache[key]) return cache[key];
    const [c, x] = mk(12, 6);
    const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    if (m === 'kart') {
      r(OUT, 2, 0, 3, 1); r(OUT, 8, 0, 2, 1); r(OUT, 2, 5, 3, 1); r(OUT, 8, 5, 2, 1);
      r(OUT, 2, 1, 9, 4); r(lv.body, 3, 1, 1, 4); r(lv.body, 9, 2, 1, 2); r('#5a5a5a', 4, 2, 4, 2); r(lv.stripe, 5, 2, 2, 2);
      cache[key] = c; return c;
    }
    if (m === 'usf' || m === 'pro' || m === 'nxt' || m === 'indy') {
      r(OUT, 1, 0, 3, 1); r(OUT, 8, 0, 2, 1); r(OUT, 1, 5, 3, 1); r(OUT, 8, 5, 2, 1);
      r(OUT, 0, 1, 1, 4); r(OUT, 11, 0, 1, 6); r(OUT, 2, 1, 9, 4); r(lv.body, 3, m === 'nxt' || m === 'indy' ? 1 : 2, 5, m === 'nxt' || m === 'indy' ? 4 : 2); r(lv.body, 8, 2, 3, 2); r(lv.stripe, 5, 2, 2, 2);
      cache[key] = c; return c;
    }
    if (m === 'truck') {
      r(OUT, 2, 0, 3, 1); r(OUT, 8, 0, 3, 1); r(OUT, 2, 5, 3, 1); r(OUT, 8, 5, 3, 1);
      r(OUT, 0, 1, 12, 4); r(lv.body, 1, 1, 10, 4); r('#2a2a2a', 1, 2, 4, 2); r(GLASS, 8, 1, 1, 4); r('#f4f4f4', 6, 2, 2, 2); r(lv.stripe, 10, 2, 1, 2);
      cache[key] = c; return c;
    }
    r(OUT, 2, 0, 3, 1); r(OUT, 8, 0, 3, 1); r(OUT, 2, 5, 3, 1); r(OUT, 8, 5, 3, 1);
    r(OUT, 0, 1, 12, 4); r(lv.body, 1, 1, 10, 4);
    r(lv.stripe, 9, 2, 2, 2); r(GLASS, 7, 1, 1, 4); r(GLASS, 2, 1, 1, 4);
    r(lv.pace ? '#d92020' : '#f4f4f4', 4, 2, 2, 2);
    cache[key] = c; return c;
  }
  function carURL(lv, number) { const k = 'U' + (lv.model || '') + lv.body + lv.stripe + lv.num + number; if (!cache[k]) cache[k] = carBig(lv, number).toDataURL(); return cache[k]; }
  function carImg(lv, number, scale, rot) {
    scale = scale || 3;
    return `<img class="pix car-img" src="${carURL(lv, number)}" style="width:${32 * scale}px;height:${16 * scale}px;${rot ? 'transform:rotate(' + rot + 'deg)' : ''}" alt="#${number}">`;
  }
  // ---------- tile scenes ----------
  function asphalt(x, w, h, base) {
    x.fillStyle = base || '#5b5b5b'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * 0.12; i++) { x.fillStyle = Math.random() < 0.5 ? '#656565' : '#515151'; x.fillRect(U.randi(0, w), U.randi(0, h), 1, 1); }
  }
  function drawRot(x, img, cx, cy, ang, sc) {
    sc = sc || 1; x.save(); x.translate(Math.round(cx), Math.round(cy)); x.rotate(ang); x.drawImage(img, Math.round(-img.width * sc / 2), Math.round(-img.height * sc / 2), img.width * sc, img.height * sc); x.restore();
  }
  function crowd(x, ax, ay, w, h) {
    const cols = ['#d9342b', '#1d5fd1', '#f2d22e', '#f4f4f4', '#2e8b3a', '#f28c18', '#1b1b1b', '#f07ab8'];
    x.fillStyle = '#9a9a9a'; x.fillRect(ax, ay, w, h);
    for (let yy = ay; yy < ay + h; yy += 3) { x.fillStyle = '#7d7d7d'; x.fillRect(ax, yy + 2, w, 1); for (let xx = ax; xx < ax + w; xx += 2) if (Math.random() < 0.6) { x.fillStyle = U.pick(cols); x.fillRect(xx, yy, 1, 2); } }
  }
  function diagLines(x, w, h, slope, off, col, thick) {
    x.fillStyle = col;
    for (let xx = -h; xx < w + h; xx++) { const yy = Math.round(off + (xx) * slope); for (let t = 0; t < thick; t++) x.fillRect(xx, yy + t, 1, 1); }
  }
  const RL = () => ({ body: U.pick(DATA.BODY_COLORS), stripe: U.pick(DATA.BODY_COLORS), num: '#141414' });
  function tile(kind, w, h, opt) {
    opt = opt || {};
    const [c, x] = mk(w, h);
    const lv = opt.livery || { body: '#d9342b', stripe: '#f2d22e', num: '#141414' };
    const num = opt.number || 7;
    const fixed = [{ body: '#1d5fd1', stripe: '#f4f4f4', num: '#1d5fd1' }, { body: '#f2d22e', stripe: '#d9342b', num: '#d9342b' }, { body: '#f4f4f4', stripe: '#1d5fd1', num: '#141414' },
      { body: '#2e8b3a', stripe: '#f2d22e', num: '#141414' }, { body: '#2a2a2a', stripe: '#f28c18', num: '#f28c18' }, { body: '#7a33c4', stripe: '#f4f4f4', num: '#7a33c4' }];
    if (kind === 'race') {
      asphalt(x, w, h);
      x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, w, 6); crowd(x, 0, 0, w, 5);
      diagLines(x, w, h, -0.45, h + 10, '#f2c81e', 2); diagLines(x, w, h, -0.45, h + 15, '#f2c81e', 2); diagLines(x, w, h, -0.45, h - 70, '#e6e6e6', 1);
      const cars = [[0.3, 0.32, num, lv], [0.62, 0.3, 24, fixed[2]], [0.42, 0.55, 12, fixed[1]], [0.75, 0.52, 3, fixed[4]], [0.2, 0.75, 17, fixed[0]], [0.55, 0.8, 88, fixed[3]]];
      for (const [px, py, n, l] of cars) drawRot(x, carBig(l, n), px * w, py * h, -0.42);
    } else if (kind === 'garage') {
      asphalt(x, w, h, '#6a6a6a');
      x.fillStyle = '#9c9c9c'; x.fillRect(0, 0, w, 14); x.fillStyle = '#1b1b1b'; x.fillRect(4, 6, w - 8, 6);
      PF.draw(x, 'SCM', 6, 1, '#1b1b1b', 1);
      for (let i = 0; i < 4; i++) { x.fillStyle = '#e6e6e6'; x.fillRect(Math.round(w * (0.04 + i * 0.32)), 18, 1, h - 26); }
      drawRot(x, carBig(lv, num), w * 0.2, h * 0.55, -Math.PI / 2);
      drawRot(x, carBig(fixed[1], 22), w * 0.52, h * 0.6, -Math.PI / 2);
      drawRot(x, carBig(fixed[2], 6), w * 0.84, h * 0.55, -Math.PI / 2);
      x.fillStyle = '#e0b020'; x.fillRect(w * 0.35, h - 4, w * 0.3, 4);
    } else if (kind === 'drivers') {
      asphalt(x, w, h, '#4b4b4b');
      const helmet = (cx, cy, s, col, col2) => {
        const r = (a, b, ww, hh, cc) => { x.fillStyle = cc; x.fillRect(Math.round(cx + a * s), Math.round(cy + b * s), Math.ceil(ww * s), Math.ceil(hh * s)); };
        r(-6, -7, 12, 14, OUT); r(-7, -5, 14, 10, OUT);
        r(-5, -6, 10, 12, col); r(-6, -4, 12, 8, col);
        r(-5, -2, 10, 1, col2); r(-1, -6, 2, 12, col2);
        r(0, -3, 6, 5, OUT); r(1, -2, 5, 3, '#4fa8e0'); r(2, -2, 2, 1, '#bfe6ff');
      };
      helmet(w * 0.3, h * 0.42, 2, '#d9342b', '#f4f4f4'); helmet(w * 0.7, h * 0.4, 2, '#1d5fd1', '#f2d22e'); helmet(w * 0.5, h * 0.62, 2.6, lv.body, lv.stripe);
    } else if (kind === 'facilities') {
      x.fillStyle = '#3f8f2f'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i += 8) { x.fillStyle = '#4aa23a'; x.fillRect(i, 0, 4, h); }
      x.fillStyle = OUT; x.fillRect(w * 0.08 - 1, h * 0.1 - 1, w * 0.62 + 2, h * 0.5 + 2); x.fillStyle = '#b8b8b8'; x.fillRect(w * 0.08, h * 0.1, w * 0.62, h * 0.5);
      for (let i = 0; i < 6; i++) { x.fillStyle = '#8a8a8a'; x.fillRect(w * 0.1 + i * w * 0.1, h * 0.14, w * 0.06, h * 0.42); }
      x.fillStyle = '#d9342b'; x.fillRect(w * 0.08, h * 0.1, w * 0.62, 3);
      x.fillStyle = OUT; x.fillRect(w * 0.74, h * 0.18, w * 0.2, h * 0.3); x.fillStyle = '#e6e6e6'; x.fillRect(w * 0.75, h * 0.2, w * 0.18, h * 0.26);
      x.fillStyle = '#5b5b5b'; x.fillRect(0, h * 0.68, w, h * 0.32);
      for (let i = 0; i < w; i += 14) { x.fillStyle = '#e6e6e6'; x.fillRect(i, h * 0.68, 1, h * 0.14); }
      drawRot(x, carBig(lv, num), w * 0.3, h * 0.84, 0); drawRot(x, carBig(fixed[0], 14), w * 0.75, h * 0.84, Math.PI);
    } else if (kind === 'sponsors') {
      x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, w, h);
      const sp = U.shuffle(DATA.SPONSORS).slice(0, 12);
      let i = 0;
      for (let yy = 2; yy < h * 0.55; yy += 12) for (let xx = 2; xx < w; xx += 32) { const s = sp[i++ % sp.length]; x.fillStyle = s[1]; x.fillRect(xx, yy, 30, 10); x.fillStyle = s[2]; x.fillRect(xx + 3, yy + 4, 24, 2); }
      x.fillStyle = '#5b5b5b'; x.fillRect(0, h * 0.58, w, h); for (let k = 0; k < 300; k++) { x.fillStyle = '#656565'; x.fillRect(U.randi(0, w), U.randi(h * 0.58, h), 1, 1); }
      drawRot(x, carBig(lv, num), w * 0.5, h * 0.8, 0, 1.2);
    } else if (kind === 'calendar') {
      x.fillStyle = '#3f8f2f'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#5b5b5b'; x.beginPath(); x.ellipse(w / 2, h / 2, w * 0.4, h * 0.32, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#3f8f2f'; x.beginPath(); x.ellipse(w / 2, h / 2, w * 0.27, h * 0.16, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#e6e6e6'; for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#1b1b1b' : '#f4f4f4'; x.fillRect(w / 2 - 1, h / 2 + h * 0.17 + k * 2, 3, 2); }
      drawRot(x, carSmall(lv), w * 0.3, h * 0.78, 0, 1.5); drawRot(x, carSmall(fixed[1]), w * 0.7, h * 0.24, Math.PI, 1.5);
      // flag
      const fx = w * 0.72, fy = h * 0.55; x.fillStyle = '#8a4b22'; x.fillRect(fx, fy, 2, 22);
      for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) { x.fillStyle = (a + b) % 2 ? '#1b1b1b' : '#f4f4f4'; x.fillRect(fx + 2 + a * 3, fy + b * 3, 3, 3); }
    } else if (kind === 'standings') {
      asphalt(x, w, h, '#4b4b4b');
      for (let a = 0; a < w; a += 4) for (let b = 0; b < 2; b++) { x.fillStyle = ((a / 4) + b) % 2 ? '#1b1b1b' : '#f4f4f4'; x.fillRect(a, b * 4, 4, 4); }
      const pod = [[0.5, 0.5, '#f2c81e', '1'], [0.2, 0.62, '#c8c8c8', '2'], [0.8, 0.7, '#c87a3a', '3']];
      for (const [px, py, col, n] of pod) { x.fillStyle = OUT; x.fillRect(px * w - 15, py * h - 1, 30, h); x.fillStyle = col; x.fillRect(px * w - 14, py * h, 28, h); PF.draw(x, n, Math.round(px * w - 1), Math.round(py * h + 4), '#1b1b1b', 1); }
      drawRot(x, carBig(lv, num), w * 0.5, h * 0.5 - 10, -Math.PI / 2, 0.8); drawRot(x, carBig(fixed[0], 9), w * 0.2, h * 0.62 - 10, -Math.PI / 2, 0.8); drawRot(x, carBig(fixed[4], 41), w * 0.8, h * 0.7 - 10, -Math.PI / 2, 0.8);
    } else if (kind === 'career') {
      asphalt(x, w, h, '#8f8f8f');
      crowd(x, 0, 0, w, Math.round(h * 0.3));
      x.fillStyle = '#e6e6e6'; x.fillRect(0, h * 0.3, w, 2); x.fillStyle = '#b0b0b0'; x.fillRect(0, h * 0.3 + 2, w, 2);
      for (let b = 0; b < h * 0.7; b += 3) for (let a = 0; a < 2; a++) { x.fillStyle = ((b / 3) + a) % 2 ? '#1b1b1b' : '#f4f4f4'; x.fillRect(w * 0.45 + a * 3, h * 0.3 + 4 + b, 3, 3); }
      drawRot(x, carBig(lv, num), w * 0.62, h * 0.72, -0.25); drawRot(x, carBig(fixed[5], 31), w * 0.25, h * 0.6, -0.2);
    } else if (kind === 'trophies') {
      // wooden trophy cabinet with lit shelves
      x.fillStyle = '#3b2414'; x.fillRect(0, 0, w, h); x.fillStyle = '#4e301b'; for (let i = 0; i < w; i += 6) x.fillRect(i, 0, 3, h);
      x.fillStyle = '#6b4226'; x.fillRect(0, 0, w, 5); x.fillRect(0, 0, 5, h); x.fillRect(w - 5, 0, 5, h);
      const shelves = [0.42, 0.74]; const items = [['cup', 'gold'], ['big', 'gold'], ['medal', 'silver'], ['cup', 'bronze'], ['star', 'gold'], ['flag', 'gold'], ['medal', 'gold'], ['cup', 'silver']];
      let k = 0;
      for (const sy of shelves) {
        const y = Math.round(h * sy);
        x.fillStyle = OUT; x.fillRect(4, y, w - 8, 5); x.fillStyle = '#a0683c'; x.fillRect(5, y + 1, w - 10, 3); x.fillStyle = '#c58a52'; x.fillRect(5, y + 1, w - 10, 1);
        for (let xx = 10; xx < w - 16; xx += Math.max(18, Math.round(w / 4.2))) { const [kd, mt] = items[k++ % items.length]; const t = trophy(kd, mt); const sc = kd === 'big' ? 1 : 1.4; const tw = Math.round(t.width * sc), th = Math.round(t.height * sc); x.drawImage(t, xx, y - th, tw, th); }
      }
      x.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 3; i++) { for (let yy = 0; yy < h; yy++) x.fillRect(Math.round(w * 0.2 + i * 6 + yy * 0.5), yy, 2, 1); }
      x.fillStyle = '#6b4226'; x.fillRect(0, h - 6, w, 6);
    } else if (kind === 'news') {
      asphalt(x, w, h, '#4b4b4b');
    }
    return c;
  }

  // ---------- trophies (v1.1) ----------
  const METALS = { gold: ['#f2c81e', '#fff2a0', '#b08a10'], silver: ['#cfcfcf', '#ffffff', '#8a8a8a'], bronze: ['#c87a3a', '#f0b080', '#8a4a1a'] };
  const TROPHY_PIX = {
    cup: ['..OOOOOOOO..', 'OOGGGHGGGGOO', 'O.OGGHGGGO.O', 'O.OGGHGGGO.O', 'OO.OGGGGDO.OO'.slice(0, 12), '...OGGGDO...', '....OGDO....', '.....OO.....', '.....OO.....', '....OGGO....', '...OOOOOO...', '..OBBBBBBO..', '..OBBHBBBO..', '..OOOOOOOO..'],
    medal: ['.OO....OO.', '.ORO..ORO.', '..ORO.RO..', '...ORRO...', '...OOOO...', '..OGGGGO..', '.OGGHGGGO.', '.OGHGGGDO.', '.OGGGGGDO.', '..OGGGDO..', '...OOOO...'],
    big: ['......OO......', '.....OGHO.....', '..OOOOOOOOOO..', 'OOGGGGHGGGGGOO', 'O.OGGGHGGGGO.O', 'O.OGGHGGGGDO.O', 'O.OGGHGGGGDO.O', 'OO.OGGGGGDO.OO', '...OGGGGGDO...', '....OGGGDO....', '.....OGDO.....', '......OO......', '......OO......', '.....OGGO.....', '....OGGGGO....', '..OOOOOOOOOO..', '..OBBBBBBBBO..', '..OBBRRRRBBO..', '..OBBBBBBBBO..', '..OOOOOOOOOO..'],
    flag: ['O...........', 'OOOOOOOOOOO.', 'OWKWKWKWKWO.', 'OKWKWKWKWKO.', 'OWKWKWKWKWO.', 'OKWKWKWKWKO.', 'OOOOOOOOOOO.', 'OO..........', 'OO..........', 'OO..........', 'OO..........', 'OGO.........', 'OOOOOOOO....', 'OBBBBBBO....'],
    star: ['.....OO.....', '....OGGO....', '....OGHO....', 'OOOOOGHOOOOO', 'OGGGGGHGGGGO', '.OGGGHGGGDO.', '..OGGGGGDO..', '..OGGGGGDO..', '.OGGGDDGGDO.', '.OGGO..OGDO.', 'OGOO....OOGO', 'OO........OO'],
  };
  function trophy(kind, metal, locked) {
    const key = 'T' + kind + metal + (locked ? 'L' : '');
    if (cache[key]) return cache[key];
    const pix = TROPHY_PIX[kind] || TROPHY_PIX.cup; const w = Math.max(...pix.map(r => r.length)), h = pix.length;
    const [c, x] = mk(w, h); const m = METALS[metal] || METALS.gold;
    const col = locked ? { O: '#141414', G: '#2c2c2c', H: '#3a3a3a', D: '#242424', B: '#202020', R: '#2c2c2c', W: '#3a3a3a', K: '#242424' }
      : { O: OUT, G: m[0], H: m[1], D: m[2], B: '#3b2414', R: '#c4232b', W: '#f4f4f4', K: '#1b1b1b' };
    pix.forEach((row, yy) => [...row].forEach((ch, xx) => { if (col[ch]) { x.fillStyle = col[ch]; x.fillRect(xx, yy, 1, 1); } }));
    cache[key] = c; return c;
  }
  function trophyURL(kind, metal, locked) { const k = 'TU' + kind + metal + (locked ? 'L' : ''); if (!cache[k]) cache[k] = trophy(kind, metal, locked).toDataURL(); return cache[k]; }
  // tiny UI icons
  function gear(col) { const [c, x] = mk(9, 9); x.fillStyle = col || '#1b1b1b'; const p = ['..#.#.#..', '.#######.', '###...###', '.##...##.', '###...###', '.##...##.', '###...###', '.#######.', '..#.#.#..']; p.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch === '#') x.fillRect(xx, y, 1, 1); })); return c.toDataURL(); }
  function icon(rows, col) { const [c, x] = mk(rows[0].length, rows.length); x.fillStyle = col; rows.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch === '#') x.fillRect(xx, y, 1, 1); })); return c.toDataURL(); }
  return { carBig, carSmall, carImg, carURL, tile, gear, icon, mk, drawRot, asphalt, crowd, trophy, trophyURL, METALS };
})();
