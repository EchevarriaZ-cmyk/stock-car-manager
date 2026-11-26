/* Track geometry: builds a closed centerline path for any track shape */
'use strict';
class TrackGeom {
  constructor(trackId, seriesIdx, opts) {
    const def = DATA.TRACKS[trackId];
    this.id = trackId; this.def = def; this.type = def.type; this.T = DATA.raceT(trackId, seriesIdx); this.seriesIdx = seriesIdx;
    const sh = def.shape;
    let pts = [];
    if (sh.kind === 'oval' || sh.kind === 'trioval') pts = this._oval(sh.straight, sh.r, sh.kind === 'trioval' ? sh.bump : 0);
    else if (sh.kind === 'rp') pts = this._rpoly(sh.xs ? sh.v.map(([x, y, r]) => [x * sh.xs, y, r]) : sh.v, sh.sf, sh.cw, sh.sfT); // v1.4: xs lengthens the straights
    // v1.5: street circuits are rounded polygons traced from the real maps; cw = the real track runs clockwise on its map
    else pts = this._road(sh.pts);
    // v1.2: scale every layout to its real lap length (compressed so short tracks still fit the screen)
    if (def.miles) { const target = this.T.perim; let per = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; per += Math.hypot(b[0] - a[0], b[1] - a[1]); } const k = target / per; this.k = k; pts = pts.map(([x, y]) => [x * k, y * k]); }
    if (!this.k) this.k = 1;
    this._resample(pts, 3);
    // widths & lanes
    if (this.type === 'superspeedway') { this.hw = 46; this.lanes = [-24, 0, 24]; }
    else if (def.street) { this.hw = 26; this.lanes = [-10, 10]; } // v1.5: narrower city streets
    else if (this.type === 'road') { this.hw = 30; this.lanes = [-10, 10]; }
    else { this.hw = 36; this.lanes = [-14, 12]; }
    // Pit road. v1.4 ovals: the pit boxes sit on the frontstretch only, like the real intermediates and superspeedways
    // (Bristol and Martinsville split them between the front and back straights, like the real ones). The entry lane
    // leaves the apron in turn 3-4, the exit lane rejoins in turn 1-2, and boxes never run into the turns.
    // v1.5: side = which side of the track pit road is on (-1 = left of travel, the v1.4 default; +1 = right, like St. Pete
    // and Long Beach). split = Detroit's pit lane in the Jefferson Ave median with boxes on both sides of the fast lane.
    this.side = sh.pitRight ? 1 : -1; this.split = !!sh.splitPit;
    this.pitLat = this.side * (this.hw + 31); this.boxLat = this.side * (this.hw + 51);
    if (this.split) { this.pitLat = this.side * (this.hw + 40); this.boxLat = this.side * (this.hw + 56); this.boxLat2 = this.side * (this.hw + 24); }
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
      } else if (front.len * ds * 0.94 / nCars < 11) { this._setSplit(); this.zones.push(zone(front.a, front.len, Math.ceil(nCars / 2))); } // v1.6.2: a big field on a short frontstretch gets a double-row pit lane
      else this.zones.push(zone(front.a, front.len, nCars));
    } else {
      let halfStraight, zone, entry, exit;
      if (sh.kind === 'rp' || (sh.kind === 'road' && def.miles)) halfStraight = this._straightHalf(sh.kind === 'road' ? 0.35 : 0.3);
      else halfStraight = sh.kind === 'road' ? Math.hypot(sh.pts[1][0] - sh.pts[0][0], sh.pts[1][1] - sh.pts[0][1]) * 0.45 : sh.straight / 2 * 0.95;
      if (def.kart) { zone = Math.min(0.17 * L, nCars * 18); entry = 26; exit = 30; } // karts: a pit / grid lane along the main straight
      else if (def.street) { const rows = this.split ? Math.ceil(nCars / 2) : nCars; zone = Math.max(150, Math.min(0.13 * L, rows * (this.split ? 22 : 11.5))); entry = 55; exit = 60; } // v1.5: tight street pit lanes stay on the main straight
      else { zone = Math.min(0.22 * L, Math.max(halfStraight * 1.6, nCars * 22)); entry = Math.max(40, halfStraight * 0.2); exit = Math.max(50, halfStraight * 0.25); }
      let nb = this.split ? Math.ceil(nCars / 2) : nCars; const sfT = def.street && sh.pitAt !== undefined ? sh.pitAt : 0.5; // pitAt: share of the box row before the line
      let before = zone * sfT;
      // v1.6.2: the box row has to fit on the straight. Where the old layout ran into the turns (every kart track, the
      // tight road courses with big fields) the boxes folded over each other on the inside of the corner. Fit the row
      // between the corners: same boxes if they fit, else shift it along the straight, then shrink the boxes (never
      // below a car), then go to a double-row pit lane (boxes on both sides of the fast lane, like Detroit).
      let bkB = this._straightWalk(-1, 0.2), fwB = this._straightWalk(1, 0.2);
      if (before > bkB || zone - before > fwB || zone / nb < 9) {
        const pref = def.kart ? 18 : def.street ? 11.5 : 22, minB = def.kart ? 11 : def.street ? 10 : 12;
        if (!this.split && (bkB + fwB) / nCars < (def.kart ? 14 : minB)) { this._setSplit(); nb = Math.ceil(nCars / 2); } // karts would get tiny: two rows of proper boxes instead
        if ((bkB + fwB) / nb < minB) { bkB = this._straightWalk(-1, 0.5); fwB = this._straightWalk(1, 0.5); } // a huge field on a tiny track: let the row follow a gentle bend
        const avail = bkB + fwB;
        const box = Math.min(this.split && !def.kart ? Math.max(pref, 22) : pref, avail / nb); zone = box * nb;
        before = U.clamp(zone * sfT, zone - fwB, bkB);
        const bkL = this._straightWalk(-1, 0.6), fwL = this._straightWalk(1, 0.6); // the entry/exit lanes may swing in a little later
        entry = Math.max(20, Math.min(entry, bkL - before)); exit = Math.max(20, Math.min(exit, fwL - (zone - before)));
      }
      const z = { n: nb, start: 1 - (before + entry) / L, boxA: entry / L, boxB: (entry + zone) / L }; z.range = (zone + entry + exit) / L; z.boxLen = zone / nb;
      this.zones.push(z);
      // v1.7.1: kart tracks get their own pit lane (falls back to the v1.6.2 lane if no spot is found)
      if (def.kart && !(opts && opts.lite)) this._kartPit(nCars); // lite = centreline only (track icons)
    }
    // zone 0 also under the v1.3 names (renderer, tests)
    const z0 = this.zones[0];
    this.pitStart = z0.start; this.pitRange = z0.range; this.pitEnd = (z0.start + z0.range) % 1; this.boxA = z0.boxA; this.boxB = z0.boxB; this.boxLen = z0.boxLen;
    // bbox with margins
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (let i = 0; i < this.M; i++) { minX = Math.min(minX, this.X[i]); maxX = Math.max(maxX, this.X[i]); minY = Math.min(minY, this.Y[i]); maxY = Math.max(maxY, this.Y[i]); }
    const PLn = this.pitLane; if (PLn) for (let i = 0; i < PLn.n; i++) for (const o of [0, 70]) { const x = PLn.X[i] + PLn.NX[i] * o, y = PLn.Y[i] + PLn.NY[i] * o; minX = Math.min(minX, x + this.hw + 62); maxX = Math.max(maxX, x - this.hw - 62); minY = Math.min(minY, y + this.hw + 62); maxY = Math.max(maxY, y - this.hw - 62); }
    const maxDep = Math.max(0, ...DATA.standsFor(trackId).map(x => x[2])); const m = this.hw + Math.max(122, 16 + maxDep + 34); // room for the stands + press box
    this.ox = -minX + m; this.oy = -minY + m;
    for (let i = 0; i < this.M; i++) { this.X[i] += this.ox; this.Y[i] += this.oy; }
    if (PLn) for (let i = 0; i < PLn.n; i++) { PLn.X[i] += this.ox; PLn.Y[i] += this.oy; }
    this.W = Math.ceil(maxX - minX + m * 2); this.H = Math.ceil(maxY - minY + m * 2);
    // v1.5: street circuits get a landscape-shaped city around them so the scenery fills a phone screen
    if (def.street) { const W2 = Math.max(this.W, Math.ceil(this.H * 1.8)); const dx = Math.round((W2 - this.W) / 2); if (dx > 0) { for (let i = 0; i < this.M; i++) this.X[i] += dx; this.ox += dx; this.W = W2; } }
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
  // v1.6.2: switch to a double-row pit lane (boxes on both sides of the fast lane, the v1.5 Detroit layout)
  _setSplit() { this.split = true; this.pitLat = this.side * (this.hw + 40); this.boxLat = this.side * (this.hw + 56); this.boxLat2 = this.side * (this.hw + 24); }
  // v1.6.2: straight distance from the start line (dir +1 = ahead, -1 = behind) before the track turns more than maxTurn
  // radians in total or a bend towards pit road squeezes the far edge of the boxes below 75% (they'd fold over each other)
  _straightWalk(dir, maxTurn) {
    const M = this.M, ds = this.L / M, lat = this.side * (this.hw + 60), w = Math.max(1, Math.round(6 / ds));
    const ang = i => this.A[((i % M) + M) % M]; const dA = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    let turn = 0, dist = 0;
    for (let k = 1; k < M / 2; k++) { const i = dir * k; turn += Math.abs(dA(ang(i), ang(i - dir)));
      const f = 1 - lat * dA(ang(i + w), ang(i - w)) / (2 * w * ds); // how much the far edge of the boxes is squeezed (< 1 = inside of a bend)
      if (turn > maxTurn || f < 0.75) break; dist += ds; }
    return dist;
  }
  // distance from the start line (index 0) to where the track starts turning, both ways; pit lane fits inside
  _straightHalf(maxTurn) {
    const M = this.M; const walk = (dir) => { let turn = 0, dist = 0; for (let k = 1; k < M / 2; k++) { const i = ((dir * k) % M + M) % M, j = ((dir * (k - 1)) % M + M) % M; let da = this.A[i] - this.A[j]; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; turn += Math.abs(da); if (turn > maxTurn) break; dist += 3; } return dist; };
    return Math.max(60, Math.min(walk(1), walk(-1)) * 0.92);
  }
  // rounded polygon: verts [x, y, r]. Start/finish = middle of the last edge, or the arc of vertex sf.
  _rpoly(V, sf, cw, sfT) {
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
    else { const last = arcs[n - 1][1], first = 0; const A = pts[last], B = pts[first]; const t = sfT === undefined ? 0.5 : sfT; pts.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); s0 = pts.length - 1; }
    let rot = pts.slice(s0).concat(pts.slice(0, s0));
    let area = 0; for (let i = 0; i < rot.length; i++) { const a = rot[i], b = rot[(i + 1) % rot.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (cw ? area < 0 : area > 0) rot = [rot[0]].concat(rot.slice(1).reverse());
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
    const P = { x: x + rx * (lat || 0), y: y + ry * (lat || 0), a };
    return this.pitLane ? this._pitWarp(frac, lat || 0, P) : P;
  }
  // v1.7.1 kart tracks: pit road lives on its own lane. Anything drawn or driven on the pit side of the track inside the pit
  // zone (pit road, its walls, box lines, cars on pit road) is carried over to that lane: u = distance out from the track
  // edge, the lane's track-side edge sits at u = 18 (as on every other track), so the rest of the game needs no changes.
  _pitWarp(frac, lat, P) {
    const PL = this.pitLane, z = this.zones[0]; const u = lat * this.side - this.hw; if (u <= 5) return P;
    const rel = ((frac - z.start) % 1 + 1) % 1; if (rel > z.range) return P;
    const k0 = U.clamp(Math.min(rel, z.range - rel) * this.L / 60, 0, 1); // ease onto / off the lane over the first and last 60 units
    const w0 = U.clamp((u - 5) / 13, 0, 1) * k0 * k0 * (3 - 2 * k0), w = w0 * w0 * (3 - 2 * w0);
    const sp = rel / z.range * (PL.n - 1), i = Math.min(PL.n - 2, Math.floor(sp)), t = sp - i;
    const sx = PL.X[i] + (PL.X[i + 1] - PL.X[i]) * t, sy = PL.Y[i] + (PL.Y[i + 1] - PL.Y[i]) * t;
    const nx = PL.NX[i] + (PL.NX[i + 1] - PL.NX[i]) * t, ny = PL.NY[i] + (PL.NY[i + 1] - PL.NY[i]) * t;
    let da = PL.A[i + 1] - PL.A[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; const la = PL.A[i] + da * t;
    const qx = sx + nx * (u - 18), qy = sy + ny * (u - 18);
    let dA = la - P.a; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI;
    return { x: P.x + (qx - P.x) * w, y: P.y + (qy - P.y) * w, a: P.a + dA * w };
  }
  // curbs / tyre walls are left out where pit road meets the track (with a separate lane that is just the two branch points)
  curbSkip(frac) {
    if (!this.pitLane) return this.inPitZone(frac);
    const z = this.zones[0], rel = this.pitProg(frac, 0) * this.L, R = z.range * this.L; return rel <= R && (rel < 70 || R - rel < 70);
  }
  // v1.7.1: find a dedicated pit lane for a kart track: a straight row of full-size boxes (one row, never folded) parallel to
  // one of the longer straights, out in the free space on either side, joined to the track by smooth entry / exit roads.
  // Nothing of it may come near the track surface, the curbs or the grandstand.
  _kartPit(nCars) {
    const ck = this.id + ':' + nCars, C = TrackGeom._kpCache || (TrackGeom._kpCache = {});
    if (C[ck] !== undefined) { const c = C[ck]; if (c) this._applyKartPit(c); return; }
    const M = this.M, ds = this.L / M, hw = this.hw, X = this.X, Y = this.Y, A = this.A;
    const box = nCars <= 20 ? 16 : 12, lead = 26, row = nCars * box, straight = row + 2 * lead;
    const dA = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    // obstacles: the track centerline (keep hw + 16 clear = surface + curbs + grass) and the grandstands
    const obst = []; for (let i = 0; i < M; i++) obst.push([X[i], Y[i], hw + 16]);
    for (const [f0, f1, dep] of DATA.standsFor(this.id)) { const span = ((f1 - f0) % 1 + 1) % 1 || 1; for (const sg of [1, -1]) for (let f = f0; f <= f0 + span; f += 6 / this.L) for (let o = hw + 16; o <= hw + 16 + dep; o += 8) { const p = this._rawPos(f, sg * o); obst.push([p.x, p.y, 10]); } } // the stands sit opposite pit road, so either side may get them
    const CS = 24, grid = new Map(), key = (gx, gy) => gx * 100003 + gy;
    obst.forEach((o, k) => { const gx = Math.floor(o[0] / CS), gy = Math.floor(o[1] / CS), K = key(gx, gy); if (!grid.has(K)) grid.set(K, []); grid.get(K).push(k); });
    const clear = (x, y, skip) => { const gx = Math.floor(x / CS), gy = Math.floor(y / CS);
      for (let ix = gx - 2; ix <= gx + 2; ix++) for (let iy = gy - 2; iy <= gy + 2; iy++) { const L = grid.get(key(ix, iy)); if (!L) continue;
        for (const k of L) { if (skip && k < M && skip(k)) continue; const o = obst[k]; const dx = x - o[0], dy = y - o[1]; if (dx * dx + dy * dy < o[2] * o[2]) return false; } }
      return true; };
    // straights: runs of samples with little heading change
    const runs = []; let cur = null; const w = Math.max(1, Math.round(9 / ds));
    for (let i = 0; i < M; i++) { const st = Math.abs(dA(A[(i + w) % M], A[(i - w + M) % M])) < 0.06; if (st) { if (!cur) cur = { a: i, len: 0 }; cur.len++; } else if (cur) { runs.push(cur); cur = null; } }
    if (cur) { if (runs.length && runs[0].a === 0) { runs[0].a = cur.a; runs[0].len += cur.len; } else runs.push(cur); }
    runs.sort((p, q) => q.len - p.len);
    const bez = (P0, a0, P1, a1, n) => { const d = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), h = d * 0.42; const c0 = [P0[0] + Math.cos(a0) * h, P0[1] + Math.sin(a0) * h], c1 = [P1[0] - Math.cos(a1) * h, P1[1] - Math.sin(a1) * h]; const out = [];
      for (let k = 0; k <= n; k++) { const t = k / n, mt = 1 - t; out.push([mt * mt * mt * P0[0] + 3 * mt * mt * t * c0[0] + 3 * mt * t * t * c1[0] + t * t * t * P1[0], mt * mt * mt * P0[1] + 3 * mt * mt * t * c0[1] + 3 * mt * t * t * c1[1] + t * t * t * P1[1]]); } return out; };
    const plen = (pts) => { let l = 0; for (let k = 1; k < pts.length; k++) l += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); return l; };
    // a connector is fine when its pit road (offsets -3..48 from the lane edge) stays clear of the track away from its branch point,
    // and it never turns tighter than a ~28-unit radius
    const connOk = (pts, side, fromTrack, bi) => {
      const n = pts.length - 1, arcSkip = Math.round(110 / ds);
      for (let k = 1; k < n; k++) { const a = Math.atan2(pts[k + 1][1] - pts[k - 1][1], pts[k + 1][0] - pts[k - 1][0]), b = k > 1 ? Math.atan2(pts[k][1] - pts[k - 2][1], pts[k][0] - pts[k - 2][0]) : a;
        const segL = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) || 1; if (Math.abs(dA(a, b)) / segL > 1 / 28) return false;
        const t = fromTrack ? k / n : 1 - k / n; // 0 at the branch point
        const nx = -Math.sin(a) * side, ny = Math.cos(a) * side;
        for (const o of t < 0.4 ? [24, 48] : [-3, 22, 48]) { const x = pts[k][0] + nx * o, y = pts[k][1] + ny * o;
          if (!clear(x, y, t < 0.55 ? (j => { let d = Math.abs(j - bi); d = Math.min(d, M - d); return d < arcSkip; }) : null)) return false; } }
      return true;
    };
    // branch points sit on a fairly straight bit of track (the pit road peels off a straight, never out of a hairpin)
    const w2 = Math.max(2, Math.round(45 / ds)), calm = i => Math.abs(dA(A[(i + w2) % M], A[(i - w2 + M) % M])) < 0.9;
    let best = null; const cands = [];
    for (const side of [this.side, -this.side]) for (const r of runs.slice(0, 4)) {
      const im = (r.a + Math.floor(r.len / 2)) % M, a = A[im], dx = Math.cos(a), dy = Math.sin(a), nx = -Math.sin(a) * side, ny = Math.cos(a) * side;
      let found = false;
      for (let D = hw + 22; D <= hw + 560 && !found; D += 12) {
        if (best && D > best.D + 160) break;
        for (const sh of [0, -60, 60, -130, 130, -220, 220]) {
          const cx = X[im] + nx * D + dx * sh, cy = Y[im] + ny * D + dy * sh;
          const R0 = [cx - dx * straight / 2, cy - dy * straight / 2], R1 = [cx + dx * straight / 2, cy + dy * straight / 2];
          let ok = true;
          for (let s = 0; s <= straight && ok; s += 6) for (const o of [-3, 0, 22, 48]) { if (!clear(R0[0] + dx * s + nx * o, R0[1] + dy * s + ny * o)) { ok = false; break; } }
          if (!ok) continue;
          // entry: branch off the track somewhere before the row; exit: rejoin somewhere after it
          let bestA = null, bestB = null;
          for (let k = Math.round(40 / ds); k < M * 0.45; k += Math.max(1, Math.round(15 / ds))) {
            const i = (im - Math.round((straight / 2 + sh) / ds) - k + M * 4) % M;
            if (!calm(i)) continue; const P0 = this._rawPos(i / M, side * (hw + 18)); if (bestA && Math.hypot(R0[0] - P0.x, R0[1] - P0.y) > bestA.l) continue; const pts = bez([P0.x, P0.y], A[i], R0, a, 40); const l = plen(pts);
            if (l > 700) break; if (bestA && l > bestA.l) continue;
            if (connOk(pts, side, true, i)) bestA = { i, pts, l };
          }
          if (!bestA) continue;
          for (let k = Math.round(40 / ds); k < M * 0.45; k += Math.max(1, Math.round(15 / ds))) {
            const j = (im + Math.round((straight / 2 - sh) / ds) + k) % M;
            if (!calm(j)) continue; const P1 = this._rawPos(j / M, side * (hw + 18)); if (bestB && Math.hypot(R1[0] - P1.x, R1[1] - P1.y) > bestB.l) continue; const pts = bez(R1, a, [P1.x, P1.y], A[j], 40); const l = plen(pts);
            if (l > 700) break; if (bestB && l > bestB.l) continue;
            if (connOk(pts, side, false, j)) bestB = { i: j, pts, l };
          }
          if (!bestB) continue;
          const sec = (((bestB.i - bestA.i) % M) + M) % M * ds; if (sec < 120 || sec > this.L * 0.8) continue;
          const total = bestA.l + straight + bestB.l, score = total + Math.abs(total - sec) * 0.5 + D * 0.3 + (side !== this.side ? 400 : 0); // keep pit road on its usual side when it fits there
          found = true; cands.push({ score, D, side, a, R0, R1, A: bestA, B: bestB, total, sec }); if (!best || score < best.score) best = cands[cands.length - 1];
        }
      }
    }
    cands.sort((p, q) => p.score - q.score);
    for (const cand of cands.slice(0, 12)) { const c = this._buildKartPit(cand, nCars, box, lead, row, straight); if (this._kartPitOk(c)) { C[ck] = c; this._applyKartPit(c); return; } }
    C[ck] = null; // no clean spot: keep the v1.6.2 lane
  }
  // the finished lane, as drawn (with the ease on / off at the branch points), keeps clear of the track everywhere
  _kartPitOk(c) {
    const save = { side: this.side, pitLat: this.pitLat, boxLat: this.boxLat, split: this.split, boxLat2: this.boxLat2, zones: this.zones, nBoxes: this.nBoxes, pitLane: this.pitLane };
    this._applyKartPit(c); const z = this.zones[0], M = this.M, ds = this.L / M; let ok = true;
    const G = new Map(); for (let i = 0; i < M; i++) { const K = Math.floor(this.X[i] / 40) * 100003 + Math.floor(this.Y[i] / 40); if (!G.has(K)) G.set(K, []); G.get(K).push(i); }
    for (let f = z.start; f <= z.start + z.range && ok; f += 3 / this.L) { const rel = (f - z.start) * this.L, near = Math.min(rel, z.range * this.L - rel);
      for (const u of near < 90 ? [44, 62] : [18, 31, 44, 62]) { const p = this.pos(f, this.side * (this.hw + u)); const fi = Math.round((f - Math.floor(f)) * M);
        const gx = Math.floor(p.x / 40), gy = Math.floor(p.y / 40);
        for (let ix = gx - 2; ix <= gx + 2 && ok; ix++) for (let iy = gy - 2; iy <= gy + 2 && ok; iy++) for (const i of G.get(ix * 100003 + iy) || []) { let di = Math.abs(i - fi); di = Math.min(di, M - di); if (near < 90 && di * ds < 140) continue; if (Math.hypot(p.x - this.X[i], p.y - this.Y[i]) < this.hw + 10) { ok = false; break; } }
        if (!ok) break; } }
    Object.assign(this, save); return ok;
  }
  _buildKartPit(best, nCars, box, lead, row, straight) {
    const M = this.M, A = this.A;    // the lane centreline (= its track-side edge, u = 18), resampled every ~2 units, with its outward normal
    const raw = best.A.pts.slice(0, -1); for (let s = 0; s < straight; s += 3) raw.push([best.R0[0] + Math.cos(best.a) * s, best.R0[1] + Math.sin(best.a) * s]); raw.push(...best.B.pts);
    const cum = [0]; for (let k = 1; k < raw.length; k++) cum.push(cum[k - 1] + Math.hypot(raw[k][0] - raw[k - 1][0], raw[k][1] - raw[k - 1][1]));
    const tot = cum[cum.length - 1], n = Math.max(8, Math.round(tot / 2)); const PL = { n, X: new Float32Array(n), Y: new Float32Array(n), A: new Float32Array(n), NX: new Float32Array(n), NY: new Float32Array(n), len: tot };
    let j = 0; for (let k = 0; k < n; k++) { const s = k * tot / (n - 1); while (j < raw.length - 2 && cum[j + 1] < s) j++; const t = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1); PL.X[k] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t; PL.Y[k] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t; }
    for (let k = 0; k < n; k++) { const p = Math.max(0, k - 1), q = Math.min(n - 1, k + 1); PL.A[k] = Math.atan2(PL.Y[q] - PL.Y[p], PL.X[q] - PL.X[p]); }
    PL.A[0] = A[best.A.i]; PL.A[n - 1] = A[best.B.i]; // meet the track exactly at the branch points
    for (let k = 0; k < n; k++) { PL.NX[k] = -Math.sin(PL.A[k]) * best.side; PL.NY[k] = Math.cos(PL.A[k]) * best.side; }
    const range = (((best.B.i - best.A.i) % M) + M) % M / M;
    const z = { n: nCars, start: best.A.i / M, range, boxA: (best.A.l + lead) / tot * range, boxB: (best.A.l + lead + row) / tot * range, boxLen: box, own: true, vk: Math.min(1, range * this.L / tot) };
    return { side: best.side, z, PL };
  }
  _applyKartPit(c) {
    const PL = c.PL; this.pitLane = { n: PL.n, len: PL.len, X: PL.X.slice(), Y: PL.Y.slice(), A: PL.A, NX: PL.NX, NY: PL.NY }; // X/Y get shifted with the track
    if (c.side !== this.side) { this.side = c.side; this.pitLat = this.side * (this.hw + 31); this.boxLat = this.side * (this.hw + 51); }
    this.split = false; this.boxLat2 = undefined; this.zones = [Object.assign({}, c.z)]; this.nBoxes = c.z.n;
  }
  // centreline position without the pit-lane warp (used while the lane is being built)
  _rawPos(frac, lat) { const pl = this.pitLane; this.pitLane = null; const p = this.pos(frac, lat); this.pitLane = pl; return p; }
  // v1.5: box lateral for a car (Detroit's split pit lane puts every other car on the track side of the fast lane)
  boxLatFor(c) { return this.split && c && c.pside ? this.boxLat2 : this.boxLat; }
  // v1.5: map coordinates of a shape vertex (raw design units) -> track units
  raw(x, y) { return [x * this.k + this.ox, y * this.k + this.oy]; }
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
