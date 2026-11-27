/* v1.10 TEAM HQ: a top-down pixel-art campus for your race shop. You are the team OWNER / manager, never the driver.
   The facilities (DATA.FACILITIES, S.team.fac, Game.startBuild) ARE the HQ buildings: upgrading here = upgrading on the
   Facilities list. New here: FANS (S.fans), FAN ZONE and HOSPITALITY SUITES (S.team.hq, levels 0-5).
   Free Mode, the tutorial demo and Owner League never touch HQ. */
'use strict';
const HQ = (() => {
  if (typeof UI === 'undefined' || !UI.h || typeof Game === 'undefined') return null;
  const H = UI.h, T = H.T, SH = H.SH, $ = q => document.querySelector(q);
  const S = () => Game.S;
  const live = () => { const s = S(); return !!(s && s.team && !s.free && !s.demo); };
  const OUT = '#141414', NEON = '#ffe600', RED = '#ff3b30';
  const NEW_MAX = 5;
  const NEW = {
    fanZone: { name: 'FAN ZONE', short: 'FAN ZONE', cost: [0, 25000, 60000, 120000, 220000, 380000], desc: 'A STAGE, FOOD TRUCKS AND AUTOGRAPH TENTS. YOUR FAN BASE GROWS FASTER AND SHRINKS LESS AFTER A BAD DAY.' },
    hospitality: { name: 'HOSPITALITY SUITES', short: 'SUITES', cost: [0, 20000, 50000, 100000, 180000, 300000], desc: 'VIP SUITES FOR SPONSOR GUESTS. EVERY NEW SPONSOR OFFER PAYS MORE PER RACE.' },
  };
  // campus plots: row 1 then row 2 (10 plots). office = the team office (looks grow with the average facility level)
  const PLOTS = ['office', 'shop', 'engineDept', 'windTunnel', 'chassisRig', 'simulator', 'pitCenter', 'fanShop', 'fanZone', 'hospitality'];
  const SHORT = { office: 'TEAM OFFICE', shop: 'SHOP', engineDept: 'ENGINE DEPT', windTunnel: 'WIND TUNNEL', chassisRig: 'CHASSIS RIG', simulator: 'SIMULATOR', pitCenter: 'PIT CREW', fanShop: 'MERCH STORE', fanZone: 'FAN ZONE', hospitality: 'SUITES' };
  const isFac = k => !!DATA.FACILITIES[k];

  // ---------- save data ----------
  const fansFromRep = (rep, wins) => Math.round(200 + 12 * rep * rep + 250 * (wins || 0));
  function ensure(o) {
    if (!o || !o.team) return;
    if (!o.team.hq || typeof o.team.hq !== 'object') o.team.hq = {};
    const q = o.team.hq; for (const k of Object.keys(NEW)) if (!(q[k] >= 0)) q[k] = 0; if (!Array.isArray(q.builds)) q.builds = [];
    if (!(o.fans >= 0)) o.fans = fansFromRep(o.rep || 0, o.stats ? o.stats.wins : 0);
  }
  function migrate(o) { if (!o || o.free) return; ensure(o); }

  // ---------- economy ----------
  const sr = () => Game.ser();
  const fanE = () => Math.round(1500 * Math.pow(sr().mult, 0.8)); // fans a win is worth in this series
  function newCost(k) { const s = S(); const l = s.team.hq[k]; if (l >= NEW_MAX) return null; return { money: Math.max(1000, Math.round(NEW[k].cost[l + 1] * sr().facMul / 1000) * 1000), days: 7 }; }
  function upkeep() { const s = S(); if (!s || !s.team || !s.team.hq) return 0; const n = Object.keys(NEW).reduce((a, k) => a + (s.team.hq[k] || 0), 0); return Math.round(n * 700 * Math.pow(sr().mult, 0.85) / 100) * 100; }
  function spMul() { if (!live()) return 1; ensure(S()); return 1 + 0.08 * (S().team.hq.hospitality || 0); }
  function startNew(k) {
    if (!live()) return 'TEAM HQ IS FOR YOUR CAREER.'; const s = S(); ensure(s);
    if (s.team.hq.builds.find(b => b.k === k)) return 'Already under construction.';
    const c = newCost(k); if (!c) return 'Max level.'; if (s.money < c.money) return 'Not enough money.';
    s.money -= c.money; s.team.hq.builds.push({ k, days: c.days, total: c.days }); Game.save(); return null;
  }
  function fanGain(L) { return { mul: 1 + 0.25 * L, flat: Math.round(fanE() * 0.04 * L), keep: 1 - 0.1 * L }; }
  // called from Game.processRace (career races only, after the merch line)
  function raceLines(sum, cars, best) {
    if (!live()) return; const s = S(); ensure(s); const q = s.team.hq;
    const N = sr().cars, E = fanE(), fz = fanGain(q.fanZone);
    let g = 0, loss = 0;
    if (!best) loss = 0.008;
    else {
      const p = best.pos; g = p === 1 ? 1 : p <= 3 ? 0.6 : p <= 5 ? 0.45 : p <= 10 ? 0.25 : p <= N / 2 ? 0.1 : 0;
      if (cars.length > 1 && cars.filter(x => x.r.pos <= 10).length > 1) g += 0.1;
      if (best.status !== 'RUNNING' || p > N * 2 / 3) loss = 0.008;
    }
    const mine = new Set(cars.map(x => x.tc.id));
    if (s.playoff && (s.playoff.alive || s.playoff.ids || []).some(id => mine.has(id))) g += 0.2; // a playoff run sells
    let d = E * g * fz.mul + (g > 0 ? fz.flat : 0) + (best && best.pos === 1 ? s.fans * 0.01 : 0) - s.fans * loss * fz.keep;
    d = Math.round(d); s.fans = Math.max(0, s.fans + d); sum.fansD = d; sum.fans = s.fans;
    const up = upkeep(); if (up) sum.lines.push(['HQ UPKEEP (FAN ZONE + SUITES)', -up]);
    for (const b of q.builds) b.days -= 7;
    for (const b of q.builds.filter(b => b.days <= 0)) { q[b.k]++; Game.news(NEW[b.k].name + ' OPENS AT LEVEL ' + q[b.k] + '!'); }
    q.builds = q.builds.filter(b => b.days > 0);
    s.hqLast = { merch: (sum.lines.find(l => /^MERCH SALES/.test(l[0])) || [0, 0])[1], fansD: d };
  }

  // ---------- state for the art ----------
  function levels() {
    const s = S(); ensure(s); const f = s.team.fac, q = s.team.hq;
    const L = {}; const fk = Object.keys(DATA.FACILITIES);
    for (const k of fk) L[k] = f[k] || 1;
    for (const k of Object.keys(NEW)) L[k] = q[k] || 0;
    L.office = Math.round(fk.reduce((a, k) => a + L[k], 0) / fk.length);
    const B = {}; for (const b of s.team.builds) B[b.fac] = 1; for (const b of q.builds) B[b.k] = 1;
    return { L, B, lv: Game.myLivery(), num: s.team.number };
  }
  const maxOf = k => k === 'office' || isFac(k) ? DATA.FAC_MAX : NEW_MAX;
  function artKey() { const st = levels(); return PLOTS.map(k => st.L[k] + (st.B[k] ? 'b' : '')).join(''); }

  // ---------- pixel art ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const sh = (c, f) => U.shade(c, f);
  function R(x, c, a, b, w, h) { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); }
  function ground(x, a, b, w, h, base, seed, dots) {
    R(x, base, a, b, w, h); const r = rng(seed); const n = Math.round(w * h * (dots || 0.08));
    for (let i = 0; i < n; i++) R(x, r() < 0.5 ? sh(base, 0.08) : sh(base, -0.12), a + Math.floor(r() * w), b + Math.floor(r() * h), 1, 1);
  }
  // a 3/4 top-down block: roof on top, front wall with windows below
  function block(x, a, b, w, h, roof, wall, L, o) {
    o = o || {}; a = Math.round(a); b = Math.round(b); w = Math.round(w); h = Math.round(h);
    const wh = Math.max(4, Math.round(h * 0.34)), rh = h - wh;
    R(x, 'rgba(0,0,0,.35)', a + 2, b + 2, w + 1, h + 1);
    R(x, OUT, a - 1, b - 1, w + 2, h + 2);
    R(x, roof, a, b, w, rh); R(x, sh(roof, 0.22), a, b, w, 1); R(x, sh(roof, -0.3), a, b + rh - 1, w, 1);
    if (o.ribs) for (let i = a + 2; i < a + w - 1; i += 3) R(x, sh(roof, -0.1), i, b + 1, 1, rh - 2);
    R(x, wall, a, b + rh, w, wh);
    if (o.brick) for (let yy = b + rh + 1; yy < b + h; yy += 2) for (let xx = a + ((yy / 2) % 2 ? 0 : 2); xx < a + w; xx += 4) R(x, sh(wall, -0.18), xx, yy, 1, 1);
    // windows: dark glass, lit from level 3
    if (!o.noWin && wh >= 5) {
      const lit = L >= 3; for (let xx = a + 2; xx + 2 <= a + w - 2; xx += 4) { R(x, lit ? '#ffd84a' : '#2b3f57', xx, b + rh + 1, 2, 2); if (lit) R(x, '#fff3b0', xx, b + rh + 1, 1, 1); }
    }
    // roof units
    if (L >= 2 && w >= 12 && rh >= 6) { R(x, '#9aa3ad', a + w - 6, b + 2, 4, 3); R(x, '#5d646e', a + w - 5, b + 3, 2, 1); }
    if (L >= 6 && w >= 24 && rh >= 16 && !o.noSky) for (let xx = a + 4; xx + 4 < a + w - 8; xx += 7) { R(x, '#5d7891', xx, b + rh - 7, 4, 3); R(x, '#bfe6ff', xx, b + rh - 7, 4, 1); }
    if (L >= 4 && w >= 20 && rh >= 8) { R(x, '#9aa3ad', a + 3, b + 2, 4, 3); R(x, '#5d646e', a + 4, b + 3, 2, 1); }
    return { rh, wh };
  }
  function hauler(x, a, b, lv, flip) {
    // top-down race hauler 16x5: cab + trailer in team colors
    a = Math.round(a); b = Math.round(b);
    R(x, 'rgba(0,0,0,.35)', a + 1, b + 1, 16, 5); R(x, OUT, a - 1, b - 1, 18, 7);
    const ca = flip ? a : a + 12, ta = flip ? a + 5 : a;
    R(x, lv.body, ta, b, 11, 5); R(x, lv.stripe, ta, b + 2, 11, 1); R(x, sh(lv.body, 0.25), ta, b, 11, 1);
    R(x, '#2a2e35', ca, b, 4, 5); R(x, '#5d7891', flip ? ca : ca + 2, b + 1, 2, 3);
  }
  function haulerV(x, a, b, lv) { // parked nose-down: 6x17
    a = Math.round(a); b = Math.round(b); R(x, 'rgba(0,0,0,.35)', a + 1, b + 1, 6, 17); R(x, OUT, a - 1, b - 1, 8, 19);
    R(x, lv.body, a, b, 6, 12); R(x, lv.stripe, a + 2, b, 1, 12); R(x, sh(lv.body, 0.25), a, b, 1, 12); R(x, '#2a2e35', a, b + 13, 6, 4); R(x, '#5d7891', a + 1, b + 15, 4, 2);
  }
  function car(x, a, b, col, vert) { a = Math.round(a); b = Math.round(b); if (vert) { R(x, OUT, a - 1, b - 1, 5, 7); R(x, col, a, b, 3, 5); R(x, '#1e2a3a', a, b + 1, 3, 1); } else { R(x, OUT, a - 1, b - 1, 7, 5); R(x, col, a, b, 5, 3); R(x, '#1e2a3a', a + 3, b, 1, 3); } }
  function flag(x, a, b, col, col2, t) { a = Math.round(a); b = Math.round(b); R(x, '#d8dde3', a, b, 1, 9); const wv = Math.round(Math.sin((t || 0) * 4 + a) * 0.6 + 0.4); R(x, col, a + 1, b + wv, 5, 3); R(x, col2, a + 1, b + 1 + wv, 5, 1); }
  function lamp(x, a, b) { R(x, '#3a3f47', Math.round(a), Math.round(b), 1, 4); R(x, 'rgba(255,230,0,.35)', Math.round(a) - 1, Math.round(b) - 2, 3, 3); R(x, '#fff3b0', Math.round(a), Math.round(b) - 1, 1, 1); }
  function crane(x, a, b, w, h, t) {
    // scaffolding + a yellow tower crane + cones: under construction
    x.strokeStyle = '#f28c18'; x.lineWidth = 1; x.setLineDash([2, 2]); x.strokeRect(Math.round(a) + 0.5, Math.round(b) + 0.5, Math.round(w), Math.round(h)); x.setLineDash([]);
    const mx = Math.round(a + w - 3), my = Math.round(b + 2);
    R(x, OUT, mx - 1, my - 1, 4, h + 2); R(x, '#ffd000', mx, my, 2, h); for (let yy = my + 1; yy < my + h; yy += 3) R(x, '#b48a00', mx, yy, 2, 1);
    const arm = Math.max(10, Math.round(w * 0.8)); const sw = Math.round(Math.sin((t || 0) * 0.7) * 2);
    R(x, OUT, mx - arm, my - 1, arm + 6, 4); R(x, '#ffd000', mx - arm + 1, my, arm + 4, 2); for (let xx = mx - arm + 2; xx < mx + 4; xx += 3) R(x, '#b48a00', xx, my, 1, 2);
    R(x, '#9aa3ad', mx - arm + 4 + sw, my + 2, 1, Math.round(h * 0.4)); R(x, '#5d646e', mx - arm + 3 + sw, my + 2 + Math.round(h * 0.4), 3, 2);
    for (let i = 0; i < 3; i++) { R(x, '#ff7a00', a + 2 + i * 4, b + h + 1, 2, 2); R(x, '#fff', a + 2 + i * 4, b + h + 1, 2, 1); }
  }
  function lot(x, a, b, w, h, seed) {
    ground(x, a, b, w, h, '#6e5236', seed, 0.18);
    for (let xx = a; xx < a + w; xx += 4) { R(x, '#c9b48a', xx, b, 1, 2); R(x, '#c9b48a', xx, b + h - 2, 1, 2); }
    const sx = Math.round(a + w / 2 - 9), sy = Math.round(b + h / 2 - 5);
    const lw = PF.measure('LOT') + 4; R(x, '#5d646e', sx + Math.floor(lw / 2) - 1, sy + 8, 2, 3); R(x, OUT, sx - 1, sy - 1, lw + 2, 10); R(x, '#f4f4f4', sx, sy, lw, 8); PF.draw(x, 'LOT', sx + 2, sy, RED, 1);
  }
  // one building in its plot area (a, b, w, h); L = level, mx = max level
  function building(x, k, a, b, w, h, L, mx, st, t) {
    const lv = st.lv, seed = PLOTS.indexOf(k) * 977 + 13;
    if (L <= 0) { lot(x, a + 2, b + 2, w - 4, h - 4, seed); if (st.B[k]) crane(x, a + 4, b + 3, w - 10, h - 8, t); return; }
    // from LV 4 a hauler parking strip opens on the right (two haulers from LV 7)
    const yard = !st.tile && k !== 'fanZone' && k !== 'hospitality' && L >= 4 ? (L >= 7 ? 20 : 11) : 0; const W0 = w; w -= yard;
    const f = 0.42 + 0.58 * (L / mx); // footprint grows with level
    const bw = Math.max(14, Math.round(w * (k === 'windTunnel' ? 0.5 + 0.5 * f : f) * 0.78)), bh = Math.max(12, Math.round(h * (0.5 + 0.45 * f)));
    const bx = Math.round(a + (w - bw) / 2), by = Math.round(b + h - bh - 1);
    // grounds: parking / yard around the building
    if (L >= 2) { ground(x, a + 1, b + h - 6, w - 2, 5, '#3a3d42', seed, 0.04); for (let xx = a + 4; xx < a + w - 3; xx += 6) R(x, '#d8dde3', xx, b + h - 6, 1, 2); }
    const space = w - bw; const sideL = bx - a, sideR = a + w - (bx + bw);
    switch (k) {
      case 'office': {
        const r = block(x, bx, by, bw, bh, lv.body, '#d8dde3', L);
        R(x, lv.stripe, bx, by + Math.round(r.rh / 2) - 1, bw, 2);
        if (bw >= 20 && r.rh >= 9) { const n = String(st.num).slice(0, 2); R(x, '#f4f4f4', bx + 3, by + 2, n.length * 4 + 2, 7); PF.digits3(x, n, bx + 4, by + 3, OUT); }
        R(x, '#1e2a3a', bx + Math.round(bw / 2) - 2, by + bh - 4, 4, 4); // door
        if (L >= 5 && r.rh >= 12 && bw >= 30) { R(x, OUT, bx + bw - 13, by + 3, 10, 7); R(x, '#4a505b', bx + bw - 12, by + 4, 8, 5); PF.draw(x, 'H', bx + bw - 10, by + 3, '#f4f4f4', 1); }
        break;
      }
      case 'shop': {
        const r = block(x, bx, by, bw, bh, '#a3a9b2', '#7d848e', L, { ribs: true, noWin: true });
        const nd = Math.max(1, Math.min(5, Math.floor(bw / 12))); const dw = Math.floor((bw - 2) / nd) - 2;
        for (let i = 0; i < nd; i++) { const dx = bx + 2 + i * (dw + 2); R(x, '#4a505b', dx, by + r.rh + 1, dw, r.wh - 1); for (let yy = by + r.rh + 2; yy < by + bh; yy += 2) R(x, '#5e646d', dx, yy, dw, 1); if (L >= 3) R(x, '#ffd84a', dx, by + r.rh, dw, 1); }
        break;
      }
      case 'engineDept': {
        const r = block(x, bx, by, bw, bh, '#4a505b', '#8c3b2e', L, { brick: true });
        const ns = Math.min(4, 1 + Math.floor(L / 2));
        for (let i = 0; i < ns; i++) { const sx = bx + 3 + i * 6, sy = by + 2; if (sx + 4 > bx + bw) break; R(x, OUT, sx - 1, sy - 1, 5, 5); R(x, '#9aa3ad', sx, sy, 3, 3); R(x, '#2a2e35', sx + 1, sy + 1, 1, 1);
          const p = (t * 3 + i * 1.7) % 4; R(x, 'rgba(220,224,230,.55)', sx + Math.round(p), sy - 3 - Math.round(p * 1.5), 3, 2); R(x, 'rgba(220,224,230,.3)', sx + 1 + Math.round(p * 1.4), sy - 6 - Math.round(p * 1.6), 2, 2); }
        if (L >= 6) { R(x, RED, bx, by + r.rh - 2, bw, 1); }
        break;
      }
      case 'simulator': {
        const r = block(x, bx, by, bw, bh, '#1d2633', '#2f6f9e', L);
        const gx = bx + 3, gw = Math.max(4, bw - 12); const glow = 0.55 + 0.25 * Math.sin(t * 2);
        R(x, `rgba(80,220,255,${glow.toFixed(2)})`, gx, by + 3, gw, Math.max(2, r.rh - 6)); R(x, '#bff4ff', gx + 1, by + 4, Math.max(1, gw - 2), 1);
        for (let yy = by + r.rh + 1; yy < by + bh; yy += 2) R(x, '#3d8fc4', bx, yy, bw, 1);
        if (L >= 4) { const dx = bx + bw - 6, dy = by + 2; R(x, OUT, dx - 1, dy - 1, 6, 6); R(x, '#e6e6e6', dx, dy, 4, 4); R(x, '#9aa3ad', dx + 1, dy + 1, 2, 2); }
        break;
      }
      case 'pitCenter': {
        // concrete pit pad with boxes, a car on a stop, crew building at the back
        const nb = Math.min(5, 1 + Math.ceil(L / 2)); const pw = Math.min(w - 4, nb * 11 + 4); const px = Math.round(a + (w - pw) / 2), ph = Math.round(h * 0.42), py = b + h - ph - 1;
        R(x, OUT, px - 1, py - 1, pw + 2, ph + 2); R(x, '#8d939c', px, py, pw, ph); R(x, '#6f757e', px, py + ph - 4, pw, 4);
        for (let i = 0; i <= nb; i++) R(x, NEON, px + 2 + i * 11, py + 1, 1, ph - 6);
        car(x, px + 5, py + 3, lv.body, true); if (L >= 3 && nb > 1) car(x, px + 16, py + 3, sh(lv.body, -0.25), true);
        for (let i = 0; i < Math.min(nb, 3); i++) R(x, '#f4f4f4', px + 9 + i * 11, py + 6, 1, 1);
        const cbw = Math.max(14, Math.round(pw * 0.7)), cbh = Math.max(9, Math.round((h - ph) * 0.62)); block(x, a + (w - cbw) / 2, py - cbh - 2, cbw, cbh, '#5d646e', '#c9ced6', L);
        if (L >= 5) for (let i = 0; i < 4; i++) R(x, i % 2 ? '#1b1b1b' : '#f4f4f4', px + pw - 8 + i * 2, py + ph - 3, 2, 2);
        break;
      }
      case 'windTunnel': {
        const th = Math.max(7, Math.round(bh * 0.5)), ty = by + bh - th - 1;
        R(x, 'rgba(0,0,0,.35)', bx + 2, ty + 2, bw, th); R(x, OUT, bx - 1, ty - 1, bw + 2, th + 2); R(x, '#e6e9ee', bx, ty, bw, th); R(x, '#ffffff', bx, ty, bw, 2); R(x, '#a3a9b2', bx, ty + th - 2, bw, 2);
        for (let xx = bx + 4; xx < bx + bw - 1; xx += 5) R(x, '#b8bec7', xx, ty, 1, th);
        const fr = Math.round(th * 0.75); R(x, OUT, bx - 3, ty + Math.round((th - fr) / 2) - 1, 5, fr + 2); R(x, '#2a2e35', bx - 2, ty + Math.round((th - fr) / 2), 3, fr);
        const ph = Math.round(t * 6) % 2; R(x, '#9aa3ad', bx - 2, ty + Math.round(th / 2) - 1 + ph, 3, 1);
        const cw = Math.max(10, Math.round(bw * 0.35)), ch = Math.max(8, by + bh - th - b - 3); if (ch > 6) block(x, bx + bw - cw, ty - Math.min(ch, 14) - 1, cw, Math.min(ch, 14), '#5d646e', '#d8dde3', L);
        if (L >= 4) R(x, '#2ecc40', bx + bw - 3, ty + 2, 1, 1);
        break;
      }
      case 'chassisRig': {
        const r = block(x, bx, by, bw, bh, '#6b7280', '#9aa3ad', L, { noWin: true });
        const hx = bx + 3, hw = Math.max(9, bw - 6), hy = by + 2, hh = Math.max(5, r.rh - 4);
        R(x, '#15171a', hx, hy, hw, hh); for (let xx = hx; xx < hx + hw; xx += 2) R(x, xx % 4 ? OUT : NEON, xx, hy - 1, 1, 1);
        R(x, NEON, hx + 1, hy + 1, 1, hh - 2); R(x, NEON, hx + hw - 2, hy + 1, 1, hh - 2); car(x, hx + Math.round(hw / 2) - 2, hy + Math.round(hh / 2) - 1, lv.body, false);
        R(x, '#4a505b', bx + 2, by + r.rh + 1, bw - 4, r.wh - 1); for (let yy = by + r.rh + 2; yy < by + bh; yy += 2) R(x, '#5e646d', bx + 2, yy, bw - 4, 1);
        break;
      }
      case 'fanShop': {
        const r = block(x, bx, by, bw, bh, sh(lv.body, -0.35), '#e6e6e6', L, { noWin: true, noSky: true });
        for (let xx = bx; xx < bx + bw; xx += 2) R(x, (xx / 2) % 2 ? lv.body : '#f4f4f4', xx, by + r.rh, 2, 2);
        for (let xx = bx + 2; xx < bx + bw - 2; xx += 3) R(x, ['#1d5fd1', lv.stripe, '#2ecc40', RED][(xx / 3 | 0) % 4], xx, by + r.rh + 3, 2, 2);
        if (bw >= 36 && r.rh >= 14) { const mw = PF.measure('MERCH'); R(x, OUT, bx + Math.round((bw - mw) / 2) - 2, by + 3, mw + 4, 10); PF.draw(x, 'MERCH', bx + Math.round((bw - mw) / 2), by + 4, L >= 3 ? NEON : '#f4f4f4', 1); }
        else if (bw >= 16 && r.rh >= 7) { const n = String(st.num).slice(0, 2); PF.digits3(x, n, bx + Math.round(bw / 2) - n.length * 2, by + 2, lv.stripe); }
        if (L >= 3 && sideL >= 8) { R(x, OUT, a + 2, b + h - 9, 7, 6); R(x, lv.stripe, a + 3, b + h - 8, 5, 2); R(x, '#e6e6e6', a + 3, b + h - 6, 5, 3); }
        break;
      }
      case 'fanZone': {
        ground(x, a + 2, b + 2, w - 4, h - 4, '#3f8f2f', seed, 0.1);
        const sw = Math.max(16, Math.round((w - 8) * (0.4 + 0.25 * f))), sx = Math.round(a + (w - sw) / 2), sy = b + 3, sth = Math.max(6, Math.round(h * 0.26));
        R(x, OUT, sx - 1, sy - 1, sw + 2, sth + 2); R(x, '#2a2e35', sx, sy, sw, sth); R(x, NEON, sx, sy + sth - 1, sw, 1);
        if (L >= 4) { R(x, OUT, sx + 3, sy + 1, sw - 6, sth - 3); R(x, `rgba(80,220,255,${(0.6 + 0.3 * Math.sin(t * 3)).toFixed(2)})`, sx + 4, sy + 2, sw - 8, sth - 5); }
        const r = rng(seed + 5); const crowd = 10 + L * 12; const cy = sy + sth + 2, chh = Math.max(4, Math.round(h * 0.3));
        const cols = ['#d9342b', '#1d5fd1', '#f2d22e', '#f4f4f4', '#f28c18', lv.body, lv.stripe];
        for (let i = 0; i < crowd; i++) R(x, cols[Math.floor(r() * cols.length)], sx + Math.floor(r() * sw), cy + Math.floor(r() * chh), 1, 1);
        const nt = Math.min(5, L + 1); for (let i = 0; i < nt; i++) { const tx = a + 4 + i * Math.floor((w - 12) / Math.max(1, nt - 1 || 1)); const ty = b + h - 9; if (tx + 7 > a + w - 2) break; R(x, OUT, tx - 1, ty - 1, 9, 8); R(x, [RED, '#1d5fd1', NEON, '#f4f4f4', lv.body][i % 5], tx, ty, 7, 6); R(x, '#f4f4f4', tx + 3, ty, 1, 6); }
        if (L >= 3 && w > 40) { const wx = a + w - 10, wy = sy + 2, rr = 6; x.strokeStyle = '#d8dde3'; x.lineWidth = 1; x.beginPath(); x.arc(wx, wy + rr, rr, 0, Math.PI * 2); x.stroke(); const an = t * 0.6; for (let i = 0; i < 4; i++) { const q = an + i * Math.PI / 4; x.beginPath(); x.moveTo(wx - Math.cos(q) * rr, wy + rr - Math.sin(q) * rr); x.lineTo(wx + Math.cos(q) * rr, wy + rr + Math.sin(q) * rr); x.stroke(); } }
        break;
      }
      case 'hospitality': {
        ground(x, a + 2, b + 2, w - 4, h - 4, '#4aa23a', seed, 0.06);
        const n = Math.min(3, 1 + Math.floor(L / 2)); const tw = Math.max(14, Math.round((w - 8) / n) - 4), th = Math.max(10, Math.round(h * (0.45 + 0.08 * L)));
        for (let i = 0; i < n; i++) { const tx = a + 4 + i * (tw + 4), ty = b + h - th - 3; R(x, 'rgba(0,0,0,.3)', tx + 2, ty + 2, tw, th); R(x, OUT, tx - 1, ty - 1, tw + 2, th + 2); R(x, '#f4f4f4', tx, ty, tw, th); R(x, '#c9ced6', tx + Math.floor(tw / 2), ty, 1, th); R(x, '#dfe3e8', tx, ty + th - 3, tw, 3);
          for (let xx = tx + 1; xx < tx + tw - 1; xx += 4) R(x, L >= 3 ? '#ffd84a' : '#9aa3ad', xx, ty + th - 2, 2, 1); }
        if (L >= 2) { flag(x, a + 3, b + 2, lv.body, lv.stripe, t); flag(x, a + w - 9, b + 2, NEON, OUT, t + 1); }
        if (L >= 5 && w > 50) { const hx = a + Math.round(w / 2) - 5, hy = b + 2; R(x, OUT, hx - 1, hy - 1, 12, 9); R(x, '#4a505b', hx, hy, 10, 7); PF.draw(x, 'H', hx + 3, hy, NEON, 1); }
        break;
      }
    }
    // level extras around the building: lights, haulers, flags
    if (k !== 'fanZone' && k !== 'hospitality') {
      if (L >= 3 && !st.tile) { lamp(x, a + 2, b + 4); lamp(x, a + w - 3, b + 4); }
      if (yard) { const yx = a + w + 1; ground(x, yx, b + 1, yard - 2, h - 2, '#3a3d42', seed + 3, 0.05); for (let yy = b + 3; yy < b + h - 2; yy += 20) R(x, '#d8dde3', yx, yy, yard - 2, 1);
        haulerV(x, a + W0 - 9, b + h - 19, lv); if (L >= 7) haulerV(x, a + W0 - 18, b + h - 19, { body: sh(lv.body, -0.3), stripe: lv.stripe }); }
      if (L >= 5) { flag(x, bx + 1, Math.max(b + 1, by - 9), lv.body, lv.stripe, t); flag(x, bx + bw - 6, Math.max(b + 1, by - 9), NEON, OUT, t + 2); }
    }
    if (st.B[k]) crane(x, bx - 2, by - 3, bw + 4, bh + 2, t);
  }
  // the whole campus. o.keys = which plots, o.cols, o.labels, o.t (animation time)
  function campus(x, W, H, st, o) {
    o = o || {}; const keys = o.keys || PLOTS, cols = o.cols || 5, rows = Math.ceil(keys.length / cols), t = o.t || 0;
    const lab = o.labels !== false; const top = lab ? 5 : 2, edge = 3, road = Math.max(8, Math.round(H * 0.08));
    ground(x, 0, 0, W, H, '#2f6b2a', 7, 0.1);
    // checkered trim on top, red/white curb at the bottom
    for (let i = 0; i < W; i += 3) { R(x, (i / 3) % 2 ? '#1b1b1b' : '#f4f4f4', i, 0, 3, 2); R(x, (i / 3) % 2 ? '#1b1b1b' : '#f4f4f4', i, 2, 3, 1); }
    const rowH = Math.floor((H - top - edge - road * (rows - 1)) / rows); const colW = Math.floor((W - edge * 2) / cols);
    const plots = [];
    for (let i = 0; i < keys.length; i++) {
      const c = i % cols, r = Math.floor(i / cols); const a = edge + c * colW + 1, b = top + r * (rowH + road);
      plots.push({ k: keys[i], a, b, w: colW - 2, h: rowH });
    }
    // roads between rows: asphalt, neon centre dashes, cars and haulers driving
    for (let r = 1; r < rows; r++) {
      const ry = top + r * rowH + (r - 1) * road; ground(x, 0, ry, W, road, '#3a3d42', 11 + r, 0.06);
      R(x, '#5d646e', 0, ry, W, 1); R(x, '#5d646e', 0, ry + road - 1, W, 1);
      for (let xx = (Math.round(t * 8) % 8) - 8; xx < W; xx += 8) R(x, NEON, xx, ry + Math.floor(road / 2), 4, 1);
      if (road >= 8) { const p = (t * 18) % (W + 40) - 20; hauler(x, p, ry + 1, st.lv, false); car(x, W - ((t * 26 + 90) % (W + 30)), ry + road - 4, '#1d5fd1', false); car(x, W - ((t * 26 + 220) % (W + 30)), ry + road - 4, '#f2d22e', false); }
    }
    // side walks between plots
    for (const p of plots) { R(x, '#4f8a43', p.a - 1, p.b, 1, p.h); }
    const lh = lab ? 12 : 0;
    for (const p of plots) {
      const L = st.L[p.k], mx = maxOf(p.k);
      if (o.sel === p.k) { R(x, NEON, p.a - 1, p.b - 1, p.w + 2, p.h + 2); R(x, '#2f6b2a', p.a, p.b, p.w, p.h); }
      building(x, p.k, p.a, p.b, p.w, p.h - lh, L, mx, st, t);
      if (lab) {
        const name = SHORT[p.k]; const nw = PF.measure(name); const ly = p.b + p.h - lh + 1;
        R(x, 'rgba(13,14,16,.78)', p.a, ly - 1, p.w, lh);
        PF.drawOutlined(x, name, Math.round(p.a + (p.w - nw) / 2), ly, '#fff', OUT, 1);
        // level pips (or LOT)
        const pw = mx * 3 - 1, px = Math.round(p.a + (p.w - pw) / 2);
        for (let i = 0; i < mx; i++) R(x, i < L ? NEON : '#4a505b', px + i * 3, ly + 8, 2, 2);
      }
    }
    return plots;
  }
  // hub tile: a close-up of the campus (office, shop, pit crew, merch, fan zone, engine)
  function tileArt(w, h) {
    const [c, x] = Art.mk(w, h); const s = S();
    const st = s && s.team ? levels() : { L: { office: 1, shop: 1, engineDept: 1, pitCenter: 1, fanShop: 1, fanZone: 0 }, B: {}, lv: { body: '#d9342b', stripe: '#f2d22e', num: '#141414' }, num: 7 };
    st.tile = true; campus(x, w, h, st, { keys: ['office', 'shop', 'engineDept', 'pitCenter', 'fanShop', 'fanZone'], cols: 3, labels: false, t: 1 });
    return c;
  }
  const _hubTile = PW.hubTile; PW.hubTile = (kind, w, h, opt) => kind === 'hq' ? tileArt(w, h) : _hubTile(kind, w, h, opt);

  // ---------- screen ----------
  const ui = { timer: null, t: 0, plots: [], K: 2 };
  function nameOf(k) { return k === 'office' ? S().team.name + ' HQ' : isFac(k) ? DATA.FACILITIES[k].name : NEW[k].name; }
  function effect(k, l) {
    if (isFac(k)) return H.facEffect(k, l);
    if (k === 'fanZone') { const g = fanGain(l); return l ? `FAN GROWTH +${25 * l}% · +${g.flat.toLocaleString('en-US')} FANS A GOOD RACE · FAN LOSSES -${10 * l}%` : 'EMPTY LOT - NO EFFECT YET'; }
    if (k === 'hospitality') return l ? `NEW SPONSOR OFFERS PAY +${8 * l}% PER RACE` : 'EMPTY LOT - NO EFFECT YET';
    return '';
  }
  function screen() {
    const s = S();
    if (!live()) { UI.go('hub'); H.toast('TEAM HQ IS FOR YOUR CAREER TEAM'); return; }
    ensure(s); UI.ui.screen = 'hq';
    const last = s.hqLast;
    const extra = `<div class="hq-stat">${T('FANS', 2, { color: NEON, shadow: '#0d0e10' })}${T(Game.fansShort(s.fans), 2, SH)}</div>
      <button class="btn dark hq-list" data-act="go" data-arg="facilities" aria-label="Facilities list">${T('LIST VIEW', 2)}</button>`;
    H.render(H.page('TEAM HQ', `<div class="hq-wrap" id="hq-wrap"><canvas id="hq-cv" class="pix"></canvas><div id="hq-hits"></div>
      </div><div class="hq-note tiny">${last ? `LAST RACE: MERCH ${U.money(last.merch)} · FANS ${last.fansD >= 0 ? '+' : ''}${last.fansD.toLocaleString('en-US')}` : 'TAP A BUILDING TO UPGRADE IT'}${s.team.builds.length + s.team.hq.builds.length ? ' · ' + (s.team.builds.length + s.team.hq.builds.length) + ' UNDER CONSTRUCTION' : ''}</div>`, extra));
    const pb = $('.page-body'); if (pb) pb.classList.add('hq-body');
    draw(true);
    if (ui.timer) clearInterval(ui.timer);
    ui.timer = setInterval(() => { if (UI.ui.screen !== 'hq' || !$('#hq-cv')) { clearInterval(ui.timer); ui.timer = null; return; } ui.t += 0.25; draw(false); }, 250);
  }
  function draw(layout) {
    const wrap = $('#hq-wrap'), cv = $('#hq-cv'); if (!wrap || !cv) return;
    const K = ui.K; const W = Math.max(200, Math.floor(wrap.clientWidth / K)), Hh = Math.max(110, Math.floor(wrap.clientHeight / K));
    if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; cv.style.width = W * K + 'px'; cv.style.height = Hh * K + 'px'; layout = true; }
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    ui.plots = campus(x, W, Hh, levels(), { t: ui.t, sel: ui.sel });
    if (layout) {
      $('#hq-hits').innerHTML = ui.plots.map(p => `<button class="hq-hit" style="left:${p.a * K}px;top:${p.b * K}px;width:${p.w * K}px;height:${p.h * K}px" data-act="hqB" data-arg="${p.k}" aria-label="${U.esc(SHORT[p.k])}"></button>`).join('');
    }
  }
  function bldArt(k) {
    const [c, x] = Art.mk(90, 62); const st = levels();
    ground(x, 0, 0, 90, 62, '#2f6b2a', 3, 0.1); building(x, k, 2, 2, 86, 58, st.L[k], maxOf(k), st, ui.t);
    return c.toDataURL();
  }
  function panel(k) {
    const s = S(); const st = levels(); const l = st.L[k], mx = maxOf(k); ui.sel = k; draw(false);
    const pips = `<span class="pips">${[...Array(mx).keys()].map(i => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</span>`;
    let body = '', act = '';
    if (k === 'office') {
      const fu = Game.facUpkeep(), hu = upkeep();
      body = `<div class="tiny hq-desc">YOUR CAMPUS GROWS WITH YOUR FACILITIES. FANS COME FROM WINS, TOP 5S, TOP 10S AND PLAYOFF RUNS; A BAD RACE (OUT OF THE RACE OR BOTTOM THIRD) LOSES ABOUT 1%. MERCH MONEY EVERY RACE GROWS WITH FANS.</div>
        <div class="small hq-now">FANS: ${Game.fansShort(s.fans)} · MERCH STORE LV ${st.L.fanShop}</div>
        <div class="tiny">UPKEEP PER RACE: FACILITIES ${U.money(fu)}${hu ? ' · FAN ZONE + SUITES ' + U.money(hu) : ''}</div>`;
      act = `<button class="btn dark hq-btn" data-act="go" data-arg="facilities">${T('LIST VIEW', 2)}</button>`;
    } else {
      const fac = isFac(k); const c = fac ? Game.facCost(k) : newCost(k);
      const b = fac ? s.team.builds.find(x => x.fac === k) : s.team.hq.builds.find(x => x.k === k);
      const desc = fac ? DATA.FACILITIES[k].desc.toUpperCase() : NEW[k].desc;
      body = `<div class="tiny hq-desc">${U.esc(desc)}</div><div class="small hq-now">NOW: ${effect(k, l)}</div>${c ? `<div class="tiny">LV ${l + 1}: ${effect(k, l + 1)}</div>` : ''}`;
      act = b ? `<div class="small">BUILDING LV ${l + 1}: ${b.days} DAYS LEFT</div>${H.bar(b.total - b.days, b.total, '#2f8cff')}`
        : c ? `<button class="btn ${s.money >= c.money ? 'green' : 'grey'} hq-btn" data-act="hqUp" data-arg="${k}"${H.KB('enter', 'ENTER')}>${l ? 'UPGRADE TO LV ' + (l + 1) : 'BUILD'} · ${U.moneyShort(c.money)} · ${c.days} DAYS</button>` : '<div class="small" style="color:' + NEON + '">MAX LEVEL</div>';
    }
    H.modal(`<div class="hq-m"><img class="pix hq-art" src="${bldArt(k)}" alt=""><div class="hq-mi"><div class="row" style="gap:8px;flex-wrap:nowrap">${T(nameOf(k), 2, SH)}<button style="margin-left:auto" class="btn grey hq-x" data-act="hqClose"${H.KB('escape', 'ESC')}>X</button></div>
      <div class="row" style="gap:6px">${T(k === 'office' ? 'CAMPUS LV ' + l : l ? 'LV ' + l + ' / ' + mx : 'NOT BUILT', 2, { color: NEON, shadow: '#0d0e10' })}${pips}</div>${body}<div class="hq-act">${act}</div></div></div>`);
  }
  addEventListener('resize', () => { if (UI.ui.screen === 'hq' && $('#hq-cv')) setTimeout(() => { if (UI.ui.screen === 'hq' && !$('.modal-wrap')) screen(); }, 60); });
  UI.extend({ hq: screen }, {
    hqB: (k) => panel(k),
    hqClose: () => { ui.sel = null; H.closeModal(); draw(false); },
    hqUp: (k) => { const e = isFac(k) ? Game.startBuild(k) : startNew(k); if (e) return H.toast(e); H.closeModal(); ui.sel = null; UI.ui.artCache = {}; screen(); H.toast('CONSTRUCTION STARTED'); },
  });
  return { ensure, migrate, raceLines, spMul, upkeep, newCost, startNew, levels, artKey, fansFromRep, fanE, campus, NEW, PLOTS, ui };
})();
