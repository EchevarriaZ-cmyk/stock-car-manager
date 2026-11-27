/* v1.9 OWNER LEAGUE: async online leagues for 2-8 team owners, stored in the Game Jolt Data Store (global).
   You are the team OWNER / manager, never the driver. No server: every client reads the same keys, and a race is
   resolved by the existing RaceSim, run headless with Math.random swapped for a PRNG seeded by (league code + race index).
   The stored result is canonical; WATCH REPLAY rebuilds the same race from the stored inputs and plays it in the renderer.
   Keys: lg_<CODE>_meta, lg_<CODE>_own (comma list, atomic append), lg_<CODE>_team_<user>, lg_<CODE>_pick_<i>_<user>, lg_<CODE>_res_<i>.
   Career saves are never touched. */
'use strict';
const League = (() => {
  if (typeof UI === 'undefined' || !UI.h || typeof GJ === 'undefined') return null;
  const H = UI.h, T = H.T, SH = H.SH, $ = q => document.querySelector(q);
  const GAME_URL = 'https://gamejolt.com/games/stock-car-manager/1122641';
  const START_CASH = 1500000, UP_COST = [200000, 300000, 400000, 550000, 700000], LEN_MULT = 0.65, FIELD = 38, SI = 3;
  const MKS = ['chevy', 'ford', 'toyota', 'dodge'];
  const MK = { chevy: ['CHEVY', '#d8a61c'], ford: ['FORD', '#1f4fa8'], toyota: ['TOYOTA', '#d0202a'], dodge: ['DODGE', '#141414'] };
  const SETUPS = { qual: { qual: 4, car: -0.6, cons: 0, n: 'QUALIFY TRIM' }, bal: { qual: 0, car: 0.6, cons: 0, n: 'BALANCED' }, race: { qual: -1, car: 0, cons: 6, n: 'RACE TRIM' } };
  const STRATS = { push: ['PUSH', 'push'], norm: ['NORMAL', 'normal'], save: ['SAVE', 'save'] };
  const PITS = { two: '2 TIRES', four: '4 TIRES', fuel: 'FUEL ONLY' };
  const UPS = { e: 'ENGINE', a: 'AERO', c: 'PIT CREW' };
  const DEF_PICK = { setup: 'bal', strat: 'norm', pit: 'four' };
  const st = { code: null, d: null, tab: 'race', busy: false, form: null, tb: null, pick: null, rv: null, view: null };
  const me = () => GJ.user.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const K = (c, ...a) => ['lg', c].concat(a).join('_');
  const err = (e) => H.toast(/signed out/.test(e && e.message) ? 'GAME JOLT COULD NOT VERIFY YOUR LOGIN - REOPEN THE GAME ON GAME JOLT WHILE SIGNED IN' : 'GAME JOLT IS NOT ANSWERING - CHECK YOUR CONNECTION AND TRY AGAIN');

  // ---------- seeded randomness (same numbers on every client) ----------
  const seedOf = s => parseInt(GJ.md5(String(s)).slice(0, 8), 16) >>> 0;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function seeded(r, fn) { const m = Math.random; Math.random = r; try { return fn(); } finally { Math.random = m; } }

  // ---------- driver pool + AI field (from the league code) ----------
  const STATS = ['speed', 'craft', 'cons', 'tires', 'fuel', 'pit'];
  const STAT_N = { speed: 'RAW SPEED', craft: 'RACECRAFT', cons: 'CONSISTENT', tires: 'TIRE SAVER', fuel: 'FUEL SAVER', pit: 'PIT ROAD PRO' };
  const ovr = d => Math.round(0.3 * d.speed + 0.22 * d.craft + 0.2 * d.cons + 0.12 * d.tires + 0.08 * d.fuel + 0.08 * d.pit);
  function typeRating(d, type) {
    if (type === 'short') return 0.35 * d.speed + 0.35 * d.craft + 0.2 * d.cons + 0.1 * d.tires;
    if (type === 'intermediate') return 0.45 * d.speed + 0.2 * d.craft + 0.15 * d.cons + 0.2 * d.tires;
    if (type === 'superspeedway') return 0.25 * d.speed + 0.45 * d.craft + 0.2 * d.cons + 0.1 * d.fuel;
    return 0.45 * d.speed + 0.25 * d.craft + 0.2 * d.cons + 0.1 * d.tires;
  }
  function mkDriver(base, spread) {
    const d = { first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), aggr: U.randi(25, 85), morale: 70 };
    for (const k of STATS) d[k] = base + U.gauss() * spread;
    return d;
  }
  const poolCache = {};
  function pool(code) { // 10 drivers, all the same overall (76), different strengths
    if (poolCache[code]) return poolCache[code];
    return (poolCache[code] = seeded(rng(seedOf(code + '|pool')), () => STATS.concat(STATS.slice(0, 4)).map(spec => {
      const d = mkDriver(76, 4); d[spec] += 12; const f = 76 - ovr(d); for (const k of STATS) d[k] = Math.round(U.clamp(d[k] + f, 40, 99));
      d.spec = spec; return d;
    })));
  }
  const aiCache = {};
  function aiTeams(code) {
    if (aiCache[code]) return aiCache[code];
    return (aiCache[code] = seeded(rng(seedOf(code + '|ai')), () => {
      const sr = DATA.SERIES[SI]; const used = new Set(); const out = []; const nums = U.shuffle([...Array(99).keys()].map(i => i + 1));
      for (let i = 0; i < FIELD; i++) {
        const s = Math.pow(Math.random(), 1.15); const dv = U.lerp(sr.aiDrv[0], sr.aiDrv[1], s);
        let n; do { n = U.pick(DATA.TEAM_A) + ' ' + U.pick(DATA.TEAM_B); } while (used.has(n)); used.add(n);
        const sp = U.pick(DATA.SPONSORS); const d = mkDriver(dv, 6); for (const k of STATS) d[k] = Math.round(U.clamp(d[k], 15, 99));
        out.push({ id: 'a' + i, name: n, nums, car: U.lerp(sr.aiCar[0], sr.aiCar[1], s), tv: { short: U.rand(-4, 4), intermediate: U.rand(-4, 4), superspeedway: U.rand(-4, 4), road: U.rand(-5, 5) },
          crew: U.clamp(0.4 + s * 0.5 + U.rand(-0.1, 0.1), 0.3, 0.98), d, livery: { body: sp[1], stripe: sp[2], num: '#141414', model: 'cup' } });
      }
      return out;
    }));
  }
  // the AI cars in a race: as many as fill the field to FIELD, numbers that the owners do not use
  function aiField(code, ownerNums) {
    const all = aiTeams(code); const n = FIELD - ownerNums.length; const free = all[0].nums.filter(x => !ownerNums.includes(x));
    return all.slice(0, n).map((t, i) => Object.assign({}, t, { number: free[i] }));
  }
  const dShort = d => d.first[0] + '. ' + d.last, dName = d => d.first + ' ' + d.last;
  const ownerId = u => 'L_' + u;
  function livery(t) { const b = DATA.BODY_COLORS; const body = b[seedOf(t.name) % b.length]; let stripe = MK[t.mk] ? MK[t.mk][1] : '#ffffff'; if (stripe === body) stripe = '#f4f4f4'; return { body, stripe, num: '#141414', model: 'cup' }; }

  // ---------- one race: inputs -> RaceSim.Race (seeded) ----------
  function entryFor(code, x, type) {
    const t = x.t, p = x.p, su = SETUPS[p.setup] || SETUPS.bal, up = t.up || {}, d = pool(code)[t.drv];
    const aeroK = type === 'superspeedway' || type === 'intermediate' ? 1.1 : 0.6;
    return Object.assign({ id: ownerId(x.u), slot: 1, isPlayer: true, number: t.num, team: t.name, driverShort: dShort(d), driver: dName(d), livery: livery(t),
      car: 77 + 0.9 * (up.e || 0) + aeroK * (up.a || 0) + su.car, drv: typeRating(d, type), rel: 75 + 3 * (up.e || 0), crew: 0.62 + 0.06 * (up.c || 0), qualBonus: su.qual,
      speed: d.speed, cons: U.clamp(d.cons + su.cons, 1, 99), craft: d.craft, tires: d.tires, fuelS: d.fuel, pit: d.pit, aggr: d.aggr, morale: 70 });
  }
  function build(code, idx, tid, inp, onEvent) {
    const r = rng(seedOf(code + '|' + idx)); const type = DATA.TRACKS[tid].type;
    const race = seeded(r, () => {
      const ai = aiField(code, inp.map(x => x.t.num)).map(a => ({ id: a.id, isPlayer: false, number: a.number, team: a.name, driverShort: dShort(a.d), driver: dName(a.d), livery: a.livery,
        car: a.car + a.tv[type], drv: typeRating(a.d, type), rel: 60 + (a.car - 64) * 0.6, crew: a.crew, speed: a.d.speed, cons: a.d.cons, craft: a.d.craft, tires: a.d.tires, fuelS: a.d.fuel, pit: a.d.pit, aggr: a.d.aggr, morale: 70 }));
      const grid = RaceSim.qualify(inp.map(x => entryFor(code, x, type)).concat(ai), type);
      const geom = new TrackGeom(tid, SI); geom.T = DATA.applyLen(Object.assign({}, DATA.trackT(tid)), LEN_MULT); geom.event = DATA.eventName(SI, idx + 1, st.d && st.d.meta ? st.d.meta.sched : null);
      const modes = {}, pitPlan = {}; for (const x of inp) { modes[ownerId(x.u)] = (STRATS[x.p.strat] || STRATS.norm)[1]; pitPlan[ownerId(x.u)] = PITS[x.p.pit] ? x.p.pit : 'four'; }
      return new RaceSim.Race({ geom, grid, playerIds: inp.map(x => ownerId(x.u)), modes, pitPlan, autoPlayer: true, style: 'balanced', onEvent: onEvent || (() => {}) });
    });
    race.autoPlayer = true; race.paused = false; race.callQueue = [];
    return { race, step: (dt) => seeded(r, () => race.step(dt)) };
  }
  const DT = 1 / 15; // the same fixed step as RaceSim.runToEnd, so the replay is the same race
  function simulate(code, idx, tid, inp) {
    const log = []; const b = build(code, idx, tid, inp, (k, d) => { if (k === 'msg' && d && (d.kind === 'yellow' || d.kind === 'stage')) log.push(d.text); });
    let g = 0; while (b.race.phase !== 'done' && g++ < 400000) b.step(DT);
    const res = b.race.results();
    const ord = res.order.map(o => [o.id, o.laps, o.lapsLed, o.status === 'RUNNING' ? 0 : o.status, o.grid, o.stagePts || 0]);
    return { ord, cau: res.cautions, log: log.slice(0, 12) };
  }

  // ---------- points / money from stored results ----------
  const pts = (row) => (DATA.POINTS[row.pos - 1] || 1) + (row.sp || 0);
  const prize = (pos) => 120000 + (FIELD + 1 - pos) * 6000;
  function rows(res) { return res.ord.map((o, i) => ({ id: o[0], pos: i + 1, laps: o[1], led: o[2], st: o[3] || 'RUNNING', grid: o[4], sp: o[5] })); }
  function standings(d) {
    const tab = {}; for (const u of d.owners) tab[u] = { u, pts: 0, wins: 0, t5: 0, led: 0, earn: 0, last: null };
    for (const res of d.res) for (const r of rows(res)) { if (!r.id.startsWith('L_')) continue; const u = r.id.slice(2); const s = tab[u]; if (!s) continue;
      s.pts += pts(r); s.wins += r.pos === 1 ? 1 : 0; s.t5 += r.pos <= 5 ? 1 : 0; s.led += r.led; s.earn += prize(r.pos); s.last = r.pos; }
    return Object.values(tab).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.u.localeCompare(b.u));
  }
  const cash = (d, u) => { const s = standings(d).find(x => x.u === u); const t = d.teams[u]; return START_CASH + (s ? s.earn : 0) - (t ? t.spent || 0 : 0); };

  // ---------- local list of my leagues ----------
  const LKEY = () => 'scm_lg_' + me();
  function mine() { try { const v = JSON.parse(localStorage.getItem(LKEY()) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function remember(code, name) { try { const l = mine().filter(x => x.c !== code); l.unshift({ c: code, n: name }); localStorage.setItem(LKEY(), JSON.stringify(l.slice(0, 12))); } catch (e) {} }

  // ---------- loading a league ----------
  const ownersOf = (s, max) => { const out = []; for (const u of String(s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)) if (!out.includes(u)) out.push(u); return out.slice(0, max || 8); };
  const resCache = {};
  function load(code) {
    const S = GJ.store;
    return Promise.all([S.json(K(code, 'meta')), S.fetch(K(code, 'own')), S.keys(K(code, 'res', '*'))]).then(([meta, own, rk]) => {
      if (!meta) throw new Error('nometa');
      const n = rk.map(k => +k.split('_').pop()).filter(x => x >= 0).reduce((a, b) => Math.max(a, b + 1), 0);
      return Promise.all([...Array(n).keys()].map(i => resCache[code + i] ? resCache[code + i] : S.json(K(code, 'res', i)).then(v => (v && (resCache[code + i] = v)) || v))).then(res => {
        res = res.filter(Boolean);
        const owners = res.length && res[0].owners ? res[0].owners : ownersOf(own, meta.max); const cur = res.length;
        return Promise.all(owners.map(u => S.json(K(code, 'team', u)))).then(ts => {
          const teams = {}; owners.forEach((u, i) => { if (ts[i]) teams[u] = ts[i]; });
          const done = cur >= meta.sched.length;
          return (done ? Promise.resolve([]) : Promise.all(owners.map(u => S.json(K(code, 'pick', cur, u))))).then(ps => {
            const picks = {}; owners.forEach((u, i) => { if (ps[i]) picks[u] = ps[i]; });
            return { code, meta, owners, teams, res, cur, done, picks };
          });
        });
      });
    });
  }
  // resolve the current race: all owners with a team submitted, or the commissioner forces it (missing picks = last picks)
  function resolve(d, force) {
    const live = d.owners.filter(u => d.teams[u]);
    if (d.done || !live.length || (!force && !live.every(u => d.picks[u]))) return Promise.resolve(false);
    const i = d.cur, key = K(d.code, 'res', i);
    return GJ.store.json(key).then(ex => {
      if (ex) return true;
      const inp = live.map(u => { const t = d.teams[u]; const p = d.picks[u] || t.last || DEF_PICK; return { u, t: { name: t.name, num: t.num, mk: t.mk, drv: t.drv, up: t.up || {} }, p: { setup: p.setup, strat: p.strat, pit: p.pit }, fb: !d.picks[u] }; });
      const tid = d.meta.sched[i]; const sim = simulate(d.code, i, tid, inp);
      const res = { v: 1, i, tid, owners: d.owners, inp, ord: sim.ord, cau: sim.cau, log: sim.log, by: me() };
      return GJ.store.set(key, res).then(() => GJ.store.json(key)).then(v => { if (v) resCache[d.code + i] = v; return true; });
    });
  }

  // ---------- actions ----------
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode() { let s = ''; for (let i = 0; i < 6; i++) s += CODE_CH[Math.floor(Math.random() * CODE_CH.length)]; return s; }
  function create(name, len, max) {
    const tryCode = (n) => { const code = newCode(); return GJ.store.fetch(K(code, 'meta')).then(v => v !== null ? (n > 0 ? tryCode(n - 1) : Promise.reject(new Error('codes'))) : code); };
    return tryCode(4).then(code => {
      const meta = { v: 1, name, len, max, by: me(), sched: DATA.scheduleFor(SI, len) };
      return GJ.store.set(K(code, 'meta'), meta).then(() => GJ.store.set(K(code, 'own'), me())).then(() => GJ.store.json(K(code, 'meta'))).then(m => {
        if (!m || m.by !== me()) throw new Error('verify'); remember(code, name); return code;
      });
    });
  }
  // join: fetch, atomic append, re-fetch to verify we made the cut (extra names past the max are ignored by everyone)
  function join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return Promise.resolve('TYPE THE 6-CHARACTER LEAGUE CODE.');
    return Promise.all([GJ.store.json(K(code, 'meta')), GJ.store.fetch(K(code, 'own')), GJ.store.keys(K(code, 'res', '*'))]).then(([meta, own, rk]) => {
      if (!meta) return 'NO LEAGUE WITH CODE ' + code + '.';
      const list = ownersOf(own, 99);
      if (list.slice(0, meta.max).includes(me())) { remember(code, meta.name); return null; }
      if (rk.length) return 'THAT SEASON ALREADY STARTED.';
      if (list.length >= meta.max) return 'THAT LEAGUE IS FULL.';
      return GJ.store.update(K(code, 'own'), 'append', ',' + me()).then(() => GJ.store.fetch(K(code, 'own'))).then(v => {
        if (!ownersOf(v, meta.max).includes(me())) return 'THAT LEAGUE JUST FILLED UP.';
        remember(code, meta.name); return null;
      });
    });
  }
  function saveTeam(d, t) {
    const taken = Object.entries(d.teams).filter(([u]) => u !== me()).map(([, x]) => x);
    if (taken.some(x => x.drv === t.drv)) return Promise.resolve('ANOTHER OWNER SIGNED THAT DRIVER. PICK ANOTHER ONE.');
    if (taken.some(x => x.num === t.num)) return Promise.resolve('CAR #' + t.num + ' IS TAKEN IN THIS LEAGUE.');
    const old = d.teams[me()] || {}; const rec = Object.assign({ up: { e: 0, a: 0, c: 0 }, spent: 0 }, old, t);
    return GJ.store.set(K(d.code, 'team', me()), rec).then(() => { d.teams[me()] = rec; return null; });
  }
  function buyUp(d, k) {
    const t = d.teams[me()]; if (!t) return Promise.resolve('BUILD YOUR TEAM FIRST.');
    const lv = (t.up && t.up[k]) || 0; if (lv >= UP_COST.length) return Promise.resolve(UPS[k] + ' IS MAXED OUT.');
    const c = UP_COST[lv]; if (cash(d, me()) < c) return Promise.resolve('NOT ENOUGH MONEY (' + U.money(c) + ').');
    const rec = Object.assign({}, t, { up: Object.assign({ e: 0, a: 0, c: 0 }, t.up, { [k]: lv + 1 }), spent: (t.spent || 0) + c });
    return GJ.store.set(K(d.code, 'team', me()), rec).then(() => { d.teams[me()] = rec; return null; });
  }
  function submit(d, p) {
    const t = d.teams[me()]; if (!t) return Promise.resolve('BUILD YOUR TEAM FIRST.');
    const pick = { setup: p.setup, strat: p.strat, pit: p.pit, at: Date.now() };
    return GJ.store.set(K(d.code, 'pick', d.cur, me()), pick).then(() => GJ.store.set(K(d.code, 'team', me()), Object.assign({}, t, { last: { setup: p.setup, strat: p.strat, pit: p.pit } })))
      .then(() => { d.picks[me()] = pick; d.teams[me()].last = pick; return null; });
  }

  // ---------- screens ----------
  const trk = tid => DATA.TRACKS[tid];
  function head(title, back, extra) {
    return `<div class="pw-head pw-bar"><button class="btn back" data-act="${back ? 'lgOpen' : 'go'}" data-arg="${back ? '' : 'hub'}" data-kb="escape" data-kh="ESC">${T(back ? '< LEAGUES' : '< HUB', 2)}</button><div class="ph-title">${T(title, 3, SH)}</div><div class="spacer"></div>${extra || ''}</div>`;
  }
  const pg = (title, body, back, extra) => H.render(`<div class="screen page lg">${head(title, back, extra)}<div class="page-body">${body}</div></div>`);
  const btn = (act, arg, label, col, sel, extra) => `<button class="btn ${col || 'dark'} ${sel ? 'sel' : ''}" data-act="${act}" data-arg="${arg}"${extra || ''}>${label}</button>`;
  function busy(on) { st.busy = on; const b = $('.lg-busy'); if (b) b.hidden = !on; }
  function run(p, after) { if (st.busy) return; busy(true); return p.then(r => { busy(false); if (after) after(r); }, e => { busy(false); err(e); }); }

  function lobby() {
    UI.ui.screen = 'league'; st.view = null;
    if (!GJ.on) return pg('OWNER LEAGUE', `<div class="panel lg-sign"><div>${T('PLAY ON GAME JOLT WHILE SIGNED IN TO JOIN LEAGUES', 2, SH)}</div>
      <div class="small" style="line-height:1.6;margin:8px 0">OWNER LEAGUES ARE ONLINE SEASONS FOR 2-8 TEAM OWNERS. EVERY RACE WEEK EACH OWNER SENDS SETUP, STRATEGY AND PIT CALLS, AND THE RACE RUNS FOR EVERYONE AT ONCE. YOUR CAREER IS NOT AFFECTED.</div>
      <a class="btn yellow" href="${GAME_URL}" target="_blank" rel="noopener">OPEN STOCK CAR MANAGER ON GAME JOLT</a></div>`);
    const f = st.form || (st.form = { name: '', len: 10, max: 4 });
    const list = mine();
    const left = `<div class="panel"><h3>MY LEAGUES</h3>${list.length ? list.map(x => `<button class="list-row" style="width:100%;color:#fff" data-act="lgOpen" data-arg="${x.c}"><span class="tag">${x.c}</span><span class="grow ol1">${U.esc(x.n)}</span><span>&#9656;</span></button>`).join('') : '<div class="small">NO LEAGUES YET. CREATE ONE AND SEND THE CODE TO YOUR FRIENDS, OR JOIN WITH A CODE.</div>'}</div>
      <div class="panel"><h3>JOIN WITH A CODE</h3><div class="row" style="flex-wrap:nowrap"><input id="lg-code" class="txt" maxlength="6" placeholder="ABC123" autocomplete="off" style="text-transform:uppercase;flex:1">${btn('lgJoin', '', 'JOIN', 'green')}</div></div>`;
    const right = `<div class="panel"><h3>CREATE A LEAGUE</h3><input id="lg-name" class="txt" maxlength="22" placeholder="LEAGUE NAME" autocomplete="off" value="${U.esc(f.name)}">
      <div class="small" style="margin:8px 0 4px">SEASON LENGTH (REAL CUP TRACKS)</div><div class="row">${[6, 10, 16].map(n => btn('lgLen', n, n + ' RACES', 'dark', f.len === n)).join('')}</div>
      <div class="small" style="margin:8px 0 4px">MAX OWNERS</div><div class="row" style="flex-wrap:nowrap;align-items:center">${btn('lgMax', -1, '-')}<span class="numbox">${T(String(f.max), 3, SH)}</span>${btn('lgMax', 1, '+')}<span class="tiny" style="margin-left:6px">2-8 OWNERS · AI FILLS THE ${FIELD}-CAR FIELD</span></div>
      <div class="row" style="margin-top:8px">${btn('lgCreate', '', T('CREATE LEAGUE >', 2), 'red wide')}</div></div>`;
    pg('OWNER LEAGUE', `<div class="lg-busy" hidden>WORKING...</div><div class="cols"><div class="col">${left}</div><div class="col">${right}</div></div>`);
  }
  function open(code) {
    st.code = code || st.code; if (!st.code) return lobby();
    UI.ui.screen = 'lgView'; st.view = 'lgView';
    pg('LEAGUE ' + st.code, '<div class="panel">LOADING THE LEAGUE...</div>', true);
    return load(st.code).then(d => {
      st.d = d; remember(d.code, d.meta.name); return resolve(d, false).then(r => r ? load(st.code).then(x => { st.d = x; }) : null);
    }).then(() => { if (UI.ui.screen === 'lgView') view(); }).catch(e => { if (e && e.message === 'nometa') { H.toast('NO LEAGUE WITH THAT CODE'); return lobby(); } err(e); if (UI.ui.screen === 'lgView') pg('LEAGUE ' + st.code, `<div class="panel">COULD NOT LOAD THE LEAGUE. ${btn('lgOpen', st.code, 'RETRY', 'yellow')}</div>`, true); });
  }
  const ownerTag = (d, u) => { const t = d.teams[u]; return t ? `<span class="tag" style="background:${livery(t).body}">${t.num}</span> ${U.esc(t.name)}` : `<span class="tag">--</span> ${U.esc(u.toUpperCase())} <span class="tiny">(NO TEAM YET)</span>`; };
  function view() {
    const d = st.d; if (!d) return open();
    UI.ui.screen = 'lgView'; st.view = 'lgView';
    if (!d.teams[me()] && d.owners.includes(me()) && !d.res.length && st.tab !== 'stand') st.tab = 'team';
    const tabs = [['race', d.done ? 'SEASON OVER' : 'RACE ' + (d.cur + 1)], ['team', 'MY TEAM'], ['res', 'RESULTS'], ['stand', 'STANDINGS'], ['sched', 'SCHEDULE']]
      .map(([k, l]) => btn('lgTab', k, l, st.tab === k ? 'orange' : 'dark', st.tab === k)).join('');
    const body = ({ race: raceTab, team: teamTab, res: resTab, stand: standTab, sched: schedTab })[st.tab] || raceTab;
    pg(d.meta.name, `<div class="lg-busy" hidden>WORKING...</div><div class="row lg-tabs">${tabs}</div>${body(d)}`, true,
      `<span class="lg-code tag">CODE ${d.code}</span>${btn('lgRefresh', '', 'REFRESH', 'dark')}`);
  }
  function teamTab(d) {
    const t = d.teams[me()];
    if (!d.owners.includes(me())) return '<div class="panel">YOU ARE NOT AN OWNER IN THIS LEAGUE.</div>';
    if (t && !st.tb) {
      const up = t.up || {}; const dv = pool(d.code)[t.drv];
      return `<div class="cols"><div class="col narrow"><div class="panel garage-floor lg-car">${Art.carImg(livery(t), t.num, 4)}<div>${T(t.name, 2, SH)}</div><div class="small">#${t.num} · ${MK[t.mk][0]} · DRIVER ${U.esc(dName(dv).toUpperCase())} (${STAT_N[dv.spec]})</div></div></div>
        <div class="col"><div class="panel"><h3>CASH ${U.money(cash(d, me()))}</h3><div class="tiny">EVERY OWNER STARTED WITH ${U.money(START_CASH)}. PRIZE MONEY COMES IN AFTER EACH RACE. UPGRADES ARE KEPT ALL SEASON.</div>
        ${Object.keys(UPS).map(k => `<div class="list-row lg-up"><span class="grow">${UPS[k]} LV ${up[k] || 0}/5<div class="tiny">${k === 'e' ? 'MORE SPEED EVERYWHERE, FEWER ENGINE FAILURES' : k === 'a' ? 'MORE SPEED, BEST ON INTERMEDIATES AND SPEEDWAYS' : 'FASTER, CLEANER PIT STOPS'}</div></span>${(up[k] || 0) >= 5 ? '<span class="tag">MAX</span>' : btn('lgBuy', k, 'BUY ' + U.moneyShort(UP_COST[up[k] || 0]), 'green')}</div>`).join('')}</div>
        ${d.res.length ? '' : `<div class="row">${btn('lgEditTeam', '', 'EDIT TEAM', 'dark')}</div>`}</div></div>`;
    }
    if (d.res.length && t) { st.tb = null; return teamTab(d); }
    const tb = st.tb || (st.tb = t ? { name: t.name, num: t.num, mk: t.mk, drv: t.drv } : { name: '', num: 1 + seedOf(me()) % 99, mk: 'chevy', drv: -1 });
    const takenD = Object.entries(d.teams).filter(([u]) => u !== me()).map(([, x]) => x.drv);
    const drivers = pool(d.code).map((x, i) => { const tk = takenD.includes(i); return `<button class="list-row lg-drv ${tb.drv === i ? 'sel' : ''}" style="color:#fff" data-act="${tk ? 'lgNoop' : 'lgDrv'}" data-arg="${i}" ${tk ? 'disabled' : ''}><span class="grow"><b>${U.esc(dName(x).toUpperCase())}</b> <span class="tiny">${tk ? 'SIGNED BY ANOTHER OWNER' : STAT_N[x.spec]}</span><div class="tiny">SPD ${x.speed} · CRAFT ${x.craft} · CONS ${x.cons} · TIRES ${x.tires} · FUEL ${x.fuel} · PIT ${x.pit}</div></span>${tb.drv === i ? '<span class="tag" style="background:#e6ff2b;color:#15171b">PICKED</span>' : ''}</button>`; }).join('');
    return `<div class="cols"><div class="col"><div class="panel"><h3>BUILD YOUR LEAGUE TEAM</h3><input id="lg-team" class="txt" maxlength="22" placeholder="TEAM NAME" autocomplete="off" value="${U.esc(tb.name)}">
        <div class="small" style="margin:8px 0 4px">CAR NUMBER</div><div class="row" style="flex-wrap:nowrap;align-items:center">${btn('lgNum', -1, '-')}<span class="numbox">${T(String(tb.num), 3, SH)}</span>${btn('lgNum', 1, '+')}</div>
        <div class="small" style="margin:8px 0 4px">MANUFACTURER</div><div class="row">${MKS.map(m => `<button class="btn ${tb.mk === m ? 'sel' : ''}" style="background:${MK[m][1]}" data-act="lgMk" data-arg="${m}">${MK[m][0]}</button>`).join('')}</div>
        <div class="tiny" style="margin-top:6px">EVERY OWNER GETS THE SAME CAR, CREW AND ${U.money(START_CASH)} BUDGET. STRATEGY DECIDES IT.</div>
        <div class="row" style="margin-top:8px">${btn('lgSaveTeam', '', T('SAVE TEAM >', 2), 'red wide')}</div></div></div>
      <div class="col"><div class="panel"><h3>PICK YOUR DRIVER (ALL RATED 76 OVERALL)</h3>${drivers}</div></div></div>`;
  }
  function raceTab(d) {
    if (d.done) return `<div class="panel lg-champ"><div>${T('SEASON COMPLETE', 3, SH)}</div><div class="small" style="margin:6px 0">${ownerTag(d, standings(d)[0].u)} IS THE CHAMPION.</div>${btn('lgChamp', '', T('CHAMPION >', 2), 'yellow')}</div>${standTab(d)}`;
    const tid = d.meta.sched[d.cur], tr = trk(tid), t = d.teams[me()], isC = d.meta.by === me();
    const p = st.pick && st.pick.code === d.code && st.pick.i === d.cur ? st.pick : (st.pick = Object.assign({ code: d.code, i: d.cur }, DEF_PICK, (t && t.last) || {}, d.picks[me()] || {}));
    const opt = (grp, map) => `<div class="row lg-opt">${Object.keys(map).map(k => btn('lgPick', grp + '|' + k, Array.isArray(map[k]) ? map[k][0] : map[k].n || map[k], 'dark', p[grp] === k)).join('')}</div>`;
    const status = d.owners.map(u => `<div class="list-row" style="min-height:30px;cursor:default"><span class="grow ol1">${ownerTag(d, u)}</span><span class="tag ${d.picks[u] ? 'q-in' : 'q-out'}">${!d.teams[u] ? 'NO TEAM' : d.picks[u] ? 'PICKS IN' : 'WAITING'}</span></div>`).join('');
    const ev = DATA.eventName(SI, d.cur + 1, d.meta.sched);
    const left = `<div class="panel"><div class="tiny">RACE ${d.cur + 1} OF ${d.meta.sched.length}${ev ? ' · ' + ev : ''}</div>${T(tr.short, 3, SH)}<div class="tiny">${U.esc(tr.city || '')} · ${DATA.typeName(tid)} · ${tr.miles} MI</div></div>
      <div class="panel"><h3>OWNERS (${d.owners.length}/${d.meta.max})</h3>${status}${!d.res.length && d.owners.length < d.meta.max ? '<div class="tiny" style="margin-top:4px">SEND CODE ' + d.code + ' TO YOUR FRIENDS. JOINING CLOSES AFTER RACE 1.</div>' : ''}</div>
      ${isC ? `<div class="panel"><div class="tiny" style="margin-bottom:4px">COMMISSIONER: RUN THE RACE NOW. OWNERS WITHOUT PICKS USE THEIR LAST PICKS.</div>${btn('lgRun', '', T('RUN RACE >', 2), 'red wide')}</div>` : ''}`;
    const right = !t ? `<div class="panel">${d.owners.includes(me()) ? 'BUILD YOUR TEAM FIRST (MY TEAM TAB).' : 'YOU ARE WATCHING THIS LEAGUE.'}</div>` : `<div class="panel"><h3>RACE WEEK PICKS${d.picks[me()] ? ' <span class="tag q-in">SENT</span>' : ''}</h3>
      <div class="small">CAR SETUP</div>${opt('setup', SETUPS)}<div class="small">RACE STRATEGY</div>${opt('strat', STRATS)}<div class="small">PIT PLAN ON CAUTIONS</div>${opt('pit', PITS)}
      <div class="row" style="margin-top:6px">${btn('lgSubmit', '', T(d.picks[me()] ? 'UPDATE PICKS >' : 'SUBMIT PICKS >', 2), 'green wide')}</div>
      <div class="tiny" style="margin-top:4px">CASH ${U.money(cash(d, me()))} · BUY UPGRADES IN MY TEAM. THE RACE RUNS WHEN EVERY OWNER IS IN.</div></div>`;
    return `<div class="cols"><div class="col">${left}</div><div class="col">${right}</div></div>`;
  }
  function nameOf(d, res, id) {
    if (id.startsWith('L_')) { const x = res.inp.find(y => ownerId(y.u) === id); const dv = x && pool(d.code)[x.t.drv]; return x ? { num: x.t.num, drv: dShort(dv), team: x.t.name, body: livery(x.t).body, own: true, me: x.u === me(), x } : { num: '?', drv: '?', team: '?', body: '#333' }; }
    const a = aiField(d.code, res.inp.map(x => x.t.num)).find(y => y.id === id); return a ? { num: a.number, drv: dShort(a.d), team: a.name, body: a.livery.body } : { num: '?', drv: '?', team: '?', body: '#333' };
  }
  function headlines(d, res) {
    const r = rows(res), out = []; const w = nameOf(d, res, r[0].id);
    out.push('#' + w.num + ' ' + w.drv.toUpperCase() + ' WINS FOR ' + w.team + (w.own ? ' - A LEAGUE OWNER!' : '.'));
    const ml = r.slice().sort((a, b) => b.led - a.led)[0]; if (ml && ml.led) { const n = nameOf(d, res, ml.id); out.push('#' + n.num + ' ' + n.drv.toUpperCase() + ' LED THE MOST LAPS (' + ml.led + ').'); }
    const own = r.filter(x => x.id.startsWith('L_')); const mv = own.slice().sort((a, b) => (b.grid - b.pos) - (a.grid - a.pos))[0];
    if (mv && mv.grid - mv.pos > 0) { const n = nameOf(d, res, mv.id); out.push(n.team + ' CHARGED FROM P' + mv.grid + ' TO P' + mv.pos + '.'); }
    for (const x of own.filter(o => o.st !== 'RUNNING')) out.push(nameOf(d, res, x.id).team + ' IS OUT: ' + x.st + '.');
    out.push(res.cau + ' CAUTION' + (res.cau === 1 ? '' : 'S') + (res.log && res.log.some(l => /^CAUTION/.test(l) && !/END OF STAGE/.test(l)) ? ' · ' + res.log.filter(l => /^CAUTION/.test(l) && !/END OF STAGE/.test(l)).slice(0, 2).join(' · ') : '') + '.');
    for (const x of res.inp.filter(y => y.fb)) out.push(x.t.name + ' MISSED THE DEADLINE - LAST WEEK\'S PICKS USED.');
    return out;
  }
  function resTab(d) {
    if (!d.res.length) return '<div class="panel">NO RACES RUN YET.</div>';
    const i = st.ri === undefined || st.ri >= d.res.length ? d.res.length - 1 : st.ri; const res = d.res[i];
    const pick = `<div class="row lg-tabs">${d.res.map((x, k) => btn('lgRi', k, 'R' + (k + 1), k === i ? 'orange' : 'dark', k === i)).join('')}</div>`;
    const tbl = `<table class="tbl"><tr><th>POS</th><th>#</th><th>DRIVER</th><th>TEAM</th><th>ST</th><th>LED</th><th>STATUS</th><th>PTS</th></tr>${rows(res).map(r => { const n = nameOf(d, res, r.id);
      return `<tr class="${n.me ? 'me' : n.own ? 'me me2' : ''}"><td>${r.pos}</td><td><span class="tag" style="background:${n.body}">${n.num}</span></td><td>${U.esc(n.drv)}</td><td class="tiny">${U.esc(n.team)}</td><td>${r.grid}</td><td>${r.led}</td><td>${U.esc(r.st)}</td><td>${n.own ? pts(r) : ''}</td></tr>`; }).join('')}</table>`;
    return `${pick}<div class="cols"><div class="col narrow"><div class="panel"><div class="tiny">RACE ${i + 1} · ${trk(res.tid).name}</div>${T(trk(res.tid).short, 3, SH)}
      <ul class="lg-heads">${headlines(d, res).map(h => `<li>${U.esc(h)}</li>`).join('')}</ul>${btn('lgReplay', i, T('WATCH REPLAY >', 2), 'red wide')}</div></div><div class="col"><div class="panel" style="padding:4px">${tbl}</div></div></div>`;
  }
  function standTab(d) {
    const s = standings(d); const lead = s.length ? s[0].pts : 0;
    return `<div class="panel" style="padding:4px"><div class="tiny" style="padding:4px">CUP-STYLE POINTS: 40 FOR A WIN DOWN TO 1, PLUS STAGE POINTS (TOP 10 IN EACH STAGE). ${d.res.length} OF ${d.meta.sched.length} RACES RUN.</div>
      <table class="tbl"><tr><th>POS</th><th>TEAM</th><th>OWNER</th><th>PTS</th><th>GAP</th><th>W</th><th>T5</th><th>LED</th><th>LAST</th><th>CASH</th></tr>${s.map((r, i) => `<tr class="${r.u === me() ? 'me' : ''}"><td>${i + 1}</td><td>${ownerTag(d, r.u)}</td><td class="tiny">${U.esc(r.u.toUpperCase())}${d.meta.by === r.u ? ' (C)' : ''}</td><td>${r.pts}</td><td>${i ? '-' + (lead - r.pts) : '--'}</td><td>${r.wins}</td><td>${r.t5}</td><td>${r.led}</td><td>${r.last ? 'P' + r.last : '-'}</td><td>${U.moneyShort(cash(d, r.u))}</td></tr>`).join('')}</table></div>`;
  }
  function schedTab(d) {
    return `<div class="lg-sched">${d.meta.sched.map((tid, i) => { const res = d.res[i]; const w = res ? nameOf(d, res, res.ord[0][0]) : null; const ev = DATA.eventName(SI, i + 1, d.meta.sched);
      return `<div class="panel lg-wk ${i === d.cur ? 'red' : ''}"><div class="tiny">RACE ${i + 1}${ev ? ' · ' + ev : ''}</div>${T(trk(tid).short, 2, SH)}<div class="tiny">${DATA.typeName(tid)}</div><div class="small">${w ? 'WIN: #' + w.num + ' ' + U.esc(w.drv) : i === d.cur ? 'NEXT UP' : '-'}</div></div>`; }).join('')}</div>`;
  }

  // ---------- replay (same seed, same fixed step => the same race) ----------
  function replay(i) {
    const d = st.d, res = d && d.res[+i]; if (!res) return;
    let b; try { b = build(d.code, res.i, res.tid, res.inp); } catch (e) { console.error(e); return H.toast('REPLAY COULD NOT START'); }
    UI.ui.screen = 'lgReplay'; st.view = 'lgReplay';
    const R = st.rv = { b, speed: 4, acc: 0, stop: false, res, myId: ownerId(me()) };
    H.render(`<div class="screen race rx2"><div class="race-main full lg-rp"><canvas id="rc"></canvas><div class="lg-rtop ol1" id="lgtop"></div><div class="lg-tower" id="lgtw"></div>
      <div class="lg-rbtns">${[1, 4, 16].map(s => btn('lgSpeed', s, s + 'X', 'dark', s === 4)).join('')}${btn('lgSkip', '', 'END', 'dark')}${btn('lgExit', '', 'EXIT', 'red')}</div></div></div>`);
    R.view = new Renderer.RaceView($('#rc'), b.race); R.view.followId = R.myId; R.view.setInsets(150, 0, 30, 0);
    let last = performance.now(), tw = 0;
    const loop = (ts) => {
      if (R.stop || st.rv !== R || UI.ui.screen !== 'lgReplay') { R.stop = true; return; }
      const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; R.acc += dt * R.speed;
      let n = 0; while (R.acc >= DT && b.race.phase !== 'done' && n++ < 600) { b.step(DT); R.acc -= DT; }
      try { R.view.draw(dt); } catch (e) { console.error(e); }
      tw += dt; if (tw > 0.25) { tw = 0; tower(R); }
      if (b.race.phase === 'done' && !R.fin) { R.fin = true; tower(R); }
      requestAnimationFrame(loop);
    };
    tower(R); requestAnimationFrame(loop);
  }
  function tower(R) {
    const race = R.b.race, top = $('#lgtop'), tw = $('#lgtw'); if (!top || !tw) return;
    const lap = Math.min(race.laps, race.leaderLaps() + 1);
    top.innerHTML = `${U.esc(race.geom.def.short)} · ${race.phase === 'done' ? 'FINAL' : 'LAP ' + lap + '/' + race.laps} · <span class="${race.flag === 'yellow' ? 'yl' : 'gr'}">${race.phase === 'done' ? 'CHECKERED' : race.flag === 'yellow' ? 'CAUTION' : 'GREEN'}</span>`;
    const ord = race.order(); const own = ord.map((c, k) => [c, k]).filter(([c]) => c.isPlayer);
    const show = ord.slice(0, 10).map((c, k) => [c, k]).concat(own.filter(([, k]) => k >= 10));
    tw.innerHTML = show.map(([c, k]) => `<div class="${c.isPlayer ? 'own' : ''} ${c.id === R.myId ? 'mine' : ''}"><b>${k + 1}</b><span class="tag" style="background:${c.e.livery.body}">${c.e.number}</span>${U.esc(c.e.driverShort)}${c.status === 'dnf' ? ' OUT' : ''}</div>`).join('')
      + (R.fin ? btn('lgExit', '', 'RESULTS >', 'green wide') : '');
    if (R.fin && !R.checked) { R.checked = true; R.match = ord.map(c => c.id).join() === R.res.ord.map(o => o[0]).join(); }
  }
  function stopReplay() { if (st.rv) { st.rv.stop = true; st.rv = null; } }

  // ---------- champion ----------
  function champ() {
    const d = st.d; if (!d || !d.done) return;
    const s = standings(d); const lastRes = d.res[d.res.length - 1];
    const top = s.slice(0, 3).map(r => { const t = d.teams[r.u]; const dv = t ? pool(d.code)[t.drv] : null; return t ? { livery: livery(t), number: t.num, driver: dShort(dv), isPlayer: r.u === me(), sub: r.pts + ' PTS' } : null; }).filter(Boolean);
    if (top.length < 3) { for (const o of rows(lastRes)) { if (top.length >= 3) break; if (!o.id.startsWith('L_')) { const n = aiField(d.code, lastRes.inp.map(x => x.t.num)).find(a => a.id === o.id); top.push({ livery: n.livery, number: n.number, driver: dShort(n.d), isPlayer: false, sub: 'AI' }); } } }
    UI.ui.screen = 'lgChamp'; st.view = 'lgChamp';
    H.render(`<div class="screen podium-screen" data-act="lgTab" data-arg="stand"><canvas id="pod" class="pix"></canvas><button class="btn green pod-go" data-act="lgTab" data-arg="stand">${T('STANDINGS >', 2)}</button></div>`);
    const w = d.teams[s[0].u];
    const sc = new Podium.Scene($('#pod'), { champ: true, top, title: d.meta.name + ' CHAMPION', sub: (s[0].u === me() ? 'YOU WIN THE LEAGUE! ' : '') + '#' + w.num + ' ' + w.name });
    let last = performance.now();
    const loop = (ts) => { if (UI.ui.screen !== 'lgChamp') return; const dt = Math.min(0.05, (ts - last) / 1000); last = ts; sc.step(dt); sc.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  // ---------- wiring ----------
  const readTB = () => { const i = $('#lg-team'); if (i && st.tb) st.tb.name = i.value.toUpperCase().slice(0, 22); };
  const readForm = () => { const i = $('#lg-name'); if (i && st.form) st.form.name = i.value.toUpperCase().slice(0, 22); };
  function nameErr(v) { v = String(v || '').trim(); if (!v) return 'TYPE A NAME FIRST.'; if (!/[A-Z0-9]/i.test(v)) return 'USE LETTERS OR NUMBERS.'; if (!DATA.nameOk(v)) return 'THAT NAME IS NOT ALLOWED. PICK ANOTHER ONE.'; return null; }
  const acts = {
    lgNoop: () => {},
    lgOpen: (c) => { stopReplay(); if (c) { st.tab = 'race'; st.ri = undefined; st.tb = null; return open(c); } st.code = null; st.d = null; lobby(); },
    lgLen: (n) => { readForm(); st.form.len = +n; lobby(); },
    lgMax: (n) => { readForm(); st.form.max = U.clamp(st.form.max + +n, 2, 8); lobby(); },
    lgCreate: () => { readForm(); const e = nameErr(st.form.name); if (e) return H.toast(e);
      run(GJ.store.auth().then(a => { if (!a) throw new Error('signed out'); return create(st.form.name.trim(), st.form.len, st.form.max); }), code => { st.form = null; st.tab = 'team'; H.toast('LEAGUE CREATED! CODE ' + code); open(code); }); },
    lgJoin: () => { const c = ($('#lg-code') || {}).value; run(GJ.store.auth().then(a => { if (!a) throw new Error('signed out'); return join(c); }), e => { if (e) return H.toast(e); const code = String(c).toUpperCase().replace(/[^A-Z0-9]/g, ''); st.tab = 'team'; st.tb = null; H.toast('WELCOME TO THE LEAGUE!'); open(code); }); },
    lgTab: (t) => { st.tab = t; view(); },
    lgRefresh: () => open(st.code),
    lgRi: (i) => { st.ri = +i; view(); },
    lgNum: (n) => { readTB(); st.tb.num = ((st.tb.num - 1 + +n + 99) % 99) + 1; view(); },
    lgMk: (m) => { readTB(); st.tb.mk = m; view(); },
    lgDrv: (i) => { readTB(); st.tb.drv = +i; view(); },
    lgEditTeam: () => { const t = st.d.teams[me()]; st.tb = { name: t.name, num: t.num, mk: t.mk, drv: t.drv }; view(); },
    lgSaveTeam: () => { readTB(); const tb = st.tb; const e = nameErr(tb.name) || (tb.drv < 0 ? 'PICK A DRIVER.' : null); if (e) return H.toast(e);
      run(load(st.code).then(d => { st.d = d; return saveTeam(d, { name: tb.name.trim(), num: tb.num, mk: tb.mk, drv: tb.drv }); }), e2 => { if (e2) { H.toast(e2); return view(); } st.tb = null; st.tab = 'race'; H.toast('TEAM SAVED!'); view(); }); },
    lgBuy: (k) => run(buyUp(st.d, k), e => { if (e) return H.toast(e); H.toast(UPS[k] + ' UPGRADED!'); view(); }),
    lgPick: (a) => { const [g, k] = a.split('|'); st.pick[g] = k; view(); },
    lgSubmit: () => run(submit(st.d, st.pick).then(e => e || load(st.code).then(d => { st.d = d; return resolve(d, false); }).then(r => r ? 'RAN' : null)),
      e => { if (e === 'RAN') { H.toast('EVERYONE IS IN - RACE RESOLVED!'); st.tab = 'res'; st.ri = undefined; return open(st.code); } if (e) return H.toast(e); H.toast('PICKS SENT!'); view(); }),
    lgRun: () => H.confirmBox('RUN RACE ' + (st.d.cur + 1) + ' NOW? OWNERS WITHOUT PICKS USE THEIR LAST PICKS.', 'RUN RACE', () => { H.closeModal();
      run(load(st.code).then(d => { st.d = d; return resolve(d, true); }), r => { if (!r) return H.toast('NO TEAMS TO RACE YET.'); H.toast('RACE RESOLVED!'); st.tab = 'res'; st.ri = undefined; open(st.code); }); }),
    lgReplay: (i) => replay(i),
    lgSpeed: (s) => { if (st.rv) st.rv.speed = +s; document.querySelectorAll('[data-act=lgSpeed]').forEach(b => b.classList.toggle('sel', b.dataset.arg === String(s))); },
    lgSkip: () => { const R = st.rv; if (!R) return; let g = 0; while (R.b.race.phase !== 'done' && g++ < 400000) R.b.step(DT); },
    lgExit: () => { stopReplay(); st.tab = 'res'; view(); },
    lgChamp: () => champ(),
  };
  const screens = { league: lobby, lgView: () => view(), lgReplay: () => { if (st.rv && st.rv.view) st.rv.view.resize(); }, lgChamp: champ };
  UI.extend(screens, acts);
  return { load, resolve, simulate, build, standings, pool, aiField, seedOf, st, stopReplay, DT };
})();
