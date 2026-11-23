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
    // v1.3 grandstands where the real ones are (outside the wall)
    const stands = DATA.standsFor(geom.id);
    for (const [f0, f1, dep] of stands) { seg(hw + 16, hw + 16 + dep, f0, f1, PAL[10]); for (let o = hw + 20; o < hw + 16 + dep; o += 8) seg(o, o + 2, f0, f1, PAL[11]); }
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
    // v1.3 pit road: commitment line before the start/finish, spaced boxes, exit blending back in after turn 1/2
    const pe2 = ps + geom.pitRange, bA = ps + geom.boxA, bB = ps + geom.boxB, mid0 = ps + geom.boxA * 0.55, mid1 = bB + (pe2 - bB) * 0.45;
    seg(-hw - 2, -hw - 22, ps, mid0, PAL[15]); seg(-hw - 14, -hw - 58, mid0 - 0.004, mid1 + 0.004, PAL[15]); seg(-hw - 2, -hw - 22, mid1, pe2, PAL[15]);
    seg(-hw - 14, -hw - 20, mid0, mid1, PAL[12]);
    seg(-hw - 40, -hw - 41.5, bA, bB, PAL[9]);
    seg(-hw - 58, -hw - 62, mid0, mid1, PAL[12]);
    // infield garages behind pit road on ovals with room for them
    if (!isRoad && Math.min(geom.W, geom.H) - 2 * (hw + 110) > 300) { seg(-hw - 72, -hw - 98, bA, bB, PAL[12]); for (let f = bA; f < bB; f += 14 / geom.L) seg(-hw - 74, -hw - 96, f, f + 6 / geom.L, PAL[11]); }
    // road course curbs (red/white) at turn-ish areas: alternate along all edges
    if (isRoad && !street) {
      for (let i = 0; i < 400; i++) { const f0 = i / 400, f1 = (i + 0.5) / 400; if (geom.inPitZone(f0)) continue; seg(hw - 1, hw + 4, f0, f1, PAL[14]); seg(-hw - 4, -hw + 1, f0, f1, PAL[14]); }
    }
    // pit boxes: one per car, evenly spaced
    for (let i = 0; i <= geom.nBoxes; i++) { const f = bA + (bB - bA) * i / geom.nBoxes; seg(-hw - 42, -hw - 58, f, f + 1.2 / geom.L, PAL[9]); }
    // commitment line (solid yellow, you must pit once you cross it) and the pit-exit blend line
    const pre = isRoad ? 0.008 : 0.03; seg(-hw - 1, -hw + 1.5, ps - pre, mid0, PAL[8]); seg(-hw - 22, -hw, ps, ps + 2 / geom.L, PAL[8]); seg(-hw - 1, -hw + 1.5, mid1, pe2 + (isRoad ? 0.006 : 0.02), PAL[8]);
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
    // crowd
    const stepF = Math.max(1.5, 2.5 / s) / geom.L; const dot = Math.max(1, Math.round(s * 1.6));
    for (const [f0, f1, dep] of stands) { const span = ((f1 - f0) % 1 + 1) % 1 || 1;
      for (let f = 0; f < span; f += stepF) for (let o = hw + 19; o < hw + 14 + dep; o += Math.max(2.5, 2.5 / s)) {
        if (Math.random() < 0.55) { const p = geom.pos(f0 + f, o); x.fillStyle = U.pick(CROWD); x.fillRect(Math.round(p.x * s), Math.round(p.y * s), dot, dot); } } }
    // infield lake (drawn after the palette pass so it stays blue)
    const lake = DATA.LAKES[geom.id];
    if (lake) { const p = geom.pos(lake[0], -lake[1]); x.save(); x.translate(p.x * s, p.y * s); x.rotate(p.a); x.fillStyle = '#2f6fb3'; x.beginPath(); x.ellipse(0, 0, 150 * s, 42 * s, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#5aa0e0'; x.fillRect(-60 * s, -8 * s, 40 * s, Math.max(1, 2 * s)); x.fillRect(10 * s, 6 * s, 50 * s, Math.max(1, 2 * s)); x.restore(); }
    // infield name
    if (!isRoad) {
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
      this.cam = null; this.bgFollow = null; this.t = 0;
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      // v1.2.1: on a zoomed desktop stage keep the same chunky pixels as on a phone (2 logical px per art pixel)
      this.px = Math.max(2, Math.round(2 * ((typeof VIEW !== 'undefined' && VIEW.zoom) || 1)));
      const bw = Math.max(80, Math.floor(r.width / this.px)), bh = Math.max(60, Math.floor(r.height / this.px));
      if (bw === this.bw && bh === this.bh) return;
      this.bw = bw; this.bh = bh; this.cv.width = bw; this.cv.height = bh;
      this.ctx = this.cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
      const g = this.geom;
      this.sF = Math.min((bw - 4) / g.W, (bh - 4) / g.H);
      this.bgFull = renderBG(g, this.sF);
      this.oxF = Math.round((bw - this.bgFull.width) / 2); this.oyF = Math.round((bh - this.bgFull.height) / 2);
    }
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
        ox = Math.round(this.bw / 2 - this.cam.x); oy = Math.round(this.bh / 2 - this.cam.y);
        x.drawImage(this.bgFollow, ox, oy);
      } else {
        s = this.sF; ox = this.oxF; oy = this.oyF; big = false;
        x.drawImage(this.bgFull, ox, oy);
      }
      const drawCar = (lv, number, d, lat, ang) => {
        const p = g.pos(d, lat); const spr = big ? Art.carBig(lv, number, Math.cos(p.a) < -0.05) : Art.carSmall(lv);
        const cx = Math.round(p.x * s + ox), cy = Math.round(p.y * s + oy);
        if (cx < -40 || cy < -40 || cx > this.bw + 40 || cy > this.bh + 40) return null;
        x.setTransform(1, 0, 0, 1, cx, cy); x.rotate(p.a + (ang || 0));
        x.drawImage(spr, -Math.floor(spr.width / 2), -Math.floor(spr.height / 2));
        x.setTransform(1, 0, 0, 1, 0, 0);
        return { cx, cy };
      };
      // cars: draw pit-lane first, then by d so leaders on top
      const cars = race.cars.filter(c => c.status !== 'dnf' || c.outT > 0).sort((a, b) => a.d - b.d);
      const marks = [];
      for (const c of cars) {
        const ang = c.yaw + (c.spin > 0 ? c.spin * 7 : 0) + (c.status === 'dnf' ? 0.6 : 0);
        const r = drawCar(c.e.livery, c.e.number, c.d, c.lat, ang);
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
        const pl = m.r; const yy = pl.cy - (big ? 22 : 9);
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
