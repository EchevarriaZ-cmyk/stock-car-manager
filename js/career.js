/* Career, team, driver market, scouting, sponsors, finances, save/load */
'use strict';
const Game = (() => {
  const SAVE_KEY = 'scm_save_v1';
  const SAVE_VERSION = 2; // 1 = v1.0, 2 = v1.1
  const ABIL = ['speed', 'cons', 'craft', 'tires', 'fuel', 'pit'];
  let S = null;
  const ser = () => DATA.SERIES[S.seriesIdx];
  const news = (text) => { S.news.unshift({ s: S.season, w: S.week, text }); if (S.news.length > 50) S.news.pop(); };
  const blankStanding = () => ({ pts: 0, wins: 0, top5: 0, top10: 0, stageWins: 0, pp: 0, dnf: 0, best: 99, starts: 0, sumFin: 0 });

  // ---------- trophies (v1.1) ----------
  const fresh = []; // trophies earned since the last race summary
  const MS = () => Object.fromEntries(DATA.MILESTONES.concat(DATA.CUP_TROPHIES).map(m => [m[0], m]));
  function trophyName(key) {
    const [t, a] = key.split(':');
    if (t === 'win') return 'WIN: ' + DATA.TRACKS[a].short; if (t === 'pod') return 'PODIUM: ' + DATA.TRACKS[a].short;
    if (t === 'title') return DATA.SERIES[+a].short + ' CHAMPION'; if (t === 'promo') return 'MOVED UP: ' + DATA.SERIES[+a].short;
    const m = MS()[key]; return m ? m[1] : key;
  }
  function trophyCount(key) { return S.trophies ? S.trophies.log.filter(e => e.k === key).length : 0; }
  // once: milestone-style trophies only count the first time
  function award(key, info, once) {
    if (!S.trophies) S.trophies = { log: [], unseen: 0 };
    if (once && trophyCount(key)) return null;
    const e = Object.assign({ k: key, s: S.season, y: S.year, w: S.week, series: S.seriesIdx }, info || {});
    S.trophies.log.push(e); if (S.trophies.log.length > 1500) S.trophies.log.splice(0, S.trophies.log.length - 1500);
    if (trophyCount(key) === 1) { S.trophies.unseen = (S.trophies.unseen || 0) + 1; fresh.push(e); news('TROPHY UNLOCKED: ' + trophyName(key) + '!'); }
    return e;
  }
  function teamWins() { return S.trophies ? S.trophies.log.filter(e => e.k.startsWith('win:')).length : 0; }

  // ---------- drivers ----------
  function driverTypeRating(d, type) {
    if (type === 'short') return 0.35 * d.speed + 0.35 * d.craft + 0.2 * d.cons + 0.1 * d.tires;
    if (type === 'intermediate') return 0.45 * d.speed + 0.2 * d.craft + 0.15 * d.cons + 0.2 * d.tires;
    if (type === 'superspeedway') return 0.25 * d.speed + 0.45 * d.craft + 0.2 * d.cons + 0.1 * d.fuel;
    return 0.45 * d.speed + 0.25 * d.craft + 0.2 * d.cons + 0.1 * d.tires;
  }
  function ovr(d) { return Math.round(0.3 * d.speed + 0.22 * d.craft + 0.2 * d.cons + 0.12 * d.tires + 0.08 * d.fuel + 0.08 * d.pit); }
  function genDriver(lo, hi, tierIdx) {
    const base = U.rand(lo, hi); const v = () => Math.round(U.clamp(base + U.gauss() * 6, 15, 99));
    const age = U.randi(17, 40);
    const d = { id: U.uid('d'), first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), age, speed: v(), cons: v(), craft: v(), tires: v(), fuel: v(), pit: v(), aggr: U.randi(20, 90),
      potential: 0, contract: 0, salary: 0, team: null, morale: 70 };
    d.potential = Math.round(U.clamp(Math.max(ovr(d), base + (age < 23 ? U.rand(5, 22) : age < 28 ? U.rand(0, 10) : 0)), 20, 99));
    d.salary = askSalary(d, tierIdx);
    return d;
  }
  // v1.0 drivers had speed/craft/cons/tires/ss/road. Give them the new stats.
  function migrateDriver(d) {
    if (!d || d.fuel !== undefined) return;
    const ss = d.ss === undefined ? d.craft : d.ss;
    d.craft = Math.round(U.clamp(0.7 * d.craft + 0.3 * ss, 15, 99));
    d.fuel = Math.round(U.clamp((d.cons + d.tires) / 2 + U.gauss() * 5, 15, 99));
    d.pit = Math.round(U.clamp((d.craft + d.cons) / 2 + U.gauss() * 6, 15, 99));
    d.aggr = U.randi(25, 85);
    delete d.ss; delete d.road;
    if (d.morale === undefined) d.morale = 70;
    d.potential = Math.max(d.potential || 0, ovr(d));
  }
  function askSalary(d, tierIdx) {
    const s = DATA.SERIES[tierIdx === undefined ? S.seriesIdx : tierIdx]; const o = ovr(d);
    let v = s.salaryBase * (800 + Math.pow(Math.max(0, o - 30), 2) * 6);
    if (d.age < 22) v *= 0.8; if (d.potential - o > 10) v *= 1.1;
    return Math.round(v / 100) * 100;
  }
  function potStars(p) { return U.clamp(Math.round((p - 20) / 16), 1, 5); }
  function minRepFor(d) { const s = ser(); return Math.max(0, Math.round((ovr(d) - s.aiDrv[0]) * 1.4 - 12)); }
  function driverName(d) { return d ? d.first + ' ' + d.last : 'NO DRIVER'; }
  function driverShort(d) { return d ? d.first[0] + '. ' + d.last : '---'; }

  // ---------- team cars ----------
  // car 1 is entry 'P', car 2 (v1.1) is entry 'P2'
  function teamCars() {
    if (!S || !S.team) return [];
    const t = S.team; const out = [{ slot: 1, id: 'P', number: t.number, driverId: t.driverId }];
    if (t.car2) out.push({ slot: 2, id: 'P2', number: t.car2.number, driverId: t.car2.driverId });
    return out;
  }
  const isTeamId = id => id === 'P' || id === 'P2';
  function carDriver(slot) { const id = slot === 2 ? (S.team.car2 && S.team.car2.driverId) : S.team.driverId; return id ? S.drivers[id] || null : null; }
  function myDriver() { return carDriver(1); }
  function carLivery(slot) {
    const p = slot === 2 ? S.team.car2 && S.team.car2.primary : S.team.sponsors.primary;
    if (p) return { body: p.colors[0], stripe: p.colors[1], num: '#141414' };
    return { body: S.team.colors.body, stripe: S.team.colors.stripe, num: '#141414' };
  }
  function myLivery() { return carLivery(1); }
  function teamDriverIds() { const t = S.team; return [t.driverId, t.car2 && t.car2.driverId].concat(t.dev || []).filter(Boolean); }
  function slotOf(id) { const t = S.team; if (t.driverId === id) return 'car1'; if (t.car2 && t.car2.driverId === id) return 'car2'; if ((t.dev || []).includes(id)) return 'dev'; return null; }

  // ---------- teams ----------
  function randLivery() { const b = U.pick(DATA.BODY_COLORS); let s = U.pick(DATA.BODY_COLORS); while (s === b) s = U.pick(DATA.BODY_COLORS); return { body: b, stripe: s, num: '#141414' }; }
  function teamName(used) { let n; do { n = U.pick(DATA.TEAM_A) + ' ' + U.pick(DATA.TEAM_B); } while (used.has(n)); used.add(n); return n; }
  function usedNumbers() { const u = new Set(); if (S.team) { u.add(S.team.number); if (S.team.car2) u.add(S.team.car2.number); } for (const t of S.ai || []) u.add(t.number); return u; }
  function genAITeams(tierIdx, count, used) {
    const s = DATA.SERIES[tierIdx]; const teams = []; const taken = usedNumbers(); const nums = U.shuffle([...Array(99).keys()].map(i => i + 1).filter(n => !taken.has(n)));
    used = used || new Set([S.team.name].concat((S.ai || []).map(a => a.name)));
    for (let i = 0; i < count; i++) {
      const strength = Math.pow(Math.random(), 1.15);
      const car = U.lerp(s.aiCar[0], s.aiCar[1], strength);
      const d = genDriver(U.lerp(s.aiDrv[0], s.aiDrv[1], strength) - 5, U.lerp(s.aiDrv[0], s.aiDrv[1], strength) + 5, tierIdx);
      d.contract = U.randi(1, 3);
      const sp = U.pick(DATA.SPONSORS);
      const t = { id: U.uid('t'), name: teamName(used), number: nums[i], car, typeVar: { short: U.rand(-4, 4), intermediate: U.rand(-4, 4), superspeedway: U.rand(-4, 4), road: U.rand(-5, 5) },
        driverId: d.id, crew: U.clamp(0.4 + strength * 0.5 + U.rand(-0.1, 0.1), 0.3, 0.98), sponsor: sp[0], livery: U.chance(0.75) ? { body: sp[1], stripe: sp[2], num: '#141414' } : randLivery() };
      d.team = t.id; S.drivers[d.id] = d; teams.push(t);
    }
    return teams;
  }
  // keep the field at the series size: team cars + AI cars = series cars
  function syncField() {
    const want = ser().cars - teamCars().length;
    const prot = new Set(S.playoff ? S.playoff.ids : []);
    while (S.ai.length > want) {
      const pool = S.ai.filter(t => !prot.has(t.id)); const list = pool.length ? pool : S.ai;
      const worst = list.reduce((a, t) => ((S.standings[t.id] || {}).pts || 0) < ((S.standings[a.id] || {}).pts || 0) ? t : a);
      S.ai = S.ai.filter(t => t !== worst); delete S.standings[worst.id]; if (S.drivers[worst.driverId] && S.drivers[worst.driverId].team === worst.id) delete S.drivers[worst.driverId];
    }
    if (S.ai.length < want) S.ai = S.ai.concat(genAITeams(S.seriesIdx, want - S.ai.length));
    const ids = entryIds();
    for (const id of ids) if (!S.standings[id]) S.standings[id] = blankStanding();
    for (const id of Object.keys(S.standings)) if (!ids.includes(id)) delete S.standings[id];
  }
  function genFreeAgents(n) {
    const s = ser();
    for (let i = 0; i < n; i++) { const d = genDriver(s.aiDrv[0] - 10, s.aiDrv[1] - 2, S.seriesIdx); S.drivers[d.id] = d; S.freeAgents.push(d.id); }
  }
  // cheap young drivers so a broke team can always field a car
  function genRookies(n) {
    for (let i = 0; i < n; i++) {
      const d = genDriver(24, 36, S.seriesIdx); d.age = U.randi(16, 19); d.potential = Math.round(U.clamp(ovr(d) + U.rand(12, 30), 30, 92));
      d.salary = Math.min(d.salary, Math.round(ser().salaryBase * 800 / 100) * 100); d.rookie = true; S.drivers[d.id] = d; S.freeAgents.push(d.id);
    }
  }
  function hasCar() { return !S.team || S.team.hasCar !== false; }
  function buyCar(id) {
    const c = DATA.USED_CARS.find(x => x.id === id); if (!c) return 'UNKNOWN CAR';
    if (hasCar()) return 'YOU ALREADY HAVE A CAR.';
    if (S.money < c.price) return 'NOT ENOUGH MONEY.';
    const f = ser().floor; S.money -= c.price; S.team.hasCar = true;
    for (const k of ['engine', 'aero', 'chassis']) S.team.parts[k] = f + c.parts[k];
    news(S.team.name + ' BUYS A ' + c.name + ' FOR ' + U.money(c.price) + '. IT AIN\'T PRETTY BUT IT\'S OURS.');
    save(); return null;
  }
  // ---------- second car ----------
  function car2Price() { return Math.round(DATA.CAR2.price * Math.pow(ser().mult, 0.9) / 1000) * 1000; }
  function car2RunCost() { return Math.round((DATA.CAR2.runBase * ser().mult + travelCost() * 0.7) / 100) * 100; }
  function car2Status() {
    const price = car2Price(); const rep = DATA.CAR2.rep;
    const r = { price, rep, run: car2RunCost(), owned: !!S.team.car2, hasCar: hasCar(), repOk: S.rep >= rep, cashOk: S.money >= price };
    r.ok = !r.owned && r.hasCar && r.repOk && r.cashOk; return r;
  }
  function freeNumber(pref) { const u = usedNumbers(); let n = pref; for (let i = 0; i < 99; i++) { const k = ((n - 1 + i) % 99) + 1; if (!u.has(k)) return k; } return pref; }
  function buyCar2() {
    const st = car2Status();
    if (st.owned) return 'YOU ALREADY RUN TWO CARS.';
    if (!st.hasCar) return 'BUY YOUR FIRST CAR FIRST.';
    if (!st.repOk) return 'SPONSORS AND OFFICIALS WANT TEAM REP ' + st.rep + ' BEFORE A 2ND ENTRY (YOU: ' + Math.round(S.rep) + ').';
    if (!st.cashOk) return 'NOT ENOUGH MONEY (' + U.money(st.price) + ').';
    S.money -= st.price;
    S.team.car2 = { number: freeNumber(S.team.number + 1), driverId: null, primary: null }; award('twoCars', { num: S.team.car2.number }, true);
    syncField();
    news(S.team.name + ' EXPANDS TO TWO CARS! THE #' + S.team.car2.number + ' NEEDS A DRIVER.');
    save(); return null;
  }
  function sellCar2() {
    const c2 = S.team.car2; if (!c2) return;
    const refund = Math.round(car2Price() * 0.4 / 100) * 100; S.money += refund;
    if (c2.driverId) { const d = S.drivers[c2.driverId]; if (d) { if ((S.team.dev || []).length < DATA.DEV_MAX) { S.team.dev.push(d.id); news(driverName(d).toUpperCase() + ' MOVES TO A DEVELOPMENT DEAL.'); } else releaseDriver(d.id, true); } }
    if (c2.primary) news(c2.primary.name + ' ENDS ITS DEAL WITH THE #' + c2.number + '.');
    S.team.car2 = null; syncField();
    news(S.team.name + ' SELLS THE #' + c2.number + ' CAR FOR ' + U.money(refund) + '.'); save();
  }

  function effParts() { const p = S.team.parts, f = S.team.fac; return { engine: p.engine + f.engineDept * 1.5, aero: p.aero, chassis: p.chassis }; }
  function carRating(type) { const w = DATA.PART_W[type], e = effParts(); return w.engine * e.engine + w.aero * e.aero + w.chassis * e.chassis; }
  function carOverall() { return Math.round((carRating('short') + carRating('intermediate') + carRating('superspeedway') + carRating('road')) / 4); }
  function fieldAvgCar() { return S.ai.reduce((a, t) => a + t.car, 0) / S.ai.length; }
  function carRank() { const mine = carOverall(); return 1 + S.ai.filter(t => t.car > mine).length; }

  // ---------- new career ----------
  function newCareer(o) {
    S = { version: SAVE_VERSION, mode: o.mode, profile: o.profile || 'MANAGER', xp: 0, level: 1, rep: o.mode === 'hired' ? 15 : 12,
      season: 1, year: 2027, seriesIdx: 0, week: 1, day: 1, money: 0, ep: 20,
      team: null, drivers: {}, freeAgents: [], ai: [], offers: [], schedule: [], results: [], standings: {}, news: [], history: [],
      realTracks: true, hired: null, playoff: null, jobOffers: [], trophies: { log: [], unseen: 0 }, stats: { races: 0, wins: 0, top5: 0, top10: 0, top15: 0, poles: 0, titles: 0 }, seasonOver: false, gameOver: false, tutorial: true,
      scout: { list: [], week: 0, trips: 0 } };
    const s = DATA.SERIES[0];
    if (o.mode === 'owner') {
      S.team = { name: o.teamName || 'ZION RACING', number: o.number || 7, colors: o.colors || { body: '#d9342b', stripe: '#f2d22e' }, hasCar: false,
        parts: { engine: s.floor - 6, aero: s.floor - 6, chassis: s.floor - 6 }, fac: { shop: 1, engineDept: 1, simulator: 1, pitCenter: 1 },
        builds: [], rnd: [], driverId: null, sponsors: { primary: null, assoc: [null, null] }, car2: null, dev: [] };
      S.money = 15000; S.rep = 0;
      S.ai = genAITeams(0, s.cars - 1);
      genFreeAgents(11); genRookies(4);
      news('WELCOME, OWNER ' + S.profile.toUpperCase() + '! ' + S.team.name + ' IS A $15K DREAM IN AN EMPTY SHOP.');
      news('BUY A CAR, HIRE A DRIVER, GO RACE - SPONSORS WILL COME WHEN YOU GET RESULTS.');
    } else {
      const job = o.job;
      installJobTeam(job);
      S.ai = genAITeams(0, s.cars - teamCars().length);
      genFreeAgents(14);
      news(job.owner + ' HIRES ' + S.profile.toUpperCase() + ' TO RUN ' + job.name + '. TARGET: AVG FINISH ' + job.target + 'TH OR BETTER.');
    }
    S.schedule = DATA.CALENDARS[0].slice();
    resetStandings();
    refreshOffers();
    save();
    return S;
  }
  function installJobTeam(job) {
    S.team = { name: job.name, number: job.number, colors: { body: job.livery.body, stripe: job.livery.stripe }, hasCar: true, parts: Object.assign({}, job.parts), fac: Object.assign({}, job.fac),
      builds: [], rnd: [], driverId: null, sponsors: { primary: job.sponsor || null, assoc: [null, null] }, car2: null, dev: [] };
    S.money = job.budget;
    S.hired = { team: job.name, confidence: 60, target: job.target, owner: job.owner };
    const d = job.driver; migrateDriver(d); d.team = 'P'; d.contract = Math.max(1, d.contract || 1); S.drivers[d.id] = d; S.team.driverId = d.id;
    if (job.driver2) {
      const d2 = job.driver2; migrateDriver(d2); d2.team = 'P'; d2.contract = Math.max(1, d2.contract || 1); S.drivers[d2.id] = d2;
      S.team.car2 = { number: job.number2 || ((job.number % 99) + 1), driverId: d2.id, primary: null };
    }
  }
  function genJob(tierIdx, quality, curRep) {
    const s = DATA.SERIES[tierIdx]; const q = quality; // 0..1
    const sp = U.chance(0.5 + q * 0.4) ? genSponsor('primary', tierIdx, curRep || 20) : null;
    const lo = s.aiDrv[0], hi = s.aiDrv[1];
    const drv = genDriver(U.lerp(lo, hi, q * 0.8) - 6, U.lerp(lo, hi, q * 0.8) + 4, tierIdx);
    const used = new Set();
    const job = { id: U.uid('j'), seriesIdx: tierIdx, name: teamName(used), number: U.randi(2, 97), livery: randLivery(), owner: U.pick(DATA.FIRST).toUpperCase() + ' ' + U.pick(DATA.LAST).toUpperCase(),
      parts: { engine: Math.round(s.floor + q * 14 + U.rand(-2, 3)), aero: Math.round(s.floor + q * 14 + U.rand(-2, 3)), chassis: Math.round(s.floor + q * 14 + U.rand(-2, 3)) },
      fac: { shop: 1 + (q > 0.5 ? 1 : 0), engineDept: 1 + (q > 0.7 ? 1 : 0), simulator: 1 + (q > 0.6 ? 1 : 0), pitCenter: 1 + (q > 0.4 ? 1 : 0) },
      budget: Math.round(s.minBudget * U.rand(0.75, 1.05) / 1000) * 1000, target: Math.max(3, Math.round(s.cars * (0.75 - q * 0.45))), driver: drv, sponsor: sp };
    // v1.1: bigger teams in Trucks and up can run two cars
    if (tierIdx >= 1 && U.chance(0.3 + q * 0.4)) {
      job.driver2 = genDriver(U.lerp(lo, hi, q * 0.7) - 8, U.lerp(lo, hi, q * 0.7) + 2, tierIdx); job.number2 = job.number + 1;
      job.budget = Math.round(job.budget * 1.35 / 1000) * 1000;
    }
    return job;
  }

  // ---------- standings ----------
  function entryIds() { return teamCars().map(c => c.id).concat(S.ai.map(t => t.id)); }
  function resetStandings() { S.standings = {}; for (const id of entryIds()) S.standings[id] = blankStanding(); S.playoff = null; }
  function entryInfo(id) {
    if (isTeamId(id)) {
      const slot = id === 'P2' ? 2 : 1; const d = S.team.car2 || slot === 1 ? carDriver(slot) : null;
      const num = slot === 2 ? (S.team.car2 ? S.team.car2.number : 0) : S.team.number;
      return { id, slot, number: num, team: S.team.name, driver: driverName(d), driverShort: driverShort(d), livery: slot === 2 && !S.team.car2 ? myLivery() : carLivery(slot), isPlayer: true };
    }
    const t = S.ai.find(x => x.id === id); if (!t) return { id, number: 0, team: '?', driver: '?', driverShort: '?', livery: randLivery() };
    const d = S.drivers[t.driverId]; return { id, number: t.number, team: t.name, driver: driverName(d), driverShort: driverShort(d), livery: t.livery, isPlayer: false };
  }
  function standingsOrder() {
    const ids = Object.keys(S.standings);
    const cmp = (a, b) => { const A = S.standings[a], B = S.standings[b]; return B.pts - A.pts || B.wins - A.wins || A.best - B.best; };
    if (S.playoff) {
      const P = S.playoff;
      if (P.champion) {
        const f4 = P.final4.slice().sort((a, b) => a === P.champion ? -1 : b === P.champion ? 1 : (P.finalPos[a] || 99) - (P.finalPos[b] || 99));
        const restP = P.ids.filter(i => !P.final4.includes(i) && S.standings[i]).sort(cmp); const others = ids.filter(i => !P.ids.includes(i)).sort(cmp);
        return f4.filter(i => S.standings[i]).concat(restP, others);
      }
      const g1 = P.final4 ? P.final4.filter(i => S.standings[i]).sort(cmp) : []; const g2 = P.ids.filter(i => !g1.includes(i) && S.standings[i]).sort(cmp); const g3 = ids.filter(i => !P.ids.includes(i)).sort(cmp);
      return g1.concat(g2, g3);
    }
    return ids.sort(cmp);
  }
  function myStandingPos(id) { const p = standingsOrder().indexOf(id || 'P') + 1; return p || 99; }
  function teamBestPos() { return Math.min(...teamCars().map(c => myStandingPos(c.id))); }
  function teamBestId() { const cars = teamCars(); return cars.slice().sort((a, b) => myStandingPos(a.id) - myStandingPos(b.id))[0].id; }
  // Owner points: your cars add up, each AI team is one car
  function ownerStandings() {
    const mine = teamCars().filter(c => S.standings[c.id]);
    const rows = [{ id: 'TEAM', name: S.team.name, number: mine.map(c => c.number).join('/'), pts: mine.reduce((a, c) => a + S.standings[c.id].pts, 0), wins: mine.reduce((a, c) => a + S.standings[c.id].wins, 0), me: true, livery: myLivery() }];
    for (const t of S.ai) { const st = S.standings[t.id]; if (st) rows.push({ id: t.id, name: t.name, number: String(t.number), pts: st.pts, wins: st.wins, me: false, livery: t.livery }); }
    return rows.sort((a, b) => b.pts - a.pts || b.wins - a.wins);
  }

  // ---------- sponsors ----------
  function genSponsor(slot, tierIdx, rep) {
    const s = DATA.SERIES[tierIdx === undefined ? S.seriesIdx : tierIdx]; rep = rep === undefined ? S.rep : rep;
    const used = S && S.team ? allSponsors().concat(S.offers || []).map(x => x.name) : [];
    const pool = (tierIdx === undefined ? S.seriesIdx : tierIdx) === 0 && rep < 20 ? DATA.LOCAL_SPONSORS : DATA.SPONSORS;
    let sp; let guard = 0; do { sp = U.pick(pool); } while (used.includes(sp[0]) && guard++ < 50);
    const base = slot === 'primary' ? s.sponsorPrimary : s.sponsorAssoc;
    const perRace = Math.max(500, Math.round(base * (0.2 + Math.min(rep, 100) / 100 * 1.3) * U.rand(0.85, 1.2) / 100) * 100);
    const goals = [['finish', 0.15], ['top10', 0.45], ['top5', 0.9], ['win', 2.2], ['stage', 0.25], ['top15', 0.25]];
    const g = U.pick(goals);
    return { id: U.uid('s'), name: sp[0], colors: [sp[1], sp[2]], slot, perRace, races: U.randi(4, 10), goal: { type: g[0], bonus: Math.round(perRace * g[1] / 100) * 100 },
      signing: Math.round(perRace * U.rand(0.5, 1.5) / 100) * 100, weeksLeft: U.randi(2, 4), met: 0, done: 0 };
  }
  function goalText(g) {
    return ({ finish: 'FINISH THE RACE', top10: 'TOP-10 FINISH', top5: 'TOP-5 FINISH', win: 'WIN THE RACE', stage: 'TOP-10 IN A STAGE (EACH)', top15: 'TOP-15 FINISH' })[g.type] + ': +' + U.money(g.bonus);
  }
  // How many sponsor offers the team can attract, earned by results and reputation
  function sponsorInterest() {
    const st = S.stats; const pos = S.week > 3 ? teamBestPos() : 99; const N = ser().cars;
    const earned = (st.top10 || 0) >= 1 || (st.top15 || 0) >= 2 || st.wins > 0 || S.rep >= 8 || S.seriesIdx > 0 || S.mode === 'hired';
    if (!earned) return { slots: 0, primary: false };
    let slots = 1; if (S.rep >= 12 || (st.top10 || 0) >= 3) slots = 2; if (S.rep >= 25 || pos <= N * 0.4) slots = 3; if (S.rep >= 45 || st.wins > 0) slots = 4;
    if (S.team.car2) slots++;
    const primary = S.rep >= 15 || st.wins > 0 || (st.top10 || 0) >= 3 || pos <= 10 || S.seriesIdx > 0 || S.mode === 'hired';
    return { slots, primary };
  }
  function refreshOffers() {
    S.offers = S.offers.filter(o => o.weeksLeft > 0);
    const si = sponsorInterest();
    let guard = 0;
    while (S.offers.length < si.slots && guard++ < 10) S.offers.push(genSponsor(si.primary && U.chance(S.team.car2 ? 0.55 : 0.45) ? 'primary' : 'assoc'));
  }
  // car: 1 or 2 (which car a primary sponsor goes on)
  function signSponsor(id, car) {
    const o = S.offers.find(x => x.id === id); if (!o) return 'Offer gone';
    if (o.slot === 'primary') {
      if (car === 2) { if (!S.team.car2) return 'YOU DO NOT HAVE A 2ND CAR.'; if (S.team.car2.primary) return 'CAR 2 ALREADY HAS A PRIMARY SPONSOR.'; S.team.car2.primary = o; o.car = 2; }
      else {
        if (S.team.sponsors.primary) { if (S.team.car2 && !S.team.car2.primary && car === undefined) { S.team.car2.primary = o; o.car = 2; } else return 'Primary slot is full. Drop your primary sponsor first.'; }
        else { S.team.sponsors.primary = o; o.car = 1; }
      }
    } else { const i = S.team.sponsors.assoc.indexOf(null); if (i < 0) return 'Both associate slots are full.'; S.team.sponsors.assoc[i] = o; }
    S.money += o.signing; S.offers = S.offers.filter(x => x !== o); award('firstSponsor', { note: o.name }, true);
    news(o.name + ' SIGNS WITH ' + S.team.name + (o.car === 2 ? ' ON THE #' + S.team.car2.number : '') + ' (' + U.money(o.perRace) + '/RACE).');
    save(); return null;
  }
  function dropPenalty(sp) { return sp.perRace * 2; }
  function dropSponsor(slot, idx) {
    const sp = slot === 'primary' ? S.team.sponsors.primary : slot === 'primary2' ? S.team.car2 && S.team.car2.primary : S.team.sponsors.assoc[idx]; if (!sp) return;
    S.money -= dropPenalty(sp);
    if (slot === 'primary') S.team.sponsors.primary = null; else if (slot === 'primary2') S.team.car2.primary = null; else S.team.sponsors.assoc[idx] = null;
    news(S.team.name + ' AND ' + sp.name + ' PART WAYS. EXIT FEE ' + U.money(dropPenalty(sp)) + '.'); save();
  }
  function allSponsors() { if (!S.team) return []; return [S.team.sponsors.primary, S.team.car2 && S.team.car2.primary, ...S.team.sponsors.assoc].filter(Boolean); }

  // ---------- driver market ----------
  function fireCost(d) { const racesLeftThisSeason = 10 - (S.week - 1); return Math.round(d.salary * (racesLeftThisSeason + Math.max(0, d.contract - 1) * 10) * 0.4); }
  function removeFromTeam(id) {
    const t = S.team; if (t.driverId === id) t.driverId = null; if (t.car2 && t.car2.driverId === id) t.car2.driverId = null; t.dev = (t.dev || []).filter(x => x !== id);
  }
  function releaseDriver(id, quiet) {
    const d = S.drivers[id]; if (!d || !slotOf(id)) return; const c = fireCost(d); S.money -= c;
    removeFromTeam(id); d.team = null; d.contract = 0; d.morale = 40; if (!S.freeAgents.includes(id)) S.freeAgents.push(id);
    news(S.team.name + ' RELEASES ' + driverName(d).toUpperCase() + '. BUYOUT: ' + U.money(c) + '.'); if (!quiet) save();
  }
  function fireDriver() { if (S.team.driverId) releaseDriver(S.team.driverId); }
  function hireCost(d, years) { const ask = askSalary(d); return Math.round(ask * (years === 1 ? 1.1 : years === 2 ? 1.0 : 0.93) / 100) * 100; }
  function signingBonus(d, years) { const sal = hireCost(d, years); return sal <= 1200 * ser().salaryBase ? 0 : sal * 2; }
  function firstOpenSlot() { if (!S.team.driverId) return 'car1'; if (S.team.car2 && !S.team.car2.driverId) return 'car2'; return null; }
  function putInSlot(id, dest) {
    const t = S.team;
    if (dest === 'car1') t.driverId = id; else if (dest === 'car2') t.car2.driverId = id; else { t.dev = t.dev || []; t.dev.push(id); }
  }
  function slotOpen(dest) {
    const t = S.team; if (dest === 'car1') return !t.driverId; if (dest === 'car2') return !!t.car2 && !t.car2.driverId; if (dest === 'dev') return (t.dev || []).length < DATA.DEV_MAX; return false;
  }
  function hireDriver(id, years, dest) {
    const d = S.drivers[id]; if (!d) return 'Driver not found';
    dest = dest || firstOpenSlot();
    if (!dest) return S.team.car2 ? 'BOTH CARS HAVE DRIVERS. RELEASE ONE FIRST.' : 'Release your current driver first.';
    if (!slotOpen(dest)) return dest === 'dev' ? 'DEVELOPMENT ROSTER IS FULL (' + DATA.DEV_MAX + ').' : 'THAT SEAT IS TAKEN.';
    if (S.rep < minRepFor(d)) return d.first + ' wants a team with more reputation (needs ' + minRepFor(d) + ', you have ' + Math.round(S.rep) + ').';
    const sal = hireCost(d, years); const bonus = signingBonus(d, years);
    if (bonus > 0 && S.money < bonus) return 'NOT ENOUGH MONEY FOR THE SIGNING BONUS (' + U.money(bonus) + ').';
    S.money -= bonus; d.salary = sal; d.contract = years; d.team = 'P'; d.morale = 80; putInSlot(id, dest);
    S.freeAgents = S.freeAgents.filter(x => x !== id);
    news(S.team.name + ' SIGNS ' + driverName(d).toUpperCase() + (dest === 'car2' ? ' FOR THE #' + S.team.car2.number : dest === 'dev' ? ' TO A DEVELOPMENT DEAL' : '') + ' (' + years + ' YR, ' + U.money(sal) + '/RACE).'); save(); return null;
  }
  // move a team driver between car 1 / car 2 / development, swapping if the seat is taken
  function assignDriver(id, dest) {
    const from = slotOf(id); if (!from || from === dest) return null;
    const t = S.team;
    if (dest === 'car2' && !t.car2) return 'NO 2ND CAR.';
    const occupant = dest === 'car1' ? t.driverId : dest === 'car2' ? t.car2.driverId : null;
    if (dest === 'dev' && (t.dev || []).length >= DATA.DEV_MAX) return 'DEVELOPMENT ROSTER IS FULL.';
    removeFromTeam(id);
    if (occupant) { removeFromTeam(occupant); putInSlot(occupant, from); }
    putInSlot(id, dest);
    const d = S.drivers[id]; news(driverName(d).toUpperCase() + ' MOVES TO ' + (dest === 'car1' ? 'THE #' + t.number : dest === 'car2' ? 'THE #' + t.car2.number : 'THE DEVELOPMENT ROSTER') + '.');
    save(); return null;
  }

  // ---------- scouting ----------
  function scoutCost(tierId) { const t = DATA.SCOUTS.find(x => x.id === tierId); return Math.round(t.cost * Math.pow(ser().mult, 0.6) / 100) * 100; }
  function followCost() { return Math.round(scoutCost('local') * 1.2 / 100) * 100; }
  function scoutBonus() { return (S.team.fac.simulator - 1) * 0.06; }
  function scoutBusy() { return S.scout.week === S.season * 100 + S.week; }
  function prospects() { return S.scout.list.map(id => S.drivers[id]).filter(Boolean); }
  function genProspect(tier, feeder) {
    const base = U.rand(24, 38) + feeder.cur + S.seriesIdx * 4;
    const d = genDriver(base - 3, base + 3, S.seriesIdx);
    d.age = U.randi(feeder.age[0], feeder.age[1]);
    for (const k of Object.keys(feeder.bias)) d[k] = Math.round(U.clamp(d[k] + feeder.bias[k] + (k === 'aggr' ? 0 : U.rand(-2, 2)), 10, 99));
    const youth = U.clamp((24 - d.age) * 1.2, 0, 10);
    // national scouts find the gems; most kids are still just kids
    const gem = U.chance(0.12 + tier.potBoost / 100) ? U.rand(6, 14) : 0;
    d.potential = Math.round(U.clamp(ovr(d) + U.rand(4, 18) + feeder.pot * 0.6 + tier.potBoost * 0.5 + youth + gem, ovr(d) + 2, 95));
    d.salary = Math.max(500, Math.round(askSalary(d) * 0.7 / 100) * 100);
    const off = {}; for (const [k] of DATA.DRIVER_STATS) off[k] = U.rand(-1, 1); off.ovr = U.rand(-1, 1); off.pot = U.rand(-1, 1);
    d.pros = { k: U.clamp(tier.acc + scoutBonus() + U.rand(-0.05, 0.05), 0.1, 0.95), feeder: feeder.id, tier: tier.id, off, weeks: U.randi(3, 5), reports: 1 };
    return d;
  }
  function sendScout(tierId, feederId) {
    const tier = DATA.SCOUTS.find(x => x.id === tierId); const feeder = DATA.FEEDERS.find(x => x.id === feederId);
    if (!tier || !feeder) return 'PICK A SCOUT AND A SERIES.';
    if (scoutBusy()) return 'YOUR SCOUT IS OUT THIS WEEK. NEXT TRIP AFTER THE RACE.';
    const c = scoutCost(tierId); if (S.money < c) return 'NOT ENOUGH MONEY (' + U.money(c) + ').';
    S.money -= c; S.scout.week = S.season * 100 + S.week; S.scout.trips = (S.scout.trips || 0) + 1;
    const found = [];
    for (let i = 0; i < tier.n; i++) { const d = genProspect(tier, feeder); S.drivers[d.id] = d; S.scout.list.push(d.id); found.push(d); }
    while (S.scout.list.length > 8) { const old = S.scout.list.shift(); delete S.drivers[old]; }
    news(tier.name + ' BACK FROM THE ' + feeder.name + ' WITH ' + found.length + ' PROSPECTS. CHECK DRIVERS > SCOUTING.');
    save(); return null;
  }
  function scoutAgain(id) {
    const d = S.drivers[id]; if (!d || !d.pros) return 'PROSPECT GONE.';
    if (d.pros.k >= 0.99) return 'YOU ALREADY KNOW EVERYTHING ABOUT ' + d.first + '.';
    const c = followCost(); if (S.money < c) return 'NOT ENOUGH MONEY (' + U.money(c) + ').';
    S.money -= c; d.pros.k = Math.min(1, d.pros.k + 0.22 + scoutBonus() * 0.6); d.pros.reports++;
    save(); return null;
  }
  // what the player can see about a prospect: ranges that narrow as knowledge k rises
  function prospectView(d) {
    const k = d.pros ? d.pros.k : 1; const off = d.pros ? d.pros.off : {};
    const rng = (v, spread, o) => { if (spread < 1) return [v, v]; const c = v + (o || 0) * spread * 0.5; return [Math.round(U.clamp(c - spread / 2, 1, 99)), Math.round(U.clamp(c + spread / 2, 1, 99))]; };
    const sp = Math.round((1 - k) * 24); const stats = {};
    for (const [key] of DATA.DRIVER_STATS) stats[key] = rng(d[key], sp, off[key]);
    const o = rng(ovr(d), Math.round((1 - k) * 14), off.ovr);
    let pot = null; // null = unknown
    const ps = potStars(d.potential);
    if (k >= 0.75) pot = [ps, ps];
    else if (k >= 0.4) { const lo = U.clamp(Math.round(ps - 1 + Math.min(0, off.pot || 0) * 0.6), 1, 5), hi = U.clamp(lo + (k >= 0.6 ? 1 : 2), 1, 5); pot = [Math.min(lo, ps), Math.max(hi, ps)]; }
    return { k, stats, ovr: o, pot, potExact: k >= 0.75 ? d.potential : null };
  }
  function prospectSalary(d) { return Math.max(500, Math.round(askSalary(d) * 0.7 / 100) * 100); }
  function signProspect(id, dest) {
    const d = S.drivers[id]; if (!d || !d.pros) return 'PROSPECT GONE.';
    if (!slotOpen(dest)) return dest === 'dev' ? 'DEVELOPMENT ROSTER IS FULL (' + DATA.DEV_MAX + ').' : 'THAT SEAT IS TAKEN.';
    d.salary = prospectSalary(d); d.contract = 3; d.team = 'P'; d.morale = 85; d.scouted = d.pros.feeder; delete d.pros;
    S.scout.list = S.scout.list.filter(x => x !== id); putInSlot(id, dest); award('firstProspect', { driver: driverName(d), note: 'AGE ' + d.age }, true);
    news(S.team.name + ' SIGNS PROSPECT ' + driverName(d).toUpperCase() + ' (AGE ' + d.age + ') TO A 3-YEAR DEAL, ' + U.money(d.salary) + '/RACE.');
    save(); return null;
  }

  // ---------- garage R&D ----------
  function rndCost(part) {
    const p = S.team.parts[part]; const s = ser();
    return { money: Math.round((4000 + Math.max(0, p - s.floor + 8) * 700) * s.mult / 500) * 500, ep: 10 + Math.round(Math.max(0, p - s.floor) / 3), days: Math.max(3, Math.round(10 - S.team.fac.shop * 1.5)),
      gain: Math.max(1, (3 + S.team.fac.shop * 0.6) * Math.max(0.4, 1 - Math.max(0, p - s.floor) / 70) * (1 + Math.max(0, s.floor + 4 - p) / 8)) };
  }
  function startRnd(part) {
    if (!hasCar()) return 'BUY A CAR FIRST.';
    if (S.team.rnd.find(r => r.part === part)) return 'Already developing this part.';
    const c = rndCost(part); if (S.money < c.money) return 'Not enough money.'; if (S.ep < c.ep) return 'Not enough engineering points.';
    if (S.team.parts[part] >= 99) return 'Maxed out.';
    S.money -= c.money; S.ep -= c.ep; S.team.rnd.push({ part, days: c.days, total: c.days, gain: c.gain + U.rand(0, 1.5) });
    save(); return null;
  }
  // ---------- facilities ----------
  function facCost(key) { const lvl = S.team.fac[key]; if (lvl >= 5) return null; return { money: Math.round(DATA.FAC_COST[lvl + 1] * (1 + S.seriesIdx * 0.8) / 1000) * 1000, days: 7 * lvl }; }
  function facUpkeep() { const f = S.team.fac; return Math.round((f.shop + f.engineDept + f.simulator + f.pitCenter - 4) * 1500 * Math.pow(ser().mult, 0.85)); }
  function startBuild(key) {
    if (S.team.builds.find(b => b.fac === key)) return 'Already under construction.';
    const c = facCost(key); if (!c) return 'Max level.'; if (S.money < c.money) return 'Not enough money.';
    S.money -= c.money; S.team.builds.push({ fac: key, days: c.days, total: c.days }); save(); return null;
  }
  function epPerWeek() { return 6 + S.team.fac.shop * 2 + S.team.fac.engineDept; }
  function travelCost() { const base = S.seriesIdx === 0 ? 1500 : 6000 * ser().mult; return Math.round(base * (1 + (S.team.fac.pitCenter - 1) * 0.05) / 100) * 100; }

  // ---------- race entries ----------
  function drvFields(d, bonus) {
    bonus = bonus || 0;
    return { speed: d.speed + bonus, cons: d.cons + bonus, craft: d.craft + bonus, tires: d.tires, fuelS: d.fuel, pit: d.pit, aggr: d.aggr, morale: d.morale === undefined ? 70 : d.morale };
  }
  function buildEntries(trackId, practice) {
    const type = DATA.TRACKS[trackId].type; const out = [];
    const simB = S.team.fac.simulator * 0.8;
    const setup = practice || { car: 0, cons: 0, qual: 0 };
    for (const tc of teamCars()) {
      const d = carDriver(tc.slot); if (!d) continue;
      const e = Object.assign({ id: tc.id, slot: tc.slot, isPlayer: true, number: tc.number, team: S.team.name, driverShort: driverShort(d), driver: driverName(d), livery: carLivery(tc.slot),
        car: carRating(type) + setup.car, drv: driverTypeRating(d, type) + simB,
        rel: 55 + S.team.fac.engineDept * 7 + (S.team.parts.engine - ser().floor) * 0.3, crew: 0.35 + S.team.fac.pitCenter * 0.12, qualBonus: setup.qual }, drvFields(d, simB));
      e.cons = U.clamp(e.cons + setup.cons, 1, 99);
      out.push(e);
    }
    for (const t of S.ai) {
      const ad = S.drivers[t.driverId];
      out.push(Object.assign({ id: t.id, isPlayer: false, number: t.number, team: t.name, driverShort: driverShort(ad), driver: driverName(ad), livery: t.livery,
        car: t.car + t.typeVar[type], drv: driverTypeRating(ad, type), rel: 60 + (t.car - ser().floor) * 0.6, crew: t.crew }, drvFields(ad)));
    }
    return out;
  }

  // ---------- weekly processing ----------
  function passDays(n) {
    for (const r of S.team.rnd) r.days -= n;
    for (const r of S.team.rnd.filter(r => r.days <= 0)) { S.team.parts[r.part] = Math.min(99, Math.round((S.team.parts[r.part] + r.gain) * 10) / 10); news('R&D COMPLETE: NEW ' + DATA.PARTS[r.part].name + ' (+' + r.gain.toFixed(1) + ').'); }
    S.team.rnd = S.team.rnd.filter(r => r.days > 0);
    for (const b of S.team.builds) b.days -= n;
    for (const b of S.team.builds.filter(b => b.days <= 0)) { S.team.fac[b.fac]++; news(DATA.FACILITIES[b.fac].name + ' UPGRADED TO LEVEL ' + S.team.fac[b.fac] + '!'); }
    S.team.builds = S.team.builds.filter(b => b.days > 0);
  }

  function purse(pos) { const s = ser(), N = s.cars; const p = U.clamp(pos, 1, N); return Math.round(s.purseWin * (0.15 + 0.85 * Math.pow((N - p) / (N - 1), 1.6)) / 100) * 100; }
  function goalBonus(g, r, stageTop) {
    if (!r) return 0;
    if (g.type === 'finish' && r.status === 'RUNNING') return g.bonus;
    if (g.type === 'top15' && r.pos <= 15) return g.bonus;
    if (g.type === 'top10' && r.pos <= 10) return g.bonus;
    if (g.type === 'top5' && r.pos <= 5) return g.bonus;
    if (g.type === 'win' && r.pos === 1) return g.bonus;
    if (g.type === 'stage') return g.bonus * stageTop;
    return 0;
  }
  // per-race growth for young team drivers (race seat or development)
  function raceGrowth(d, chanceAdd) {
    if (!d || d.age >= 24 || ovr(d) >= d.potential) return null;
    if (!U.chance(0.25 + S.team.fac.simulator * 0.07 + (chanceAdd || 0))) return null;
    const k = U.pick(ABIL); d[k] = Math.min(99, d[k] + 1); return k;
  }

  // process a finished race; returns summary for results screen. dmg: {P: x, P2: y} (or a number for car 1)
  function processRace(res, dmg) {
    if (typeof dmg === 'number') dmg = { P: dmg }; dmg = dmg || {};
    const s = ser(); const N = s.cars; const trackId = S.schedule[S.week - 1];
    const sum = { week: S.week, track: trackId, lines: [], income: 0, expense: 0 };
    // points
    for (const r of res.order) {
      const st = S.standings[r.id]; if (!st) continue;
      const pts = (DATA.POINTS[r.pos - 1] || 1) + r.stagePts; r.pts = pts;
      st.pts += pts; st.starts++; st.sumFin += r.pos; st.best = Math.min(st.best, r.pos);
      if (r.pos === 1) { st.wins++; st.pp += 5; } if (r.pos <= 5) st.top5++; if (r.pos <= 10) st.top10++; if (r.status !== 'RUNNING') st.dnf++;
    }
    res.stages.forEach(stg => { if (S.standings[stg[0]]) { S.standings[stg[0]].stageWins++; S.standings[stg[0]].pp += 1; } });
    const cars = teamCars().map(tc => ({ tc, r: res.order.find(o => o.id === tc.id) })).filter(x => x.r);
    const two = cars.length > 1;
    const me = (cars.find(x => x.tc.slot === 1) || cars[0]).r; const me2 = two ? cars.find(x => x.tc.slot === 2).r : null;
    const best = cars.map(x => x.r).sort((a, b) => a.pos - b.pos)[0];
    sum.me = me; sum.me2 = me2; sum.best = best; sum.two = two;
    const tag = (tc) => two ? ' #' + tc.number : '';
    // money
    for (const { tc, r } of cars) sum.lines.push(['PURSE' + tag(tc) + ' (' + U.ordinal(r.pos) + ')', purse(r.pos)]);
    const ev = DATA.eventName(S.seriesIdx, S.week); sum.event = ev;
    if (ev === 'DAYTONA 500') sum.lines.push(['DAYTONA 500 BONUS PURSE', Math.round(cars.reduce((a, x) => a + purse(x.r.pos), 0) * 0.5 / 100) * 100]);
    let spTotal = 0, bonusTotal = 0;
    const byCar = { 1: me, 2: me2 };
    for (const sp of allSponsors()) {
      const r = sp === S.team.sponsors.primary ? byCar[1] : (S.team.car2 && sp === S.team.car2.primary) ? byCar[2] : best;
      if (!r) continue; // car sat out: no payment, race not counted
      spTotal += sp.perRace;
      const stageTop = res.stages.filter(x => x.includes(r.id)).length;
      const b = goalBonus(sp.goal, r, stageTop);
      sp.done++; if (b > 0) sp.met++; bonusTotal += b; sp.races--;
    }
    if (spTotal) sum.lines.push(['SPONSOR PAYMENTS', spTotal]);
    if (bonusTotal) sum.lines.push(['SPONSOR BONUSES', bonusTotal]);
    for (const { tc } of cars) { const d = carDriver(tc.slot); sum.lines.push(['DRIVER SALARY' + tag(tc), -(d ? d.salary : 0)]); }
    const devPay = (S.team.dev || []).reduce((a, id) => a + (S.drivers[id] ? S.drivers[id].salary : 0), 0);
    if (devPay) sum.lines.push(['DEVELOPMENT DRIVERS', -devPay]);
    sum.lines.push(['TRAVEL & CREW', -travelCost()]);
    if (two) sum.lines.push(['CAR 2 TRAVEL & CREW', -car2RunCost()]);
    sum.lines.push(['FACILITY UPKEEP', -facUpkeep()]);
    for (const { tc, r } of cars) {
      const dm = dmg[tc.id] || 0;
      if (dm > 0.05 || r.status === 'CRASH') { const rep = Math.round((r.status === 'CRASH' ? 0.9 : dm) * (S.seriesIdx === 0 ? 8000 : 45000 * s.mult) / 100) * 100; sum.lines.push(['CRASH REPAIRS' + tag(tc), -rep]); }
      if (r.status === 'ENGINE') sum.lines.push(['ENGINE REBUILD' + tag(tc), -(S.seriesIdx === 0 ? 6000 : Math.round(30000 * s.mult))]);
    }
    let net = 0; for (const l of sum.lines) net += l[1]; sum.net = net; S.money += net;
    // expired sponsors
    for (const sp of allSponsors().filter(x => x.races <= 0)) {
      const rate = sp.done ? sp.met / sp.done : 0;
      if (sp === S.team.sponsors.primary) S.team.sponsors.primary = null;
      else if (S.team.car2 && sp === S.team.car2.primary) S.team.car2.primary = null;
      else S.team.sponsors.assoc[S.team.sponsors.assoc.indexOf(sp)] = null;
      if (rate >= 0.4) { const re = genSponsor(sp.slot); re.name = sp.name; re.colors = sp.colors; re.perRace = Math.round(sp.perRace * 1.12 / 100) * 100; re.goal = sp.goal; re.weeksLeft = 3; re.renewal = true; S.offers.unshift(re); news(sp.name + ' CONTRACT ENDS - THEY WANT TO RENEW! CHECK SPONSORS.'); }
      else news(sp.name + ' CONTRACT ENDS. THEY WERE NOT HAPPY WITH RESULTS.');
    }
    // rep & xp (from the team's best car)
    const repD = U.clamp((N * 0.75 - best.pos) / N * 5 + (best.status === 'RUNNING' ? 0.3 : 0) + (best.pos <= 10 && !(S.stats.top10) ? 1.5 : 0) + (best.pos === 1 ? 3 : 0), -2, 6);
    const repAdj = repD > 0 ? repD * (1 - S.rep / 130) : repD; S.rep = U.clamp(S.rep + repAdj, 0, 100); sum.repD = repAdj;
    const xp = 10 + (N - best.pos + 1) * 2 + (best.pos === 1 ? 25 : 0) + res.stages.filter(x => isTeamId(x[0])).length * 5 + (two ? 5 : 0);
    S.xp += xp; sum.xp = xp; sum.levelUp = false;
    while (S.xp >= S.level * DATA.XP_PER_LEVEL) { S.xp -= S.level * DATA.XP_PER_LEVEL; S.level++; sum.levelUp = true; news('LEVEL UP! MANAGER LEVEL ' + S.level + '.'); }
    S.stats.races++; if (best.pos <= 10) S.stats.top10 = (S.stats.top10 || 0) + 1; if (best.pos <= 15) S.stats.top15 = (S.stats.top15 || 0) + 1;
    S.stats.wins += cars.filter(x => x.r.pos === 1).length; if (best.pos <= 5) S.stats.top5++; if (cars.some(x => x.r.grid === 1)) S.stats.poles++;
    // trophies
    for (const { tc, r } of cars) {
      const d = carDriver(tc.slot); const info = { track: trackId, driver: driverName(d), num: tc.number, pos: r.pos };
      award('firstStart', info, true);
      if (r.pos <= 10) award('firstTop10', info, true);
      if (r.grid === 1) award('firstPole', info, true);
      if (res.stages.some(x => x[0] === tc.id)) award('firstStage', info, true);
      if (r.pos <= 3) { award('pod:' + trackId, info); award('firstPodium', info, true); }
      if (r.pos === 1) { award('win:' + trackId, info); award('firstWin', info, true); }
    }
    if (two && me.pos <= 2 && me2.pos <= 2) award('oneTwo', { track: trackId, driver: driverName(carDriver(1)) + ' & ' + driverName(carDriver(2)), num: S.team.number }, true);
    if (teamWins() >= 10) award('wins10', { track: trackId }, true);
    if (teamWins() >= 25) award('wins25', { track: trackId }, true);
    if (S.money >= 1000000) award('million', { note: U.money(S.money) }, true);
    // driver morale & growth
    sum.drvUp = [];
    for (const { tc, r } of cars) {
      const d = carDriver(tc.slot); if (!d) continue;
      d.morale = U.clamp(d.morale + (r.pos <= 10 ? 4 : r.pos <= N / 2 ? 0 : -3), 10, 100);
      const k = raceGrowth(d, 0.05); if (k) sum.drvUp.push([d, k]);
    }
    for (const id of S.team.dev || []) { const d = S.drivers[id]; if (!d) continue; const k = raceGrowth(d, 0); if (k) sum.drvUp.push([d, k]); d.morale = U.clamp((d.morale || 70) - 0.5, 30, 100); }
    // hired confidence (average of the team's cars)
    if (S.hired) {
      const avg = cars.reduce((a, x) => a + x.r.pos, 0) / cars.length; const anyOut = cars.some(x => x.r.status !== 'RUNNING');
      const cd = U.clamp((S.hired.target - avg) * 1.6, -14, 10) + (anyOut ? -4 : 0) + (S.money < 0 ? -8 : 0);
      S.hired.confidence = U.clamp(S.hired.confidence + cd, 0, 100); sum.confD = cd;
    }
    // news
    const win = res.order[0]; const wi = entryInfo(win.id);
    news(DATA.TRACKS[trackId].short + ': #' + wi.number + ' ' + wi.driver.toUpperCase() + ' WINS. ' + S.team.name + (two ? ': #' + S.team.number + ' ' + U.ordinal(me.pos) + ', #' + S.team.car2.number + ' ' + U.ordinal(me2.pos) + '.' : ' FINISHES ' + U.ordinal(me.pos) + '.'));
    if (isTeamId(win.id)) news('VICTORY LANE! FIRST PLACE FOR ' + S.team.name + ' AT ' + DATA.TRACKS[trackId].short + '!');
    S.results.push({ track: trackId, order: res.order.map(r => ({ id: r.id, pos: r.pos, status: r.status, pts: r.pts, laps: r.laps, lapsLed: r.lapsLed, stagePts: r.stagePts, grid: r.grid })), stages: res.stages, cautions: res.cautions });
    // Cup playoffs
    if (S.seriesIdx === 3) playoffStep(res);
    // week passes
    passDays(7); S.ep += epPerWeek();
    for (const o of S.offers) o.weeksLeft--; const had = S.offers.length; refreshOffers(); if (!had && S.offers.length && !S.firstSponsorNews) { S.firstSponsorNews = true; news('YOUR FIRST SPONSOR CALLED! ' + S.offers[0].name + ' WANTS ON THE CAR. CHECK SPONSORS.'); }
    for (const t of S.ai) t.car = Math.min(99, t.car + U.rand(0, 0.5));
    if (U.chance(0.5)) { const i = U.randi(0, S.freeAgents.length - 1); const gone = S.freeAgents.splice(i, 1)[0]; if (gone) delete S.drivers[gone]; genFreeAgents(1); }
    if (S.freeAgents.filter(id => S.drivers[id] && S.drivers[id].salary <= 1200 * ser().salaryBase).length < 2) genRookies(1);
    // scouted prospects get snapped up by other teams if you wait too long
    for (const d of prospects()) { d.pros.weeks--; if (d.pros.weeks <= 0) { news('PROSPECT ' + driverName(d).toUpperCase() + ' SIGNED WITH ANOTHER TEAM.'); S.scout.list = S.scout.list.filter(x => x !== d.id); delete S.drivers[d.id]; } }
    // promotion scouts
    if (S.mode === 'owner' && S.seriesIdx < 3 && S.week >= 5 && teamBestPos() <= 3 && !S.scoutNews) { S.scoutNews = true; news('SCOUTS FROM THE ' + DATA.SERIES[S.seriesIdx + 1].name + ' ARE WATCHING ' + S.team.name + '!'); }
    sum.fired = false; sum.bankrupt = false;
    if (S.hired && S.hired.confidence <= 0) { sum.fired = true; fired(); }
    if (S.mode === 'owner' && S.money < 0 && !S.debtNews) { S.debtNews = true; news('THE TEAM IS IN THE RED. KEEP RACING - PRIZE MONEY PAYS IT BACK. NO SPENDING UNTIL THEN.' + (S.team.car2 ? ' SELLING CAR 2 IN THE GARAGE ALSO HELPS.' : '')); }
    if (S.money >= 0) S.debtNews = false;
    sum.trophies = fresh.splice(0);
    sum.standPos = myStandingPos('P'); sum.pts = S.standings.P ? S.standings.P.pts : 0;
    if (two) { sum.standPos2 = myStandingPos('P2'); sum.pts2 = S.standings.P2.pts; }
    if (S.week >= 10) { S.seasonOver = true; sum.seasonOver = true; }
    else { S.week++; S.day = 1; }
    save();
    return sum;
  }
  function playoffStep(res) {
    if (S.week === 7) {
      const ord = standingsOrder();
      const winners = ord.filter(id => S.standings[id].wins > 0).slice(0, 8);
      const ids = winners.concat(ord.filter(id => !winners.includes(id))).slice(0, 8);
      const bonus = [15, 10, 8, 7, 6, 5, 4, 3];
      ord.slice(0, 8).forEach((id, i) => S.standings[id].pp += bonus[i]);
      for (const id of ids) S.standings[id].pts = 2000 + S.standings[id].pp;
      S.playoff = { round: 1, ids, final4: null };
      const inN = ids.filter(isTeamId).length;
      for (const id of ids.filter(isTeamId)) { const e = entryInfo(id); award('playoff', { driver: e.driver, num: e.number }); }
      news('CUP PLAYOFFS SET: TOP 8 RESET TO 2000 + PLAYOFF POINTS. ' + (inN ? (inN > 1 ? 'BOTH YOUR CARS ARE IN!' : 'YOU ARE IN!') : 'YOU MISSED THE CUT.'));
    } else if (S.week === 9 && S.playoff) {
      const P = S.playoff; const roundRaces = S.results.slice(7, 9);
      const roundWinners = roundRaces.map(r => r.order[0].id).filter(id => P.ids.includes(id));
      const byPts = P.ids.filter(id => S.standings[id]).sort((a, b) => S.standings[b].pts - S.standings[a].pts);
      const f4 = [...new Set(roundWinners.concat(byPts))].filter(id => S.standings[id]).slice(0, 4);
      for (const id of f4) S.standings[id].pts = 5000;
      P.final4 = f4; P.round = 2;
      for (const id of f4.filter(isTeamId)) { const e = entryInfo(id); award('champ4', { driver: e.driver, num: e.number }); }
      news('CHAMPIONSHIP 4 SET: ' + f4.map(id => '#' + entryInfo(id).number).join(', ') + '. BEST FINISH IN THE FINALE WINS IT ALL!');
    } else if (S.week === 10 && S.playoff && S.playoff.final4) {
      const P = S.playoff; P.finalPos = {};
      for (const r of res.order) if (P.final4.includes(r.id)) P.finalPos[r.id] = r.pos;
      P.champion = P.final4.slice().sort((a, b) => (P.finalPos[a] || 99) - (P.finalPos[b] || 99))[0];
    }
  }
  function fired() {
    news(S.hired.owner + ' FIRES ' + S.profile.toUpperCase() + '. "WE NEED A NEW DIRECTION."');
    S.firedPending = true;
    const tier = S.seriesIdx; const offers = [];
    offers.push(genJob(tier, U.rand(0.0, 0.25), S.rep));
    offers.push(genJob(tier, U.rand(0.0, 0.2), S.rep));
    S.jobOffers = offers;
  }
  function takeJob(jobId, midSeason) {
    const job = S.jobOffers.find(j => j.id === jobId); if (!job) return;
    for (const id of teamDriverIds()) { const d = S.drivers[id]; if (d) { d.team = null; if (!S.freeAgents.includes(id)) S.freeAgents.push(id); } }
    const changing = job.seriesIdx !== S.seriesIdx;
    installJobTeam(job);
    S.jobOffers = []; S.firedPending = false;
    news(job.owner + ' HIRES ' + S.profile.toUpperCase() + ' TO LEAD ' + job.name + ' IN THE ' + DATA.SERIES[job.seriesIdx].name + '.');
    if (midSeason && !changing) {
      // take over a new team in the same series: fresh team points, field stays the same size
      S.standings.P = blankStanding(); delete S.standings.P2;
      syncField(); if (S.standings.P2) S.standings.P2 = blankStanding();
    }
    return changing;
  }

  // ---------- season end ----------
  function seasonSummary() {
    if (S.endSummary && S.endSummary.season === S.season) return S.endSummary;
    const pos = teamBestPos(); const bestId = teamBestId(); const st = S.standings[bestId]; const s = ser();
    const teamWins = teamCars().reduce((a, c) => a + (S.standings[c.id] ? S.standings[c.id].wins : 0), 0);
    const out = { pos, pts: st.pts, wins: teamWins, top5: st.top5, champion: standingsOrder()[0], options: [] };
    if (S.team.car2) { out.pos1 = myStandingPos('P'); out.pos2 = myStandingPos('P2'); out.ownerPos = ownerStandings().findIndex(r => r.me) + 1; out.ownerPts = ownerStandings().find(r => r.me).pts; }
    const prize = Math.round(s.purseWin * 4 * Math.max(0, (11 - pos)) / 10 / 1000) * 1000; out.prize = prize;
    if (S.mode === 'owner') {
      if (S.seriesIdx < 3) {
        const eligible = pos <= 5 || teamWins >= 2;
        const next = DATA.SERIES[S.seriesIdx + 1]; let cost = next.buyIn; if (pos === 1) cost = Math.round(cost * 0.5);
        out.promo = { eligible, cost, next: S.seriesIdx + 1, afford: S.money + prize >= cost };
      }
    } else {
      const starts = teamCars().reduce((a, c) => a + (S.standings[c.id] ? S.standings[c.id].starts : 0), 0);
      const sumFin = teamCars().reduce((a, c) => a + (S.standings[c.id] ? S.standings[c.id].sumFin : 0), 0);
      const avg = sumFin / Math.max(1, starts); out.avg = avg;
      if (S.seriesIdx < 3 && (pos <= 5 || avg <= S.hired.target - 5)) { S.jobOffers = [genJob(S.seriesIdx + 1, U.rand(0.15, 0.6), S.rep)]; if (pos <= 2) S.jobOffers.push(genJob(S.seriesIdx + 1, U.rand(0.4, 0.8), S.rep)); }
      else S.jobOffers = [];
      if (pos <= 8 && S.jobOffers.length < 2) S.jobOffers.push(genJob(S.seriesIdx, U.rand(0.5, 0.9), S.rep));
      out.firedRisk = avg > S.hired.target + 4;
    }
    out.season = S.season; S.endSummary = out; save();
    return out;
  }
  function finishSeason(choice) {
    // choice: {type:'stay'} | {type:'promote'} | {type:'job', id}
    const sumy = seasonSummary(); const s = ser();
    if (!sumy.applied) {
      sumy.applied = true; S.money += sumy.prize;
      S.history.push({ season: S.season, year: S.year, series: s.short, pos: sumy.pos, wins: sumy.wins, team: S.team.name, pts: sumy.pts, cars: teamCars().length });
      if (sumy.pos === 1) {
        S.stats.titles++; news(S.team.name + ' ARE ' + S.year + ' ' + s.name + ' CHAMPIONS!');
        const e = entryInfo(teamBestId()); award('title:' + S.seriesIdx, { driver: e.driver, num: e.number, pos: 1, note: sumy.pts + ' PTS' });
        if (S.seriesIdx === 3) award('cupChamp', { driver: e.driver, num: e.number });
      }
    }
    let newTier = S.seriesIdx; let freshTeam = false;
    if (choice.type === 'promote' && sumy.promo && sumy.promo.eligible) {
      if (S.money < sumy.promo.cost) return 'NOT ENOUGH MONEY FOR THE BUY-IN.';
      S.money -= sumy.promo.cost; newTier = S.seriesIdx + 1; S.rep = Math.min(100, S.rep + 6);
      award('promo:' + newTier, { note: 'BUY-IN ' + U.money(sumy.promo.cost), series: newTier });
      news(S.team.name + ' BUYS INTO THE ' + DATA.SERIES[newTier].name + '!');
    } else if (choice.type === 'job') {
      const job = S.jobOffers.find(j => j.id === choice.id); if (!job) return 'Offer gone';
      newTier = job.seriesIdx; takeJob(choice.id); freshTeam = true; if (newTier > S.seriesIdx) { S.rep = Math.min(100, S.rep + 6); for (let t = S.seriesIdx + 1; t <= newTier; t++) award('promo:' + t, { note: 'HIRED BY ' + job.name, series: t }, true); }
    } else if (S.mode === 'owner' && S.seriesIdx > 0 && S.money < 0) {
      newTier = S.seriesIdx - 1; news('OUT OF MONEY! ' + S.team.name + ' DROPS BACK TO THE ' + DATA.SERIES[newTier].name + ' TO REBUILD. CREDITORS SETTLE THE DEBT.'); S.money = 0;
    } else if (S.hired && sumy.firedRisk && (sumy.fireRoll === undefined ? (sumy.fireRoll = Math.random()) : sumy.fireRoll) < 0.7) {
      if (!S.firedPending) fired(); return 'FIRED';
    }
    startSeason(newTier, freshTeam);
    return null;
  }
  // off-season development: young drivers grow toward potential, veterans slow down
  function developDriver(d, isTeam) {
    d.age++;
    const sim = isTeam ? S.team.fac.simulator : 1;
    const before = ovr(d);
    if (d.age <= 26) {
      const gap = Math.max(0, d.potential - before);
      for (const k of ABIL) d[k] = Math.round(U.clamp(d[k] + U.rand(0, 1.5) + gap * U.rand(0.08, 0.2) + sim * 0.35, 10, Math.min(99, d.potential + 4)));
    } else if (d.age >= 33) {
      const fall = 1 + (d.age - 33) * 0.5;
      for (const k of ABIL) d[k] = Math.round(U.clamp(d[k] - U.rand(0, fall) * (k === 'craft' || k === 'cons' ? 0.5 : 1), 10, 99));
    } else for (const k of ABIL) d[k] = Math.round(U.clamp(d[k] + U.rand(-1, 1.2), 10, 99));
    if (d.age >= 30) d.aggr = Math.max(10, d.aggr - U.randi(0, 2));
    d.potential = Math.max(d.potential, ovr(d));
    return ovr(d) - before;
  }
  function startSeason(tier, freshTeam) {
    const changed = tier !== S.seriesIdx; const oldFloor = ser().floor;
    S.season++; S.year++; S.week = 1; S.day = 1; S.seasonOver = false; S.scoutNews = false; S.results = [];
    // driver development & contracts
    const mineIds = new Set(teamDriverIds());
    for (const dr of Object.values(S.drivers)) {
      if (dr.pros) { dr.age++; continue; }
      const delta = developDriver(dr, mineIds.has(dr.id));
      if (mineIds.has(dr.id) && !freshTeam && Math.abs(delta) >= 2) news(driverName(dr).toUpperCase() + (delta > 0 ? ' IMPROVED +' + delta : ' SLOWED DOWN ' + delta) + ' OVR IN THE OFF-SEASON (AGE ' + dr.age + ').');
    }
    const expired = [];
    if (!freshTeam) {
      for (const id of teamDriverIds()) {
        const d = S.drivers[id]; if (!d) continue; d.contract--;
        if (d.contract <= 0) { news(driverName(d).toUpperCase() + "'S CONTRACT EXPIRED. NOW A FREE AGENT - RE-SIGN OR HIRE IN DRIVERS."); removeFromTeam(id); d.team = null; S.freeAgents.push(id); expired.push(id); }
      }
    }
    S.seriesIdx = tier;
    if (changed) {
      const nf = ser().floor;
      if (!freshTeam) for (const k of ['engine', 'aero', 'chassis']) S.team.parts[k] = Math.round(nf + Math.max(0, S.team.parts[k] - oldFloor) * 0.5 + 2);
      // keep the team's (and just-expired) driver records, drop everyone else
      const keep = new Set(teamDriverIds().concat(expired));
      for (const id of Object.keys(S.drivers)) if (!keep.has(id)) delete S.drivers[id];
      S.freeAgents = S.freeAgents.filter(id => S.drivers[id]); S.scout.list = [];
      S.ai = []; S.ai = genAITeams(tier, ser().cars - teamCars().length); genFreeAgents(11); genRookies(3);
      if (!freshTeam) { const had = allSponsors(); if (had.length) news('SPONSOR DEALS END WITH THE MOVE UP. NEW, BIGGER OFFERS ARE IN.'); S.team.sponsors = { primary: null, assoc: [null, null] }; if (S.team.car2) S.team.car2.primary = null; }
      S.offers = [];
      S.team.rnd = [];
    } else {
      for (const t of S.ai) { t.car = U.clamp(t.car + U.rand(-3, 3), ser().aiCar[0] - 2, ser().aiCar[1] + 2); const ad = S.drivers[t.driverId]; if (ad) { ad.contract--; if (ad.contract <= 0 && U.chance(0.5)) { delete S.drivers[ad.id]; const nd = genDriver(ser().aiDrv[0], ser().aiDrv[1], tier); nd.team = t.id; nd.contract = U.randi(1, 3); S.drivers[nd.id] = nd; t.driverId = nd.id; } else if (ad) ad.contract = Math.max(ad.contract, 1); } }
      const drop = S.freeAgents.splice(0, 6); for (const id of drop) if (!S.drivers[id] || S.drivers[id].team !== 'P') delete S.drivers[id];
      S.freeAgents = S.freeAgents.filter(id => S.drivers[id]); genFreeAgents(4); genRookies(2);
      syncField();
    }
    if (S.hired) { const tgt = Math.round(ser().minBudget * (S.team.car2 ? 1.1 : 0.8)); if (S.money < tgt) { news(S.hired.owner + ' TOPS UP THE BUDGET TO ' + U.money(tgt) + '.'); S.money = tgt; } S.hired.confidence = Math.max(S.hired.confidence, 50); }
    S.schedule = DATA.CALENDARS[tier].slice();
    resetStandings(); refreshOffers();
    news('SEASON ' + S.year + ' ' + ser().name + ' BEGINS AT ' + DATA.TRACKS[S.schedule[0]].short + (DATA.eventName(S.seriesIdx, 1) ? ' WITH THE ' + DATA.eventName(S.seriesIdx, 1) : '') + '.');
    save();
  }

  // ---------- save ----------
  // bring a v1.0 save up to date without losing anything
  function migrate(o) {
    if (!o || typeof o !== 'object') return o;
    const from = o.version || 1;
    for (const d of Object.values(o.drivers || {})) migrateDriver(d);
    for (const j of o.jobOffers || []) { migrateDriver(j.driver); if (j.driver2) migrateDriver(j.driver2); }
    if (o.team) { if (o.team.car2 === undefined) o.team.car2 = null; if (!Array.isArray(o.team.dev)) o.team.dev = []; }
    if (!o.scout) o.scout = { list: [], week: 0, trips: 0 };
    migrateTracks(o);
    if (!o.trophies) o.trophies = backfillTrophies(o);
    if (from < 2) { o.migratedFrom = from; o.version = SAVE_VERSION; }
    return o;
  }
  // v1.2: made-up tracks became real ones. Map old ids everywhere they appear (schedule, results, trophies, news).
  function migrateTracks(o) {
    if (o.realTracks) return;
    const map = (t) => DATA.TRACKS[t] ? t : (DATA.OLD_TRACKS[t] || 'daytona');
    if (Array.isArray(o.schedule)) o.schedule = o.schedule.map(map);
    for (const r of o.results || []) if (r && r.track) r.track = map(r.track);
    if (o.trophies && Array.isArray(o.trophies.log)) for (const e of o.trophies.log) {
      const m = /^(win|pod):(.+)$/.exec(e.k || ''); if (m) e.k = m[1] + ':' + map(m[2]);
      if (e.track) e.track = map(e.track);
    }
    const re = new RegExp('\\b(' + Object.keys(DATA.OLD_SHORT).join('|') + ')\\b', 'g');
    for (const n of o.news || []) if (n && n.text) n.text = n.text.replace(re, (x) => DATA.OLD_SHORT[x]);
    o.realTracks = true;
  }
  // older saves: rebuild what we can from this season's results and the season history
  function backfillTrophies(o) {
    const log = []; const t = o.team || {}; const d = o.drivers && t.driverId ? o.drivers[t.driverId] : null; const dn = d ? d.first + ' ' + d.last : 'TEAM DRIVER';
    const add = (k, e) => log.push(Object.assign({ k, s: o.season, y: o.year, series: o.seriesIdx, backfill: true }, e));
    (o.results || []).forEach((r, i) => { for (const id of ['P', 'P2']) { const me = (r.order || []).find(x => x.id === id); if (!me) continue;
      const info = { w: i + 1, track: r.track, driver: id === 'P' ? dn : 'CAR 2 DRIVER', num: t.number, pos: me.pos };
      if (me.pos <= 3) add('pod:' + r.track, info); if (me.pos === 1) add('win:' + r.track, info); } });
    const ser = (h) => DATA.SERIES.findIndex(x => x.short === h.series);
    let prev = 0;
    for (const h of o.history || []) {
      const si = ser(h); if (si > prev) { for (let k = prev + 1; k <= si; k++) add('promo:' + k, { s: h.season, y: h.year, series: k }); prev = si; }
      if (h.pos === 1 && si >= 0) { add('title:' + si, { s: h.season, y: h.year, series: si, note: h.pts + ' PTS' }); if (si === 3) add('cupChamp', { s: h.season, y: h.year, series: 3 }); }
    }
    if (o.seriesIdx > prev) for (let k = prev + 1; k <= o.seriesIdx; k++) add('promo:' + k, { series: k });
    const st = o.stats || {};
    if (st.races > 0) add('firstStart', {}); if ((st.top10 || 0) > 0) add('firstTop10', {}); if (st.poles > 0) add('firstPole', {});
    if (st.wins > 0 || log.some(e => e.k.startsWith('win:'))) add('firstWin', {});
    if (st.wins > 0 || log.some(e => e.k.startsWith('pod:'))) add('firstPodium', {});
    if (o.firstSponsorNews || (t.sponsors && (t.sponsors.primary || (t.sponsors.assoc || []).some(Boolean)))) add('firstSponsor', {});
    if (o.money >= 1000000) add('million', {});
    return { log, unseen: 0, backfilled: true };
  }
  function save() { if (!S) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); } }
  function load() {
    try { const j = localStorage.getItem(SAVE_KEY); if (j) { const o = JSON.parse(j); if (!o || !o.team) return false; S = migrate(o); save(); return true; } } catch (e) { console.warn('load failed', e); } return false;
  }
  function exportCode() { return 'SCM1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function importCode(code) {
    try { code = code.trim(); if (code.startsWith('SCM1:')) code = code.slice(5); const obj = JSON.parse(decodeURIComponent(escape(atob(code)))); if (!obj.team || !obj.version) throw new Error('bad'); S = migrate(obj); save(); return null; }
    catch (e) { return 'That save code is not valid.'; }
  }
  function wipe() { localStorage.removeItem(SAVE_KEY); S = null; }
  return {
    get S() { return S; }, ser, migrateTracks, news, award, trophyCount, trophyName, teamWins, save, load, exportCode, importCode, wipe, newCareer, genJob, migrate,
    hasCar, buyCar, signingBonus, sponsorInterest, ovr, driverTypeRating, driverName, driverShort, myDriver, carDriver, askSalary, minRepFor, hireCost, hireDriver, fireDriver, releaseDriver, fireCost,
    assignDriver, slotOf, slotOpen, firstOpenSlot, teamCars, teamDriverIds, potStars,
    car2Price, car2RunCost, car2Status, buyCar2, sellCar2,
    scoutCost, followCost, scoutBonus, scoutBusy, prospects, sendScout, scoutAgain, prospectView, prospectSalary, signProspect,
    myLivery, carLivery, carRating, carOverall, carRank, fieldAvgCar, effParts, rndCost, startRnd, facCost, facUpkeep, startBuild, epPerWeek, travelCost,
    genSponsor, goalText, signSponsor, dropSponsor, dropPenalty, allSponsors, refreshOffers,
    entryInfo, standingsOrder, myStandingPos, teamBestPos, ownerStandings, buildEntries, processRace, purse, seasonSummary, finishSeason, takeJob, passDays, syncField,
  };
})();
