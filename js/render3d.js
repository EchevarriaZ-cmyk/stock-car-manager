/* v1.7 3D race view. Only the track and the cars are drawn here (three.js, vendor/three.module.min.js, loaded
   lazily the first time Race View = 3D is used). The simulation, HUD, leaderboard, pit strip and every overlay stay the
   2D/HTML UI on top. Positions come from the sim (distance along the lap + lateral) and TrackGeom, so every track works. */
'use strict';
const R3D = (() => {
  let THREE = null, loading = null, glOK = null, rdr = null, rdrQ = null, lostCb = null, cur = null;
  function webgl() {
    if (glOK !== null) return glOK;
    try { const c = document.createElement('canvas'); const g = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
      glOK = !!g; if (g) { const x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } } catch (e) { glOK = false; }
    return glOK;
  }
  function load() {
    if (THREE) return Promise.resolve(THREE);
    if (!loading) loading = import(new URL('vendor/three.module.min.js', document.baseURI).href).then(m => (THREE = m)).catch(() => { loading = null; return null; });
    return loading;
  }
  const ready = () => !!THREE && webgl();
  // one WebGL renderer for the whole session (no context per race); rebuilt when quality changes or the context was lost
  function renderer(hi) {
    if (rdr && rdrQ === hi && !rdr._lost) return rdr;
    if (rdr) { try { rdr.dispose(); } catch (e) {} }
    const cv = document.createElement('canvas'); cv.className = 'r3d';
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (rdr) rdr._lost = true; if (lostCb) lostCb(); }, false);
    rdr = new THREE.WebGLRenderer({ canvas: cv, antialias: hi, powerPreference: 'high-performance' }); rdrQ = hi;
    rdr.outputColorSpace = THREE.SRGBColorSpace; rdr.shadowMap.enabled = hi; rdr.shadowMap.type = THREE.PCFShadowMap;
    return rdr;
  }
  // ---------- small helpers ----------
  const rnd = (() => { let s = 99991; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const sm = t => t * t * (3 - 2 * t);
  function tex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  // merge non-indexed geometries with position / normal / uv / color
  function merge(list) {
    const gs = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; for (const g of gs) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2), C = new Float32Array(n * 3); let o = 0;
    for (const g of gs) { const c = g.attributes.position.count; P.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) N.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) UV.set(g.attributes.uv.array, o * 2);
      if (g.attributes.color) C.set(g.attributes.color.array, o * 3); else C.fill(1, o * 3, (o + c) * 3);
      o += c; g.dispose(); }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); m.setAttribute('color', new THREE.BufferAttribute(C, 3)); m.computeBoundingSphere(); return m;
  }
  function paint(g, hex) { g = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(hex); const n = g.attributes.position.count; const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
  function box(w, h, d, x, y, z, col) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return paint(g, col); }
  function wheel(r, wd, x, z) { const g = new THREE.CylinderGeometry(r, r, wd, 12); g.rotateX(Math.PI / 2); g.translate(x, r, z); return paint(g, '#1a1a1c'); }
  // a wedge: box whose top is shifted/narrowed (cabin, nose)
  function cabin(l, w, h, x, y, topL, topW, topX, col) {
    const g = new THREE.BoxGeometry(l, h, w); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * topL / l + topX); p.setZ(i, p.getZ(i) * topW / w); }
    g.translate(x, y + h / 2, 0); g.computeVertexNormals(); return paint(g, col);
  }
  // ---------- car models (length along +x, right = +z, wheels on y = 0) ----------
  function kindFor(si) { const S = DATA.SERIES[si] || {}; return S.kart ? 'kart' : S.ow ? 'ow' : S.model === 'truck' ? 'truck' : 'stock'; }
  const DIM = { stock: [18, 7.6], truck: [18, 7.8], ow: [18, 7.6], kart: [11, 6.6] };
  function carGeo(kind, lv) {
    const B = lv.body, S = lv.stripe, K = '#151517', G = '#1d2530', parts = [];
    if (kind === 'kart') {
      parts.push(box(10, 0.5, 5.4, 0, 0.9, 0, '#3a3a3a'), box(3.2, 0.8, 5.8, 4.2, 1.2, 0, B), box(2.4, 0.9, 6.2, -4.6, 1.3, 0, B), box(3.4, 0.6, 1.0, -0.2, 1.3, -2.8, S), box(3.4, 0.6, 1.0, -0.2, 1.3, 2.8, S));
      parts.push(cabin(2.4, 2.4, 3.2, -1.4, 1.1, 2.0, 2.0, 0, S), box(1.6, 1.6, 1.6, -1.2, 5.0, 0, lv.num || '#f4f4f4'));
      for (const [x, z, r] of [[3.6, 2.7, 1.1], [3.6, -2.7, 1.1], [-3.6, 2.8, 1.3], [-3.6, -2.8, 1.3]]) parts.push(wheel(r, 1.2, x, z));
    } else if (kind === 'ow') {
      parts.push(cabin(14, 2.8, 1.8, 0.5, 0.7, 13, 2.2, 0, B), box(5, 1.4, 6.0, -1.2, 1.4, 0, B), box(4.4, 0.4, 7.4, 8.4, 0.6, 0, S), box(2.6, 0.3, 7.0, -8.0, 4.0, 0, S),
        box(0.8, 2.6, 0.4, -8.0, 2.7, 2.6, K), box(0.8, 2.6, 0.4, -8.0, 2.7, -2.6, K), cabin(3.2, 2.4, 2.2, -3.6, 2.4, 2.4, 1.2, -0.4, B), box(1.4, 1.4, 1.4, 0.6, 3.0, 0, lv.num || '#f4f4f4'), box(2.2, 0.3, 2.6, 1.4, 3.9, 0, K));
      for (const [x, z, r, w] of [[6.0, 3.3, 1.45, 1.6], [6.0, -3.3, 1.45, 1.6], [-5.8, 3.2, 1.7, 2.2], [-5.8, -3.2, 1.7, 2.2]]) parts.push(wheel(r, w, x, z));
    } else {
      const tr = kind === 'truck', H = tr ? 3.4 : 2.7;
      parts.push(box(17.6, H, 7.2, 0, 0.6 + H / 2, 0, B), cabin(3.6, 7.1, 0.9, 7.2, 0.6 + H, 1.6, 6.8, -1.0, B));
      parts.push(cabin(tr ? 5.6 : 7.6, tr ? 6.6 : 6.0, tr ? 3.0 : 2.5, tr ? 2.6 : -0.6, 0.6 + H, tr ? 5.0 : 4.6, tr ? 6.2 : 5.2, tr ? -0.3 : -0.8, G));
      parts.push(box(tr ? 4.6 : 4.2, 0.35, tr ? 6.4 : 5.4, tr ? 2.3 : -1.4, 0.6 + H + (tr ? 3.0 : 2.5) + 0.15, 0, B)); // roof
      parts.push(box(17.7, 0.7, 7.3, 0, 0.6 + H * 0.55, 0, S), box(0.5, 0.9, 7.0, -8.6, 0.6 + H + 0.45, 0, K), box(0.4, 0.8, 7.4, 8.9, 0.75, 0, K));
      for (const [x, z] of [[5.6, 3.3], [5.6, -3.3], [-5.6, 3.3], [-5.6, -3.3]]) parts.push(wheel(1.35, 1.2, x, z));
    }
    return merge(parts);
  }
  // number panels (roof + doors for stock cars, nose + sidepods for open-wheel, nose for karts) on one small texture
  function numGeo(kind) {
    const q = (w, h, x, y, z, rx, ry) => { const g = new THREE.PlaneGeometry(w, h); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
    const up = -Math.PI / 2; let L;
    if (kind === 'kart') L = [q(2.6, 1.6, 4.25, 1.62, 0, up, 0)];
    else if (kind === 'ow') L = [q(2.6, 1.4, 4.6, 1.62, 0, up, 0), q(2.8, 1.2, -1.2, 1.6, 3.02, 0, 0), q(2.8, 1.2, -1.2, 1.6, -3.02, 0, Math.PI)];
    else { const tr = kind === 'truck', H = tr ? 3.4 : 2.7, rt = 0.6 + H + (tr ? 3.0 : 2.5) + 0.33; L = [q(3.4, 3.4, tr ? 2.3 : -1.4, rt, 0, up, Math.PI / 2), q(4.6, 2.2, 0.2, 0.6 + H * 0.55 + 0.25, 3.66, 0, 0), q(4.6, 2.2, 0.2, 0.6 + H * 0.55 + 0.25, -3.66, 0, Math.PI)]; }
    return merge(L.map(g => paint(g, '#ffffff')));
  }
  function numTex(lv, n) { return tex(96, 48, (x, w, h) => { x.fillStyle = lv.body; x.fillRect(0, 0, w, h); x.fillStyle = '#f4f4f4'; x.fillRect(14, 2, w - 28, h - 4);
    x.fillStyle = lv.num && lv.num !== lv.body ? lv.num : '#141414'; if (x.fillStyle === '#f4f4f4') x.fillStyle = '#141414';
    x.font = 'bold italic 40px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), w / 2, h / 2 + 2); }); }

  // ---------- the view ----------
  class View {
    constructor(race, opts) {
      if (cur) { try { cur.dispose(); } catch (e) {} } cur = this; // one live 3D scene at a time
      opts = opts || {}; this.race = race; this.geom = race.geom; this.hi = !!opts.hi; this.mode = 'tv'; this.t = 0; this.ins = { l: 0, r: 0, t: 0, b: 0 };
      this.r = renderer(this.hi); this.cv = this.r.domElement; this.lost = false;
      this.r.setPixelRatio(this.hi ? Math.min(2, window.devicePixelRatio || 1) : 1);
      this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(42, 2, 2, 9000); this.disposables = [];
      this.kind = kindFor(this.geom.seriesIdx); this.build(); this.cars = new Map();
    }
    attach(parent, before) { parent.insertBefore(this.cv, before || null); this.resize(); }
    // ---- track elevation (ovals bank their turns; road / street / kart tracks are flat) ----
    initBank() {
      const g = this.geom, M = g.M, ds = g.L / M; this.bank = new Float32Array(M);
      if (g.type === 'road') return;
      const BANK_SCALE = 0.4; // keep banking subtle in 3D (Zion's request)
      const max = (g.def.bank || 12) * BANK_SCALE * Math.PI / 180, base = Math.min(max, 2 * Math.PI / 180), w = Math.max(6, Math.round(75 / ds)), k = new Float32Array(M); let km = 0;
      for (let i = 0; i < M; i++) { let d = g.A[(i + w) % M] - g.A[(i - w + M) % M]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; k[i] = Math.abs(d) / (2 * w * ds); km = Math.max(km, k[i]); }
      const raw = new Float32Array(M); for (let i = 0; i < M; i++) raw[i] = base + (max - base) * sm(Math.min(1, k[i] / (km * 0.6 || 1)));
      // the curvature of the spline-built ovals dips mid-turn (and wobbles sample to sample), which made the banking sag and
      // rise again inside one turn: the outside edge, wall and fence came out as steps. Curvature is now read over +-75
      // units (w above) and shallow dips left inside a turn are filled (a closing over ~160 units, running max then running min,
      // blended in only where the dip is shallow, so the real straights between turns keep their low angle)...
      const run = (src, r, fn) => { const out = new Float32Array(M); for (let i = 0; i < M; i++) { let v = src[i]; for (let j = -r; j <= r; j++) v = fn(v, src[(i + j + M) % M]); out[i] = v; } return out; };
      const sw = Math.max(3, Math.round(40 / ds)), box = (src) => { const nb = new Float32Array(M); let s = 0; for (let j = -sw; j <= sw; j++) s += src[(j + M) % M];
        for (let i = 0; i < M; i++) { nb[i] = s / (2 * sw + 1); s += src[(i + sw + 1) % M] - src[(i - sw + M) % M]; } return nb; };
      const r1 = box(raw), R = Math.max(2, Math.round(160 / ds)), c = run(run(r1, R, Math.max), R, Math.min), rg = (max - base) || 1; let b = new Float32Array(M);
      for (let i = 0; i < M; i++) { const wt = sm(U.clamp(1 - (c[i] - r1[i]) / (0.6 * rg), 0, 1)); b[i] = r1[i] + (c[i] - r1[i]) * wt; } // shallow dips only: straights stay flat
      // ...then ease in and out of the turns with more box passes (~ a gaussian), so there are no kinks either
      b = box(box(b));
      this.bank = b;
    }
    bankAt(f) { const M = this.geom.M; f = f - Math.floor(f); const x = f * M, i = Math.floor(x) % M, t = x - Math.floor(x); return this.bank[i] + (this.bank[(i + 1) % M] - this.bank[i]) * t; }
    hAt(f, lat) { const b = this.bankAt(f); if (!b) return 0; const hw = this.geom.hw; return Math.tan(b) * (U.clamp(lat, -hw, hw + 4) + hw); }
    P(f, lat, y) { const p = this.geom.pos(f, lat); return [p.x, this.hAt(f, lat) + (y || 0), p.y]; }
    // a ribbon along the track from f0 to f1 between laterals a(t) and b(t) (functions of 0..1 or numbers); flat = ignore banking
    strip(f0, f1, a, b, o) {
      o = o || {}; const g = this.geom, span = f1 - f0; const n = Math.max(2, Math.ceil(span * g.M / (o.step || 1)));
      const A = typeof a === 'function' ? a : () => a, Bf = typeof b === 'function' ? b : () => b; const pos = [], uv = []; let dist = 0, prev = null;
      const pt = (f, l, y) => { const p = g.pos(f, l); return [p.x, (o.flat ? 0 : this.hAt(f, o.hLat !== undefined ? o.hLat : l)) + (y || 0), p.y]; };
      const rows = [];
      for (let i = 0; i <= n; i++) { const t = i / n, f = f0 + span * t; const la = A(t), lb = Bf(t);
        const p = pt(f, la, o.ya), q = o.wall ? pt(f, la, (o.ya || 0) + o.wall) : pt(f, lb, o.yb !== undefined ? o.yb : o.ya);
        if (o.wall && o.hTop !== undefined) q[1] = pt(f, la, 0)[1] + o.hTop;
        if (prev) dist += Math.hypot(p[0] - prev[0], p[2] - prev[2]); prev = p; rows.push([p, q, dist]); }
      // face up (flat ribbons) whichever way the laterals run, so back-face culling never hides them
      if (!o.wall) { const [p0, q0] = rows[0], [p1] = rows[1]; const ax = q0[0] - p0[0], az = q0[2] - p0[2], bx = p1[0] - p0[0], bz = p1[2] - p0[2]; if (az * bx - ax * bz < 0) for (const r of rows) { const t = r[0]; r[0] = r[1]; r[1] = t; } }
      for (let i = 0; i < n; i++) { const [p0, q0, d0] = rows[i], [p1, q1, d1] = rows[i + 1]; const u0 = d0 / (o.u || 40), u1 = d1 / (o.u || 40);
        pos.push(...p0, ...q0, ...p1, ...q0, ...q1, ...p1); uv.push(u0, 0, u0, 1, u1, 0, u0, 1, u1, 1, u1, 0); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      // smooth normals: one per row (along-track tangent from the neighbouring rows x the across / up edge), shared by both
      // triangles either side, so a banked turn shades as one continuous surface instead of flat bands quad by quad
      const nr = rows.map((r, i) => { const a = rows[Math.max(0, i - 1)], c = rows[Math.min(n, i + 1)]; const p = r[0], q = r[1];
        const tx = (c[0][0] + c[1][0] - a[0][0] - a[1][0]), ty = (c[0][1] + c[1][1] - a[0][1] - a[1][1]), tz = (c[0][2] + c[1][2] - a[0][2] - a[1][2]);
        const ex = q[0] - p[0], ey = q[1] - p[1], ez = q[2] - p[2]; let nx = ey * tz - ez * ty, ny = ez * tx - ex * tz, nz = ex * ty - ey * tx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (!o.wall && ny < 0) { nx = -nx; ny = -ny; nz = -nz; } return [nx, ny, nz]; });
      const nrm = []; for (let i = 0; i < n; i++) { const a = nr[i], c = nr[i + 1]; nrm.push(...a, ...a, ...c, ...a, ...c, ...c); }
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      // walls: keep the side the triangles face (winding) and the normal in agreement, as computeVertexNormals had it
      if (o.wall) { const nn = geo.attributes.normal; const [p0, q0] = rows[0], [p1] = rows[1];
        const ux = q0[0] - p0[0], uy = q0[1] - p0[1], uz = q0[2] - p0[2], vx = p1[0] - p0[0], vy = p1[1] - p0[1], vz = p1[2] - p0[2];
        const fx = uy * vz - uz * vy, fz = ux * vy - uy * vx; if (fx * nr[0][0] + fz * nr[0][2] < 0) for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i)); }
      (this.bucket[o.mat] = this.bucket[o.mat] || []).push(geo);
    }
    mat(name, m) { this.mats[name] = m; this.disposables.push(m); return m; }
    build() {
      const g = this.geom, d = g.def, hw = g.hw, isRoad = g.type === 'road', street = !!d.street, kart = !!d.kart;
      const Q = v => g.side === 1 ? -v : v; this.initBank(); this.bucket = {}; this.mats = {};
      const T = (...a) => { const t = tex(...a); this.disposables.push(t); return t; };
      // textures
      const grassT = T(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#4f8a35' : '#5a963e'; x.fillRect(0, i * h / 8, w, h / 8); }
        for (let i = 0; i < 3000; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(30,60,20,.12)' : 'rgba(140,180,90,.10)'; x.fillRect(rnd() * w, rnd() * h, 2, 2); } }, true);
      const cityT = T(256, 256, (x, w, h) => { x.fillStyle = '#8d8d8a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { const v = 120 + rnd() * 40 | 0; x.fillStyle = `rgba(${v},${v},${v},.4)`; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
        x.fillStyle = '#7a7a77'; for (let i = 0; i < w; i += 64) { x.fillRect(i, 0, 2, h); x.fillRect(0, i, w, 2); } }, true);
      const asphT = T(256, 256, (x, w, h) => { x.fillStyle = '#55565a'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) { const v = 62 + rnd() * 50 | 0; x.fillStyle = `rgba(${v},${v},${v + 3},.5)`; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
        // across = v (0 = inside / left edge, 1 = outside / right edge): racing groove + edge lines
        const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(0.4, 'rgba(12,12,14,.35)'); gr.addColorStop(0.6, 'rgba(12,12,14,.25)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)');
        x.fillStyle = gr; x.fillRect(0, 0, w, h);
        // (canvas textures are flipped: the bottom rows of the canvas are v = 0, the inside edge)
        x.fillStyle = isRoad ? '#f2f2f2' : '#f2c81e'; x.fillRect(0, h - 9, w, 6); if (!isRoad) { x.fillStyle = '#f2c81e'; x.fillRect(0, h - 17, w, 3); }
        x.fillStyle = '#efefef'; x.fillRect(0, 4, w, 5); }, true);
      asphT.wrapT = THREE.ClampToEdgeWrapping;
      const apronT = T(128, 64, (x, w, h) => { x.fillStyle = '#6c6c6a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 90 + rnd() * 40 | 0; x.fillStyle = `rgba(${v},${v},${v},.5)`; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } }, true);
      const curbT = T(64, 16, (x, w, h) => { x.fillStyle = '#d12a26'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#f2f2f2'; x.fillRect(w / 2, 0, w / 2, h); }, true);
      const saferT = T(256, 32, (x, w, h) => { x.fillStyle = '#e9e9e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8b8b2'; for (let i = 0; i < w; i += 32) x.fillRect(i, 0, 2, h); x.fillStyle = '#2f6fb3'; x.fillRect(0, h - 6, w, 3); }, true);
      const fenceT = T(32, 32, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(200,205,210,.55)'; x.lineWidth = 1.5; x.beginPath(); for (let i = -w; i < w * 2; i += 8) { x.moveTo(i, 0); x.lineTo(i + h, h); x.moveTo(i + h, 0); x.lineTo(i, h); } x.stroke(); x.fillStyle = '#8a8d90'; x.fillRect(0, 0, 3, h); }, true);
      const crowdT = T(256, 128, (x, w, h) => { x.fillStyle = '#6d7076'; x.fillRect(0, 0, w, h); const C = ['#d9342b', '#1d5fd1', '#f2d22e', '#f4f4f4', '#2e8b3a', '#f28c18', '#1b1b1b', '#f07ab8'];
        for (let r = 0; r < 16; r++) { x.fillStyle = '#55585e'; x.fillRect(0, r * 8 + 6, w, 2); for (let i = 0; i < w; i += 4) if (rnd() < 0.78) { x.fillStyle = C[(rnd() * C.length) | 0]; x.fillRect(i, r * 8 + 1, 3, 4); } } }, true);
      const checkT = T(64, 16, (x, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#141414' : '#f4f4f4'; x.fillRect(i * 4, j * 4, 4, 4); } });
      const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
      const M = {
        asph: this.mat('asph', std({ map: asphT, roughness: 0.85 })), apron: this.mat('apron', std({ map: apronT, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })),
        pit: this.mat('pit', std({ map: apronT, color: 0x9a9a9a, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })),
        paint: this.mat('paint', std({ color: 0xf0f0f0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })),
        yellow: this.mat('yellow', std({ color: 0xf2c81e, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })),
        curb: this.mat('curb', std({ map: curbT, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })),
        safer: this.mat('safer', std({ map: saferT, side: THREE.DoubleSide })), conc: this.mat('conc', std({ color: 0xb9b6ad, side: THREE.DoubleSide })),
        fence: this.mat('fence', new THREE.MeshBasicMaterial({ map: fenceT, transparent: true, side: THREE.DoubleSide, depthWrite: false })),
        crowd: this.mat('crowd', std({ map: crowdT, side: THREE.DoubleSide })), check: this.mat('check', std({ map: checkT, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })),
        grassStrip: this.mat('grassStrip', std({ map: grassT, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 })),
      };
      this.wetMats = [M.asph, M.apron, M.pit];
      // ground
      let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9; for (let i = 0; i < g.M; i++) { minX = Math.min(minX, g.X[i]); maxX = Math.max(maxX, g.X[i]); minZ = Math.min(minZ, g.Y[i]); maxZ = Math.max(maxZ, g.Y[i]); }
      const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, ext = Math.max(maxX - minX, maxZ - minZ) + 1600; this.span = ext;
      const gT = (street ? cityT : grassT).clone(); gT.needsUpdate = true; gT.repeat.set(ext / 220, ext / 220); this.disposables.push(gT);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(ext, ext), std({ map: gT })); ground.rotation.x = -Math.PI / 2; ground.position.set(cx, -0.3, cz); ground.receiveShadow = true;
      this.scene.add(ground); this.disposables.push(ground.geometry, ground.material); this.groundMat = ground.material;
      // track surface (+ apron on ovals), lines baked in the asphalt texture
      this.strip(0, 1, -hw, hw, { mat: 'asph', u: 60 });
      if (!isRoad) this.strip(0, 1, -hw - 14, -hw, { mat: 'apron', u: 40, flat: true, ya: 0.02 });
      // start / finish line
      this.strip(-3 / g.L, 3 / g.L, -hw, hw, { mat: 'check', ya: 0.05, u: 1e9 });
      // pit road per zone (Q flips it to the right of travel at St. Pete / Long Beach)
      const PO = -hw - 18, PI = -hw - 62;
      for (const z of g.zones) {
        const ps = z.start, bA = ps + z.boxA, bB = ps + z.boxB, pe = ps + z.range;
        const lane = (f0, f1, lo, li) => this.strip(f0, f1, t => Q(lo(t)), t => Q(li(t)), { mat: 'pit', flat: true, ya: 0.06, u: 40 });
        lane(ps, bA, t => -hw + 1 - sm(t) * 19, t => -hw - 6 - sm(t) * 56); lane(bA - 0.001, bB + 0.001, () => PO, () => PI); lane(bB, pe, t => PO + sm(t) * 19, t => PI + sm(t) * 56);
        const line = (a, b, f0, f1, mat) => this.strip(f0, f1, Q(a), Q(b), { mat: mat || 'paint', flat: true, ya: 0.1, u: 1e9, step: 4 });
        if (g.split) { for (const [d1, d2] of [[-hw - 31, -hw - 32.5], [-hw - 47.5, -hw - 49]]) for (let f = bA; f < bB; f += 10 / g.L) line(d1, d2, f, f + 5 / g.L);
          for (let i = 0; i <= z.n; i++) { const f = bA + (bB - bA) * i / z.n; line(-hw - 19, -hw - 31, f, f + 1.3 / g.L); line(-hw - 49, -hw - 60, f, f + 1.3 / g.L); } }
        else { for (let f = bA; f < bB; f += 10 / g.L) line(-hw - 41.5, -hw - 43, f, f + 5 / g.L);
          for (let i = 0; i <= z.n; i++) { const f = bA + (bB - bA) * i / z.n; line(-hw - 43, -hw - 60, f, f + 1.3 / g.L); } }
        line(PO, PI, bA - 4 / g.L, bA - 2 / g.L); line(PO, PI, bB + 2 / g.L, bB + 4 / g.L);
        // pit wall (crew side) and the low wall between the track and pit road (gaps for the entry / exit lanes)
        const w0 = bA - z.boxA * 0.4, w1 = bB + (z.range - z.boxB) * 0.35;
        this.strip(w0, w1, Q(-hw - 60), Q(-hw - 60), { mat: 'conc', flat: true, wall: 4.5 }); this.strip(w0, w1, Q(-hw - 63), Q(-hw - 63), { mat: 'conc', flat: true, wall: 4.5 });
        this.strip(w0, w1, Q(-hw - 60), Q(-hw - 63), { mat: 'conc', flat: true, ya: 4.5 });
        const i0 = bA - z.boxA * 0.25, i1 = bB + (z.range - z.boxB) * 0.2;
        this.strip(i0, i1, Q(-hw - 15), Q(-hw - 15), { mat: 'conc', flat: true, wall: 2.5 }); this.strip(i0, i1, Q(-hw - 18), Q(-hw - 18), { mat: 'conc', flat: true, wall: 2.5 }); this.strip(i0, i1, Q(-hw - 15), Q(-hw - 18), { mat: 'conc', flat: true, ya: 2.5 });
        // crew carts behind the pit wall, team colours (merged into one mesh below)
        (this.carts = this.carts || []).push([z, bA, bB]);
      }
      // walls, fences, curbs
      const pitSpan = g.zones.map(z => [z.start - 0.004, z.start + z.range + 0.004]);
      const outsidePit = (f) => { f = f - Math.floor(f); return !pitSpan.some(([a, b]) => (f >= a && f <= b) || (f + 1 >= a && f + 1 <= b) || (f - 1 >= a && f - 1 <= b)); };
      const runs = (fn, n) => { const out = []; let s = null; for (let i = 0; i <= n; i++) { const f = i / n, ok = i < n && fn(f); if (ok && s === null) s = f; if (!ok && s !== null) { out.push([s, f]); s = null; } } return out; };
      if (!isRoad) { // ovals: SAFER wall + catch fence round the outside, banked with the track
        this.strip(0, 1, hw, hw, { mat: 'safer', wall: 4, u: 30 }); this.strip(0, 1, hw + 2.5, hw + 2.5, { mat: 'conc', wall: 4.6 }); this.strip(0, 1, hw, hw + 2.5, { mat: 'conc', ya: 4, yb: 4.6 });
        // cap + fence on the same surface height as the walls under them (own lateral), so there is no ledge between them
        this.strip(0, 1, hw + 2.5, hw + 4.5, { mat: 'fence', ya: 4.6, yb: 22, u: 8 });
        // grass infield edge between apron and pit road / infield
        this.strip(0, 1, -hw - 14, -hw - 16, { mat: 'conc', flat: true, ya: 0.04 });
      } else if (street) { // concrete blocks + catch fence both sides, open where pit road joins
        for (const sg of [1, -1]) {
          const rs = sg === -g.side ? runs(outsidePit, 600) : [[0, 1]];
          for (const [a, b] of rs) { this.strip(a, b, sg * (hw + 1), sg * (hw + 1), { mat: 'conc', flat: true, wall: 4, u: 12 }); this.strip(a, b, sg * (hw + 1), sg * (hw + 4), { mat: 'conc', flat: true, ya: 4 }); this.strip(a, b, sg * (hw + 3.5), sg * (hw + 3.5), { mat: 'fence', flat: true, ya: 4, wall: 14, u: 8 }); }
        }
        // red / white curbs on the inside of each corner
        if (typeof Street !== 'undefined' && Street.has && Street.has(g.id)) { const Lo = Street.layout(g); for (const [f, sg] of Lo.curbs) this.strip(f, f + 1.6 / g.L, sg * (hw - 5), sg * (hw - 1), { mat: 'curb', ya: 0.05, u: 6 }); }
      } else { // road + kart: curbs on the bends, grass run-off, low tyre-wall / armco far out where there is room
        const curv = (f) => { const p = g.pos(f, 0), q = g.pos(f + 8 / g.L, 0); let dA = q.a - p.a; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI; return Math.abs(dA) > 0.06; };
        for (const [a, b] of runs(f => curv(f) && outsidePit(f), 800)) for (const sg of [1, -1]) this.strip(a, b, sg * (hw - 1), sg * (hw + 4), { mat: 'curb', ya: 0.05, u: 8 });
      }
      // grandstands (outside the wall) where the 2D view has them
      for (const [f0, f1, dep, flip] of DATA.standsFor(g.id)) {
        const sg = (g.side === 1 ? -1 : 1) * (flip === -1 ? -1 : 1); const span = ((f1 - f0) % 1 + 1) % 1 || 1; const o0 = hw + 16, top = Math.max(10, dep * 0.6);
        this.strip(f0, f0 + span, sg * o0, sg * (o0 + dep), { mat: 'crowd', ya: 1, yb: top, hLat: sg * hw, u: 40, step: 2 });
        this.strip(f0, f0 + span, sg * (o0 + dep), sg * (o0 + dep), { mat: 'conc', wall: top + 3, hTop: top + 3, ya: 0, hLat: sg * hw, step: 2 });
      }
      // merge each bucket into one mesh
      for (const k in this.bucket) { const geo = merge(this.bucket[k]); geo.deleteAttribute('color'); const m = new THREE.Mesh(geo, this.mats[k]); m.receiveShadow = this.hi && k !== 'fence';
        m.castShadow = this.hi && (k === 'safer' || k === 'conc'); this.scene.add(m); this.disposables.push(geo); }
      this.bucket = null;
      // crew carts (one merged, vertex-coloured mesh)
      if (this.carts) { const parts = [], C = ['#d9342b', '#1d5fd1', '#f2d22e', '#f4f4f4', '#2e8b3a', '#f28c18', '#1b1b1b', '#f07ab8'];
        for (const [z, bA, bB] of this.carts) for (let i = 0; i < z.n; i++) { const f = bA + (bB - bA) * (i + 0.5) / z.n, p = g.pos(f, Q(-hw - 70)); const l = Math.min(z.boxLen * 0.6, 12);
          const b = box(l, 5, 5, 0, 2.5, 0, '#2f2f2f'), t = box(l, 1.2, 5.2, 0, 5.4, 0, C[i % C.length]); for (const q of [b, t]) { q.rotateY(-p.a); q.translate(p.x, 0, p.y); parts.push(q); } }
        if (parts.length) { const geo = merge(parts); const m = new THREE.Mesh(geo, this.mat('carts', std({ vertexColors: true }))); this.scene.add(m); this.disposables.push(geo); } }
      // lights + sky
      this.hemi = new THREE.HemisphereLight(0xdfeaff, 0x4a5a3a, 1.1); this.scene.add(this.hemi);
      this.sun = new THREE.DirectionalLight(0xfff2dc, 2.4); this.scene.add(this.sun); this.scene.add(this.sun.target);
      if (this.hi) { this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024); const c = this.sun.shadow.camera; c.left = -160; c.right = 160; c.top = 160; c.bottom = -160; c.near = 10; c.far = 900; this.sun.shadow.bias = -0.0006; }
      this.sky = { dry: T(4, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3d7fd0'); gr.addColorStop(0.6, '#9cc7ee'); gr.addColorStop(1, '#dbe9f3'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }),
        wet: T(4, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3c434d'); gr.addColorStop(0.6, '#6d7580'); gr.addColorStop(1, '#8e959c'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }) };
      this.scene.background = this.sky.dry; this.scene.fog = new THREE.Fog(0xcfe0ee, 1400, 5200); this.wetK = -1;
      // shared car materials + the team markers (owner's cars: yellow = car 1, cyan = car 2)
      this.carMat = this.mat('car', std({ vertexColors: true, roughness: 0.45, metalness: 0.15 }));
      const mk = new THREE.ConeGeometry(2.6, 5, 4); mk.rotateX(Math.PI); this.disposables.push(mk); this.mkGeo = mk;
      this.mkMat = [this.mat('mk1', new THREE.MeshBasicMaterial({ color: 0xffe000, fog: false })), this.mat('mk2', new THREE.MeshBasicMaterial({ color: 0x3ee8ff, fog: false }))];
      // rain streaks around the camera
      const n = 900, rp = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * 300, y = rnd() * 160, z = (rnd() - 0.5) * 300; rp.set([x, y, z, x - 1, y - 7, z], i * 6); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); this.disposables.push(rg);
      this.rain = new THREE.LineSegments(rg, this.mat('rain', new THREE.LineBasicMaterial({ color: 0xc8d6ea, transparent: true, opacity: 0.45, fog: false }))); this.rain.visible = false; this.rain.frustumCulled = false; this.scene.add(this.rain);
      // smoke puffs
      this.smoke = []; const sg = new THREE.SphereGeometry(3, 6, 4); this.disposables.push(sg); const smat = this.mat('smoke', new THREE.MeshLambertMaterial({ color: 0xd0d0d0, transparent: true, opacity: 0.55, depthWrite: false }));
      for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(sg, smat); m.visible = false; this.scene.add(m); this.smoke.push(m); }
    }
    carObj(id, lv, number, isPlayer, slot) {
      let o = this.cars.get(id); if (o) return o;
      const kind = lv.pace ? 'stock' : this.kind; const geo = carGeo(kind, lv); const mesh = new THREE.Mesh(geo, this.carMat); mesh.castShadow = this.hi;
      const grp = new THREE.Group(); grp.rotation.order = 'YXZ'; grp.add(mesh); this.disposables.push(geo);
      if (!lv.pace) { const t = numTex(lv, number), ng = numGeo(kind), nm = new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); grp.add(new THREE.Mesh(ng, nm)); this.disposables.push(t, ng, nm); }
      else { grp.add(new THREE.Mesh(box(1.2, 0.8, 5, -1.4, 0.6 + 2.7 + 2.5 + 0.7, 0, '#f2a01e').translate(0, 0, 0), this.carMat)); }
      let marker = null; if (isPlayer) { marker = new THREE.Mesh(this.mkGeo, this.mkMat[slot === 2 ? 1 : 0]); this.scene.add(marker); }
      o = { grp, marker, kind, L: DIM[kind][0] }; this.scene.add(grp); this.cars.set(id, o); return o;
    }
    setInsets(l, r, t, b) { this.ins = { l, r, t, b }; this.resize(); }
    resize() {
      const p = this.cv.parentElement; if (!p) return; const w = Math.max(80, p.clientWidth), h = Math.max(60, p.clientHeight);
      if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.r.setSize(w, h, false); }
      // frame the action in the free area between the overlays (the leaderboard on the left, the pit strip on the right)
      const I = this.ins, fx = (I.l + (w - I.r)) / 2, fy = (I.t + (h - I.b)) / 2;
      this.cam.aspect = w / h; this.cam.setViewOffset(w, h, Math.round(w / 2 - fx), Math.round((h / 2 - fy) * 0.6), w, h); this.cam.updateProjectionMatrix();
    }
    setMode(m) { this.mode = m === 'chase' ? 'chase' : 'tv'; this.cs = null; }
    cycle() { this.setMode(this.mode === 'tv' ? 'chase' : 'tv'); }
    camLabel() { return this.mode === 'chase' ? 'CHASE' : 'TV CAM'; }
    weather() {
      const R = this.race.rd; const w = R ? Math.min(1, Math.max(R.w || 0, R.raining || R.red ? 0.6 : 0)) : 0; const k = Math.round(w * 20) / 20;
      this.rain.visible = !!(R && (R.raining || R.red));
      if (k === this.wetK) return; this.wetK = k;
      this.scene.background = k > 0.15 ? this.sky.wet : this.sky.dry;
      this.scene.fog.color.set(k > 0.15 ? 0x8a929b : 0xcfe0ee); this.scene.fog.near = k > 0.15 ? 500 : 1400; this.scene.fog.far = k > 0.15 ? 2600 : 5200;
      this.sun.intensity = 2.4 * (1 - 0.7 * k); this.hemi.intensity = 1.1 * (1 - 0.35 * k);
      for (const m of this.wetMats) { m.roughness = 0.85 - 0.6 * k; m.metalness = 0.25 * k; m.color.setScalar(m === this.mats.pit ? 0.6 * (1 - 0.35 * k) : 1 - 0.4 * k); m.needsUpdate = false; }
    }
    draw(dt) {
      if (this.lost || document.hidden) return; dt = dt || 0.016; this.t += dt;
      if (!this.cv.parentElement) return; if (this.w !== this.cv.parentElement.clientWidth || this.h !== this.cv.parentElement.clientHeight) this.resize();
      const g = this.geom, race = this.race; this.weather();
      // cars
      const seen = new Set(); let target = null;
      const me = race.player(this.followId || race.playerId); const tgtCar = me && me.status !== 'dnf' ? me : race.order()[0];
      const put = (o, d, lat, ang, k, spin) => {
        const p = g.pos(d, lat), b = this.bankAt(d); o.grp.position.set(p.x, this.hAt(d, lat), p.y);
        o.grp.rotation.set(-b * (Math.abs(lat) <= g.hw + 4 ? 1 : 0), -(p.a + (ang || 0)), spin || 0); o.grp.scale.setScalar(k || 1); o.grp.visible = true; return p;
      };
      for (const c of race.cars) {
        if (c.status === 'dnf' && !(c.outT > 0)) continue; const o = this.carObj(c.id, c.e.livery, c.e.number, c.isPlayer, c.slot); seen.add(c.id);
        const ang = c.yaw + (c.spin > 0 ? c.spin * 7 : 0) + (c.status === 'dnf' ? 0.6 : 0); let pitK = 0, boxLen = 0;
        if (c.pit && c.pit.phase !== 'wait' && c.status !== 'dnf') { const z = g.zones[c.pz || 0]; const pr = g.pitProg(c.d - Math.floor(c.d), c.pz); boxLen = z.boxLen;
          pitK = pr > z.range ? 0 : Math.min(U.clamp(pr / (z.boxA * 0.9), 0, 1), U.clamp((z.range - pr) / ((z.range - z.boxB) * 0.8), 0, 1)); }
        const k = pitK > 0 ? 1 + (Math.min(1, boxLen * 0.86 / o.L) - 1) * pitK : 1;
        const p = put(o, c.d, c.lat, pitK > 0.3 ? 0 : ang, k);
        if (o.marker) { const sel = c.id === (this.followId || race.playerId); o.marker.visible = c.status !== 'dnf' && !(sel && Math.floor(this.t * 3) % 2 === 1);
          if (this.mode === 'chase' && c === tgtCar) o.marker.visible = false; // the chase cam already sits on it
          o.marker.position.set(p.x, o.grp.position.y + (o.kind === 'kart' ? 13 : 16) + Math.sin(this.t * 4) * 0.8, p.y); o.marker.rotation.y = this.t * 2; }
        if (c === tgtCar) target = { p, d: c.d, lat: c.lat, y: o.grp.position.y };
      }
      if (race.pace.active) { const o = this.carObj('_pace', { body: '#f4f4f4', stripe: '#f2c81e', num: '#141414', pace: true }, 0); put(o, race.pace.d, g.lanes[0], 0); seen.add('_pace'); }
      for (const [id, o] of this.cars) if (!seen.has(id)) { o.grp.visible = false; if (o.marker) o.marker.visible = false; }
      // smoke
      let si = 0; for (const pt of race.particles) { if (si >= this.smoke.length) break; const p = g.pos(pt.car.d, pt.car.lat), h = this.hAt(pt.car.d, pt.car.lat);
        for (let i = 0; i < 3 && si < this.smoke.length; i++, si++) { const m = this.smoke[si], a = i * 2.1 + this.t * 3, r = (1.6 - pt.t) * 6; m.visible = true; m.position.set(p.x + Math.cos(a) * r, h + 3 + i * 2 + (1.6 - pt.t) * 4, p.y + Math.sin(a) * r); m.scale.setScalar(0.8 + (1.6 - pt.t)); } }
      for (; si < this.smoke.length; si++) this.smoke[si].visible = false;
      // camera
      if (target) this.camera(target, dt);
      // nothing parked in front of the lens: hide cars right next to the camera (a car close behind in the chase cam)
      const cp = this.cam.position; for (const [id, o] of this.cars) if (o.grp.visible && (!tgtCar || id !== tgtCar.id)) { const q = o.grp.position; if (Math.hypot(q.x - cp.x, q.y - cp.y, q.z - cp.z) < o.L * 1.4) o.grp.visible = false; }
      this.r.render(this.scene, this.cam);
    }
    camera(T, dt) {
      const g = this.geom; const p = T.p; const fx = Math.cos(p.a), fz = Math.sin(p.a); const chase = this.mode === 'chase';
      // smooth heading so the camera doesn't snap through corners
      if (!this.cs || Math.hypot(this.cs.x - p.x, this.cs.z - p.y) > 400) this.cs = { x: p.x, y: T.y, z: p.y, fx, fz };
      const k = Math.min(1, dt * (chase ? 6 : 3)); const s = this.cs; s.x += (p.x - s.x) * Math.min(1, dt * 12); s.z += (p.y - s.z) * Math.min(1, dt * 12); s.y += (T.y - s.y) * Math.min(1, dt * 8);
      s.fx += (fx - s.fx) * k; s.fz += (fz - s.fz) * k; const l = Math.hypot(s.fx, s.fz) || 1, hx = s.fx / l, hz = s.fz / l;
      const rx = -hz, rz = hx; // right of travel
      if (chase) { const back = this.kind === 'kart' ? 30 : 42, up = this.kind === 'kart' ? 10 : 13;
        // lean with the banking (like an on-board camera) so a banked turn doesn't look like a wall
        const b = this.bankAt(T.d) * (Math.abs(T.lat) <= g.hw + 4 ? 0.7 : 0); this.cam.up.set(-Math.sin(b) * rx, Math.cos(b), -Math.sin(b) * rz);
        this.cam.fov = 58; this.cam.position.set(s.x - hx * back, s.y + up, s.z - hz * back); this.cam.lookAt(s.x + hx * 30, s.y + 4, s.z + hz * 30);
      } else { // TV: high broadcast angle from the grandstand side, a little behind the car
        const side = -1, dist = this.kind === 'kart' ? 120 : 170, hgt = this.kind === 'kart' ? 70 : 105;
        this.cam.up.set(0, 1, 0); this.cam.fov = 36; this.cam.position.set(s.x - hx * dist * 0.55 + rx * dist * side, s.y + hgt, s.z - hz * dist * 0.55 + rz * dist * side); this.cam.lookAt(s.x + hx * 25, s.y + 2, s.z + hz * 25); }
      this.cam.updateProjectionMatrix();
      this.sun.position.set(s.x + 180, s.y + 320, s.z + 120); this.sun.target.position.set(s.x, s.y, s.z); // the shadow box follows the action
      if (this.rain.visible) this.rain.position.set(this.cam.position.x, this.cam.position.y - 90 - ((this.t * 260) % 40), this.cam.position.z);
    }
    dispose() {
      for (const d of this.disposables) { try { d.dispose(); } catch (e) {} } this.disposables = []; this.cars.clear();
      if (cur === this) cur = null; if (this.scene) this.scene.clear(); if (this.cv.parentElement) this.cv.parentElement.removeChild(this.cv);
    }
  }
  return { load, ready, webgl, View, onLost: (cb) => { lostCb = cb; }, get loaded() { return !!THREE; } };
})();
