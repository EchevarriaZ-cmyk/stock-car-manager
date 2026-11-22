/* Stock Car Manager - utilities */
'use strict';
const U = {
  rand(a, b) { return a + Math.random() * (b - a); },
  randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  uid(prefix) { return (prefix || 'id') + Math.random().toString(36).slice(2, 9); },
  money(n) {
    const neg = n < 0; n = Math.abs(Math.round(n));
    let s;
    if (n >= 10000000) s = (n / 1000000).toFixed(1) + 'M';
    else if (n >= 1000000) s = (n / 1000000).toFixed(2) + 'M';
    else s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-$' : '$') + s;
  },
  moneyShort(n) {
    const neg = n < 0; n = Math.abs(n);
    let s = n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : Math.round(n) + '';
    return (neg ? '-$' : '$') + s;
  },
  ordinal(n) { const s = ['TH', 'ST', 'ND', 'RD'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); },
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; },
  shade(hex, f) { const c = U.hexToRgb(hex).map(v => U.clamp(Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f), 0, 255)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); },
};
