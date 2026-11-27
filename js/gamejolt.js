/* v1.8.1 Game Jolt trophies + score table (Game API v1.2).
   Only active when the game runs embedded on Game Jolt: the page URL then carries gjapi_username and gjapi_token.
   Guests, offline play, Free Mode and the tutorial demo never call the API. Every failure is silent.
   You are the team OWNER / manager, never the driver: trophies and the score are the team's. */
'use strict';
const GJ = (() => {
  const GAME_ID = '1122641';
  const PRIVATE_KEY = 'a42d8eb5193281383d9e616832b09f26'; // fill in the game's private key (Game Jolt > Game API > API Settings)
  const TABLE_ID = '1137081';
  const API = 'https://api.gamejolt.com/api/game/v1_2/';
  // career.js award keys -> Game Jolt trophy ids
  const TROPHIES = {
    firstStart: 317785, firstTop10: 317786, firstSponsor: 317787, kartChamp: 317788, firstPodium: 317789,
    firstPole: 317790, playoff: 317791, dodgeWin: 317792, firstWin: 317793, twoCars: 317794, million: 317795,
    indy500: 317796, indyChamp: 317797, cupChamp: 317798,
  };

  // ---------- md5 (RFC 1321), UTF-8 input, hex output ----------
  function md5(str) {
    const s = unescape(encodeURIComponent(String(str)));
    const n = s.length, words = new Array(((n + 8) >> 6) * 16 + 16).fill(0);
    for (let i = 0; i < n; i++) words[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    words[n >> 2] |= 0x80 << ((n % 4) * 8);
    words[(((n + 8) >> 6) + 1) * 16 - 2] = n * 8;
    const K = [], R = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = (Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    const len = (((n + 8) >> 6) + 1) * 16;
    for (let o = 0; o < len; o += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g; const r = i >> 4;
        if (r === 0) { f = (b & c) | (~b & d); g = i; }
        else if (r === 1) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (r === 2) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const t = d; d = c; c = b;
        const x = (a + f + K[i] + (words[o + g] | 0)) | 0, sh = R[r * 4 + (i % 4)];
        b = (b + ((x << sh) | (x >>> (32 - sh)))) | 0; a = t;
      }
      a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    let out = '';
    for (const v of [a0, b0, c0, d0]) for (let i = 0; i < 4; i++) out += ((v >>> (i * 8)) & 255).toString(16).padStart(2, '0');
    return out;
  }

  // ---------- request URLs: signature = md5(full URL without signature + private key) ----------
  function buildUrl(endpoint, params, key) {
    const q = Object.entries(Object.assign({ game_id: GAME_ID }, params, { format: 'json' }))
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    const base = API + endpoint.replace(/^\/+|\/+$/g, '') + '/?' + q;
    return base + '&signature=' + md5(base + (key === undefined ? PRIVATE_KEY : key));
  }

  // ---------- session (URL params only; no params = guest = nothing happens) ----------
  let user = '', token = '';
  try {
    if (typeof location !== 'undefined') {
      const p = new URLSearchParams(location.search);
      user = (p.get('gjapi_username') || '').trim(); token = (p.get('gjapi_token') || '').trim();
    }
  } catch (e) { user = ''; token = ''; }
  const on = !!(user && token && typeof fetch === 'function');
  let authP = null;

  function call(endpoint, params) {
    if (!on) return Promise.resolve(null);
    let url; try { url = buildUrl(endpoint, Object.assign({ username: user, user_token: token }, params)); } catch (e) { return Promise.resolve(null); }
    return fetch(url, { method: 'GET', cache: 'no-store' }).then(r => r.json()).then(j => (j && j.response) || null).catch(() => null);
  }
  const ok = (r) => !!(r && (r.success === true || r.success === 'true'));
  function auth() { if (!on) return Promise.resolve(false); if (!authP) authP = call('users/auth', {}).then(ok).catch(() => false); return authP; }

  // ---------- local bookkeeping ----------
  const SYNC_KEY = () => 'scm_gj_synced_' + user.toLowerCase(), SCORE_KEY = () => 'scm_gj_wins_' + user.toLowerCase();
  function synced() { try { return new Set(JSON.parse(localStorage.getItem(SYNC_KEY()) || '[]')); } catch (e) { return new Set(); } }
  function markSynced(id) { try { const s = synced(); s.add(id); localStorage.setItem(SYNC_KEY(), JSON.stringify([...s])); } catch (e) {} }
  function lastWins() { try { return +localStorage.getItem(SCORE_KEY()) || 0; } catch (e) { return 0; } }
  function toast(msg) { try { if (typeof UI !== 'undefined' && UI.toast) UI.toast(msg); } catch (e) {} }
  const realCareer = (S) => !!(S && S.team && !S.free && !S.demo);

  // a trophy was just earned for the first time (called from career.js award)
  function trophy(key) {
    const id = TROPHIES[key]; if (!on || !id) return Promise.resolve(false);
    return auth().then(a => a ? call('trophies/add-achieved', { trophy_id: id }) : null).then(r => {
      if (ok(r)) { markSynced(id); toast('GAME JOLT TROPHY UNLOCKED'); return true; }
      if (r && /already/i.test(r.message || '')) markSynced(id);
      return false;
    }).catch(() => false);
  }
  // at startup: send every mapped trophy the save already holds, once per Game Jolt user
  function syncTrophies(S, count) {
    if (!on || !realCareer(S) || typeof count !== 'function') return Promise.resolve(0);
    const done = synced(); const todo = Object.keys(TROPHIES).filter(k => !done.has(TROPHIES[k]) && count(k) > 0);
    if (!todo.length) return Promise.resolve(0);
    return auth().then(a => {
      if (!a) return 0;
      return Promise.all(todo.map(k => call('trophies/add-achieved', { trophy_id: TROPHIES[k] }).then(r => {
        if (ok(r) || (r && /already/i.test(r.message || ''))) { markSynced(TROPHIES[k]); return 1; } return 0;
      }))).then(x => x.reduce((s, v) => s + v, 0));
    }).catch(() => 0);
  }
  // score table: the team's career wins, only when the number goes up
  function submitWins(S, wins) {
    wins = Math.floor(+wins || 0);
    if (!on || !realCareer(S) || wins <= 0 || wins <= lastWins()) return Promise.resolve(false);
    return auth().then(a => a ? call('scores/add', { score: wins + (wins === 1 ? ' win' : ' wins'), sort: wins, table_id: TABLE_ID }) : null).then(r => {
      if (ok(r)) { try { localStorage.setItem(SCORE_KEY(), String(Math.max(wins, lastWins()))); } catch (e) {} return true; }
      return false;
    }).catch(() => false);
  }
  // startup (after Game.load): validate, then sync trophies and the score
  function startup(S, count, wins) {
    if (!on || !realCareer(S)) return Promise.resolve();
    return syncTrophies(S, count).then(() => submitWins(S, wins)).catch(() => {});
  }

  return { GAME_ID, TABLE_ID, API, TROPHIES, md5, buildUrl, get on() { return on; }, get user() { return user; }, auth, trophy, syncTrophies, submitWins, startup };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = GJ;
