/* Track geometry: builds a closed centerline path for any track shape */
'use strict';
class TrackGeom {
  constructor(trackId) {
    const def = DATA.TRACKS[trackId];
    this.id = trackId; this.def = def; this.type = def.type; this.T = DATA.TYPES[def.type];
    const sh = def.shape;
    let pts = [];
    if (sh.kind === 'oval' || sh.kind === 'trioval') pts = this._oval(sh.straight, sh.r, sh.kind === 'trioval' ? sh.bump : 0);
    else pts = this._road(sh.pts);
    this._resample(pts, 3);
    // widths & lanes
    if (this.type === 'superspeedway') { this.hw = 46; this.lanes = [-24, 0, 24]; }
    else if (this.type === 'road') { this.hw = 30; this.lanes = [-10, 10]; }
    else { this.hw = 36; this.lanes = [-14, 12]; }
    this.pitLat = -(this.hw + 36);
    // pit lane range along the frontstretch (wraps across frac 0)
    const halfStraight = sh.kind === 'road' ? Math.hypot(sh.pts[1][0] - sh.pts[0][0], sh.pts[1][1] - sh.pts[0][1]) * 0.45 : sh.straight / 2 * 0.95;
    const hf = Math.min(0.12, halfStraight / this.L);
    this.pitStart = 1 - hf; this.pitEnd = hf; this.pitRange = hf * 2;
    // bbox with margins
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < this.M; i++) { minX = Math.min(minX, this.X[i]); maxX = Math.max(maxX, this.X[i]); minY = Math.min(minY, this.Y[i]); maxY = Math.max(maxY, this.Y[i]); }
    const m = this.hw + 110;
    this.ox = -minX + m; this.oy = -minY + m;
    for (let i = 0; i < this.M; i++) { this.X[i] += this.ox; this.Y[i] += this.oy; }
    this.W = Math.ceil(maxX - minX + m * 2); this.H = Math.ceil(maxY - minY + m * 2);
    this.cx = this.W / 2; this.cy = this.H / 2;
  }
  _oval(S, r, bump) {
    const pts = []; const step = 6;
    const push = (x, y) => pts.push([x, y]);
    const fy = x => r + (bump ? bump * Math.pow(Math.cos(Math.PI * x / S), 2) : 0);
    for (let x = 0; x < S / 2; x += step) push(x, fy(x));
    for (let a = 90; a > -90; a -= 2) { const t = a * Math.PI / 180; push(S / 2 + r * Math.cos(t), r * Math.sin(t)); }
    for (let x = S / 2; x > -S / 2; x -= step) push(x, -r);
    for (let a = -90; a > -270; a -= 2) { const t = a * Math.PI / 180; push(-S / 2 + r * Math.cos(t), r * Math.sin(t)); }
    for (let x = -S / 2; x < 0; x += step) push(x, fy(x));
    return pts;
  }
  _road(cp) {
    // closed Catmull-Rom; start at midpoint of first segment
    const n = cp.length, pts = [];
    const P = i => cp[((i % n) + n) % n];
    for (let i = 0; i < n; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let k = 0; k < 24; k++) {
        const t = k / 24, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        pts.push([x, y]);
      }
    }
    // rotate so index 0 is the middle of first segment, and make travel direction counterclockwise on screen
    const rot = pts.slice(12).concat(pts.slice(0, 12));
    let area = 0; for (let i = 0; i < rot.length; i++) { const a = rot[i], b = rot[(i + 1) % rot.length]; area += a[0] * b[1] - b[0] * a[1]; }
    // In y-down coords, counterclockwise on screen gives negative shoelace area
    if (area > 0) { const first = rot[0]; const rest = rot.slice(1).reverse(); return [first].concat(rest); }
    return rot;
  }
  _resample(pts, step) {
    const cum = [0];
    for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const L = cum[cum.length - 1]; const M = Math.round(L / step);
    this.L = L; this.M = M; this.X = new Float32Array(M); this.Y = new Float32Array(M); this.A = new Float32Array(M);
    let j = 0;
    for (let i = 0; i < M; i++) {
      const s = i * L / M; while (cum[j + 1] < s) j++;
      const a = pts[j], b = pts[(j + 1) % pts.length]; const t = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      this.X[i] = a[0] + (b[0] - a[0]) * t; this.Y[i] = a[1] + (b[1] - a[1]) * t;
    }
    for (let i = 0; i < M; i++) {
      const p = (i - 2 + M) % M, n = (i + 2) % M; this.A[i] = Math.atan2(this.Y[n] - this.Y[p], this.X[n] - this.X[p]);
    }
  }
  // position at frac (0..1) and lateral offset (positive = outside / right of travel)
  pos(frac, lat) {
    frac = frac - Math.floor(frac);
    const f = frac * this.M; const i = Math.floor(f) % this.M, n = (i + 1) % this.M, t = f - Math.floor(f);
    const x = this.X[i] + (this.X[n] - this.X[i]) * t, y = this.Y[i] + (this.Y[n] - this.Y[i]) * t;
    let a1 = this.A[i], a2 = this.A[n]; let da = a2 - a1; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    const a = a1 + da * t;
    // right normal in y-down coords = (-sin a, cos a) rotated: heading (cos,sin); right = (-sin, cos)
    const rx = -Math.sin(a), ry = Math.cos(a);
    return { x: x + rx * (lat || 0), y: y + ry * (lat || 0), a };
  }
  inPitZone(frac) { const p = ((frac - this.pitStart) % 1 + 1) % 1; return p <= this.pitRange; }
  pitProg(frac) { return ((frac - this.pitStart) % 1 + 1) % 1; }
}
