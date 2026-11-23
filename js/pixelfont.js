/* Built-in 5x7 bitmap pixel font. PF.canvas(text, opts) -> canvas, PF.img(text, opts) -> <img> html */
'use strict';
const PF = (() => {
  const G = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    '.': ['..', '..', '..', '..', '..', '##', '##'],
    ',': ['..', '..', '..', '..', '##', '.#', '#.'],
    '!': ['##', '##', '##', '##', '##', '..', '##'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
    '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
    ':': ['..', '##', '##', '..', '##', '##', '..'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '.#.#.', '#####', '.#.#.'],
    '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
    '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
    ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
    '>': ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....'],
    '<': ['....#', '...#.', '..#..', '.#...', '..#..', '...#.', '....#'],
    '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
  };
  // tiny 3x5 digits for car roofs
  const D3 = {
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'],
    3: ['###', '..#', '.##', '..#', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
    6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
    9: ['###', '#.#', '###', '..#', '###'],
  };
  function glyph(ch) { return G[ch] || G[ch.toUpperCase()] || G['?']; }
  function measure(text) { let w = 0; for (const ch of text) w += glyph(ch)[0].length + 1; return Math.max(0, w - 1); }
  // draw text at (x,y) on ctx in pixel units (each font pixel = s px)
  function draw(ctx, text, x, y, color, s) {
    s = s || 1; ctx.fillStyle = color; let cx = x;
    for (const ch of text) {
      const g = glyph(ch);
      for (let r = 0; r < 7; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c] === '#') ctx.fillRect(cx + c * s, y + r * s, s, s);
      cx += (g[0].length + 1) * s;
    }
  }
  function drawOutlined(ctx, text, x, y, color, outline, s, shadow) {
    s = s || 1;
    if (shadow) for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) draw(ctx, text, x + dx * s, y + dy * s, shadow, s);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) draw(ctx, text, x + dx * s, y + dy * s, outline, s);
    draw(ctx, text, x, y, color, s);
  }
  function digits3(ctx, str, x, y, color) {
    ctx.fillStyle = color; let cx = x;
    for (const ch of str) { const g = D3[ch]; if (!g) continue; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '#') ctx.fillRect(cx + c, y + r, 1, 1); cx += 4; }
  }
  const cache = {};
  // real screen pixels per CSS px inside the game stage (devicePixelRatio x desktop zoom)
  // (phones/touch keep the v1.2 rule exactly: at least 2x, rounded to a whole devicePixelRatio)
  function effScale() {
    const dpr = window.devicePixelRatio || 1;
    if (typeof VIEW === 'undefined' || !VIEW.desktop) return Math.max(2, Math.round(dpr));
    return dpr * VIEW.zoom;
  }
  // Returns a 1x canvas (outline padding 1px, optional shadow) for multi-line text
  function canvas(text, o) {
    o = o || {};
    const color = o.color || '#fff', outline = o.outline === undefined ? '#1b1b1b' : o.outline;
    const lines = String(text).split('\n');
    const pad = outline ? (o.shadow ? 2 : 1) : 0, lh = 9;
    const w = Math.max(...lines.map(measure)) + pad * 2 + (o.shadow ? 1 : 0);
    const h = lines.length * lh - 2 + pad * 2 + (o.shadow ? 1 : 0);
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    const ctx = c.getContext('2d');
    lines.forEach((ln, i) => {
      const lw = measure(ln); const x = o.align === 'left' ? pad : Math.floor((w - lw) / 2);
      const y = pad + i * lh;
      if (outline) drawOutlined(ctx, ln, x, y, color, outline, 1, o.shadow); else draw(ctx, ln, x, y, color, 1);
    });
    return c;
  }
  // High-res render: each font pixel = scale*k device pixels, crisp thin outline + drop shadow
  function hiCanvas(text, o) {
    // v1.2.1: one font pixel = a whole number of real screen pixels at any devicePixelRatio and any
    // desktop zoom (was: always >= 2x then shrunk, which made the font uneven on 1x desktop screens)
    o = o || {}; const sc = o.scale || 2; const k = effScale(); const u = Math.max(1, Math.round(sc * k));
    const color = o.color || '#fff'; const ocol = o.outline === undefined ? '#1b1b1b' : o.outline;
    const ol = ocol ? Math.max(1, Math.round(u / 4)) : 0; const sh = o.shadow ? Math.max(1, Math.round(u / 3)) : 0; const shcol = typeof o.shadow === 'string' ? o.shadow : '#1b1b1b';
    const lines = String(text).split('\n'); const lh = 9;
    const tw = Math.max(...lines.map(measure));
    const W = tw * u + ol * 2, H = (lines.length * lh - 2) * u + ol * 2 + sh;
    const c = document.createElement('canvas'); c.width = Math.max(1, W); c.height = Math.max(1, H); const x = c.getContext('2d');
    const rects = [];
    lines.forEach((ln, li) => {
      const lw = measure(ln); let cx = o.align === 'left' ? 0 : Math.floor((tw - lw) / 2); const cy = li * lh;
      for (const ch of ln) { const g = glyph(ch); for (let r = 0; r < 7; r++) for (let cc = 0; cc < g[r].length; cc++) if (g[r][cc] === '#') rects.push([(cx + cc) * u + ol, (cy + r) * u + ol]); cx += g[0].length + 1; }
    });
    if (sh) { x.fillStyle = shcol; for (const [a, b] of rects) x.fillRect(a - ol, b - ol + sh, u + ol * 2, u + ol * 2); }
    if (ol) { x.fillStyle = ocol; for (const [a, b] of rects) x.fillRect(a - ol, b - ol, u + ol * 2, u + ol * 2); }
    x.fillStyle = color; for (const [a, b] of rects) x.fillRect(a, b, u, u);
    return { c, k };
  }
  function url(text, o) {
    const key = text + '|' + JSON.stringify(o || {}) + '|' + effScale();
    if (!cache[key]) { const r = hiCanvas(text, o); cache[key] = { u: r.c.toDataURL(), w: r.c.width / r.k, h: r.c.height / r.k }; }
    return cache[key];
  }
  // html <img> at integer font scale
  function img(text, o) {
    o = o || {}; const r = url(text, o);
    return `<img class="pf ${o.cls || ''}" alt="${U.esc(text)}" src="${r.u}" style="width:${r.w}px;height:${r.h}px">`;
  }
  return { draw, drawOutlined, measure, canvas, url, img, digits3 };
})();
