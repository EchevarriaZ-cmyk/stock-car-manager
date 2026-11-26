/* v1.4 game settings that live outside the career save (race length, tutorial). Free Mode and careers both read them. */
'use strict';
const SETTINGS = (() => {
  const KEY = 'scm_settings';
  // race length: share of the standard lap count. Fuel windows and tire wear scale too, so stops stay sensible.
  const RACE_LENS = [
    { id: 'sprint', name: 'SPRINT', mult: 0.4, desc: 'ABOUT 40% OF THE LAPS · 0-1 STOPS' },
    { id: 'short', name: 'SHORT', mult: 0.65, desc: 'ABOUT TWO THIRDS · 1-2 STOPS' },
    { id: 'standard', name: 'STANDARD', mult: 1, desc: 'THE NORMAL LENGTH' },
    { id: 'long', name: 'LONG', mult: 1.5, desc: '50% MORE LAPS · MORE STOPS' },
  ];
  const D = { raceLen: 'standard', tut: '', raceView: 'classic', q3d: 'high' }; // v1.7: race view (classic 2D / 3D) + 3D quality
  let v = Object.assign({}, D);
  try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && typeof j === 'object') v = Object.assign({}, D, j); } catch (e) {}
  if (!RACE_LENS.some(r => r.id === v.raceLen)) v.raceLen = 'standard';
  if (v.raceView !== '3d') v.raceView = 'classic'; if (v.q3d !== 'low') v.q3d = 'high';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  return {
    RACE_LENS,
    get raceLen() { return v.raceLen; },
    set raceLen(id) { if (RACE_LENS.some(r => r.id === id)) { v.raceLen = id; save(); } },
    raceMult() { const r = RACE_LENS.find(x => x.id === v.raceLen); return r ? r.mult : 1; },
    raceLenName() { const r = RACE_LENS.find(x => x.id === v.raceLen); return r ? r.name : 'STANDARD'; },
    // tutorial state: '' = never offered, 'offered', 'skipped', 'done'
    get raceView() { return v.raceView; },
    set raceView(m) { v.raceView = m === '3d' ? '3d' : 'classic'; save(); },
    get q3d() { return v.q3d; },
    set q3d(q) { v.q3d = q === 'low' ? 'low' : 'high'; save(); },
    get tut() { return v.tut; },
    set tut(s) { v.tut = s; save(); },
  };
})();
