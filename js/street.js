/* v1.5 "Street Fight": city scenery for the street circuits, drawn in code in the game's blocky top-down pixel style.
   Everything is laid out once per track in track units (an occupancy grid keeps it off the track, the walls, pit road and
   the grandstands), then drawn at any scale. Ground (water, parks, plazas, the St. Pete runway, city streets) goes under
   the track; buildings and landmarks go on top of the ground but never on the track, so they can never hide a car. */
'use strict';
const Street = (() => {
  // extra colours the palette pass keeps for street courses (water, sand, plazas)
  const GROUND = ['#2f6fb3', '#4a8fd6', '#e8d8a0', '#d8cfc0', '#c9b28a', '#8fb6d8', '#7a7a72'];
  // roof colours per city
  const ROOFS = {
    stpete: ['#e9e2d0', '#d8c7a8', '#f4f4f4', '#c9d6d8', '#e3b9a0', '#b8c4b0', '#9fb3c0', '#d0d0c8'],
    longbeach: ['#e8dcc0', '#d9c9a3', '#f4f4f4', '#c0c8cc', '#d6b48c', '#a9b8c4', '#cfcfc6', '#e2cdb5'],
    detroit: ['#8c5a46', '#a0674f', '#6f6f6f', '#8a8a8a', '#5d6670', '#b0a48c', '#7b4a3a', '#9a9a92'],
    toronto: ['#8a96a3', '#a7b2bd', '#6f7c88', '#c8c8c0', '#9a8470', '#5f6b78', '#b8b8b0', '#7d8a96'],
    chicago: ['#5a6470', '#717c88', '#9aa3ab', '#c9c1ad', '#3f4852', '#8a7a66', '#b5aea0', '#4d5866'],
  };
  const GLASS = ['#2f4f6f', '#3a6a8f', '#25384c', '#4f7f9f'];
  // per-track scenery in the track's own map units (the same units as its shape vertices)
  // water/park/plaza: polygons. lm: landmarks. tall: a box where the skyline gets its tallest towers. ground: base look.
  const SCN = {
    stpete: {
      water: [[[300, -400], [1400, -400], [1400, 900], [740, 900], [740, 600], [805, 520], [866, 362], [688, -25], [600, -70], [300, -70]]],
      park: [[[262, 392], [395, 392], [395, 440], [312, 440], [312, 508], [262, 508]]],
      runway: { a: [575, 25], b: [752, 412], pre: 230, post: 190, w: 46 },
      lm: [['dali', 562, 292], ['airport', 445, 400, 135, 90], ['marina', 905, 420, 200, 170], ['boats', 860, -40, 300, 300]],
      tall: [0, 560, 460, 900], trees: 'palm',
    },
    longbeach: {
      water: [[[-400, 735], [270, 735], [300, 650], [470, 640], [700, 600], [900, 520], [1040, 380], [1120, 230], [1500, 230], [1500, 1100], [-400, 1100]]],
      park: [], plaza: [[[60, 470], [195, 470], [195, 610], [60, 610]]],
      lm: [['fountain', 128, 540, 42], ['convention', 455, 178, 185, 75], ['arena', 690, 165, 42], ['aquarium', 140, 735], ['marina', 560, 720, 420, 160], ['palms', 300, 590, 900, 600]],
      tall: [-300, -300, 820, 70], trees: 'palm',
    },
    detroit: {
      water: [[[-600, 618], [1300, 618], [1300, 1100], [-600, 1100]]],
      park: [[[-10, 545], [520, 545], [520, 590], [-10, 590]]],
      lm: [['rencen', 305, 420], ['huntington', -250, 25, 140, 175], ['riverwalk', -600, 590, 1900, 28]],
      tall: [-260, -300, 900, 180],
    },
    toronto: {
      water: [[[-400, 680], [400, 640], [700, 560], [900, 470], [1000, 380], [1400, 380], [1400, 1100], [-400, 1100]]],
      park: [],
      lm: [['bmo', 210, 296], ['enercare', 520, 55, 230, 80], ['gates', 905, 135], ['highway', -400, -20, 1900, 40]],
      tall: [700, -300, 1400, 120],
    },
    chicago: {
      water: [[[-900, -400], [1900, -400], [1900, 92], [-900, 92]]],
      park: [[[-900, 92], [1900, 92], [1900, 612], [-900, 612]]], ground: 'park', treeP: 0.32,
      roads: [[-900, 182, 470, 182, 16], [912, 300, 1900, 300, 16], [775, 182, 1900, 120, 16], [-900, 600, 1900, 600, 16], [545, 375, 1900, 375, 10], [70, 375, -900, 375, 10]],
      lm: [['buckingham', 270, 225], ['field', 1035, 250], ['beach', -900, 92, 2800, 14], ['parkroads', 0]],
      tall: [-500, 640, 1500, 1100],
    },
  };
  const has = id => !!SCN[id];
  // seeded RNG so the full view and the follow camera draw the same city
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

  // ---------- layout (track units, cached per geometry) ----------
  function layout(g) {
    if (g._street) return g._street;
    const cfg = SCN[g.id]; const R = rng(hash(g.id)); const hw = g.hw, L = g.L, M = g.M;
    const toG = ([x, y]) => g.raw(x, y); const polyG = P => P.map(toG);
    const C = 6, gw = Math.ceil(g.W / C) + 1, gh = Math.ceil(g.H / C) + 1; const occ = new Uint8Array(gw * gh);
    // 1 track/walls, 2 pit road + paddock, 3 stands, 4 water, 5 park/plaza, 6 landmark, 7 building
    const stamp = (cx, cy, r, v) => { const x0 = Math.max(0, Math.floor((cx - r) / C)), x1 = Math.min(gw - 1, Math.ceil((cx + r) / C)), y0 = Math.max(0, Math.floor((cy - r) / C)), y1 = Math.min(gh - 1, Math.ceil((cy + r) / C));
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const dx = xx * C + C / 2 - cx, dy = yy * C + C / 2 - cy; if (dx * dx + dy * dy <= r * r) { const k = yy * gw + xx; if (!occ[k] || occ[k] > v) occ[k] = v; } } };
    const Q = v => g.side === 1 ? -v : v;
    for (let i = 0; i < M; i += 2) stamp(g.X[i], g.Y[i], hw + 15, 1);
    // pit road, its wall, the crews and a paddock strip behind it
    for (const z of g.zones) for (let f = 0; f < z.range; f += 4 / L) { const p = g.pos(z.start + f, Q(-hw - 44)); stamp(p.x, p.y, 34, 2); }
    // grandstands (+ press box)
    for (const [f0, f1, dep, flip] of DATA.standsFor(g.id)) { const sg = (g.side === 1 ? -1 : 1) * (flip === -1 ? -1 : 1); const span = ((f1 - f0) % 1 + 1) % 1 || 1;
      for (let f = 0; f <= span; f += 4 / L) { const p = g.pos(f0 + f, sg * (hw + 16 + dep / 2)); stamp(p.x, p.y, dep / 2 + 9, 3); } }
    { const main = DATA.standsFor(g.id)[0]; const dep = main ? main[2] : 30; for (let f = -0.035; f <= 0.035; f += 4 / L) { const p = g.pos(f, Q(hw + 16 + dep + 6)); stamp(p.x, p.y, 22, 3); } }
    // tight corners: run-off + tire barriers on the outside
    const tires = []; const W = Math.max(2, Math.round(24 / (L / M)));
    const turnAt = i => { let d = g.A[(i + W) % M] - g.A[(i - W + M) % M]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    for (let i = 0; i < M; i++) { const d = turnAt(i); if (Math.abs(d) > 0.95 && !g.inPitZone(i / M)) { const out = d > 0 ? -1 : 1; tires.push([i / M, out]); const p = g.pos(i / M, out * (hw + 19)); stamp(p.x, p.y, 12, 1); } }
    // curbs: inside of every real corner
    const curbs = []; for (let i = 0; i < M; i++) { const d = turnAt(i); if (Math.abs(d) > 0.5) curbs.push([i / M, d > 0 ? 1 : -1]); }
    const water = (cfg.water || []).map(polyG), park = (cfg.park || []).map(polyG), plaza = (cfg.plaza || []).map(polyG);
    const cellsIn = (P, v) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let yy = Math.max(0, Math.floor(y0 / C)); yy <= Math.min(gh - 1, Math.ceil(y1 / C)); yy++) for (let xx = Math.max(0, Math.floor(x0 / C)); xx <= Math.min(gw - 1, Math.ceil(x1 / C)); xx++) { const k = yy * gw + xx; if (!occ[k] && inPoly(xx * C + C / 2, yy * C + C / 2, P)) occ[k] = v; } };
    for (const P of water) cellsIn(P, 4);
    for (const P of park.concat(plaza)) cellsIn(P, 5);
    if (cfg.runway) { const rw = cfg.runway; const A = toG(rw.a), B = toG(rw.b); let dx = B[0] - A[0], dy = B[1] - A[1]; const l = Math.hypot(dx, dy); dx /= l; dy /= l; const nx = -dy, ny = dx, w = rw.w * g.k;
      const a0 = [A[0] - dx * rw.pre * g.k, A[1] - dy * rw.pre * g.k], b0 = [B[0] + dx * rw.post * g.k, B[1] + dy * rw.post * g.k];
      cellsIn([[a0[0] + nx * w, a0[1] + ny * w], [b0[0] + nx * w, b0[1] + ny * w], [b0[0] - nx * w, b0[1] - ny * w], [a0[0] - nx * w, a0[1] - ny * w]], 5); }
    const free = (x, y, w, h) => { for (let yy = Math.floor(y / C); yy <= Math.floor((y + h) / C); yy++) for (let xx = Math.floor(x / C); xx <= Math.floor((x + w) / C); xx++) { if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) return false; if (occ[yy * gw + xx]) return false; } return true; };
    const claim = (x, y, w, h, v) => { for (let yy = Math.floor(y / C); yy <= Math.floor((y + h) / C); yy++) for (let xx = Math.floor(x / C); xx <= Math.floor((x + w) / C); xx++) if (xx >= 0 && yy >= 0 && xx < gw && yy < gh && !occ[yy * gw + xx]) occ[yy * gw + xx] = v; };
    const freeG = (x, y, w, h) => { for (let yy = Math.floor(y / C); yy <= Math.floor((y + h) / C); yy++) for (let xx = Math.floor(x / C); xx <= Math.floor((x + w) / C); xx++) { if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue; const v = occ[yy * gw + xx]; if (v >= 1 && v <= 3) return false; } return true; };
    // landmarks (track units), claimed before the city fills in
    const lms = [];
    for (const l of cfg.lm || []) {
      const [kind] = l; const k = g.k; const P = toG([l[1], l[2]]);
      // a landmark that would touch the track, pit road or stands shrinks around its spot (or is left out)
      const add = (o, w, h) => { o = o || {}; let k2 = 1; const fits = () => freeG(P[0] - (o.cx ? w * k2 / 2 : 0) - 4, P[1] - (o.cx ? h * k2 / 2 : 0) - 4, w * k2 + 12, h * k2 + 12);
        while (!fits() && k2 > 0.45) k2 *= 0.88; if (!fits()) return;
        w *= k2; h *= k2; if (o.r) o.r *= k2; lms.push(Object.assign({ kind, x: P[0], y: P[1], w, h }, o)); claim(P[0] - (o.cx ? w / 2 : 0), P[1] - (o.cx ? h / 2 : 0), w, h, 6); };
      if (kind === 'dali') add({ cx: 1 }, 64, 48);
      else if (kind === 'rencen') add({ cx: 1 }, 150 * Math.min(1.2, k), 150 * Math.min(1.2, k));
      else if (kind === 'fountain' || kind === 'arena') { const r = l[3] * k; add({ cx: 1, r }, r * 2, r * 2); }
      else if (kind === 'buckingham') add({ cx: 1, r: 34 * k }, 68 * k + 40, 68 * k + 40);
      else if (kind === 'bmo') add({ cx: 1 }, 150 * Math.min(1.1, k), 112 * Math.min(1.1, k));
      else if (kind === 'gates') add({ cx: 1 }, 36, 70);
      else if (kind === 'field') add({ cx: 1 }, 130, 80);
      else if (kind === 'aquarium') add({ cx: 1 }, 120, 60);
      else if (kind === 'parkroads') lms.push({ kind });
      else if (kind === 'boats' || kind === 'marina' || kind === 'palms' || kind === 'beach' || kind === 'riverwalk' || kind === 'highway') lms.push({ kind, x: P[0], y: P[1], w: l[3] * k, h: l[4] * k });
      else add({}, l[3] * k, l[4] * k);
    }
    // paddock behind pit road: team trucks and tents
    const paddock = []; for (const z of g.zones) { const n = Math.min(z.n, 16); for (let i = 0; i < n; i++) { const f = z.start + z.boxA + (z.boxB - z.boxA) * (i + 0.5) / n; const p = g.pos(f, Q(-hw - 92)); if (freeG(p.x - 9, p.y - 9, 18, 18)) { paddock.push([f, i]); stamp(p.x, p.y, 13, 2); } } }
    // city blocks: a street grid of blocks; each block is one to four buildings, kept off everything above
    const blds = []; const P0 = 118, ST = 22; const tall = cfg.tall ? [toG([cfg.tall[0], cfg.tall[1]]), toG([cfg.tall[2], cfg.tall[3]])] : null;
    const ph = [R() * P0, R() * P0]; const roofs = ROOFS[g.id] || ROOFS.detroit;
    const mkB = (x, y, w, h) => { if (w < 14 || h < 14) return;
      const isTall = tall && x + w / 2 > tall[0][0] && x + w / 2 < tall[1][0] && y + h / 2 > tall[0][1] && y + h / 2 < tall[1][1];
      const ht = isTall ? 3 + Math.floor(R() * 4) : 1 + Math.floor(R() * 3); const glass = ht >= 5 && R() < 0.6;
      blds.push({ x, y, w, h, ht, col: glass ? GLASS[Math.floor(R() * GLASS.length)] : roofs[Math.floor(R() * roofs.length)], glass, seed: Math.floor(R() * 1e9) }); claim(x, y, w, h, 7); };
    for (let by = -P0 + ph[1] % P0; by < g.H; by += P0) for (let bx = -P0 + ph[0] % P0; bx < g.W; bx += P0) {
      const x = bx + ST / 2, y = by + ST / 2, s = P0 - ST;
      if (free(x, y, s, s)) { const r = R(); if (r < 0.3) mkB(x, y, s, s); else if (r < 0.65) { const c = s * (0.4 + R() * 0.2); mkB(x, y, c - 3, s); mkB(x + c + 3, y, s - c - 3, s); } else { const h2 = s / 2; mkB(x, y, h2 - 3, h2 - 3); mkB(x + h2 + 3, y, h2 - 3, h2 - 3); mkB(x, y + h2 + 3, h2 - 3, h2 - 3); mkB(x + h2 + 3, y + h2 + 3, h2 - 3, h2 - 3); } continue; }
      const h2 = s / 2; for (const [ox, oy] of [[0, 0], [h2 + 3, 0], [0, h2 + 3], [h2 + 3, h2 + 3]]) { if (free(x + ox, y + oy, h2 - 3, h2 - 3)) mkB(x + ox, y + oy, h2 - 3, h2 - 3);
        else { const q = (h2 - 3) / 2; for (const [qx, qy] of [[0, 0], [q + 2, 0], [0, q + 2], [q + 2, q + 2]]) if (free(x + ox + qx, y + oy + qy, q - 2, q - 2)) mkB(x + ox + qx, y + oy + qy, q - 2, q - 2); } }
    }
    // trees in parks / plazas edges (only where nothing else is)
    const trees = []; const T = cfg.ground === 'park' ? park : park;
    for (const P of T) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(g.W, x1); y1 = Math.min(g.H, y1);
      for (let yy = y0 + 8; yy < y1; yy += 20) for (let xx = x0 + 8 + ((yy / 20 | 0) % 2) * 10; xx < x1; xx += 20) { if (R() < (cfg.treeP || 0.55) && inPoly(xx, yy, P) && freeG(xx - 6, yy - 6, 12, 12) && !(occ[Math.floor(yy / C) * gw + Math.floor(xx / C)] === 6 || occ[Math.floor(yy / C) * gw + Math.floor(xx / C)] === 7)) trees.push([xx + (R() - 0.5) * 6, yy + (R() - 0.5) * 6, 4 + R() * 3]); } }
    // water sparkle positions
    const waves = []; for (let i = 0; i < 700; i++) { const xx = R() * g.W, yy = R() * g.H; const k = Math.floor(yy / C) * gw + Math.floor(xx / C); if (occ[k] === 4) waves.push([xx, yy, 4 + R() * 8]); }
    return (g._street = { cfg, water, park, plaza, blds, lms, tires, curbs, trees, waves, paddock, occ, gw, C });
  }

  // ---------- ground (before the track; colours survive the palette pass) ----------
  function drawGround(x, g, s, W, H) {
    const Lo = layout(g); const cfg = Lo.cfg;
    const fillP = (P, col) => { x.fillStyle = col; x.beginPath(); P.forEach(([px, py], i) => i ? x.lineTo(px * s, py * s) : x.moveTo(px * s, py * s)); x.closePath(); x.fill(); };
    // base: concrete city, or Grant Park lawn for Chicago
    x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, W, H);
    // city streets between the blocks (lighter than the race track so the track stays the focus)
    const P0 = 118; const R = rng(hash(g.id)); const ph = [R() * P0, R() * P0];
    x.fillStyle = '#9a9a9a';
    for (let by = -P0 + ph[1] % P0; by < g.H + P0; by += P0) x.fillRect(0, Math.round((by - 9) * s), W, Math.max(1, Math.round(18 * s)));
    for (let bx = -P0 + ph[0] % P0; bx < g.W + P0; bx += P0) x.fillRect(Math.round((bx - 9) * s), 0, Math.max(1, Math.round(18 * s)), H);
    for (const P of Lo.plaza) fillP(P, '#d8cfc0');
    for (const P of Lo.park) fillP(P, '#3f8f2f');
    if (cfg.ground === 'park') { // Grant Park: paths in a lighter green grid, Congress Plaza paving
      x.fillStyle = '#4aa23a'; for (const P of Lo.park) { let y0 = 1e9, y1 = -1e9; for (const p of P) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } for (let yy = y0 + 30; yy < y1; yy += 60) x.fillRect(0, Math.round(yy * s), W, Math.max(1, Math.round(3 * s))); }
    }
    for (const [x0, y0, x1, y1, w] of cfg.roads || []) { const A = g.raw(x0, y0), B = g.raw(x1, y1); x.strokeStyle = '#8a8a8a'; x.lineWidth = Math.max(1, w * g.k * s); x.beginPath(); x.moveTo(A[0] * s, A[1] * s); x.lineTo(B[0] * s, B[1] * s); x.stroke(); }
    for (const P of Lo.water) fillP(P, '#2f6fb3');
    // shoreline: a light promenade edge along the water
    x.strokeStyle = '#d8cfc0'; x.lineWidth = Math.max(1, 5 * s); for (const P of Lo.water) { x.beginPath(); P.forEach(([px, py], i) => i ? x.lineTo(px * s, py * s) : x.moveTo(px * s, py * s)); x.closePath(); x.stroke(); }
    // St. Pete: Albert Whitted Airport runway under the front straight, running on past both ends
    if (cfg.runway) { const rw = cfg.runway; const A = g.raw(...rw.a), B = g.raw(...rw.b); let dx = B[0] - A[0], dy = B[1] - A[1]; const l = Math.hypot(dx, dy); dx /= l; dy /= l; const nx = -dy, ny = dx; const w = rw.w * g.k;
      const a0 = [A[0] - dx * rw.pre * g.k, A[1] - dy * rw.pre * g.k], b0 = [B[0] + dx * rw.post * g.k, B[1] + dy * rw.post * g.k];
      const quad = (p, q, w0, w1, col) => fillP([[p[0] + nx * w0, p[1] + ny * w0], [q[0] + nx * w0, q[1] + ny * w0], [q[0] + nx * w1, q[1] + ny * w1], [p[0] + nx * w1, p[1] + ny * w1]], col);
      quad(a0, b0, -w, w, '#5c5c5c'); quad(a0, b0, -w, -w + 2, '#f4f4f4'); quad(a0, b0, w - 2, w, '#f4f4f4');
      const len = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]); const at = t => [a0[0] + dx * t, a0[1] + dy * t];
      for (let t = 30; t < len - 30; t += 34) quad(at(t), at(t + 16), -1.5, 1.5, '#f4f4f4'); // centerline dashes
      for (const [t0, dir] of [[6, 1], [len - 6, -1]]) { for (let k = -w + 6; k < w - 6; k += 8) quad(at(t0), at(t0 + dir * 26), k, k + 4.5, '#f4f4f4'); quad(at(t0 + dir * 34), at(t0 + dir * 36), -w + 4, w - 4, '#f4f4f4'); }
      for (const [t0, dir] of [[90, 1], [len - 90, -1]]) for (const k of [-w * 0.5, w * 0.5 - 8]) quad(at(t0), at(t0 + dir * 22), k, k + 8, '#f4f4f4'); // touchdown zone bars
    }
  }

  // ---------- top layer (after the palette pass, never on the track) ----------
  function drawTop(x, g, s) {
    const Lo = layout(g); const R = rng(hash(g.id) ^ 0x5bd1e995); const px = v => Math.round(v * s); const one = Math.max(1, Math.round(s));
    const rect = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(px(X), px(Y), Math.max(1, px(X + w) - px(X)), Math.max(1, px(Y + h) - px(Y))); };
    const disc = (X, Y, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(X * s, Y * s, Math.max(0.6, r * s), 0, Math.PI * 2); x.fill(); };
    // water sparkle
    for (const [X, Y, l] of Lo.waves) rect(X, Y, l, 1.2, '#4a8fd6');
    // concrete wall seams + catch fence posts along both street edges
    const hw = g.hw;
    if (s >= 0.4) for (let f = 0; f < 1; f += 12 / g.L) for (const sg of [1, -1]) { const p = g.pos(f, sg * (hw + 9)); rect(p.x - 0.8, p.y - 0.8, 1.6, 1.6, '#2f2f2f'); }
    // tire barriers on the outside of the tight corners (black stacks with a red/white belt)
    for (const [f, out] of Lo.tires) for (const o of [hw + 13, hw + 16.5, hw + 20]) { const p = g.pos(f + (o > hw + 15 && o < hw + 17 ? 1.5 / g.L : 0), out * o); disc(p.x, p.y, 2, '#141414'); if (s >= 0.6) disc(p.x - 0.6, p.y - 0.6, 0.8, '#4a4a4a'); }
    for (const [f, out] of Lo.tires) { const p = g.pos(f, out * (hw + 11)); rect(p.x - 1, p.y - 1, 2, 2, ((f * g.L / 6) | 0) % 2 ? '#c4232b' : '#f4f4f4'); }
    // paddock: team transporters and hospitality tents behind pit road
    const Q = v => g.side === 1 ? -v : v; const TC = ['#d9342b', '#1d5fd1', '#f2d22e', '#f4f4f4', '#2e8b3a', '#f28c18', '#1b1b1b', '#f07ab8'];
    for (const [f, i] of Lo.paddock) { const p = g.pos(f, Q(-hw - 92)); x.save(); x.translate(p.x * s, p.y * s); x.rotate(p.a);
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-8 * s + one, -4 * s + one, 16 * s, 8 * s); x.fillStyle = i % 3 === 2 ? '#f4f4f4' : '#d8d8d8'; x.fillRect(-8 * s, -4 * s, 16 * s, 8 * s);
      x.fillStyle = TC[i % TC.length]; x.fillRect(-8 * s, -4 * s, 16 * s, Math.max(1, 2.4 * s)); if (i % 3 === 2) { x.fillStyle = '#c4232b'; x.fillRect(-1 * s, -4 * s, Math.max(1, 2 * s), 8 * s); } x.restore(); }
    // trees
    for (const [X, Y, r] of Lo.trees) { disc(X + r * 0.4, Y + r * 0.4, r, 'rgba(0,0,0,0.25)'); disc(X, Y, r, Lo.cfg.trees === 'palm' ? '#2e7d32' : '#2f6f25'); disc(X - r * 0.3, Y - r * 0.3, r * 0.45, '#5cb85c'); }
    // landmarks
    for (const m of Lo.lms) LM[m.kind] && LM[m.kind](x, m, s, g, { rect, disc, px, one, R });
    // buildings
    for (const b of Lo.blds) building(x, b, s, rect);
  }
  function shade(hex, k) { const [r, gg, b] = U.hexToRgb(hex); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(gg)},${f(b)})`; }
  function building(x, b, s, rect) {
    const R = rng(b.seed); const sh = Math.min(10, 1.5 + b.ht * 1.6);
    if (b.w * s < 2 || b.h * s < 2) { rect(b.x, b.y, b.w, b.h, b.col); return; }
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(Math.round((b.x + sh) * s), Math.round((b.y + sh) * s), Math.round(b.w * s), Math.round(b.h * s));
    rect(b.x, b.y, b.w, b.h, shade(b.col, 0.62)); // walls seen from above (south/east faces)
    const d = Math.min(3, 0.6 + b.ht * 0.45); rect(b.x, b.y, b.w - d, b.h - d, b.col);
    rect(b.x, b.y, b.w - d, 1.4, shade(b.col, 1.18)); rect(b.x, b.y, 1.4, b.h - d, shade(b.col, 1.18)); // parapet highlight
    if (s < 0.22) return;
    const W = b.w - d, H = b.h - d;
    if (b.glass) { for (let yy = b.y + 4; yy < b.y + H - 3; yy += 6) rect(b.x + 3, yy, W - 6, 1.2, shade(b.col, 1.35)); if (b.ht >= 6 && W > 22 && H > 22) { const cx = b.x + W / 2, cy = b.y + H / 2; rect(cx - 7, cy - 7, 14, 14, '#2f2f2f'); rect(cx - 4, cy - 0.8, 8, 1.6, '#f2c81e'); rect(cx - 4, cy - 4, 1.6, 8, '#f2c81e'); rect(cx + 2.4, cy - 4, 1.6, 8, '#f2c81e'); } return; }
    // rooftop kit: AC units, vents, a water tower on old blocks, skylights, solar panels, a garden
    const n = Math.max(1, Math.floor(W * H / 500)); for (let i = 0; i < n; i++) { const ax = b.x + 3 + R() * Math.max(1, W - 10), ay = b.y + 3 + R() * Math.max(1, H - 10); rect(ax + 1, ay + 1, 5, 4, shade(b.col, 0.5)); rect(ax, ay, 5, 4, '#d8d8d8'); rect(ax + 1.5, ay + 1.2, 2, 1.6, '#6b6b6b'); }
    const r = R(); if (r < 0.18 && W > 22 && H > 22) { const cx = b.x + W * 0.7, cy = b.y + H * 0.3; x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.arc((cx + 2) * s, (cy + 2) * s, 4 * s, 0, 7); x.fill(); x.fillStyle = '#7b4a2a'; x.beginPath(); x.arc(cx * s, cy * s, 4 * s, 0, 7); x.fill(); x.fillStyle = '#a0673f'; x.beginPath(); x.arc((cx - 1) * s, (cy - 1) * s, 1.8 * s, 0, 7); x.fill(); }
    else if (r < 0.36 && W > 26) { for (let yy = b.y + 4; yy < b.y + H - 6; yy += 5) rect(b.x + 4, yy, W * 0.5, 3, '#2f4f8f'); }
    else if (r < 0.5 && W > 24 && H > 18) rect(b.x + W * 0.15, b.y + H * 0.55, W * 0.5, H * 0.3, '#4aa23a');
    else if (r < 0.66 && H > 20) for (let xx = b.x + 4; xx < b.x + W - 5; xx += 7) rect(xx, b.y + H * 0.45, 3, 2, '#9cd3ff');
  }
  // ---------- landmarks ----------
  const LM = {
    dali(x, m, s, g, { rect, disc }) { const X = m.x - m.w / 2, Y = m.y - m.h / 2; rect(X + 4, Y + 4, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(X, Y, m.w, m.h, '#f4f4f4'); rect(X + 2, Y + 2, m.w - 4, 2, '#d8d8d8');
      // the glass "enigma" bubble bursting out of the white box
      disc(m.x - 8, m.y + 4, 15, '#9cd3ff'); disc(m.x - 8, m.y + 4, 11, '#7cb9e8'); for (let a = 0; a < 6; a++) { const t = a / 6 * Math.PI * 2; rect(m.x - 8 + Math.cos(t) * 8, m.y + 4 + Math.sin(t) * 8, 1.4, 1.4, '#f4f4f4'); } },
    airport(x, m, s, g, { rect, disc }) { // Albert Whitted: hangars, a control tower, little planes on the apron
      rect(m.x, m.y, m.w, m.h, '#8a8a8a');
      for (let i = 0; i < 3; i++) { const X = m.x + 6 + i * 36, Y = m.y + 6; rect(X + 3, Y + 3, 30, 22, 'rgba(0,0,0,0.3)'); rect(X, Y, 30, 22, '#c8ccd0'); for (let k = 0; k < 5; k++) rect(X, Y + 2 + k * 4, 30, 1.2, '#a3a9ae'); }
      disc(m.x + m.w - 16, m.y + 16, 8, '#d8d8d8'); disc(m.x + m.w - 16, m.y + 16, 5, '#2f4f6f');
      for (let i = 0; i < 4; i++) { const X = m.x + 14 + i * 34, Y = m.y + m.h - 24; rect(X - 9, Y, 18, 3, '#f4f4f4'); rect(X - 1.5, Y - 7, 3, 16, '#f4f4f4'); rect(X - 4, Y + 7, 8, 2, '#f4f4f4'); rect(X - 1.5, Y - 8, 3, 2, '#c4232b'); } },
    marina(x, m, s, g, { rect, R }) { const n = Math.max(3, Math.floor(m.w / 36));
      for (let i = 0; i < n; i++) { const X = m.x + i * (m.w / n); rect(X, m.y, 3, m.h, '#c9b28a'); for (let yy = m.y + 8; yy < m.y + m.h - 6; yy += 13) for (const sd of [-1, 1]) { if (R() < 0.25) continue; const bx = sd < 0 ? X - 13 : X + 4; rect(bx, yy, 11, 6, '#f4f4f4'); rect(bx + 3, yy + 1.5, 5, 3, R() < 0.5 ? '#9cd3ff' : '#d8d8d8'); } } },
    boats(x, m, s, g, { rect, R }) { for (let i = 0; i < 7; i++) { const X = m.x + R() * m.w, Y = m.y + R() * m.h; rect(X + 2, Y + 2, 16, 6, 'rgba(0,0,0,0.2)'); rect(X, Y, 16, 6, '#f4f4f4'); rect(X + 4, Y + 1.5, 6, 3, '#2f4f6f'); rect(X - 10, Y + 2, 10, 1.2, '#8fb6d8'); } },
    palms(x, m, s, g, { disc, R }) { const Lo = g._street; for (let i = 0; i < 70; i++) { const X = m.x + R() * m.w, Y = m.y + R() * m.h; const k = Math.floor(Y / Lo.C) * Lo.gw + Math.floor(X / Lo.C); if (Lo.occ[k] !== 0 && Lo.occ[k] !== 5) continue; disc(X + 2, Y + 2, 4, 'rgba(0,0,0,0.25)'); disc(X, Y, 4, '#2e7d32'); disc(X - 1, Y - 1, 1.6, '#66bb6a'); } },
    fountain(x, m, s, g, { disc, rect }) { const r = m.r; disc(m.x, m.y, r, '#d8cfc0'); disc(m.x, m.y, r * 0.78, '#c9b28a'); disc(m.x, m.y, r * 0.7, '#2f6fb3'); disc(m.x, m.y, r * 0.42, '#4a8fd6'); disc(m.x, m.y, r * 0.18, '#f4f4f4');
      for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; rect(m.x + Math.cos(t) * r * 0.55 - 1, m.y + Math.sin(t) * r * 0.55 - 1, 2, 2, '#f4f4f4'); } }, // the dolphins' spray
    buckingham(x, m, s, g, { disc, rect }) { const r = m.r; disc(m.x, m.y, r + 14, '#d8cfc0'); disc(m.x, m.y, r, '#e3b9a0'); disc(m.x, m.y, r - 4, '#2f6fb3'); disc(m.x, m.y, r * 0.55, '#e3b9a0'); disc(m.x, m.y, r * 0.42, '#4a8fd6'); disc(m.x, m.y, r * 0.25, '#e3b9a0'); disc(m.x, m.y, r * 0.14, '#f4f4f4');
      for (let a = 0; a < 4; a++) { const t = Math.PI / 4 + a * Math.PI / 2; disc(m.x + Math.cos(t) * r * 0.78, m.y + Math.sin(t) * r * 0.78, 3.2, '#2e8b57'); } }, // the four sea horses
    rencen(x, m, s, g, { disc, rect }) { const k = m.w / 150; // GM Renaissance Center: the tall center tower ringed by four
      rect(m.x - 62 * k, m.y - 62 * k, 124 * k, 124 * k, '#5d6670'); rect(m.x - 58 * k, m.y - 58 * k, 116 * k, 116 * k, '#6f7c88');
      const tw = (X, Y, r, h) => { disc(X + h, Y + h, r, 'rgba(0,0,0,0.32)'); disc(X, Y, r, '#25384c'); disc(X, Y, r * 0.8, '#3a6a8f'); disc(X - r * 0.3, Y - r * 0.3, r * 0.3, '#8fb6d8'); };
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tw(m.x + dx * 40 * k, m.y + dy * 40 * k, 17 * k, 9);
      tw(m.x, m.y, 26 * k, 16); disc(m.x, m.y, 9 * k, '#1b1b1b'); disc(m.x, m.y, 5 * k, '#2f6fb3');
      rect(m.x - 7 * k, m.y - 1.2, 14 * k, 2.4, '#4a8fd6'); },
    huntington(x, m, s, g, { rect }) { rect(m.x + 6, m.y + 6, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(m.x, m.y, m.w, m.h, '#c8ccd0'); rect(m.x, m.y, m.w, 4, '#e8e8e8');
      for (let yy = m.y + 14; yy < m.y + m.h - 10; yy += 18) rect(m.x + 8, yy, m.w - 16, 3, '#9cd3ff'); rect(m.x + m.w * 0.3, m.y + m.h * 0.35, m.w * 0.4, m.h * 0.12, '#2f6fb3'); },
    riverwalk(x, m, s, g, { rect }) { rect(m.x, m.y, m.w, m.h, '#d8cfc0'); for (let xx = m.x; xx < m.x + m.w; xx += 22) rect(xx, m.y + m.h - 3, 8, 2, '#7a7a72'); },
    bmo(x, m, s, g, { rect }) { const X = m.x - m.w / 2, Y = m.y - m.h / 2; rect(X + 5, Y + 5, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(X, Y, m.w, m.h, '#e8e8e8'); // BMO Field: canopy, red seats, the pitch
      rect(X + 6, Y + 6, m.w - 12, m.h - 12, '#c4232b'); rect(X + 16, Y + 16, m.w - 32, m.h - 32, '#3f8f2f');
      for (let xx = X + 16; xx < X + m.w - 16; xx += 12) rect(xx, Y + 16, 6, m.h - 32, '#4aa23a');
      rect(X + 18, Y + 18, m.w - 36, 1.4, '#f4f4f4'); rect(X + 18, Y + m.h - 19.4, m.w - 36, 1.4, '#f4f4f4'); rect(X + 18, Y + 18, 1.4, m.h - 36, '#f4f4f4'); rect(X + m.w - 19.4, Y + 18, 1.4, m.h - 36, '#f4f4f4'); rect(m.x - 0.7, Y + 18, 1.4, m.h - 36, '#f4f4f4');
      rect(X, Y + m.h * 0.35, 6, m.h * 0.3, '#1d5fd1'); rect(X + m.w - 6, Y + m.h * 0.35, 6, m.h * 0.3, '#1d5fd1'); },
    enercare(x, m, s, g, { rect }) { rect(m.x + 5, m.y + 5, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(m.x, m.y, m.w, m.h, '#b8bec4'); for (let xx = m.x + 10; xx < m.x + m.w - 10; xx += 24) rect(xx, m.y + 6, 12, m.h - 12, '#9aa3ab'); },
    gates(x, m, s, g, { rect }) { const X = m.x - m.w / 2, Y = m.y - m.h / 2; // the Princes' Gates: a white colonnade with a centre arch
      rect(X + 4, Y + 4, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(X, Y, m.w, m.h, '#e8e2d0'); for (let yy = Y + 3; yy < Y + m.h - 3; yy += 7) rect(X + 3, yy, m.w - 6, 2.5, '#c9b28a'); rect(X + m.w / 2 - 5, m.y - 10, 10, 20, '#f4f4f4'); rect(X + m.w / 2 - 2, m.y - 4, 4, 8, '#c4232b'); },
    highway(x, m, s, g, { rect }) { rect(m.x, m.y, m.w, m.h, '#6b6b6b'); rect(m.x, m.y + m.h / 2 - 1, m.w, 2, '#f2c81e'); for (let xx = m.x; xx < m.x + m.w; xx += 30) { rect(xx, m.y + m.h * 0.25, 12, 1.2, '#f4f4f4'); rect(xx + 15, m.y + m.h * 0.75, 12, 1.2, '#f4f4f4'); } },
    convention(x, m, s, g, { rect }) { rect(m.x + 6, m.y + 6, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(m.x, m.y, m.w, m.h, '#e8dcc0'); rect(m.x, m.y, m.w, 4, '#f4f4f4');
      for (let xx = m.x + 12; xx < m.x + m.w - 12; xx += 30) rect(xx, m.y + 12, 14, m.h - 24, '#9cd3ff'); },
    arena(x, m, s, g, { disc, rect }) { const r = m.r; disc(m.x + 6, m.y + 6, r, 'rgba(0,0,0,0.3)'); disc(m.x, m.y, r, '#2f6fb3'); disc(m.x, m.y, r * 0.82, '#4a8fd6'); // the whale-mural arena
      x.fillStyle = '#1d3f6f'; x.beginPath(); x.ellipse(m.x * s, m.y * s, r * 0.55 * s, r * 0.22 * s, -0.4, 0, 7); x.fill(); rect(m.x + r * 0.35, m.y - r * 0.32, r * 0.25, r * 0.12, '#1d3f6f'); disc(m.x, m.y, r * 0.12, '#f4f4f4'); },
    aquarium(x, m, s, g, { rect }) { const X = m.x - m.w / 2, Y = m.y - m.h / 2; rect(X + 4, Y + 4, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(X, Y, m.w, m.h, '#4a8fd6'); for (let i = 0; i < 4; i++) rect(X + 4, Y + 6 + i * 13, m.w - 8, 5, i % 2 ? '#2f6fb3' : '#9cd3ff'); },
    field(x, m, s, g, { rect }) { const X = m.x - m.w / 2, Y = m.y - m.h / 2; rect(X + 5, Y + 5, m.w, m.h, 'rgba(0,0,0,0.3)'); rect(X, Y, m.w, m.h, '#e8e2d0'); rect(X + 8, Y + 8, m.w - 16, m.h - 16, '#d8cfc0'); rect(X + m.w / 2 - 14, Y + m.h / 2 - 14, 28, 28, '#9aa3ab'); for (let xx = X + 4; xx < X + m.w - 4; xx += 8) rect(xx, Y + m.h - 6, 3, 4, '#f4f4f4'); },
    beach(x, m, s, g, { rect }) { rect(m.x, m.y, m.w, m.h, '#e8d8a0'); },
    parkroads() {},
  };
  return { has, layout, drawGround, drawTop, GROUND };
})();
