/* UI: hub + management screens + race day. Touch-first, event-delegated. */
'use strict';
const UI = (() => {
  const $ = (s, r) => (r || document).querySelector(s);
  const app = () => document.getElementById('app');
  const T = (t, sc, o) => PF.img(String(t), Object.assign({ scale: sc || 2 }, o || {}));
  const ui = { screen: 'hub', nc: null, standTab: 'points', prep: null, summary: null, race: null, artCache: {}, prevCache: {} };
  const S = () => Game.S;
  function wrap(text, n) {
    const words = String(text).toUpperCase().split(/\s+/); const lines = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > n) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur); return lines;
  }
  function toast(msg) { const old = $('.toast'); if (old) old.remove(); const d = document.createElement('div'); d.className = 'toast ol1'; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
  function modal(html) { closeModal(); const w = document.createElement('div'); w.className = 'modal-wrap'; w.innerHTML = `<div class="modal panel">${html}</div>`; document.body.appendChild(w); return w; }
  function closeModal() { document.querySelectorAll('.modal-wrap').forEach(m => m.remove()); }
  let confirmCb = null;
  function confirmBox(text, yes, cb, color) {
    confirmCb = cb;
    modal(`<div style="margin-bottom:12px;font-size:13px;line-height:1.5">${U.esc(text)}</div><div class="row" style="justify-content:flex-end"><button class="btn grey" data-act="closeModal">CANCEL</button><button class="btn ${color || 'green'}" data-act="confirmYes">${U.esc(yes)}</button></div>`);
  }
  const ICON_GEAR = () => Art.gear('#1b1b1b');
  // ---------- shared chrome (v1.2 pit-wall look) ----------
  const SH = { shadow: '#0d0e10' };
  const NEON = '#e6ff2b';
  function resBlock(sc) {
    const s = S(); if (!s) return '';
    return `<div class="tb-res">${T(Math.floor(s.ep), Math.max(2, sc - 1), SH)}<img class="pix" src="${Art.gear('#9aa3ad')}" style="width:${sc * 6}px;height:${sc * 6}px" alt="EP"></div>
      <div class="tb-res">${T(U.money(s.money).replace('$', ''), sc, Object.assign({ color: s.money < 0 ? '#ff5050' : '#fff' }, SH))}${T('$', sc, Object.assign({ color: '#2ecc40' }, SH))}</div>`;
  }
  // hub top bar: team name + car, week/day, money
  function topbar() {
    const s = S(); const W = window.innerWidth;
    if (!s) return `<div class="topbar pw-bar"><div class="tb-left">${T('STOCK CAR MANAGER', 3, SH)}</div><div class="tb-mid"></div><div class="tb-right">${T('TEAM OWNER SIM', 2, { color: NEON, shadow: '#0d0e10' })}</div></div>`;
    const nm = s.team.name; const sc = nm.length > 16 || (W < 800 && nm.length > 12) ? 2 : 3;
    return `<div class="topbar pw-bar"><div class="tb-left">${T(nm, sc, SH)}${Art.carImg(Game.myLivery(), s.team.number, 2)}</div>
      <div class="tb-mid">${T('WEEK ' + s.week, 3, SH)}${T('DAY ' + s.day, 2, { color: '#9aa3ad', shadow: '#0d0e10' })}</div>
      <div class="tb-right">${resBlock(W < 800 ? 2 : 3)}</div></div>`;
  }
  function pageHead(title, extra, center) {
    const s = S();
    return `<div class="pw-head pw-bar"><button class="btn back" data-act="go" data-arg="hub">${T('< HUB', 2)}</button><div class="ph-title ${center ? 'center' : ''}">${T(title, 3, SH)}</div>${center ? '' : '<div class="spacer"></div>'}${extra || ''}${s ? `<div class="ph-res">${resBlock(2)}</div>` : ''}</div>`;
  }
  function page(title, body, extra) {
    return `<div class="screen page">${pageHead(title, extra)}<div class="page-body">${body}</div></div>`;
  }
  function render(html) { app().innerHTML = html; }
  const NEW_ART = { garageHub: 1, driversHub: 1, trophyHub: 1 };
  function artURL(kind, w, h, opt) {
    const key = kind + w + 'x' + h + JSON.stringify(opt || {});
    if (!ui.artCache[key]) ui.artCache[key] = PW.hubTile(kind, w, h, opt).toDataURL();
    return ui.artCache[key];
  }
  function previewURL(tid, w, h) { const k = tid + w + h; if (!ui.prevCache[k]) ui.prevCache[k] = Renderer.preview(tid, w, h).toDataURL(); return ui.prevCache[k]; }
  function bar(v, max, col, marker) { const p = U.clamp(v / max * 100, 0, 100); return `<div class="bar"><i style="width:${p}%;background:${col || '#2ecc40'}"></i>${marker !== undefined ? `<b style="left:${U.clamp(marker / max * 100, 0, 100)}%"></b>` : ''}</div>`; }
  const typeShort = t => ({ short: 'SHORT', intermediate: 'INTER', superspeedway: 'SUPER', road: 'ROAD' })[t];

  // ---------- NEWS TICKER (real game news) ----------
  function tickerLines() {
    const s = S(); const A = [], B = [];
    if (!s) {
      A.push(['PIT WALL TICKER:', 'WELCOME TO STOCK CAR MANAGER - YOU ARE THE TEAM BOSS, NOT THE DRIVER.'], ['[CAREER]', 'TAP CAREER MODE TO START: OWN A TEAM OR GET HIRED.']);
      B.push(['[THE LADDER]', 'ARCA > TRUCKS > O\'REILLY > CUP. ONLY THE BEST TEAMS MAKE IT TO THE TOP.'], ['[TIP]', 'RESULTS BRING SPONSORS. SPONSORS BRING MONEY. MONEY BUILDS FASTER CARS.']);
      return [A, B];
    }
    const sr = Game.ser();
    if (s.seasonOver) A.push(['PIT WALL TICKER:', 'SEASON COMPLETE! ' + s.team.name + ' FINISHED ' + U.ordinal(Game.teamBestPos()) + ' IN THE ' + sr.name + '.']);
    else { const t = DATA.TRACKS[s.schedule[s.week - 1]]; const ev = DATA.eventName(s.seriesIdx, s.week); A.push(['PIT WALL TICKER:', 'NEXT RACE: ' + (ev ? 'THE ' + ev + ' AT ' : '') + t.name + ' (' + t.miles + ' MI, ' + DATA.TYPES[t.type].name + ', ' + DATA.TYPES[t.type].laps + ' LAPS) IS COMING UP! RACE ' + s.week + ' OF 10.']); }
    if (s.results.length) {
      const r = s.results[s.results.length - 1]; const w = Game.entryInfo(r.order[0].id);
      const mine = r.order.filter(o => o.id === 'P' || o.id === 'P2').map(o => '#' + Game.entryInfo(o.id).number + ' ' + U.ordinal(o.pos)).join(', ');
      A.push(['[RESULTS]', DATA.TRACKS[r.track].short + ': #' + w.number + ' ' + w.driver.toUpperCase() + ' WINS. ' + s.team.name + ': ' + mine + '.']);
      const ord = Game.standingsOrder(); const lead = s.standings[ord[0]].pts; const myId = Game.teamCars()[0].id; const me = s.standings[myId];
      A.push(['[STANDINGS]', s.team.name + ' IS ' + U.ordinal(Game.teamBestPos()) + ' IN POINTS' + (me && ord[0] !== myId ? ', ' + (lead - me.pts) + ' BEHIND THE LEADER.' : ' - LEADING THE SERIES!')]);
    } else A.push(['[SEASON]', s.year + ' ' + sr.name + ' - 10 RACES, 3 STAGES EACH. NO POINTS ON THE BOARD YET.']);
    if (s.hired) A.push(['[BOSS]', s.hired.owner + ' CONFIDENCE: ' + Math.round(s.hired.confidence) + '%.']);
    if (!Game.hasCar()) A.push(['[GARAGE]', 'THE SHOP IS EMPTY - BUY A USED CAR TO GO RACING.']);
    else if (!s.team.driverId) A.push(['[DRIVERS]', 'CAR #' + s.team.number + ' HAS NO DRIVER. HIRE ONE BEFORE RACE DAY.']);
    for (const o of s.offers.slice(0, 2)) B.push(['[SPONSOR UPDATE]', (o.renewal ? 'RENEWAL OFFER FROM \'' : 'NEW CONTRACT OFFER FROM \'') + o.name + '\' IS OPEN! ' + U.money(o.perRace) + '/RACE, ' + o.weeksLeft + ' WK LEFT.']);
    if (!s.offers.length && Game.sponsorInterest().slots === 0) B.push(['[SPONSORS]', 'NO SPONSOR YET - ONE TOP-10 (OR TWO TOP-15S) GETS LOCAL BUSINESSES CALLING.']);
    const pros = Game.prospects();
    if (pros.length) { const best = pros.map(d => [d, Game.prospectView(d)]).sort((a, b) => b[1].ovr[1] - a[1].ovr[1])[0]; B.push(['[SCOUTING]', pros.length + ' PROSPECT' + (pros.length > 1 ? 'S' : '') + ' ON THE LIST. TOP REPORT: ' + Game.driverName(best[0]).toUpperCase() + ', AGE ' + best[0].age + ', OVR ' + best[1].ovr[0] + '-' + best[1].ovr[1] + ', GONE IN ' + best[0].pros.weeks + ' WK.']); }
    else if (Game.hasCar()) B.push(['[SCOUTING]', 'NO PROSPECTS ON THE LIST. SEND A SCOUT TO FIND THE NEXT STAR (DRIVERS > SCOUTING).']);
    for (const r of s.team.rnd) B.push(['[R&D]', DATA.PARTS[r.part].name + ' UPGRADE: ' + r.days + ' DAYS LEFT.']);
    for (const b of s.team.builds) B.push(['[FACILITIES]', DATA.FACILITIES[b.fac].name + ' CONSTRUCTION: ' + b.days + ' DAYS LEFT.']);
    for (const n of s.news.slice(0, 4)) B.push(['[NEWS]', n.text]);
    return [A, B];
  }
  function tickerHTML() {
    return tickerLines().map((items, li) => {
      const html = items.map(([tag, text]) => `<span class="tk-item"><b class="tk-star">***</b> <span class="tk-tag">${U.esc(tag)}</span> ${U.esc(String(text).toUpperCase())} </span>`).join('');
      const len = items.reduce((a, [t, x]) => a + t.length + x.length + 6, 0);
      return `<div class="tk-line"><div class="tk-track" style="animation-duration:${Math.max(14, Math.round(len * (li ? 0.2 : 0.17)))}s">${html}${html}</div></div>`;
    }).join('');
  }

  // ---------- HUB (v1.2: every tile on one screen) ----------
  function hubMetrics() {
    const W = window.innerWidth, H = window.innerHeight; const small = H <= 370;
    const top = small ? 40 : 46, bot = small ? 56 : 60, padX = 10, padY = 6, gap = 7;
    const colW = (W - padX * 2 - gap * 9) / 10; const tw = Math.floor(colW * 2 + gap); const th = Math.floor((H - top - bot - padY * 2 - gap) / 2);
    return { W, H, small, top, bot, tw, th, gap };
  }
  function roadBar(s) {
    const cur = s ? s.seriesIdx : 0;
    return `<div class="road"><div class="road-title">ROAD TO THE CUP</div><div class="road-segs">${DATA.SERIES.map((x, i) => `<div class="road-seg s${i} ${i === cur ? 'cur' : i < cur ? 'done' : 'todo'}">${i === cur ? '<span class="road-you">YOU</span>' : ''}<i></i><span class="road-lbl">${i ? '> ' : ''}${x.short}</span></div>`).join('')}</div></div>`;
  }
  function hub() {
    ui.screen = 'hub';
    const s = S(); const has = !!s; const M = hubMetrics(); const { tw, th } = M;
    const lv = has ? Game.myLivery() : { body: '#d9342b', stripe: '#f2d22e', num: '#141414' };
    const num = has ? s.team.number : 7;
    const lab = (text, w) => { const lines = text.split('\n'); const width = Math.max(...lines.map(PF.measure)) + 2; const sc = width * 3 <= w * 0.9 ? 3 : 2; return `<span class="tlabel">${T(text, sc, SH)}</span>`; };
    const artTile = (act, kind, label, area, opts) => {
      opts = opts || {}; const locked = !has && act !== 'career';
      const k = NEW_ART[kind] ? 2 : 1.45; const w = opts.w || tw;
      const aw = Math.round((w - 10) / k), ah = Math.round((th - 10) / k);
      return `<button class="ptile ${locked ? 'locked' : ''} ${opts.cls || ''}" style="grid-area:${area}" data-act="${locked ? 'needCareer' : 'go'}" data-arg="${act}">
        <span class="pt-art"><img class="art" src="${artURL(kind, aw, ah, { livery: lv, number: num })}" alt=""></span>${lab(label, w)}${opts.badge ? `<span class="badge">${opts.badge}</span>` : ''}</button>`;
    };
    const nextTrack = has && !s.seasonOver ? DATA.TRACKS[s.schedule[s.week - 1]] : null;
    let tiles = '';
    tiles += artTile(has && s.seasonOver ? 'seasonEnd' : 'prep', 'race', has && s.seasonOver ? 'SEASON\nEND' : 'GO\nRACE', '1 / 1 / 2 / 3', { badge: nextTrack ? 'R' + s.week : '', cls: 'hot' });
    tiles += artTile('garage', 'garageHub', 'GARAGE', '1 / 3 / 2 / 5', { badge: has && !Game.hasCar() ? 'BUY CAR!' : has && s.team.rnd.length ? 'R&D' : '' });
    const needDrv = has && (!s.team.driverId || (s.team.car2 && !s.team.car2.driverId));
    tiles += artTile('drivers', 'driversHub', 'DRIVERS', '1 / 5 / 2 / 7', { badge: needDrv ? 'NEED!' : has && Game.prospects().length ? Game.prospects().length + ' SCOUTED' : '' });
    tiles += artTile('facilities', 'facilities', 'FACILITIES', '1 / 7 / 2 / 9', { badge: has && s.team.builds.length ? 'BUILD' : '' });
    tiles += artTile('sponsors', 'sponsors', 'SPONSORS', '1 / 9 / 2 / 11', { badge: has && s.offers.length ? s.offers.length + ' OFFER' + (s.offers.length > 1 ? 'S' : '') : '' });
    // career tile (wide): art + label, live info, road-to-the-cup bar
    const cw = tw * 2 + M.gap; const artW = Math.round(cw * 0.58); const artH = Math.max(40, th - 62);
    let info = '';
    if (has) {
      const sr = Game.ser(); const pos = s.results.length ? U.ordinal(Game.teamBestPos()) + ' IN PTS' : 'NO PTS YET';
      info = `${T(sr.short, 2, SH)}<span>SEASON ${s.year}</span><span>${s.seasonOver ? 'SEASON DONE' : 'RACE ' + s.week + '/10'}</span><span>${pos}</span><span class="neon">${s.mode === 'owner' ? 'OWNER' : 'BOSS ' + Math.round(s.hired.confidence) + '%'}</span>`;
    } else info = `${T('NEW', 2, { color: NEON, shadow: '#0d0e10' })}<span>OWN A TEAM</span><span>OR GET HIRED</span><span class="neon">TAP TO START</span>`;
    tiles += `<button class="ptile career-tile" style="grid-area:2 / 1 / 3 / 5" data-act="go" data-arg="career">
      <span class="ct-top"><span class="ct-art" style="width:${artW}px"><img class="art" src="${artURL('career', Math.round(artW / 1.45), Math.round(artH / 1.45), { livery: lv, number: num })}" alt="">${lab(has ? 'CAREER\nMODE' : 'NEW\nCAREER', artW)}</span><span class="ct-info">${info}</span></span>
      ${roadBar(s)}${has ? '' : '<span class="badge">START</span>'}</button>`;
    tiles += artTile('calendar', 'calendar', 'CALENDAR', '2 / 5 / 3 / 7');
    tiles += artTile('standings', 'standings', 'STANDINGS', '2 / 7 / 3 / 9');
    const tro = has && s.trophies ? new Set(s.trophies.log.map(e => e.k)).size : 0;
    tiles += artTile('trophies', 'trophyHub', 'TROPHIES', '2 / 9 / 3 / 11', { badge: has && s.trophies && s.trophies.unseen ? s.trophies.unseen + ' NEW' : tro ? String(tro) : '' });
    const xpPct = has ? Math.round(s.xp / (s.level * DATA.XP_PER_LEVEL) * 100) : 0;
    const pname = has ? s.profile : 'PLAYER';
    render(`<div class="screen hub pw">${topbar()}
      <div class="hub-grid2" style="grid-template-rows:${th}px ${th}px">${tiles}</div>
      <div class="botbar pw-bot"><button class="profile-btn" data-act="go" data-arg="profile" aria-label="Profile">${T(pname, pname.length > 8 ? 2 : 3, SH)}<span class="pb-lv">LV ${has ? s.level : 1}<span class="xpbar"><i style="width:${xpPct}%"></i></span></span></button>
        <button class="ticker" data-act="go" data-arg="${has ? 'news' : 'career'}" aria-label="News ticker">${tickerHTML()}</button>
        <button class="ver-btn" data-act="go" data-arg="updates" aria-label="Update log">${T('V' + DATA.VERSION, 2, SH)}${seenVersion() !== DATA.VERSION ? '<span class="newdot">NEW</span>' : ''}</button></div></div>`);
  }

  // ---------- CAREER MODE: PIT WALL DASHBOARD (v1.2) ----------
  function dashStatBar(icon, label, v, col) {
    return `<div class="sbar-row">${PW.icon(icon, 3)}<div class="sbar"><i style="width:${U.clamp(v, 0, 100)}%;background:${col}"></i><span class="sb-l">${label}</span><span class="sb-v">${Math.round(v)}</span></div></div>`;
  }
  function careerPathHTML(s) {
    const ladder = `<div class="ladder">${DATA.SERIES.map((x, i) => `<span class="lad ${i === s.seriesIdx ? 'cur' : i < s.seriesIdx ? 'done' : ''}">${x.short}</span>`).join('<b>&gt;</b>')}</div>`;
    const ck = (ok, t) => `<div class="ck ${ok ? 'ok' : ''}"><b>${ok ? '&#10003;' : '&middot;'}</b>${t}</div>`;
    let body = '';
    const pos = s.results.length ? Game.teamBestPos() : null;
    const wins = Game.teamCars().reduce((a, c) => a + (s.standings[c.id] ? s.standings[c.id].wins : 0), 0);
    if (s.mode === 'owner') {
      if (s.seriesIdx < 3) {
        const nx = DATA.SERIES[s.seriesIdx + 1];
        body = `<div class="pt-head">OWNER · TO MOVE UP TO ${nx.short}:</div>
          ${ck(pos !== null && (pos <= 5) || wins >= 2, 'TOP 5 IN PTS (NOW ' + (pos ? U.ordinal(pos) : '--') + ') OR 2 WINS (' + wins + ')')}
          ${ck(s.money >= nx.buyIn, U.moneyShort(nx.buyIn) + ' BUY-IN (BANK ' + U.moneyShort(s.money) + ', HALF IF CHAMP)')}`;
      } else {
        const inP = s.playoff && Game.teamCars().some(c => s.playoff.ids.includes(c.id)); const in4 = s.playoff && s.playoff.final4 && Game.teamCars().some(c => s.playoff.final4.includes(c.id));
        body = `<div class="pt-head">OWNER: YOU MADE THE CUP SERIES</div>${ck(inP, 'TOP 8 AFTER RACE 7 MAKE THE PLAYOFFS')}${ck(in4, 'CHAMPIONSHIP 4 AFTER RACE 9 - WIN THE FINALE!')}`;
      }
    } else {
      const h = s.hired; const cars = Game.teamCars(); const starts = cars.reduce((a, c) => a + (s.standings[c.id] ? s.standings[c.id].starts : 0), 0);
      const sumFin = cars.reduce((a, c) => a + (s.standings[c.id] ? s.standings[c.id].sumFin : 0), 0); const avg = starts ? sumFin / starts : null;
      const conf = Math.round(h.confidence); const col = conf < 30 ? '#ff3b47' : conf < 55 ? '#ffd000' : '#2ecc40';
      body = `<div class="pt-head">HIRED MANAGER · BOSS ${U.esc(h.owner)}</div>
        <div class="conf"><span>CONFIDENCE</span><div class="sbar thin"><i style="width:${conf}%;background:${col}"></i></div><b style="color:${col}">${conf}%</b></div>
        <div class="ck">TARGET AVG ${U.ordinal(h.target)} · NOW ${avg ? avg.toFixed(1) : '--'} · ${s.jobOffers && s.jobOffers.length ? s.jobOffers.length + ' JOB OFFER' + (s.jobOffers.length > 1 ? 'S' : '') + ' WAITING' : s.seriesIdx < 3 ? 'TOP 5 = ' + DATA.SERIES[s.seriesIdx + 1].short + ' OFFERS' : 'TOP 5 KEEPS THE BIG TEAMS CALLING'}</div>`;
    }
    return `<div class="panel dash-path"><div class="dp-title row1"><span>CAREER PATH</span>${ladder}</div>${body}</div>`;
  }
  function career() {
    ui.screen = 'career'; const s = S();
    if (!s) return newCareerScreen();
    const W = window.innerWidth, H = window.innerHeight; const small = H <= 370;
    const lw = W < 800 ? 236 : 256, rw = W < 800 ? 192 : 214; const cw = W - lw - rw - 20 - 16;
    const two = !!s.team.car2; const car = two && ui.dashCar === 2 ? 2 : 1;
    const d = Game.carDriver(car); const lv = Game.carLivery(car); const num = car === 2 ? s.team.car2.number : s.team.number;
    // left: driver card
    const toggle = two ? `<div class="car-toggle">${[1, 2].map(k => `<button class="btn ${car === k ? (k === 2 ? 'teal' : 'yellow') + ' sel' : 'dark'}" data-act="dashCar" data-arg="${k}">#${k === 1 ? s.team.number : s.team.car2.number}</button>`).join('')}</div>` : '';
    const left = `<div class="panel dash-drv"><div class="dd-top"><button class="dd-port" data-act="teamDriver" data-arg="${d ? d.id : ''}"><img class="pix" src="${PW.portrait(d, lv)}" alt="" style="width:96px;height:96px"><span class="dd-name">${U.esc(d ? Game.driverShort(d) : 'NO DRIVER')}</span><span class="dd-sub">${d ? 'OVR ' + Game.ovr(d) + ' · AGE ' + d.age : 'TAP TO HIRE'}</span></button>
        <div class="dd-car">${toggle}${Art.carImg(lv, num, W < 800 ? 3 : 3)}<span class="dd-sub">CAR #${num}${two ? ' · CAR ' + car : ''}</span><span class="dd-sub">CAR RATING ${Game.hasCar() ? Game.carOverall() : '--'}</span></div></div>
      <div class="dd-stats">${dashStatBar('speed', 'SPEED', d ? d.speed : 0, NEON)}${dashStatBar('flag', 'RACECRAFT', d ? d.craft : 0, '#ff3b47')}${dashStatBar('tire', 'TIRES', d ? d.tires : 0, '#2ecc40')}</div></div>`;
    // center: calendar strip + next race + career path
    const cell = Math.max(18, Math.floor((cw - 16 - 9 * 3) / 10)); const ih = Math.round(cell * 0.62);
    const cells = s.schedule.map((tid, i) => {
      const res = s.results[i]; const mine = res ? res.order.filter(o => o.id === 'P' || o.id === 'P2').map(o => o.pos) : [];
      const next = !s.seasonOver && i === s.week - 1; const col = next ? NEON : res ? '#8b929c' : '#d8dde3';
      return `<span class="cal-cell ${next ? 'next' : ''} ${res ? 'past' : ''}" style="width:${cell}px"><img class="pix" src="${PW.trackIcon(tid, cell - 4, ih, col, cell >= 30 ? 2 : 1)}" style="width:${cell - 4}px;height:${ih}px" alt="${DATA.TRACKS[tid].short}"><span class="cc-l">${res ? 'P' + Math.min(...mine) : next ? 'NEXT' : 'R' + (i + 1)}</span></span>`;
    }).join('');
    let nextHTML;
    if (s.seasonOver) nextHTML = `<button class="panel dash-next" data-act="go" data-arg="seasonEnd"><span class="dn-k">SEASON COMPLETE</span>${T(U.ordinal(Game.teamBestPos()) + ' IN POINTS', 2, SH)}<span class="dn-s">TAP FOR THE WRAP-UP</span></button>`;
    else {
      const t = DATA.TRACKS[s.schedule[s.week - 1]]; const ty = DATA.TYPES[t.type]; const racesLeft = 10 - s.week + 1; const ev = DATA.eventName(s.seriesIdx, s.week);
      const room = cw - 24 - 62; const nm = PF.measure(t.name) * 2 <= room ? t.name : t.short; const sc = PF.measure(nm) * 3 <= room && !small ? 3 : 2;
      nextHTML = `<button class="panel dash-next" data-act="go" data-arg="prep"><span class="dn-row"><span class="dn-k">NEXT:</span>${T(nm, sc, SH)}</span><span class="dn-s">${ev ? '<span class="neon">THE ' + ev + '</span> · ' : ''}${t.note}${t.bank ? ' · ' + DATA.bankWord(t.bank) : ''} · ${ty.laps} LAPS</span><span class="dn-s neon">RACE ${s.week} OF 10 · ${racesLeft} RACE${racesLeft > 1 ? 'S' : ''} LEFT${s.seriesIdx === 3 && s.week <= 7 ? ' · PLAYOFF CUT AFTER R7' : ''}</span></button>`;
    }
    const mid = `<div class="dash-mid"><button class="panel dash-cal" data-act="go" data-arg="calendar"><span class="dp-title">SEASON CALENDAR · ${s.year} ${Game.ser().short}</span><span class="cal-strip">${cells}</span></button>${nextHTML}${careerPathHTML(s)}</div>`;
    // right: mini standings + sponsor slot
    const ord = Game.standingsOrder(); const mineIds = Game.teamCars().map(c => c.id);
    const srow = (id) => { const e = Game.entryInfo(id); const i = ord.indexOf(id); return `<div class="ms-row ${e.isPlayer ? (id === 'P2' ? 'me me2' : 'me') : ''}"><b class="ms-p ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}.</b><span class="sw" style="background:${e.livery.body}"></span><span class="ms-n">${U.esc(e.team)}</span>${e.isPlayer && two ? `<span class="ms-num">#${e.number}</span>` : ''}</div>`; };
    const out = mineIds.filter(id => ord.indexOf(id) >= 5).sort((a, b) => ord.indexOf(a) - ord.indexOf(b));
    let rows = ord.slice(0, out.length > 1 ? 4 : 5).map(srow).join('');
    if (out.length) rows += '<div class="ms-gap">· · ·</div>' + out.map(srow).join('');
    const si = Game.sponsorInterest(); const spLine = (sp, n) => `<div class="sp-line">${two ? `<b>#${n}</b> ` : ''}${sp ? `<span class="sp-name ol1" style="background:${sp.colors[0]}">${U.esc(sp.name)}</span>` : `<span class="muted">${si.slots === 0 ? 'EMPTY - GET A TOP 10' : s.offers.length ? 'EMPTY - ' + s.offers.length + ' OFFER' + (s.offers.length > 1 ? 'S' : '') + ' WAITING' : 'EMPTY - OPEN SLOT'}</span>`}</div>`;
    const spBody = si.slots === 0 && !Game.allSponsors().length ? '<div class="sp-line big-empty">EMPTY - GET A TOP 10</div>' : spLine(s.team.sponsors.primary, s.team.number) + (two ? spLine(s.team.car2.primary, s.team.car2.number) : '');
    const right = `<div class="dash-right"><button class="panel dash-stand" data-act="go" data-arg="standings"><span class="dp-title">MINI STANDINGS</span>${rows}</button>
      <button class="panel dash-spon" data-act="go" data-arg="sponsors"><span class="dp-title">SPONSOR SLOT${two ? 'S' : ''}</span>${spBody}</button></div>`;
    const ib = (act, icon, label, badge) => `<button class="dash-ib" data-act="go" data-arg="${act}">${icon}<span>${T(label, 2, SH)}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
    const needDrv = !s.team.driverId || (two && !s.team.car2.driverId);
    const bottom = `<div class="dash-bot">${ib('garage', PW.icon('garage', small ? 2 : 3), 'GARAGE', !Game.hasCar() ? 'BUY CAR!' : '')}${ib('drivers', PW.icon('helmet', small ? 2 : 3), 'DRIVERS', needDrv ? 'NEED!' : '')}${ib('sponsors', PW.icon('sponsor', small ? 2 : 3), 'SPONSORS', s.offers.length ? String(s.offers.length) : '')}${ib('trophies', PW.trophyIcon(small ? 2 : 3), 'TROPHIES', s.trophies && s.trophies.unseen ? s.trophies.unseen + ' NEW' : '')}
      <button class="go-race" data-act="go" data-arg="${s.seasonOver ? 'seasonEnd' : 'prep'}">${T(s.seasonOver ? 'SEASON END' : 'GO RACE', small ? 3 : 4, SH)}</button></div>`;
    const extra = `<button class="btn dark hist-btn" data-act="careerHistory">${T('HISTORY', 2)}</button>`;
    render(`<div class="screen dash pw">${pageHead('PIT WALL DASHBOARD', extra, true)}<div class="dash-main" style="grid-template-columns:${lw}px 1fr ${rw}px">${left}${mid}${right}</div>${bottom}</div>`);
  }
  function teamDriverModal(id) {
    const s = S(); const d = id ? s.drivers[id] : null; if (!d) return go('drivers');
    const slot = Game.slotOf(id); const seat = slot === 'car1' ? 'CAR 1 · #' + s.team.number : slot === 'car2' ? 'CAR 2 · #' + s.team.car2.number : 'DEVELOPMENT';
    modal(`<div class="row" style="justify-content:space-between"><b class="ol1 neon">DRIVER CARD</b><button class="btn grey" data-act="closeModal">X</button></div>
      <div class="cols" style="margin-top:6px"><div class="col narrow" style="flex-basis:150px;align-items:center"><img class="pix" src="${PW.portrait(d, Game.carLivery(slot === 'car2' ? 2 : 1))}" style="width:128px;height:128px;border:3px solid #0d0e10;border-radius:6px" alt="">
        <button class="btn blue wide" data-act="go" data-arg="drivers">DRIVERS ></button></div><div class="col">${driverCard(d, { seat })}</div></div>`);
  }
  function historyModal() {
    const s = S();
    const hist = s.history.length ? `<table class="tbl"><tr><th>YEAR</th><th>SERIES</th><th>TEAM</th><th>POS</th><th>PTS</th><th>WINS</th></tr>${s.history.map(h => `<tr><td>${h.year}</td><td>${h.series}</td><td>${U.esc(h.team)}</td><td>${U.ordinal(h.pos)}</td><td>${h.pts}</td><td>${h.wins}</td></tr>`).join('')}</table>` : '<div class="small muted">NO COMPLETED SEASONS YET.</div>';
    modal(`<div class="row" style="justify-content:space-between"><b class="ol1 neon">CAREER HISTORY · ${s.mode === 'owner' ? 'TEAM OWNER' : 'HIRED MANAGER'}</b><button class="btn grey" data-act="closeModal">X</button></div>
      <div class="small" style="margin:6px 0">REP ${Math.round(s.rep)}/100 · ${s.stats.races} STARTS · ${s.stats.wins} WINS · ${s.stats.top5} TOP 5 · ${s.stats.titles} TITLES</div>${bar(s.rep, 100, NEON)}
      <div style="margin-top:8px">${hist}</div><div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn grey" data-act="newCareerAsk">START A NEW CAREER</button></div>`);
  }
  // ---------- NEW CAREER (v1.2 restyle) ----------
  function newCareerScreen() {
    ui.screen = 'career';
    if (!ui.nc) ui.nc = { step: 'mode', profile: 'ZION', team: 'ZION RACING', number: 7, body: '#d9342b', stripe: '#f2d22e', paint: 'body', jobs: null };
    const nc = ui.nc; if (!nc.paint) nc.paint = 'body';
    const H = window.innerHeight; const lvNC = { body: nc.body, stripe: nc.stripe, num: '#141414' };
    if (nc.step === 'mode') {
      const ah = Math.max(96, Math.min(150, H - 250));
      const card = (mode, kind, label, color, sub, pts) => `<button class="pick-card ${color}" data-act="ncMode" data-arg="${mode}">
        <span class="pc-art" style="height:${ah}px"><img class="art" src="${artURL(kind, Math.round(360 / (NEW_ART[kind] ? 2 : 1.45)), Math.round(ah / (NEW_ART[kind] ? 2 : 1.45)), { livery: lvNC, number: nc.number })}" alt=""><span class="tlabel">${T(label, 3, SH)}</span></span>
        <span class="pc-sub">${sub}</span><span class="pc-pts">${pts.map(p => `<span>&#9656; ${p}</span>`).join('')}</span><span class="pc-go">${T('CHOOSE >', 2, SH)}</span></button>`;
      return render(page('NEW CAREER', `<div class="pick-row">${card('owner', 'garageHub', 'TEAM OWNER', 'red', 'GRASSROOTS · YOUR MONEY, YOUR TEAM', ['$15K AND AN EMPTY SHOP', 'BUY A USED CAR, HIRE A ROOKIE', 'RESULTS BRING SPONSORS', 'BUY INTO TRUCKS, O\'REILLY, CUP'])}
        ${card('hired', 'career', 'HIRED MANAGER', 'blue', 'RUN SOMEONE ELSE\'S TEAM', ['A STRUGGLING ARCA TEAM HIRES YOU', 'THE OWNER\'S BUDGET, YOUR CALLS', 'HIT TARGETS - BIG TEAMS CALL', 'MISS THEM AND YOU\'RE FIRED'])}</div>`));
    }
    if (nc.step === 'owner') {
      const sw = DATA.BODY_COLORS.map(c => `<button class="swatch ${nc[nc.paint] === c ? 'sel' : ''}" style="background:${c}" data-act="ncColor" data-arg="${nc.paint}|${c}" aria-label="${c}"></button>`).join('');
      return render(page('TEAM OWNER SETUP', `<div class="setup"><div class="setup-l">
        <div class="panel"><div class="fl">YOUR NAME (THE OWNER)</div><input id="nc-profile" class="txt" maxlength="14" value="${U.esc(nc.profile)}"></div>
        <div class="panel"><div class="fl">TEAM NAME</div><input id="nc-team" class="txt" maxlength="22" value="${U.esc(nc.team)}"></div>
        <div class="panel"><div class="fl">CAR NUMBER</div><div class="row" style="flex-wrap:nowrap"><button class="btn dark" data-act="ncNum" data-arg="-1">-</button><span class="numbox">${T(String(nc.number), 3, SH)}</span><button class="btn dark" data-act="ncNum" data-arg="1">+</button></div></div>
        <div class="row" style="flex-wrap:nowrap"><button class="btn grey" data-act="ncBack">BACK</button><button class="btn green" style="flex:1" data-act="ncStartOwner">${T('START CAREER >', 2)}</button></div></div>
        <div class="setup-r"><div class="panel garage-floor">${Art.carImg(lvNC, nc.number, H <= 370 ? 4 : 5)}<span class="tiny">$15K BANK · ARCA SERIES · A PRIMARY SPONSOR'S PAINT REPLACES YOURS</span></div>
        <div class="panel"><div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><span class="fl" style="margin:0">PAINT:</span><button class="btn ${nc.paint === 'body' ? 'yellow sel' : 'dark'}" style="flex:1" data-act="ncPaint" data-arg="body">BODY</button><button class="btn ${nc.paint === 'stripe' ? 'yellow sel' : 'dark'}" style="flex:1" data-act="ncPaint" data-arg="stripe">STRIPE</button></div><div class="sw-grid">${sw}</div></div></div></div>`));
    }
    if (nc.step === 'hired') {
      if (!nc.jobs) nc.jobs = [Game.genJob(0, 0.05, 15), Game.genJob(0, 0.15, 15), Game.genJob(0, 0.28, 15)];
      const cards = nc.jobs.map(j => {
        const ov = Game.ovr(j.driver); const car = Math.round((j.parts.engine + j.parts.aero + j.parts.chassis) / 3);
        return `<div class="panel col job-card"><div class="row" style="flex-wrap:nowrap">${Art.carImg(j.livery, j.number, 2)}<div style="min-width:0"><div class="ol1 nm1">${U.esc(j.name)}</div><div class="tiny">OWNER ${U.esc(j.owner)}</div></div></div>
          <div class="small" style="line-height:1.6;margin-top:4px">BUDGET <span class="neon">${U.money(j.budget)}</span><br>CAR RATING ${car} · DRIVER OVR ${ov}<br>SPONSOR: ${j.sponsor ? U.esc(j.sponsor.name) : 'NONE'}<br>TARGET: AVG ${U.ordinal(j.target)}</div>
          <button class="btn green wide" data-act="ncTakeJob" data-arg="${j.id}">TAKE JOB</button></div>`;
      }).join('');
      return render(page('HIRED MANAGER', `<div class="panel" style="margin-bottom:8px"><div class="row" style="flex-wrap:nowrap"><div class="fl" style="flex:0 0 auto;margin:0">YOUR NAME</div><input id="nc-profile" class="txt" style="flex:1" maxlength="14" value="${U.esc(nc.profile)}"><button class="btn grey" data-act="ncBack">BACK</button></div></div>
        <div class="small neon" style="margin-bottom:6px">THREE ARCA TEAMS WANT YOU. PICK ONE:</div><div class="cols">${cards}</div>`));
    }
  }

  // ---------- DRIVERS (v1.1: stats cards, two seats, development roster, scouting) ----------
  let starCache = {};
  function starURL(kind) {
    if (starCache[kind]) return starCache[kind];
    const pat = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'];
    const c = document.createElement('canvas'); c.width = 9; c.height = 9; const x = c.getContext('2d');
    const fill = kind === 'on' ? '#ffd000' : kind === 'maybe' ? '#8c7a2a' : '#4a4a4a';
    pat.forEach((r, y) => [...r].forEach((ch, xx) => { if (ch === '#') { x.fillStyle = '#141414'; x.fillRect(xx, y, 3, 3); } }));
    pat.forEach((r, y) => [...r].forEach((ch, xx) => { if (ch === '#') { x.fillStyle = fill; x.fillRect(xx + 1, y + 1, 1, 1); } }));
    return (starCache[kind] = c.toDataURL());
  }
  // lo..hi stars: lo solid, up to hi dim, rest empty. null = unknown
  function stars(lo, hi, size) {
    size = size || 13; let h = '<span class="stars">';
    for (let i = 1; i <= 5; i++) { const k = lo === null ? 'off' : i <= lo ? 'on' : i <= hi ? 'maybe' : 'off'; h += `<img class="pix" src="${starURL(k)}" style="width:${size}px;height:${size}px" alt="">`; }
    return h + (lo === null ? '<b class="tiny" style="margin-left:3px">?</b>' : '') + '</span>';
  }
  const statColor = v => v >= 70 ? '#2ecc40' : v >= 50 ? '#ffd000' : '#ff851b';
  function pbar(lo, hi, col) {
    return `<div class="pbar"><i style="width:${U.clamp(lo, 0, 100)}%;--c:${col}"></i>${hi > lo ? `<u style="left:${lo}%;width:${U.clamp(hi - lo, 0, 100 - lo)}%"></u>` : ''}</div>`;
  }
  function statRows(d, view) {
    return DATA.DRIVER_STATS.map(([k, label]) => {
      const r = view ? view.stats[k] : [d[k], d[k]]; const mid = (r[0] + r[1]) / 2;
      const col = k === 'aggr' ? '#ff6b3d' : statColor(mid);
      return `<div class="dstat"><span>${label}</span>${pbar(r[0], r[1], col)}<span>${r[0] === r[1] ? r[0] : r[0] + '-' + r[1]}</span></div>`;
    }).join('');
  }
  const seatName = (dest) => { const s = S(); return dest === 'car1' ? 'CAR 1 #' + s.team.number : dest === 'car2' ? 'CAR 2 #' + (s.team.car2 ? s.team.car2.number : '') : 'DEVELOPMENT'; };
  // one driver card. opts.view = prospect ranges; opts.seat = where they sit on your team; opts.foot = extra html
  function driverCard(d, opts) {
    opts = opts || {}; const v = opts.view;
    const o = v ? v.ovr : [Game.ovr(d), Game.ovr(d)];
    const potHtml = v ? (v.pot ? stars(v.pot[0], v.pot[1]) : stars(null)) : stars(Game.potStars(d.potential), Game.potStars(d.potential));
    const meta = v ? `${U.esc(DATA.FEEDERS.find(f => f.id === d.pros.feeder).name)} · REPORTS ${d.pros.reports} · GONE IN ${d.pros.weeks} WK${d.pros.weeks > 1 ? 'S' : ''}`
      : `${U.money(d.salary)}/RACE · ${d.contract ? d.contract + ' YR' + (d.contract > 1 ? 'S' : '') + ' LEFT' : 'FREE AGENT'}`;
    return `<div class="panel dcard ${opts.color || ''}">${opts.seat ? `<div class="tiny seat">${opts.seat}</div>` : ''}
      <div class="row" style="flex-wrap:nowrap"><div class="ovr" style="${o[0] !== o[1] ? 'font-size:12px;min-width:54px' : ''}">${o[0] === o[1] ? o[0] : o[0] + '-' + o[1]}</div>
        <div class="grow" style="min-width:0"><div class="ol1 nm1">${U.esc(Game.driverName(d))}</div><div class="tiny">AGE ${d.age}${d.rookie ? ' · ROOKIE' : ''}${d.scouted ? ' · SCOUTED' : ''} · POT ${potHtml}${v && v.potExact ? ' ' + v.potExact : ''}</div></div></div>
      <div class="dstats">${statRows(d, v)}</div>
      ${v ? '' : `<div class="dstat"><span>MORALE</span>${pbar(d.morale, d.morale, d.morale >= 60 ? '#2f8cff' : '#ff4136')}<span>${Math.round(d.morale)}</span></div>`}
      <div class="tiny" style="margin-top:3px">${meta}</div>${opts.foot || ''}</div>`;
  }
  function seatActions(d) {
    const s = S(); const slot = Game.slotOf(d.id); const btns = [];
    const mv = (dest, label) => btns.push(`<button class="btn blue" style="flex:1" data-act="assign" data-arg="${d.id}|${dest}">${label}</button>`);
    if (slot !== 'car1') mv('car1', (s.team.driverId ? 'SWAP' : 'TO') + ' #' + s.team.number);
    if (s.team.car2 && slot !== 'car2') mv('car2', (s.team.car2.driverId ? 'SWAP' : 'TO') + ' #' + s.team.car2.number);
    if (slot !== 'dev' && (s.team.dev || []).length < DATA.DEV_MAX) mv('dev', 'TO DEV');
    btns.push(`<button class="btn red" style="flex:1" data-act="fireAsk" data-arg="${d.id}">RELEASE</button>`);
    return `<div class="row seatbtns">${btns.join('')}</div>`;
  }
  function emptySeat(title, text) {
    return `<div class="panel dcard empty"><div class="tiny seat">${title}</div><div class="big ol" style="margin:10px 0">EMPTY</div><div class="small" style="line-height:1.5">${text}</div>
      <div class="row" style="margin-top:8px"><button class="btn green" style="flex:1" data-act="drvTab" data-arg="market">MARKET</button><button class="btn orange" style="flex:1" data-act="drvTab" data-arg="scout">SCOUTING</button></div></div>`;
  }
  function drivers() {
    ui.screen = 'drivers'; const s = S(); const tab = ui.drvTab || 'team';
    const pros = Game.prospects();
    const tabs = [['team', 'MY TEAM'], ['market', 'MARKET'], ['scout', 'SCOUTING' + (pros.length ? ' (' + pros.length + ')' : '')]].map(([t, l]) => `<button class="btn ${tab === t ? 'orange sel' : 'dark'}" data-act="drvTab" data-arg="${t}">${l}</button>`).join('');
    let body = '';
    if (tab === 'team') {
      const cards = [];
      const d1 = Game.carDriver(1);
      cards.push(d1 ? driverCard(d1, { seat: 'CAR 1 · #' + s.team.number, color: 'blue', foot: seatActions(d1) }) : emptySeat('CAR 1 · #' + s.team.number, 'YOU CAN\'T RACE WITHOUT A DRIVER. HIRE FROM THE MARKET OR SIGN A SCOUTED PROSPECT.'));
      if (s.team.car2) { const d2 = Game.carDriver(2); cards.push(d2 ? driverCard(d2, { seat: 'CAR 2 · #' + s.team.car2.number, color: 'teal', foot: seatActions(d2) }) : emptySeat('CAR 2 · #' + s.team.car2.number, 'YOUR 2ND CAR SITS OUT UNTIL IT HAS A DRIVER.')); }
      for (const id of s.team.dev || []) { const d = s.drivers[id]; if (d) cards.push(driverCard(d, { seat: 'DEVELOPMENT DRIVER', foot: seatActions(d) })); }
      if ((s.team.dev || []).length < DATA.DEV_MAX) cards.push(`<div class="panel dcard empty"><div class="tiny seat">DEVELOPMENT SPOT</div><div class="small" style="line-height:1.55;margin-top:8px">SIGN A SCOUTED PROSPECT TO GROW ON THE SIDE (SIMULATOR LEVEL HELPS). THEY ONLY COST THEIR SMALL SALARY.</div><button class="btn orange wide" style="margin-top:8px" data-act="drvTab" data-arg="scout">FIND PROSPECTS</button></div>`);
      body = `<div class="hscroll">${cards.join('')}</div><div class="small ol" style="margin-top:4px">REP ${Math.round(s.rep)} · BUDGET ${U.money(s.money)} · SIMULATOR LV ${s.team.fac.simulator}: +${(s.team.fac.simulator * 0.8).toFixed(1)} ON RACE DAY</div>`;
    } else if (tab === 'market') {
      const fas = s.freeAgents.map(id => s.drivers[id]).filter(Boolean).sort((a, b) => Game.ovr(b) - Game.ovr(a));
      body = `<div class="small ol" style="margin-bottom:6px">DRIVER MARKET · ${fas.length} FREE AGENTS · TAP FOR STATS</div>` + fas.map(f => { const rep = Game.minRepFor(f); const ok = s.rep >= rep; return `<div class="list-row" data-act="driverInfo" data-arg="${f.id}"><div class="ovr" style="${ok ? '' : 'background:#999'}">${Game.ovr(f)}</div>
        <div class="grow">${U.esc(Game.driverName(f))}<div class="tiny">${f.rookie ? 'ROOKIE · ' : ''}AGE ${f.age} · SPD ${f.speed} · CON ${f.cons} · CRF ${f.craft}${ok ? '' : ' · NEEDS REP ' + rep}</div></div>${stars(Game.potStars(f.potential), Game.potStars(f.potential), 11)}<div class="small" style="min-width:64px;text-align:right">${U.moneyShort(Game.hireCost(f, 2))}<span class="tiny">/RACE</span></div></div>`; }).join('');
    } else body = scoutTab();
    render(page('DRIVERS', `<div class="row" style="margin-bottom:8px">${tabs}</div>${body}`));
  }
  function scoutTab() {
    const s = S(); const sc = ui.scoutSel || (ui.scoutSel = { tier: 'local', feeder: 'karting' });
    const busy = Game.scoutBusy(); const cost = Game.scoutCost(sc.tier);
    const tierBtns = DATA.SCOUTS.map(t => `<button class="btn ${sc.tier === t.id ? 'blue sel' : 'dark'}" style="flex:1;flex-direction:column;gap:2px" data-act="scoutTier" data-arg="${t.id}">${t.name.split(' ')[0]}<small class="tiny">${U.moneyShort(Game.scoutCost(t.id))}</small></button>`).join('');
    const fBtns = DATA.FEEDERS.map(f => `<button class="btn ${sc.feeder === f.id ? 'orange sel' : 'dark'}" style="flex:1 1 45%;font-size:11px" data-act="scoutFeeder" data-arg="${f.id}">${f.name}</button>`).join('');
    const tier = DATA.SCOUTS.find(t => t.id === sc.tier), feeder = DATA.FEEDERS.find(f => f.id === sc.feeder);
    const pros = Game.prospects();
    const list = pros.length ? pros.map(d => { const v = Game.prospectView(d); return `<div class="list-row" data-act="prospect" data-arg="${d.id}"><div class="ovr" style="font-size:12px;min-width:54px">${v.ovr[0] === v.ovr[1] ? v.ovr[0] : v.ovr[0] + '-' + v.ovr[1]}</div>
        <div class="grow">${U.esc(Game.driverName(d))}<div class="tiny">AGE ${d.age} · ${DATA.FEEDERS.find(f => f.id === d.pros.feeder).name} · INTEL ${Math.round(v.k * 100)}% · ${d.pros.weeks} WK LEFT</div></div>${v.pot ? stars(v.pot[0], v.pot[1], 11) : stars(null, null, 11)}</div>`; }).join('')
      : '<div class="panel small" style="line-height:1.5">NO PROSPECTS YET. SEND A SCOUT TO A FEEDER SERIES. KIDS SHOW UP AS RANGES - SCOUT THEM AGAIN TO NARROW THEM DOWN AND REVEAL THEIR HIDDEN POTENTIAL.</div>';
    return `<div class="cols"><div class="col narrow"><div class="panel"><h3>SEND A SCOUT</h3><div class="row" style="gap:5px">${tierBtns}</div>
      <div class="tiny" style="margin:5px 0;line-height:1.4">${tier.desc} FINDS ${tier.n}. INTEL ${Math.round((tier.acc + Game.scoutBonus()) * 100)}%${Game.scoutBonus() > 0 ? ' (INCL. SIMULATOR +' + Math.round(Game.scoutBonus() * 100) + '%)' : ''}.</div>
      <div class="row" style="gap:5px">${fBtns}</div><div class="tiny" style="margin:5px 0">${feeder.name}: ${feeder.desc}</div>
      <button class="btn ${busy || s.money < cost ? 'grey' : 'green'} wide" data-act="sendScout">${busy ? 'SCOUT IS OUT - BACK AFTER THE RACE' : 'SEND FOR ' + U.money(cost)}</button></div></div>
      <div class="col"><div class="small ol">PROSPECTS (TAP FOR THE REPORT)</div>${list}</div></div>`;
  }
  function prospectModal(id) {
    const s = S(); const d = s.drivers[id]; if (!d || !d.pros) return drivers();
    const v = Game.prospectView(d); const fc = Game.followCost();
    const seat = (dest) => { const open = Game.slotOpen(dest); return `<button class="btn ${open ? 'green' : 'grey'}" style="flex:1" data-act="signProspect" data-arg="${id}|${dest}">${dest === 'dev' ? 'DEV ROSTER' : seatName(dest)}</button>`; };
    modal(`<div class="row" style="justify-content:space-between"><b class="ol1">SCOUT REPORT</b><button class="btn grey" data-act="closeModal">X</button></div>
      <div class="cols" style="margin-top:6px"><div class="col">${driverCard(d, { view: v })}</div>
      <div class="col"><div class="panel light small" style="line-height:1.55">INTEL: ${Math.round(v.k * 100)}%${v.k < 0.4 ? '<br>POTENTIAL: UNKNOWN - SCOUT AGAIN.' : v.k < 0.75 ? '<br>POTENTIAL: A ROUGH GUESS (DIM STARS).' : '<br>POTENTIAL: CONFIRMED.'}<br>CONTRACT IF SIGNED: 3 YRS AT ${U.money(Game.prospectSalary(d))}/RACE, NO BONUS.</div>
        <button class="btn ${v.k >= 0.99 ? 'grey' : 'blue'} wide" style="margin:6px 0" data-act="scoutAgain" data-arg="${id}">${v.k >= 0.99 ? 'FULLY SCOUTED' : 'SCOUT AGAIN ' + U.money(fc)}</button>
        <div class="small ol">SIGN TO:</div><div class="row" style="gap:5px;margin-top:4px">${seat('car1')}${s.team.car2 ? seat('car2') : ''}${seat('dev')}</div></div></div>`);
  }
  function driverInfo(id) {
    const s = S(); const d = s.drivers[id]; if (!d) return;
    const rep = Game.minRepFor(d); const ok = s.rep >= rep;
    const y = ui.hireYears || 2;
    const yrs = [1, 2, 3].map(k => `<button class="btn ${y === k ? 'orange sel' : 'dark'}" style="flex:1;flex-direction:column" data-act="hireYears" data-arg="${id}|${k}">${k} YR<small class="tiny">${U.moneyShort(Game.hireCost(d, k))}/RACE</small></button>`).join('');
    const seat = (dest) => { const open = Game.slotOpen(dest) && ok; return `<button class="btn ${open ? 'green' : 'grey'}" style="flex:1" data-act="hire" data-arg="${id}|${y}|${dest}">${dest === 'dev' ? 'DEV ROSTER' : seatName(dest)}</button>`; };
    const bonus = Game.signingBonus(d, y);
    modal(`<div class="row" style="justify-content:space-between"><b class="ol1">FREE AGENT</b><button class="btn grey" data-act="closeModal">X</button></div>
      <div class="cols" style="margin-top:6px"><div class="col">${driverCard(d)}</div>
      <div class="col"><div class="panel light small" style="line-height:1.5">${ok ? 'INTERESTED IN YOUR TEAM.' : 'NOT INTERESTED YET - NEEDS TEAM REP ' + rep + ' (YOU: ' + Math.round(s.rep) + ').'}<br>SIGNING BONUS: ${bonus ? U.money(bonus) + ' (2 RACES OF SALARY)' : 'NONE - ROOKIE DEAL'}.</div>
        <div class="small ol" style="margin-top:6px">CONTRACT LENGTH</div><div class="row" style="gap:5px;margin-top:4px">${yrs}</div>
        <div class="small ol" style="margin-top:6px">SIGN TO:</div><div class="row" style="gap:5px;margin-top:4px">${seat('car1')}${s.team.car2 ? seat('car2') : ''}${seat('dev')}</div></div></div>`);
  }
  // ---------- GARAGE ----------
  function garage() {
    ui.screen = 'garage'; const s = S();
    if (!Game.hasCar()) {
      const f = Game.ser().floor;
      const cards = DATA.USED_CARS.map(c => { const r = Math.round((3 * f + c.parts.engine + c.parts.aero + c.parts.chassis) / 3); const ok = s.money >= c.price;
        return `<div class="panel col" style="text-align:center">${Art.carImg({ body: c.livery.body, stripe: c.livery.stripe, num: '#141414' }, s.team.number, 4)}
          <div class="ol1" style="margin-top:6px">${c.name}</div><div class="row" style="justify-content:center;margin:4px 0"><span class="ovr">${r}</span><span class="small">CAR RATING</span></div>
          <div class="tiny" style="line-height:1.4;min-height:28px">${c.desc}</div><div class="small" style="margin:4px 0">LEAVES ${U.money(s.money - c.price)}</div>
          <button class="btn ${ok ? 'green' : 'grey'} wide" data-act="buyCar" data-arg="${c.id}">BUY ${U.money(c.price)}</button></div>`; }).join('');
      return render(page('GARAGE', `<div class="panel orange" style="margin-bottom:10px"><div class="small ol1" style="line-height:1.5">THE SHOP IS EMPTY. BUY A CHEAP USED CAR TO GO RACING (YOUR PAINT GOES ON IT). KEEP SOME CASH FOR A DRIVER - ROOKIES SIGN WITH NO BONUS. FIELD AVERAGE CAR: ${Math.round(Game.fieldAvgCar())}.</div></div><div class="cols">${cards}</div>`));
    } const sr = Game.ser(); const fa = Game.fieldAvgCar(); const best = Math.max(...s.ai.map(t => t.car));
    const parts = ['engine', 'aero', 'chassis'].map(p => {
      const v = s.team.parts[p]; const rnd = s.team.rnd.find(r => r.part === p); const c = Game.rndCost(p);
      const eff = Game.effParts()[p];
      return `<div class="panel"><div class="row"><h3 class="grow" style="margin:0">${DATA.PARTS[p].name}</h3><span class="big ol">${Math.round(eff)}</span></div>
        <div class="tiny" style="margin:3px 0 5px">${DATA.PARTS[p].desc}</div>${bar(eff, 100, '#2ecc40', fa)}<div class="tiny" style="margin-top:3px">YELLOW MARK = FIELD AVERAGE (${Math.round(fa)})${p === 'engine' ? ' · INCL. ENGINE DEPT +' + (s.team.fac.engineDept * 1.5).toFixed(1) : ''}</div>
        ${rnd ? `<div class="small" style="margin-top:6px">IN R&D: ${rnd.days} DAY${rnd.days > 1 ? 'S' : ''} LEFT (+${rnd.gain.toFixed(1)})</div>${bar(rnd.total - rnd.days, rnd.total, '#2f8cff')}`
          : `<button class="btn ${s.money >= c.money && s.ep >= c.ep ? 'green' : 'grey'} wide" style="margin-top:8px" data-act="rnd" data-arg="${p}">UPGRADE +${c.gain.toFixed(1)} · ${U.moneyShort(c.money)} + ${c.ep} EP · ${c.days} DAYS</button>`}</div>`;
    }).join('');
    const tr = ['short', 'intermediate', 'superspeedway', 'road'].map(t => `<tr><td>${DATA.TYPES[t].name}</td><td>${Math.round(Game.carRating(t))}</td></tr>`).join('');
    render(page('GARAGE', `<div class="cols"><div class="col narrow"><div class="panel" style="text-align:center">${Art.carImg(Game.myLivery(), s.team.number, 5)}
      <div class="row" style="justify-content:center;margin-top:6px"><span class="ovr">${Game.carOverall()}</span><span class="small">CAR RATING · RANK ${Game.carRank()}/${sr.cars}<br>FIELD AVG ${Math.round(fa)} · BEST ${Math.round(best)}</span></div></div>
      ${car2Panel()}
      <div class="panel"><table class="tbl"><tr><th>TRACK TYPE</th><th>RATING</th></tr>${tr}</table></div>
      <div class="panel small" style="line-height:1.5">ENGINEERING POINTS: ${Math.floor(s.ep)} (+${Game.epPerWeek()}/WEEK FROM SHOP & ENGINE DEPT). R&D TIME SHRINKS WITH SHOP LEVEL. DAYS PASS ON RACE WEEKS (7 PER RACE).</div></div>
      <div class="col">${parts}</div></div>`));
  }
  function car2Panel() {
    const s = S(); const st = Game.car2Status();
    if (st.owned) {
      const c2 = s.team.car2; const d2 = Game.carDriver(2);
      return `<div class="panel teal"><h3 class="ol1">SECOND CAR</h3><div class="row">${Art.carImg(Game.carLivery(2), c2.number, 3)}<div class="small ol1" style="line-height:1.5">#${c2.number} · SAME PARTS AS CAR 1<br>DRIVER: ${U.esc(d2 ? Game.driverShort(d2) : 'NONE!')}</div></div>
        <div class="tiny ol1" style="margin:5px 0">EXTRA COSTS: ${U.money(st.run)}/RACE TRAVEL & CREW + DRIVER PAY + CRASH REPAIRS.</div>
        <button class="btn red wide" data-act="sellCar2Ask">SELL CAR 2 (GET ${U.moneyShort(Math.round(st.price * 0.4))})</button></div>`;
    }
    const ck = (ok, t) => `<div class="small" style="color:${ok ? '#7dff7d' : '#ff8a8a'}">${ok ? '[X]' : '[ ]'} ${t}</div>`;
    return `<div class="panel"><h3>RUN A SECOND CAR</h3><div class="tiny" style="line-height:1.45;margin-bottom:4px">A 2ND ENTRY WITH ITS OWN DRIVER, PRIMARY SPONSOR AND PRIZE MONEY. IT ALSO COSTS ${U.money(st.run)}/RACE IN TRAVEL & CREW, PLUS DRIVER PAY AND REPAIRS.</div>
      ${ck(st.repOk, 'TEAM REP ' + st.rep + ' (YOU: ' + Math.round(s.rep) + ')')}${ck(st.cashOk, 'CHASSIS ' + U.money(st.price) + ' (YOU: ' + U.money(s.money) + ')')}
      <button class="btn ${st.ok ? 'green' : 'grey'} wide" style="margin-top:6px" data-act="buyCar2">BUY 2ND CAR ${U.moneyShort(st.price)}</button></div>`;
  }
  // ---------- FACILITIES ----------
  const facEffect = (k, l) => ({
    shop: `R&D ${Math.max(3, Math.round(10 - l * 1.5))} DAYS · +${(l * 0.6).toFixed(1)} PART GAIN · +${l * 2} EP/WK`,
    engineDept: `+${(l * 1.5).toFixed(1)} ENGINE · RELIABILITY ${55 + l * 7}`,
    simulator: `+${(l * 0.8).toFixed(1)} DRIVER ON RACE DAY · GROWTH · SCOUT INTEL +${(l - 1) * 6}%`,
    pitCenter: `PIT CREW ${Math.round((0.35 + l * 0.12) * 100)}% · FEWER MISTAKES`,
  })[k];
  function facilities() {
    ui.screen = 'facilities'; const s = S();
    const cards = Object.keys(DATA.FACILITIES).map(k => {
      const l = s.team.fac[k]; const b = s.team.builds.find(x => x.fac === k); const c = Game.facCost(k);
      return `<div class="panel col"><div class="row"><h3 class="grow" style="margin:0">${DATA.FACILITIES[k].name}</h3><span class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</span></div>
        <div class="tiny" style="margin:4px 0">${DATA.FACILITIES[k].desc}</div><div class="small" style="color:#ffd000">NOW: ${facEffect(k, l)}</div>
        ${c ? `<div class="tiny" style="margin-top:3px">LV ${l + 1}: ${facEffect(k, l + 1)}</div>` : ''}
        ${b ? `<div class="small" style="margin-top:6px">BUILDING LV ${l + 1}: ${b.days} DAYS LEFT</div>${bar(b.total - b.days, b.total, '#2f8cff')}`
          : c ? `<button class="btn ${s.money >= c.money ? 'green' : 'grey'} wide" style="margin-top:8px" data-act="build" data-arg="${k}">UPGRADE TO LV ${l + 1} · ${U.moneyShort(c.money)} · ${c.days} DAYS</button>` : '<div class="small" style="margin-top:8px">MAX LEVEL</div>'}</div>`;
    });
    render(page('FACILITIES', `<div class="cols">${cards[0]}${cards[1]}</div><div class="cols" style="margin-top:10px">${cards[2]}${cards[3]}</div>
      <div class="panel small" style="margin-top:10px">WEEKLY UPKEEP: ${U.money(Game.facUpkeep())} · FACILITIES CARRY OVER WHEN YOU MOVE UP A SERIES.</div>`));
  }
  // ---------- SPONSORS ----------
  function spCard(sp, slot, idx) {
    const s = S(); const two = !!s.team.car2;
    const title = slot === 'primary' ? (two ? 'PRIMARY · CAR 1 #' + s.team.number : 'PRIMARY (YOUR PAINT SCHEME)') : slot === 'primary2' ? 'PRIMARY · CAR 2 #' + s.team.car2.number : 'ASSOCIATE ' + (idx + 1) + (two ? ' (TEAM)' : '');
    if (!sp) return `<div class="panel col empty"><div class="small">${title}</div><div class="big ol" style="margin:10px 0">EMPTY</div><div class="tiny">SIGN AN OFFER BELOW.</div></div>`;
    return `<div class="panel col"><div class="small">${title}</div>
      <div style="margin:5px 0"><span class="sp-name ol1" style="background:${sp.colors[0]}">${U.esc(sp.name)}</span></div>
      <div class="small" style="line-height:1.5">${U.money(sp.perRace)}/RACE · ${sp.races} RACES LEFT<br><span style="color:#ffd000">${Game.goalText(sp.goal)}</span><br>GOALS MET ${sp.met}/${sp.done}</div>
      <button class="btn red wide" style="margin-top:6px" data-act="dropAsk" data-arg="${slot}|${idx}">DROP (FEE ${U.moneyShort(Game.dropPenalty(sp))})</button></div>`;
  }
  function sponsors() {
    ui.screen = 'sponsors'; const s = S(); const sp = s.team.sponsors;
    const offers = s.offers.map(o => `<div class="panel col" style="min-width:220px"><div class="row"><span class="sp-name ol1" style="background:${o.colors[0]};border-color:#1b1b1b">${U.esc(o.name)}</span>${o.renewal ? '<span class="tag">RENEWAL</span>' : ''}</div>
      <div class="small" style="line-height:1.55;margin-top:4px">${o.slot === 'primary' ? 'PRIMARY' : 'ASSOCIATE'} · ${o.races} RACES<br>${U.money(o.perRace)}/RACE + ${U.money(o.signing)} TO SIGN<br><span style="color:#ffd000">${Game.goalText(o.goal)}</span><br><span class="tiny">EXPIRES IN ${o.weeksLeft} WEEK${o.weeksLeft > 1 ? 'S' : ''}</span></div>
      ${o.slot === 'primary' ? `<div style="margin:4px 0">${Art.carImg({ body: o.colors[0], stripe: o.colors[1], num: '#141414' }, s.team.number, 2)}</div>` : ''}
      ${o.slot === 'primary' && s.team.car2 ? `<div class="row" style="gap:5px"><button class="btn ${sp.primary ? 'grey' : 'green'}" style="flex:1" data-act="sign" data-arg="${o.id}|1">ON #${s.team.number}</button><button class="btn ${s.team.car2.primary ? 'grey' : 'green'}" style="flex:1" data-act="sign" data-arg="${o.id}|2">ON #${s.team.car2.number}</button></div>`
        : `<button class="btn green wide" data-act="sign" data-arg="${o.id}">SIGN</button>`}</div>`).join('');
    render(page('SPONSORS', `<div class="cols">${spCard(sp.primary, 'primary', 0)}${s.team.car2 ? spCard(s.team.car2.primary, 'primary2', 0) : ''}${spCard(sp.assoc[0], 'assoc', 0)}${spCard(sp.assoc[1], 'assoc', 1)}</div>
      <div class="small ol" style="margin:10px 0 6px">OFFERS (BETTER REP = BIGGER DEALS · NEW OFFERS EVERY WEEK)</div><div class="hscroll">${offers || sponsorEmpty()}</div>`));
  }
  function sponsorEmpty() {
    const s = S(); const si = Game.sponsorInterest(); const st = s.stats;
    if (si.slots === 0) return `<div class="panel red" style="max-width:520px"><div class="ol1">NO SPONSOR WANTS YOU... YET.</div><div class="small ol1" style="line-height:1.55;margin-top:6px">LOCAL BUSINESSES CALL ONCE YOU SHOW SPEED: ONE TOP-10, OR TWO TOP-15 FINISHES.<br>SO FAR: ${st.top10 || 0} TOP-10 · ${st.top15 || 0} TOP-15. UNTIL THEN, PRIZE MONEY PAYS THE BILLS.</div></div>`;
    return '<div class="panel">NO NEW OFFERS THIS WEEK. MORE COME WITH BETTER RESULTS AND REPUTATION.</div>';
  }
  // ---------- CALENDAR ----------
  function calendar() {
    ui.screen = 'calendar'; const s = S();
    const cards = s.schedule.map((tid, i) => {
      const t = DATA.TRACKS[tid]; const res = s.results[i]; const mine = res ? res.order.filter(o => o.id === 'P' || o.id === 'P2') : [];
      const next = !s.seasonOver && i === s.week - 1;
      return `<div class="panel cal-card ${next ? 'red' : ''}"><div class="row"><span class="tag">R${i + 1}</span>${next ? '<span class="tag" style="background:#ffd000;color:#1b1b1b">NEXT</span>' : ''}${mine.map(me => `<span class="tag" style="background:${me.id === 'P2' ? '#0f8aa0' : '#2e9b3a'}">P${me.pos}</span>`).join('')}</div>
        <img class="pix" src="${previewURL(tid, 140, 84)}" style="width:128px;height:76px;margin:6px 0;border:2px solid #1b1b1b" alt="">
        <div class="small ol1">${t.short}</div>${DATA.eventName(s.seriesIdx, i + 1) ? `<div class="tiny neon">${DATA.eventName(s.seriesIdx, i + 1)}</div>` : ''}<div class="tiny">${t.miles} MI · ${DATA.bankWord(t.bank)}</div><div class="tiny">${DATA.TYPES[t.type].name} · ${DATA.TYPES[t.type].laps} LAPS</div><div class="tiny">${t.city.toUpperCase()}</div></div>`;
    }).join('');
    render(page('CALENDAR', `<div class="small ol" style="margin-bottom:6px">${s.year} ${Game.ser().name} - 10 RACES, 3 STAGES EACH. STAGE TOP 10 SCORE 10-1 POINTS.${s.seriesIdx === 3 ? ' TOP 8 MAKE THE PLAYOFFS AFTER RACE 7; CHAMPIONSHIP 4 AFTER RACE 9.' : ''}</div><div class="hscroll">${cards}</div>`));
  }
  // ---------- STANDINGS ----------
  function standings() {
    ui.screen = 'standings'; const s = S(); const tab = ui.standTab;
    const tabs = ['points', 'owners', 'last', 'history'].map(t => `<button class="btn ${tab === t ? 'orange sel' : 'dark'}" data-act="standTab" data-arg="${t}">${({ points: 'DRIVERS', owners: 'OWNERS', last: 'LAST RACE', history: 'HISTORY' })[t]}</button>`).join('');
    let body = '';
    if (tab === 'points') {
      const ord = Game.standingsOrder(); const leader = s.standings[ord[0]].pts;
      body = `<table class="tbl"><tr><th>POS</th><th>#</th><th>DRIVER</th><th>TEAM</th><th>PTS</th><th>GAP</th><th>W</th><th>T5</th><th>DNF</th></tr>${ord.map((id, i) => {
        const e = Game.entryInfo(id), st = s.standings[id]; const po = s.playoff && s.playoff.ids.includes(id);
        return `<tr class="${id === 'P' ? 'me' : id === 'P2' ? 'me me2' : ''} ${po ? 'po' : ''}"><td>${i + 1}${s.playoff && s.playoff.final4 && s.playoff.final4.includes(id) ? '*' : ''}</td><td><span class="tag" style="background:${e.livery.body}">${e.number}</span></td><td>${U.esc(e.driver)}</td><td class="tiny">${U.esc(e.team)}</td><td>${st.pts}</td><td>${i ? '-' + (leader - st.pts) : '--'}</td><td>${st.wins}</td><td>${st.top5}</td><td>${st.dnf}</td></tr>`;
      }).join('')}</table>${s.playoff ? '<div class="tiny" style="margin-top:6px">YELLOW EDGE = PLAYOFF DRIVER · * = CHAMPIONSHIP 4</div>' : ''}`;
    } else if (tab === 'owners') {
      const rows = Game.ownerStandings(); const lead = rows[0].pts;
      body = `<div class="tiny" style="padding:4px">OWNER POINTS: EVERY CAR A TEAM RUNS ADDS UP.${s.team.car2 ? ' YOUR TWO CARS COUNT TOGETHER.' : ' RUN A 2ND CAR TO DOUBLE UP.'}</div><table class="tbl"><tr><th>POS</th><th>#</th><th>TEAM</th><th>CARS</th><th>PTS</th><th>GAP</th><th>W</th></tr>${rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td><span class="tag" style="background:${r.livery.body}">${r.number}</span></td><td>${U.esc(r.name)}</td><td>${r.me ? Game.teamCars().length : 1}</td><td>${r.pts}</td><td>${i ? '-' + (lead - r.pts) : '--'}</td><td>${r.wins}</td></tr>`).join('')}</table>`;
    } else if (tab === 'last') {
      const r = s.results[s.results.length - 1];
      body = r ? resultsTable(r) : '<div class="panel">NO RACES RUN YET THIS SEASON.</div>';
    } else {
      body = s.history.length ? `<table class="tbl"><tr><th>YEAR</th><th>SERIES</th><th>TEAM</th><th>POS</th><th>PTS</th><th>WINS</th></tr>${s.history.map(h => `<tr><td>${h.year}</td><td>${h.series}</td><td>${U.esc(h.team)}</td><td>${U.ordinal(h.pos)}</td><td>${h.pts}</td><td>${h.wins}</td></tr>`).join('')}</table>` : '<div class="panel">FINISH A SEASON TO BUILD YOUR HISTORY.</div>';
    }
    render(page('STANDINGS', `<div class="row" style="margin-bottom:8px">${tabs}</div><div class="panel" style="padding:4px">${body}</div>`));
  }
  function resultsTable(r) {
    return `<div class="tiny" style="padding:4px">${DATA.TRACKS[r.track].name} · ${r.cautions} CAUTIONS</div><table class="tbl"><tr><th>POS</th><th>#</th><th>DRIVER</th><th>ST</th><th>LAPS</th><th>LED</th><th>STATUS</th><th>PTS</th></tr>${r.order.map(o => {
      const e = Game.entryInfo(o.id); return `<tr class="${o.id === 'P' ? 'me' : o.id === 'P2' ? 'me me2' : ''}"><td>${o.pos}</td><td><span class="tag" style="background:${e.livery.body}">${e.number}</span></td><td>${U.esc(e.driver)}</td><td>${o.grid || '-'}</td><td>${o.laps}</td><td>${o.lapsLed}</td><td>${o.status}</td><td>${o.pts || 0}</td></tr>`;
    }).join('')}</table>`;
  }
  // ---------- NEWS ----------
  function newsScreen() {
    ui.screen = 'news'; const s = S();
    render(page('NEWS', s.news.map((n, i) => `<div class="panel ${i === 0 ? 'red' : ''}" style="margin-bottom:6px"><span class="tag">S${n.s} W${n.w}</span> <span class="small ol1">${U.esc(n.text)}</span></div>`).join('') || '<div class="panel">NO NEWS.</div>'));
  }
  // ---------- PODIUM (v1.1) ----------
  function podiumTop(ids, extra) {
    return ids.slice(0, 3).map(id => { const e = Game.entryInfo(id); return { livery: e.livery, number: e.number, driver: e.driverShort, isPlayer: e.isPlayer, slot: e.slot, sub: extra ? extra(id) : '' }; });
  }
  function podium(kind) {
    const s = S(); ui.screen = 'podium'; ui.podKind = kind;
    let o;
    if (kind === 'champ') {
      const ord = Game.standingsOrder(); const c = Game.entryInfo(ord[0]); const mine = c.isPlayer;
      o = { champ: true, top: podiumTop(ord), title: s.year + ' ' + Game.ser().short + ' CHAMPION', sub: (mine ? 'YOUR TEAM! ' : '') + '#' + c.number + ' ' + c.driver.toUpperCase() };
      s.champShown = s.season; Game.save();
    } else {
      const r = s.results[s.results.length - 1]; const ids = r.order.map(x => x.id); const w = Game.entryInfo(ids[0]);
      const top = podiumTop(ids); const mine = top.some(e => e.isPlayer);
      o = { top, title: w.isPlayer ? 'VICTORY LANE!' : mine ? 'YOUR TEAM ON THE PODIUM!' : DATA.TRACKS[r.track].short + ' PODIUM', sub: '#' + w.number + ' ' + w.driver.toUpperCase() + ' WINS AT ' + DATA.TRACKS[r.track].short };
    }
    const nt = kind !== 'champ' && ui.summary && ui.summary.trophies && ui.summary.trophies.length ? ui.summary.trophies : [];
    render(`<div class="screen podium-screen" data-act="podiumNext"><canvas id="pod" class="pix"></canvas>
      ${nt.length ? `<div class="pod-trophies">${nt.slice(0, 4).map(e => `<span class="tag" style="background:#ffd000;color:#1b1b1b">TROPHY: ${U.esc(Game.trophyName(e.k))}</span>`).join('')}</div>` : ''}
      <button class="btn green pod-go" data-act="podiumNext">${T(kind === 'champ' ? 'SEASON WRAP-UP >' : 'RESULTS >', 2)}</button></div>`);
    const sc = new Podium.Scene($('#pod'), o); ui.pod = sc; let last = performance.now();
    const loop = (ts) => { if (ui.pod !== sc || ui.screen !== 'podium') return; const dt = Math.min(0.05, (ts - last) / 1000); last = ts; sc.step(dt); sc.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // ---------- TROPHY CABINET (v1.1) ----------
  function trophyCatalog() {
    const tracks = Object.keys(DATA.TRACKS);
    const sec = [];
    sec.push({ id: 'wins', title: 'RACE WINS', items: tracks.map(t => ({ key: 'win:' + t, name: DATA.TRACKS[t].short, kind: 'cup', metal: 'gold', how: 'WIN A RACE AT ' + DATA.TRACKS[t].name + '.' })) });
    sec.push({ id: 'pods', title: 'PODIUMS', items: tracks.map(t => ({ key: 'pod:' + t, name: DATA.TRACKS[t].short, kind: 'medal', metal: 'bronze', how: 'FINISH TOP 3 AT ' + DATA.TRACKS[t].name + '.' })) });
    sec.push({ id: 'titles', title: 'CHAMPIONSHIPS', items: DATA.SERIES.map((x, i) => ({ key: 'title:' + i, name: x.short, kind: 'big', metal: i === 3 ? 'gold' : i === 0 ? 'bronze' : 'silver', how: 'WIN THE ' + x.name + ' CHAMPIONSHIP.' })) });
    sec.push({ id: 'cup', title: 'CUP PLAYOFFS', items: DATA.CUP_TROPHIES.map(m => ({ key: m[0], name: m[1], kind: m[2], metal: m[3], how: m[4] })) });
    sec.push({ id: 'promo', title: 'PROMOTIONS', items: [1, 2, 3].map(i => ({ key: 'promo:' + i, name: DATA.SERIES[i].short, kind: 'flag', metal: 'gold', how: 'MOVE UP TO THE ' + DATA.SERIES[i].name + '.' })) });
    sec.push({ id: 'ms', title: 'MILESTONES', items: DATA.MILESTONES.map(m => ({ key: m[0], name: m[1], kind: m[2], metal: m[3], how: m[4] })) });
    return sec;
  }
  function trophyMetal(it) {
    if (!it.key.startsWith('pod:')) return it.metal;
    const best = Math.min(...S().trophies.log.filter(e => e.k === it.key).map(e => e.pos || 3)); return best === 1 ? 'gold' : best === 2 ? 'silver' : 'bronze';
  }
  function trophies() {
    ui.screen = 'trophies'; const s = S(); const log = s.trophies ? s.trophies.log : [];
    const cnt = {}; for (const e of log) cnt[e.k] = (cnt[e.k] || 0) + 1;
    const cat = trophyCatalog(); const total = cat.reduce((a, x) => a + x.items.length, 0); const got = cat.reduce((a, x) => a + x.items.filter(i => cnt[i.key]).length, 0);
    const shelf = (sc) => `<div class="cab-sec"><div class="cab-title ol1">${sc.title} <span class="tiny">${sc.items.filter(i => cnt[i.key]).length}/${sc.items.length}</span></div><div class="shelf">${sc.items.map(it => {
      const n = cnt[it.key] || 0; const t = Art.trophy(it.kind, 'gold'); const z = it.kind === 'big' ? 2 : 3;
      return `<button class="troph ${n ? '' : 'locked'}" data-act="trophy" data-arg="${it.key}"><img class="pix" src="${Art.trophyURL(it.kind, n ? trophyMetal(it) : it.metal, !n)}" style="width:${t.width * z}px;height:${t.height * z}px" alt="">${n > 1 ? `<b class="tcount">X${n}</b>` : ''}<span class="tname">${U.esc(n ? it.name : '???')}</span></button>`; }).join('')}</div></div>`;
    const wins = Object.keys(cnt).filter(k => k.startsWith('win:')).reduce((a, k) => a + cnt[k], 0), pods = Object.keys(cnt).filter(k => k.startsWith('pod:')).reduce((a, k) => a + cnt[k], 0), titles = Object.keys(cnt).filter(k => k.startsWith('title:')).reduce((a, k) => a + cnt[k], 0);
    if (s.trophies) { s.trophies.unseen = 0; Game.save(); }
    render(page('TROPHY CABINET', `<div class="cabinet"><div class="cab-head small ol1">${U.esc(s.team.name)} · ${got}/${total} UNLOCKED · ${wins} WINS · ${pods} PODIUMS · ${titles} TITLES${s.trophies && s.trophies.backfilled ? ' · OLDER RESULTS REBUILT FROM YOUR SAVE' : ''}</div>${cat.map(shelf).join('')}</div>`));
  }
  function trophyInfo(key) {
    const s = S(); const it = trophyCatalog().flatMap(x => x.items).find(i => i.key === key); if (!it) return;
    const evs = s.trophies.log.filter(e => e.k === key); const n = evs.length; const t = Art.trophy(it.kind, 'gold'); const z = it.kind === 'big' ? 3 : 4;
    const row = e => `<div class="list-row" style="min-height:36px;cursor:default"><span class="tag">S${e.s} · ${e.y}${e.w ? ' · R' + e.w : ''}</span><span class="grow small">${e.track ? U.esc(DATA.TRACKS[e.track].short) + ' · ' : ''}${e.num ? '#' + e.num + ' ' : ''}${U.esc(e.driver || '')}${e.pos ? ' · P' + e.pos : ''}${e.note ? ' · ' + U.esc(e.note) : ''}${e.backfill ? ' · FROM SAVE' : ''}</span></div>`;
    modal(`<div class="row" style="flex-wrap:nowrap"><img class="pix" src="${Art.trophyURL(it.kind, n ? trophyMetal(it) : it.metal, !n)}" style="width:${t.width * z}px;height:${t.height * z}px" alt="">
      <div class="grow"><div class="ol1" style="font-size:16px">${U.esc(Game.trophyName(key))}</div><div class="small" style="margin-top:4px;line-height:1.5">${n ? 'EARNED ' + n + ' TIME' + (n > 1 ? 'S' : '') + '.' : 'LOCKED. HOW TO EARN IT:'}<br><span style="color:#ffd000">${U.esc(it.how)}</span></div></div><button class="btn grey" data-act="closeModal">X</button></div>
      ${n ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">${evs.slice(-6).reverse().map(row).join('')}${n > 6 ? `<div class="tiny">+${n - 6} MORE</div>` : ''}</div>` : ''}`);
  }
  // ---------- UPDATE LOG ----------
  const SEEN_KEY = 'scm_seen_version';
  function seenVersion() { try { return localStorage.getItem(SEEN_KEY); } catch (e) { return DATA.VERSION; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, DATA.VERSION); } catch (e) {} }
  function updates() {
    ui.screen = 'updates'; markSeen();
    const cards = DATA.CHANGELOG.map((v, i) => `<div class="panel ${i === 0 ? 'red' : ''}" style="margin-bottom:8px"><div class="row"><span class="tag" style="background:#ffd000;color:#1b1b1b;font-size:13px;padding:4px 8px">V${v.v}</span><b class="ol1">${v.title}</b><span class="spacer"></span><span class="tiny ol1">${v.date}</span></div>
      <ul class="clog">${v.items.map(t => `<li class="small ol1">${U.esc(t)}</li>`).join('')}</ul></div>`).join('');
    render(page('UPDATE LOG', cards));
  }
  // shown once after updating, for players who already had a career
  function whatsNew() {
    const v = DATA.CHANGELOG[0];
    modal(`<div class="row"><span class="tag" style="background:#ffd000;color:#1b1b1b;font-size:13px;padding:4px 8px">NEW IN V${v.v}</span><b class="ol1 grow">${v.title}</b></div>
      <ul class="clog">${v.items.slice(0, 5).map(t => `<li class="small">${U.esc(t)}</li>`).join('')}</ul>
      <div class="row" style="justify-content:flex-end"><button class="btn blue" data-act="go" data-arg="updates">FULL LOG</button><button class="btn green" data-act="seenClose">LET'S RACE</button></div>`);
  }
  // ---------- PROFILE / SAVE ----------
  function profile() {
    ui.screen = 'profile'; const s = S();
    render(page('PROFILE & SAVE', `<div class="cols"><div class="col">
      ${s ? `<div class="panel"><div class="small">MANAGER NAME</div><div class="row"><input id="pf-name" class="txt" style="flex:1" maxlength="14" value="${U.esc(s.profile)}"><button class="btn green" data-act="rename">SAVE</button></div>
        <div class="small" style="margin-top:8px">LEVEL ${s.level} · XP ${s.xp}/${s.level * DATA.XP_PER_LEVEL} · REP ${Math.round(s.rep)}</div></div>` : ''}
      <button class="btn blue wide" data-act="go" data-arg="updates">UPDATE LOG · V${DATA.VERSION}</button>
      <div class="panel"><h3>HOW TO PLAY</h3><div class="small" style="line-height:1.55">YOU ARE THE TEAM BOSS, NOT THE DRIVER. HIRE A DRIVER, SIGN SPONSORS (MONEY EVERY RACE), DEVELOP ENGINE / AERO / CHASSIS IN THE GARAGE, AND UPGRADE FACILITIES. ON RACE DAY YOU PICK A PRACTICE SETUP, THEN MAKE PIT-WALL CALLS: PUSH / NORMAL / SAVE, AND UNDER CAUTION: 4 TIRES, 2 TIRES, FUEL ONLY OR STAY OUT. THE GAME SAVES AUTOMATICALLY.</div></div>
      </div><div class="col">
      <div class="panel"><h3>EXPORT SAVE CODE</h3>${s ? `<textarea id="exp" class="txt" readonly>${Game.exportCode()}</textarea><button class="btn blue wide" style="margin-top:6px" data-act="copyCode">COPY CODE</button>` : '<div class="small">NO CAREER YET.</div>'}</div>
      <div class="panel"><h3>IMPORT SAVE CODE</h3><textarea id="imp" class="txt" placeholder="PASTE A SAVE CODE HERE"></textarea><button class="btn orange wide" style="margin-top:6px" data-act="importCode">LOAD CODE</button></div>
      ${s ? '<button class="btn grey wide" data-act="newCareerAsk">DELETE SAVE & START OVER</button>' : ''}</div></div>`));
  }

  // ---------- RACE PREP (Day 5 practice, Day 6 qualifying) ----------
  function prep() {
    const s = S();
    if (s.firedPending) return firedScreen();
    if (s.seasonOver) return seasonEnd();
    if (!Game.hasCar()) { modal(`<div class="big ol">NO CAR</div><div class="small" style="margin:8px 0 12px">YOU NEED A RACE CAR. CHEAP USED ONES ARE IN THE GARAGE.</div><div class="row" style="justify-content:flex-end"><button class="btn grey" data-act="closeModal">LATER</button><button class="btn green" data-act="go" data-arg="garage">GO TO GARAGE</button></div>`); return; }
    if (!s.team.driverId) { modal(`<div class="big ol">NO DRIVER</div><div class="small" style="margin:8px 0 12px">CAR 1 (#${s.team.number}) NEEDS A DRIVER BEFORE RACE DAY.</div><div class="row" style="justify-content:flex-end"><button class="btn grey" data-act="closeModal">LATER</button><button class="btn green" data-act="go" data-arg="drivers">GO TO DRIVERS</button></div>`); return; }
    const wk = s.season * 100 + s.week;
    if (s.team.car2 && !s.team.car2.driverId && ui.skip2 !== wk) { modal(`<div class="big ol">CAR 2 HAS NO DRIVER</div><div class="small" style="margin:8px 0 12px;line-height:1.5">THE #${s.team.car2.number} WILL SIT OUT THIS RACE (NO PRIZE MONEY, NO TRAVEL COST).</div><div class="row" style="justify-content:flex-end"><button class="btn grey" data-act="race1Car">RACE WITH 1 CAR</button><button class="btn green" data-act="go" data-arg="drivers">HIRE A DRIVER</button></div>`); return; }
    ui.screen = 'prep';
    const tid = s.schedule[s.week - 1]; const t = DATA.TRACKS[tid]; const ty = DATA.TYPES[t.type]; const ev = DATA.eventName(s.seriesIdx, s.week);
    if (!ui.prep || ui.prep.week !== s.week || ui.prep.season !== s.season) ui.prep = { week: s.week, season: s.season, stage: 'practice', setup: null, grid: null, style: 'balanced', ask: true, mode: 'normal' };
    const P = ui.prep; s.day = P.stage === 'practice' ? 5 : 6;
    const d = Game.myDriver(); const d2 = s.team.car2 ? Game.carDriver(2) : null;
    const info = `<div class="panel" style="text-align:center"><img class="pix" src="${previewURL(tid, 200, 120)}" style="width:100%;max-width:240px;border:2px solid #1b1b1b" alt="">
      <div class="ol1" style="margin-top:4px">${ev ? '<span class="neon">THE ' + ev + '</span><br>' : ''}${t.name}</div><div class="tiny">${t.note}${t.bank ? ' · ' + DATA.bankWord(t.bank) : ''}</div><div class="tiny">${ty.name} · ${ty.laps} LAPS · STAGES END LAP ${ty.stages.join(' & ')} · FUEL ~${ty.fuelLaps} LAPS</div></div>
      <div class="panel small" style="line-height:1.6">YOUR CAR HERE: ${Math.round(Game.carRating(t.type))} (FIELD AVG ${Math.round(Game.fieldAvgCar())})<br>#${s.team.number} ${U.esc(Game.driverShort(d))} · ${Math.round(Game.driverTypeRating(d, t.type))} ${typeShort(t.type)} RATING${d2 ? `<br>#${s.team.car2.number} ${U.esc(Game.driverShort(d2))} · ${Math.round(Game.driverTypeRating(d2, t.type))} ${typeShort(t.type)} RATING` : ''}</div>`;
    if (P.stage === 'practice') {
      const fb = U.pick(['"THE CAR IS A LITTLE LOOSE OFF TURN 4."', '"WE NEED MORE TURN IN, IT\'S TIGHT IN THE CENTER."', '"FEELS GOOD ON THE LONG RUN!"', '"REAR TIRES ARE GOING AWAY FAST."', '"THE BALANCE IS CLOSE. LET\'S DIAL IT IN."']);
      const opt = (k, title, desc, col) => `<button class="btn ${col}" style="flex:1;min-height:90px;flex-direction:column;gap:6px" data-act="setup" data-arg="${k}">${T(title, 2)}<span class="tiny" style="text-transform:none">${desc}</span></button>`;
      render(page('PRACTICE - DAY 5', `<div class="cols"><div class="col narrow">${info}</div><div class="col"><div class="panel blue"><div class="small">DRIVER RADIO:</div><div class="ol1">${fb}</div></div>
        <div class="small ol">PICK THE SETUP FOR THE WEEKEND:</div><div class="row">${opt('qual', 'QUALIFY TRIM', 'BETTER STARTING SPOT, SLIGHTLY SLOWER IN THE RACE', 'orange')}${opt('bal', 'BALANCED', 'A LITTLE BIT OF EVERYTHING', 'blue')}${opt('race', 'RACE TRIM', 'STEADIER ON LONG RUNS, FEWER MISTAKES', 'green')}</div></div></div>`));
    } else {
      const grid = P.grid; const myPos = grid.findIndex(e => e.id === 'P') + 1; const myPos2 = grid.findIndex(e => e.id === 'P2') + 1;
      const rowOf = (e, i) => `<div class="list-row ${e.id === 'P' ? 'me' : e.id === 'P2' ? 'me me2' : ''}" style="min-height:30px;cursor:default"><b style="width:22px">${i + 1}</b><span class="tag" style="background:${e.livery.body}">${e.number}</span><span class="grow">${U.esc(e.driverShort)}${e.isPlayer ? ' (YOU)' : ''}</span></div>`;
      const rows = grid.slice(0, 12).map(rowOf).join('') + grid.map((e, i) => [e, i]).filter(([e, i]) => i >= 12 && e.isPlayer).map(([e, i]) => rowOf(e, i)).join('');
      const sb = (k, l) => `<button class="btn ${P.style === k ? 'orange sel' : 'dark'}" style="flex:1" data-act="prepStyle" data-arg="${k}">${l}</button>`;
      const mb = (k, l) => `<button class="btn ${P.mode === k ? 'blue sel' : 'dark'}" style="flex:1" data-act="prepMode" data-arg="${k}">${l}</button>`;
      render(page('QUALIFYING - DAY 6', `<div class="cols"><div class="col narrow"><div class="panel red" style="text-align:center"><div class="small">YOU QUALIFIED</div><div class="ol" style="font-size:${myPos2 ? 30 : 40}px">P${myPos}${myPos2 ? ' & P' + myPos2 : ''}</div><div class="small">OF ${grid.length}${myPos2 ? ' · #' + s.team.number + ' & #' + s.team.car2.number : ''}</div></div>${info}</div>
        <div class="col"><div class="panel"><h3>STRATEGY</h3><div class="small">CREW CHIEF STYLE (USED WHEN YOU SKIP OR AUTO-CALL)</div><div class="row" style="margin:6px 0">${sb('aggressive', 'TRACK POS')}${sb('balanced', 'BALANCED')}${sb('conservative', 'FRESH TIRES')}</div>
          <div class="small">START PACE${myPos2 ? ' (BOTH CARS)' : ''}</div><div class="row" style="margin:6px 0">${mb('push', 'PUSH')}${mb('normal', 'NORMAL')}${mb('save', 'SAVE')}</div>
          <div class="row"><button class="btn ${P.ask ? 'green' : 'dark'}" style="flex:1" data-act="prepAsk">${P.ask ? 'ASK ME ON CAUTIONS: ON' : 'ASK ME ON CAUTIONS: OFF'}</button></div></div>
          <button class="btn green wide" style="min-height:56px" data-act="startRace">${T('GO TO RACE DAY >', 2)}</button>
          <div class="panel" style="padding:6px"><div class="small" style="margin-bottom:4px">STARTING GRID</div>${rows}</div></div></div>`));
    }
  }
  // ---------- RACE ----------
  function startRace() {
    const s = S(); const P = ui.prep; s.day = 7; Game.save();
    const tid = s.schedule[s.week - 1]; const geom = new TrackGeom(tid); geom.event = DATA.eventName(s.seriesIdx, s.week);
    const R = { speed: 1, stopped: false, processed: false, lastTower: 0, card: false, sel: 'P', ticker: { text: '', kind: 'info', t: 0 } };
    ui.race = R; ui.screen = 'race';
    const ids = P.grid.filter(e => e.isPlayer).sort((a, b) => (a.slot || 1) - (b.slot || 1)).map(e => e.id);
    R.race = new RaceSim.Race({ geom, grid: P.grid, playerIds: ids, style: P.style, mode: P.mode, autoPlayer: !P.ask, onEvent: (t, d) => raceEvent(t, d) });
    render(`<div class="screen race"><div class="race-tower"><div class="tw-head" id="tw-head"></div><div class="tw-list" id="tw-list"></div></div>
      <div class="race-main"><canvas id="rc"></canvas><div class="race-banner green ol1" id="banner">GREEN FLAG</div><div class="race-ticker ol1" id="ticker"></div><div id="pitcard"></div></div>
      <div class="race-side" id="side"></div></div>`);
    R.view = new Renderer.RaceView($('#rc'), R.race); R.view.followId = R.sel;
    renderSide(); updateTower(); raceEvent('msg', R.race.log[R.race.log.length - 1]);
    R.last = performance.now();
    const loop = (ts) => {
      if (R.stopped) return;
      const dt = Math.min(0.05, Math.max(0, (ts - R.last) / 1000)); R.last = ts;
      const race = R.race;
      if (!race.paused && race.phase !== 'done') { let st = dt * R.speed; while (st > 1e-6) { const k = Math.min(1 / 30, st); race.step(k); st -= k; if (race.paused || race.phase === 'done') break; } }
      try { R.view.draw(dt); } catch (e) { console.error(e); }
      R.lastTower += dt; if (R.lastTower > 0.25) { R.lastTower = 0; updateTower(); updateSide(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  function raceEvent(type, d) {
    const R = ui.race; if (!R) return;
    if (type === 'msg') { const el = $('#ticker'); if (el && d) { el.textContent = d.text; el.className = 'race-ticker ol1 ' + (['player', 'bad', 'yellow'].includes(d.kind) ? d.kind : ''); } }
    if (type === 'caution') setBanner('CAUTION', 'yellow');
    if (type === 'green') setBanner('GREEN FLAG', 'green');
    if (type === 'stage') setBanner('STAGE ' + d.stage + ' OVER', 'yellow');
    if (type === 'checkered') setBanner('CHECKERED FLAG', 'checker');
    if (type === 'cautionCall') showPitCard(d);
    if (type === 'done') { setBanner('FINAL', 'checker'); renderSide(); }
  }
  function setBanner(text, cls) { const b = $('#banner'); if (b) { b.textContent = text; b.className = 'race-banner ol1 ' + cls; } }
  const PIT_LABEL = { four: '4 TIRES', two: '2 TIRES', fuel: 'FUEL ONLY', stay: 'STAY OUT' };
  function showPitCard(d) {
    const R = ui.race; R.card = true; const el = $('#pitcard'); if (!el) return;
    if (d.carId && d.carId !== R.sel) { R.sel = d.carId; if (R.view) R.view.followId = R.sel; renderSide(); }
    R.callId = d.carId;
    const who = d.multi ? `CAR ${d.slot} · #${d.number}: ` : '';
    const btn = (k, col, sub) => `<button class="btn ${col} ${d.suggestion === k ? 'suggest' : ''}" data-act="pitChoice" data-arg="${k}">${PIT_LABEL[k]}<small>${sub}</small></button>`;
    el.innerHTML = `<div class="pitcard"><div class="panel"><div class="row"><span class="tag" style="background:#ffd000;color:#1b1b1b">CAUTION</span><b class="grow ol1">${who}PIT ROAD IS OPEN!</b></div>
      <div class="small" style="margin-top:6px;line-height:1.5">YOU ARE P${d.pos} · TIRES ${Math.round(d.tire * 100)}% · FUEL ${d.fuelLaps.toFixed(0)} LAPS · ${d.lapsLeft} LAPS TO GO${d.damage > 0.05 ? ' · DAMAGE ' + Math.round(d.damage * 100) + '%' : ''}<br>CREW CHIEF SUGGESTS: <span style="color:#ffd000">${PIT_LABEL[d.suggestion]}</span></div>
      <div class="pitgrid">${btn('four', 'green', 'SLOWEST STOP, FULL GRIP')}${btn('two', 'blue', 'QUICKER STOP, HALF GRIP')}${btn('fuel', 'orange', 'SPLASH & GO')}${btn('stay', 'red', 'KEEP TRACK POSITION')}</div></div></div>`;
  }
  function renderSide() {
    const R = ui.race; const el = $('#side'); if (!el || !R) return; const race = R.race;
    const sp = k => `<button class="btn ${R.speed === k ? 'yellow sel' : 'dark'}" data-act="raceSpeed" data-arg="${k}">${k}X</button>`;
    if (race.phase === 'done') {
      el.innerHTML = `<div class="mystat" id="mystat"></div><button class="btn green" style="min-height:70px" data-act="raceResults">${T('RESULTS >', 2)}</button>`;
      updateSide(); return;
    }
    const p = race.player(R.sel); const m = p ? p.mode : 'normal';
    const mb = (k, col) => `<button class="btn ${m === k ? col + ' sel' : 'dark'}" data-act="raceMode" data-arg="${k}">${k === 'normal' ? 'NORM' : k.toUpperCase()}</button>`;
    const team = race.teamCars();
    const camLbl = R.view && R.view.mode === 'follow' ? 'FOLLOW' : 'TRACK';
    const row2 = team.length > 1 ? `<div class="seg c3">${team.map(c => `<button class="btn ${R.sel === c.id ? (c.slot === 2 ? 'teal' : 'yellow') + ' sel' : 'dark'} cartab" data-act="raceSel" data-arg="${c.id}"><span class="sw" style="background:${c.e.livery.body}"></span>#${c.e.number}</button>`).join('')}<button class="btn blue" data-act="raceCam">${camLbl === 'FOLLOW' ? 'FOL' : 'CAM'}</button></div>`
      : `<button class="btn blue" data-act="raceCam">CAM: ${camLbl}</button>`;
    el.innerHTML = `<div class="seg c3">${sp(1)}${sp(4)}<button class="btn orange" data-act="raceSkip">SKIP</button></div>
      ${row2}
      <div class="mystat" id="mystat"></div>
      <div class="seg c3">${mb('push', 'red')}${mb('normal', 'blue')}${mb('save', 'green')}</div>
      <button class="btn red" id="pitbtn" data-act="racePit">PIT NOW</button>`;
    updateSide();
  }
  function updateSide() {
    const R = ui.race; if (!R) return; const race = R.race; const p = race.player(R.sel); const el = $('#mystat'); if (!el || !p) return;
    const multi = race.teamCars().length > 1;
    const pos = race.positionOf(p);
    const status = p.status === 'dnf' ? 'OUT: ' + p.reason : p.status === 'fin' ? 'FINISHED' : p.pit ? (p.pit.phase === 'wait' ? 'PITTING NEXT LAP' : 'ON PIT ROAD') : (race.flag === 'yellow' ? 'UNDER CAUTION' : 'RUNNING');
    el.innerHTML = `<div class="row" style="justify-content:space-between"><span class="ol1" style="font-size:18px">P${pos}</span><span>${multi ? 'CAR ' + p.slot + ' ' : ''}#${p.e.number}</span></div><div>${status}${multi ? ' · ' + U.esc(p.e.driverShort.split(' ').pop().slice(0, 9)) : ''}</div>
      <div style="margin-top:3px">TIRES ${Math.round(p.tire * 100)}%</div>${bar(p.tire, 1, p.tire > 0.6 ? '#2ecc40' : p.tire > 0.4 ? '#ffd000' : '#ff4136')}
      <div>FUEL ${(p.fuel * race.T.fuelLaps).toFixed(1)} LAPS</div>${bar(p.fuel, 1, '#2f8cff')}${p.damage > 0.03 ? `<div style="color:#ff6b6b">DAMAGE ${Math.round(p.damage * 100)}%</div>` : ''}`;
    const pb = $('#pitbtn'); if (pb) { const can = p.status === 'run' && !p.pit; pb.disabled = !can; pb.textContent = p.pit ? 'PIT CALLED' : 'PIT NOW'; }
  }
  function updateTower() {
    const R = ui.race; if (!R) return; const race = R.race; const ord = race.order(); const lead = ord[0];
    const lap = Math.min(race.laps, Math.max(1, race.leaderLaps() + (race.phase === 'racing' ? 1 : 0)));
    const stg = race.stage <= race.stages.length ? 'STAGE ' + race.stage + ' ENDS L' + race.stages[race.stage - 1] : 'FINAL STAGE';
    const h = $('#tw-head'); if (h) h.innerHTML = `${T('LAP ' + lap + '/' + race.laps, 2, { shadow: '#1b1b1b' })}<div class="tiny" style="margin-top:3px">${stg}</div>`;
    const list = $('#tw-list'); if (!list) return;
    const maxRows = Math.max(6, Math.floor((list.clientHeight || 300) / 17));
    const late = ord.map((c, i) => [c, i]).filter(([c, i]) => c.isPlayer && i >= maxRows).map(([c]) => c);
    let show = ord.slice(0, maxRows - late.length).concat(late);
    list.innerHTML = show.map(c => {
      const i = ord.indexOf(c); let gap = '';
      if (c.status === 'dnf') gap = 'OUT'; else if (c.pit && c.pit.phase !== 'wait') gap = 'PIT';
      else if (i === 0) gap = race.phase === 'racing' ? 'LEAD' : 'WIN';
      else { const dl = lead.status === 'fin' && c.status === 'fin' ? lead.laps - c.laps : (lead.status === 'fin' ? lead.laps : lead.d) - c.d; gap = dl >= 1 ? '-' + Math.floor(dl) + 'L' : '+' + (dl * race.lapTime * 3).toFixed(1); }
      const cls = c.isPlayer ? (c.slot === 2 ? 'me me2' : 'me') : c.status === 'dnf' ? 'out' : (c.pit && c.pit.phase !== 'wait') ? 'pit' : '';
      return `<div class="tw-row ${cls}"><b>${i + 1}</b><span class="sw" style="background:${c.e.livery.body}"></span><span>#${c.e.number}</span><span class="nm"><span>${U.esc(c.e.driverShort.split(' ').pop().slice(0, 8))}</span><span class="gap">${gap}</span></span></div>`;
    }).join('');
  }
  function finishRaceAndShowResults() {
    const R = ui.race; if (!R) return;
    if (!R.processed) {
      R.processed = true; R.stopped = true;
      const dmg = {}; for (const c of R.race.teamCars()) dmg[c.id] = c.damage;
      ui.summary = Game.processRace(R.race.results(), dmg);
    }
    ui.race = null; podium('race');
  }
  // ---------- RESULTS ----------
  function results() {
    ui.screen = 'results'; const s = S(); const sum = ui.summary; if (!sum) return hub();
    const r = s.results[s.results.length - 1]; const me = sum.me; const me2 = sum.me2;
    const lines = sum.lines.map(([k, v]) => `<div class="row" style="justify-content:space-between"><span>${k}</span><span style="color:${v < 0 ? '#ff6b6b' : '#7dff7d'}">${v < 0 ? '-' : '+'}${U.money(Math.abs(v))}</span></div>`).join('');
    const bestPos = Math.min(me.pos, me2 ? me2.pos : 99);
    const head = me2 ? `<div class="small">${DATA.TRACKS[sum.track].short}</div>${[[me, s.team.number, sum.standPos], [me2, s.team.car2 ? s.team.car2.number : '', sum.standPos2]].map(([m, n, sp]) => `<div class="row" style="justify-content:center;flex-wrap:nowrap"><span class="ol" style="font-size:30px">P${m.pos}</span><span class="small ol1" style="text-align:left;line-height:1.35">#${n} ${m.status === 'RUNNING' ? (m.pos === 1 ? 'WIN!' : 'FINISHED') : 'DNF ' + m.status}<br>+${m.pts} PTS · ${U.ordinal(sp)} IN PTS</span></div>`).join('')}`
      : `<div class="small">${DATA.TRACKS[sum.track].short}</div><div class="ol" style="font-size:44px">P${me.pos}</div><div class="small ol1">${me.status === 'RUNNING' ? (me.pos === 1 ? 'VICTORY!' : 'FINISHED') : 'DNF - ' + me.status} · STARTED ${me.grid}</div>
      <div class="small ol1" style="margin-top:4px">+${me.pts} PTS (${me.stagePts} STAGE) · NOW ${U.ordinal(sum.standPos)} IN POINTS</div>`;
    render(page('RACE RESULTS', `<div class="cols"><div class="col narrow"><div class="panel ${bestPos === 1 ? 'orange' : bestPos <= 10 ? 'green' : 'red'}" style="text-align:center">${head}</div>
      <div class="panel small" style="line-height:1.7">${lines}<div class="row" style="justify-content:space-between;border-top:2px solid #1b1b1b;margin-top:4px"><b>NET</b><b style="color:${sum.net < 0 ? '#ff6b6b' : '#7dff7d'}">${sum.net < 0 ? '-' : '+'}${U.money(Math.abs(sum.net))}</b></div></div>
      <div class="panel small" style="line-height:1.6">REP ${sum.repD >= 0 ? '+' : ''}${sum.repD.toFixed(1)} · XP +${sum.xp}${sum.levelUp ? ' · <span style="color:#ffd000">LEVEL UP! LV ' + s.level + '</span>' : ''}${sum.drvUp && sum.drvUp.length ? '<br>' + sum.drvUp.map(([d, k]) => U.esc(Game.driverShort(d)) + ' +1 ' + (DATA.DRIVER_STATS.find(x => x[0] === k) || [k, k])[1]).join(' · ') : ''}${sum.confD !== undefined ? '<br>BOSS CONFIDENCE ' + (sum.confD >= 0 ? '+' : '') + sum.confD.toFixed(0) + ' (NOW ' + Math.round(s.hired ? s.hired.confidence : 0) + '%)' : ''}</div>
      <button class="btn green wide" style="min-height:56px" data-act="afterResults">${T('CONTINUE >', 2)}</button></div>
      <div class="col"><div class="panel" style="padding:4px">${resultsTable(r)}</div></div></div>`));
  }
  function afterResults() {
    const s = S(); const sum = ui.summary; ui.summary = null;
    if (s.gameOver) { modal(`<div class="big ol">BANKRUPT!</div><div class="small" style="margin:8px 0 12px;line-height:1.5">THE MONEY RAN OUT. ${U.esc(s.team.name)} CLOSES ITS DOORS. YOU CAN START A FRESH CAREER.</div><button class="btn green wide" data-act="newCareerYes">NEW CAREER</button>`); return; }
    if (s.firedPending) return firedScreen();
    if (s.seasonOver) return s.champShown === s.season ? seasonEnd() : podium('champ');
    hub(); if (sum && sum.levelUp) toast('LEVEL UP! YOU ARE NOW LEVEL ' + s.level);
  }
  // ---------- SEASON END (v1.2: summary, champion, highlights, choice) ----------
  function seasonEnd() {
    ui.screen = 'seasonEnd'; const s = S(); const ss = Game.seasonSummary(); const sr = Game.ser();
    const champ = Game.entryInfo(ss.champion); const cupChamp = ss.pos === 1 && s.seriesIdx === 3; const mineChamp = champ.isPlayer;
    let opts = '';
    if (s.mode === 'owner') {
      if (ss.promo) {
        const nx = DATA.SERIES[ss.promo.next];
        opts += ss.promo.eligible ? `<div class="panel green"><h3>YOU'VE BEEN SCOUTED!</h3><div class="small" style="line-height:1.5">THE ${nx.name} WANTS YOU. BUY-IN: <span class="neon">${U.money(ss.promo.cost)}</span>${ss.pos === 1 ? ' (CHAMPION DISCOUNT!)' : ''}. ${nx.cars} CARS, TOUGHER RIVALS, MUCH BIGGER MONEY.</div>
          <button class="btn ${ss.promo.afford ? 'orange' : 'grey'} wide" style="margin-top:8px" data-act="seasonChoice" data-arg="promote">${ss.promo.afford ? 'MOVE UP TO ' + nx.short + ' (' + U.moneyShort(ss.promo.cost) + ')' : 'NEED ' + U.moneyShort(ss.promo.cost) + ' TO MOVE UP'}</button></div>`
          : `<div class="panel"><h3>PROMOTION</h3><div class="small" style="line-height:1.5">TO MOVE UP TO THE ${nx.name} YOU NEED A TOP-5 POINTS FINISH OR 2 WINS, PLUS ${U.money(nx.buyIn)}. NOT THIS YEAR - BUILD AND COME BACK STRONGER.</div></div>`;
      }
      opts += `<button class="btn blue wide" style="min-height:56px" data-act="seasonChoice" data-arg="stay">${s.seriesIdx === 3 ? 'RUN ANOTHER CUP SEASON' : 'STAY IN ' + sr.short + ' NEXT SEASON'}</button>`;
    } else {
      opts += s.jobOffers.map(j => `<div class="panel ${j.seriesIdx > s.seriesIdx ? 'green' : ''}"><div class="row" style="flex-wrap:nowrap">${Art.carImg(j.livery, j.number, 2)}<div class="grow" style="min-width:0"><div class="ol1 nm1">${U.esc(j.name)}</div><div class="tiny">${DATA.SERIES[j.seriesIdx].name} · OWNER ${U.esc(j.owner)}</div></div></div>
        <div class="small" style="margin:4px 0">BUDGET ${U.money(j.budget)} · CAR ${Math.round((j.parts.engine + j.parts.aero + j.parts.chassis) / 3)} · DRIVER ${Game.ovr(j.driver)}${j.driver2 ? ' · 2 CARS (2ND DRIVER ' + Game.ovr(j.driver2) + ')' : ''} · TARGET ${U.ordinal(j.target)}</div>
        <button class="btn orange wide" data-act="seasonChoice" data-arg="job|${j.id}">ACCEPT OFFER</button></div>`).join('');
      if (!s.jobOffers.length) opts += '<div class="panel small">NO OFFERS FROM OTHER TEAMS THIS TIME. FINISH TOP 5 TO GET NOTICED.</div>';
      opts += `<button class="btn blue wide" style="min-height:56px" data-act="seasonChoice" data-arg="stay">STAY WITH ${U.esc(s.team.name)}</button>${ss.firedRisk ? '<div class="small" style="color:#ff6b6b">WARNING: THE BOSS IS UNHAPPY. STAYING MIGHT NOT BE YOUR CALL.</div>' : ''}`;
    }
    // highlights from this season's results
    const ids = Game.teamCars().map(c => c.id); let pods = 0, best = 99, dnf = 0, led = 0, top10 = 0;
    const strip = s.schedule.map((tid, i) => {
      const r = s.results[i]; const mine = r ? r.order.filter(o => ids.includes(o.id)) : [];
      for (const m of mine) { if (m.pos <= 3) pods++; if (m.pos <= 10) top10++; best = Math.min(best, m.pos); if (m.status !== 'RUNNING') dnf++; led += m.lapsLed || 0; }
      const p = mine.length ? Math.min(...mine.map(m => m.pos)) : null; const cls = p === null ? '' : p === 1 ? 'gold' : p <= 3 ? 'pod' : p <= 10 ? 'good' : 'meh';
      return `<span class="se-cell ${cls}"><img class="pix" src="${PW.trackIcon(tid, 24, 18, '#d8dde3', 1)}" style="width:24px;height:18px" alt=""><b>${p ? 'P' + p : '-'}</b></span>`;
    }).join('');
    const seen = new Set(); const tro = (s.trophies ? s.trophies.log : []).filter(e => e.s === s.season && !e.backfill && !seen.has(e.k) && seen.add(e.k));
    const cat = trophyCatalog().flatMap(x => x.items);
    const troHTML = tro.length ? tro.slice(0, 8).map(e => { const it = cat.find(i => i.key === e.k) || { kind: 'star', metal: 'gold' }; return `<span class="se-tro"><img class="pix" src="${Art.trophyURL(it.kind, e.k.startsWith('pod:') ? (e.pos === 1 ? 'gold' : e.pos === 2 ? 'silver' : 'bronze') : it.metal)}" style="height:28px" alt=""><span>${U.esc(Game.trophyName(e.k))}</span></span>`; }).join('') : '<span class="tiny muted">NO NEW TROPHIES THIS SEASON.</span>';
    render(page('SEASON COMPLETE', `<div class="se-grid"><div class="se-col">
      <div class="panel ${ss.pos === 1 ? 'orange' : 'red'} se-result"><div class="small">${s.year} ${sr.name}</div><div class="se-pos">${T(U.ordinal(ss.pos), 5, SH)}</div><div class="small">${ss.pts} PTS · ${ss.wins} WINS · ${ss.top5} TOP 5</div>
        ${ss.pos2 ? `<div class="small" style="margin-top:4px">CARS: #${s.team.number} ${U.ordinal(ss.pos1)} · #${s.team.car2.number} ${U.ordinal(ss.pos2)}<br>OWNERS: ${U.ordinal(ss.ownerPos)} (${ss.ownerPts} PTS)</div>` : ''}${cupChamp ? `<div style="margin-top:6px">${T('CUP SERIES CHAMPION!', 2, { color: NEON, shadow: '#0d0e10' })}</div>` : ss.pos === 1 ? `<div style="margin-top:6px">${T('CHAMPIONS!', 3, { color: NEON, shadow: '#0d0e10' })}</div>` : ''}</div>
      <div class="panel small" style="line-height:1.7"><div class="row" style="justify-content:space-between"><span>POINTS-FUND PRIZE</span><span style="color:#7dff7d">+${U.money(ss.prize)}</span></div><div class="row" style="justify-content:space-between"><span>BANK</span><span>${U.money(s.money)}</span></div><div class="row" style="justify-content:space-between"><span>REPUTATION</span><span>${Math.round(s.rep)}/100</span></div></div></div>
      <div class="se-col"><div class="panel se-champ"><span class="dp-title">${s.year} ${sr.short} CHAMPION</span><div class="row" style="flex-wrap:nowrap"><img class="pix" src="${Art.trophyURL('big', 'gold')}" style="width:42px;height:60px" alt=""><div style="min-width:0">${Art.carImg(champ.livery, champ.number, 3)}<div class="small nm1">#${champ.number} ${U.esc(champ.driver)}</div><div class="tiny">${U.esc(champ.team)}${mineChamp ? ' · <span class="neon">YOUR TEAM!</span>' : ''}</div></div></div></div>
        <div class="panel"><span class="dp-title">SEASON HIGHLIGHTS</span><div class="se-stats"><span><b>${ss.wins}</b>WINS</span><span><b>${pods}</b>PODIUMS</span><span><b>${top10}</b>TOP 10S</span><span><b>${best < 99 ? 'P' + best : '-'}</b>BEST</span><span><b>${led}</b>LAPS LED</span><span><b>${dnf}</b>DNFS</span></div>
        <div class="se-strip">${strip}</div></div>
        <div class="panel"><span class="dp-title">TROPHIES WON THIS SEASON</span><div class="se-tros">${troHTML}</div></div></div>
      <div class="se-col se-opts"><span class="dp-title neon">WHAT'S NEXT?</span>${opts}</div></div>`));
  }
  function firedScreen() {
    ui.screen = 'fired'; const s = S();
    const cards = s.jobOffers.map(j => `<div class="panel col"><div class="row">${Art.carImg(j.livery, j.number, 2)}<div class="grow"><div class="ol1">${U.esc(j.name)}</div><div class="tiny">${DATA.SERIES[j.seriesIdx].name}</div></div></div>
      <div class="small" style="margin:4px 0;line-height:1.5">BUDGET ${U.money(j.budget)}<br>CAR ${Math.round((j.parts.engine + j.parts.aero + j.parts.chassis) / 3)} · DRIVER ${Game.ovr(j.driver)}${j.driver2 ? ' · 2 CARS' : ''}<br>TARGET ${U.ordinal(j.target)}</div><button class="btn green wide" data-act="takeJob" data-arg="${j.id}">TAKE JOB</button></div>`).join('');
    render(page('YOU\'RE FIRED!', `<div class="panel red" style="margin-bottom:10px"><div class="ol1">${U.esc(s.hired ? s.hired.owner : 'THE OWNER')} LET YOU GO. BUT YOUR PHONE IS RINGING...</div></div><div class="cols">${cards}</div>`));
    const back = $('.back'); if (back) back.remove();
  }

  // ---------- actions ----------
  const SCREENS = { hub, career, drivers, garage, facilities, sponsors, calendar, standings, news: newsScreen, profile, prep, seasonEnd, results, updates, trophies };
  function go(name) { closeModal(); if (ui.race && name !== 'race') { ui.race.stopped = true; ui.race = null; } (SCREENS[name] || hub)(); const pb = $('.page-body'); if (pb) pb.scrollTop = 0; }
  function refresh() { const f = SCREENS[ui.screen]; if (f && ui.screen !== 'race') f(); }
  const A = {
    go: (a) => go(a), closeModal, confirmYes: () => { const cb = confirmCb; closeModal(); if (cb) cb(); },
    needCareer: () => toast('START A CAREER FIRST - TAP NEW CAREER'),
    ncMode: (m) => { ui.nc.step = m; newCareerScreen(); },
    ncBack: () => { ui.nc.step = 'mode'; newCareerScreen(); },
    ncColor: (a) => { const [k, c] = a.split('|'); readNC(); ui.nc[k] = c; newCareerScreen(); },
    ncNum: (a) => { readNC(); ui.nc.number = ((ui.nc.number - 1 + +a + 99) % 99) + 1; newCareerScreen(); },
    ncStartOwner: () => { readNC(); markSeen(); const nc = ui.nc; Game.newCareer({ mode: 'owner', profile: nc.profile || 'MANAGER', teamName: (nc.team || 'MY RACING').toUpperCase(), number: nc.number, colors: { body: nc.body, stripe: nc.stripe } }); ui.nc = null; ui.artCache = {}; hub(); toast('CAREER STARTED! BUY A CAR IN THE GARAGE.'); },
    ncTakeJob: (id) => { readNC(); markSeen(); const nc = ui.nc; const job = nc.jobs.find(j => j.id === id); Game.newCareer({ mode: 'hired', profile: nc.profile || 'MANAGER', job }); ui.nc = null; ui.artCache = {}; hub(); toast('WELCOME TO ' + job.name + '!'); },
    newCareerAsk: () => confirmBox('START OVER? YOUR CURRENT CAREER WILL BE DELETED (EXPORT A SAVE CODE FIRST IF YOU WANT TO KEEP IT).', 'DELETE & START', () => A.newCareerYes(), 'red'),
    newCareerYes: () => { closeModal(); Game.wipe(); ui.nc = null; ui.artCache = {}; go('career'); },
    driverInfo: (id) => { ui.hireYears = 2; driverInfo(id); },
    hireYears: (a) => { const [id, y] = a.split('|'); ui.hireYears = +y; driverInfo(id); },
    hire: (a) => { const [id, y, dest] = a.split('|'); const err = Game.hireDriver(id, +y, dest); if (err) return toast(err); closeModal(); ui.drvTab = 'team'; drivers(); toast('DRIVER SIGNED!'); },
    fireAsk: (id) => { const d = id ? S().drivers[id] : Game.myDriver(); if (!d) return; confirmBox('RELEASE ' + Game.driverName(d) + '? BUYOUT COSTS ' + U.money(Game.fireCost(d)) + '.', 'RELEASE', () => { Game.releaseDriver(d.id); drivers(); }, 'red'); },
    assign: (a) => { const [id, dest] = a.split('|'); const e = Game.assignDriver(id, dest); if (e) return toast(e); drivers(); },
    drvTab: (t) => { ui.drvTab = t; drivers(); const pb = $('.page-body'); if (pb) pb.scrollTop = 0; },
    scoutTier: (t) => { ui.scoutSel.tier = t; drivers(); }, scoutFeeder: (f) => { ui.scoutSel.feeder = f; drivers(); },
    sendScout: () => { const sc = ui.scoutSel; const e = Game.sendScout(sc.tier, sc.feeder); if (e) return toast(e); drivers(); toast('SCOUT REPORT IS IN!'); },
    prospect: (id) => prospectModal(id),
    scoutAgain: (id) => { const e = Game.scoutAgain(id); if (e) return toast(e); prospectModal(id); toast('REPORT UPDATED'); },
    signProspect: (a) => { const [id, dest] = a.split('|'); const e = Game.signProspect(id, dest); if (e) return toast(e); closeModal(); ui.drvTab = 'team'; drivers(); toast('PROSPECT SIGNED!'); },
    buyCar2: () => { const e = Game.buyCar2(); if (e) return toast(e); ui.artCache = {}; garage(); toast('2ND CAR BOUGHT! HIRE ITS DRIVER IN DRIVERS.'); },
    sellCar2Ask: () => confirmBox('SELL CAR 2? YOU GET 40% BACK. ITS DRIVER MOVES TO DEVELOPMENT (OR IS RELEASED) AND ITS SPONSOR LEAVES.', 'SELL', () => { Game.sellCar2(); garage(); }, 'red'),
    race1Car: () => { const s = S(); ui.skip2 = s.season * 100 + s.week; closeModal(); prep(); },
    seenClose: () => { markSeen(); closeModal(); hub(); },
    podiumNext: () => { if (ui.screen !== 'podium') return; const k = ui.podKind; ui.pod = null; if (k === 'champ') seasonEnd(); else results(); },
    trophy: (k) => trophyInfo(k),
    dashCar: (k) => { ui.dashCar = +k; career(); },
    teamDriver: (id) => teamDriverModal(id),
    careerHistory: () => historyModal(),
    ncPaint: (k) => { readNC(); ui.nc.paint = k; newCareerScreen(); },
    raceSel: (id) => { const R = ui.race; R.sel = id; if (R.view) R.view.followId = id; renderSide(); },
    buyCar: (id) => { const e = Game.buyCar(id); if (e) return toast(e); ui.artCache = {}; garage(); toast('CAR BOUGHT! NOW HIRE A DRIVER.'); },
    rnd: (p) => { const e = Game.startRnd(p); if (e) return toast(e); garage(); toast('R&D STARTED'); },
    build: (k) => { const e = Game.startBuild(k); if (e) return toast(e); facilities(); toast('CONSTRUCTION STARTED'); },
    sign: (a) => { const [id, car] = a.split('|'); const e = Game.signSponsor(id, car ? +car : undefined); if (e) return toast(e); ui.artCache = {}; sponsors(); toast('SPONSOR SIGNED!'); },
    dropAsk: (a) => { const [slot, i] = a.split('|'); const sp = slot === 'primary' ? S().team.sponsors.primary : S().team.sponsors.assoc[+i]; confirmBox('DROP ' + sp.name + '? EXIT FEE ' + U.money(Game.dropPenalty(sp)) + '.', 'DROP', () => { Game.dropSponsor(slot, +i); ui.artCache = {}; sponsors(); }, 'red'); },
    standTab: (t) => { ui.standTab = t; standings(); },
    rename: () => { const v = ($('#pf-name').value || '').trim().toUpperCase().slice(0, 14); if (v) { S().profile = v; Game.save(); toast('NAME SAVED'); } },
    copyCode: () => { const t = $('#exp'); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(() => toast('COPIED!'), () => toast(ok ? 'COPIED!' : 'SELECT & COPY THE TEXT')); else toast(ok ? 'COPIED!' : 'SELECT & COPY THE TEXT'); },
    importCode: () => { const e = Game.importCode($('#imp').value); if (e) return toast(e); ui.artCache = {}; hub(); toast('SAVE LOADED!'); },
    setup: (k) => { const P = ui.prep; P.setup = k === 'qual' ? { qual: 4, car: -0.6, cons: 0 } : k === 'race' ? { qual: -1, car: 0, cons: 6 } : { qual: 0, car: 0.6, cons: 0 };
      const s = S(); const tid = s.schedule[s.week - 1]; P.grid = RaceSim.qualify(Game.buildEntries(tid, P.setup), DATA.TRACKS[tid].type); P.stage = 'qual'; prep(); },
    prepStyle: (k) => { ui.prep.style = k; prep(); }, prepMode: (k) => { ui.prep.mode = k; prep(); }, prepAsk: () => { ui.prep.ask = !ui.prep.ask; prep(); },
    startRace: () => startRace(),
    raceSpeed: (k) => { ui.race.speed = +k; renderSide(); },
    raceMode: (m) => { ui.race.race.setMode(m, ui.race.sel); renderSide(); },
    raceCam: () => { const v = ui.race.view; v.setMode(v.mode === 'follow' ? 'full' : 'follow'); renderSide(); },
    racePit: () => {
      const el = $('#pitcard'); const R = ui.race; if (!R || R.race.phase === 'done') return;
      const pc = R.race.player(R.sel); const multi = R.race.teamCars().length > 1;
      el.innerHTML = `<div class="pitcard"><div class="panel"><b class="ol1">${multi ? 'CALL THE #' + pc.e.number + ' IN?' : 'CALL YOUR DRIVER IN?'}</b><div class="tiny" style="margin-top:4px">GREEN-FLAG STOPS COST ABOUT HALF A LAP.</div><div class="pitgrid">
        <button class="btn green" data-act="pitNow" data-arg="four">4 TIRES<small>+ FUEL</small></button><button class="btn blue" data-act="pitNow" data-arg="two">2 TIRES<small>+ FUEL</small></button>
        <button class="btn orange" data-act="pitNow" data-arg="fuel">FUEL ONLY<small>SPLASH</small></button><button class="btn grey" data-act="pitNow" data-arg="cancel">CANCEL<small>STAY OUT</small></button></div></div></div>`;
    },
    pitNow: (k) => { $('#pitcard').innerHTML = ''; if (k !== 'cancel') ui.race.race.requestPit(k, ui.race.sel); updateSide(); },
    pitChoice: (k) => { const R = ui.race; R.card = false; $('#pitcard').innerHTML = ''; R.race.playerCautionChoice(k, R.callId); updateSide(); },
    raceSkip: () => { const R = ui.race; if (!R) return; $('#pitcard').innerHTML = ''; R.race.runToEnd(); finishRaceAndShowResults(); },
    raceResults: () => finishRaceAndShowResults(),
    afterResults: () => afterResults(),
    seasonChoice: (a) => {
      const [t, id] = a.split('|'); const r = Game.finishSeason(t === 'job' ? { type: 'job', id } : { type: t });
      if (r === 'FIRED') return firedScreen();
      if (r) return toast(r);
      ui.artCache = {}; ui.prep = null; hub(); toast('SEASON ' + S().year + ' - ' + Game.ser().name + '!');
    },
    takeJob: (id) => { const s = S(); if (s.seasonOver) { const r = Game.finishSeason({ type: 'job', id }); if (r) return toast(r); } else Game.takeJob(id, true); Game.save(); ui.artCache = {}; ui.prep = null; hub(); toast('NEW JOB: ' + S().team.name); },
  };
  function readNC() { const nc = ui.nc; if (!nc) return; const p = $('#nc-profile'), t = $('#nc-team'); if (p) nc.profile = p.value.toUpperCase().slice(0, 14); if (t) nc.team = t.value.toUpperCase().slice(0, 22); }
  function onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); try { fn(el.dataset.arg, el); } catch (err) { console.error(err); toast('ERROR: ' + err.message); } }
  }
  function onResize() {
    if (ui.screen === 'podium' && ui.pod) { ui.pod.resize(); return; }
    if (ui.race && ui.race.view) { ui.race.view.resize(); updateTower(); return; }
    if (ui.screen === 'hub') hub(); else if (ui.screen === 'career' && S()) career();
  }
  function maybeWhatsNew() { if (S() && seenVersion() !== DATA.VERSION) whatsNew(); else if (!S()) markSeen(); }
  return { hub, go, onClick, onResize, toast, ui, refresh, maybeWhatsNew, whatsNew, podium, trophies };
})();
