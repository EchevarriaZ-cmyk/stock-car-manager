/* Race simulation engine. Runs on its own; the player only gives pit-wall orders. */
'use strict';
const RaceSim = (() => {
  const CAR_LEN = 32;
  const MODES = {
    push: { spd: 0.008, wear: 1.35, fuel: 1.08, risk: 1.6 },
    normal: { spd: 0, wear: 1, fuel: 1, risk: 1 },
    save: { spd: -0.008, wear: 0.7, fuel: 0.88, risk: 0.7 },
  };
  const PIT_TIME = { four: 0.42, two: 0.26, fuel: 0.13 };

  function qualify(entries, type) {
    return entries.map(e => ({ e, s: 0.55 * e.car + 0.45 * (e.drv * 0.6 + e.speed * 0.4) + U.gauss() * 2.2 + (e.isPlayer ? e.qualBonus || 0 : 0) }))
      .sort((a, b) => b.s - a.s).map(x => x.e);
  }

  // AI choice under caution. style: 'aggressive' | 'balanced' | 'conservative'
  function cautionChoice(race, car, style) {
    const T = race.T; const lapsLeft = race.laps - race.leaderLaps();
    const fuelLapsLeft = car.fuel * T.fuelLaps;
    const needFuel = fuelLapsLeft < lapsLeft + 0.5;
    const pos = race.positionOf(car);
    const agg = style === 'aggressive' ? 1 : style === 'conservative' ? -1 : 0;
    if (car.damage > 0.12) return 'four';
    if (lapsLeft <= 3 && !needFuel) return 'stay';
    if (!needFuel && lapsLeft < 10) {
      if (car.tire < 0.6 && pos > 6) return 'two';
      return 'stay';
    }
    if (car.tire > 0.9 - agg * 0.05 && !needFuel) return 'stay';
    if (car.tire > 0.86 && needFuel && fuelLapsLeft > 3) return pos <= 5 + agg * 3 ? 'stay' : 'fuel';
    if (car.tire > 0.72 + agg * 0.06) return (pos <= 8 && agg >= 0) || agg > 0 ? 'two' : 'four';
    if (car.tire > 0.6 && agg > 0 && pos <= 6) return 'two';
    return 'four';
  }

  class Race {
    constructor(opts) {
      this.geom = opts.geom; this.T = this.geom.T || DATA.TYPES[this.geom.type]; this.type = this.geom.type;
      this.laps = this.T.laps; this.stages = this.T.stages.slice();
      this.lapTime = this.T.lapTime; this.baseV = 1 / this.lapTime;
      this.paceF = 0.55; this.t = 0; this.flag = 'green'; this.phase = 'racing';
      this.stage = 1; this.stageResults = []; this.cautions = 0; this.log = [];
      this.pace = { active: false, d: 0 }; this.cautionTime = 0; this.cautionDecided = false;
      // v1.1: a team can run two cars. playerIds lists every team car; the first is "car 1".
      this.playerIds = opts.playerIds || [opts.playerId]; this.playerId = this.playerIds[0];
      this.autoPlayer = !!opts.autoPlayer; this.style = opts.style || 'balanced';
      this.callQueue = []; this.restartT = 0;
      this.onEvent = opts.onEvent || (() => {});
      this.finishOrder = []; this.paused = false; this.finishT = 0; this.restartPending = false;
      this.particles = [];
      const L = this.geom.L; const sp = 40 / L;
      this.cars = opts.grid.map((e, i) => {
        const row = Math.floor(i / 2), laneIdx = i % 2;
        const perf = 0.55 * e.car + 0.45 * e.drv;
        const lane = this.geom.lanes.length === 3 ? laneIdx : laneIdx;
        return {
          e, id: e.id, isPlayer: this.playerIds.includes(e.id), slot: e.slot || 1, grid: i + 1,
          d: -0.01 - row * sp, v: this.baseV * this.paceF, lane, lat: this.geom.lanes[lane], latT: this.geom.lanes[lane],
          tire: 1, fuel: 1, damage: 0, status: 'run', mode: e.isPlayer ? ((opts.modes && opts.modes[e.id]) || opts.mode || 'normal') : 'normal',
          pit: null, laps: 0, lapsLed: 0, stagePts: 0, perf,
          form: U.gauss() * 0.004 * (1.4 - e.cons / 100) + ((e.morale === undefined ? 70 : e.morale) - 60) * 0.00008, noise: 0, spin: 0, outT: 0, reason: '', yaw: 0,
          stall: 0, crew: e.crew, pitCount: 0, pref: (this.type === 'superspeedway' ? U.randi(0, 1) : 0),
          finishPos: 0, decided: false, lastFrac: 0, slowT: 0,
        };
      });
      const n = this.cars.length;
      // v1.3: every car has its own box; the pole sitter gets the one nearest pit exit
      this.cars.forEach((c, i) => { c.stall = 1 - (i + 0.5) / Math.max(1, n); });
      this.cars.forEach(c => c.lastFrac = this.frac(c.d));
      this.msg('GREEN FLAG! ' + (this.geom.event ? 'THE ' + this.geom.event + ' - ' : '') + this.laps + ' LAPS AT ' + this.geom.def.short, 'green');
    }
    frac(d) { return d - Math.floor(d); }
    msg(text, kind) { this.log.push({ t: this.t, text, kind: kind || 'info' }); if (this.log.length > 40) this.log.shift(); this.onEvent('msg', { text, kind }); }
    player(id) { id = id || this.playerId; return this.cars.find(c => c.id === id); }
    teamCars() { return this.playerIds.map(id => this.cars.find(c => c.id === id)).filter(Boolean); }
    tag(c) { return this.playerIds.length > 1 ? '#' + c.e.number + ': ' : ''; }
    leaderLaps() { const o = this.order(); return o.length ? Math.max(0, o[0].laps) : 0; }
    order() {
      const key = c => c.status === 'fin' ? c.laps : c.d;
      return this.cars.slice().sort((a, b) => {
        if (a.status === 'dnf' && b.status === 'dnf') return b.d - a.d;
        if (a.status === 'dnf') return 1; if (b.status === 'dnf') return -1;
        if (a.status === 'fin' && b.status === 'fin' && a.laps === b.laps) return a.finishPos - b.finishPos;
        return key(b) - key(a);
      });
    }
    positionOf(car) { return this.order().indexOf(car) + 1; }
    trackCars() { return this.cars.filter(c => c.status === 'run' && !(c.pit && c.pit.phase !== 'wait')); }
    setMode(m, id) { const p = this.player(id); if (p) p.mode = m; }
    requestPit(type, id) { const p = this.player(id); if (p && p.status === 'run' && !p.pit) { p.pit = { type, phase: 'wait' }; this.msg(this.tag(p) + 'PIT CALL: ' + ({ four: '4 TIRES + FUEL', two: '2 TIRES + FUEL', fuel: 'FUEL ONLY' })[type], 'player'); } }
    cautionInfo(p) { return { carId: p.id, number: p.e.number, slot: p.slot, multi: this.playerIds.length > 1, pos: this.positionOf(p), tire: p.tire, fuelLaps: p.fuel * this.T.fuelLaps, lapsLeft: this.laps - this.leaderLaps(), damage: p.damage, suggestion: cautionChoice(this, p, 'balanced') }; }
    // the race stays paused until every team car has its caution call
    nextCall() {
      while (this.callQueue.length) {
        const p = this.player(this.callQueue[0]);
        if (p && p.status === 'run' && !p.pit) { this.paused = true; this.onEvent('cautionCall', this.cautionInfo(p)); return true; }
        this.callQueue.shift();
      }
      this.paused = false; return false;
    }
    playerCautionChoice(choice, id) {
      const p = this.player(id || this.callQueue[0]);
      this.callQueue = this.callQueue.filter(x => !p || x !== p.id);
      if (p && p.status === 'run') {
        if (choice !== 'stay') { p.pit = { type: choice, phase: 'wait' }; this.msg(this.tag(p) + 'YOU CALLED ' + ({ four: '4 TIRES', two: '2 TIRES', fuel: 'FUEL ONLY' })[choice] + ' - PIT ROAD!', 'player'); }
        else this.msg(this.tag(p) + 'YOU STAY OUT - TRACK POSITION!', 'player');
      }
      if (!this.nextCall()) this.paused = false;
    }

    startCaution(reason, lapsDur) {
      if (this.flag === 'yellow' || this.phase !== 'racing') return;
      this.flag = 'yellow'; this.cautions++;
      const o = this.order().filter(c => c.status === 'run');
      const lead = o[0];
      this.pace.active = true; this.pace.d = lead.d + 70 / this.geom.L;
      this.cautionTime = (lapsDur || U.randi(3, 4)) * this.lapTime / this.paceF;
      this.restartLanesSet = false;
      this.cars.forEach(c => { if (c.status === 'run' && !(c.pit && c.pit.phase !== 'wait')) c.latT = this.geom.lanes[0]; c.decided = false; });
      this.msg('CAUTION: ' + reason, 'yellow');
      this.onEvent('caution', { reason });
      // decisions for all cars
      for (const c of o) {
        if (c.pit) continue;
        if (c.isPlayer && !this.autoPlayer) continue;
        const ch = cautionChoice(this, c, c.isPlayer ? this.style : U.pick(['aggressive', 'balanced', 'balanced', 'conservative']));
        if (ch !== 'stay') c.pit = { type: ch, phase: 'wait' };
        else if (c.isPlayer) this.msg(this.tag(c) + 'CREW CHIEF: WE STAY OUT', 'player');
        if (c.isPlayer && ch !== 'stay') this.msg(this.tag(c) + 'CREW CHIEF CALLS ' + ({ four: '4 TIRES', two: '2 TIRES', fuel: 'FUEL ONLY' })[ch], 'player');
      }
      if (!this.autoPlayer) { this.callQueue = this.teamCars().filter(p => p.status === 'run' && !p.pit).map(p => p.id); this.nextCall(); }
    }

    crash(car) {
      const T = this.T, L = this.geom.L;
      const r = Math.random();
      const involved = [car];
      const big = this.type === 'superspeedway' && r > 0.45;
      const range = big ? 160 : 55;
      if (r > 0.42) {
        for (const o of this.trackCars()) {
          if (o === car) continue;
          let g = (this.frac(car.d) - this.frac(o.d)) * L; if (g < -L / 2) g += L; if (g > L / 2) g -= L;
          if (g > -20 && g < range && U.chance(big ? 0.55 : 0.33)) involved.push(o);
        }
      }
      let names = [];
      for (const c of involved) {
        const sev = c === car ? (r < 0.42 ? U.rand(0.03, 0.15) : U.rand(0.25, 1.0)) : U.rand(0.08, 0.95);
        c.damage = Math.min(1, c.damage + sev); c.spin = 1.2; c.v *= 0.25;
        if (c.damage >= 0.8) { c.status = 'dnf'; c.reason = 'CRASH'; c.outT = 3; }
        names.push('#' + c.e.number);
        this.particles.push({ car: c, t: 1.5 });
      }
      const desc = r < 0.42 ? names[0] + ' SPINS' : involved.length > 4 ? 'THE BIG ONE! ' + involved.length + ' CARS' : names.join(', ') + ' WRECK';
      const pl = involved.find(c => c.isPlayer);
      for (const pc of involved.filter(c => c.isPlayer)) this.msg(this.tag(pc) + (pc.status === 'dnf' ? 'YOUR CAR IS DESTROYED - OUT OF THE RACE' : 'YOU ARE INVOLVED! DAMAGE ' + Math.round(pc.damage * 100) + '%'), 'bad');
      if (r < 0.42 && U.chance(0.35) && !pl) { this.msg(desc + ' - KEEPS GOING, NO CAUTION', 'info'); return; }
      this.startCaution(desc, involved.length > 3 ? 5 : U.randi(3, 4));
    }

    stageEnd() {
      const o = this.order().filter(c => c.status !== 'dnf');
      const top = o.slice(0, 10);
      top.forEach((c, i) => { c.stagePts += 10 - i; });
      this.stageResults.push(top.map(c => c.id));
      this.msg('STAGE ' + this.stage + ' WON BY #' + top[0].e.number + ' ' + top[0].e.driverShort, 'stage');
      this.onEvent('stage', { stage: this.stage, winner: top[0] });
      this.stage++;
      this.startCaution('END OF STAGE ' + (this.stage - 1), 3);
    }

    step(dt) {
      if (this.paused || this.phase === 'done') return;
      this.t += dt; if (this.restartT > 0) this.restartT -= dt;
      const g = this.geom, L = g.L, T = this.T, bv = this.baseV;
      const yellow = this.flag === 'yellow';
      // physical order on track by frac
      const tc = this.trackCars();
      const byFrac = tc.slice().sort((a, b) => this.frac(a.d) - this.frac(b.d));
      const n = byFrac.length;
      const idx = new Map(); byFrac.forEach((c, i) => idx.set(c, i));
      const gapTo = (a, b) => { let x = (this.frac(b.d) - this.frac(a.d)) * L; if (x < 0) x += L; return x; };
      // find first car ahead satisfying lateral filter within range
      const ahead = (c, range, latTol) => {
        const i = idx.get(c);
        for (let k = 1; k < n; k++) {
          const o = byFrac[(i + k) % n]; const gp = gapTo(c, o); if (gp > range) break;
          if (latTol === null || Math.abs(o.lat - c.lat) < latTol) return { o, gp };
        }
        return null;
      };
      const laneFree = (c, laneLat, back, fwd) => {
        const i = idx.get(c);
        for (let k = 1; k < n; k++) { const o = byFrac[(i + k) % n]; const gp = gapTo(c, o); if (gp > fwd) break; if (Math.abs(o.latT - laneLat) < 12 || Math.abs(o.lat - laneLat) < 12) return false; }
        for (let k = 1; k < n; k++) { const o = byFrac[(i - k + n * 4) % n]; const gp = gapTo(o, c); if (gp > back) break; if (Math.abs(o.latT - laneLat) < 12 || Math.abs(o.lat - laneLat) < 12) return false; }
        return true;
      };
      const paceV = bv * this.paceF;
      if (this.pace.active) this.pace.d += paceV * dt;
      const leaderD = tc.length ? Math.max(...tc.map(c => c.d)) : 0;

      for (const c of this.cars) {
        if (c.status === 'dnf') { c.outT -= dt; continue; }
        if (c.status === 'fin' && this.phase === 'done') continue;
        const md = MODES[c.mode] || MODES.normal;
        let desired;
        const inPit = c.pit && c.pit.phase !== 'wait';
        if (c.spin > 0) c.spin -= dt;
        if (inPit) {
          const prog = g.pitProg(this.frac(c.d));
          const pv = bv * 0.5; // pit road speed limit (longer v1.3 pit roads)
          if (c.pit.phase === 'lane') {
            desired = pv;
            if (prog >= (g.boxProg ? g.boxProg(c.stall) : c.stall * g.pitRange)) {
              c.pit.phase = 'stop'; c.v = 0; desired = 0; if (g.boxLat) c.latT = g.boxLat;
              const base = PIT_TIME[c.pit.type] * this.lapTime;
              const ps = c.e.pit === undefined ? 50 : c.e.pit; // driver hitting the marks on pit road
              let time = base * (1.3 - c.crew * 0.5) * (1.07 - ps / 100 * 0.14) + (c.damage > 0.05 ? (0.2 + c.damage) * this.lapTime : 0);
              if (U.chance(Math.max(0.004, 0.07 - c.crew * 0.05 + (50 - ps) * 0.0006))) { time += 0.35 * this.lapTime; if (c.isPlayer) this.msg(this.tag(c) + 'PIT ROAD MISTAKE! SLOW STOP', 'bad'); }
              c.pit.timer = time; c.pitCount++;
            }
          } else if (c.pit.phase === 'stop') {
            desired = 0; c.v = 0; c.pit.timer -= dt;
            if (c.pit.timer <= 0) {
              const ty = c.pit.type;
              if (ty === 'four') c.tire = 1; else if (ty === 'two') c.tire = Math.min(1, (c.tire + 1) / 2 + 0.05);
              c.fuel = 1; if (c.damage > 0.05) c.damage *= 0.35;
              c.pit.phase = 'exit'; c.latT = g.pitLat;
              if (c.isPlayer) this.msg(this.tag(c) + 'PIT STOP DONE: ' + ({ four: '4 TIRES', two: '2 TIRES', fuel: 'FUEL' })[ty] + ' - GO GO GO!', 'player');
            }
          } else if (c.pit.phase === 'exit') {
            desired = pv;
            if (prog > g.pitRange) { c.pit = null; c.latT = g.lanes[0]; }
          }
        } else if (c.status === 'fin') {
          desired = paceV * 0.9;
        } else if (yellow) {
          const a = ahead(c, L, null);
          let gp = a ? a.gp : L;
          // pace car
          if (this.pace.active) { let pg = (this.frac(this.pace.d) - this.frac(c.d)) * L; if (pg < 0) pg += L; if (pg < gp) gp = pg; }
          const sp = T.paceSpacing;
          desired = paceV + U.clamp((gp - sp) / sp, -1, 1.2) * paceV * 0.9;
          desired = U.clamp(desired, 0, bv * 1.05);
          if (gp < 26) desired = Math.min(desired, paceV * 0.3);
        } else {
          let f = 1 + (c.perf - 70) * 0.003 + c.form + md.spd + c.noise - (1 - c.tire) * T.tireFall - c.damage * 0.08;
          const laneIdx = g.lanes.indexOf(c.latT); if (laneIdx > 0 && T.outsidePen) f -= T.outsidePen * laneIdx;
          const dr = ahead(c, T.draftRange, 18);
          if (dr) f += T.draft * Math.pow(1 - dr.gp / T.draftRange, 0.7) * (0.8 + c.e.craft / 250);
          if (this.restartT > 0) f += ((c.e.pit === undefined ? 50 : c.e.pit) - 50) * 0.0004; // restart jump
          if (this.type === 'superspeedway') {
            // bump-draft push from car behind
            const i = idx.get(c); const b = byFrac[(i - 1 + n) % n];
            if (b && b !== c && gapTo(b, c) < 48 && Math.abs(b.lat - c.lat) < 18) f += 0.006;
          }
          if (c.fuel <= 0) f *= 0.3;
          desired = bv * f;
          // blocking & passing
          const bl = ahead(c, 46, 15);
          if (bl && desired > bl.o.v * 0.999 && !(bl.o.pit && bl.o.pit.phase !== 'wait')) {
            const lapped = bl.o.d < c.d - 0.5;
            const adv = U.clamp((desired / Math.max(bl.o.v, 1e-6) - 1) * 60, 0, 3);
            const rate = T.laneRate * (0.5 + c.e.craft / 100) * (0.7 + (c.e.aggr === undefined ? 50 : c.e.aggr) / 170) * (lapped ? 4 : 1) * (1 + adv);
            let moved = false;
            if (U.chance(rate * dt)) {
              const li = g.lanes.indexOf(c.latT); const opts = [li + 1, li - 1].filter(k => k >= 0 && k < g.lanes.length);
              for (const k of U.shuffle(opts)) { if (laneFree(c, g.lanes[k], 24, lapped ? 30 : 34)) { c.latT = g.lanes[k]; moved = true; break; } }
            }
            if (!moved && bl.gp < 44) desired = Math.min(desired, bl.o.v + (bl.gp - 36) / L * 2);
          } else {
            // drift back to preferred lane
            const li = g.lanes.indexOf(c.latT); const pref = c.pref;
            if (li !== pref && U.chance((this.type === 'superspeedway' ? 0.08 : 0.7) * dt)) {
              const k = li > pref ? li - 1 : li + 1;
              if (laneFree(c, g.lanes[k], 40, 70)) c.latT = g.lanes[k];
            }
          }
          if (c.spin > 0) desired = bv * 0.2;
        }
        // accel limits
        const acc = desired > c.v ? bv * 0.4 : bv * 1.2;
        c.v += U.clamp(desired - c.v, -acc * dt, acc * dt);
        if (c.pit && c.pit.phase === 'stop') c.v = 0;
        c.newD = c.d + c.v * dt;
      }
      // apply movement & overlap fix
      for (const c of this.cars) {
        if (c.status === 'dnf' || c.newD === undefined) continue;
        const prevFrac = this.frac(c.d), dd = c.newD - c.d;
        c.d = c.newD; c.newD = undefined;
        const fr = this.frac(c.d);
        // lane movement
        const ls = 60 * dt; const dl = c.latT - c.lat; const mv = U.clamp(dl, -ls, ls); c.lat += mv; c.yaw = U.clamp(mv / Math.max(dt, 1e-6) / 300, -0.35, 0.35);
        // pit entry
        if (c.pit && c.pit.phase === 'wait' && c.status === 'run') {
          const p0 = g.pitProg(prevFrac), p1 = g.pitProg(fr);
          if (p1 < p0 && p1 < 0.05) { c.pit.phase = 'lane'; c.latT = g.pitLat; if (c.isPlayer) this.msg(this.tag(c) + 'ON PIT ROAD', 'player'); }
        }
        // consumption
        const cMul = this.flag === 'yellow' ? 0.15 : 1;
        if (dd > 0) {
          const md = MODES[c.mode] || MODES.normal;
          c.tire = Math.max(0.05, c.tire - T.wear * md.wear * (1.2 - c.e.tires / 250) * dd * cMul);
          const fs = c.e.fuelS === undefined ? 50 : c.e.fuelS; // fuel-saving skill
          c.fuel = Math.max(0, c.fuel - dd / T.fuelLaps * md.fuel * (1.06 - fs / 100 * 0.12) * (this.flag === 'yellow' ? 0.4 : 1));
        }
        // incidents (green only)
        if (c.status === 'run' && this.flag === 'green' && this.phase === 'racing' && !c.pit && dd > 0 && this.t > 3) {
          const md = MODES[c.mode] || MODES.normal;
          const risk = T.incident * (1.7 - c.e.cons / 100) * (0.75 + (c.e.aggr === undefined ? 50 : c.e.aggr) / 200) * md.risk * (1 + (1 - c.tire) * 1.4) * (1 + c.damage);
          if (U.chance(risk * dd)) this.crash(c);
          else if (U.chance(0.00025 * (1.5 - c.e.rel / 100) * dd)) {
            c.status = 'dnf'; c.reason = 'ENGINE'; c.outT = 3;
            if (c.isPlayer) this.msg(this.tag(c) + 'ENGINE FAILURE! YOU ARE OUT', 'bad');
            if (U.chance(0.45)) this.startCaution('#' + c.e.number + ' BLOWS AN ENGINE', 3);
            else this.msg('#' + c.e.number + ' ENGINE LETS GO', 'info');
          }
        }
        // lap crossing
        const lapsNow = Math.max(0, Math.floor(c.d));
        if (lapsNow > c.laps && c.status === 'run') {
          c.laps = lapsNow;
          c.noise = U.gauss() * 0.003 * (1.4 - c.e.cons / 100);
          if (this.phase === 'finishing' && c.status === 'run') { c.status = 'fin'; c.finishPos = this.finishOrder.length + 1; this.finishOrder.push(c); }
        }
      }
      // overlap correction (same lane)
      const tc2 = this.trackCars().sort((a, b) => this.frac(a.d) - this.frac(b.d));
      for (let i = 0; i < tc2.length; i++) {
        const c = tc2[i];
        for (let k = 1; k < Math.min(6, tc2.length); k++) {
          const o = tc2[(i + k) % tc2.length]; let gp = (this.frac(o.d) - this.frac(c.d)) * L; if (gp < 0) gp += L;
          if (gp > 32) break;
          if (Math.abs(o.lat - c.lat) < 14 && gp < 28) { c.d -= (28 - gp) / L; c.v = Math.min(c.v, o.v); }
        }
      }
      // leader based events
      const ord = this.order();
      const lead = ord[0];
      if (this.phase === 'racing') {
        if (lead && lead.status === 'run') {
          if (!this._lastLeadLaps) this._lastLeadLaps = 0;
          if (lead.laps > this._lastLeadLaps) {
            this._lastLeadLaps = lead.laps; lead.lapsLed++;
            if (lead.laps >= this.laps) {
              this.phase = 'finishing'; this.flagChecker = true;
              lead.status = 'fin'; lead.finishPos = 1; this.finishOrder.push(lead);
              this.msg('CHECKERED FLAG! #' + lead.e.number + ' ' + lead.e.driverShort + ' WINS!', 'win');
              this.onEvent('checkered', { winner: lead });
              this.finishT = 0;
            } else if (this.stage <= this.stages.length && lead.laps >= this.stages[this.stage - 1]) {
              if (this.flag === 'yellow') { // stage ends under caution
                const top = ord.filter(c => c.status !== 'dnf').slice(0, 10); top.forEach((c, i) => c.stagePts += 10 - i);
                this.stageResults.push(top.map(c => c.id)); this.msg('STAGE ' + this.stage + ' ENDS UNDER CAUTION - #' + top[0].e.number + ' WINS IT', 'stage');
                this.onEvent('stage', { stage: this.stage, winner: top[0] }); this.stage++;
              } else this.stageEnd();
            }
          }
        }
        // caution management
        if (this.flag === 'yellow') {
          this.cautionTime -= dt;
          const lapsLeft = this.laps - this.leaderLaps();
          if (this.cautionTime < this.lapTime / this.paceF * 0.6 && !this.restartLanesSet) {
            this.restartLanesSet = true;
            const line = this.trackCars().sort((a, b) => b.d - a.d);
            line.forEach((c, i) => { c.latT = g.lanes[Math.min(i % 2, g.lanes.length - 1)]; });
          }
          if (this.cautionTime <= 0 && lapsLeft > 0) {
            const pitting = this.cars.some(c => c.pit && c.pit.phase !== 'wait' && c.status === 'run');
            if (!pitting || this.cautionTime < -this.lapTime * 2) {
              this.flag = 'green'; this.pace.active = false; this.restartT = this.lapTime * 0.6;
              this.cars.forEach(c => { if (c.pit && c.pit.phase === 'wait') c.pit = null; });
              this.msg('GREEN FLAG - RESTART!', 'green'); this.onEvent('green', {});
            }
          }
        }
        // AI green flag pit decisions + player fuel safety
        if (this.flag === 'green') {
          for (const c of this.cars) {
            if (c.status !== 'run' || c.pit) continue;
            const lapsLeft = this.laps - c.laps; const fl = c.fuel * T.fuelLaps;
            const needFuel = fl < lapsLeft + 0.3;
            if (c.isPlayer && !this.autoPlayer) {
              if (needFuel && fl < 1.3) { c.pit = { type: c.tire < 0.7 ? 'four' : 'fuel', phase: 'wait' }; this.msg(this.tag(c) + 'CREW CHIEF: LOW FUEL, BOXING THIS LAP!', 'player'); }
              continue;
            }
            if (needFuel && fl < 1.4 + Math.random() * 0.4) c.pit = { type: c.tire < 0.8 ? 'four' : 'fuel', phase: 'wait' };
            else if (c.tire < 0.42 && lapsLeft > 12) c.pit = { type: 'four', phase: 'wait' };
            else if (c.damage > 0.25 && lapsLeft > 5) c.pit = { type: 'four', phase: 'wait' };
          }
        }
      } else if (this.phase === 'finishing') {
        this.finishT += dt;
        const running = this.cars.filter(c => c.status === 'run');
        if (!running.length || this.finishT > this.lapTime * 5) {
          running.sort((a, b) => b.d - a.d).forEach(c => { c.status = 'fin'; c.finishPos = this.finishOrder.length + 1; this.finishOrder.push(c); });
          this.phase = 'done'; this.onEvent('done', {});
        }
      }
      for (const pt of this.particles) pt.t -= dt;
      this.particles = this.particles.filter(p => p.t > 0);
    }

    runToEnd() {
      this.autoPlayer = true; this.paused = false; this.callQueue = [];
      let guard = 0; const dt = 1 / 15;
      while (this.phase !== 'done' && guard++ < 400000) this.step(dt);
    }

    results() {
      const ord = this.order();
      const all = ord.map((c, i) => ({ id: c.id, pos: i + 1, laps: c.laps, status: c.status === 'dnf' ? c.reason : 'RUNNING', lapsLed: c.lapsLed, stagePts: c.stagePts, number: c.e.number, isPlayer: c.isPlayer, pitStops: c.pitCount, grid: c.grid }));
      return { order: all, stages: this.stageResults, cautions: this.cautions, track: this.geom.id };
    }
  }
  return { Race, qualify, cautionChoice, MODES, CAR_LEN };
})();
