/* Track geometry: builds a closed centerline path for any track shape */
'use strict';
class TrackGeom {
  constructor(trackId, seriesIdx) {
    const def = DATA.TRACKS[trackId];
    this.id = trackId; this.def = def; this.type = def.type; this.T = DATA.raceT(trackId, seriesIdx); this.seriesIdx = seriesIdx;
    const sh = def.shape;
    let pts = [];
    if (sh.kind === 'oval' || sh.kind === 'trioval') pts = this._oval(sh.straight, sh.r, sh.kind === 'trioval' ? sh.bump : 0);
    else if (sh.kind === 'rp') pts = this._rpoly(sh.xs ? sh.v.map(([x, y, r]) => [x * sh.xs, y, r]) : sh.v, sh.sf); // v1.4: xs lengthens the straights
    else pts = this._road(sh.pts);
    // v1.2: scale every layout to its real lap length (compressed so short tracks still fit the screen)
    if (def.miles) { const target = this.T.perim; let per = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; per += Math.hypot(b[0] - a[0], b[1] - a[1]); } const k = target / per; pts = pts.map(([x, y]) => [x * k, y * k]); }
    this._resample(pts, 3);
    // widths & lanes
    if (this.type === 'superspeedway') { this.hw = 46; this.lanes = [-24, 0, 24]; }
    else if (this.type === 'road') { this.hw = 30; this.lanes = [-10, 10]; }
    else { this.hw = 36; this.lanes = [-14, 12]; }
    // Pit road. v1.4 ovals: the pit boxes sit on the frontstretch only, like the real intermediates and superspeedways
    // (Bristol and Martinsville split them between the front and back straights, like the real ones). The entry lane
    // leaves the apron in turn 3-4, the exit lane rejoins in turn 1-2, and boxes never run into the turns.
    this.pitLat = -(this.hw + 31); this.boxLat = -(this.hw + 51);
    const nCars = seriesIdx !== undefined && seriesIdx !== null && DATA.SERIES[seriesIdx] ? DATA.SERIES[seriesIdx].cars : 32; this.nBoxes = nCars;
    const L = this.L; const ds = L / this.M; this.zones = [];
    if (this.type !== 'road' && sh.kind === 'rp') {
      const runs = this._straightRuns(); const M = this.M;
      const front = runs.find(r => r.has0) || { a: M - 10, len: 20 };
      const entry = Math.max(60, 0.035 * L), exit = Math.max(80, 0.05 * L);
      const zone = (a, len, n) => {
        const row = len * ds * 0.94, rowStart = (a + len * 0.03) * ds; // a little straight left at each end for the lanes to swing in
        const z = { n, start: (((rowStart - entry) / L) % 1 + 1) % 1, boxA: entry / L, boxB: (entry + row) / L };
        z.range = z.boxB + exit / L; z.boxLen = row / n; return z;
      };
      if (def.splitPits && runs.length > 1) {
        const back = runs.filter(r => r !== front).sort((x, y) => y.len - x.len)[0];
        const n0 = Math.ceil(nCars / 2); this.zones.push(zone(front.a, front.len, n0), zone(back.a, back.len, nCars - n0));
      } else this.zones.push(zone(front.a, front.len, nCars));
    } else {
      let halfStraight, zone, entry, exit;
      if (sh.kind === 'rp' || (sh.kind === 'road' && def.miles)) halfStraight = this._straightHalf(sh.kind === 'road' ? 0.35 : 0.3);
      else halfStraight = sh.kind === 'road' ? Math.hypot(sh.pts[1][0] - sh.pts[0][0], sh.pts[1][1] - sh.pts[0][1]) * 0.45 : sh.straight / 2 * 0.95;
      if (def.kart) { zone = Math.min(0.17 * L, nCars * 18); entry = 26; exit = 30; } // karts: a pit / grid lane along the main straight
      else { zone = Math.min(0.22 * L, Math.max(halfStraight * 1.6, nCars * 22)); entry = Math.max(40, halfStraight * 0.2); exit = Math.max(50, halfStraight * 0.25); }
      const z = { n: nCars, start: 1 - (zone * 0.5 + entry) / L, boxA: entry / L, boxB: (entry + zone) / L }; z.range = (zone + entry + exit) / L; z.boxLen = zone / nCars;
      this.zones.push(z);
    }
    // zone 0 also under the v1.3 names (renderer, tests)
    const z0 = this.zones[0];
    this.pitStart = z0.start; this.pitRange = z0.range; this.pitEnd = (z0.start + z0.range) % 1; this.boxA = z0.boxA; this.boxB = z0.boxB; this.boxLen = z0.boxLen;
    // bbox with margins
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < this.M; i++) { minX = Math.min(minX, this.X[i]); maxX = Math.max(maxX, this.X[i]); minY = Math.min(minY, this.Y[i]); maxY = Math.max(maxY, this.Y[i]); }
    const maxDep = Math.max(0, ...DATA.standsFor(trackId).map(x => x[2])); const m = this.hw + Math.max(122, 16 + maxDep + 34); // room for the stands + press box
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
  // distance from the start line (index 0) to where the track starts turning, both ways; pit lane fits inside
  _straightHalf(maxTurn) {
    const M = this.M; const walk = (dir) => { let turn = 0, dist = 0; for (let k = 1; k < M / 2; k++) { const i = ((dir * k) % M + M) % M, j = ((dir * (k - 1)) % M + M) % M; let da = this.A[i] - this.A[j]; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; turn += Math.abs(da); if (turn > maxTurn) break; dist += 3; } return dist; };
    return Math.max(60, Math.min(walk(1), walk(-1)) * 0.92);
  }
  // rounded polygon: verts [x, y, r]. Start/finish = middle of the last edge, or the arc of vertex sf.
  _rpoly(V, sf) {
    const n = V.length; const pts = []; const arcs = [];
    for (let i = 0; i < n; i++) {
      const P = V[(i - 1 + n) % n], C = V[i], N = V[(i + 1) % n];
      let ax = P[0] - C[0], ay = P[1] - C[1], bx = N[0] - C[0], by = N[1] - C[1]; const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by); ax /= la; ay /= la; bx /= lb; by /= lb;
      const th = Math.acos(U.clamp(ax * bx + ay * by, -1, 1)); let r = C[2]; let t = r / Math.tan(th / 2); const tmax = 0.49 * Math.min(la, lb); if (t > tmax) { t = tmax; r = t * Math.tan(th / 2); }
      const t1 = [C[0] + ax * t, C[1] + ay * t], t2 = [C[0] + bx * t, C[1] + by * t];
      let mx = ax + bx, my = ay + by; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml; const dc = r / Math.sin(th / 2); const cx = C[0] + mx * dc, cy = C[1] + my * dc;
      let a1 = Math.atan2(t1[1] - cy, t1[0] - cx), a2 = Math.atan2(t2[1] - cy, t2[0] - cx); let da = a2 - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      const steps = Math.max(2, Math.ceil(Math.abs(da) * r / 6)); const start = pts.length;
      for (let k = 0; k <= steps; k++) { const a = a1 + da * k / steps; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      arcs.push([start, pts.length - 1]);
      // straight to next vertex's arc is implied by the next arc's first point; add midpoints so the straight resamples evenly
      const nx = V[(i + 1) % n]; void nx;
    }
    // start index
    let s0;
    if (sf !== undefined) { const [a, b] = arcs[sf]; s0 = Math.round((a + b) / 2); }
    else { const last = arcs[n - 1][1], first = 0; const A = pts[last], B = pts[first]; pts.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]); s0 = pts.length - 1; }
    let rot = pts.slice(s0).concat(pts.slice(0, s0));
    let area = 0; for (let i = 0; i < rot.length; i++) { const a = rot[i], b = rot[(i + 1) % rot.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area > 0) rot = [rot[0]].concat(rot.slice(1).reverse());
    return rot;
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
  inPitZone(frac) { return this.zones.some((z, i) => this.pitProg(frac, i) <= z.range); }
  pitProg(frac, zi) { const z = this.zones[zi || 0]; return ((frac - z.start) % 1 + 1) % 1; }
  // pit-progress where a box is; st = 0..1 share of the box row (1 = nearest the exit)
  boxProg(st, zi) { const z = this.zones[zi || 0]; return z.boxA + (z.boxB - z.boxA) * U.clamp(st, 0, 1); }
  // v1.4: the low-curvature stretches of an oval (frontstretch = the one through the start/finish line), as
  // {a: first sample index (may be negative = before the line), len: samples, has0}
  _straightRuns() {
    const M = this.M, ds = this.L / M, w = 5, thr = this.L / (2 * Math.PI) * 0.9;
    const straight = new Uint8Array(M);
    for (let i = 0; i < M; i++) { let d = this.A[(i + w) % M] - this.A[(i - w + M) % M]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; straight[i] = Math.abs(d) < 1e-6 || (2 * w * ds) / Math.abs(d) > thr ? 1 : 0; }
    let s0 = 0; while (s0 < M && straight[s0]) s0++; if (s0 === M) return [{ a: -M / 4, len: M / 2, has0: true }];
    const runs = []; let i = s0;
    for (let k = 0; k < M; k++) { const j = (s0 + k) % M; if (straight[j] && !straight[(j - 1 + M) % M]) { let n = 0; while (n < M && straight[(j + n) % M]) n++; let a = j; if (a + n > M) a -= M; runs.push({ a, len: n, has0: a <= 0 && a + n > 0 || a <= M && a + n > M }); } }
    void i; for (const r of runs) if (r.a > M / 2 && r.has0) r.a -= M;
    return runs;
  }
}
