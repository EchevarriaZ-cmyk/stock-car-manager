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
  // ---------- shared chrome ----------
  function topbar() {
    const s = S();
    const left = s ? T(`WEEK ${s.week} / DAY ${s.day}`, 3, { shadow: '#1b1b1b' }) : T('STOCK CAR MANAGER', 3, { shadow: '#1b1b1b' });
    const right = s ? `<div class="tb-res">${T(Math.floor(s.ep), 3, { shadow: '#1b1b1b' })}<img class="pix" src="${ICON_GEAR()}" style="width:27px;height:27px" alt="EP"></div>
      <div class="tb-res">${T(U.money(s.money).replace('$', ''), 3, { shadow: '#1b1b1b', color: s.money < 0 ? '#ff5050' : '#fff' })}${T('$', 3, { color: '#2ecc40', shadow: '#1b1b1b' })}</div>` : '';
    return `<div class="topbar"><div>${left}</div><div class="tb-right">${right}</div></div>`;
  }
  function page(title, body, extra) {
    return `<div class="screen page">${topbar()}<div class="page-head"><button class="btn back" data-act="go" data-arg="hub">${T('< HUB', 2)}</button>${T(title, 3, { shadow: '#1b1b1b' })}<div class="spacer"></div>${extra || ''}</div><div class="page-body">${body}</div></div>`;
  }
  function render(html) { app().innerHTML = html; }
  function artURL(kind, w, h, opt) {
    const key = kind + w + 'x' + h + JSON.stringify(opt || {});
    if (!ui.artCache[key]) ui.artCache[key] = Art.tile(kind, w, h, opt).toDataURL();
    return ui.artCache[key];
  }
  function previewURL(tid, w, h) { const k = tid + w + h; if (!ui.prevCache[k]) ui.prevCache[k] = Renderer.preview(tid, w, h).toDataURL(); return ui.prevCache[k]; }
  function bar(v, max, col, marker) { const p = U.clamp(v / max * 100, 0, 100); return `<div class="bar"><i style="width:${p}%;background:${col || '#2ecc40'}"></i>${marker !== undefined ? `<b style="left:${U.clamp(marker / max * 100, 0, 100)}%"></b>` : ''}</div>`; }
  const typeShort = t => ({ short: 'SHORT', intermediate: 'INTER', superspeedway: 'SUPER', road: 'ROAD' })[t];

  // ---------- HUB ----------
  function hub() {
    ui.screen = 'hub';
    const s = S(); const H = window.innerHeight; const top = H <= 360 ? 38 : 44, bot = H <= 360 ? 50 : 56;
    const th = Math.max(96, Math.floor((H - top - bot - 8 - 10) / 2)); const tw = Math.round(th * 1.0); const dw = tw * 2 + 8;
    const has = !!s;
    const lv = has ? Game.myLivery() : { body: '#d9342b', stripe: '#f2d22e', num: '#141414' };
    const num = has ? s.team.number : 7;
    const lab = (text, w) => { const lines = text.split('\n'); const width = Math.max(...lines.map(PF.measure)) + 4; const sc = width * 3 <= w * 0.92 ? 3 : 2; return `<span class="tlabel">${T(text, sc, { shadow: '#1b1b1b' })}</span>`; };
    const artTile = (act, kind, label, r, c, opts) => {
      const locked = !has && act !== 'career';
      const aw = Math.round(tw / 1.45), ah = Math.round(th / 1.45);
      return `<button class="tile ${locked ? 'locked' : ''}" style="grid-row:${r};grid-column:${c}" data-act="${locked ? 'needCareer' : 'go'}" data-arg="${act}">
        <img class="art" src="${artURL(kind, aw, ah, { livery: lv, number: num })}" alt="">${lab(label, tw)}${opts && opts.badge ? `<span class="badge">${opts.badge}</span>` : ''}</button>`;
    };
    const infoTile = (act, color, title, body, r, c) => {
      const chars = Math.floor((dw - 24) / 12); const maxLines = Math.max(2, Math.floor((th - 48) / 18));
      let lines = wrap(body, chars); if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].slice(0, chars - 3).replace(/\s+$/, '') + '...'; }
      const tchars = Math.floor((dw - 20) / 18);
      return `<button class="tile info ${color}" style="grid-row:${r};grid-column:${c} / span 2" data-act="go" data-arg="${act}">
        <div>${T(title.length > tchars ? title.slice(0, Math.floor((dw - 20) / 12)) : title, title.length > tchars ? 2 : 3, { shadow: '#1b1b1b' })}</div>
        <div class="info-body">${T(lines.join('\n'), 2)}</div></button>`;
    };
    let tiles = '';
    let nextTrack = has && !s.seasonOver ? DATA.TRACKS[s.schedule[s.week - 1]] : null;
    tiles += artTile(has && s.seasonOver ? 'seasonEnd' : 'prep', 'race', has && s.seasonOver ? 'SEASON\nEND' : 'GO\nRACE', 1, 1, { badge: nextTrack ? 'R' + s.week : '' });
    tiles += artTile('garage', 'garage', 'GARAGE', 1, 2, { badge: has && !Game.hasCar() ? 'BUY CAR!' : has && s.team.rnd.length ? 'R&D' : '' });
    tiles += artTile('drivers', 'drivers', 'DRIVERS', 1, 3, { badge: has && !s.team.driverId ? 'NEED!' : '' });
    tiles += artTile('facilities', 'facilities', 'FACILITIES', 1, 4, { badge: has && s.team.builds.length ? 'BUILD' : '' });
    tiles += artTile('sponsors', 'sponsors', 'SPONSORS', 1, 5, { badge: has && s.offers.length ? s.offers.length + ' OFFERS' : '' });
    tiles += artTile('calendar', 'calendar', 'CALENDAR', 1, 6);
    const newsText = has ? (s.news[0] ? s.news[0].text : 'NO NEWS YET.') : 'BUILD A NASCAR-STYLE TEAM FROM ARCA TO THE CUP. YOU ARE THE BOSS, NOT THE DRIVER.';
    tiles += infoTile(has ? 'news' : 'career', 'red', has ? 'LATEST NEWS' : 'STOCK CAR MANAGER', newsText, 2, 1);
    tiles += artTile('career', 'career', has ? 'CAREER\nMODE' : 'NEW\nCAREER', 2, 3, { badge: has ? '' : 'START' });
    let sTitle = 'CHASE THE CUP', sBody = 'START IN ARCA, GET SCOUTED, CLIMB TO THE CUP. OWN A TEAM OR GET HIRED.';
    if (has) {
      const sr = Game.ser(); sTitle = s.year + ' ' + sr.name;
      if (s.seasonOver) sBody = 'SEASON COMPLETE! YOU FINISHED ' + U.ordinal(Game.myStandingPos()) + ' IN POINTS. TAP TO SEE WHAT IS NEXT.';
      else sBody = 'RACE ' + s.week + ' OF 10 - NEXT: ' + nextTrack.short + ' (' + DATA.TYPES[nextTrack.type].name + '). ' + (s.results.length ? 'YOU ARE ' + U.ordinal(Game.myStandingPos()) + ' IN POINTS' : 'SEASON OPENER - NO POINTS YET') + (s.hired ? '. BOSS CONFIDENCE ' + Math.round(s.hired.confidence) + '%' : '') + '.';
    }
    tiles += infoTile(has ? (s.seasonOver ? 'seasonEnd' : 'standings') : 'career', 'orange', sTitle, sBody, 2, 4);
    tiles += artTile('standings', 'standings', 'STANDINGS', 2, 6);
    const xpPct = has ? Math.round(s.xp / (s.level * DATA.XP_PER_LEVEL) * 100) : 0;
    render(`<div class="screen hub">${topbar()}
      <div class="hub-scroll"><div class="hub-grid" style="grid-template-rows:${th}px ${th}px;grid-auto-columns:${tw}px">${tiles}</div></div>
      <div class="botbar"><button class="profile-btn" data-act="go" data-arg="profile">${T(has ? s.profile : 'PLAYER', 3)}</button>
        <div class="lvl">${T('LEVEL ' + (has ? s.level : 1), 3, { shadow: '#1b1b1b' })}<div class="xpbar"><i style="width:${xpPct}%"></i></div></div>
        <div class="spacer"></div>${T('V1.0', 3, { shadow: '#1b1b1b' })}<button class="menu-btn" data-act="go" data-arg="profile" aria-label="Menu"><img class="pix" src="${Art.gear('#fff')}" style="width:27px;height:27px" alt=""></button></div></div>`);
  }

  // ---------- CAREER ----------
  function career() {
    ui.screen = 'career'; const s = S();
    if (!s) return newCareerScreen();
    const sr = Game.ser(); const st = s.standings.P;
    let goal = '';
    if (s.mode === 'owner') {
      if (s.seriesIdx < 3) { const nx = DATA.SERIES[s.seriesIdx + 1]; goal = `TO BUY INTO THE ${nx.name}: FINISH TOP 5 IN POINTS (OR WIN 2 RACES) AND HAVE ${U.money(nx.buyIn)} (HALF PRICE IF YOU WIN THE TITLE).`; }
      else goal = 'YOU MADE THE CUP SERIES. WIN THE CHAMPIONSHIP 4 FINALE TO BECOME CHAMPION!';
    } else goal = `BOSS: ${s.hired.owner}. TARGET: AVERAGE FINISH ${U.ordinal(s.hired.target)} OR BETTER. GOOD SEASONS (TOP 5) BRING OFFERS FROM HIGHER SERIES. BAD ONES GET YOU FIRED.`;
    const hist = s.history.length ? `<table class="tbl"><tr><th>YEAR</th><th>SERIES</th><th>TEAM</th><th>POS</th><th>WINS</th></tr>${s.history.map(h => `<tr><td>${h.year}</td><td>${h.series}</td><td>${U.esc(h.team)}</td><td>${U.ordinal(h.pos)}</td><td>${h.wins}</td></tr>`).join('')}</table>` : '<div class="small muted">NO COMPLETED SEASONS YET.</div>';
    render(page('CAREER MODE', `<div class="cols"><div class="col narrow">
      <div class="panel ${s.mode === 'owner' ? 'red' : 'blue'}"><div class="small">${s.mode === 'owner' ? 'TEAM OWNER' : 'HIRED MANAGER'}</div><div class="big ol">${U.esc(s.team.name)}</div>
        <div class="row" style="margin-top:6px">${Art.carImg(Game.myLivery(), s.team.number, 3)}<div class="small">#${s.team.number}<br>${sr.name}<br>SEASON ${s.season} (${s.year})</div></div></div>
      <div class="panel"><div class="small">REPUTATION ${Math.round(s.rep)}/100</div>${bar(s.rep, 100, '#ffd000')}
        ${s.hired ? `<div class="small" style="margin-top:6px">BOSS CONFIDENCE ${Math.round(s.hired.confidence)}%</div>${bar(s.hired.confidence, 100, s.hired.confidence < 30 ? '#ff4136' : '#2ecc40')}` : ''}
        <div class="small" style="margin-top:6px">CAREER: ${s.stats.races} STARTS · ${s.stats.wins} WINS · ${s.stats.top5} TOP 5 · ${s.stats.titles} TITLES</div></div>
      <button class="btn grey wide" data-act="newCareerAsk">START A NEW CAREER</button>
      </div><div class="col"><div class="panel orange"><h3 class="ol1">THE CLIMB</h3><div class="small ol1" style="line-height:1.5">${goal}</div>
        <div class="small ol1" style="margin-top:6px">THIS SEASON: ${U.ordinal(Game.myStandingPos())} IN POINTS · ${st.pts} PTS · ${st.wins} WINS</div></div>
      <div class="panel"><h3>LADDER</h3><div class="row">${DATA.SERIES.map((x, i) => `<span class="tag" style="background:${i === s.seriesIdx ? '#e30d0d' : i < s.seriesIdx ? '#2e9b3a' : '#1b1b1b'};padding:8px">${x.short}</span>${i < 3 ? '>' : ''}`).join('')}</div></div>
      <div class="panel"><h3>HISTORY</h3>${hist}</div></div></div>`));
  }
  function newCareerScreen() {
    ui.screen = 'career';
    if (!ui.nc) ui.nc = { step: 'mode', profile: 'ZION', team: 'ZION RACING', number: 7, body: '#d9342b', stripe: '#f2d22e', jobs: null };
    const nc = ui.nc;
    if (nc.step === 'mode') {
      const th = Math.min(150, window.innerHeight - 200);
      const tile = (mode, kind, label, color, desc) => `<div class="col"><button class="tile" style="height:${th}px;width:100%" data-act="ncMode" data-arg="${mode}"><img class="art" src="${artURL(kind, 150, Math.round(th / 1.45 * 1.1), { livery: { body: nc.body, stripe: nc.stripe, num: '#141414' }, number: 7 })}" alt="">
        <span class="tlabel">${T(label, 3, { shadow: '#1b1b1b' })}</span></button><div class="panel ${color} small ol1" style="line-height:1.45">${desc}</div></div>`;
      return render(page('NEW CAREER', `<div class="cols">${tile('owner', 'garage', 'TEAM\nOWNER', 'red', 'GRASSROOTS: $15K AND AN EMPTY SHOP. BUY A USED CAR, HIRE A ROOKIE, LIVE ON PRIZE MONEY. RESULTS BRING SPONSORS, THEN TRUCKS, O\'REILLY AND THE CUP.')}
        ${tile('hired', 'career', 'HIRED\nMANAGER', 'blue', 'GET HIRED BY A STRUGGLING ARCA TEAM. HIT YOUR TARGETS AND BIGGER TEAMS CALL. MISS THEM AND THE BOSS SHOWS YOU THE DOOR.')}</div>`));
    }
    if (nc.step === 'owner') {
      const sw = (key) => DATA.BODY_COLORS.map(c => `<button class="swatch ${nc[key] === c ? 'sel' : ''}" style="background:${c}" data-act="ncColor" data-arg="${key}|${c}" aria-label="${c}"></button>`).join('');
      return render(page('TEAM OWNER', `<div class="cols"><div class="col narrow">
        <div class="panel"><div class="small">YOUR NAME</div><input id="nc-profile" class="txt" maxlength="14" value="${U.esc(nc.profile)}"></div>
        <div class="panel"><div class="small">TEAM NAME</div><input id="nc-team" class="txt" maxlength="22" value="${U.esc(nc.team)}"></div>
        <div class="panel"><div class="small">CAR NUMBER</div><div class="row"><button class="btn dark" data-act="ncNum" data-arg="-1">-</button><span class="big ol" style="min-width:50px;text-align:center">${nc.number}</span><button class="btn dark" data-act="ncNum" data-arg="1">+</button></div></div>
        </div><div class="col"><div class="panel" style="text-align:center">${Art.carImg({ body: nc.body, stripe: nc.stripe, num: '#141414' }, nc.number, 6)}</div>
        <div class="panel"><div class="small">BODY COLOR (A PRIMARY SPONSOR REPLACES IT)</div><div class="row">${sw('body')}</div><div class="small" style="margin-top:8px">STRIPE</div><div class="row">${sw('stripe')}</div></div>
        <div class="row"><button class="btn grey" data-act="ncBack">BACK</button><button class="btn green" style="flex:1" data-act="ncStartOwner">${T('START CAREER >', 2)}</button></div></div></div>`));
    }
    if (nc.step === 'hired') {
      if (!nc.jobs) nc.jobs = [Game.genJob(0, 0.05, 15), Game.genJob(0, 0.15, 15), Game.genJob(0, 0.28, 15)];
      const cards = nc.jobs.map(j => {
        const ov = Game.ovr(j.driver); const car = Math.round((j.parts.engine + j.parts.aero + j.parts.chassis) / 3);
        return `<div class="panel col"><div class="row">${Art.carImg(j.livery, j.number, 2)}<div><div class="ol1">${U.esc(j.name)}</div><div class="tiny">OWNER ${U.esc(j.owner)}</div></div></div>
          <div class="small" style="line-height:1.6;margin-top:4px">BUDGET ${U.money(j.budget)}<br>CAR RATING ${car} · DRIVER OVR ${ov}<br>SPONSOR: ${j.sponsor ? U.esc(j.sponsor.name) : 'NONE'}<br>TARGET: AVG ${U.ordinal(j.target)}</div>
          <button class="btn green wide" data-act="ncTakeJob" data-arg="${j.id}">TAKE JOB</button></div>`;
      }).join('');
      return render(page('HIRED MANAGER', `<div class="panel" style="margin-bottom:10px"><div class="row"><div class="small" style="flex:0 0 auto">YOUR NAME</div><input id="nc-profile" class="txt" style="flex:1" maxlength="14" value="${U.esc(nc.profile)}"><button class="btn grey" data-act="ncBack">BACK</button></div></div>
        <div class="small ol" style="margin-bottom:8px">THREE ARCA TEAMS WANT YOU. PICK ONE:</div><div class="cols">${cards}</div>`));
    }
  }

  // ---------- DRIVERS ----------
  function attrRows(d) {
    const rows = [['SPEED', d.speed], ['RACECRAFT', d.craft], ['CONSIST.', d.cons], ['TIRES', d.tires], ['DRAFTING', d.ss], ['ROAD', d.road]];
    return rows.map(([k, v]) => `<div class="stat"><span>${k}</span>${bar(v, 100, v >= 70 ? '#2ecc40' : v >= 50 ? '#ffd000' : '#ff851b')}<span>${v}</span></div>`).join('');
  }
  function drivers() {
    ui.screen = 'drivers'; const s = S(); const d = Game.myDriver();
    const mine = d ? `<div class="panel blue"><div class="row"><div class="ovr">${Game.ovr(d)}</div><div class="grow"><div class="ol1">${U.esc(Game.driverName(d))}</div><div class="tiny">AGE ${d.age} · POTENTIAL ${d.potential} · MORALE ${Math.round(d.morale)}</div></div></div>
      ${attrRows(d)}<div class="small" style="margin:6px 0">CONTRACT: ${d.contract} SEASON${d.contract > 1 ? 'S' : ''} · ${U.money(d.salary)}/RACE</div>
      <button class="btn red wide" data-act="fireAsk">RELEASE DRIVER (BUYOUT ${U.money(Game.fireCost(d))})</button></div>`
      : `<div class="panel red"><div class="big ol">NO DRIVER!</div><div class="small ol1" style="margin-top:6px;line-height:1.5">YOU CAN'T RACE WITHOUT ONE. PICK SOMEONE FROM THE MARKET. BETTER DRIVERS COST MORE AND WANT A TEAM WITH REPUTATION.</div></div>`;
    const fas = s.freeAgents.map(id => s.drivers[id]).filter(Boolean).sort((a, b) => Game.ovr(b) - Game.ovr(a));
    const list = fas.map(f => { const rep = Game.minRepFor(f); const ok = s.rep >= rep; return `<div class="list-row" data-act="driverInfo" data-arg="${f.id}"><div class="ovr" style="${ok ? '' : 'background:#999'}">${Game.ovr(f)}</div>
      <div class="grow">${U.esc(Game.driverName(f))}<div class="tiny">${f.rookie ? 'ROOKIE · ' : ''}AGE ${f.age} · POT ${f.potential}${ok ? '' : ' · NEEDS REP ' + rep}</div></div><div class="small">${U.moneyShort(Game.hireCost(f, 2))}<span class="tiny">/RACE</span></div></div>`; }).join('');
    render(page('DRIVERS', `<div class="cols"><div class="col narrow">${mine}<div class="panel small" style="line-height:1.5">YOUR REP: ${Math.round(s.rep)} · BUDGET ${U.money(s.money)}<br>SIMULATOR LV ${s.team.fac.simulator} GIVES +${(s.team.fac.simulator * 0.8).toFixed(1)} ON RACE DAY.</div></div>
      <div class="col"><div class="small ol">DRIVER MARKET (${fas.length} FREE AGENTS)</div>${list}</div></div>`));
  }
  function driverInfo(id) {
    const s = S(); const d = s.drivers[id]; if (!d) return;
    const rep = Game.minRepFor(d); const ok = s.rep >= rep;
    const opts = [1, 2, 3].map(y => { const sal = Game.hireCost(d, y); return `<button class="btn ${ok && !s.team.driverId ? 'green' : 'grey'}" style="flex:1;flex-direction:column" data-act="hire" data-arg="${id}|${y}">${y} YR<small class="tiny">${U.moneyShort(sal)}/RACE</small></button>`; }).join('');
    modal(`<div class="row"><div class="ovr">${Game.ovr(d)}</div><div class="grow"><div class="ol1">${U.esc(Game.driverName(d))}</div><div class="tiny">AGE ${d.age} · POTENTIAL ${d.potential}</div></div><button class="btn grey" data-act="closeModal">X</button></div>
      ${attrRows(d)}
      <div class="small" style="margin:6px 0;line-height:1.5">${ok ? 'INTERESTED IN YOUR TEAM.' : 'NOT INTERESTED YET - NEEDS TEAM REP ' + rep + ' (YOU: ' + Math.round(s.rep) + ').'}${s.team.driverId ? '<br>RELEASE YOUR CURRENT DRIVER FIRST.' : ''}<br>SIGNING BONUS: ${Game.signingBonus(d, 2) ? U.money(Game.signingBonus(d, 2)) + ' (2 RACES OF SALARY)' : 'NONE - ROOKIE DEAL'}.</div>
      <div class="row">${opts}</div>`);
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
      <div class="panel"><table class="tbl"><tr><th>TRACK TYPE</th><th>RATING</th></tr>${tr}</table></div>
      <div class="panel small" style="line-height:1.5">ENGINEERING POINTS: ${Math.floor(s.ep)} (+${Game.epPerWeek()}/WEEK FROM SHOP & ENGINE DEPT). R&D TIME SHRINKS WITH SHOP LEVEL. DAYS PASS ON RACE WEEKS (7 PER RACE).</div></div>
      <div class="col">${parts}</div></div>`));
  }
  // ---------- FACILITIES ----------
  const facEffect = (k, l) => ({
    shop: `R&D ${Math.max(3, Math.round(10 - l * 1.5))} DAYS · +${(l * 0.6).toFixed(1)} PART GAIN · +${l * 2} EP/WK`,
    engineDept: `+${(l * 1.5).toFixed(1)} ENGINE · RELIABILITY ${55 + l * 7}`,
    simulator: `+${(l * 0.8).toFixed(1)} DRIVER ON RACE DAY · YOUNG DRIVER GROWTH`,
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
    if (!sp) return `<div class="panel col empty"><div class="small">${slot === 'primary' ? 'PRIMARY' : 'ASSOCIATE ' + (idx + 1)}</div><div class="big ol" style="margin:10px 0">EMPTY</div><div class="tiny">SIGN AN OFFER BELOW.</div></div>`;
    return `<div class="panel col"><div class="small">${slot === 'primary' ? 'PRIMARY (YOUR PAINT SCHEME)' : 'ASSOCIATE ' + (idx + 1)}</div>
      <div style="margin:5px 0"><span class="sp-name ol1" style="background:${sp.colors[0]}">${U.esc(sp.name)}</span></div>
      <div class="small" style="line-height:1.5">${U.money(sp.perRace)}/RACE · ${sp.races} RACES LEFT<br><span style="color:#ffd000">${Game.goalText(sp.goal)}</span><br>GOALS MET ${sp.met}/${sp.done}</div>
      <button class="btn red wide" style="margin-top:6px" data-act="dropAsk" data-arg="${slot}|${idx}">DROP (FEE ${U.moneyShort(Game.dropPenalty(sp))})</button></div>`;
  }
  function sponsors() {
    ui.screen = 'sponsors'; const s = S(); const sp = s.team.sponsors;
    const offers = s.offers.map(o => `<div class="panel col" style="min-width:220px"><div class="row"><span class="sp-name ol1" style="background:${o.colors[0]};border-color:#1b1b1b">${U.esc(o.name)}</span>${o.renewal ? '<span class="tag">RENEWAL</span>' : ''}</div>
      <div class="small" style="line-height:1.55;margin-top:4px">${o.slot === 'primary' ? 'PRIMARY' : 'ASSOCIATE'} · ${o.races} RACES<br>${U.money(o.perRace)}/RACE + ${U.money(o.signing)} TO SIGN<br><span style="color:#ffd000">${Game.goalText(o.goal)}</span><br><span class="tiny">EXPIRES IN ${o.weeksLeft} WEEK${o.weeksLeft > 1 ? 'S' : ''}</span></div>
      ${o.slot === 'primary' ? `<div style="margin:4px 0">${Art.carImg({ body: o.colors[0], stripe: o.colors[1], num: '#141414' }, s.team.number, 2)}</div>` : ''}
      <button class="btn green wide" data-act="sign" data-arg="${o.id}">SIGN</button></div>`).join('');
    render(page('SPONSORS', `<div class="cols">${spCard(sp.primary, 'primary', 0)}${spCard(sp.assoc[0], 'assoc', 0)}${spCard(sp.assoc[1], 'assoc', 1)}</div>
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
      const t = DATA.TRACKS[tid]; const res = s.results[i]; const me = res && res.order.find(o => o.id === 'P');
      const next = !s.seasonOver && i === s.week - 1;
      return `<div class="panel cal-card ${next ? 'red' : ''}"><div class="row"><span class="tag">R${i + 1}</span>${next ? '<span class="tag" style="background:#ffd000;color:#1b1b1b">NEXT</span>' : ''}${me ? `<span class="tag" style="background:#2e9b3a">P${me.pos}</span>` : ''}</div>
        <img class="pix" src="${previewURL(tid, 140, 84)}" style="width:128px;height:76px;margin:6px 0;border:2px solid #1b1b1b" alt="">
        <div class="small ol1">${t.short}</div><div class="tiny">${DATA.TYPES[t.type].name} · ${DATA.TYPES[t.type].laps} LAPS</div><div class="tiny">${t.city}</div></div>`;
    }).join('');
    render(page('CALENDAR', `<div class="small ol" style="margin-bottom:6px">${s.year} ${Game.ser().name} - 10 RACES, 3 STAGES EACH. STAGE TOP 10 SCORE 10-1 POINTS.${s.seriesIdx === 3 ? ' TOP 8 MAKE THE PLAYOFFS AFTER RACE 7; CHAMPIONSHIP 4 AFTER RACE 9.' : ''}</div><div class="hscroll">${cards}</div>`));
  }
  // ---------- STANDINGS ----------
  function standings() {
    ui.screen = 'standings'; const s = S(); const tab = ui.standTab;
    const tabs = ['points', 'last', 'history'].map(t => `<button class="btn ${tab === t ? 'orange sel' : 'dark'}" data-act="standTab" data-arg="${t}">${({ points: 'POINTS', last: 'LAST RACE', history: 'MY HISTORY' })[t]}</button>`).join('');
    let body = '';
    if (tab === 'points') {
      const ord = Game.standingsOrder(); const leader = s.standings[ord[0]].pts;
      body = `<table class="tbl"><tr><th>POS</th><th>#</th><th>DRIVER</th><th>TEAM</th><th>PTS</th><th>GAP</th><th>W</th><th>T5</th><th>DNF</th></tr>${ord.map((id, i) => {
        const e = Game.entryInfo(id), st = s.standings[id]; const po = s.playoff && s.playoff.ids.includes(id);
        return `<tr class="${id === 'P' ? 'me' : ''} ${po ? 'po' : ''}"><td>${i + 1}${s.playoff && s.playoff.final4 && s.playoff.final4.includes(id) ? '*' : ''}</td><td><span class="tag" style="background:${e.livery.body}">${e.number}</span></td><td>${U.esc(e.driver)}</td><td class="tiny">${U.esc(e.team)}</td><td>${st.pts}</td><td>${i ? '-' + (leader - st.pts) : '--'}</td><td>${st.wins}</td><td>${st.top5}</td><td>${st.dnf}</td></tr>`;
      }).join('')}</table>${s.playoff ? '<div class="tiny" style="margin-top:6px">YELLOW EDGE = PLAYOFF DRIVER · * = CHAMPIONSHIP 4</div>' : ''}`;
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
      const e = Game.entryInfo(o.id); return `<tr class="${o.id === 'P' ? 'me' : ''}"><td>${o.pos}</td><td><span class="tag" style="background:${e.livery.body}">${e.number}</span></td><td>${U.esc(e.driver)}</td><td>${o.grid || '-'}</td><td>${o.laps}</td><td>${o.lapsLed}</td><td>${o.status}</td><td>${o.pts || 0}</td></tr>`;
    }).join('')}</table>`;
  }
  // ---------- NEWS ----------
  function newsScreen() {
    ui.screen = 'news'; const s = S();
    render(page('NEWS', s.news.map((n, i) => `<div class="panel ${i === 0 ? 'red' : ''}" style="margin-bottom:6px"><span class="tag">S${n.s} W${n.w}</span> <span class="small ol1">${U.esc(n.text)}</span></div>`).join('') || '<div class="panel">NO NEWS.</div>'));
  }
  // ---------- PROFILE / SAVE ----------
  function profile() {
    ui.screen = 'profile'; const s = S();
    render(page('PROFILE & SAVE', `<div class="cols"><div class="col">
      ${s ? `<div class="panel"><div class="small">MANAGER NAME</div><div class="row"><input id="pf-name" class="txt" style="flex:1" maxlength="14" value="${U.esc(s.profile)}"><button class="btn green" data-act="rename">SAVE</button></div>
        <div class="small" style="margin-top:8px">LEVEL ${s.level} · XP ${s.xp}/${s.level * DATA.XP_PER_LEVEL} · REP ${Math.round(s.rep)}</div></div>` : ''}
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
    if (!s.team.driverId) { modal(`<div class="big ol">NO DRIVER</div><div class="small" style="margin:8px 0 12px">YOU NEED TO HIRE A DRIVER BEFORE RACE DAY.</div><div class="row" style="justify-content:flex-end"><button class="btn grey" data-act="closeModal">LATER</button><button class="btn green" data-act="go" data-arg="drivers">GO TO DRIVERS</button></div>`); return; }
    ui.screen = 'prep';
    const tid = s.schedule[s.week - 1]; const t = DATA.TRACKS[tid]; const ty = DATA.TYPES[t.type];
    if (!ui.prep || ui.prep.week !== s.week || ui.prep.season !== s.season) ui.prep = { week: s.week, season: s.season, stage: 'practice', setup: null, grid: null, style: 'balanced', ask: true, mode: 'normal' };
    const P = ui.prep; s.day = P.stage === 'practice' ? 5 : 6;
    const d = Game.myDriver();
    const info = `<div class="panel" style="text-align:center"><img class="pix" src="${previewURL(tid, 200, 120)}" style="width:100%;max-width:240px;border:2px solid #1b1b1b" alt="">
      <div class="ol1" style="margin-top:4px">${t.name}</div><div class="tiny">${ty.name} · ${ty.laps} LAPS · STAGES END LAP ${ty.stages.join(' & ')} · FUEL ~${ty.fuelLaps} LAPS</div></div>
      <div class="panel small" style="line-height:1.6">YOUR CAR HERE: ${Math.round(Game.carRating(t.type))} (FIELD AVG ${Math.round(Game.fieldAvgCar())})<br>DRIVER: ${U.esc(Game.driverShort(d))} · ${Math.round(Game.driverTypeRating(d, t.type))} ${typeShort(t.type)} RATING</div>`;
    if (P.stage === 'practice') {
      const fb = U.pick(['"THE CAR IS A LITTLE LOOSE OFF TURN 4."', '"WE NEED MORE TURN IN, IT\'S TIGHT IN THE CENTER."', '"FEELS GOOD ON THE LONG RUN!"', '"REAR TIRES ARE GOING AWAY FAST."', '"THE BALANCE IS CLOSE. LET\'S DIAL IT IN."']);
      const opt = (k, title, desc, col) => `<button class="btn ${col}" style="flex:1;min-height:90px;flex-direction:column;gap:6px" data-act="setup" data-arg="${k}">${T(title, 2)}<span class="tiny" style="text-transform:none">${desc}</span></button>`;
      render(page('PRACTICE - DAY 5', `<div class="cols"><div class="col narrow">${info}</div><div class="col"><div class="panel blue"><div class="small">DRIVER RADIO:</div><div class="ol1">${fb}</div></div>
        <div class="small ol">PICK THE SETUP FOR THE WEEKEND:</div><div class="row">${opt('qual', 'QUALIFY TRIM', 'BETTER STARTING SPOT, SLIGHTLY SLOWER IN THE RACE', 'orange')}${opt('bal', 'BALANCED', 'A LITTLE BIT OF EVERYTHING', 'blue')}${opt('race', 'RACE TRIM', 'STEADIER ON LONG RUNS, FEWER MISTAKES', 'green')}</div></div></div>`));
    } else {
      const grid = P.grid; const myPos = grid.findIndex(e => e.id === 'P') + 1;
      const rows = grid.slice(0, 12).map((e, i) => `<div class="list-row ${e.id === 'P' ? 'me' : ''}" style="min-height:30px;cursor:default"><b style="width:22px">${i + 1}</b><span class="tag" style="background:${e.livery.body}">${e.number}</span><span class="grow">${U.esc(e.driverShort)}</span></div>`).join('') + (myPos > 12 ? `<div class="list-row me" style="min-height:30px"><b style="width:22px">${myPos}</b><span class="grow">${U.esc(Game.driverShort(d))} (YOU)</span></div>` : '');
      const sb = (k, l) => `<button class="btn ${P.style === k ? 'orange sel' : 'dark'}" style="flex:1" data-act="prepStyle" data-arg="${k}">${l}</button>`;
      const mb = (k, l) => `<button class="btn ${P.mode === k ? 'blue sel' : 'dark'}" style="flex:1" data-act="prepMode" data-arg="${k}">${l}</button>`;
      render(page('QUALIFYING - DAY 6', `<div class="cols"><div class="col narrow"><div class="panel red" style="text-align:center"><div class="small">YOU QUALIFIED</div><div class="ol" style="font-size:40px">P${myPos}</div><div class="small">OF ${grid.length}</div></div>${info}</div>
        <div class="col"><div class="panel"><h3>STRATEGY</h3><div class="small">CREW CHIEF STYLE (USED WHEN YOU SKIP OR AUTO-CALL)</div><div class="row" style="margin:6px 0">${sb('aggressive', 'TRACK POS')}${sb('balanced', 'BALANCED')}${sb('conservative', 'FRESH TIRES')}</div>
          <div class="small">START PACE</div><div class="row" style="margin:6px 0">${mb('push', 'PUSH')}${mb('normal', 'NORMAL')}${mb('save', 'SAVE')}</div>
          <div class="row"><button class="btn ${P.ask ? 'green' : 'dark'}" style="flex:1" data-act="prepAsk">${P.ask ? 'ASK ME ON CAUTIONS: ON' : 'ASK ME ON CAUTIONS: OFF'}</button></div></div>
          <button class="btn green wide" style="min-height:56px" data-act="startRace">${T('GO TO RACE DAY >', 2)}</button>
          <div class="panel" style="padding:6px"><div class="small" style="margin-bottom:4px">STARTING GRID</div>${rows}</div></div></div>`));
    }
  }
  // ---------- RACE ----------
  function startRace() {
    const s = S(); const P = ui.prep; s.day = 7; Game.save();
    const tid = s.schedule[s.week - 1]; const geom = new TrackGeom(tid);
    const R = { speed: 1, stopped: false, processed: false, lastTower: 0, card: false, ticker: { text: '', kind: 'info', t: 0 } };
    ui.race = R; ui.screen = 'race';
    R.race = new RaceSim.Race({ geom, grid: P.grid, playerId: 'P', style: P.style, mode: P.mode, autoPlayer: !P.ask, onEvent: (t, d) => raceEvent(t, d) });
    render(`<div class="screen race"><div class="race-tower"><div class="tw-head" id="tw-head"></div><div class="tw-list" id="tw-list"></div></div>
      <div class="race-main"><canvas id="rc"></canvas><div class="race-banner green ol1" id="banner">GREEN FLAG</div><div class="race-ticker ol1" id="ticker"></div><div id="pitcard"></div></div>
      <div class="race-side" id="side"></div></div>`);
    R.view = new Renderer.RaceView($('#rc'), R.race);
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
    const btn = (k, col, sub) => `<button class="btn ${col} ${d.suggestion === k ? 'suggest' : ''}" data-act="pitChoice" data-arg="${k}">${PIT_LABEL[k]}<small>${sub}</small></button>`;
    el.innerHTML = `<div class="pitcard"><div class="panel"><div class="row"><span class="tag" style="background:#ffd000;color:#1b1b1b">CAUTION</span><b class="grow ol1">PIT ROAD IS OPEN!</b></div>
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
    const p = race.player(); const m = p ? p.mode : 'normal';
    const mb = (k, col) => `<button class="btn ${m === k ? col + ' sel' : 'dark'}" data-act="raceMode" data-arg="${k}">${k === 'normal' ? 'NORM' : k.toUpperCase()}</button>`;
    el.innerHTML = `<div class="seg c3">${sp(1)}${sp(4)}<button class="btn orange" data-act="raceSkip">SKIP</button></div>
      <button class="btn blue" data-act="raceCam">CAM: ${R.view && R.view.mode === 'follow' ? 'FOLLOW' : 'TRACK'}</button>
      <div class="mystat" id="mystat"></div>
      <div class="seg c3">${mb('push', 'red')}${mb('normal', 'blue')}${mb('save', 'green')}</div>
      <button class="btn red" id="pitbtn" data-act="racePit">PIT NOW</button>`;
    updateSide();
  }
  function updateSide() {
    const R = ui.race; if (!R) return; const race = R.race; const p = race.player(); const el = $('#mystat'); if (!el || !p) return;
    const pos = race.positionOf(p);
    const status = p.status === 'dnf' ? 'OUT: ' + p.reason : p.status === 'fin' ? 'FINISHED' : p.pit ? (p.pit.phase === 'wait' ? 'PITTING NEXT LAP' : 'ON PIT ROAD') : (race.flag === 'yellow' ? 'UNDER CAUTION' : 'RUNNING');
    el.innerHTML = `<div class="row" style="justify-content:space-between"><span class="ol1" style="font-size:18px">P${pos}</span><span>#${p.e.number}</span></div><div>${status}</div>
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
    let show = ord.slice(0, maxRows); const pIdx = ord.findIndex(c => c.isPlayer);
    if (pIdx >= maxRows) show = ord.slice(0, maxRows - 1).concat([ord[pIdx]]);
    list.innerHTML = show.map(c => {
      const i = ord.indexOf(c); let gap = '';
      if (c.status === 'dnf') gap = 'OUT'; else if (c.pit && c.pit.phase !== 'wait') gap = 'PIT';
      else if (i === 0) gap = race.phase === 'racing' ? 'LEAD' : 'WIN';
      else { const dl = lead.status === 'fin' && c.status === 'fin' ? lead.laps - c.laps : (lead.status === 'fin' ? lead.laps : lead.d) - c.d; gap = dl >= 1 ? '-' + Math.floor(dl) + 'L' : '+' + (dl * race.lapTime * 3).toFixed(1); }
      const cls = c.isPlayer ? 'me' : c.status === 'dnf' ? 'out' : (c.pit && c.pit.phase !== 'wait') ? 'pit' : '';
      return `<div class="tw-row ${cls}"><b>${i + 1}</b><span class="sw" style="background:${c.e.livery.body}"></span><span>#${c.e.number}</span><span class="nm"><span>${U.esc(c.e.driverShort.split(' ').pop().slice(0, 8))}</span><span class="gap">${gap}</span></span></div>`;
    }).join('');
  }
  function finishRaceAndShowResults() {
    const R = ui.race; if (!R) return;
    if (!R.processed) {
      R.processed = true; R.stopped = true;
      const p = R.race.player();
      ui.summary = Game.processRace(R.race.results(), p ? p.damage : 0);
    }
    ui.race = null; results();
  }
  // ---------- RESULTS ----------
  function results() {
    ui.screen = 'results'; const s = S(); const sum = ui.summary; if (!sum) return hub();
    const r = s.results[s.results.length - 1]; const me = sum.me;
    const lines = sum.lines.map(([k, v]) => `<div class="row" style="justify-content:space-between"><span>${k}</span><span style="color:${v < 0 ? '#ff6b6b' : '#7dff7d'}">${v < 0 ? '-' : '+'}${U.money(Math.abs(v))}</span></div>`).join('');
    render(page('RACE RESULTS', `<div class="cols"><div class="col narrow"><div class="panel ${me.pos === 1 ? 'orange' : me.pos <= 10 ? 'green' : 'red'}" style="text-align:center">
      <div class="small">${DATA.TRACKS[sum.track].short}</div><div class="ol" style="font-size:44px">P${me.pos}</div><div class="small ol1">${me.status === 'RUNNING' ? (me.pos === 1 ? 'VICTORY!' : 'FINISHED') : 'DNF - ' + me.status} · STARTED ${me.grid}</div>
      <div class="small ol1" style="margin-top:4px">+${me.pts} PTS (${me.stagePts} STAGE) · NOW ${U.ordinal(sum.standPos)} IN POINTS</div></div>
      <div class="panel small" style="line-height:1.7">${lines}<div class="row" style="justify-content:space-between;border-top:2px solid #1b1b1b;margin-top:4px"><b>NET</b><b style="color:${sum.net < 0 ? '#ff6b6b' : '#7dff7d'}">${sum.net < 0 ? '-' : '+'}${U.money(Math.abs(sum.net))}</b></div></div>
      <div class="panel small" style="line-height:1.6">REP ${sum.repD >= 0 ? '+' : ''}${sum.repD.toFixed(1)} · XP +${sum.xp}${sum.levelUp ? ' · <span style="color:#ffd000">LEVEL UP! LV ' + s.level + '</span>' : ''}${sum.confD !== undefined ? '<br>BOSS CONFIDENCE ' + (sum.confD >= 0 ? '+' : '') + sum.confD.toFixed(0) + ' (NOW ' + Math.round(s.hired ? s.hired.confidence : 0) + '%)' : ''}</div>
      <button class="btn green wide" style="min-height:56px" data-act="afterResults">${T('CONTINUE >', 2)}</button></div>
      <div class="col"><div class="panel" style="padding:4px">${resultsTable(r)}</div></div></div>`));
  }
  function afterResults() {
    const s = S(); const sum = ui.summary; ui.summary = null;
    if (s.gameOver) { modal(`<div class="big ol">BANKRUPT!</div><div class="small" style="margin:8px 0 12px;line-height:1.5">THE MONEY RAN OUT. ${U.esc(s.team.name)} CLOSES ITS DOORS. YOU CAN START A FRESH CAREER.</div><button class="btn green wide" data-act="newCareerYes">NEW CAREER</button>`); return; }
    if (s.firedPending) return firedScreen();
    if (s.seasonOver) return seasonEnd();
    hub(); if (sum && sum.levelUp) toast('LEVEL UP! YOU ARE NOW LEVEL ' + s.level);
  }
  // ---------- SEASON END ----------
  function seasonEnd() {
    ui.screen = 'seasonEnd'; const s = S(); const ss = Game.seasonSummary(); const sr = Game.ser();
    const champ = Game.entryInfo(ss.champion); const cupChamp = ss.pos === 1 && s.seriesIdx === 3;
    let opts = '';
    if (s.mode === 'owner') {
      if (ss.promo) {
        const nx = DATA.SERIES[ss.promo.next];
        opts += ss.promo.eligible ? `<div class="panel green"><h3 class="ol1">YOU'VE BEEN SCOUTED!</h3><div class="small ol1" style="line-height:1.5">THE ${nx.name} WANTS YOU. BUY-IN: ${U.money(ss.promo.cost)}${ss.pos === 1 ? ' (CHAMPION DISCOUNT!)' : ''}. ${nx.cars} CARS, TOUGHER RIVALS, MUCH BIGGER MONEY.</div>
          <button class="btn ${ss.promo.afford ? 'orange' : 'grey'} wide" style="margin-top:8px" data-act="seasonChoice" data-arg="promote">${ss.promo.afford ? 'MOVE UP TO ' + nx.short + ' (' + U.moneyShort(ss.promo.cost) + ')' : 'NEED ' + U.moneyShort(ss.promo.cost) + ' TO MOVE UP'}</button></div>`
          : `<div class="panel"><div class="small" style="line-height:1.5">TO MOVE UP TO THE ${nx.name} YOU NEED A TOP-5 POINTS FINISH OR 2 WINS, PLUS ${U.money(nx.buyIn)}.</div></div>`;
      }
      opts += `<button class="btn blue wide" style="min-height:56px" data-act="seasonChoice" data-arg="stay">${s.seriesIdx === 3 ? 'RUN ANOTHER CUP SEASON' : 'STAY IN ' + sr.short + ' NEXT SEASON'}</button>`;
    } else {
      opts += s.jobOffers.map(j => `<div class="panel ${j.seriesIdx > s.seriesIdx ? 'green' : ''}"><div class="row">${Art.carImg(j.livery, j.number, 2)}<div class="grow"><div class="ol1">${U.esc(j.name)}</div><div class="tiny">${DATA.SERIES[j.seriesIdx].name} · OWNER ${U.esc(j.owner)}</div></div></div>
        <div class="small" style="margin:4px 0">BUDGET ${U.money(j.budget)} · CAR ${Math.round((j.parts.engine + j.parts.aero + j.parts.chassis) / 3)} · DRIVER ${Game.ovr(j.driver)} · TARGET ${U.ordinal(j.target)}</div>
        <button class="btn orange wide" data-act="seasonChoice" data-arg="job|${j.id}">ACCEPT OFFER</button></div>`).join('');
      if (!s.jobOffers.length) opts += '<div class="panel small">NO OFFERS FROM OTHER TEAMS THIS TIME. FINISH TOP 5 TO GET NOTICED.</div>';
      opts += `<button class="btn blue wide" style="min-height:56px" data-act="seasonChoice" data-arg="stay">STAY WITH ${U.esc(s.team.name)}</button>${ss.firedRisk ? '<div class="small ol">WARNING: THE BOSS IS UNHAPPY. STAYING MIGHT NOT BE YOUR CALL.</div>' : ''}`;
    }
    render(page('SEASON COMPLETE', `<div class="cols"><div class="col narrow"><div class="panel ${ss.pos === 1 ? 'orange' : 'red'}" style="text-align:center"><div class="small">${s.year} ${sr.name}</div>
      <div class="ol" style="font-size:40px">${U.ordinal(ss.pos)}</div><div class="small ol1">${ss.pts} PTS · ${ss.wins} WINS · ${ss.top5} TOP 5</div>${cupChamp ? '<div class="ol" style="margin-top:6px;font-size:18px">CUP SERIES CHAMPION!</div>' : ss.pos === 1 ? '<div class="ol" style="margin-top:6px">CHAMPIONS!</div>' : ''}</div>
      <div class="panel small" style="line-height:1.6">CHAMPION: #${champ.number} ${U.esc(champ.driver)} (${U.esc(champ.team)})<br>POINTS-FUND PRIZE: ${U.money(ss.prize)}<br>BANK: ${U.money(s.money)}</div></div>
      <div class="col">${opts}</div></div>`));
  }
  function firedScreen() {
    ui.screen = 'fired'; const s = S();
    const cards = s.jobOffers.map(j => `<div class="panel col"><div class="row">${Art.carImg(j.livery, j.number, 2)}<div class="grow"><div class="ol1">${U.esc(j.name)}</div><div class="tiny">${DATA.SERIES[j.seriesIdx].name}</div></div></div>
      <div class="small" style="margin:4px 0;line-height:1.5">BUDGET ${U.money(j.budget)}<br>CAR ${Math.round((j.parts.engine + j.parts.aero + j.parts.chassis) / 3)} · DRIVER ${Game.ovr(j.driver)}<br>TARGET ${U.ordinal(j.target)}</div><button class="btn green wide" data-act="takeJob" data-arg="${j.id}">TAKE JOB</button></div>`).join('');
    render(page('YOU\'RE FIRED!', `<div class="panel red" style="margin-bottom:10px"><div class="ol1">${U.esc(s.hired ? s.hired.owner : 'THE OWNER')} LET YOU GO. BUT YOUR PHONE IS RINGING...</div></div><div class="cols">${cards}</div>`));
    const back = $('.back'); if (back) back.remove();
  }

  // ---------- actions ----------
  const SCREENS = { hub, career, drivers, garage, facilities, sponsors, calendar, standings, news: newsScreen, profile, prep, seasonEnd, results };
  function go(name) { closeModal(); if (ui.race && name !== 'race') { ui.race.stopped = true; ui.race = null; } (SCREENS[name] || hub)(); const pb = $('.page-body'); if (pb) pb.scrollTop = 0; }
  function refresh() { const f = SCREENS[ui.screen]; if (f && ui.screen !== 'race') f(); }
  const A = {
    go: (a) => go(a), closeModal, confirmYes: () => { const cb = confirmCb; closeModal(); if (cb) cb(); },
    needCareer: () => toast('START A CAREER FIRST - TAP NEW CAREER'),
    ncMode: (m) => { ui.nc.step = m; newCareerScreen(); },
    ncBack: () => { ui.nc.step = 'mode'; newCareerScreen(); },
    ncColor: (a) => { const [k, c] = a.split('|'); readNC(); ui.nc[k] = c; newCareerScreen(); },
    ncNum: (a) => { readNC(); ui.nc.number = ((ui.nc.number - 1 + +a + 99) % 99) + 1; newCareerScreen(); },
    ncStartOwner: () => { readNC(); const nc = ui.nc; Game.newCareer({ mode: 'owner', profile: nc.profile || 'MANAGER', teamName: (nc.team || 'MY RACING').toUpperCase(), number: nc.number, colors: { body: nc.body, stripe: nc.stripe } }); ui.nc = null; ui.artCache = {}; hub(); toast('CAREER STARTED! BUY A CAR IN THE GARAGE.'); },
    ncTakeJob: (id) => { readNC(); const nc = ui.nc; const job = nc.jobs.find(j => j.id === id); Game.newCareer({ mode: 'hired', profile: nc.profile || 'MANAGER', job }); ui.nc = null; ui.artCache = {}; hub(); toast('WELCOME TO ' + job.name + '!'); },
    newCareerAsk: () => confirmBox('START OVER? YOUR CURRENT CAREER WILL BE DELETED (EXPORT A SAVE CODE FIRST IF YOU WANT TO KEEP IT).', 'DELETE & START', () => A.newCareerYes(), 'red'),
    newCareerYes: () => { closeModal(); Game.wipe(); ui.nc = null; ui.artCache = {}; go('career'); },
    driverInfo: (id) => driverInfo(id),
    hire: (a) => { const [id, y] = a.split('|'); const err = Game.hireDriver(id, +y); if (err) return toast(err); closeModal(); drivers(); toast('DRIVER SIGNED!'); },
    fireAsk: () => { const d = Game.myDriver(); confirmBox('RELEASE ' + Game.driverName(d) + '? BUYOUT COSTS ' + U.money(Game.fireCost(d)) + '.', 'RELEASE', () => { Game.fireDriver(); drivers(); }, 'red'); },
    buyCar: (id) => { const e = Game.buyCar(id); if (e) return toast(e); ui.artCache = {}; garage(); toast('CAR BOUGHT! NOW HIRE A DRIVER.'); },
    rnd: (p) => { const e = Game.startRnd(p); if (e) return toast(e); garage(); toast('R&D STARTED'); },
    build: (k) => { const e = Game.startBuild(k); if (e) return toast(e); facilities(); toast('CONSTRUCTION STARTED'); },
    sign: (id) => { const e = Game.signSponsor(id); if (e) return toast(e); ui.artCache = {}; sponsors(); toast('SPONSOR SIGNED!'); },
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
    raceMode: (m) => { ui.race.race.setMode(m); renderSide(); },
    raceCam: () => { const v = ui.race.view; v.setMode(v.mode === 'follow' ? 'full' : 'follow'); renderSide(); },
    racePit: () => {
      const el = $('#pitcard'); const R = ui.race; if (!R || R.race.phase === 'done') return;
      el.innerHTML = `<div class="pitcard"><div class="panel"><b class="ol1">CALL YOUR DRIVER IN?</b><div class="tiny" style="margin-top:4px">GREEN-FLAG STOPS COST ABOUT HALF A LAP.</div><div class="pitgrid">
        <button class="btn green" data-act="pitNow" data-arg="four">4 TIRES<small>+ FUEL</small></button><button class="btn blue" data-act="pitNow" data-arg="two">2 TIRES<small>+ FUEL</small></button>
        <button class="btn orange" data-act="pitNow" data-arg="fuel">FUEL ONLY<small>SPLASH</small></button><button class="btn grey" data-act="pitNow" data-arg="cancel">CANCEL<small>STAY OUT</small></button></div></div></div>`;
    },
    pitNow: (k) => { $('#pitcard').innerHTML = ''; if (k !== 'cancel') ui.race.race.requestPit(k); updateSide(); },
    pitChoice: (k) => { const R = ui.race; R.card = false; $('#pitcard').innerHTML = ''; R.race.playerCautionChoice(k); updateSide(); },
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
    if (ui.race && ui.race.view) { ui.race.view.resize(); updateTower(); return; }
    if (ui.screen === 'hub') hub();
  }
  return { hub, go, onClick, onResize, toast, ui, refresh };
})();
