/* Race renderer: pixel-art track background + cars on a low-res canvas scaled up with no smoothing */
'use strict';
const Renderer = (() => {
  const PAL = ['#3f8f2f', '#4aa23a', '#5c5c5c', '#666666', '#525252', '#474747', '#e6e6e6', '#2f2f2f', '#f2c81e', '#f4f4f4', '#9a9a9a', '#7d7d7d',
    '#b8b8b8', '#1b1b1b', '#c4232b', '#6b6b6b'];
  const PALRGB = PAL.map(U.hexToRgb);
  const CROWD = ['#d9342b', '#1d5fd1', '#f2d22e', '#f4f4f4', '#2e8b3a', '#f28c18', '#1b1b1b', '#f07ab8'];
  function quantize(ctx, w, h) {
    const id = ctx.getImageData(0, 0, w, h), d = id.data; const memo = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      let best = memo.get(k);
      if (best === undefined) {
        let bd = 1e9; best = 0;
        for (let p = 0; p < PALRGB.length; p++) { const c = PALRGB[p]; const dd = (c[0] - d[i]) ** 2 + (c[1] - d[i + 1]) ** 2 + (c[2] - d[i + 2]) ** 2; if (dd < bd) { bd = dd; best = p; } }
        memo.set(k, best);
      }
      const c = PALRGB[best]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return id;
  }
  function renderBG(geom, s) {
    const W = Math.ceil(geom.W * s), H = Math.ceil(geom.H * s);
    const [c, x] = Art.mk(W, H);
    const hw = geom.hw, isRoad = geom.type === 'road';
    // v1.3: street courses sit in a concrete city block instead of grass
    const street = !!geom.def.street;
    x.fillStyle = street ? PAL[12] : PAL[0]; x.fillRect(0, 0, W, H);
    x.fillStyle = street ? PAL[10] : PAL[1];
    const band = Math.max(3, 28 * s);
    for (let i = -H; i < W + H; i += band * 2) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + band, 0); x.lineTo(i + band - H * 0.6, H); x.lineTo(i - H * 0.6, H); x.closePath(); x.fill(); }
    const K = Math.max(60, Math.round(geom.M / 2));
    const pt = (f, o) => { const p = geom.pos(f, o); return [p.x * s, p.y * s]; };
    const poly = (o, f0, f1, rev) => {
      const span = ((f1 - f0) % 1 + 1) % 1 || 1; const n = Math.max(2, Math.ceil(K * span));
      const arr = []; for (let i = 0; i <= n; i++) arr.push(pt(f0 + span * i / n, o));
      if (rev) arr.reverse(); return arr;
    };
    const ring = (a, b, col) => { x.fillStyle = col; x.beginPath(); for (const o of [a, b]) { const p = poly(o, 0, 1); x.moveTo(p[0][0], p[0][1]); for (const q of p) x.lineTo(q[0], q[1]); x.closePath(); } x.fill('evenodd'); };
    const seg = (a, b, f0, f1, col) => { x.fillStyle = col; x.beginPath(); const A = poly(a, f0, f1), B = poly(b, f0, f1, true); x.moveTo(A[0][0], A[0][1]); for (const q of A.concat(B)) x.lineTo(q[0], q[1]); x.closePath(); x.fill(); };
    const ps = geom.pitStart, pe = geom.pitEnd;
    // v1.4 grandstands where the real ones are (outside the wall): tiered seating with concourses between the tiers,
    // stair aisles, a back wall, and suites on the main stand. The crowd and the press box go on after the palette pass.
    const stands = DATA.standsFor(geom.id); const tiers = [];
    const sideOf = (f0, f1) => { const span = ((f1 - f0) % 1 + 1) % 1 || 1; return { span, main: f0 <= 0 && f1 >= 0 || span >= 0.99 }; };
    for (const [f0, f1, dep] of stands) {
      const o0 = hw + 16, nt = dep >= 60 ? 3 : dep >= 34 ? 2 : 1, td = (dep - 4) / nt; const { span, main } = sideOf(f0, f1);
      seg(o0, o0 + dep, f0, f1, PAL[10]);
      for (let t = 0; t < nt; t++) { const a = o0 + 1 + t * td, b = a + td - (t < nt - 1 ? 3 : 1); seg(a, b, f0, f1, PAL[4]); tiers.push([f0, span, a, b, main && t === nt - 1 && dep >= 60]); }
      const stair = Math.max(36, 60 * Math.min(1, 0.35 / Math.max(0.2, s))) / geom.L;
      for (let f = f0 + stair / 2; f < f0 + span - stair / 3; f += stair) seg(o0, o0 + dep - 3, f, f + 3 / geom.L, PAL[12]);
      seg(o0 + dep - 3, o0 + dep, f0, f1, PAL[7]);
    }
    if (!isRoad) { ring(hw, hw + 5, PAL[6]); ring(hw + 8, hw + 10, PAL[7]); }
    else if (street) { ring(hw, hw + 6, PAL[9]); ring(-hw - 6, -hw, PAL[9]); ring(hw + 6, hw + 7, PAL[13]); ring(-hw - 7, -hw - 6, PAL[13]); }
    else { ring(hw, hw + 4, PAL[6]); ring(-hw - 4, -hw, PAL[6]); }
    // track surface + apron
    if (!isRoad) ring(-hw - 14, -hw, PAL[5]);
    ring(-hw, hw, PAL[2]);
    ring(geom.lanes[0] - 6, geom.lanes[0] + 6, PAL[4]);
    if (geom.type === 'superspeedway') ring(geom.lanes[2] - 4, geom.lanes[2] + 4, PAL[4]);
    if (!isRoad) { ring(-hw, -hw + 2, PAL[8]); ring(-hw + 3.5, -hw + 5, PAL[8]); ring(hw - 3, hw - 1.5, PAL[9]); }
    else ring(hw - 2, hw - 1, PAL[9]), ring(-hw + 1, -hw + 2, PAL[9]);
    // v1.4 pit road: per zone (Bristol and Martinsville have two). Entry lane off the apron, an inside wall line between
    // the track and pit road, a fast lane, one marked box per car, the pit wall with the crews' war wagons behind it,
    // and the exit lane back onto the apron. Boxes stay on the straight.
    const sm = t => t * t * (3 - 2 * t);
    const lane = (f0, f1, latO, latI, col) => { const span = ((f1 - f0) % 1 + 1) % 1 || 1; const n = Math.max(3, Math.ceil(K * span * 2)); const A = [], B = [];
      for (let i = 0; i <= n; i++) { const t = i / n, f = f0 + span * t; A.push(pt(f, latO(t))); B.push(pt(f, latI(t))); }
      x.fillStyle = col; x.beginPath(); x.moveTo(A[0][0], A[0][1]); for (const q of A.concat(B.reverse())) x.lineTo(q[0], q[1]); x.closePath(); x.fill(); };
    const PO = -hw - 18, PI = -hw - 62; // pit road edges along the boxes (track side / pit wall side)
    const pitInfo = [];
    geom.zones.forEach((z) => {
      const ps = z.start, bA = ps + z.boxA, bB = ps + z.boxB, pe = ps + z.range;
      lane(ps, bA, t => -hw + 1 - sm(t) * 19, t => -hw - 6 - sm(t) * 56, PAL[15]);
      lane(bA - 0.001, bB + 0.001, () => PO, () => PI, PAL[15]);
      lane(bB, pe, t => PO + sm(t) * 19, t => PI + sm(t) * 56, PAL[15]);
      // inside wall line (track side of pit road) with gaps for the entry and exit lanes
      seg(-hw - 15, -hw - 19, bA - z.boxA * 0.25, bB + (z.range - z.boxB) * 0.2, PAL[12]); seg(-hw - 19, -hw - 20, bA - z.boxA * 0.25, bB + (z.range - z.boxB) * 0.2, PAL[7]);
      // fast lane / box lane divider (dashed) and the box lines
      for (let f = bA; f < bB; f += 10 / geom.L) seg(-hw - 41.5, -hw - 43, f, f + 5 / geom.L, PAL[9]);
      for (let i = 0; i <= z.n; i++) { const f = bA + (bB - bA) * i / z.n; seg(-hw - 43, -hw - 60, f, f + 1.3 / geom.L, PAL[9]); }
      // pit wall
      seg(-hw - 60, -hw - 64, bA - z.boxA * 0.4, bB + (z.range - z.boxB) * 0.35, PAL[9]); seg(-hw - 64, -hw - 65.5, bA - z.boxA * 0.4, bB + (z.range - z.boxB) * 0.35, PAL[7]);
      // speed-limit lines across the lane, commitment line (solid yellow) and the exit blend line
      seg(PO, PI, bA - 4 / geom.L, bA - 2 / geom.L, PAL[9]); seg(PO, PI, bB + 2 / geom.L, bB + 4 / geom.L, PAL[9]);
      const pre = isRoad ? 0.008 : 0.025; seg(-hw - 1, -hw + 1.5, ps - pre, ps + z.boxA * 0.45, PAL[8]); seg(-hw - 1, -hw + 1.5, bB + (z.range - z.boxB) * 0.5, pe + (isRoad ? 0.006 : 0.02), PAL[8]);
      pitInfo.push({ z, bA, bB });
    });
    // infield garages behind pit road on ovals with room for them
    const z0 = geom.zones[0], gA = z0.start + z0.boxA, gB = z0.start + z0.boxB;
    const bigInfield = !isRoad && Math.min(geom.W, geom.H) - 2 * (hw + 110) > 300;
    if (bigInfield) { seg(-hw - 84, -hw - 108, gA, gB, PAL[12]); for (let f = gA; f < gB; f += 14 / geom.L) seg(-hw - 86, -hw - 106, f, f + 6 / geom.L, PAL[11]); }
    // road course curbs (red/white) at turn-ish areas: alternate along all edges
    if (isRoad && !street) {
      for (let i = 0; i < 400; i++) { const f0 = i / 400, f1 = (i + 0.5) / 400; if (geom.inPitZone(f0)) continue; seg(hw - 1, hw + 4, f0, f1, PAL[14]); seg(-hw - 4, -hw + 1, f0, f1, PAL[14]); }
    }
    // start/finish checkers
    const sq = 5; const nSq = Math.ceil(hw * 2 / sq);
    for (let r = 0; r < 2; r++) for (let k = 0; k < nSq; k++) seg(-hw + k * sq, -hw + (k + 1) * sq, r * sq / geom.L, (r + 1) * sq / geom.L, (r + k) % 2 ? PAL[13] : PAL[9]);
    quantize(x, W, H);
    // asphalt noise
    const id = x.getImageData(0, 0, W, H), d = id.data; const a2 = U.hexToRgb(PAL[3]), a1 = U.hexToRgb(PAL[2]);
    const blk = s >= 0.8 ? 2 : 1;
    for (let yy = 0; yy < H; yy += blk) for (let xx = 0; xx < W; xx += blk) {
      const i = (yy * W + xx) * 4; if (d[i] === a1[0] && d[i + 1] === a1[1] && Math.random() < 0.09) {
        for (let by = 0; by < blk; by++) for (let bx = 0; bx < blk; bx++) { const j = ((yy + by) * W + xx + bx) * 4; if (j < d.length && d[j] === a1[0]) { d[j] = a2[0]; d[j + 1] = a2[1]; d[j + 2] = a2[2]; } }
      }
    }
    x.putImageData(id, 0, 0);
    // crowd on the seat rows of every tier (aisles and stairs stay clear)
    const rowStep = Math.max(2.4, 2.4 / s), stepF = Math.max(1.5, 2.5 / s) / geom.L; const dot = Math.max(1, Math.round(s * 1.6));
    for (const [f0, span, a, b] of tiers) {
      for (let f = 0; f < span; f += stepF) for (let o = a + 1; o < b - 0.5; o += rowStep) {
        if (Math.random() < 0.72) { const p = geom.pos(f0 + f, o); x.fillStyle = CROWD[(Math.random() * CROWD.length) | 0]; x.fillRect(Math.round(p.x * s), Math.round(p.y * s), dot, dot); } } }
    // band of suite windows along the back of the main stand
    for (const [f0, span, , b, suites] of tiers) if (suites) { const w = Math.max(1, Math.round(2 * s));
      for (let f = 0; f < span; f += Math.max(4, 3 / s) / geom.L) { const p = geom.pos(f0 + f, b - 2); x.fillStyle = (f * geom.L / 4 | 0) % 3 ? '#2f6fb3' : '#9cd3ff'; x.fillRect(Math.round(p.x * s), Math.round(p.y * s), w, w); } }
    const V = DATA.venue(geom.id);
    // press box / suites tower over the start/finish line (on top of the main stand; Indy's Pagoda sits in the infield)
    if (V.press) {
      const main = stands.find(([f0, f1]) => sideOf(f0, f1).main); const dep = main ? main[2] : 30; const inside = V.press === 'inside';
      const half = Math.min(isRoad ? 70 : 120, geom.L * 0.03) / geom.L; const a = inside ? -hw - 70 : hw + 16 + dep - 8, b = inside ? -hw - 100 : hw + 16 + dep + (isRoad ? 14 : 20);
      const box = (o1, o2, f0, f1, col) => { const P = [pt(f0, o1), pt(f1, o1), pt(f1, o2), pt(f0, o2)]; x.fillStyle = col; x.beginPath(); x.moveTo(P[0][0], P[0][1]); for (const q of P) x.lineTo(q[0], q[1]); x.closePath(); x.fill(); };
      box(a, b + (inside ? -3 : 3), -half + 3 / geom.L, half + 3 / geom.L, '#1b1b1b'); // shadow
      box(a, b, -half, half, '#d8d8d8'); box(a, a + (inside ? -5 : 5), -half, half, '#2f6fb3');
      for (let f = -half; f < half; f += Math.max(5, 3 / s) / geom.L) box(a + (inside ? -1 : 1), a + (inside ? -3 : 3), f, f + 2 / geom.L, '#9cd3ff');
      const th = half * 0.35; box(a + (inside ? -8 : 8), b - (inside ? -4 : 4), -th, th, '#f4f4f4'); box(a + (inside ? -8 : 8), a + (inside ? -12 : 12), -th, th, '#2f6fb3');
      if (inside) { const p = pt(0, b - 4); x.fillStyle = '#c4232b'; x.fillRect(Math.round(p[0]), Math.round(p[1] - Math.max(3, 8 * s)), Math.max(1, Math.round(2 * s)), Math.max(3, Math.round(8 * s))); }
    }
    // war wagons (crew carts) behind the pit wall, one per box, in team colors
    if (s >= 0.45) for (const { z, bA, bB } of pitInfo) for (let i = 0; i < z.n; i++) {
      const f = bA + (bB - bA) * (i + 0.5) / z.n, w = Math.min(z.boxLen * 0.6, 14) / geom.L / 2; const p = pt(f, -hw - 67), q = pt(f, -hw - 73);
      x.save(); x.translate((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); x.rotate(geom.pos(f, 0).a); const L2 = w * geom.L * s;
      x.fillStyle = '#2f2f2f'; x.fillRect(-L2, -3 * s, L2 * 2, 6 * s); x.fillStyle = CROWD[i % CROWD.length]; x.fillRect(-L2, -3 * s, L2 * 2, 2 * s);
      x.fillStyle = '#f4f4f4'; x.fillRect(-L2 * 0.6, 4.5 * s, Math.max(1, s * 1.5), Math.max(1, s * 1.5)); x.fillRect(L2 * 0.4, 4.5 * s, Math.max(1, s * 1.5), Math.max(1, s * 1.5)); x.restore(); }
    // scoring pylon (a tall tower of position numbers) in the infield near the start/finish, or Bristol's center-hung board
    const pyl = (px, py) => { const w = Math.max(3, Math.round(9 * s)), h = Math.max(9, Math.round(44 * s)); const X0 = Math.round(px - w / 2), Y0 = Math.round(py - h);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(X0 + Math.max(1, Math.round(3 * s)), Math.round(py - Math.max(1, 2 * s)), Math.max(2, Math.round(h * 0.5)), Math.max(1, Math.round(4 * s)));
      x.fillStyle = '#1b1b1b'; x.fillRect(X0 - 1, Y0 - 1, w + 2, h + 2); x.fillStyle = '#2f2f2f'; x.fillRect(X0, Y0, w, h);
      x.fillStyle = '#c4232b'; x.fillRect(X0, Y0, w, Math.max(1, Math.round(5 * s)));
      const rows = Math.max(2, Math.floor((h - 6 * s) / Math.max(2, 4 * s))); for (let r = 0; r < rows; r++) { x.fillStyle = r % 2 ? '#ffd000' : '#f4f4f4'; x.fillRect(X0 + Math.max(1, Math.round(2 * s)), Math.round(Y0 + 6 * s + r * Math.max(2, 4 * s)), Math.max(1, w - Math.max(2, Math.round(4 * s))), Math.max(1, Math.round(2 * s))); } };
    if (V.pylon) { const p = pt(V.pylon[0], V.pylon[1] === undefined ? -hw - (bigInfield ? 120 : 82) : V.pylon[1]); pyl(p[0], p[1]); }
    if (V.board) { const cx = geom.cx * s, cy = geom.cy * s, r = Math.max(4, Math.round(34 * s)), t = Math.max(1, Math.round(6 * s));
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(Math.round(cx - r + 3 * s), Math.round(cy - r + 5 * s), r * 2, r * 2);
      x.fillStyle = '#1b1b1b'; x.fillRect(Math.round(cx - r), Math.round(cy - r), r * 2, r * 2); x.fillStyle = '#2f6fb3'; x.fillRect(Math.round(cx - r + t), Math.round(cy - r + t), r * 2 - t * 2, r * 2 - t * 2);
      x.fillStyle = '#9cd3ff'; x.fillRect(Math.round(cx - r + t), Math.round(cy - r + t), r * 2 - t * 2, Math.max(1, Math.round(4 * s))); x.fillStyle = '#ffd000'; x.fillRect(Math.round(cx - r * 0.5), Math.round(cy), r, Math.max(1, Math.round(3 * s))); }
    // infield lake (drawn after the palette pass so it stays blue)
    const lake = DATA.LAKES[geom.id];
    if (lake) { const p = geom.pos(lake[0], -lake[1]); x.save(); x.translate(p.x * s, p.y * s); x.rotate(p.a); x.fillStyle = '#2f6fb3'; x.beginPath(); x.ellipse(0, 0, 150 * s, 42 * s, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#5aa0e0'; x.fillRect(-60 * s, -8 * s, 40 * s, Math.max(1, 2 * s)); x.fillRect(10 * s, 6 * s, 50 * s, Math.max(1, 2 * s)); x.restore(); }
    // infield name
    if (!isRoad && !DATA.venue(geom.id).board) {
      const name = geom.def.short; const tw = PF.measure(name);
      const maxW = (geom.W - 2 * (hw + 110) - 260) * s; let sc = Math.max(1, Math.floor(maxW / (tw + 2)));
      sc = Math.min(sc, Math.max(1, Math.floor(s * 5)));
      const tc = PF.canvas(name, { color: '#f4f4f4', outline: '#2a5e20' });
      x.drawImage(tc, Math.round(geom.cx * s - tc.width * sc / 2), Math.round(geom.cy * s - tc.height * sc / 2), tc.width * sc, tc.height * sc);
    }
    return c;
  }

  class RaceView {
    constructor(canvas, race) {
      this.cv = canvas; this.race = race; this.geom = race.geom; this.mode = 'full'; this.px = 2;
      this.cam = null; this.bgFollow = null; this.t = 0; this.ins = { l: 0, r: 0, t: 0, b: 0 };
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      // v1.2.1: on a zoomed desktop stage keep the same chunky pixels as on a phone (2 logical px per art pixel)
      this.px = Math.max(2, Math.round(2 * ((typeof VIEW !== 'undefined' && VIEW.zoom) || 1)));
      const bw = Math.max(80, Math.floor(r.width / this.px)), bh = Math.max(60, Math.floor(r.height / this.px));
      // v1.4: the canvas fills the race screen; the track fits the free area between the broadcast overlays (insets, CSS px)
      const I = this.ins, px = this.px; const il = Math.round(I.l / px), ir = Math.round(I.r / px), it = Math.round(I.t / px), ib = Math.round(I.b / px);
      const key = bw + 'x' + bh + ':' + il + ',' + ir + ',' + it + ',' + ib;
      if (key === this.key) return;
      this.key = key;
      if (bw !== this.bw || bh !== this.bh) { this.bw = bw; this.bh = bh; this.cv.width = bw; this.cv.height = bh; this.ctx = this.cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false; }
      const g = this.geom; const aw = Math.max(60, bw - il - ir), ah = Math.max(40, bh - it - ib);
      this.area = { x: il, y: it, w: aw, h: ah };
      this.sF = Math.min((aw - 4) / g.W, (ah - 4) / g.H);
      this.bgFull = renderBG(g, this.sF);
      this.oxF = il + Math.round((aw - this.bgFull.width) / 2); this.oyF = it + Math.round((ah - this.bgFull.height) / 2);
    }
    setInsets(l, r, t, b) { this.ins = { l, r, t, b }; this.resize(); }
    setMode(m) { this.mode = m; if (m === 'follow' && !this.bgFollow) this.bgFollow = renderBG(this.geom, 1); }
    draw(dtReal) {
      const x = this.ctx, g = this.geom, race = this.race; this.t += dtReal || 0;
      x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
      x.fillStyle = g.def.street ? '#b8b8b8' : '#3f8f2f'; x.fillRect(0, 0, this.bw, this.bh);
      let s, ox, oy, big;
      if (this.mode === 'follow' && this.bgFollow) {
        s = 1; big = true;
        const me = race.player(this.followId); const tgt = me && me.status !== 'dnf' ? me : race.order()[0];
        const p = g.pos(tgt.d, tgt.lat);
        if (!this.cam) this.cam = { x: p.x, y: p.y };
        const k = Math.min(1, (dtReal || 0.016) * 25); this.cam.x += (p.x - this.cam.x) * k; this.cam.y += (p.y - this.cam.y) * k;
        if (Math.hypot(p.x - this.cam.x, p.y - this.cam.y) > 300) { this.cam.x = p.x; this.cam.y = p.y; }
        const A = this.area || { x: 0, y: 0, w: this.bw, h: this.bh };
        ox = Math.round(A.x + A.w / 2 - this.cam.x); oy = Math.round(A.y + A.h / 2 - this.cam.y);
        x.drawImage(this.bgFollow, ox, oy);
      } else {
        s = this.sF; ox = this.oxF; oy = this.oyF; big = false;
        x.drawImage(this.bgFull, ox, oy);
      }
      // v1.4: on pit road a car shrinks to pit-road scale (k = 0..1 down the entry lane) so it fits its box
      const drawCar = (lv, number, d, lat, ang, pitK, boxLen) => {
        const p = g.pos(d, lat); let spr = big ? Art.carBig(lv, number, Math.cos(p.a) < -0.05) : Art.carSmall(lv);
        const cx = Math.round(p.x * s + ox), cy = Math.round(p.y * s + oy);
        if (cx < -40 || cy < -40 || cx > this.bw + 40 || cy > this.bh + 40) return null;
        let w = spr.width, h = spr.height;
        if (pitK > 0) {
          const target = U.clamp(boxLen * s * 0.82, 4, spr.width); const len = spr.width + (target - spr.width) * pitK;
          if (big && len < 24) spr = Art.carSmall(lv);
          const k = len / spr.width; w = Math.max(3, Math.round(spr.width * k)); h = Math.max(2, Math.round(spr.height * k));
        }
        x.setTransform(1, 0, 0, 1, cx, cy); x.rotate(p.a + (ang || 0));
        x.drawImage(spr, -Math.floor(w / 2), -Math.floor(h / 2), w, h);
        x.setTransform(1, 0, 0, 1, 0, 0);
        return { cx, cy, small: pitK > 0.5 };
      };
      // cars: draw pit-lane first, then by d so leaders on top
      const cars = race.cars.filter(c => c.status !== 'dnf' || c.outT > 0).sort((a, b) => a.d - b.d);
      const marks = [];
      for (const c of cars) {
        const ang = c.yaw + (c.spin > 0 ? c.spin * 7 : 0) + (c.status === 'dnf' ? 0.6 : 0);
        let pitK = 0, boxLen = 0;
        if (c.pit && c.pit.phase !== 'wait' && c.status !== 'dnf') { const z = g.zones[c.pz || 0]; const pr = g.pitProg(c.d - Math.floor(c.d), c.pz); boxLen = z.boxLen;
          pitK = pr > z.range ? 0 : Math.min(U.clamp(pr / (z.boxA * 0.9), 0, 1), U.clamp((z.range - pr) / ((z.range - z.boxB) * 0.8), 0, 1)); }
        const r = drawCar(c.e.livery, c.e.number, c.d, c.lat, pitK > 0.3 ? 0 : ang, pitK, boxLen);
        if (c.isPlayer && r && c.status !== 'dnf') marks.push({ r, sel: c.id === (this.followId || race.playerId), slot: c.slot });
      }
      if (race.pace.active) drawCar({ body: '#f4f4f4', stripe: '#f2c81e', num: '#141414', pace: true }, 0, race.pace.d, g.lanes[0], 0);
      // smoke
      for (const pt of race.particles) {
        const p = g.pos(pt.car.d, pt.car.lat); const n = 6;
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.28 + this.t * 3; const r = (1.6 - pt.t) * 14 * (big ? 1 : s * 2);
          x.fillStyle = i % 2 ? '#d8d8d8' : '#a8a8a8'; const sz = big ? 4 : 2;
          x.fillRect(Math.round(p.x * s + ox + Math.cos(a) * r), Math.round(p.y * s + oy + Math.sin(a) * r), sz, sz);
        }
      }
      // team car markers: yellow arrow = car 1, cyan = car 2; the selected car blinks
      for (const m of marks) {
        if (m.sel && Math.floor(this.t * 3) % 2 === 1) continue;
        const pl = m.r; const yy = pl.cy - (big && !pl.small ? 22 : 9);
        x.fillStyle = '#141414'; x.fillRect(pl.cx - 4, yy - 1, 9, 2); x.fillRect(pl.cx - 3, yy + 1, 7, 2); x.fillRect(pl.cx - 2, yy + 3, 5, 1);
        x.fillStyle = m.slot === 2 ? '#3ee8ff' : '#ffe000'; x.fillRect(pl.cx - 3, yy, 7, 1); x.fillRect(pl.cx - 2, yy + 1, 5, 1); x.fillRect(pl.cx - 1, yy + 2, 3, 1); x.fillRect(pl.cx, yy + 3, 1, 1);
      }
    }
  }
  // static mini preview of a track for UI cards
  function preview(trackId, w, h) {
    const g = new TrackGeom(trackId); const s = Math.min(w / g.W, h / g.H);
    return renderBG(g, s);
  }
  return { RaceView, renderBG, preview };
})();
