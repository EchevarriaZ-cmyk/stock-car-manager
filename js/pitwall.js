/* v1.2 "Pit Wall": extra pixel art drawn in code - driver portraits, track icons, dark hub tiles, dashboard icons */
'use strict';
const PW = (() => {
  const OUT = '#141414';
  const cache = {};
  const mk = (w, h) => Art.mk(w, h);
  function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // deterministic little PRNG so a driver always gets the same face
  function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }
  // multi-colour pixel pattern -> canvas. pal maps chars to colours
  function pix(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length; const [c, x] = mk(w, h);
    rows.forEach((r, yy) => [...r].forEach((ch, xx) => { const col = pal[ch]; if (col) { x.fillStyle = col; x.fillRect(xx, yy, 1, 1); } }));
    return c;
  }
  function pixURL(key, rows, pal) { if (!cache[key]) cache[key] = pix(rows, pal).toDataURL(); return cache[key]; }

  // ---------- driver portrait (32x32) ----------
  const SKIN = ['#f3cfae', '#e6b38c', '#cf9468', '#ad7149', '#8a5434', '#653a22'];
  const HAIR = ['#2a1a10', '#4a2c17', '#73431f', '#a8742f', '#d9b65c', '#161616', '#b0412a'];
  function portrait(d, lv) {
    lv = lv || { body: '#d9342b', stripe: '#f2d22e' };
    const key = 'P' + (d ? d.id + d.age : 'none') + lv.body + lv.stripe;
    if (cache[key]) return cache[key];
    const W = 32, H = 32; const g = Array.from({ length: H }, () => Array(W).fill(null));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
    const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
    const [c, ctx] = mk(W, H);
    // background: pit garage wall
    for (let y = 0; y < H; y++) { ctx.fillStyle = y < 20 ? (y % 4 === 0 ? '#2b3444' : '#313b4d') : '#283040'; ctx.fillRect(0, y, W, 1); }
    if (!d) {
      // empty seat: grey helmet silhouette with "?"
      rect(9, 6, 14, 14, '#4a4f58'); rect(8, 9, 16, 9, '#4a4f58'); rect(12, 11, 9, 4, '#2a2d33'); rect(5, 24, 22, 8, '#3d4149'); rect(13, 20, 6, 4, '#3d4149');
    } else {
      const r = rng(hash(d.id + d.first + d.last));
      const skin = SKIN[Math.floor(r() * SKIN.length)]; const skinD = U.shade(skin, -0.18);
      let hair = HAIR[Math.floor(r() * HAIR.length)]; if (d.age >= 40 && r() < 0.6) hair = '#9a9a9a'; if (d.age >= 48) hair = '#c9c9c9';
      const style = Math.floor(r() * 5); const eye = ['#3a6ea8', '#4a2c17', '#2e6b3a', '#1b1b1b'][Math.floor(r() * 4)];
      const suit = lv.body, trim = lv.stripe === lv.body ? '#f4f4f4' : lv.stripe;
      // shoulders + firesuit
      rect(4, 26, 24, 6, suit); rect(6, 25, 20, 1, suit); rect(8, 24, 16, 1, suit);
      rect(4, 29, 24, 1, U.shade(suit, -0.25)); rect(15, 25, 2, 7, U.shade(suit, -0.3)); // zip
      rect(5, 27, 5, 1, trim); rect(22, 27, 5, 1, trim); // shoulder stripes
      // collar
      rect(11, 22, 10, 2, trim); rect(12, 24, 8, 1, trim);
      // neck
      rect(13, 19, 6, 4, skinD);
      // head
      rect(10, 8, 12, 12, skin); rect(11, 7, 10, 1, skin); rect(11, 20, 10, 1, skin); rect(12, 21, 8, 1, skinD);
      rect(9, 12, 1, 4, skin); rect(22, 12, 1, 4, skin); // ears
      rect(21, 9, 1, 11, skinD); // cheek shade
      // eyes & brows
      rect(12, 13, 2, 1, '#f4f4f4'); rect(18, 13, 2, 1, '#f4f4f4'); set(13, 13, eye); set(18, 13, eye);
      rect(12, 11, 3, 1, U.shade(hair, -0.1)); rect(17, 11, 3, 1, U.shade(hair, -0.1));
      // nose & mouth
      rect(15, 14, 2, 2, skinD); set(16, 15, U.shade(skin, -0.3));
      rect(14, 17, 4, 1, '#8a3a2e'); if (r() < 0.5) { set(13, 17, '#8a3a2e'); set(18, 16, '#8a3a2e'); }
      if (d.age >= 30 && r() < 0.35) { rect(12, 18, 8, 2, U.shade(hair, -0.05)); rect(14, 17, 4, 1, '#8a3a2e'); } // beard
      // hair
      if (style === 0) { rect(10, 5, 12, 4, hair); rect(9, 7, 2, 5, hair); rect(21, 7, 2, 4, hair); rect(13, 4, 7, 1, hair); }
      else if (style === 1) { rect(10, 6, 12, 2, hair); rect(10, 8, 1, 3, hair); rect(21, 8, 1, 3, hair); }
      else if (style === 2) { rect(9, 5, 14, 4, hair); rect(8, 7, 3, 12, hair); rect(21, 7, 3, 12, hair); rect(18, 8, 4, 2, hair); }
      else if (style === 3) { // team cap
        rect(9, 5, 14, 4, suit); rect(8, 8, 18, 2, U.shade(suit, -0.25)); rect(14, 6, 4, 2, trim); rect(9, 10, 1, 2, hair); rect(22, 10, 1, 2, hair);
      } else { for (let i = 0; i < 7; i++) { rect(9 + i * 2, 4 + (i % 2), 2, 4, hair); } rect(9, 8, 2, 4, hair); rect(21, 8, 2, 4, hair); }
    }
    // outline pass: empty pixels touching a filled one get the dark outline
    const out = g.map(row => row.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x]) {
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const yy = y + b, xx = x + a; if (yy >= 0 && yy < H && xx >= 0 && xx < W && g[yy][xx]) { out[y][x] = OUT; break; } }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (out[y][x]) { ctx.fillStyle = out[y][x]; ctx.fillRect(x, y, 1, 1); }
    cache[key] = c.toDataURL(); return cache[key];
  }

  // ---------- tiny track icons from the real track geometry ----------
  const geomPts = {};
  function trackPts(tid) {
    if (geomPts[tid]) return geomPts[tid];
    const g = new TrackGeom(tid); const pts = [];
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < g.M; i += 2) { pts.push([g.X[i], g.Y[i]]); minX = Math.min(minX, g.X[i]); maxX = Math.max(maxX, g.X[i]); minY = Math.min(minY, g.Y[i]); maxY = Math.max(maxY, g.Y[i]); }
    return (geomPts[tid] = { pts, minX, minY, w: maxX - minX, h: maxY - minY });
  }
  function trackIcon(tid, w, h, col, thick) {
    const key = 'TI' + tid + w + 'x' + h + col + (thick || 2);
    if (cache[key]) return cache[key];
    const [c, x] = mk(w, h); const t = trackPts(tid); const th = thick || 2; const pad = th + 1;
    const sc = Math.min((w - pad * 2) / t.w, (h - pad * 2) / t.h); const ox = (w - t.w * sc) / 2, oy = (h - t.h * sc) / 2;
    x.fillStyle = OUT;
    const P = t.pts.map(([a, b]) => [Math.round(ox + (a - t.minX) * sc), Math.round(oy + (b - t.minY) * sc)]);
    for (const [a, b] of P) x.fillRect(a - 1, b - 1, th + 2, th + 2);
    x.fillStyle = col; for (const [a, b] of P) x.fillRect(a, b, th, th);
    // start/finish tick
    const [sx, sy] = P[0]; x.fillStyle = '#f4f4f4'; x.fillRect(sx, sy - 1, 1, th + 2);
    cache[key] = c.toDataURL(); return cache[key];
  }

  // ---------- dark pit-wall hub tiles ----------
  function frontCar(x, cx, by, s, lv) {
    // front view stock car, s = pixel scale, by = bottom y
    const r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(cx + a * s), Math.round(by + b * s), Math.ceil(w * s), Math.ceil(h * s)); };
    r(-13, -12, 26, 12, OUT); r(-9, -17, 18, 6, OUT);
    r(-12, -11, 24, 9, lv.body); r(-8, -16, 16, 5, lv.body);
    r(-7, -15, 14, 4, '#1e2a3a'); r(-6, -15, 3, 1, '#5d7891');
    r(-12, -8, 24, 1, U.shade(lv.body, 0.25)); r(-3, -11, 6, 9, lv.stripe);
    r(-11, -6, 4, 2, '#f2e9a0'); r(7, -6, 4, 2, '#f2e9a0'); r(-6, -4, 12, 2, '#1b1b1b');
    r(-13, -2, 5, 3, OUT); r(8, -2, 5, 3, OUT);
  }
  function crewGuy(x, cx, by, s, suit, trim) {
    const r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(cx + a * s), Math.round(by + b * s), Math.ceil(w * s), Math.ceil(h * s)); };
    // outline
    r(-5, -29, 10, 10, OUT); r(-7, -20, 14, 12, OUT); r(-6, -9, 5, 9, OUT); r(1, -9, 5, 9, OUT); r(-9, -19, 3, 10, OUT); r(6, -19, 3, 10, OUT);
    // helmet + visor
    r(-4, -28, 8, 8, suit); r(-3, -25, 7, 3, '#1e2a3a'); r(-2, -25, 2, 1, '#9fd4ff'); r(-4, -27, 8, 1, trim);
    // suit
    r(-6, -19, 12, 11, suit); r(-8, -18, 2, 8, suit); r(6, -18, 2, 8, suit); r(-5, -8, 4, 8, suit); r(1, -8, 4, 8, suit);
    r(-6, -15, 12, 2, trim); r(-1, -19, 2, 11, U.shade(suit, -0.25)); r(-8, -11, 2, 1, trim); r(6, -11, 2, 1, trim);
    r(-5, -1, 4, 1, OUT); r(1, -1, 4, 1, OUT);
  }
  function hubTile(kind, w, h, opt) {
    opt = opt || {};
    const lv = opt.livery || { body: '#d9342b', stripe: '#f2d22e', num: '#141414' };
    const [c, x] = mk(w, h);
    if (kind === 'garageHub') {
      x.fillStyle = '#262a31'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#2d3139'; for (let i = 0; i < h * 0.62; i += 6) x.fillRect(0, i, w, 3);
      x.fillStyle = '#34383f'; x.fillRect(0, h * 0.62, w, h); x.fillStyle = '#3d424a'; for (let i = 0; i < w; i += 10) x.fillRect(i, h * 0.62, 1, h);
      const gw = Math.round(w * 0.62), gx = Math.round((w - gw) / 2), gy = Math.round(h * 0.16), gh = Math.round(h * 0.5);
      // roof
      x.fillStyle = OUT; for (let k = 0; k < 9; k++) x.fillRect(gx - 4 + k * 2, gy - k, gw + 8 - k * 4, 2);
      x.fillStyle = '#a3a9b2'; for (let k = 0; k < 8; k++) x.fillRect(gx - 2 + k * 2, gy - k, gw + 4 - k * 4, 1);
      // walls + door
      x.fillStyle = OUT; x.fillRect(gx - 1, gy, gw + 2, gh + 1); x.fillStyle = '#8d939c'; x.fillRect(gx, gy + 1, gw, gh);
      x.fillStyle = '#15171a'; x.fillRect(gx + 6, gy + 8, gw - 12, gh - 7);
      x.fillStyle = '#6f757e'; for (let k = 0; k < 3; k++) x.fillRect(gx + 6, gy + 8 + k * 3, gw - 12, 1);
      x.fillStyle = '#ffd000'; x.fillRect(gx + 6, gy + gh + 1, gw - 12, 2);
      frontCar(x, w / 2, gy + gh - 1, Math.max(1, Math.floor(Math.min(gw / 40, (gh - 6) / 18))), lv);
    } else if (kind === 'driversHub') {
      x.fillStyle = '#262a31'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#30353d'; x.fillRect(0, h * 0.7, w, h); x.fillStyle = '#3a3f48'; x.fillRect(0, h * 0.7, w, 2);
      const crew = [['#1d5fd1', '#f2d22e'], ['#e30d0d', '#f4f4f4'], [lv.body, lv.stripe], ['#f2d22e', '#1b1b1b'], ['#f28c18', '#1d5fd1']];
      const s = Math.max(1, Math.floor(h / 40));
      const pos = [0.12, 0.31, 0.5, 0.69, 0.88];
      crew.forEach((cc, i) => { if (i !== 2) crewGuy(x, w * pos[i], h * 0.78, s, cc[0], cc[1]); });
      crewGuy(x, w * 0.5, h * 0.86, s + 1 > 3 ? 3 : s + 1, crew[2][0], crew[2][1]);
    } else if (kind === 'trophyHub') {
      x.fillStyle = '#23262c'; x.fillRect(0, 0, w, h);
      // spotlight
      x.fillStyle = 'rgba(255,240,170,0.08)'; for (let yy = 0; yy < h; yy++) { const hw = 6 + yy * 0.45; x.fillRect(w / 2 - hw, yy, hw * 2, 1); }
      const t = Art.trophy('big', 'gold'); const sc = Math.max(1, Math.floor(Math.min(w / t.width * 0.45, h / t.height * 0.62)));
      const tw = t.width * sc, th = t.height * sc; const by = Math.round(h * 0.78);
      x.drawImage(t, Math.round(w / 2 - tw / 2), by - th, tw, th);
      x.fillStyle = OUT; x.fillRect(Math.round(w * 0.22) - 1, by - 1, Math.round(w * 0.56) + 2, 8); x.fillStyle = '#3b2414'; x.fillRect(Math.round(w * 0.22), by, Math.round(w * 0.56), 6);
      x.fillStyle = '#6b4226'; x.fillRect(Math.round(w * 0.22), by, Math.round(w * 0.56), 1);
    } else return Art.tile(kind, w, h, opt);
    return c;
  }

  // ---------- dashboard + stat icons ----------
  const ICONS = {
    garage: [['....OOOOOOOO....', '..OOGGGGGGGGOO..', 'OOGGGGGGGGGGGGOO', 'OGGOOOOOOOOOOGGO', 'OGGOKKKKKKKKOGGO', 'OGGOLLLLLLLLOGGO', 'OGGOKKKKKKKKOGGO', 'OGGOKKRRRRKKOGGO', 'OGGOKRRRRRRKOGGO', 'OGGORYRRRRYROGGO', 'OGGORRRRRRRROGGO', 'OGGOOKKKKKKOOGGO', 'OOOOOOOOOOOOOOOO'],
      { O: OUT, G: '#9aa1ab', K: '#1b1e23', L: '#5b616a', R: '#e0303a', Y: '#ffd76a' }],
    helmet: [['....OOOOOO....', '..OOBBBBBBOO..', '.OBBBBHBBBBBO.', 'OBBBBBHBBBBBBO', 'OBBBOOOOOOOBBO', 'OBBOVVVVVVVOBO', 'OBBOVWVVVVVOBO', 'OBBBOOOOOOOBBO', 'OBBBBBBBBBBBO.', '.OBBBBBBBBBO..', '..OOOOOOOOO...', '..OSSSSSSSO...', '.OSSSSSSSSSO..', 'OSSSSSSSSSSSO.'],
      { O: OUT, B: '#2f62d8', H: '#8fb4ff', V: '#1e2a3a', W: '#bfe6ff', S: '#e0303a' }],
    sponsor: [['..........OO..', '........OOMMO.', '.......OMMMMO.', '......OMMDMMO.', 'OOOO..OMMMMO..', 'OSSOOOOOMMO...', 'OSSKKKKKOO....', 'OSSKKKKKKKKO..', 'OSSKKKKKKKKKO.', 'OSSKKKKKKKKKO.', 'OSSOKKKKKKKO..', 'OOOOOOOOOOO...'],
      { O: OUT, M: '#7ee04a', D: '#3a8a1c', S: '#2f62d8', K: '#f3cfae' }],
    speed: [['..OOOOO..', '.OYYYYYO.', 'OYO.Y.OYO', 'OY..O..YO', 'OY.O...YO', 'OYO...OYO', '.OO...OO.'], { O: OUT, Y: '#e6ff2b' }],
    flag: [['O........', 'OWKWKWKO.', 'OKWKWKWO.', 'OWKWKWKO.', 'OOOOOOOO.', 'O........', 'O........'], { O: '#ff3b47', W: '#f4f4f4', K: '#1b1b1b' }],
    // v1.4 settings + race pit-wall icons
    gear: [['...OO...', '.O.OO.O.', 'OOOWWOOO', '.OW..WO.', '.OW..WO.', 'OOOWWOOO', '.O.OO.O.', '...OO...'], { O: '#c9ced6', W: '#8b929c' }],
    fuel: [['.OOOO...', 'OYYYYO.O', 'OYOOYOOO', 'OYYYYO.O', 'OYYYYO.O', 'OYYYYOO.', 'OYYYYO..', 'OOOOOO..'], { O: '#141414', Y: '#ffd000' }],
    wrench: [['.OO...O.', 'O.W..OO.', 'OWW.OO..', '.OWOO...', '..OWO...', '.OOOWO..', 'OO..OWO.', 'O....OO.'], { O: '#141414', W: '#c9ced6' }],
    four: [['OO.OO', 'OO.OO', '.....', 'OO.OO', 'OO.OO'], { O: '#f4f4f4' }],
    two: [['OO.KK', 'OO.KK', '.....', 'OO.KK', 'OO.KK'], { O: '#f4f4f4', K: '#3a3f47' }],
    tire: [['..OOOOO..', '.OKKKKKO.', 'OKKGGGKKO', 'OKGKKKGKO', 'OKGKKKGKO', 'OKKGGGKKO', '.OKKKKKO.', '..OOOOO..'], { O: '#2ecc40', K: '#1b1b1b', G: '#2ecc40' }],
  };
  function icon(name, scale) {
    const [rows, pal] = ICONS[name]; const u = pixURL('IC' + name, rows, pal); const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    return `<img class="pix" src="${u}" style="width:${w * scale}px;height:${h * scale}px" alt="">`;
  }
  function trophyIcon(scale) { const t = Art.trophy('cup', 'gold'); return `<img class="pix" src="${Art.trophyURL('cup', 'gold')}" style="width:${t.width * scale}px;height:${t.height * scale}px" alt="">`; }
  return { portrait, trackIcon, hubTile, icon, trophyIcon, hash };
})();
