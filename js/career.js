/* Career, team, driver market, sponsors, finances, save/load */
'use strict';
const Game = (() => {
  const SAVE_KEY = 'scm_save_v1';
  let S = null;
  const ser = () => DATA.SERIES[S.seriesIdx];
  const news = (text) => { S.news.unshift({ s: S.season, w: S.week, text }); if (S.news.length > 50) S.news.pop(); };

  // ---------- drivers ----------
  function driverTypeRating(d, type) {
    if (type === 'short') return 0.35 * d.speed + 0.35 * d.craft + 0.2 * d.cons + 0.1 * d.tires;
    if (type === 'intermediate') return 0.45 * d.speed + 0.2 * d.craft + 0.15 * d.cons + 0.2 * d.tires;
    if (type === 'superspeedway') return 0.2 * d.speed + 0.4 * d.ss + 0.25 * d.craft + 0.15 * d.cons;
    return 0.45 * d.road + 0.3 * d.speed + 0.15 * d.craft + 0.1 * d.cons;
  }
  function ovr(d) { return Math.round(0.3 * d.speed + 0.25 * d.craft + 0.2 * d.cons + 0.1 * d.tires + 0.075 * d.ss + 0.075 * d.road); }
  function genDriver(lo, hi, tierIdx) {
    const base = U.rand(lo, hi); const v = () => Math.round(U.clamp(base + U.gauss() * 6, 15, 99));
    const age = U.randi(17, 40);
    const d = { id: U.uid('d'), first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), age, speed: v(), craft: v(), cons: v(), tires: v(), ss: v(), road: v(),
      potential: Math.round(U.clamp(base + (age < 23 ? U.rand(5, 22) : age < 28 ? U.rand(0, 10) : 0), 20, 99)), contract: 0, salary: 0, team: null, morale: 70 };
    d.salary = askSalary(d, tierIdx);
    return d;
  }
  function askSalary(d, tierIdx) {
    const s = DATA.SERIES[tierIdx === undefined ? S.seriesIdx : tierIdx]; const o = ovr(d);
    let v = s.salaryBase * (800 + Math.pow(Math.max(0, o - 30), 2) * 6);
    if (d.age < 22) v *= 0.8; if (d.potential - o > 10) v *= 1.1;
    return Math.round(v / 100) * 100;
  }
  function minRepFor(d) { const s = ser(); return Math.max(0, Math.round((ovr(d) - s.aiDrv[0]) * 1.4 - 12)); }
  function driverName(d) { return d ? d.first + ' ' + d.last : 'NO DRIVER'; }
  function driverShort(d) { return d ? d.first[0] + '. ' + d.last : '---'; }
  function myDriver() { return S.team.driverId ? S.drivers[S.team.driverId] : null; }

  // ---------- teams ----------
  function randLivery() { const b = U.pick(DATA.BODY_COLORS); let s = U.pick(DATA.BODY_COLORS); while (s === b) s = U.pick(DATA.BODY_COLORS); return { body: b, stripe: s, num: '#141414' }; }
  function teamName(used) { let n; do { n = U.pick(DATA.TEAM_A) + ' ' + U.pick(DATA.TEAM_B); } while (used.has(n)); used.add(n); return n; }
  function genAITeams(tierIdx, count, used) {
    const s = DATA.SERIES[tierIdx]; const teams = []; const nums = U.shuffle([...Array(99).keys()].map(i => i + 1).filter(n => n !== S.team.number));
    used = used || new Set([S.team.name]);
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
  function genFreeAgents(n) {
    const s = ser();
    for (let i = 0; i < n; i++) { const d = genDriver(s.aiDrv[0] - 10, s.aiDrv[1] - 2, S.seriesIdx); S.drivers[d.id] = d; S.freeAgents.push(d.id); }
  }
  // cheap young drivers so a broke team can always field a car
  function genRookies(n) {
    for (let i = 0; i < n; i++) {
      const d = genDriver(24, 36, S.seriesIdx); d.age = U.randi(16, 19); d.potential = Math.round(U.clamp(Game_ovrLocal(d) + U.rand(12, 30), 30, 92));
      d.salary = Math.min(d.salary, Math.round(ser().salaryBase * 800 / 100) * 100); d.rookie = true; S.drivers[d.id] = d; S.freeAgents.push(d.id);
    }
  }
  function Game_ovrLocal(d) { return ovr(d); }
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
  function myLivery() {
    const p = S.team.sponsors.primary;
    if (p) return { body: p.colors[0], stripe: p.colors[1], num: '#141414' };
    return { body: S.team.colors.body, stripe: S.team.colors.stripe, num: '#141414' };
  }
  function effParts() { const p = S.team.parts, f = S.team.fac; return { engine: p.engine + f.engineDept * 1.5, aero: p.aero, chassis: p.chassis }; }
  function carRating(type) { const w = DATA.PART_W[type], e = effParts(); return w.engine * e.engine + w.aero * e.aero + w.chassis * e.chassis; }
  function carOverall() { return Math.round((carRating('short') + carRating('intermediate') + carRating('superspeedway') + carRating('road')) / 4); }
  function fieldAvgCar() { return S.ai.reduce((a, t) => a + t.car, 0) / S.ai.length; }
  function carRank() { const mine = carOverall(); return 1 + S.ai.filter(t => t.car > mine).length; }

  // ---------- new career ----------
  function newCareer(o) {
    S = { version: 1, mode: o.mode, profile: o.profile || 'MANAGER', xp: 0, level: 1, rep: o.mode === 'hired' ? 15 : 12,
      season: 1, year: 2027, seriesIdx: 0, week: 1, day: 1, money: 0, ep: 20,
      team: null, drivers: {}, freeAgents: [], ai: [], offers: [], schedule: [], results: [], standings: {}, news: [], history: [],
      hired: null, playoff: null, jobOffers: [], stats: { races: 0, wins: 0, top5: 0, top10: 0, top15: 0, poles: 0, titles: 0 }, seasonOver: false, gameOver: false, tutorial: true };
    const s = DATA.SERIES[0];
    if (o.mode === 'owner') {
      S.team = { name: o.teamName || 'ZION RACING', number: o.number || 7, colors: o.colors || { body: '#d9342b', stripe: '#f2d22e' }, hasCar: false,
        parts: { engine: s.floor - 6, aero: s.floor - 6, chassis: s.floor - 6 }, fac: { shop: 1, engineDept: 1, simulator: 1, pitCenter: 1 },
        builds: [], rnd: [], driverId: null, sponsors: { primary: null, assoc: [null, null] } };
      S.money = 15000; S.rep = 0;
      S.ai = genAITeams(0, s.cars - 1);
      genFreeAgents(11); genRookies(4);
      news('WELCOME, OWNER ' + S.profile.toUpperCase() + '! ' + S.team.name + ' IS A $15K DREAM IN AN EMPTY SHOP.');
      news('BUY A CAR, HIRE A DRIVER, GO RACE - SPONSORS WILL COME WHEN YOU GET RESULTS.');
    } else {
      const job = o.job;
      S.team = { name: job.name, number: job.number, colors: { body: job.livery.body, stripe: job.livery.stripe }, hasCar: true, parts: Object.assign({}, job.parts), fac: Object.assign({}, job.fac),
        builds: [], rnd: [], driverId: null, sponsors: { primary: null, assoc: [null, null] } };
      S.money = job.budget;
      S.hired = { team: job.name, confidence: 60, target: job.target, owner: job.owner };
      S.ai = genAITeams(0, s.cars - 1);
      const d = job.driver; d.team = 'P'; d.contract = 1; S.drivers[d.id] = d; S.team.driverId = d.id;
      if (job.sponsor) S.team.sponsors.primary = job.sponsor;
      genFreeAgents(14);
      news(job.owner + ' HIRES ' + S.profile.toUpperCase() + ' TO RUN ' + job.name + '. TARGET: AVG FINISH ' + job.target + 'TH OR BETTER.');
    }
    S.schedule = DATA.CALENDARS[0].slice();
    resetStandings();
    refreshOffers();
    save();
    return S;
  }
  function genJob(tierIdx, quality, curRep) {
    const s = DATA.SERIES[tierIdx]; const q = quality; // 0..1
    const sp = U.chance(0.5 + q * 0.4) ? genSponsor('primary', tierIdx, curRep || 20) : null;
    const lo = s.aiDrv[0], hi = s.aiDrv[1];
    const drv = genDriver(U.lerp(lo, hi, q * 0.8) - 6, U.lerp(lo, hi, q * 0.8) + 4, tierIdx);
    const used = new Set();
    return { id: U.uid('j'), seriesIdx: tierIdx, name: teamName(used), number: U.randi(2, 98), livery: randLivery(), owner: U.pick(DATA.FIRST).toUpperCase() + ' ' + U.pick(DATA.LAST).toUpperCase(),
      parts: { engine: Math.round(s.floor + q * 14 + U.rand(-2, 3)), aero: Math.round(s.floor + q * 14 + U.rand(-2, 3)), chassis: Math.round(s.floor + q * 14 + U.rand(-2, 3)) },
      fac: { shop: 1 + (q > 0.5 ? 1 : 0), engineDept: 1 + (q > 0.7 ? 1 : 0), simulator: 1 + (q > 0.6 ? 1 : 0), pitCenter: 1 + (q > 0.4 ? 1 : 0) },
      budget: Math.round(s.minBudget * U.rand(0.75, 1.05) / 1000) * 1000, target: Math.max(3, Math.round(s.cars * (0.75 - q * 0.45))), driver: drv, sponsor: sp };
  }

  // ---------- standings ----------
  function entryIds() { return ['P'].concat(S.ai.map(t => t.id)); }
  function resetStandings() { S.standings = {}; for (const id of entryIds()) S.standings[id] = { pts: 0, wins: 0, top5: 0, top10: 0, stageWins: 0, pp: 0, dnf: 0, best: 99, starts: 0, sumFin: 0 }; S.playoff = null; }
  function entryInfo(id) {
    if (id === 'P') { const d = myDriver(); return { id, number: S.team.number, team: S.team.name, driver: driverName(d), driverShort: driverShort(d), livery: myLivery(), isPlayer: true }; }
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
        const restP = P.ids.filter(i => !P.final4.includes(i)).sort(cmp); const others = ids.filter(i => !P.ids.includes(i)).sort(cmp);
        return f4.concat(restP, others);
      }
      const g1 = P.final4 ? P.final4.slice().sort(cmp) : []; const g2 = P.ids.filter(i => !g1.includes(i)).sort(cmp); const g3 = ids.filter(i => !P.ids.includes(i)).sort(cmp);
      return g1.concat(g2, g3);
    }
    return ids.sort(cmp);
  }
  function myStandingPos() { return standingsOrder().indexOf('P') + 1; }

  // ---------- sponsors ----------
  function genSponsor(slot, tierIdx, rep) {
    const s = DATA.SERIES[tierIdx === undefined ? S.seriesIdx : tierIdx]; rep = rep === undefined ? S.rep : rep;
    const used = S ? [S.team && S.team.sponsors.primary, ...(S.team ? S.team.sponsors.assoc : []), ...(S.offers || [])].filter(Boolean).map(x => x.name) : [];
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
    const st = S.stats; const pos = S.week > 3 ? myStandingPos() : 99; const N = ser().cars;
    const earned = (st.top10 || 0) >= 1 || (st.top15 || 0) >= 2 || st.wins > 0 || S.rep >= 8 || S.seriesIdx > 0 || S.mode === 'hired';
    if (!earned) return { slots: 0, primary: false };
    let slots = 1; if (S.rep >= 12 || (st.top10 || 0) >= 3) slots = 2; if (S.rep >= 25 || pos <= N * 0.4) slots = 3; if (S.rep >= 45 || st.wins > 0) slots = 4;
    const primary = S.rep >= 15 || st.wins > 0 || (st.top10 || 0) >= 3 || pos <= 10 || S.seriesIdx > 0 || S.mode === 'hired';
    return { slots, primary };
  }
  function refreshOffers() {
    S.offers = S.offers.filter(o => o.weeksLeft > 0);
    const si = sponsorInterest();
    let guard = 0;
    while (S.offers.length < si.slots && guard++ < 10) S.offers.push(genSponsor(si.primary && U.chance(0.45) ? 'primary' : 'assoc'));
  }
  function signSponsor(id, slotIdx) {
    const o = S.offers.find(x => x.id === id); if (!o) return 'Offer gone';
    if (o.slot === 'primary') { if (S.team.sponsors.primary) return 'Primary slot is full. Drop your primary sponsor first.'; S.team.sponsors.primary = o; }
    else { const i = S.team.sponsors.assoc.indexOf(null); if (i < 0) return 'Both associate slots are full.'; S.team.sponsors.assoc[i] = o; }
    S.money += o.signing; S.offers = S.offers.filter(x => x !== o);
    news(o.name + ' SIGNS WITH ' + S.team.name + ' (' + U.money(o.perRace) + '/RACE).');
    save(); return null;
  }
  function dropPenalty(sp) { return sp.perRace * 2; }
  function dropSponsor(slot, idx) {
    const sp = slot === 'primary' ? S.team.sponsors.primary : S.team.sponsors.assoc[idx]; if (!sp) return;
    S.money -= dropPenalty(sp);
    if (slot === 'primary') S.team.sponsors.primary = null; else S.team.sponsors.assoc[idx] = null;
    news(S.team.name + ' AND ' + sp.name + ' PART WAYS. EXIT FEE ' + U.money(dropPenalty(sp)) + '.'); save();
  }
  function allSponsors() { return [S.team.sponsors.primary, ...S.team.sponsors.assoc].filter(Boolean); }

  // ---------- driver market ----------
  function fireCost(d) { const racesLeftThisSeason = 10 - (S.week - 1); return Math.round(d.salary * (racesLeftThisSeason + Math.max(0, d.contract - 1) * 10) * 0.4); }
  function fireDriver() {
    const d = myDriver(); if (!d) return; const c = fireCost(d); S.money -= c;
    d.team = null; d.contract = 0; d.morale = 40; S.freeAgents.push(d.id); S.team.driverId = null;
    news(S.team.name + ' RELEASES ' + driverName(d).toUpperCase() + '. BUYOUT: ' + U.money(c) + '.'); save();
  }
  function hireCost(d, years) { const ask = askSalary(d); return Math.round(ask * (years === 1 ? 1.1 : years === 2 ? 1.0 : 0.93) / 100) * 100; }
  function signingBonus(d, years) { const sal = hireCost(d, years); return sal <= 1200 * ser().salaryBase ? 0 : sal * 2; }
  function hireDriver(id, years) {
    const d = S.drivers[id]; if (!d) return 'Driver not found';
    if (S.team.driverId) return 'Release your current driver first.';
    if (S.rep < minRepFor(d)) return d.first + ' wants a team with more reputation (needs ' + minRepFor(d) + ', you have ' + Math.round(S.rep) + ').';
    const sal = hireCost(d, years); const bonus = signingBonus(d, years);
    if (bonus > 0 && S.money < bonus) return 'NOT ENOUGH MONEY FOR THE SIGNING BONUS (' + U.money(bonus) + ').';
    S.money -= bonus; d.salary = sal; d.contract = years; d.team = 'P'; d.morale = 80; S.team.driverId = id;
    S.freeAgents = S.freeAgents.filter(x => x !== id);
    news(S.team.name + ' SIGNS ' + driverName(d).toUpperCase() + ' (' + years + ' YR, ' + U.money(sal) + '/RACE).'); save(); return null;
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
  function buildEntries(trackId, practice) {
    const type = DATA.TRACKS[trackId].type; const out = [];
    const d = myDriver();
    const simB = S.team.fac.simulator * 0.8;
    const setup = practice || { car: 0, cons: 0, qual: 0 };
    out.push({ id: 'P', isPlayer: true, number: S.team.number, team: S.team.name, driverShort: driverShort(d), driver: driverName(d), livery: myLivery(),
      car: carRating(type) + setup.car, drv: driverTypeRating(d, type) + simB, speed: d.speed + simB, cons: U.clamp(d.cons + simB + setup.cons, 1, 99), craft: d.craft + simB, tires: d.tires,
      rel: 55 + S.team.fac.engineDept * 7 + (S.team.parts.engine - ser().floor) * 0.3, crew: 0.35 + S.team.fac.pitCenter * 0.12, qualBonus: setup.qual });
    for (const t of S.ai) {
      const ad = S.drivers[t.driverId];
      out.push({ id: t.id, isPlayer: false, number: t.number, team: t.name, driverShort: driverShort(ad), driver: driverName(ad), livery: t.livery,
        car: t.car + t.typeVar[type], drv: driverTypeRating(ad, type), speed: ad.speed, cons: ad.cons, craft: ad.craft, tires: ad.tires, rel: 60 + (t.car - ser().floor) * 0.6, crew: t.crew });
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

  function purse(pos) { const s = ser(), N = s.cars; return Math.round(s.purseWin * (0.15 + 0.85 * Math.pow((N - pos) / (N - 1), 1.6)) / 100) * 100; }

  // process a finished race; returns summary for results screen
  function processRace(res, raceDamage) {
    const s = ser(); const N = s.cars; const trackId = S.schedule[S.week - 1]; const type = DATA.TRACKS[trackId].type;
    const sum = { week: S.week, track: trackId, lines: [], income: 0, expense: 0 };
    // points
    for (const r of res.order) {
      const st = S.standings[r.id]; if (!st) continue;
      const pts = (DATA.POINTS[r.pos - 1] || 1) + r.stagePts; r.pts = pts;
      st.pts += pts; st.starts++; st.sumFin += r.pos; st.best = Math.min(st.best, r.pos);
      if (r.pos === 1) { st.wins++; st.pp += 5; } if (r.pos <= 5) st.top5++; if (r.pos <= 10) st.top10++; if (r.status !== 'RUNNING') st.dnf++;
    }
    res.stages.forEach(stg => { if (S.standings[stg[0]]) { S.standings[stg[0]].stageWins++; S.standings[stg[0]].pp += 1; } });
    const me = res.order.find(r => r.id === 'P'); sum.me = me;
    // money
    const pz = purse(me.pos); sum.lines.push(['PURSE (' + U.ordinal(me.pos) + ')', pz]);
    let spTotal = 0, bonusTotal = 0;
    for (const sp of allSponsors()) {
      spTotal += sp.perRace; let b = 0; const g = sp.goal;
      const stageTop = res.stages.filter(x => x.includes('P')).length;
      if (g.type === 'finish' && me.status === 'RUNNING') b = g.bonus;
      if (g.type === 'top15' && me.pos <= 15) b = g.bonus;
      if (g.type === 'top10' && me.pos <= 10) b = g.bonus;
      if (g.type === 'top5' && me.pos <= 5) b = g.bonus;
      if (g.type === 'win' && me.pos === 1) b = g.bonus;
      if (g.type === 'stage') b = g.bonus * stageTop;
      sp.done++; if (b > 0) sp.met++; bonusTotal += b; sp.races--;
    }
    if (spTotal) sum.lines.push(['SPONSOR PAYMENTS', spTotal]);
    if (bonusTotal) sum.lines.push(['SPONSOR BONUSES', bonusTotal]);
    const d = myDriver(); const sal = d ? d.salary : 0;
    sum.lines.push(['DRIVER SALARY', -sal]);
    sum.lines.push(['TRAVEL & CREW', -travelCost()]);
    sum.lines.push(['FACILITY UPKEEP', -facUpkeep()]);
    if (raceDamage > 0.05 || me.status === 'CRASH') { const rep = Math.round((me.status === 'CRASH' ? 0.9 : raceDamage) * (S.seriesIdx === 0 ? 8000 : 45000 * s.mult) / 100) * 100; sum.lines.push(['CRASH REPAIRS', -rep]); }
    if (me.status === 'ENGINE') sum.lines.push(['ENGINE REBUILD', -(S.seriesIdx === 0 ? 6000 : Math.round(30000 * s.mult))]);
    let net = 0; for (const l of sum.lines) net += l[1]; sum.net = net; S.money += net;
    // expired sponsors
    for (const sp of allSponsors().filter(x => x.races <= 0)) {
      const rate = sp.done ? sp.met / sp.done : 0;
      if (sp.slot === 'primary') S.team.sponsors.primary = null; else S.team.sponsors.assoc[S.team.sponsors.assoc.indexOf(sp)] = null;
      if (rate >= 0.4) { const re = genSponsor(sp.slot); re.name = sp.name; re.colors = sp.colors; re.perRace = Math.round(sp.perRace * 1.12 / 100) * 100; re.goal = sp.goal; re.weeksLeft = 3; re.renewal = true; S.offers.unshift(re); news(sp.name + ' CONTRACT ENDS - THEY WANT TO RENEW! CHECK SPONSORS.'); }
      else news(sp.name + ' CONTRACT ENDS. THEY WERE NOT HAPPY WITH RESULTS.');
    }
    // rep & xp
    const repD = U.clamp((N * 0.75 - me.pos) / N * 5 + (me.status === 'RUNNING' ? 0.3 : 0) + (me.pos <= 10 && !(S.stats.top10) ? 1.5 : 0) + (me.pos === 1 ? 3 : 0), -2, 6);
    const repAdj = repD > 0 ? repD * (1 - S.rep / 130) : repD; S.rep = U.clamp(S.rep + repAdj, 0, 100); sum.repD = repAdj;
    const xp = 10 + (N - me.pos + 1) * 2 + (me.pos === 1 ? 25 : 0) + res.stages.filter(x => x[0] === 'P').length * 5;
    S.xp += xp; sum.xp = xp; sum.levelUp = false;
    while (S.xp >= S.level * DATA.XP_PER_LEVEL) { S.xp -= S.level * DATA.XP_PER_LEVEL; S.level++; sum.levelUp = true; news('LEVEL UP! MANAGER LEVEL ' + S.level + '.'); }
    S.stats.races++; if (me.pos <= 10) S.stats.top10 = (S.stats.top10 || 0) + 1; if (me.pos <= 15) S.stats.top15 = (S.stats.top15 || 0) + 1; if (me.pos === 1) S.stats.wins++; if (me.pos <= 5) S.stats.top5++; if (me.grid === 1) S.stats.poles++;
    // driver morale
    if (d) d.morale = U.clamp(d.morale + (me.pos <= 10 ? 4 : -3), 10, 100);
    if (d && d.age < 23 && ovr(d) < d.potential && U.chance(0.3 + S.team.fac.simulator * 0.08)) { const k = U.pick(['speed', 'craft', 'cons', 'tires', 'ss', 'road']); d[k] = Math.min(99, d[k] + 1); sum.drvUp = k; }
    // hired confidence
    if (S.hired) {
      const cd = U.clamp((S.hired.target - me.pos) * 1.6, -14, 10) + (me.status !== 'RUNNING' ? -4 : 0) + (S.money < 0 ? -8 : 0);
      S.hired.confidence = U.clamp(S.hired.confidence + cd, 0, 100); sum.confD = cd;
    }
    // news
    const win = res.order[0]; const wi = entryInfo(win.id);
    news(DATA.TRACKS[trackId].short + ': #' + wi.number + ' ' + wi.driver.toUpperCase() + ' WINS. ' + S.team.name + ' FINISHES ' + U.ordinal(me.pos) + '.');
    if (me.pos === 1) news('VICTORY LANE! FIRST PLACE FOR ' + S.team.name + ' AT ' + DATA.TRACKS[trackId].short + '!');
    S.results.push({ track: trackId, order: res.order.map(r => ({ id: r.id, pos: r.pos, status: r.status, pts: r.pts, laps: r.laps, lapsLed: r.lapsLed, stagePts: r.stagePts, grid: r.grid })), stages: res.stages, cautions: res.cautions });
    // Cup playoffs
    if (S.seriesIdx === 3) playoffStep(res);
    // week passes
    passDays(7); S.ep += epPerWeek();
    for (const o of S.offers) o.weeksLeft--; const had = S.offers.length; refreshOffers(); if (!had && S.offers.length && !S.firstSponsorNews) { S.firstSponsorNews = true; news('YOUR FIRST SPONSOR CALLED! ' + S.offers[0].name + ' WANTS ON THE CAR. CHECK SPONSORS.'); }
    for (const t of S.ai) t.car = Math.min(99, t.car + U.rand(0, 0.5));
    if (U.chance(0.5)) { const i = U.randi(0, S.freeAgents.length - 1); const gone = S.freeAgents.splice(i, 1)[0]; if (gone) delete S.drivers[gone]; genFreeAgents(1); }
    if (S.freeAgents.filter(id => S.drivers[id] && S.drivers[id].salary <= 1200 * ser().salaryBase).length < 2) genRookies(1);
    // scouting
    if (S.mode === 'owner' && S.seriesIdx < 3 && S.week >= 5 && myStandingPos() <= 3 && !S.scoutNews) { S.scoutNews = true; news('SCOUTS FROM THE ' + DATA.SERIES[S.seriesIdx + 1].name + ' ARE WATCHING ' + S.team.name + '!'); }
    sum.fired = false; sum.bankrupt = false;
    if (S.hired && S.hired.confidence <= 0) { sum.fired = true; fired(); }
    if (S.mode === 'owner' && S.money < 0 && !S.debtNews) { S.debtNews = true; news('THE TEAM IS IN THE RED. KEEP RACING - PRIZE MONEY PAYS IT BACK. NO SPENDING UNTIL THEN.'); }
    if (S.money >= 0) S.debtNews = false;
    sum.standPos = myStandingPos(); sum.pts = S.standings.P.pts;
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
      news('CUP PLAYOFFS SET: TOP 8 RESET TO 2000 + PLAYOFF POINTS. ' + (ids.includes('P') ? 'YOU ARE IN!' : 'YOU MISSED THE CUT.'));
    } else if (S.week === 9 && S.playoff) {
      const P = S.playoff; const roundRaces = S.results.slice(7, 9);
      const roundWinners = roundRaces.map(r => r.order[0].id).filter(id => P.ids.includes(id));
      const byPts = P.ids.slice().sort((a, b) => S.standings[b].pts - S.standings[a].pts);
      const f4 = [...new Set(roundWinners.concat(byPts))].slice(0, 4);
      for (const id of f4) S.standings[id].pts = 5000;
      P.final4 = f4; P.round = 2;
      news('CHAMPIONSHIP 4 SET: ' + f4.map(id => '#' + entryInfo(id).number).join(', ') + '. BEST FINISH IN THE FINALE WINS IT ALL!');
    } else if (S.week === 10 && S.playoff && S.playoff.final4) {
      const P = S.playoff; P.finalPos = {};
      for (const r of res.order) if (P.final4.includes(r.id)) P.finalPos[r.id] = r.pos;
      P.champion = P.final4.slice().sort((a, b) => P.finalPos[a] - P.finalPos[b])[0];
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
    const oldDriver = myDriver(); if (oldDriver) { oldDriver.team = null; S.freeAgents.push(oldDriver.id); }
    const changing = job.seriesIdx !== S.seriesIdx;
    S.team = { name: job.name, number: job.number, colors: { body: job.livery.body, stripe: job.livery.stripe }, parts: Object.assign({}, job.parts), fac: Object.assign({}, job.fac),
      builds: [], rnd: [], driverId: null, sponsors: { primary: job.sponsor || null, assoc: [null, null] } };
    const d = job.driver; d.team = 'P'; d.contract = Math.max(1, d.contract || 1); S.drivers[d.id] = d; S.team.driverId = d.id;
    S.money = job.budget; S.hired = { team: job.name, confidence: 60, target: job.target, owner: job.owner };
    S.jobOffers = []; S.firedPending = false;
    news(job.owner + ' HIRES ' + S.profile.toUpperCase() + ' TO LEAD ' + job.name + ' IN THE ' + DATA.SERIES[job.seriesIdx].name + '.');
    if (midSeason && !changing) {
      // take over the team in the same series: replace a random AI entry so field size holds
      const st = S.standings.P; const repl = S.ai.splice(U.randi(0, S.ai.length - 1), 1)[0];
      if (repl) { delete S.standings[repl.id]; }
      S.standings.P = st; S.ai = S.ai.concat(genAITeams(S.seriesIdx, 1));
      S.standings[S.ai[S.ai.length - 1].id] = { pts: 0, wins: 0, top5: 0, top10: 0, stageWins: 0, pp: 0, dnf: 0, best: 99, starts: 0, sumFin: 0 };
      S.standings.P = { pts: 0, wins: 0, top5: 0, top10: 0, stageWins: 0, pp: 0, dnf: 0, best: 99, starts: 0, sumFin: 0 };
    }
    return changing;
  }

  // ---------- season end ----------
  function seasonSummary() {
    if (S.endSummary && S.endSummary.season === S.season) return S.endSummary;
    const pos = myStandingPos(); const st = S.standings.P; const s = ser();
    const out = { pos, pts: st.pts, wins: st.wins, top5: st.top5, champion: standingsOrder()[0], options: [] };
    const prize = Math.round(s.purseWin * 4 * Math.max(0, (11 - pos)) / 10 / 1000) * 1000; out.prize = prize;
    if (S.mode === 'owner') {
      if (S.seriesIdx < 3) {
        const eligible = pos <= 5 || st.wins >= 2;
        const next = DATA.SERIES[S.seriesIdx + 1]; let cost = next.buyIn; if (pos === 1) cost = Math.round(cost * 0.5);
        out.promo = { eligible, cost, next: S.seriesIdx + 1, afford: S.money + prize >= cost };
      }
    } else {
      const avg = st.sumFin / Math.max(1, st.starts); out.avg = avg;
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
      S.history.push({ season: S.season, year: S.year, series: s.short, pos: sumy.pos, wins: sumy.wins, team: S.team.name, pts: sumy.pts });
      if (sumy.pos === 1) { S.stats.titles++; news(S.team.name + ' ARE ' + S.year + ' ' + s.name + ' CHAMPIONS!'); }
    }
    let newTier = S.seriesIdx; let fresh = false;
    if (choice.type === 'promote' && sumy.promo && sumy.promo.eligible) {
      if (S.money < sumy.promo.cost) return 'NOT ENOUGH MONEY FOR THE BUY-IN.';
      S.money -= sumy.promo.cost; newTier = S.seriesIdx + 1; S.rep = Math.min(100, S.rep + 6);
      news(S.team.name + ' BUYS INTO THE ' + DATA.SERIES[newTier].name + '!');
    } else if (choice.type === 'job') {
      const job = S.jobOffers.find(j => j.id === choice.id); if (!job) return 'Offer gone';
      newTier = job.seriesIdx; takeJob(choice.id); fresh = true; if (newTier > S.seriesIdx) S.rep = Math.min(100, S.rep + 6);
    } else if (S.mode === 'owner' && S.seriesIdx > 0 && S.money < 0) {
      newTier = S.seriesIdx - 1; news('OUT OF MONEY! ' + S.team.name + ' DROPS BACK TO THE ' + DATA.SERIES[newTier].name + ' TO REBUILD. CREDITORS SETTLE THE DEBT.'); S.money = 0;
    } else if (S.hired && sumy.firedRisk && (sumy.fireRoll === undefined ? (sumy.fireRoll = Math.random()) : sumy.fireRoll) < 0.7) {
      if (!S.firedPending) fired(); return 'FIRED';
    }
    startSeason(newTier, fresh);
    return null;
  }
  function startSeason(tier, freshTeam) {
    const changed = tier !== S.seriesIdx; const oldFloor = ser().floor;
    S.season++; S.year++; S.week = 1; S.day = 1; S.seasonOver = false; S.scoutNews = false; S.results = [];
    // driver contracts & development
    const d = myDriver();
    for (const dr of Object.values(S.drivers)) {
      dr.age++;
      const sim = dr.team === 'P' ? S.team.fac.simulator : 1;
      if (dr.age < 27) for (const k of ['speed', 'craft', 'cons', 'tires', 'ss', 'road']) dr[k] = Math.min(dr.potential + 3, Math.round(dr[k] + U.rand(0, 3) + sim * 0.5));
      if (dr.age > 34) for (const k of ['speed', 'craft', 'cons', 'tires', 'ss', 'road']) dr[k] = Math.max(15, Math.round(dr[k] - U.rand(0, 3)));
    }
    if (d && !freshTeam) {
      d.contract--;
      if (d.contract <= 0) { news(driverName(d).toUpperCase() + "'S CONTRACT EXPIRED. NOW A FREE AGENT - RE-SIGN OR HIRE IN DRIVERS."); d.team = null; S.team.driverId = null; S.freeAgents.push(d.id); }
    }
    S.seriesIdx = tier;
    if (changed) {
      const nf = ser().floor;
      if (!freshTeam) for (const k of ['engine', 'aero', 'chassis']) S.team.parts[k] = Math.round(nf + Math.max(0, S.team.parts[k] - oldFloor) * 0.5 + 2);
      // keep player's (and expired) driver records, drop everyone else
      const keep = new Set([S.team.driverId].concat(S.freeAgents.filter(id => S.drivers[id] && S.drivers[id].id === (d && d.id)))); 
      for (const id of Object.keys(S.drivers)) if (!keep.has(id)) delete S.drivers[id];
      S.freeAgents = S.freeAgents.filter(id => S.drivers[id]);
      S.ai = genAITeams(tier, ser().cars - 1); genFreeAgents(11); genRookies(3);
      if (!freshTeam) { const had = allSponsors(); if (had.length) news('SPONSOR DEALS END WITH THE MOVE UP. NEW, BIGGER OFFERS ARE IN.'); S.team.sponsors = { primary: null, assoc: [null, null] }; }
      S.offers = [];
      S.team.rnd = []; 
    } else {
      for (const t of S.ai) { t.car = U.clamp(t.car + U.rand(-3, 3), ser().aiCar[0] - 2, ser().aiCar[1] + 2); const ad = S.drivers[t.driverId]; if (ad) { ad.contract--; if (ad.contract <= 0 && U.chance(0.5)) { delete S.drivers[ad.id]; const nd = genDriver(ser().aiDrv[0], ser().aiDrv[1], tier); nd.team = t.id; nd.contract = U.randi(1, 3); S.drivers[nd.id] = nd; t.driverId = nd.id; } else if (ad) ad.contract = Math.max(ad.contract, 1); } }
      const drop = S.freeAgents.splice(0, 6); for (const id of drop) if (!S.drivers[id] || S.drivers[id].team !== 'P') delete S.drivers[id];
      S.freeAgents = S.freeAgents.filter(id => S.drivers[id]); genFreeAgents(4); genRookies(2);
    }
    if (S.hired) { const tgt = Math.round(ser().minBudget * 0.8); if (S.money < tgt) { news(S.hired.owner + ' TOPS UP THE BUDGET TO ' + U.money(tgt) + '.'); S.money = tgt; } S.hired.confidence = Math.max(S.hired.confidence, 50); }
    S.schedule = DATA.CALENDARS[tier].slice();
    resetStandings(); refreshOffers();
    news('SEASON ' + S.year + ' ' + ser().name + ' BEGINS AT ' + DATA.TRACKS[S.schedule[0]].short + '.');
    save();
  }

  // ---------- save ----------
  function save() { if (!S) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { console.warn('save failed', e); } }
  function load() { try { const j = localStorage.getItem(SAVE_KEY); if (j) { S = JSON.parse(j); return true; } } catch (e) { console.warn('load failed', e); } return false; }
  function exportCode() { return 'SCM1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function importCode(code) {
    try { code = code.trim(); if (code.startsWith('SCM1:')) code = code.slice(5); const obj = JSON.parse(decodeURIComponent(escape(atob(code)))); if (!obj.team || !obj.version) throw new Error('bad'); S = obj; save(); return null; }
    catch (e) { return 'That save code is not valid.'; }
  }
  function wipe() { localStorage.removeItem(SAVE_KEY); S = null; }
  return {
    get S() { return S; }, ser, news, save, load, exportCode, importCode, wipe, newCareer, genJob,
    hasCar, buyCar, signingBonus, sponsorInterest, ovr, driverTypeRating, driverName, driverShort, myDriver, askSalary, minRepFor, hireCost, hireDriver, fireDriver, fireCost,
    myLivery, carRating, carOverall, carRank, fieldAvgCar, effParts, rndCost, startRnd, facCost, facUpkeep, startBuild, epPerWeek, travelCost,
    genSponsor, goalText, signSponsor, dropSponsor, dropPenalty, allSponsors, refreshOffers,
    entryInfo, standingsOrder, myStandingPos, buildEntries, processRace, purse, seasonSummary, finishSeason, takeJob, passDays,
  };
})();
