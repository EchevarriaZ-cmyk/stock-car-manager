/* v1.6 OWNER'S BOX - the business side of the team: Cup charters, rival owners, manufacturer deals.
   Biz = game logic (state lives in Game.S.biz, plus S.team.chief); BizUI = the BUSINESS screen.
   career.js calls the Biz hooks (fieldCut, raceLines, afterRace, seasonEnd, preSeason, seasonStart, migrate, ensure,
   engineBonus, chiefCrew) only when Biz exists, so the game still runs without this file. */
'use strict';
const Biz = (() => {
  const CUP = 3;
  const CHARTERS = 36;               // the Cup has a fixed number of charters
  const CHARTER_SHARE = 0.3;         // chartered cars get 30% more purse
  const MAX_HELD = 2;                // one charter per team car
  const BASE_CV = 4500000;           // starting charter market value
  // made-up rival owners (purse = how much over the going rate they pay, rounds = how long a bidding war can go)
  const RIVALS = [
    { id: 'kolby', name: 'VANCE KOLBY', team: 'KOLBY MOTORSPORTS', purse: 1.35, rounds: 3, style: 'DEEP POCKETS, BIDS HARD' },
    { id: 'marchetti', name: 'DELIA MARCHETTI', team: 'MARCHETTI RACING GROUP', purse: 1.25, rounds: 2, style: 'PATIENT, LOVES YOUNG TALENT' },
    { id: 'brannigan', name: 'HOLT BRANNIGAN', team: 'BRANNIGAN-HAYES RACING', purse: 1.15, rounds: 2, style: 'OLD SCHOOL, BUYS CHARTERS' },
    { id: 'okafor', name: 'REGGIE OKAFOR', team: 'OKAFOR PERFORMANCE', purse: 1.3, rounds: 1, style: 'ONE BIG OFFER, THEN WALKS' },
  ];
  const MAKES = {
    chevy: { name: 'CHEVROLET', short: 'CHEVY', bg: '#d8a61c', fg: '#141414' },
    ford: { name: 'FORD', short: 'FORD', bg: '#1f4fa8', fg: '#ffffff' },
    toyota: { name: 'TOYOTA', short: 'TOYOTA', bg: '#d0202a', fg: '#ffffff' },
    honda: { name: 'HONDA', short: 'HONDA', bg: '#e8e8e8', fg: '#c8102e' },
    // v1.8: Dodge returns to the Cup in 2027 (Kaulig Racing is its factory team) - Cup only, the underdog make
    dodge: { name: 'DODGE', short: 'DODGE', abbr: 'DOD', bg: '#141414', fg: '#e4202a', since: 2027, cupOnly: true },
  };
  // v1.8 Dodge underdog: smaller cash and an engine that starts behind and closes the gap each season,
  // offset by a win bonus (share of the season deal, paid per win, max 3 a season)
  const DODGE = { year: 2027, perf0: 0.75, perfStep: 0.08, cashF: 0.8, winF: 0.12, winMax: 3 };
  function dodgePerfF(year) { return Math.min(1, DODGE.perf0 + DODGE.perfStep * Math.max(0, (year || DODGE.year) - DODGE.year)); }
  // deal tiers: cash per season (x series money multiplier), engine boost, goals (share of the races left)
  const TIERS = [
    { name: 'CUSTOMER', cash: 15000, perf: 0.5, goals: [['top15', 0.3]] },
    { name: 'SUPPORTED', cash: 40000, perf: 1.5, goals: [['top10', 0.3]] },
    { name: 'FACTORY', cash: 90000, perf: 3, goals: [['top5', 0.25], ['win', 0]] },
  ];
  const GOAL_TXT = { top15: 'TOP-15 FINISHES', top10: 'TOP-10 FINISHES', top5: 'TOP-5 FINISHES', win: 'RACE WIN' };
  const GOAL_POS = { top15: 15, top10: 10, top5: 5, win: 1 };

  const S = () => Game.S;
  const live = () => { const s = S(); return !!(s && s.team && !s.free && !s.demo && s.biz); };
  const wk = () => S().season * 100 + S().week;
  const ser = () => DATA.SERIES[S().seriesIdx];
  const rival = id => RIVALS.find(r => r.id === id) || RIVALS[0];
  const r100 = v => Math.round(v / 100) * 100, r1k = v => Math.round(v / 1000) * 1000, r10k = v => Math.round(v / 10000) * 10000;
  function racesLeft() { const s = S(); if (s.seasonOver) return 0; return Math.max(0, Game.nRaces() - s.week + 1); }
  function inCup() { const s = S(); return !!s && s.seriesIdx === CUP; }
  function nascarRank() { const s = S(); const sr = DATA.SERIES[s.seriesIdx]; return sr.path === 'nascar' ? sr.rank : -1; }
  function logBiz(text) { const b = S().biz; b.log.unshift({ s: S().season, w: S().week, text }); if (b.log.length > 12) b.log.pop(); }

  // ---------- state ----------
  function basePay(si) { return r100(500 * DATA.SERIES[si].mult) || 100; }
  function genChief(s, rating) {
    return { first: U.pick(DATA.FIRST), last: U.pick(DATA.LAST), rating: Math.round(U.clamp(rating, 30, 90)), raiseF: 0, poachS: 0 };
  }
  // add everything v1.6 needs to a state (a new career or an old save); safe to call again
  function ensure(s) {
    s = s || S(); if (!s || s.free || !s.team) return null;
    if (!s.biz || typeof s.biz !== 'object') s.biz = {};
    const b = s.biz;
    if (!b.v) b.v = 1;
    if (!(b.cv > 0)) b.cv = BASE_CV;
    if (!(b.cvPrev > 0)) b.cvPrev = b.cv;
    for (const k of ['own', 'leaseIn', 'forSale', 'leaseOffers', 'poach', 'log']) if (!Array.isArray(b[k])) b[k] = [];
    if (!b.mfr || typeof b.mfr !== 'object') b.mfr = {};
    if (b.mfr.deal === undefined) b.mfr.deal = null;
    if (!Array.isArray(b.mfr.offers)) b.mfr.offers = [];
    if (b.mfr.review === undefined) b.mfr.review = null;
    if (b.mfr.renew === undefined) b.mfr.renew = null;
    if (!b.mfr.cool) b.mfr.cool = {};
    if (!b.lastQual) b.lastQual = null;
    if (!s.team.chief) s.team.chief = genChief(s, U.randi(45, 55));
    return b;
  }
  // old saves (v1.0-v1.5): a Cup team that already raced keeps a guaranteed start - one charter per car
  function migrate(o) {
    if (!o || !o.team || o.free) return o;
    const had = !!o.biz;
    ensure(o);
    if (!had && o.seriesIdx === CUP && o.mode === 'owner') {
      const n = 1 + (o.team.car2 ? 1 : 0);
      for (let i = 0; i < n; i++) o.biz.own.push({ no: freeNo(o.biz), paid: 0, legacy: true, out: null });
      o.biz.log.unshift({ s: o.season, w: o.week, text: 'YOUR CUP TEAM KEEPS ITS ' + (n > 1 ? n + ' CHARTERS' : 'CHARTER') + ' FROM BEFORE V1.6.' });
    }
    return o;
  }
  function freeNo(b) { const used = new Set(b.own.map(c => c.no).concat(b.leaseIn.map(c => c.no), b.forSale.map(c => c.no), b.leaseOffers.map(c => c.no))); const pool = []; for (let i = 1; i <= CHARTERS; i++) if (!used.has(i)) pool.push(i); return pool.length ? U.pick(pool) : 1; }

  // ---------- charters ----------
  function held() { const b = S().biz; return b.own.length + b.leaseIn.length; }
  // how many of the team's cars run under a charter this week (owned and not leased out, or leased in); hired teams use the boss's charters
  function chartersInUse() { const s = S(); const b = s.biz; const cars = Game.teamCars().length; if (s.hired) return cars; return Math.min(cars, b.own.filter(c => !c.out).length + b.leaseIn.length); }
  function carCharter(id) { if (!live() || !inCup()) return false; const i = Game.teamCars().findIndex(c => c.id === id); return i >= 0 && i < chartersInUse(); }
  // what one of your charters would sell for: the market value, plus or minus your team's form in the Cup
  function perfF() { if (!inCup() || !S().results.length) return 1; const N = Math.max(2, ser().cars); const pos = Game.teamBestPos(); return 0.85 + 0.3 * (1 - (U.clamp(pos, 1, N) - 1) / (N - 1)); }
  function myValue() { return r10k(S().biz.cv * perfF()); }
  function sellPrice() { return r10k(myValue() * 0.95); }
  function leaseInFee() { return r1k(S().biz.cv * 0.12 * racesLeft() / Game.nRaces()); }
  function leaseOutFee() { return r1k(S().biz.cv * 0.1 * racesLeft() / Game.nRaces()); }
  function canBuyHere() { return S().mode === 'owner' && nascarRank() >= 2; }
  function sellerName() { const s = S(); const pool = RIVALS.map(r => r.team).concat((s.ai || []).slice(0, 12).map(t => String(t.name).toUpperCase())); return U.pick(pool); }
  function refreshMarket(force) {
    const s = S(); const b = s.biz; const now = wk();
    b.forSale = b.forSale.filter(l => l.exp >= now); b.leaseOffers = b.leaseOffers.filter(l => l.exp >= now);
    if (!canBuyHere() || s.seasonOver) { b.forSale = []; b.leaseOffers = []; return; }
    if (b.forSale.length < 2 && (force || b.forSale.length === 0 || U.chance(0.35)))
      b.forSale.push({ id: U.uid('cs'), no: freeNo(b), seller: sellerName(), price: r10k(b.cv * U.rand(0.96, 1.14)), exp: now + U.randi(2, 4) });
    const wantLease = inCup() && racesLeft() > 0 && chartersInUse() < Game.teamCars().length;
    if (!wantLease) b.leaseOffers = [];
    else if (b.leaseOffers.length < 2 && (force || b.leaseOffers.length === 0 || U.chance(0.35)))
      b.leaseOffers.push({ id: U.uid('cl'), no: freeNo(b), from: sellerName(), f: U.rand(0.92, 1.1), exp: now + U.randi(1, 3) });
  }
  const leaseCost = l => r1k(leaseInFee() * l.f);
  function buyCharter(id) {
    const s = S(); const b = s.biz; if (s.mode !== 'owner') return 'THE TEAM OWNER HANDLES CHARTERS.';
    const l = b.forSale.find(x => x.id === id); if (!l) return 'THAT CHARTER IS GONE.';
    if (!canBuyHere()) return 'CHARTERS CAN BE BOUGHT FROM THE O\'REILLY SERIES UP.';
    if (held() >= MAX_HELD) return 'YOU ALREADY HOLD ' + MAX_HELD + ' CHARTERS (ONE PER CAR).';
    if (s.money < l.price) return 'NOT ENOUGH MONEY (' + U.money(l.price) + ').';
    s.money -= l.price; b.forSale = b.forSale.filter(x => x !== l);
    b.own.push({ no: l.no, paid: l.price, out: null });
    const msg = s.team.name + ' BUYS CUP CHARTER #' + l.no + ' FROM ' + l.seller + ' FOR ' + U.money(l.price) + '.';
    Game.news(msg); logBiz(msg); Game.save(); return null;
  }
  function sellCharter(no) {
    const s = S(); const b = s.biz; const c = b.own.find(x => x.no === +no); if (!c) return 'NO SUCH CHARTER.';
    if (s.mode !== 'owner') return 'THE TEAM OWNER HANDLES CHARTERS.';
    if (c.out) return 'IT IS LEASED OUT UNTIL THE SEASON ENDS.';
    const price = sellPrice(); s.money += price; b.own = b.own.filter(x => x !== c);
    const buyer = sellerName(); const msg = s.team.name + ' SELLS CUP CHARTER #' + c.no + ' TO ' + buyer + ' FOR ' + U.money(price) + '.';
    Game.news(msg); logBiz(msg); Game.save(); return null;
  }
  function leaseIn(id) {
    const s = S(); const b = s.biz; const l = b.leaseOffers.find(x => x.id === id); if (!l) return 'THAT LEASE OFFER IS GONE.';
    if (s.mode !== 'owner') return 'THE TEAM OWNER HANDLES CHARTERS.';
    if (!inCup()) return 'LEASES ARE FOR CUP CARS.';
    if (racesLeft() <= 0) return 'THE SEASON IS OVER.';
    if (chartersInUse() >= Game.teamCars().length) return 'EVERY CAR ALREADY HAS A CHARTER.';
    if (held() >= MAX_HELD) return 'YOU ALREADY HOLD ' + MAX_HELD + ' CHARTERS.';
    const fee = leaseCost(l); if (s.money < fee) return 'NOT ENOUGH MONEY (' + U.money(fee) + ').';
    s.money -= fee; b.leaseOffers = b.leaseOffers.filter(x => x !== l);
    b.leaseIn.push({ no: l.no, from: l.from, fee, season: s.season });
    const msg = s.team.name + ' LEASES CHARTER #' + l.no + ' FROM ' + l.from + ' FOR THE REST OF THE SEASON (' + U.money(fee) + ').';
    Game.news(msg); logBiz(msg); Game.save(); return null;
  }
  function leaseOut(no) {
    const s = S(); const b = s.biz; const c = b.own.find(x => x.no === +no); if (!c) return 'NO SUCH CHARTER.';
    if (s.mode !== 'owner') return 'THE TEAM OWNER HANDLES CHARTERS.';
    if (c.out) return 'ALREADY LEASED OUT.';
    if (racesLeft() <= 0) return 'THE SEASON IS OVER - LEASE IT OUT NEXT SEASON.';
    const fee = leaseOutFee(); const to = sellerName();
    c.out = { to, fee, season: s.season }; s.money += fee;
    const msg = s.team.name + ' LEASES CHARTER #' + c.no + ' TO ' + to + ' FOR THE REST OF THE SEASON (+' + U.money(fee) + ').';
    Game.news(msg); logBiz(msg); Game.save(); return null;
  }
  // which of your charters is racing on which car (for the screen)
  function charterUse() {
    const s = S(); const b = s.biz; const cars = Game.teamCars(); const out = {}; let i = 0;
    const racing = inCup() ? cars : [];
    for (const c of b.own) { if (c.out) out['o' + c.no] = 'LEASED OUT TO ' + c.out.to; else if (i < racing.length) out['o' + c.no] = 'RACING ON #' + racing[i++].number; else out['o' + c.no] = inCup() ? 'IDLE - LEASE IT OUT?' : 'WAITING FOR YOUR CUP DEBUT'; }
    for (const c of b.leaseIn) out['l' + c.no] = i < racing.length ? 'RACING ON #' + racing[i++].number : 'IDLE';
    return out;
  }
  // ---------- the Cup field: 36 chartered cars are locked in, the open cars race in on speed ----------
  function qscore(e) { return 0.55 * e.car + 0.45 * (e.drv * 0.6 + e.speed * 0.4) + U.gauss() * 2.2 + (e.isPlayer ? e.qualBonus || 0 : 0); }
  function fieldCut(entries) {
    const s = S(); if (!live() || s.seriesIdx !== CUP) return entries;
    const cap = ser().cars; const b = s.biz;
    const useP = chartersInUse(); const playerHeldNotRacing = s.hired ? 0 : b.own.filter(c => !c.out).length + b.leaseIn.length - useP;
    let aiCharters = CHARTERS - useP - Math.max(0, playerHeldNotRacing); // idle charters you hold sit out
    const aiByStrength = s.ai.slice().sort((a, c) => c.car - a.car || (a.id < c.id ? -1 : 1));
    const aiCh = new Set(aiByStrength.slice(0, Math.max(0, aiCharters)).map(t => t.id));
    const cars = Game.teamCars();
    for (const e of entries) { e.qs = qscore(e); e.charter = e.isPlayer ? cars.findIndex(c => c.id === e.id) < useP : aiCh.has(e.id); }
    const locked = entries.filter(e => e.charter); const open = entries.filter(e => !e.charter).sort((a, c) => c.qs - a.qs);
    const spots = Math.max(0, cap - locked.length); const made = open.slice(0, spots), dnq = open.slice(spots);
    b.lastQual = { wk: wk(), spots, nOpen: open.length, open: open.map((e, i) => ({ id: e.id, num: e.number, name: e.driverShort, me: !!e.isPlayer, in: i < spots })), dnq: dnq.map(e => e.id) };
    if (dnq.some(e => e.isPlayer)) for (const e of dnq.filter(x => x.isPlayer)) Game.news('#' + e.number + ' ' + e.driverShort.toUpperCase() + ' DID NOT QUALIFY AT ' + DATA.TRACKS[s.schedule[s.week - 1]].short + ' - AN OPEN CAR TOO SLOW TO RACE IN.');
    const field = locked.concat(made); lastField = { wk: wk(), entries: field };
    return field;
  }
  let lastField = null; // the field that made the race this week (not saved)
  function teamDNQ() { const s = S(); const q = s.biz && s.biz.lastQual; if (!q || q.wk !== wk()) return []; return Game.teamCars().filter(c => q.dnq.includes(c.id)); }
  // the team could not get any car into the race: run it without us and score the weekend
  function sitOut() {
    const s = S(); const tid = s.schedule[s.week - 1];
    // race the field that made it (kept from the cut); after a reload, cut again with the team far off the pace
    let field = lastField && lastField.wk === wk() ? lastField.entries : null;
    if (!field) field = Game.buildEntries(tid, { car: 0, cons: 0, qual: -99 });
    const grid = RaceSim.qualify(field.filter(e => !e.isPlayer), DATA.TRACKS[tid].type);
    const r = new RaceSim.Race({ geom: new TrackGeom(tid, s.seriesIdx), grid, playerIds: [], autoPlayer: true });
    r.runToEnd();
    const q = s.biz.lastQual; if (q) q.dnq = [...new Set(q.dnq.concat(Game.teamCars().map(c => c.id)))];
    return Game.processRace(r.results(), {}, { setup: 'bal' });
  }

  // ---------- crew chief ----------
  function chief() { const s = S(); return s && s.team && s.team.chief; }
  function chiefPay(c) { c = c || chief(); return r100(basePay(S().seriesIdx) * (1 + (c.raiseF || 0))); }
  function chiefCrew() { const s = S(); if (!s || s.free || !s.team || !s.team.chief) return 0; return (s.team.chief.rating - 50) * 0.0025; }

  // ---------- rival owners: poaching ----------
  function poachOpen() { return S().biz.poach.filter(p => p.state === 'open'); }
  function targetName(p) { if (p.kind === 'chief') { const c = chief(); return c ? (c.first + ' ' + c.last).toUpperCase() : 'YOUR CREW CHIEF'; } const d = S().drivers[p.tid]; return d ? Game.driverName(d).toUpperCase() : 'YOUR DRIVER'; }
  function curPay(p) { if (p.kind === 'chief') return chiefPay(); const d = S().drivers[p.tid]; return d ? d.salary : 0; }
  function counterAmt(p) { return r100(p.offer * 1.08); }
  function makePoach(kind, tid, rv, opts) {
    const s = S(); opts = opts || {}; const R = rival(rv);
    const cur = kind === 'chief' ? chiefPay() : s.drivers[tid].salary;
    const p = { id: U.uid('pc'), rv: R.id, kind, tid, offer: r100(Math.max(cur, 100) * (kind === 'chief' ? U.rand(1.15, 1.35) : R.purse * U.rand(0.95, 1.08))), round: 1, max: opts.max || U.randi(1, R.rounds), exp: wk() + (opts.now ? 1 : 2), state: 'open', s: s.season };
    s.biz.poach.unshift(p); if (s.biz.poach.length > 10) s.biz.poach.pop();
    const who = targetName(p); const what = kind === 'chief' ? 'CREW CHIEF ' + who : who;
    Game.news('RIVAL ALERT: ' + R.team + ' WANTS ' + what + '! ' + R.name + ' OFFERS ' + U.money(p.offer) + '/RACE. COUNTER OR LET GO IN BUSINESS.');
    logBiz(R.name + ' MADE AN OFFER FOR ' + what + '.');
    return p;
  }
  function rollPoach(sum) {
    const s = S(); if (DATA.SERIES[s.seriesIdx].kart || poachOpen().length) return null;
    const n = Game.nRaces(); const pick = () => U.pick(RIVALS).id;
    for (const tc of Game.teamCars()) {
      const d = Game.carDriver(tc.slot); if (!d || d.poachS === s.season || d.leaving) continue;
      const pos = Game.myStandingPos(tc.id);
      let p = 0.03 + (d.contract <= 1 && s.week >= n * 0.35 ? 0.12 : 0) + (pos <= 5 ? 0.08 : pos <= 10 ? 0.04 : 0) + ((d.morale || 70) < 50 ? 0.04 : 0);
      if (U.chance(p)) { d.poachS = s.season; const pc = makePoach('driver', d.id, pick()); if (sum) (sum.bizNotes = sum.bizNotes || []).push('RIVAL OFFER: ' + rival(pc.rv).team + ' WANTS ' + targetName(pc) + '. SEE BUSINESS.'); return pc; }
    }
    const c = chief();
    if (c && c.poachS !== s.season && U.chance(0.025 + (s.results.length && Game.teamBestPos() <= 5 ? 0.04 : 0))) {
      c.poachS = s.season; const pc = makePoach('chief', 'chief', pick()); if (sum) (sum.bizNotes = sum.bizNotes || []).push('RIVAL OFFER: ' + rival(pc.rv).team + ' WANTS YOUR CREW CHIEF. SEE BUSINESS.'); return pc;
    }
    return null;
  }
  // test / tutorial hook: a rival offer right now for car 1's driver (or the crew chief)
  function forcePoach(kind, rv, max) {
    const s = S(); if (!live()) return null;
    if (kind === 'chief') return makePoach('chief', 'chief', rv || 'kolby', { max, now: true });
    const d = Game.myDriver(); if (!d) return null; d.poachS = s.season; return makePoach('driver', d.id, rv || 'kolby', { max, now: true });
  }
  function stayChance(p) {
    if (p.kind === 'chief') return 0.8;
    const d = S().drivers[p.tid]; const mor = d ? (d.morale === undefined ? 70 : d.morale) : 50;
    return U.clamp(0.65 + (mor - 60) / 70, 0.15, 0.95);
  }
  // counter offer. force (tests): 'raise' = the rival bids again (if it has rounds left), 'stay' / 'leave' = the verdict
  function counter(id, force) {
    const s = S(); const p = s.biz.poach.find(x => x.id === id && x.state === 'open'); if (!p) return { err: 'THAT OFFER IS GONE.' };
    if (s.money < 0) return { err: 'NO SPENDING WHILE THE TEAM IS IN THE RED.' };
    const R = rival(p.rv); const amt = counterAmt(p); const who = targetName(p);
    if (p.round < p.max && force !== 'stay' && force !== 'leave' && (force === 'raise' || U.chance(0.65))) {
      p.last = amt; p.offer = r100(amt * U.rand(1.07, 1.14)); p.round++; p.exp = wk() + 1;
      const msg = R.team + ' RAISES ITS OFFER FOR ' + who + ' TO ' + U.money(p.offer) + '/RACE (ROUND ' + p.round + ').';
      Game.news(msg); logBiz(msg); Game.save(); return { state: 'raised', msg };
    }
    const stay = force === 'stay' ? true : force === 'leave' ? false : U.chance(stayChance(p));
    if (stay) {
      p.state = 'kept'; p.final = amt;
      let msg;
      if (p.kind === 'chief') { const c = chief(); c.raiseF = Math.max(0, amt / basePay(s.seriesIdx) - 1); msg = 'CREW CHIEF ' + who + ' STAYS FOR ' + U.money(amt) + '/RACE.'; }
      else { const d = s.drivers[p.tid]; d.salary = amt; if (d.contract <= 1) d.contract = 2; d.morale = U.clamp((d.morale || 70) + 6, 10, 100); msg = who + ' STAYS! NEW DEAL: ' + U.money(amt) + '/RACE, ' + d.contract + ' YEARS.'; }
      Game.news(msg); logBiz(msg); Game.save(); return { state: 'kept', msg };
    }
    const msg = depart(p, 'counter'); Game.save(); return { state: 'lost', msg };
  }
  function letGo(id) {
    const s = S(); const p = s.biz.poach.find(x => x.id === id && x.state === 'open'); if (!p) return { err: 'THAT OFFER IS GONE.' };
    const msg = depart(p, 'let'); Game.save(); return { state: 'lost', msg };
  }
  function depart(p, why) {
    const s = S(); const R = rival(p.rv); const who = targetName(p); p.state = 'lost'; let msg;
    if (p.kind === 'chief') {
      const old = chief(); s.team.chief = genChief(s, Math.max(35, (old ? old.rating : 50) - U.randi(5, 12)));
      msg = 'CREW CHIEF ' + who + ' JOINS ' + R.team + '. ' + (s.team.chief.first + ' ' + s.team.chief.last).toUpperCase() + ' STEPS UP FROM THE SHOP.';
    } else {
      const d = s.drivers[p.tid];
      if (!d) msg = who + ' IS GONE.';
      else if (d.contract <= 1) { d.leaving = R.id; msg = who + ' WILL DRIVE FOR ' + R.team + ' NEXT SEASON (FINAL YEAR HERE).'; }
      else {
        const fee = r100(d.salary * Math.max(1, racesLeft()) * 0.5); s.money += fee;
        Game.removeFromTeam(d.id); delete s.drivers[d.id];
        msg = who + ' LEAVES FOR ' + R.team + ' NOW. THEY PAY A ' + U.money(fee) + ' BUYOUT. HIRE A NEW DRIVER IN DRIVERS.';
      }
    }
    Game.news(msg); logBiz(msg); return msg;
  }
  // rivals bid for the prospects you scout. Decided once per prospect; force (tests) = true / false
  function prospectBid(id, force) {
    const s = S(); const d = s.drivers[id]; if (!d || !d.pros || !live()) return null;
    if (d.pros.bid === undefined || force !== undefined) {
      const ch = U.clamp(0.12 + 0.1 * Math.max(0, Game.potStars(d.potential) - 2), 0.1, 0.45);
      d.pros.bid = (force === true || (force === undefined && U.chance(ch))) ? { rv: U.pick(RIVALS).id, salary: r100(Game.prospectSalary(d) * U.rand(1.35, 1.7)) } : null;
    }
    return d.pros.bid;
  }
  function outbidAmt(bid) { return r100(bid.salary * 1.1); }
  function loseProspect(id) {
    const s = S(); const d = s.drivers[id]; if (!d || !d.pros) return;
    const R = rival(d.pros.bid ? d.pros.bid.rv : 'kolby');
    s.scout.list = s.scout.list.filter(x => x !== id); delete s.drivers[id];
    const msg = 'PROSPECT ' + Game.driverName(d).toUpperCase() + ' SIGNS WITH ' + R.team + '.'; Game.news(msg); logBiz(msg); Game.save();
  }

  // ---------- manufacturers ----------
  function makesFor(si) {
    const s = S(); const sr = DATA.SERIES[si === undefined ? s.seriesIdx : si];
    if (sr.path === 'nascar') return ['chevy', 'ford', 'toyota'].concat(sr.id === 'cup' && ((s && s.year) || DODGE.year) >= MAKES.dodge.since ? ['dodge'] : []);
    if (sr.id === 'indycar') return ['honda', 'chevy']; return [];
  }
  function deal() { const s = S(); const d = s && s.biz && s.biz.mfr.deal; return d && d.season === s.season ? d : null; }
  function engineBonus() { const s = S(); if (!s || s.free || !s.biz) return 0; const d = deal(); return d ? d.perf : 0; }
  function tierFor() { const s = S(); const bonus = s.results.length && Game.teamBestPos() <= 5 ? 10 : 0; const sc = s.rep + bonus; return sc >= 60 ? 2 : sc >= 28 ? 1 : 0; }
  function makeOffer(make, tier, f, renewal) {
    const s = S(); const T = TIERS[tier]; const left = Math.max(1, racesLeft() || Game.nRaces());
    const cash = r1k(T.cash * ser().mult * (f || 1) * U.rand(0.94, 1.08));
    const goals = T.goals.map(([type, k]) => ({ type, n: type === 'win' ? 1 : Math.max(1, Math.round(k * left)) }));
    if (make === 'dodge') { // v1.8 underdog terms
      const c = r1k(cash * DODGE.cashF), perf = Math.round(T.perf * dodgePerfF(s.year) * 20) / 20;
      return { id: U.uid('mo'), make, tier, cash: c, perf, goals, exp: wk() + 3, renewal: !!renewal, f: f || 1, winBonus: r1k(c * DODGE.winF) };
    }
    return { id: U.uid('mo'), make, tier, cash, perf: T.perf, goals, exp: wk() + 3, renewal: !!renewal, f: f || 1 };
  }
  function rollMfr(force, sum) {
    const s = S(); const m = s.biz.mfr; const now = wk();
    const makes = makesFor(); m.offers = m.offers.filter(o => o.exp >= now && makes.includes(o.make));
    if (!makes.length || s.seasonOver || racesLeft() < 2 || m.offers.length >= 2) return null;
    const d = deal(); const p = force ? 1 : d ? 0.05 : 0.15 + s.rep / 300;
    if (!U.chance(p)) return null;
    const pool = makes.filter(k => (!d || d.make !== k) && !(m.cool[k] >= s.season) && !m.offers.some(o => o.make === k)); if (!pool.length) return null;
    const o = makeOffer(U.pick(pool), tierFor()); m.offers.push(o);
    Game.news(MAKES[o.make].name + ' OFFERS ' + S().team.name + ' A ' + TIERS[o.tier].name + ' DEAL: ' + U.money(o.cash) + ' A SEASON + ENGINE HELP. SEE BUSINESS.');
    if (sum) (sum.bizNotes = sum.bizNotes || []).push(MAKES[o.make].name + ' WANTS A DEAL. SEE BUSINESS.');
    return o;
  }
  function switchCost(o) { const d = deal(); return d && d.make !== o.make ? r1k(d.cash * 0.25 + o.cash * 0.1) : 0; }
  function acceptMfr(id) {
    const s = S(); const m = s.biz.mfr; const o = m.offers.find(x => x.id === id); if (!o) return 'THAT OFFER IS GONE.';
    if (s.seasonOver || racesLeft() <= 0) return 'THE SEASON IS OVER - SIGN IN THE NEW SEASON.';
    const cost = switchCost(o); if (cost && s.money < cost) return 'SWITCHING COSTS ' + U.money(cost) + '. NOT ENOUGH MONEY.';
    const old = deal(); s.money -= cost;
    const left = Math.max(1, racesLeft());
    m.deal = { make: o.make, tier: o.tier, cash: o.cash, perf: o.perf, goals: o.goals.map(g => Object.assign({}, g)), from: s.week, season: s.season, races: left, perRace: r100(o.cash / left), paid: 0 };
    if (o.winBonus) { m.deal.winBonus = o.winBonus; m.deal.wins = 0; }
    m.offers = [];
    const msg = s.team.name + (old && old.make !== o.make ? ' SWITCHES FROM ' + MAKES[old.make].name + ' TO ' : ' SIGNS WITH ') + MAKES[o.make].name + ' (' + TIERS[o.tier].name + ')' + (cost ? '. SWITCH COST ' + U.money(cost) : '') + '.';
    Game.news(msg); logBiz(msg); Game.save(); return null;
  }
  function declineMfr(id) { const m = S().biz.mfr; m.offers = m.offers.filter(o => o.id !== id); Game.save(); }
  // goal progress: counts races since the deal was signed; a race counts when any team car hits the mark
  function goalProgress(d) {
    const s = S(); d = d || deal(); if (!d) return [];
    const res = s.results.slice(d.from - 1);
    const best = res.map(r => { const mine = (r.order || []).filter(o => o.id === 'P' || o.id === 'P2'); return mine.length ? Math.min(...mine.map(o => o.pos)) : 99; });
    return d.goals.map(g => ({ type: g.type, n: g.n, got: best.filter(p => p <= GOAL_POS[g.type]).length, text: GOAL_TXT[g.type] }));
  }
  function goalText(g) { return g.type === 'win' ? 'WIN A RACE' : g.n + ' ' + GOAL_TXT[g.type]; }

  // ---------- hooks from career.js ----------
  function raceLines(sum, cars) {
    if (!live()) return; const s = S(); const b = s.biz;
    if (s.seriesIdx === CUP) {
      for (const { tc, r } of cars) if (carCharter(tc.id)) sum.lines.push(['CHARTER SHARE' + (cars.length > 1 ? ' #' + tc.number : '') + ' (+30%)', r100(Game.purse(r.pos) * CHARTER_SHARE)]);
      const out = teamDNQ();
      if (out.length) {
        sum.dnq = out.map(c => c.number);
        for (const c of out) {
          const d = Game.carDriver(c.slot); sum.lines.push(['DNQ #' + c.number + ' - NO PURSE', 0]);
          if (d) { sum.lines.push(['DRIVER SALARY #' + c.number + ' (DNQ)', -d.salary]); d.morale = U.clamp((d.morale || 70) - 5, 10, 100); }
          if (c.slot === 2) sum.lines.push(['CAR 2 TRAVEL & CREW', -Game.car2RunCost()]);
        }
      }
    }
    const d = deal();
    if (d && d.paid < d.races) { d.paid++; sum.lines.push([MAKES[d.make].short + ' SUPPORT', d.perRace]); }
    if (d && d.winBonus > 0 && (d.wins || 0) < DODGE.winMax && cars.some(c => c.r && c.r.pos === 1)) { d.wins = (d.wins || 0) + 1; sum.lines.push([MAKES[d.make].short + ' WIN BONUS', d.winBonus]); }
    const c = chief(); if (c && c.raiseF > 0) sum.lines.push(['CREW CHIEF RAISE', -r100(basePay(s.seriesIdx) * c.raiseF)]);
  }
  function afterRace(sum) {
    if (!live()) return; const s = S(); const b = s.biz; const now = wk();
    b.cvPrev = b.cv; b.cv = r10k(b.cv * (1 + U.rand(-0.012, 0.02)));
    // offers that ran out = you let them go
    for (const p of poachOpen()) if (p.exp <= now) { const m = depart(p, 'expired'); (sum.bizNotes = sum.bizNotes || []).push('NO ANSWER IN TIME: ' + m); }
    rollPoach(sum);
    rollMfr(false, sum);
    // the clock moves a week: expire on the next week's key
    s.week++; refreshMarket(false); s.week--;
  }
  // season end, once (before the next season starts): manufacturer goal check, leases end, charter values jump
  function seasonEnd() {
    if (!live()) return; const s = S(); const b = s.biz; const m = b.mfr; const d = deal();
    if (d) {
      const prog = goalProgress(d); const ratio = prog.reduce((a, g) => a + Math.min(1, g.got / g.n), 0) / prog.length; const met = prog.every(g => g.got >= g.n);
      const outcome = met ? 'better' : ratio >= 0.5 ? 'smaller' : 'ended';
      m.review = { make: d.make, tier: d.tier, season: s.season, year: s.year, goals: prog, met, outcome };
      m.renew = outcome === 'ended' ? null : { make: d.make, tier: Math.min(2, d.tier + (met && s.rep >= 28 + d.tier * 32 ? 1 : 0)), f: met ? 1.15 : 0.75 };
      if (outcome === 'ended') m.cool[d.make] = s.season + 1;
      const msg = outcome === 'better' ? MAKES[d.make].name + ' IS HAPPY - EVERY GOAL MET. A BIGGER DEAL IS COMING FOR NEXT SEASON.'
        : outcome === 'smaller' ? MAKES[d.make].name + ' MISSED SOME GOALS - THEY OFFER A SMALLER DEAL FOR NEXT SEASON.'
        : MAKES[d.make].name + ' ENDS THE DEAL - TOO MANY GOALS MISSED.';
      Game.news(msg); logBiz(msg); m.deal = null;
    }
    m.offers = [];
    if (b.leaseIn.length || b.own.some(c => c.out)) logBiz('CHARTER LEASES END WITH THE SEASON.');
    b.leaseIn = []; for (const c of b.own) c.out = null;
    b.cvPrev = b.cv; b.cv = r10k(b.cv * (1 + U.rand(0.02, 0.1)));
    b.forSale = []; b.leaseOffers = [];
    for (const p of poachOpen()) depart(p, 'season');
  }
  // drivers who signed with a rival leave before contracts are counted
  function preSeason(freshTeam) {
    if (!live()) return; const s = S();
    for (const id of Game.teamDriverIds()) {
      const d = s.drivers[id]; if (!d || !d.leaving) continue;
      const R = rival(d.leaving); Game.removeFromTeam(id); delete s.drivers[id];
      const msg = Game.driverName(d).toUpperCase() + ' JOINS ' + R.team + '. FIND A NEW DRIVER IN DRIVERS.'; Game.news(msg); logBiz(msg);
    }
  }
  function seasonStart(changed, freshTeam) {
    const s = S(); if (!s || s.free || s.demo) return; ensure(s); const b = s.biz; const m = b.mfr;
    if (freshTeam) { s.team.chief = genChief(s, U.randi(42, 60)); b.poach = []; m.deal = null; m.renew = null; }
    else if (s.team.chief) s.team.chief.rating = Math.min(85, s.team.chief.rating + U.randi(0, 2));
    if (m.renew && makesFor().includes(m.renew.make)) {
      const o = makeOffer(m.renew.make, m.renew.tier, m.renew.f, true); o.exp = wk() + 4; m.offers = [o];
      Game.news(MAKES[o.make].name + ' RENEWAL OFFER: ' + U.money(o.cash) + ' FOR THE SEASON (' + (m.renew.f > 1 ? 'UP' : 'DOWN') + ' ON LAST YEAR). SEE BUSINESS.');
    }
    m.renew = null;
    rollMfr(!m.offers.length && U.chance(0.5));
    if (s.seriesIdx === CUP && makesFor().includes('dodge') && !b.dodgeNews) { b.dodgeNews = true; Game.news('DODGE IS BACK IN THE CUP SERIES WITH KAULIG RACING AS ITS FACTORY TEAM. THE UNDERDOG PAYS LESS BUT ADDS A WIN BONUS - SEE BUSINESS.'); }
    refreshMarket(true);
    if (s.seriesIdx === CUP && s.mode === 'owner' && chartersInUse() < Game.teamCars().length)
      Game.news('CUP CHARTERS: ' + (chartersInUse() ? 'ONE OF YOUR CARS IS' : 'YOU ARE') + ' AN OPEN ENTRY - RACE IN ON SPEED (4 OPEN SPOTS), OR LEASE / BUY A CHARTER IN BUSINESS.');
  }
  function alerts() { const s = S(); if (!s || !s.biz || s.free) return 0; return poachOpen().length + s.biz.mfr.offers.length; }
  function badgeHTML(sc) {
    const s = S(); if (!s || !s.biz || s.free) return ''; const d = deal(); if (!d) return '';
    const M = MAKES[d.make]; return `<span class="mk-badge" style="background:${M.bg}" title="${M.name}">${PF.img(M.short, { scale: sc || 2, color: M.fg })}</span>`;
  }
  return {
    CHARTERS, RIVALS, MAKES, TIERS, CHARTER_SHARE, DODGE, dodgePerfF, ensure, migrate, live, inCup, racesLeft,
    held, chartersInUse, carCharter, myValue, sellPrice, leaseInFee, leaseOutFee, leaseCost, canBuyHere, refreshMarket, buyCharter, sellCharter, leaseIn, leaseOut, charterUse, fieldCut, teamDNQ, sitOut,
    chief, chiefPay, chiefCrew, poachOpen, targetName, curPay, counterAmt, counter, letGo, forcePoach, rollPoach, stayChance, prospectBid, outbidAmt, loseProspect, rival,
    makesFor, deal, engineBonus, rollMfr, makeOffer, acceptMfr, declineMfr, switchCost, goalProgress, goalText, tierFor,
    raceLines, afterRace, seasonEnd, preSeason, seasonStart, alerts, badgeHTML,
  };
})();

// ---------- the BUSINESS screen (hub: BUSINESS button, or B on a keyboard) ----------
const BizUI = (() => {
  if (typeof UI === 'undefined' || !UI.h) return null;
  const H = UI.h; const T = H.T; const S = () => Game.S;
  const ui = { tab: 'charters' };
  const money = v => U.money(v);
  function tabs() {
    const n = Biz.poachOpen().length; const m = S().biz.mfr.offers.length;
    const list = [['charters', 'CHARTERS'], ['rivals', 'RIVALS' + (n ? ' (' + n + ')' : '')], ['maker', 'MANUFACTURER' + (m ? ' (' + m + ')' : '')]];
    if (typeof RDUI !== 'undefined' && RDUI) list.push(...RDUI.tabs()); // v1.6 race day: PIT CREW + DRAMA
    return `<div class="row biz-tabs">${list.map(([t, l]) => `<button class="btn ${ui.tab === t ? 'orange sel' : 'dark'}" data-act="bizTab" data-arg="${t}">${l}</button>`).join('')}</div>`;
  }
  function badge(make, sc) { const M = Biz.MAKES[make]; return `<span class="mk-badge" style="background:${M.bg}">${PF.img(M.short, { scale: sc || 2, color: M.fg })}</span>`; }
  function charters() {
    const s = S(); const b = s.biz; const sr = Game.ser();
    const trend = b.cv - b.cvPrev; const pct = b.cvPrev ? trend / b.cvPrev * 100 : 0;
    const val = `<div class="biz-val"><span class="small">MARKET VALUE</span>${T(U.moneyShort(b.cv), 3, H.SH)}<span class="small ${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '+' : ''}${pct.toFixed(1)}% THIS WEEK</span></div>`;
    const head = `<div class="panel biz-head"><div class="row" style="justify-content:space-between;align-items:center"><div>${T('36', 4, H.SH)}<div class="small">CUP CHARTERS</div></div>${val}</div>
      <div class="tiny" style="line-height:1.5;margin-top:4px">40-CAR CUP FIELD: 36 CHARTERED CARS ARE GUARANTEED A START AND GET A 30% BIGGER PURSE SHARE. OPEN CARS FIGHT FOR THE LAST 4 SPOTS ON QUALIFYING SPEED.</div></div>`;
    if (sr.path !== 'nascar') return `<div class="cols"><div class="col narrow">${head}</div><div class="col"><div class="panel small" style="line-height:1.6">CHARTERS ARE A NASCAR CUP SERIES THING. ${sr.path === 'indy' ? 'ON THE ROAD TO INDYCAR EVERY TEAM THAT PAYS THE ENTRY RACES.' : 'PICK THE NASCAR ROAD AFTER KARTING TO BUY ONE LATER.'}</div></div></div>`;
    let cars = '';
    if (Biz.inCup()) cars = Game.teamCars().map(c => { const ch = Biz.carCharter(c.id); return `<div class="biz-car ${ch ? 'ch' : 'open'}"><span class="tag">#${c.number}</span><span class="grow"><b>${ch ? 'CHARTERED' : 'OPEN CAR'}</b><br><span class="tiny">${ch ? 'GUARANTEED START · +30% PURSE' : 'MUST RACE IN ON SPEED - CAN MISS THE RACE'}</span></span></div>`; }).join('');
    const status = `<div class="panel ${Biz.inCup() && Biz.chartersInUse() < Game.teamCars().length ? 'red' : 'green'}"><h3>YOUR CARS</h3>${Biz.inCup() ? cars : `<div class="small" style="line-height:1.5">${sr.rank >= 2 ? 'YOU RACE IN THE ' + sr.name + '. BUY A CHARTER NOW (LEASE IT OUT UNTIL YOUR CUP DEBUT), OR BUY IN AS AN OPEN TEAM LATER.' : 'CHARTERS GO ON SALE TO YOU FROM THE O\'REILLY SERIES UP. THE CUP BUY-IN ALWAYS GETS YOU IN AS AN OPEN TEAM.'}</div>`}
      ${s.hired ? '<div class="tiny" style="margin-top:4px">YOUR BOSS OWNS THE TEAM\'S CHARTERS - YOUR CUP CARS ALWAYS START.</div>' : ''}</div>`;
    const use = Biz.charterUse();
    const mine = b.own.map(c => `<div class="list-row biz-row"><span class="tag">#${c.no}</span><span class="grow">OWNED · WORTH ${money(Biz.myValue())}<div class="tiny">${use['o' + c.no]}${c.out ? ' · +' + money(c.out.fee) : ''}</div></span>
        ${s.mode === 'owner' ? `<button class="btn ${c.out ? 'grey' : 'red'}" data-act="bizSell" data-arg="${c.no}">SELL ${U.moneyShort(Biz.sellPrice())}</button><button class="btn ${c.out || Biz.racesLeft() <= 0 ? 'grey' : 'blue'}" data-act="bizLeaseOut" data-arg="${c.no}">LEASE OUT ${U.moneyShort(Biz.leaseOutFee())}</button>` : ''}</div>`).join('')
      + b.leaseIn.map(c => `<div class="list-row biz-row"><span class="tag">#${c.no}</span><span class="grow">LEASED FROM ${U.esc(c.from)}<div class="tiny">${use['l' + c.no]} · ENDS WITH THE SEASON</div></span></div>`).join('');
    const sale = b.forSale.map(l => `<div class="list-row biz-row"><span class="tag">#${l.no}</span><span class="grow">${U.esc(l.seller)}<div class="tiny">SELLING · ${money(l.price)}</div></span><button class="btn ${s.money >= l.price && Biz.held() < 2 && s.mode === 'owner' ? 'green' : 'grey'}" data-act="bizBuy" data-arg="${l.id}">BUY ${U.moneyShort(l.price)}</button></div>`).join('');
    const lease = b.leaseOffers.map(l => `<div class="list-row biz-row"><span class="tag">#${l.no}</span><span class="grow">${U.esc(l.from)}<div class="tiny">LEASE FOR THE ${Biz.racesLeft()} RACES LEFT</div></span><button class="btn ${s.money >= Biz.leaseCost(l) ? 'green' : 'grey'}" data-act="bizLeaseIn" data-arg="${l.id}">LEASE ${U.moneyShort(Biz.leaseCost(l))}</button></div>`).join('');
    const right = `<div class="small ol">YOUR CHARTERS (${Biz.held()}/2)</div>${mine || '<div class="panel small">NONE YET.</div>'}
      ${s.mode === 'owner' ? `<div class="small ol">FOR SALE${Biz.canBuyHere() ? '' : ' (FROM THE O\'REILLY SERIES UP)'}</div>${sale || '<div class="panel small">NOTHING ON THE MARKET THIS WEEK.</div>'}` : ''}
      ${s.mode === 'owner' && Biz.inCup() ? `<div class="small ol">LEASE ONE IN (REST OF SEASON)</div>${lease || '<div class="panel small">' + (Biz.chartersInUse() >= Game.teamCars().length ? 'EVERY CAR HAS A CHARTER.' : 'NO LEASE OFFERS THIS WEEK.') + '</div>'}` : ''}`;
    return `<div class="cols"><div class="col narrow">${head}${status}</div><div class="col">${right}</div></div>`;
  }
  function rivals() {
    const s = S(); const b = s.biz; const open = Biz.poachOpen();
    const cards = open.map(p => { const R = Biz.rival(p.rv); const d = p.kind === 'driver' ? s.drivers[p.tid] : null; const left = Math.max(1, p.exp - (s.season * 100 + s.week) + 1);
      return `<div class="panel red biz-offer"><div class="small">${U.esc(R.team)} · ${U.esc(R.name)}</div><div class="ol1" style="margin:3px 0">WANTS ${p.kind === 'chief' ? 'CREW CHIEF ' : ''}${U.esc(Biz.targetName(p))}</div>
        <div class="tiny" style="line-height:1.5">NOW ${money(Biz.curPay(p))}/RACE · THEY OFFER <b class="neon">${money(p.offer)}/RACE</b><br>ROUND ${p.round} OF UP TO ${p.max}${d ? ' · MORALE ' + Math.round(d.morale || 70) + ' · CONTRACT ' + d.contract + ' YR' + (d.contract > 1 ? 'S' : '') : ''} · ANSWER WITHIN ${left} RACE${left === 1 ? '' : 'S'}</div>
        <div class="row" style="margin-top:6px;gap:6px"><button class="btn green" style="flex:1" data-act="bizCounter" data-arg="${p.id}">COUNTER ${U.moneyShort(Biz.counterAmt(p))}/RACE</button><button class="btn dark" style="flex:1" data-act="bizLetGo" data-arg="${p.id}">LET GO</button></div></div>`; }).join('');
    const c = Biz.chief();
    const chiefP = c ? `<div class="panel"><h3>CREW CHIEF</h3><div class="row" style="align-items:center"><span class="ovr">${c.rating}</span><span class="grow small">${U.esc((c.first + ' ' + c.last).toUpperCase())}<br><span class="tiny">${money(Biz.chiefPay())}/RACE${c.raiseF > 0 ? ' (INCL. RAISE)' : ''} · PIT CREW ${Biz.chiefCrew() >= 0 ? '+' : ''}${Math.round(Biz.chiefCrew() * 100)}%</span></span></div></div>` : '';
    const left = (cards || `<div class="panel small" style="line-height:1.55">NO OFFERS ON THE TABLE. RIVAL OWNERS CIRCLE WHEN A CONTRACT IS IN ITS LAST YEAR OR A DRIVER RUNS UP FRONT. HAPPY DRIVERS ARE EASIER TO KEEP - A GOOD COUNTER USUALLY WINS.</div>`) + chiefP;
    const rv = Biz.RIVALS.map(R => `<div class="list-row biz-row" style="cursor:default"><span class="grow">${U.esc(R.name)}<div class="tiny">${U.esc(R.team)} · ${R.style}</div></span></div>`).join('');
    const log = b.log.length ? `<div class="panel tiny biz-log">${b.log.slice(0, 6).map(e => `<div>S${e.s} R${e.w}: ${U.esc(e.text)}</div>`).join('')}</div>` : '';
    return `<div class="cols"><div class="col">${left}</div><div class="col"><div class="small ol">RIVAL OWNERS</div>${rv}${log}</div></div>`;
  }
  function maker() {
    const s = S(); const m = s.biz.mfr; const makes = Biz.makesFor(); const sr = Game.ser();
    if (!makes.length) return `<div class="panel small" style="line-height:1.6">${sr.kart ? 'NO FACTORY DEALS IN KARTING.' : 'THE JUNIOR OPEN-WHEEL SERIES RUN SPEC ENGINES, SO NO MANUFACTURER DEALS HERE. IN INDYCAR, HONDA AND CHEVROLET SUPPLY ENGINES.'}</div>`;
    const d = Biz.deal();
    const cur = d ? `<div class="panel green"><div class="row" style="align-items:center;gap:8px">${badge(d.make, 3)}<span class="grow small">${Biz.TIERS[d.tier].name} DEAL<br><span class="tiny">${money(d.perRace)}/RACE · ENGINE +${d.perf.toFixed(1)}${d.winBonus ? ' · WIN BONUS ' + money(d.winBonus) + ' (' + (d.wins || 0) + '/' + Biz.DODGE.winMax + ')' : ''}</span></span></div>
        ${Biz.goalProgress(d).map(g => `<div class="tiny biz-goal"><span>${g.type === 'win' ? 'WIN A RACE' : g.text}</span><b class="${g.got >= g.n ? 'up' : ''}">${g.got}/${g.n}</b></div>`).join('')}<div class="tiny" style="margin-top:4px;line-height:1.4">GOALS ARE CHECKED AT SEASON END: HIT THEM FOR A BIGGER DEAL, MISS THEM AND IT SHRINKS OR ENDS.</div></div>`
      : `<div class="panel"><h3>INDEPENDENT</h3><div class="small" style="line-height:1.5">NO MANUFACTURER DEAL. ${makes.map(k => Biz.MAKES[k].name).join(', ')} WATCH YOUR REP AND RESULTS.</div></div>`;
    const rv = m.review ? `<div class="panel ${m.review.outcome === 'better' ? 'green' : m.review.outcome === 'smaller' ? 'orange' : 'red'} tiny" style="line-height:1.5">${m.review.year} REVIEW · ${Biz.MAKES[m.review.make].name}: ${m.review.goals.map(g => (g.type === 'win' ? 'WIN' : g.text) + ' ' + g.got + '/' + g.n).join(' · ')} → ${m.review.outcome === 'better' ? 'BIGGER DEAL' : m.review.outcome === 'smaller' ? 'SMALLER DEAL' : 'DEAL ENDED'}</div>` : '';
    const offers = m.offers.map(o => { const cost = Biz.switchCost(o); return `<div class="panel biz-mo"><div class="row" style="align-items:center;gap:8px">${badge(o.make, 3)}<span class="grow small">${Biz.TIERS[o.tier].name}${o.renewal ? ' · RENEWAL' : ''}</span></div>
        <div class="tiny" style="line-height:1.5;margin:4px 0">${money(o.cash)} A SEASON · ENGINE +${o.perf.toFixed(1)}<br>GOALS: ${o.goals.map(Biz.goalText).join(' + ')}${o.winBonus ? '<br><span style="color:#7dff7d">UNDERDOG: ' + money(o.winBonus) + ' PER WIN (MAX ' + Biz.DODGE.winMax + '). ENGINE AT ' + Math.round(Biz.dodgePerfF(s.year) * 100) + '% OF THE BIG 3, CLOSING EVERY SEASON.</span>' : ''}${cost ? '<br><span class="neon">SWITCH COST ' + money(cost) + '</span>' : ''}</div>
        <div class="row" style="gap:6px"><button class="btn green" style="flex:1" data-act="bizMfrYes" data-arg="${o.id}">SIGN</button><button class="btn dark" style="flex:1" data-act="bizMfrNo" data-arg="${o.id}">NO THANKS</button></div></div>`; }).join('');
    return `<div class="cols"><div class="col narrow">${cur}${rv}</div><div class="col"><div class="small ol">OFFERS · ONE MAKE AT A TIME</div>${offers || '<div class="panel small" style="line-height:1.5">NO OFFERS RIGHT NOW. MORE REP AND BETTER RESULTS BRING BIGGER ONES.</div>'}</div></div>`;
  }
  function screen() {
    const s = S(); if (!s || s.free) return UI.go('hub');
    Biz.ensure(s); UI.ui.screen = 'business';
    const rdb = typeof RDUI !== 'undefined' && RDUI ? RDUI.body(ui.tab) : null;
    const body = rdb || (ui.tab === 'rivals' ? rivals() : ui.tab === 'maker' ? maker() : charters());
    H.render(H.page('BUSINESS', `${tabs()}${body}`));
  }
  function ref() { screen(); }
  function bidModal(id, dest) {
    const s = S(); const d = s.drivers[id]; const bid = Biz.prospectBid(id); const R = Biz.rival(bid.rv);
    H.modal(`<div class="ol1">RIVAL BID!</div><div class="small" style="margin:8px 0;line-height:1.55">${U.esc(R.team)} ALSO WANTS ${U.esc(Game.driverName(d).toUpperCase())} AND OFFERS ${money(bid.salary)}/RACE. OUTBID THEM AT ${money(Biz.outbidAmt(bid))}/RACE (3 YEARS), OR LET THEM HAVE THE PROSPECT.</div>
      <div class="row" style="justify-content:flex-end;gap:6px"><button class="btn dark" data-act="bizBidLose" data-arg="${id}">LET THEM HAVE IT</button><button class="btn green" data-act="bizBidWin" data-arg="${id}|${dest}"${H.KB('enter', 'ENTER')}>OUTBID ${U.moneyShort(Biz.outbidAmt(bid))}</button></div>`);
  }
  let prev = {};
  const acts = {
    bizTab: (t) => { ui.tab = t; screen(); },
    bizBuy: (id) => { const l = S().biz.forSale.find(x => x.id === id); if (!l) return; H.confirmBox('BUY CHARTER #' + l.no + ' FROM ' + l.seller + ' FOR ' + money(l.price) + '?', 'BUY', () => { const e = Biz.buyCharter(id); H.closeModal(); if (e) return H.toast(e); ref(); H.toast('CHARTER BOUGHT!'); }); },
    bizSell: (no) => { H.confirmBox('SELL CHARTER #' + no + ' FOR ' + money(Biz.sellPrice()) + '? A CUP CAR WITHOUT A CHARTER HAS TO RACE IN ON SPEED.', 'SELL', () => { const e = Biz.sellCharter(no); H.closeModal(); if (e) return H.toast(e); ref(); H.toast('CHARTER SOLD'); }, 'red'); },
    bizLeaseOut: (no) => { H.confirmBox('LEASE CHARTER #' + no + ' OUT FOR THE REST OF THE SEASON FOR ' + money(Biz.leaseOutFee()) + '?' + (Biz.inCup() ? ' IF A CAR OF YOURS RUNS ON IT, THAT CAR BECOMES AN OPEN ENTRY.' : ''), 'LEASE OUT', () => { const e = Biz.leaseOut(no); H.closeModal(); if (e) return H.toast(e); ref(); H.toast('CHARTER LEASED OUT'); }); },
    bizLeaseIn: (id) => { const e = Biz.leaseIn(id); if (e) return H.toast(e); ref(); H.toast('CHARTER LEASED - GUARANTEED STARTS!'); },
    bizCounter: (id) => { const r = Biz.counter(id); if (r.err) return H.toast(r.err); ref(); H.toast(r.state === 'raised' ? 'THEY RAISED THEIR OFFER!' : r.state === 'kept' ? 'THEY STAY!' : 'LOST THE BIDDING WAR'); },
    bizLetGo: (id) => { const r = Biz.letGo(id); if (r.err) return H.toast(r.err); ref(); H.toast('LET GO'); },
    bizMfrYes: (id) => { const e = Biz.acceptMfr(id); if (e) return H.toast(e); ref(); UI.ui.artCache = {}; H.toast('DEAL SIGNED!'); },
    bizMfrNo: (id) => { Biz.declineMfr(id); ref(); },
    bizBidWin: (a) => { const [id, dest] = a.split('|'); const s = S(); const d = s.drivers[id]; const bid = d && d.pros && d.pros.bid; if (!bid) return H.closeModal();
      const amt = Biz.outbidAmt(bid); bid.done = true; prev.signProspect(a); const dd = s.drivers[id]; if (dd && dd.team === 'P' && !dd.pros) { dd.salary = amt; Game.news(s.team.name + ' OUTBIDS ' + Biz.rival(bid.rv).team + ' FOR ' + Game.driverName(dd).toUpperCase() + ' (' + U.money(amt) + '/RACE).'); Game.save(); } },
    bizBidLose: (id) => { Biz.loseProspect(id); H.closeModal(); UI.go('drivers'); H.toast('THE PROSPECT SIGNED ELSEWHERE'); },
    // rivals can bid for a scouted prospect when you try to sign one
    signProspect: (a) => { const [id, dest] = a.split('|'); const bid = Game.slotOpen(dest) ? Biz.prospectBid(id) : null; if (bid && !bid.done) return bidModal(id, dest); return prev.signProspect(a); },
    bizDNQ: () => { const sum = Biz.sitOut(); UI.ui.summary = sum; UI.ui.prep = null; UI.podium('race'); },
  };
  prev = UI.extend({ business: screen }, acts);
  return { screen, ui, badge };
})();
