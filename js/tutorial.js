/* v1.4 tutorial: a short, skippable tour with a throwaway practice team (the real save is never touched).
   It spotlights the real screens: hub tiles, buying a kart, hiring a driver, practice setup, the race-day pit wall,
   and the results/money screen. Touch: NEXT / SKIP buttons. Keyboard: Enter, Space or Right = next, Esc = skip. */
'use strict';
const TUT = (() => {
  let step = -1, root = null, hadCareer = false;
  const $ = (q) => document.querySelector(q);
  const tap = () => (VIEW.desktop ? 'CLICK' : 'TAP');
  const raceR = () => UI.ui.race;
  const STEPS = [
    { title: 'WELCOME, BOSS!', text: () => 'YOU RUN A RACE TEAM. YOU ARE THE OWNER, NOT THE DRIVER. THIS QUICK TOUR USES A PRACTICE TEAM, SO YOUR REAL SAVE IS SAFE.',
      enter: () => { Game.startDemo(); UI.ui.artCache = {}; UI.ui.prep = null; UI.hub(); } },
    { title: 'YOUR MONEY', sel: '.topbar .tb-right', text: () => 'THIS IS YOUR BANK. RACES PAY PRIZE MONEY. CARS, DRIVERS AND UPGRADES COST MONEY. TRY NOT TO GO INTO THE RED.' },
    { title: 'THE HUB', sel: '.hub-grid2', text: () => 'THESE TILES RUN YOUR TEAM. ' + tap() + ' A TILE TO OPEN IT. THE BIG GO RACE TILE TAKES YOU TO RACE WEEK.' },
    { title: 'STEP 1: A RIDE', sel: '.hub-grid2 [data-arg="garage"]', text: () => 'EVERY CAREER STARTS IN KARTS. FIRST YOU NEED A KART. THE GARAGE SELLS CHEAP USED ONES.' },
    { title: 'BUY A KART', sel: '[data-act="buyCar"]', all: true, text: () => 'PICK ONE YOU CAN AFFORD. KEEP SOME MONEY FOR A DRIVER. PRESS NEXT AND WE BUY THE CHEAPEST ONE FOR YOU.',
      enter: () => UI.go('garage') },
    { title: 'BOUGHT IT!', sel: '.page-body .col.narrow .panel', text: () => 'THIS IS YOUR KART. LATER YOU SPEND MONEY HERE ON R&D TO MAKE THE ENGINE, AERO AND CHASSIS FASTER.',
      enter: () => { const lot = DATA.usedLot(Game.S.seriesIdx).slice().sort((a, b) => a.price - b.price); Game.buyCar(lot[0].id); UI.ui.artCache = {}; UI.go('garage'); } },
    { title: 'STEP 2: A DRIVER', sel: '.page-body [data-act="driverInfo"]', first: true, text: () => 'NOW HIRE A DRIVER. STARS SHOW SKILL. THE PRICE IS PER RACE. YOUNG DRIVERS ARE CHEAP AND GET BETTER.',
      enter: () => { UI.ui.drvTab = 'market'; UI.go('drivers'); } },
    { title: 'HIRED!', sel: '.page-body', text: () => 'YOUR DRIVER DRIVES THE KART. YOU MAKE THE CALLS FROM THE PIT WALL.',
      enter: () => { const s = Game.S; const fa = s.freeAgents.map(id => s.drivers[id]).filter(d => d && Game.minRepFor(d) <= s.rep).sort((a, b) => Game.signingBonus(a, 1) - Game.signingBonus(b, 1));
        if (fa[0]) Game.hireDriver(fa[0].id, 1, 'car1'); UI.ui.drvTab = 'team'; UI.go('drivers'); } },
    { title: 'RACE WEEK: SETUP', sel: '[data-act="setup"]', all: true, text: () => 'FIRST PICK A SETUP. QUALIFY TRIM = BETTER START. RACE TRIM = STEADIER. BALANCED IS A SAFE PICK.',
      enter: () => { UI.ui.prep = null; UI.go('prep'); } },
    { title: 'QUALIFYING', sel: '[data-act="startRace"]', text: () => 'YOU QUALIFIED! HERE YOU PICK A STRATEGY. THEN GO TO RACE DAY.',
      enter: () => { UI.run('setup', 'bal'); if (UI.ui.prep) { UI.ui.prep.ask = false; UI.prep(); } } },
    { title: 'RACE DAY', sel: '#board', text: () => 'THE TRACK FILLS THE SCREEN. LEFT: THE LEADERBOARD (YOUR CAR SAYS YOU). ' + tap() + ' ITS TOP TO HIDE IT.',
      enter: () => { UI.startRace(); const R = raceR(); if (R) R.hold = 0.01; } },
    { title: 'PIT-WALL CALLS', sel: '#side .pace', text: () => 'PUSH = FASTER, BUT USES TIRES AND FUEL. NORM = STEADY. SAVE = SLOWER, BUT SAVES TIRES AND FUEL.' },
    { title: 'PIT STOPS', sel: '#pitbtn', text: () => 'PIT NOW CALLS YOUR DRIVER IN: 4 TIRES, 2 TIRES OR FUEL ONLY. UNDER A YELLOW FLAG YOU CAN ALSO STAY OUT. WATCH THE TIRE AND FUEL GAUGES.' },
    { title: 'RESULTS & MONEY', sel: '.res-money', text: () => 'AFTER THE RACE: POINTS AND MONEY. PRIZE MONEY COMES IN, COSTS GO OUT. GOOD RESULTS BRING SPONSORS, AND SPONSORS PAY EVERY RACE.',
      enter: () => { const R = raceR(); if (R) { R.race.runToEnd(); UI.finishRaceAndShowResults(); } UI.run('podiumNext'); if (UI.ui.screen !== 'results') UI.results(); } },
    { title: 'THAT\'S IT!', text: () => (hadCareer ? 'BACK TO YOUR TEAM. ' : 'NOW START YOUR OWN TEAM: ' + tap() + ' NEW CAREER. ') + 'YOU CAN PLAY THIS TOUR AGAIN IN SETTINGS ANYTIME.',
      enter: () => cleanup() },
  ];
  function cleanup() {
    const R = raceR(); if (R) { R.stopped = true; UI.ui.race = null; }
    UI.ui.summary = null; UI.ui.prep = null; if (Game.isDemo()) Game.endDemo(); UI.ui.artCache = {}; UI.ui.drvTab = null; UI.hub();
  }
  // where the frame's layout pixels are (the desktop stage is CSS-zoomed)
  function rectIn(el, frame) {
    const F = frame.getBoundingClientRect(); const z = F.width / (frame.offsetWidth || F.width) || 1;
    const r = el.getBoundingClientRect(); return { l: (r.left - F.left) / z, t: (r.top - F.top) / z, r: (r.right - F.left) / z, b: (r.bottom - F.top) / z };
  }
  function draw() {
    const st = STEPS[step]; const frame = document.getElementById('frame'); if (!root || !frame) return;
    const W = frame.offsetWidth || VIEW.w, H = frame.offsetHeight || VIEW.h;
    let box = null;
    if (st.sel) {
      let els = [...document.querySelectorAll(st.sel)].filter(e => e.getClientRects().length && !e.closest('#tut'));
      if (st.first || !st.all) els = els.slice(0, 1);
      if (els.length) {
        els[0].scrollIntoView && els[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        for (const e of els) { const r = rectIn(e, frame); box = box ? { l: Math.min(box.l, r.l), t: Math.min(box.t, r.t), r: Math.max(box.r, r.r), b: Math.max(box.b, r.b) } : r; }
        box = { l: Math.max(2, box.l - 4), t: Math.max(2, box.t - 4), r: Math.min(W - 2, box.r + 4), b: Math.min(H - 2, box.b + 4) };
      }
    }
    const ring = root.querySelector('.tut-ring'), card = root.querySelector('.tut-card');
    if (box) { Object.assign(ring.style, { display: 'block', left: box.l + 'px', top: box.t + 'px', width: (box.r - box.l) + 'px', height: (box.b - box.t) + 'px' }); root.classList.remove('nohole'); }
    else { ring.style.display = 'none'; root.classList.add('nohole'); }
    const last = step === STEPS.length - 1;
    card.innerHTML = `<div class="tut-step">${step + 1} / ${STEPS.length}</div><div class="tut-title">${PF.img(st.title, { scale: 2, shadow: '#0d0e10' })}</div><div class="tut-text">${st.text()}</div>
      <div class="tut-btns">${last ? '' : '<button class="btn grey tut-skip" type="button">SKIP</button>'}<button class="btn green tut-next" type="button">${last ? 'LET\'S GO!' : 'NEXT &gt;'}</button></div>`;
    card.querySelector('.tut-next').onclick = (e) => { e.stopPropagation(); next(); };
    const sk = card.querySelector('.tut-skip'); if (sk) sk.onclick = (e) => { e.stopPropagation(); skip(); };
    // the card goes where the spotlight is not
    const cw = Math.min(300, W - 16); card.style.width = cw + 'px';
    const ch = card.offsetHeight || 150; let cl, ct;
    if (!box) { cl = (W - cw) / 2; ct = (H - ch) / 2; }
    else {
      const cx = (box.l + box.r) / 2; const spaceR = W - box.r, spaceL = box.l;
      if (spaceR >= cw + 12 || spaceL >= cw + 12) { cl = spaceR >= spaceL ? box.r + 8 : box.l - cw - 8; ct = U.clamp((box.t + box.b) / 2 - ch / 2, 6, H - ch - 6); }
      else { cl = U.clamp(cx - cw / 2, 6, W - cw - 6); ct = box.b + 8 + ch <= H ? box.b + 8 : box.t - ch - 8 >= 0 ? box.t - ch - 8 : H - ch - 6; }
    }
    card.style.left = Math.round(cl) + 'px'; card.style.top = Math.round(ct) + 'px';
  }
  function go(i) {
    step = i; const st = STEPS[step];
    try { if (st.enter) st.enter(); } catch (e) { console.warn('tutorial step', e); }
    const R = raceR(); if (R) R.tutPause = false;
    UI.closeModal(); requestAnimationFrame(draw); setTimeout(draw, 120);
  }
  function next() { if (step >= STEPS.length - 1) return finish(); go(step + 1); }
  function finish() {
    SETTINGS.tut = 'done'; close();
    if (!Game.S) UI.go('career');
  }
  function skip() { SETTINGS.tut = SETTINGS.tut === 'done' ? 'done' : 'skipped'; cleanup(); close(); UI.toast('TOUR SKIPPED - REPLAY IT ANYTIME IN SETTINGS'); }
  function close() { if (root) root.remove(); root = null; step = -1; document.removeEventListener('keydown', onKey, true); }
  function onKey(e) {
    if (!root) return; const k = e.key;
    if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); next(); }
    else if (k === 'Escape' || k === 'Esc') { e.preventDefault(); e.stopPropagation(); if (step < STEPS.length - 1) skip(); else finish(); }
    else e.stopPropagation(); // the game behind the tour ignores keys
  }
  function start() {
    if (root) close();
    const s = Game.S; hadCareer = !!(s && !s.free && !s.demo);
    if (UI.ui.race) { UI.ui.race.stopped = true; UI.ui.race = null; }
    if (Game.isFree()) Game.endFree();
    root = document.createElement('div'); root.id = 'tut'; root.className = 'tut';
    root.innerHTML = '<div class="tut-ring"></div><div class="tut-card panel"></div>';
    root.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
    (document.getElementById('frame') || document.body).appendChild(root);
    document.addEventListener('keydown', onKey, true);
    go(0);
  }
  return { start, next, skip, get step() { return step; }, get active() { return !!root; }, refresh: () => { if (root) draw(); }, STEPS };
})();
