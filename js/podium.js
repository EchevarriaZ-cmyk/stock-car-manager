/* Podium celebration: pixel-art victory lane with the top 3, confetti, champagne and a trophy.
   opts: { top: [{livery, number, driver, isPlayer, slot, sub}], champ: bool, title, sub } */
'use strict';
const Podium = (() => {
  const CONF = ['#ffd000', '#e30d0d', '#2f62d8', '#2ecc40', '#f4f4f4', '#ff8a00', '#f07ab8', '#3ee8ff'];
  class Scene {
    constructor(canvas, opts) {
      this.cv = canvas; this.o = opts; this.t = 0; this.parts = []; this.spray = []; this.fw = [];
      this.mine = opts.top.some(e => e && e.isPlayer); this.won = !!(opts.top[0] && opts.top[0].isPlayer);
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect(); const px = r.height < 300 ? 2 : 3;
      this.W = Math.max(160, Math.floor(r.width / px)); this.H = Math.max(100, Math.floor(r.height / px));
      this.cv.width = this.W; this.cv.height = this.H; this.x = this.cv.getContext('2d'); this.x.imageSmoothingEnabled = false;
      this.bg = this.drawBG();
    }
    drawBG() {
      const W = this.W, H = this.H; const [c, x] = Art.mk(W, H); const champ = this.o.champ;
      const sky = champ ? ['#1a1440', '#2b1d5a', '#3d2a78', '#563a96'] : ['#5bb8e8', '#74c6ee', '#8ed3f2', '#a8e0f6'];
      const band = Math.ceil(H * 0.5 / sky.length); sky.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * band, W, band); });
      if (champ) for (let i = 0; i < 40; i++) { x.fillStyle = U.chance(0.5) ? '#f4f4f4' : '#ffd000'; x.fillRect(U.randi(0, W), U.randi(0, H * 0.4), 1, 1); }
      // grandstand + crowd
      const gy = Math.round(H * 0.36); Art.crowd(x, 0, gy, W, Math.round(H * 0.28));
      x.fillStyle = '#1b1b1b'; x.fillRect(0, gy - 2, W, 2);
      // sponsor boards
      const by = Math.round(H * 0.6); x.fillStyle = '#141414'; x.fillRect(0, by, W, 9);
      const sp = DATA.SPONSORS; for (let xx = 1, i = 0; xx < W; xx += 31, i++) { const s = sp[(i * 7) % sp.length]; x.fillStyle = s[1]; x.fillRect(xx, by + 1, 29, 7); x.fillStyle = s[2]; x.fillRect(xx + 4, by + 3, 21, 3); }
      // victory lane floor
      const fy = by + 9; x.fillStyle = '#5b5b5b'; x.fillRect(0, fy, W, H - fy);
      for (let i = 0; i < W * (H - fy) * 0.1; i++) { x.fillStyle = Math.random() < 0.5 ? '#656565' : '#515151'; x.fillRect(U.randi(0, W), U.randi(fy, H), 1, 1); }
      for (let xx = 0; xx < W; xx += 6) for (let r = 0; r < 2; r++) { x.fillStyle = ((xx / 6) + r) % 2 ? '#1b1b1b' : '#f4f4f4'; x.fillRect(xx, H - 6 + r * 3, 6, 3); }
      return c;
    }
    layout() {
      const W = this.W, H = this.H; const base = H - 7; const bw = Math.min(70, Math.floor(W / 4.2));
      const hs = [Math.round(H * 0.24), Math.round(H * 0.17), Math.round(H * 0.11)]; // 1st, 2nd, 3rd heights
      const cx = [W / 2, W / 2 - bw - 2, W / 2 + bw + 2];
      return [0, 1, 2].map(i => ({ x: Math.round(cx[i] - bw / 2), w: bw, top: base - hs[i], base, cx: Math.round(cx[i]) }));
    }
    burst(x0, y0, n, cols) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = U.rand(20, 60); this.fw.push({ x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: U.rand(0.6, 1.2), c: U.pick(cols || CONF) }); } }
    step(dt) {
      this.t += dt; const W = this.W, H = this.H;
      const rate = (this.o.champ ? 90 : 35) * (this.mine ? 1.8 : 1);
      if (this.t > 1.2) for (let i = 0; i < rate * dt; i++) this.parts.push({ x: U.rand(0, W), y: -2, vx: U.rand(-8, 8), vy: U.rand(18, 34), c: U.pick(CONF), ph: U.rand(0, 6) });
      for (const p of this.parts) { p.x += (p.vx + Math.sin(this.t * 4 + p.ph) * 10) * dt; p.y += p.vy * dt; }
      this.parts = this.parts.filter(p => p.y < H);
      // champagne from the winner
      const L = this.layout()[0];
      if (this.t > 1.6) for (let i = 0; i < 40 * dt * 3; i++) { const dir = Math.floor(this.t * 1.3) % 2 ? 1 : -1; this.spray.push({ x: L.cx + dir * 10, y: L.top - 10, vx: dir * U.rand(15, 55), vy: U.rand(-55, -25), t: 1.4 }); }
      for (const p of this.spray) { p.vy += 70 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
      this.spray = this.spray.filter(p => p.t > 0 && p.y < H);
      if ((this.mine || this.o.champ) && this.t > 1.4 && Math.random() < dt * (this.o.champ ? 2.5 : 1.4)) this.burst(U.rand(W * 0.1, W * 0.9), U.rand(H * 0.08, H * 0.35), 26);
      for (const p of this.fw) { p.vy += 25 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }
      this.fw = this.fw.filter(p => p.t > 0);
    }
    draw() {
      const x = this.x, W = this.W; x.drawImage(this.bg, 0, 0);
      this.headBottom = 3 + (PF.measure(this.o.title) * 2 < W - 12 && W > 250 ? 18 : 9) + 4 + (this.o.sub ? 12 : 0);
      for (const p of this.fw) { x.fillStyle = p.c; x.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      for (const p of this.spray) { x.fillStyle = p.t > 0.8 ? '#fff6c8' : '#f2e9a0'; x.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      const lay = this.layout(); const cols = ['#f2c81e', '#cfcfcf', '#c87a3a'];
      [2, 1, 0].forEach(i => {
        const L = lay[i], e = this.o.top[i]; if (!e) return;
        const k = U.clamp((this.t - (2 - i) * 0.35) / 0.45, 0, 1); // drop-in order: 3rd, 2nd, 1st
        const bounce = k < 1 ? (1 - k) * -60 : 0;
        // block
        const glow = e.isPlayer && Math.floor(this.t * 4) % 2 === 0;
        x.fillStyle = glow ? (e.slot === 2 ? '#3ee8ff' : '#ffe000') : '#141414'; x.fillRect(L.x - 1, L.top - 1, L.w + 2, L.base - L.top + 1);
        x.fillStyle = cols[i]; x.fillRect(L.x, L.top, L.w, L.base - L.top);
        x.fillStyle = U.shade(cols[i], 0.35); x.fillRect(L.x, L.top, L.w, 2); x.fillStyle = U.shade(cols[i], -0.25); x.fillRect(L.x, L.base - 2, L.w, 2);
        const n = String(i + 1); const nh = L.base - L.top > 24 ? 2 : 1;
        PF.drawOutlined(x, n, Math.round(L.cx - PF.measure(n) * nh / 2), L.top + 4, '#f4f4f4', '#141414', nh);
        if (k <= 0) return;
        // car + plate
        const car = Art.carBig(e.livery, e.number); const cy = Math.round(L.top - 16 + bounce);
        x.drawImage(car, Math.round(L.cx - 16), cy);
        const name = (e.driver || '').toUpperCase().slice(0, Math.floor((L.w + 8) / 6));
        const nw = PF.measure(name); x.fillStyle = 'rgba(20,20,20,.85)'; x.fillRect(Math.round(L.cx - nw / 2) - 2, cy - 11, nw + 4, 10);
        PF.draw(x, name, Math.round(L.cx - nw / 2), cy - 10, e.isPlayer ? (e.slot === 2 ? '#3ee8ff' : '#ffe000') : '#f4f4f4', 1);
        if (e.isPlayer && k >= 1 && Math.floor(this.t * 3) % 2 === 0) { // team arrow
          const ax = L.cx, ay = cy - 18; x.fillStyle = '#141414'; x.fillRect(ax - 4, ay - 1, 9, 2); x.fillRect(ax - 3, ay + 1, 7, 2); x.fillRect(ax - 2, ay + 3, 5, 1);
          x.fillStyle = e.slot === 2 ? '#3ee8ff' : '#ffe000'; x.fillRect(ax - 3, ay, 7, 1); x.fillRect(ax - 2, ay + 1, 5, 1); x.fillRect(ax - 1, ay + 2, 3, 1); x.fillRect(ax, ay + 3, 1, 1);
        }
      });
      // trophy above the winner
      const L = lay[0];
      if (this.t > 1.1) {
        const tr = Art.trophy(this.o.champ ? 'big' : 'cup', 'gold'); const bob = Math.round(Math.sin(this.t * 3) * 1.5);
        const bottom = L.top - 16 - 12; const topLim = this.headBottom + 2; const sc = U.clamp(Math.floor((bottom - topLim) / tr.height * 2) / 2, 1, 3);
        const tw = Math.round(tr.width * sc), th = Math.round(tr.height * sc);
        const tx = Math.round(L.cx - tw / 2), ty = bottom - th + bob;
        x.drawImage(tr, tx, ty, tw, th);
        if (Math.floor(this.t * 5) % 3 === 0) { x.fillStyle = '#ffffff'; x.fillRect(tx + 3, ty + 4, 1, 1); x.fillRect(tx + tw - 4, ty + 6, 1, 1); }
      }
      for (const p of this.parts) { x.fillStyle = p.c; x.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(this.t * 6 + p.ph) > 0 ? 2 : 1, 1); }
      // banner
      const title = this.o.title; const tsc = W > 250 && PF.measure(title) * 2 < W - 12 ? 2 : 1; const tw = PF.measure(title) * tsc;
      const by = 3 + Math.round(Math.max(0, 1 - this.t * 2) * -30);
      x.fillStyle = this.o.champ ? '#b08a10' : this.mine ? '#e30d0d' : '#1b1b1b'; x.fillRect(Math.round(W / 2 - tw / 2) - 5, by, tw + 10, 9 * tsc + 4);
      x.fillStyle = '#141414'; x.fillRect(Math.round(W / 2 - tw / 2) - 5, by + 9 * tsc + 4, tw + 10, 1);
      PF.drawOutlined(x, title, Math.round(W / 2 - tw / 2), by + 2, '#f4f4f4', '#141414', tsc);
      if (this.o.sub) { const sw = PF.measure(this.o.sub); x.fillStyle = 'rgba(20,20,20,.8)'; x.fillRect(Math.round(W / 2 - sw / 2) - 3, by + 9 * tsc + 6, sw + 6, 10); PF.draw(x, this.o.sub, Math.round(W / 2 - sw / 2), by + 9 * tsc + 7, '#ffe000', 1); }
    }
  }
  return { Scene };
})();
