/* v1.6 OWNER'S BOX - PASS B: race day.
   RD   = logic: driver radio calls + pit fixes, the pit crew (levels, training, the pit-stop tap game result),
          weather (forecast, rain on ovals = caution / red flag / rain-called race, wets vs slicks on road and street courses),
          driver drama (personalities, feuds after contact, payback wrecks, fines, owner responses, fan hype).
   RDUI = the race-day overlays (radio bubble, pit fix panel, pit-stop tap game, rain, weather icon) and the
          PIT CREW + DRAMA tabs on the Business screen (registered through UI.extend and two small hooks in business.js).
   racesim.js / renderer.js / career.js / ui.js call RD only when it exists (typeof RD !== 'undefined'),
   and a race only gets race-day features when it is built with opts.day (UI races; tests pass it too). */
'use strict';
const RD = (() => {
  const S = () => Game.S;
  const wkOf = s => s.season * 100 + s.week;
  // ---------- personalities ----------
  const PERS = {
    hothead: { name: 'HOTHEAD', feud: 0.85, pay: 2.2, mor: 1.4, hype: 1.2, fb: -6, desc: 'FAST TEMPER. HOLDS GRUDGES, WANTS PAYBACK.' },
    calm: { name: 'CALM', feud: 0.15, pay: 0.3, mor: 0.7, hype: 0.6, fb: 6, desc: 'COOL HEAD. LETS THINGS GO. CLEAR ON THE RADIO.' },
    showman: { name: 'SHOWMAN', feud: 0.5, pay: 1.2, mor: 1.1, hype: 2, fb: 0, desc: 'LOVES THE CAMERAS. DRAMA SELLS HIS MERCH.' },
    team: { name: 'TEAM PLAYER', feud: 0.3, pay: 0.5, mor: 0.9, hype: 0.8, fb: 10, desc: 'PUTS THE TEAM FIRST. GREAT FEEDBACK.' },
  };
  function pers(d) {
    if (!d) return 'calm';
    if (!PERS[d.pers]) {
      const a = d.aggr === undefined ? 50 : d.aggr;
      d.pers = a >= 70 ? (Math.random() < 0.6 ? 'hothead' : 'showman') : a <= 35 ? (Math.random() < 0.6 ? 'calm' : 'team') : U.pick(['hothead', 'calm', 'showman', 'team', 'team', 'calm']);
    }
    return d.pers;
  }
  // feedback: how clearly a driver explains what the car is doing (from tire management + consistency, plus personality)
  function feedback(d) { if (!d) return 50; return U.clamp(Math.round(0.5 * (d.tires || 50) + 0.5 * (d.cons || 50) + PERS[pers(d)].fb), 10, 99); }

  // ---------- radio calls ----------
  const ISSUES = {
    loose: { short: 'LOOSE IN', fix: { stock: 'wedge', ow: 'rwing' }, alt: 'rears', clear: ['CAR\'S LOOSE IN! THE REAR WANTS TO COME AROUND ON ENTRY.', 'LOOSE GETTING IN, REAL LOOSE!'], vague: ['THE BACK END FEELS FUNNY.', 'SOMETHING\'S NOT RIGHT IN THE CORNERS.'] },
    tight: { short: 'TIGHT OFF', fix: { stock: 'bar', ow: 'fwing' }, alt: 'loose', clear: ['TIGHT OFF! IT WON\'T TURN ON EXIT.', 'PUSHING UP THE TRACK OFF THE CORNER - TIGHT!'], vague: ['IT JUST WON\'T ROTATE RIGHT.', 'THE BALANCE IS OFF SOMEWHERE.'] },
    rears: { short: 'REARS GOING', fix: { stock: 'air', ow: 'press' }, alt: 'loose', clear: ['REARS ARE GOING AWAY! NO GRIP OFF THE CORNERS.', 'REAR TIRES ARE SHOT - NO DRIVE!'], vague: ['THE BACK END FEELS FUNNY.', 'LOSING GRIP SOMEWHERE.'] },
    vib: { short: 'VIBRATION', fix: { stock: 'air', ow: 'press' }, alt: 'tight', tires: true, clear: ['VIBRATION! FEELS LIKE A TIRE IS GOING DOWN.', 'BIG VIBRATION ON THE STRAIGHTS!'], vague: ['SOMETHING\'S SHAKING IN THERE.', 'IT FEELS ROUGH.'] },
  };
  const FIXES = {
    stock: [['wedge', 'WEDGE', 'LOOSE IN'], ['bar', 'TRACK BAR', 'TIGHT OFF'], ['air', 'AIR PRESSURE', 'TIRES/SHAKE']],
    ow: [['rwing', 'REAR WING', 'LOOSE IN'], ['fwing', 'FRONT WING', 'TIGHT OFF'], ['press', 'PRESSURES', 'TIRES/SHAKE']],
  };
  const FIX_NAME = { wedge: 'WEDGE', bar: 'TRACK BAR', air: 'AIR PRESSURE', rwing: 'REAR WING', fwing: 'FRONT WING', press: 'TIRE PRESSURES', none: 'NO CHANGE' };
  const SEV0 = 0.0025, SEV_LAP = 0.0008, SEV_MAX = 0.009, FIX_B = 0.0015;
  const kindOf = race => race.ow ? 'ow' : 'stock';

  // ---------- pit crew ----------
  const CREW = [
    { name: 'LOCAL VOLUNTEERS', cost: 0, b: 0 },
    { name: 'WEEKEND CREW', cost: 8000, b: 0.03 },
    { name: 'PRO CREW', cost: 20000, b: 0.06 },
    { name: 'VETERAN CREW', cost: 40000, b: 0.09 },
    { name: 'ELITE CREW', cost: 70000, b: 0.12 },
  ];
  const TRAIN_GAIN = 20, TRAIN_FADE = 6, TRAIN_MAX_B = 0.05;
  // the pit-stop tap game: each wheel shaves or adds a share of the stop time
  const TAP = { perfect: -0.07, good: -0.035, auto: 0, miss: 0.06 };
  const LOOSE_P = 0.25;

  // ---------- weather ----------
  const SKY = { sun: 'SUNNY', cloud: 'CLOUDY', rain: 'RAIN LIKELY' };
  const isOval = geomOrType => (typeof geomOrType === 'string' ? geomOrType : geomOrType.type) !== 'road';

  // ---------- state ----------
  function ensure(s) {
    s = s || S(); if (!s || !s.team) return null;
    if (!s.rd || typeof s.rd !== 'object') s.rd = {};
    const r = s.rd;
    if (!r.v) r.v = 1;
    if (!r.crew || typeof r.crew !== 'object') r.crew = {};
    if (!(r.crew.lvl >= 1 && r.crew.lvl <= CREW.length)) r.crew.lvl = 1;
    if (!(r.crew.train >= 0)) r.crew.train = 0;
    if (r.crew.trainWk === undefined) r.crew.trainWk = -1;
    for (const k of ['feuds', 'issues', 'log']) if (!Array.isArray(r[k])) r[k] = [];
    if (!(r.hype >= 0)) r.hype = 0;
    if (r.fc === undefined) r.fc = null;
    if (r.season === undefined) r.season = s.season;
    if (r.season !== s.season) { // a new season: grudges cool off, open talks are dropped
      r.season = s.season; r.issues = []; for (const f of r.feuds) f.heat = Math.round(f.heat * 0.5); r.feuds = r.feuds.filter(f => f.heat >= 15);
    }
    return r;
  }
  function migrate(o) {
    if (!o || !o.team || o.free) return o;
    ensure(o);
    for (const id of [o.team.driverId, o.team.car2 && o.team.car2.driverId].filter(Boolean)) { const d = o.drivers && o.drivers[id]; if (d) pers(d); }
    return o;
  }
  const ser = () => DATA.SERIES[S().seriesIdx];
  const live = () => { const s = S(); return !!(s && s.team && !s.free && !s.demo); };
  function teamDid(entryId) { const s = S(); if (!s || !s.team) return null; if (entryId === 'P') return s.team.driverId; if (entryId === 'P2') return s.team.car2 && s.team.car2.driverId; const t = (s.ai || []).find(x => x.id === entryId); return t ? t.driverId : null; }
  function entryOfDid(did) { const s = S(); if (!s || !s.team || !did) return null; if (s.team.driverId === did) return 'P'; if (s.team.car2 && s.team.car2.driverId === did) return 'P2'; const t = (s.ai || []).find(x => x.driverId === did); return t ? t.id : null; }
  const isTeamDid = did => { const s = S(); return !!did && (s.team.driverId === did || !!(s.team.car2 && s.team.car2.driverId === did)); };
  const dname = did => { const d = S().drivers[did]; return d ? Game.driverName(d).toUpperCase() : 'A DRIVER'; };
  const dnum = did => { const e = entryOfDid(did); if (!e) return ''; try { return '#' + Game.entryInfo(e).number + ' '; } catch (er) { return ''; } };
  function logRD(text) { const r = ensure(); if (!r) return; r.log.unshift({ s: S().season, w: S().week, text }); if (r.log.length > 12) r.log.pop(); }

  // ---------- crew ----------
  function crewLvl() { const r = ensure(); return r ? r.crew.lvl : 1; }
  function crewCost(lvl) { const L = CREW[(lvl || crewLvl()) - 1]; return Math.round(L.cost * Math.pow(ser().mult, 0.9) / 1000) * 1000; }
  function crewPerRace(lvl) { return Math.round(crewCost(lvl) / Math.max(1, Game.nRaces()) / 100) * 100; }
  function trainCost() { return Math.max(300, Math.round(1500 * Math.pow(ser().mult, 0.8) / 100) * 100); }
  function trainB() { const r = ensure(); return r ? r.crew.train / 100 * TRAIN_MAX_B : 0; }
  function crewBonus() { const s = S(); if (!s || !s.team || !s.rd) return 0; const r = s.rd; return (CREW[(r.crew.lvl || 1) - 1] || CREW[0]).b + (r.crew.train || 0) / 100 * TRAIN_MAX_B; }
  function canTrain() { const s = S(); const r = ensure(); return !s.seasonOver && r.crew.trainWk !== wkOf(s); }
  function setCrew(lvl) {
    const s = S(); const r = ensure(); lvl = +lvl;
    if (!(lvl >= 1 && lvl <= CREW.length)) return 'NO SUCH CREW.';
    if (lvl === r.crew.lvl) return 'THAT IS YOUR CREW ALREADY.';
    if (lvl > r.crew.lvl && s.money < crewPerRace(lvl) * 2) return 'NOT ENOUGH MONEY FOR THAT CREW.';
    const up = lvl > r.crew.lvl; r.crew.lvl = lvl;
    const msg = (up ? 'HIRED ' : 'MOVED TO ') + 'A ' + CREW[lvl - 1].name + ' (' + U.money(crewPerRace(lvl)) + '/RACE).';
    logRD(msg); Game.save(); return null;
  }
  function train() {
    const s = S(); const r = ensure();
    if (!canTrain()) return s.seasonOver ? 'THE SEASON IS OVER.' : 'THE CREW ALREADY TRAINED THIS WEEK.';
    const c = trainCost(); if (s.money < c) return 'NOT ENOUGH MONEY FOR TRAINING.';
    s.money -= c; r.crew.train = Math.min(100, r.crew.train + TRAIN_GAIN + (r.crew.lvl - 1) * 2); r.crew.trainWk = wkOf(s);
    logRD('PIT CREW TRAINING SESSION: SHARPNESS ' + Math.round(r.crew.train) + '%.'); Game.save(); return null;
  }
  // the green zone of the tap game: a bigger crew / more training = a wider zone (also what AUTO is based on)
  function zoneW() { const r = ensure(); const lvl = r ? r.crew.lvl : 1; const t = r ? r.crew.train : 0; return U.clamp(0.1 + (lvl - 1) * 0.022 + t / 100 * 0.03, 0.08, 0.24); }
  function grade(dist, w) { return dist <= w * 0.4 ? 'perfect' : dist <= w ? 'good' : 'miss'; }

  // ---------- weather ----------
  function rollForecast(kart) {
    const r = Math.random();
    if (kart) return r < 0.6 ? { sky: 'sun', rain: U.randi(0, 5) } : { sky: 'cloud', rain: U.randi(5, 15) };
    if (r < 0.55) return { sky: 'sun', rain: U.randi(0, 10) };
    if (r < 0.85) return { sky: 'cloud', rain: U.randi(15, 35) };
    return { sky: 'rain', rain: U.randi(50, 80) };
  }
  function forecast(s) {
    s = s || S(); if (!s || !s.schedule || s.seasonOver) return null; const r = ensure(s); if (!r) return null;
    const wk = wkOf(s); const tid = s.schedule[s.week - 1];
    if (!r.fc || r.fc.wk !== wk || r.fc.tid !== tid) { const kart = !!(DATA.TRACKS[tid] && DATA.TRACKS[tid].kart); r.fc = Object.assign({ wk, tid }, rollForecast(kart)); }
    return r.fc;
  }
  function wxText(fc, tid) {
    if (!fc) return '';
    const t = DATA.TRACKS[tid || fc.tid]; const oval = t && t.type !== 'road';
    const what = fc.rain >= 50 ? (oval ? 'RAIN COULD BRING A RED FLAG - PAST HALFWAY IT CAN END THE RACE.' : 'WET RACE LIKELY - WETS VS SLICKS, TIME THE SWITCH.')
      : fc.rain >= 15 ? (oval ? 'A SHOWER COULD STOP THE RACE.' : 'A SHOWER COULD MEAN A TIRE GAMBLE.') : 'DRY RACE EXPECTED.';
    return SKY[fc.sky] + ' · ' + fc.rain + '% RAIN. ' + what;
  }

  // ---------- race setup ----------
  // what the UI (or a test) hands RaceSim for race-day features: the forecast, the setup, the feuds carried into this race
  function dayFor(geom, P, extra) {
    const s = S(); P = P || {}; const day = { setup: P.setupKey || 'bal', fc: null, feuds: [], chief: 50, fb: {}, pers: {} };
    if (s && s.team) {
      ensure(s);
      day.fc = forecast(s) || rollForecast(!!geom.def.kart);
      day.chief = s.team.chief ? s.team.chief.rating : 50;
      for (const f of s.rd.feuds) { const by = entryOfDid(f.a), on = entryOfDid(f.b); if (by && on && f.heat >= 30) day.feuds.push({ by, on, heat: f.heat, a: f.a, b: f.b }); }
      for (const id of ['P', 'P2']) { const did = teamDid(id); const d = did && s.drivers[did]; if (d) { day.fb[id] = feedback(d); day.pers[id] = pers(d); } }
    }
    if (P.rdForce) day.force = P.rdForce; // tests / tools: force the weather
    return Object.assign(day, extra || {});
  }
  function initRace(race, day) {
    const oval = isOval(race.geom); const T = race.T; const L = race.laps;
    const si = race.geom.seriesIdx; race.ow = !!(si !== undefined && si !== null && DATA.SERIES[si] && DATA.SERIES[si].ow);
    const fc = day.fc || { sky: 'sun', rain: 0 }; const F = day.force || {};
    const R = race.rd = { day, oval, fc, w: 0, raining: false, rained: false, red: false, redT: 0, willCall: false, called: false, spells: [], rainAt: null,
      log: [], feuds: (day.feuds || []).map(f => Object.assign({ done: false }, f)), pitGame: false, game: null, wetCap: !oval && !race.geom.def.kart, advice: {}, calls: {} };
    const rain = F.rain !== undefined ? F.rain : (!race.geom.def.kart && Math.random() * 100 < fc.rain);
    if (rain) {
      if (oval) R.rainAt = F.at !== undefined ? F.at : Math.max(3, Math.round(L * U.rand(0.25, 0.85)));
      else {
        const wetStart = F.wetStart !== undefined ? F.wetStart : Math.random() < 0.45;
        const a = wetStart ? -1 : (F.at !== undefined ? F.at : Math.round(L * U.rand(0.2, 0.5)));
        const len = F.len !== undefined ? F.len : Math.round(L * (wetStart ? U.rand(0.3, 0.55) : U.rand(0.2, 0.4)));
        R.spells.push([a, a + Math.max(2, len)]);
        if (wetStart) { R.w = 0.75; R.raining = true; R.rained = true; }
      }
    }
    if (F.w !== undefined) R.w = F.w;
    for (const c of race.cars) {
      c.rdMod = 0; c.rdRisk = 1; c.rdB = 0; c.rdIssue = null; c.rdCalls = 0; c.rdThr = U.rand(-0.07, 0.07);
      c.wet = R.wetCap && R.w > 0.33;
      if (c.isPlayer) { c.fb = day.fb && day.fb[c.id] !== undefined ? day.fb[c.id] : 55; c.pers = day.pers && day.pers[c.id]; c.rdSeen = 0; }
    }
    if (rain && !oval && R.w > 0.33) race.msg('WET START! EVERYONE STARTS ON WET TIRES', 'yellow');
    else if (rain || fc.rain >= 50) race.msg(SKY[fc.sky] + ' - ' + fc.rain + '% CHANCE OF RAIN TODAY', 'info');
  }
  const sevNow = c => c.rdIssue ? c.rdIssue.sev : 0;

  // ---------- per-step tick (RaceSim.step calls this first; true = the race is held under a red flag) ----------
  function tick(race, dt) {
    const R = race.rd; if (!R) return false;
    const T = race.T; const lt = race.lapTime; const ll = race.leaderLaps();
    // --- weather ---
    if (race.phase === 'racing') {
      if (R.oval) {
        if (!R.rained && R.rainAt !== null && ll >= R.rainAt) {
          R.rained = true; R.raining = true;
          race.msg('RAIN IS FALLING! CAUTION - THE FIELD SLOWS DOWN', 'yellow'); race.onEvent('rdRain', { start: true });
          if (race.flag === 'green') race.startCaution('RAIN', 6); else race.cautionTime = Math.max(race.cautionTime, lt * 3);
        }
        if (R.raining) {
          R.w = Math.min(1, R.w + dt / (lt * 1.4));
          if (race.flag === 'yellow') race.cautionTime = Math.max(race.cautionTime, lt); // no green flag in the rain
          if (!R.red && R.w >= 0.5 && race.flag === 'yellow') {
            R.red = true; R.redT = 4 + lt * 0.3;
            const half = ll >= Math.ceil(race.laps / 2); R.halfway = half;
            R.willCall = R.day.force && R.day.force.call !== undefined ? (half && R.day.force.call) : half && Math.random() < 0.65;
            race.msg('RED FLAG! RAIN - THE CARS STOP' + (half ? ' (PAST HALFWAY: THE RACE CAN BE CALLED)' : ''), 'bad'); race.onEvent('rdRed', { half });
            R.log.push({ kind: 'red', lap: ll, half });
          }
        }
        if (R.red) {
          R.redT -= dt;
          if (R.redT <= 0) {
            R.red = false;
            if (R.willCall) { callRace(race); return true; }
            R.raining = false; R.w = 0.12;
            race.cautionTime = lt / race.paceF * 2; race.msg('JET DRYERS DID THEIR JOB - RESTART COMING UNDER CAUTION', 'yellow'); race.onEvent('rdRain', { start: false });
          }
          return true;
        }
        if (!R.raining && R.w > 0) R.w = Math.max(0, R.w - dt / (lt * 2));
      } else {
        const lapF = ll + (race.order()[0] ? race.frac(race.order()[0].d) : 0);
        const was = R.raining; R.raining = R.spells.some(([a, b]) => lapF >= a && lapF < b);
        if (R.raining && !was) { R.rained = true; race.msg('RAIN! THE TRACK IS GETTING WET', 'yellow'); race.onEvent('rdRain', { start: true }); }
        if (!R.raining && was) { race.msg('THE RAIN STOPS - THE TRACK WILL DRY', 'info'); race.onEvent('rdRain', { start: false }); }
        R.w = U.clamp(R.w + (R.raining ? dt / (lt * 2.5) : -dt / (lt * 5)), 0, 1);
      }
    }
    // --- per car: pace and risk mods, AI tire calls, radio ---
    const green = race.flag === 'green' && race.phase === 'racing';
    for (const c of race.cars) {
      if (c.status !== 'run') continue;
      let mod = 0, risk = 1;
      if (R.wetCap && R.w > 0.01) {
        if (c.wet) { mod -= 0.05 * (1 - R.w) + 0.015 * R.w; risk = 1 + 0.6 * R.w; if (R.w < 0.3 && green && c.v > 0) c.tire = Math.max(0.05, c.tire - T.wear * 1.5 * (0.3 - R.w) / 0.3 * c.v * dt); }
        else { mod -= 0.12 * Math.pow(R.w, 1.1); risk = 1 + 5 * R.w; }
      } else if (R.wetCap && c.wet) mod -= 0.05;
      if (c.isPlayer) {
        if (c.rdIssue) { if (green) c.rdIssue.sev = Math.min(SEV_MAX, c.rdIssue.sev + SEV_LAP * dt / lt); mod -= c.rdIssue.sev; }
        mod += c.rdB || 0;
      }
      c.rdMod = mod; c.rdRisk = risk;
      // tire calls on a wet / drying road course
      if (R.wetCap && !c.pit && race.phase === 'racing' && (green || race.flag === 'yellow')) {
        const lapsLeft = race.laps - c.laps; const thr = 0.33 + c.rdThr;
        const want = !c.wet && R.w > thr + 0.06 ? 'wet' : c.wet && R.w < thr - 0.06 ? 'slick' : null;
        if (want && lapsLeft > 2) {
          if (!c.isPlayer || race.autoPlayer) { c.pit = { type: 'four', phase: 'wait', tires: want }; if (c.isPlayer) race.msg(race.tag(c) + 'CREW CHIEF: BOX FOR ' + (want === 'wet' ? 'WETS' : 'SLICKS') + '!', 'player'); }
          else if (R.advice[c.id] !== want) { R.advice[c.id] = want; const t = want === 'wet' ? 'IT\'S WET OUT THERE - BOX FOR WETS?' : 'TRACK IS DRYING - TIME FOR SLICKS?'; race.msg(race.tag(c) + 'CREW CHIEF: ' + t, 'player'); race.onEvent('rdRadio', { carId: c.id, text: t, who: 'CHIEF', tires: want }); }
        }
      }
      // radio calls from your drivers (green flag, one issue at a time, at most 3 per race)
      if (c.isPlayer && green && !c.pit && !c.rdIssue && c.laps > c.rdSeen) {
        c.rdSeen = c.laps;
        const left = race.laps - c.laps; const sm = { qual: 1.45, race: 0.65, bal: 1 }[R.day.setup] || 1;
        if (c.laps >= 2 && left > 3 && c.rdCalls < 3 && Math.random() < 1.3 / Math.max(8, race.laps) * sm) radioCall(race, c);
      }
    }
    // --- payback: a driver with a grudge can dump the car he is mad at ---
    if (green && race.t > 5 && race.restartT <= 0) {
      for (const f of R.feuds) {
        if (f.done || f.heat < 45) continue;
        const by = race.cars.find(c => c.id === f.by), on = race.cars.find(c => c.id === f.on);
        if (!by || !on || by.status !== 'run' || on.status !== 'run' || by.pit || on.pit) continue;
        let gp = (race.frac(on.d) - race.frac(by.d)) * race.geom.L; if (gp < 0) gp += race.geom.L;
        if (gp > 20 && gp < 60) { const pm = (PERS[f.byPers || persOfEntry(by.id)] || PERS.calm).pay; if (Math.random() < 0.05 * f.heat / 100 * pm * dt) payback(race, by, on, f); }
      }
    }
    return false;
  }
  function persOfEntry(id) { const s = S(); const did = s && teamDid(id); const d = did && s.drivers[did]; return d ? pers(d) : 'calm'; }
  function radioCall(race, c, kForce, clearForce) {
    const R = race.rd; const kd = kindOf(race);
    const k = kForce || U.pick(['loose', 'loose', 'tight', 'tight', 'rears', 'vib']); const I = ISSUES[k];
    const clarity = U.clamp(0.3 + (c.fb || 50) / 120, 0.3, 0.95);
    const clear = clearForce !== undefined ? clearForce : Math.random() < clarity;
    const correct = I.fix[kd];
    const pc = clear ? 0.93 : U.clamp(0.4 + R.day.chief / 250, 0.4, 0.8);
    const guess = Math.random() < pc ? correct : ISSUES[I.alt].fix[kd] === correct ? (FIXES[kd].find(f => f[0] !== correct) || FIXES[kd][0])[0] : ISSUES[I.alt].fix[kd];
    const text = U.pick(clear ? I.clear : I.vague);
    c.rdIssue = { k, sev: SEV0, clear, guess, correct, lap: c.laps, text }; c.rdCalls++;
    R.log.push({ kind: 'radio', car: c.id, k, clear, lap: c.laps });
    race.msg(race.tag(c) + 'RADIO: "' + text + '"', 'player');
    race.onEvent('rdRadio', { carId: c.id, text, k, clear, who: 'DRIVER' });
    return c.rdIssue;
  }
  function payback(race, by, on, f) {
    on.damage = Math.min(1, on.damage + U.rand(0.25, 0.75)); on.spin = 1.2; on.v *= 0.25;
    if (on.damage >= 0.8) { on.status = 'dnf'; on.reason = 'CRASH'; on.outT = 3; }
    by.damage = Math.min(1, by.damage + 0.04);
    race.particles.push({ car: on, t: 1.5 });
    if (f) { f.done = true; f.heat = 20; }
    race.rd.log.push({ kind: 'payback', by: by.id, on: on.id, lap: by.laps });
    race.msg('#' + by.e.number + ' DUMPS #' + on.e.number + ' - PAYBACK!' + (by.isPlayer ? ' THAT WAS YOUR DRIVER.' : on.isPlayer ? ' THAT WAS YOUR CAR!' : ''), by.isPlayer || on.isPlayer ? 'bad' : 'info');
    race.onEvent('rdPayback', { by: by.id, on: on.id });
    race.startCaution('#' + on.e.number + ' WRECKED BY #' + by.e.number + ' - PAYBACK?', 4);
  }
  // on-track contact (RaceSim.crash calls this): remembered when one of your cars is part of it
  function contact(race, car, involved) {
    if (!race.rd || involved.length < 2) return;
    for (const o of involved) { if (o === car) continue; if (car.isPlayer || o.isPlayer) race.rd.log.push({ kind: 'contact', by: car.id, on: o.id, lap: car.laps }); }
  }
  function callRace(race) {
    const R = race.rd; R.called = true; R.calledLap = race.leaderLaps();
    const ord = race.order().filter(c => c.status !== 'dnf');
    for (const c of ord) if (c.status === 'run') { c.status = 'fin'; c.finishPos = race.finishOrder.length + 1; race.finishOrder.push(c); }
    race.pace.active = false;
    R.log.push({ kind: 'called', lap: R.calledLap });
    race.msg('RACE CALLED FOR RAIN AFTER ' + R.calledLap + ' OF ' + race.laps + ' LAPS - IT\'S OFFICIAL! #' + ord[0].e.number + ' WINS', 'win');
    race.onEvent('checkered', { winner: ord[0], rain: true });
    race.phase = 'done'; race.onEvent('done', { rain: true });
  }

  // ---------- pit stops ----------
  function pitStart(race, c) {
    const R = race.rd; const p = c.pit; const lt = race.lapTime;
    if (c.isPlayer && c.rdIssue && p.fix === undefined) p.fix = c.rdIssue.guess; // the crew chief's call
    let add = 0;
    if (p.fix && p.fix !== 'none') add += 0.06 * lt;
    if (R.wetCap) {
      if (!p.tires && (!c.isPlayer || race.autoPlayer)) { const thr = 0.33 + c.rdThr; p.tires = R.w > thr ? 'wet' : 'slick'; }
      if (p.tires && (p.tires === 'wet') !== !!c.wet && p.type === 'fuel') { p.type = 'four'; add += (RaceSim.PIT_TIME.four - RaceSim.PIT_TIME.fuel) * lt; }
    }
    if (add) { p.timer += add; p.total += add; }
    if (c.isPlayer && !race.autoPlayer && R.pitGame && !R.noGame) {
      R.game = { carId: c.id, t: race.t }; race.paused = true;
      race.onEvent('rdPitGame', { carId: c.id, number: c.e.number, zone: zoneW() });
    }
  }
  // taps: list of 'perfect' | 'good' | 'miss' | 'auto' (one per wheel). Returns the change in stop time.
  function pitGameResult(race, carId, taps, rnd) {
    const R = race.rd; const c = race.cars.find(x => x.id === carId); if (!R) return null;
    if (R.game && R.game.carId === carId) R.game = null;
    if (!c || !c.pit || c.pit.phase !== 'stop') { race.paused = false; return null; }
    let f = 0; for (const t of taps) f += TAP[t] || 0;
    const before = c.pit.timer; c.pit.timer = Math.max(0.2, c.pit.timer * (1 + f)); const d = c.pit.timer - before; c.pit.total += d;
    let loose = false; const misses = taps.filter(t => t === 'miss').length;
    for (let i = 0; i < misses && !loose; i++) if ((rnd ? rnd() : Math.random()) < LOOSE_P) loose = true;
    if (loose) { const pen = 0.3 * race.lapTime; c.pit.timer += pen; c.pit.total += pen; c.pit.loose = true; race.msg(race.tag(c) + 'LOOSE WHEEL! ' + (race.ow ? 'RACE CONTROL' : 'NASCAR') + ' PENALTY - HELD ON PIT ROAD', 'bad'); }
    const good = taps.filter(t => t === 'perfect' || t === 'good').length;
    R.log.push({ kind: 'pitgame', car: carId, taps: taps.slice(), d, loose });
    if (!loose) race.msg(race.tag(c) + (good >= 3 ? 'HUGE STOP BY THE CREW!' : misses >= 2 ? 'SLOPPY STOP - FUMBLED LUG NUTS' : misses === 0 && good === 0 ? 'CREW DOES ITS JOB' : 'DECENT STOP'), misses >= 2 ? 'bad' : 'player');
    race.paused = false;
    return { d, loose, f };
  }
  function pitDone(race, c) {
    const R = race.rd; const p = c.pit;
    if (R.wetCap && p.tires && p.type !== 'fuel') { const was = c.wet; c.wet = p.tires === 'wet'; if (c.wet !== was) { R.log.push({ kind: 'tires', car: c.id, to: p.tires, lap: c.laps, w: R.w, player: c.isPlayer }); if (c.isPlayer) race.msg(race.tag(c) + 'ON ' + (c.wet ? 'WET' : 'SLICK') + ' TIRES NOW', 'player'); } }
    if (c.isPlayer && c.rdIssue && p.fix) {
      const I = c.rdIssue; const ok = p.fix === I.correct || !!(ISSUES[I.k].tires && p.type === 'four' && p.fix !== 'none');
      R.log.push({ kind: 'fix', car: c.id, k: I.k, fix: p.fix, ok });
      if (p.fix === 'none') { /* no change: the issue stays and keeps getting worse */ }
      else if (ok) { c.rdIssue = null; c.rdB = Math.min(0.003, (c.rdB || 0) + FIX_B); race.msg(race.tag(c) + 'RADIO: "THAT\'S MUCH BETTER! GOOD CALL."', 'player'); race.onEvent('rdRadio', { carId: c.id, text: 'THAT\'S MUCH BETTER! GOOD CALL.', who: 'DRIVER', fixed: true }); }
      else { I.sev = Math.min(SEV_MAX, I.sev + 0.0005); race.msg(race.tag(c) + 'RADIO: "NOPE - STILL ' + ISSUES[I.k].short + '!"', 'bad'); race.onEvent('rdRadio', { carId: c.id, text: 'NOPE - STILL ' + ISSUES[I.k].short + '!', who: 'DRIVER', fixed: false }); }
    }
  }
  function summary(race) {
    const R = race.rd; return { called: R.called, calledLap: R.calledLap, rained: R.rained, oval: R.oval, fc: R.fc, log: R.log.slice() };
  }

  // ---------- after the race (career.js processRace calls this before the money is added up) ----------
  function fineFor() { return Math.round(8000 * Math.pow(ser().mult, 0.85) / 1000) * 1000; }
  function penPts() { return ser().ow ? 15 : 25; }
  function raceLines(sum, cars, res) {
    const s = S(); if (!live()) return; const r = ensure(s); const sr = ser();
    const notes = sum.bizNotes || (sum.bizNotes = []);
    // cool-off from last week, training fades, old talks expire
    for (const f of r.feuds) f.heat = Math.max(0, f.heat - 8);
    r.feuds = r.feuds.filter(f => f.heat >= 12);
    r.crew.train = Math.max(0, r.crew.train - TRAIN_FADE);
    const wk = wkOf(s);
    for (const i of r.issues.filter(x => x.exp < wk)) { const d = s.drivers[i.did]; if (d) d.morale = U.clamp((d.morale || 70) - 3, 10, 100); logRD('NO WORD FROM THE OWNER ON ' + i.title + '.'); }
    r.issues = r.issues.filter(x => x.exp >= wk);
    // pit crew wages
    const pay = crewPerRace(); if (pay > 0) sum.lines.push(['PIT CREW (' + CREW[r.crew.lvl - 1].name + ')', -pay]);
    const rd = res && res.rd;
    if (rd) {
      if (rd.called) { const t = 'RAIN-SHORTENED: THE RACE WAS CALLED AFTER ' + rd.calledLap + ' LAPS - OFFICIAL RESULT.'; notes.push(t); Game.news(DATA.TRACKS[sum.track].short + ' ' + t); }
      const lead = (rd.log || []);
      // feuds from contact
      for (const e of lead.filter(x => x.kind === 'contact')) {
        const inst = teamDid(e.by), vic = teamDid(e.on); if (!inst || !vic || inst === vic) continue;
        const vd = s.drivers[vic]; if (!vd) continue; const P = PERS[pers(vd)];
        if (Math.random() < P.feud || (e.force)) addFeud(vic, inst, Math.round(35 + P.feud * 40), notes);
      }
      for (const e of lead.filter(x => x.kind === 'payback')) {
        const by = teamDid(e.by), on = teamDid(e.on); if (!by || !on) continue;
        const fine = fineFor(), pts = penPts(); const sanc = sr.ow ? 'RACE CONTROL' : 'NASCAR';
        if (isTeamDid(by)) {
          const tcId = e.by; sum.lines.push([sanc + ' FINE ' + dnum(by).trim() + ' (INTENTIONAL WRECK)', -fine]);
          if (s.standings[tcId]) s.standings[tcId].pts = Math.max(0, s.standings[tcId].pts - pts);
          const t = sanc + ' FINES ' + dname(by) + ' ' + U.money(fine) + ' AND ' + pts + ' POINTS FOR WRECKING ' + dname(on) + ' ON PURPOSE.';
          Game.news(t); notes.push(t + ' RESPOND IN BUSINESS > DRAMA.'); r.hype = Math.min(100, r.hype + 12 * PERS[pers(s.drivers[by])].hype);
          addIssue('payback', by, on, 'PAYBACK FINE: ' + dname(by), t);
          const f = r.feuds.find(x => x.a === by && x.b === on); if (f) f.heat = 20;
          addFeud(on, by, 60, null, true);
          sum.rdPenalty = { did: by, fine, pts, entry: tcId };
        } else if (isTeamDid(on)) {
          const t = sanc + ' FINES ' + dname(by) + ' ' + U.money(fine) + ' FOR WRECKING YOUR DRIVER ' + dname(on) + '.';
          Game.news(t); r.hype = Math.min(100, r.hype + 8);
          const d = s.drivers[on]; if (d) d.morale = U.clamp((d.morale || 70) - 4, 10, 100);
          addFeud(on, by, 75, null, true);
          addIssue('victim', on, by, dname(on) + ' WANTS PAYBACK', dname(on) + ' WAS WRECKED BY ' + dname(by) + ' AND WANTS REVENGE.');
          notes.push(t + ' YOUR DRIVER WANTS PAYBACK - RESPOND IN BUSINESS > DRAMA.');
          const f = r.feuds.find(x => x.a === by && x.b === on); if (f) f.heat = 20;
        }
      }
    }
    // fan hype from drama sells merch
    if (r.hype >= 5) { const amt = Math.round(sr.mult * r.hype * 18 / 50) * 50; if (amt > 0) sum.lines.push(['DRAMA MERCH BOOST', amt]); }
    r.hype = Math.round(r.hype * 0.7);
    // grudges wear on a driver
    for (const { tc } of cars || []) { const did = teamDid(tc.id); const d = did && s.drivers[did]; if (!d) continue; if (r.feuds.some(f => f.a === did && f.heat >= 50) && pers(d) === 'hothead') d.morale = U.clamp((d.morale || 70) - 2, 10, 100); }
  }
  function addFeud(holder, target, heat, notes, quiet) {
    const s = S(); const r = ensure(s); if (!holder || !target || holder === target) return null;
    let f = r.feuds.find(x => x.a === holder && x.b === target);
    if (f) f.heat = Math.min(100, f.heat + Math.round(heat * 0.6)); else { f = { a: holder, b: target, heat: Math.min(100, heat), wk: wkOf(s) }; r.feuds.push(f); }
    if (r.feuds.length > 8) { r.feuds.sort((x, y) => y.heat - x.heat); r.feuds.length = 8; }
    if (!quiet) {
      const mine = isTeamDid(holder);
      const t = mine ? 'FEUD: YOUR DRIVER ' + dname(holder) + ' IS FUMING AT ' + dnum(target) + dname(target) + ' AFTER THEIR CRASH.' : 'FEUD: ' + dnum(holder) + dname(holder) + ' BLAMES YOUR DRIVER ' + dname(target) + ' FOR THEIR CRASH.';
      Game.news(t); logRD(t); if (notes) notes.push(t + ' RESPOND IN BUSINESS > DRAMA.');
      r.hype = Math.min(100, r.hype + 6 * PERS[pers(S().drivers[mine ? holder : target])].hype);
      addIssue('feud', mine ? holder : target, mine ? target : holder, 'FEUD: ' + dname(mine ? holder : target) + ' VS ' + dname(mine ? target : holder), t);
    }
    return f;
  }
  function addIssue(kind, did, other, title, text) {
    const s = S(); const r = ensure(s);
    if (r.issues.some(i => i.did === did && i.other === other && i.kind === kind)) return null;
    const i = { id: U.uid('dr'), kind, did, other, title, text, wk: wkOf(s), exp: wkOf(s) + 2 };
    r.issues.unshift(i); if (r.issues.length > 3) r.issues.length = 3; return i;
  }
  // owner responses: back your driver, fine them, or calm them down
  function respond(id, act) {
    const s = S(); const r = ensure(s); const i = r.issues.find(x => x.id === id); if (!i) return { err: 'THAT IS DEALT WITH ALREADY.' };
    const d = s.drivers[i.did]; if (!d) { r.issues = r.issues.filter(x => x !== i); return { err: 'THAT DRIVER IS GONE.' }; }
    const p = pers(d); const P = PERS[p];
    const feud = r.feuds.find(f => f.a === i.did && f.b === i.other) || r.feuds.find(f => f.b === i.did && f.a === i.other);
    const out = { morale: 0, heat: 0, money: 0, hype: 0, rep: 0 };
    if (act === 'back') { out.morale = Math.round(8 * P.mor) + (p === 'showman' ? 2 : 0); out.heat = 15; out.hype = Math.round(8 * P.hype); if (i.kind === 'payback') out.rep = -1; }
    else if (act === 'fine') { out.morale = -Math.round(14 * P.mor); out.heat = -35; out.money = Math.max(500, Math.round((d.salary || 1000) / 100) * 100); if (i.kind === 'payback') out.rep = 1; }
    else if (act === 'calm') { out.morale = p === 'hothead' ? -2 : p === 'showman' ? 1 : 5; out.heat = p === 'calm' || p === 'team' ? -65 : p === 'hothead' ? -30 : -45; out.hype = -4; }
    else return { err: 'PICK AN ANSWER.' };
    d.morale = U.clamp((d.morale || 70) + out.morale, 10, 100);
    if (feud) feud.heat = U.clamp(feud.heat + out.heat, 0, 100);
    s.money += out.money; r.hype = U.clamp(r.hype + out.hype, 0, 100); s.rep = U.clamp(s.rep + out.rep, 0, 100);
    r.issues = r.issues.filter(x => x !== i);
    const txt = act === 'back' ? 'YOU BACK ' + dname(i.did) + ' IN PUBLIC. HE LOVES IT' + (out.rep < 0 ? ' - THE SANCTIONING BODY DOES NOT.' : '.') : act === 'fine' ? 'YOU FINE ' + dname(i.did) + ' ' + U.money(out.money) + '. HE IS NOT HAPPY.' : 'YOU CALM ' + dname(i.did) + ' DOWN.' + (p === 'hothead' ? ' HE GRUMBLES.' : ' THE GRUDGE COOLS.');
    logRD(txt); Game.news(txt); Game.save();
    return Object.assign({ txt, pers: p, feudHeat: feud ? feud.heat : null }, out);
  }
  function alerts() { const s = S(); if (!live() || !s.rd) return 0; return s.rd.issues.length; }
  function tickerLine() {
    const s = S(); if (!live() || s.seasonOver) return null; const fc = forecast(s); if (!fc) return null;
    return ['[WEATHER]', 'RACE WEEKEND FORECAST AT ' + DATA.TRACKS[fc.tid].short + ': ' + wxText(fc)];
  }
  return {
    PERS, ISSUES, FIXES, FIX_NAME, CREW, TAP, SKY, ensure, migrate, pers, feedback, crewLvl, crewCost, crewPerRace, trainCost, trainB, crewBonus, canTrain, setCrew, train, zoneW, grade,
    forecast, rollForecast, wxText, dayFor, initRace, tick, radioCall, payback, contact, callRace, pitStart, pitGameResult, pitDone, summary, kindOf,
    raceLines, addFeud, addIssue, respond, alerts, tickerLine, fineFor, penPts, teamDid, entryOfDid, sevNow, isOval,
  };
})();
if (typeof Biz !== 'undefined' && Biz && Biz.alerts) { const a0 = Biz.alerts; Biz.alerts = () => a0() + RD.alerts(); } // drama talks light the BUSINESS dot too

// ---------- race-day overlays + the PIT CREW / DRAMA tabs ----------
const RDUI = (() => {
  if (typeof UI === 'undefined' || !UI.h) return null;
  const H = UI.h; const T = H.T; const S = () => Game.S; const $ = q => document.querySelector(q);
  const money = v => U.money(v);
  // tiny pixel icons (sun, cloud, rain)
  const PIX = {
    sun: [['....Y....', '.Y.....Y.', '...OOO...', '..OYYYO..', 'Y.OYYYO.Y', '..OYYYO..', '...OOO...', '.Y.....Y.', '....Y....'], { O: '#ff9f1c', Y: '#ffe000' }],
    cloud: [['...........', '....OOO....', '..OOWWWOO..', '.OWWWWWWWO.', 'OWWWWWWWWWO', 'OWWWWWWWWWO', '.OOOOOOOOO.', '...........', '...........'], { O: '#6b7380', W: '#e8ecf2' }],
    rain: [['....OOO....', '..OOGGGOO..', '.OGGGGGGGO.', 'OGGGGGGGGGO', '.OOOOOOOOO.', '..B..B..B..', '.B..B..B...', '...B..B..B.', '..B..B.....'], { O: '#3a3f47', G: '#9aa1ab', B: '#5ab0ff' }],
  };
  const pixCache = {};
  function icon(k, sc) {
    const [rows, pal] = PIX[k]; if (!pixCache[k]) { const w = rows[0].length, h = rows.length; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      rows.forEach((r, y) => [...r].forEach((ch, i) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } })); pixCache[k] = c.toDataURL(); }
    return `<img class="pix wxi" src="${pixCache[k]}" style="width:${rows[0].length * sc}px;height:${rows.length * sc}px" alt="">`;
  }
  const skyIcon = fc => fc.rain >= 50 ? 'rain' : fc.sky === 'sun' ? 'sun' : 'cloud';
  const PCOL = { hothead: '#e3242f', calm: '#2f62d8', showman: '#ff8a00', team: '#2e9b3a' };
  const persTag = p => `<span class="rd-pers" style="background:${PCOL[p]}">${RD.PERS[p].name}</span>`;

  // ---------- prep / top bar ----------
  function forecastHTML(tid) {
    const s = S(); if (!s || s.seasonOver) return ''; const fc = RD.forecast(s); if (!fc) return '';
    return `<div class="panel rd-fc"><div class="row" style="align-items:center;gap:8px;flex-wrap:nowrap">${icon(skyIcon(fc), 3)}<span class="grow"><span class="tiny">RACE FORECAST</span><br><b class="small">${RD.SKY[fc.sky]} · ${fc.rain}% RAIN</b></span></div><div class="tiny" style="line-height:1.45;margin-top:4px">${U.esc(RD.wxText(fc).split('. ').slice(1).join('. '))}</div></div>`;
  }
  function prepHTML(P) {
    const on = P.pitGame !== false;
    return `<div class="row" style="margin-top:6px"><button class="btn ${on ? 'green' : 'dark'}" style="flex:1" data-act="rdPitGame">${on ? 'PIT STOP TAP GAME: ON' : 'PIT STOP TAP GAME: OFF (AUTO)'}</button></div>`;
  }
  function topIcon(race) {
    const R = race && race.rd; if (!R) return '';
    const k = R.red ? 'rain' : R.raining ? 'rain' : R.w > 0.08 ? 'cloud' : skyIcon(R.fc);
    const word = R.red ? 'RED FLAG' : R.raining ? 'RAIN' : R.w > 0.08 ? 'WET' : '';
    return `<span class="tvt-wx ${R.red ? 'red' : ''}">${icon(k, 2)}${word ? '<i>' + word + '</i>' : ''}</span>`;
  }
  // ---------- rain on the track (drawn under the cars) ----------
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  function drawRain(x, view, race) {
    const R = race.rd; if (!R || (R.w < 0.02 && !R.raining)) return;
    const W = view.bw, Hh = view.bh;
    x.fillStyle = `rgba(30,50,80,${(0.06 + 0.12 * R.w).toFixed(3)})`; x.fillRect(0, 0, W, Hh);
    if (!R.raining && !R.red) return;
    const n = Math.round(W * Hh / 300 * (0.5 + 0.5 * R.w)); const t = view.t;
    x.fillStyle = 'rgba(200,220,250,0.42)';
    for (let i = 0; i < n; i++) {
      const sp = 70 + hash(i, 2) * 50; const y = ((hash(i, 1) * Hh + t * sp) % (Hh + 6)) - 3; const xx = ((hash(i, 0) * W - t * sp * 0.35) % W + W) % W;
      const X = Math.round(xx), Y = Math.round(y); x.fillRect(X, Y, 1, 1); x.fillRect(X - 1, Y + 1, 1, 1); x.fillRect(X - 1, Y + 2, 1, 1);
    }
  }
  // ---------- live race overlays ----------
  let A = null; // the attached race screen: { R, sel, bub, game, menuKey }
  function attach(R) {
    const main = $('.race-main.full'); if (!main || !R.race.rd) return;
    main.insertAdjacentHTML('beforeend', '<div class="rd-bub" id="rdbub"></div><div class="rd-flag" id="rdflag"></div><div class="rd-fix" id="rdfix"></div><div id="rdgame"></div>');
    const race = R.race; const P = UI.ui.prep || {};
    race.rd.pitGame = P.pitGame !== false && !race.autoPlayer;
    A = { R, sel: { fix: undefined, tires: undefined }, bubT: 0, game: null, menuKey: '', last: performance.now() };
    const base = race.onEvent; race.onEvent = (t, d) => { base(t, d); try { onEvent(R, t, d); } catch (e) { console.error(e); } };
    const loop = (ts) => {
      if (!A || A.R !== R) return;
      if (R.stopped || UI.ui.race !== R) { if (A && A.R === R) A = null; return; }
      const dt = Math.min(0.1, (ts - A.last) / 1000); A.last = ts;
      if (A.bubT > 0) { A.bubT -= dt; if (A.bubT <= 0) { const b = $('#rdbub'); if (b) b.classList.remove('on'); } }
      flag(race); syncFix(); gameTick(ts);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  function onEvent(R, t, d) {
    if (!A || A.R !== R) return;
    if (t === 'rdRadio') bubble(d);
    if (t === 'rdPitGame') startGame(d);
    if (t === 'cautionCall') resetSel();
  }
  function bubble(d) {
    const b = $('#rdbub'); if (!b) return; const race = A.R.race; const c = race.cars.find(x => x.id === d.carId);
    const who = d.who === 'CHIEF' ? 'CREW CHIEF' : 'RADIO' + (c ? ' #' + c.e.number : '');
    const tag = d.k && d.clear ? `<span class="rb-k">${RD.ISSUES[d.k].short}</span>` : d.k ? '<span class="rb-k q">???</span>' : '';
    b.innerHTML = `<b>${who}</b>${tag}<span class="rb-t">"${U.esc(d.text)}"</span>${d.k ? '<span class="rb-h">FIX IT AT YOUR NEXT STOP</span>' : ''}`;
    b.className = 'rd-bub on' + (d.fixed === false ? ' bad' : d.fixed ? ' good' : ''); A.bubT = 4.5;
  }
  function flag(race) {
    const el = $('#rdflag'); if (!el) return; const R = race.rd; const k = R.red ? 'red' : R.called ? 'called' : '';
    if (el._k === k) return; el._k = k;
    el.className = 'rd-flag' + (k ? ' on ' + k : '');
    el.innerHTML = k === 'red' ? `<div class="rf-band">RED FLAG · RAIN DELAY${R.halfway ? ' · PAST HALFWAY' : ''}</div>` : k === 'called' ? '<div class="rf-band">RACE CALLED FOR RAIN · OFFICIAL</div>' : '';
  }
  // pit fix panel: shows next to the pit-wall strip while a pit menu is open and there is something to fix (or a tire call to make)
  function menuCar() { const R = A.R; if (!R.menu) return null; return R.race.player(R.menu.kind === 'caution' ? (R.menu.d && R.menu.d.carId) || R.callId : R.sel); }
  function resetSel() { if (!A) return; A.sel = { fix: undefined, tires: undefined }; A.menuKey = ''; }
  function syncFix() {
    const el = $('#rdfix'); if (!el) return; const R = A.R; const race = R.race; const c = menuCar();
    const show = !!(c && race.phase !== 'done' && (c.rdIssue || race.rd.wetCap));
    if (!show) { if (el._k !== '') { el._k = ''; el.innerHTML = ''; el.className = 'rd-fix'; } if (!R.menu) A.sel = { fix: undefined, tires: undefined }; return; }
    const kd = RD.kindOf(race); const I = c.rdIssue;
    if (A.sel.fix === undefined && I) A.sel.fix = I.guess;
    if (A.sel.tires === undefined && race.rd.wetCap) A.sel.tires = race.rd.advice[c.id] || (c.wet ? 'wet' : 'slick');
    const key = [c.id, I ? I.k + I.guess : '-', A.sel.fix, A.sel.tires, c.wet, race.rd.wetCap].join('|'); if (el._k === key) return; el._k = key;
    let html = '';
    if (I) {
      html += `<div class="rdf-h">RADIO FIX · ${I.clear ? RD.ISSUES[I.k].short : 'UNCLEAR CALL'}</div>`;
      html += RD.FIXES[kd].map(([k, n, h], i) => `<button class="btn ${A.sel.fix === k ? 'blue sel' : 'dark'} rdf-b ${I.guess === k ? 'chief' : ''}" data-act="rdFix" data-arg="${k}"${H.KB(String(7 + i))}><span>${n}<small>${I.guess === k ? 'CHIEF\'S PICK' : 'FOR ' + h}</small></span></button>`).join('');
      html += `<button class="btn ${A.sel.fix === 'none' ? 'grey sel' : 'dark'} rdf-b" data-act="rdFix" data-arg="none"${H.KB('0')}><span>NO CHANGE<small>SAVES TIME</small></span></button>`;
    }
    if (race.rd.wetCap) {
      html += `<div class="rdf-h">TIRES${race.rd.advice[c.id] ? ' · CHIEF: ' + (race.rd.advice[c.id] === 'wet' ? 'WETS' : 'SLICKS') : ''}</div><div class="rdf-tires">`
        + [['wet', 'WETS', '5'], ['slick', 'SLICKS', '6']].map(([k, n, kb]) => `<button class="btn ${A.sel.tires === k ? (k === 'wet' ? 'blue' : 'orange') + ' sel' : 'dark'} rdf-t" data-act="rdTire" data-arg="${k}"${H.KB(kb)}>${n}${(c.wet ? 'wet' : 'slick') === k ? '<small>ON NOW</small>' : ''}</button>`).join('') + '</div>';
    }
    el.className = 'rd-fix on'; el.innerHTML = html;
  }
  function applySel(R, id, sel) {
    if (!R || !id) return; const p = R.race.player(id); if (!p || !p.pit || p.pit.phase !== 'wait' || p.pit.rdSet) return;
    p.pit.rdSet = true;
    if (p.rdIssue && sel.fix !== undefined) p.pit.fix = sel.fix;
    if (R.race.rd && R.race.rd.wetCap && sel.tires) { p.pit.tires = sel.tires; if ((sel.tires === 'wet') !== !!p.wet && p.pit.type === 'fuel') p.pit.type = 'four'; }
  }
  // ---------- the pit-stop tap game ----------
  const WHEELS = ['LF', 'RF', 'LR', 'RR'];
  function startGame(d) {
    const host = $('#rdgame'); if (!host || !A) return;
    A.game = { carId: d.carId, number: d.number, zw: d.zone, wheel: 0, taps: [], zc: U.rand(0.22, 0.78), t0: performance.now() + U.rand(0, 400), wT: performance.now(), done: 0, period: 1.15 };
    host.innerHTML = `<div class="rdg"><div class="rdg-h">PIT STOP #${d.number} · ${VIEW.desktop ? 'CLICK / SPACE' : 'TAP'} ON THE GREEN</div><div class="rdg-w" id="rdgw"></div>
      <div class="rdg-bar"><i class="rdg-z" id="rdgz"></i><b class="rdg-m" id="rdgm"></b></div>
      <div class="rdg-row"><button class="btn green rdg-tap" data-act="rdTap"${H.KB('space', 'SPACE')}>${T('TAP', 3, H.SH)}</button><button class="btn dark rdg-auto" data-act="rdAuto"${H.KB('a', 'A')}>AUTO<small>CREW LV ${RD.crewLvl()}</small></button></div></div>`;
    drawGame();
  }
  const markPos = (G, now) => { const ph = ((now - G.t0) / 1000 / G.period) % 2; const p = ph < 0 ? 0 : ph; return p <= 1 ? p : 2 - p; };
  function drawGame() {
    const G = A && A.game; if (!G) return;
    const w = $('#rdgw'); if (w) w.innerHTML = WHEELS.map((n, i) => { const t = G.taps[i]; return `<span class="rdg-c ${t || (i === G.wheel && !G.done ? 'cur' : '')}">${n}<small>${t ? t.toUpperCase() : i === G.wheel && !G.done ? 'NOW' : ''}</small></span>`; }).join('');
    const z = $('#rdgz'); if (z) { z.style.left = ((G.zc - G.zw) * 100).toFixed(1) + '%'; z.style.width = (G.zw * 200).toFixed(1) + '%'; z.style.opacity = G.done ? 0.3 : 1; }
  }
  function gameTick(now) {
    if (!A) return; const race = A.R.race; const G = A.game;
    if (!G) { if (race.rd.game && !race.autoPlayer && race.paused && !A.R.card) { /* safety: a game the overlay never saw */ RD.pitGameResult(race, race.rd.game.carId, ['auto', 'auto', 'auto', 'auto']); } return; }
    if (race.autoPlayer || race.phase === 'done') { A.game = null; const h = $('#rdgame'); if (h) h.innerHTML = ''; return; }
    const m = $('#rdgm'); if (m && !G.done) m.style.left = (markPos(G, now) * 100).toFixed(1) + '%';
    if (G.done) { if (now >= G.done) finishGame(); return; }
    if (now - G.wT > 3000) addTap('auto'); // no tap: the crew does that wheel at its own level
  }
  function addTap(grade) {
    const G = A.game; if (!G || G.done) return;
    G.taps.push(grade); G.wheel++; G.wT = performance.now();
    if (G.wheel >= 4) G.done = performance.now() + 650; else G.zc = U.rand(0.22, 0.78);
    drawGame();
  }
  function tap() {
    const G = A && A.game; if (!G || G.done) return;
    const now = performance.now(); if (now < G.t0) return;
    addTap(RD.grade(Math.abs(markPos(G, now) - G.zc), G.zw));
  }
  function finishGame() {
    const G = A.game; if (!G) return; A.game = null;
    while (G.taps.length < 4) G.taps.push('auto');
    const h = $('#rdgame'); if (h) h.innerHTML = '';
    RD.pitGameResult(A.R.race, G.carId, G.taps);
  }
  // ---------- Business tabs ----------
  function tabs() { const n = RD.alerts(); return [['crew', 'PIT CREW'], ['drama', 'DRAMA' + (n ? ' (' + n + ')' : '')]]; }
  function crewTab() {
    const s = S(); const r = RD.ensure(s); const f = s.team.fac; const chief = s.team.chief;
    const chiefB = typeof Biz !== 'undefined' ? Biz.chiefCrew() : 0;
    const raw = 0.35 + f.pitCenter * 0.12 + chiefB; const capped = Math.min(1.12, raw); const lvB = RD.CREW[r.crew.lvl - 1].b; const trB = RD.trainB();
    const total = capped + lvB + trB; const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100);
    const row = (k, v, extra) => `<div class="rd-brk"><span>${k}</span><b>${v}</b></div>${extra || ''}`;
    const left = `<div class="panel"><h3>PIT CREW SPEED</h3><div class="row" style="align-items:center;gap:10px;flex-wrap:nowrap"><span class="ovr">${Math.round(total * 100)}</span><span class="tiny" style="line-height:1.45">4-TIRE STOP ABOUT ${(11.5 * (1.3 - total * 0.5)).toFixed(1)}S<br>(AVERAGE CREW ~11.5S)</span></div>
      ${row('BASE CREW', '35')}${row('PIT CENTER LV ' + f.pitCenter, pct(f.pitCenter * 0.12))}${row('CREW CHIEF' + (chief ? ' ' + U.esc(chief.last.toUpperCase()) + ' (' + chief.rating + ')' : ''), pct(chiefB))}${raw > 1.12 ? row('FACILITY + CHIEF CAP', '-' + Math.round((raw - 1.12) * 100)) : ''}
      ${row('PIT CREW: ' + RD.CREW[r.crew.lvl - 1].name, pct(lvB))}${row('TRAINING (' + Math.round(r.crew.train) + '% SHARP)', pct(trB))}
      <div class="tiny" style="line-height:1.45;margin-top:5px">ONE NUMBER, NO DOUBLE COUNTING: THE CREW CHIEF MAKES THE CALLS AND THE RADIO FIXES; THE PIT CREW DOES THE STOP.</div></div>`;
    const lvls = RD.CREW.map((L, i) => { const lv = i + 1; const cur = lv === r.crew.lvl; const pr = RD.crewPerRace(lv);
      return `<div class="list-row biz-row ${cur ? 'me' : ''}" style="cursor:default"><span class="tag">LV${lv}</span><span class="grow">${L.name}<div class="tiny">${pct(L.b)} SPEED · ${pr ? money(pr) + '/RACE (' + U.moneyShort(RD.crewCost(lv)) + '/SEASON)' : 'FREE'}</div></span>${cur ? '<span class="tag q-in">YOUR CREW</span>' : `<button class="btn ${lv > r.crew.lvl ? 'green' : 'dark'}" data-act="rdCrew" data-arg="${lv}">${lv > r.crew.lvl ? 'HIRE' : 'DOWNSIZE'}</button>`}</div>`; }).join('');
    const can = RD.canTrain();
    const train = `<div class="panel"><h3>TRAINING</h3><div class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><span class="grow"><div class="bar"><i style="width:${Math.round(r.crew.train)}%;background:#e6ff2b"></i></div><span class="tiny">SHARPNESS ${Math.round(r.crew.train)}% · FADES A LITTLE EVERY RACE</span></span>
      <button class="btn ${can && s.money >= RD.trainCost() ? 'green' : 'grey'}" data-act="rdTrain">${can ? 'TRAIN ' + U.moneyShort(RD.trainCost()) : 'TRAINED'}</button></div>
      <div class="tiny" style="line-height:1.45;margin-top:5px">ONE SESSION BETWEEN RACES. DURING YOUR STOPS: TAP (CLICK / SPACE) WHEN THE MARKER IS ON THE GREEN - GOOD TAPS SHAVE TIME, MISSES ADD TIME AND CAN COST A LOOSE-WHEEL PENALTY. AUTO USES YOUR CREW LEVEL.</div></div>`;
    return `<div class="cols"><div class="col narrow">${left}</div><div class="col">${train}<div class="small ol">HIRE A PIT CREW (PAID EVERY RACE)</div>${lvls}</div></div>`;
  }
  function dramaTab() {
    const s = S(); const r = RD.ensure(s);
    const name = did => { const d = s.drivers[did]; return d ? U.esc(Game.driverName(d).toUpperCase()) : '?'; };
    const cards = r.issues.map(i => { const d = s.drivers[i.did]; const p = d ? RD.pers(d) : 'calm';
      return `<div class="panel red rd-issue"><div class="ol1" style="margin-bottom:3px">${U.esc(i.title)}</div><div class="tiny" style="line-height:1.45">${U.esc(i.text)}</div><div class="tiny" style="margin:4px 0">${persTag(p)} MORALE ${Math.round(d ? d.morale : 0)} · ANSWER WITHIN ${Math.max(1, i.exp - (s.season * 100 + s.week) + 1)} RACE(S)</div>
        <div class="row rd-resp"><button class="btn green" data-act="rdResp" data-arg="${i.id}|back">BACK HIM<small>MORALE UP · FEUD HOTTER</small></button><button class="btn orange" data-act="rdResp" data-arg="${i.id}|fine">FINE HIM<small>MORALE DOWN · COOLS IT</small></button><button class="btn blue" data-act="rdResp" data-arg="${i.id}|calm">CALM DOWN<small>COOLS THE GRUDGE</small></button></div></div>`; }).join('');
    const hype = `<div class="panel"><h3>FAN HYPE</h3><div class="bar"><i style="width:${Math.round(r.hype)}%;background:#ff8a00"></i></div><div class="tiny" style="margin-top:4px;line-height:1.45">DRAMA SELLS T-SHIRTS: HYPE ADDS A MERCH BOOST EVERY RACE AND FADES OVER TIME. SHOWMEN DOUBLE IT.</div></div>`;
    const left = (cards || `<div class="panel small" style="line-height:1.55">NO DRAMA RIGHT NOW. ON-TRACK CONTACT CAN START A FEUD; A DRIVER WITH A GRUDGE MAY WANT PAYBACK - AND AN INTENTIONAL WRECK BRINGS A FINE AND LOST POINTS.</div>`) + hype;
    const drivers = Game.teamCars().map(tc => { const did = RD.teamDid(tc.id); const d = did && s.drivers[did]; if (!d) return ''; const p = RD.pers(d);
      const fs = r.feuds.filter(f => f.a === did || f.b === did).map(f => `<div class="tiny rd-feud"><span>${f.a === did ? 'MAD AT ' + name(f.b) : name(f.a) + ' IS MAD AT HIM'}</span><b>HEAT ${Math.round(f.heat)}</b></div>`).join('');
      return `<div class="panel rd-drv"><div class="row" style="align-items:center;gap:6px;flex-wrap:nowrap"><span class="tag">#${tc.number}</span><span class="grow small">${name(did)}</span>${persTag(p)}</div><div class="tiny" style="line-height:1.45;margin-top:3px">${RD.PERS[p].desc} MORALE ${Math.round(d.morale)} · RADIO FEEDBACK ${RD.feedback(d)}</div>${fs || '<div class="tiny" style="opacity:.75">NO FEUDS.</div>'}</div>`; }).join('');
    const log = r.log.length ? `<div class="panel tiny biz-log">${r.log.slice(0, 5).map(e => `<div>S${e.s} R${e.w}: ${U.esc(e.text)}</div>`).join('')}</div>` : '';
    return `<div class="cols"><div class="col">${left}</div><div class="col"><div class="small ol">YOUR DRIVERS</div>${drivers || '<div class="panel small">NO DRIVERS YET.</div>'}${log}</div></div>`;
  }
  function body(tab) { if (tab === 'crew') return crewTab(); if (tab === 'drama') return dramaTab(); return null; }
  const ref = () => UI.go('business');
  let prev = {};
  const acts = {
    rdPitGame: () => { const P = UI.ui.prep; if (!P) return; P.pitGame = P.pitGame === false; UI.prep(); },
    rdFix: (k) => { if (!A) return; A.sel.fix = k; syncFix(); },
    rdTire: (k) => { if (!A) return; A.sel.tires = k; syncFix(); },
    rdTap: () => tap(),
    rdAuto: () => { if (!A || !A.game || A.game.done) return; while (A.game.taps.length < 4) A.game.taps.push('auto'); A.game.wheel = 4; A.game.done = performance.now() + 250; drawGame(); },
    rdCrew: (lv) => { const e = RD.setCrew(lv); if (e) return H.toast(e); ref(); H.toast('PIT CREW: ' + RD.CREW[+lv - 1].name); },
    rdTrain: () => { const e = RD.train(); if (e) return H.toast(e); ref(); H.toast('TRAINING DONE - THE CREW IS SHARPER'); },
    rdResp: (a) => { const [id, act] = a.split('|'); const r = RD.respond(id, act); if (r.err) return H.toast(r.err); ref(); H.toast(r.txt); },
    racePit: (a) => { resetSel(); return prev.racePit(a); },
    pitNow: (k) => { const R = UI.ui.race; const id = R && R.sel; const sel = A ? Object.assign({}, A.sel) : {}; prev.pitNow(k); if (A && k !== 'cancel') applySel(R, id, sel); resetSel(); },
    pitChoice: (k) => { const R = UI.ui.race; const id = R && R.callId; const sel = A ? Object.assign({}, A.sel) : {}; prev.pitChoice(k); if (A && k !== 'stay') applySel(R, id, sel); },
    raceSkip: (a) => { if (A) { A.game = null; const h = $('#rdgame'); if (h) h.innerHTML = ''; } return prev.raceSkip(a); },
  };
  prev = UI.extend({}, acts);
  return { attach, drawRain, topIcon, forecastHTML, prepHTML, tabs, body, icon, tap, state: () => A };
})();
