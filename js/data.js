/* Static game data: series, tracks, names, sponsors */
'use strict';
const DATA = (() => {
  // v1.3: series 0-3 = the NASCAR ladder (indexes kept for old saves), 4 = local karting, 5-9 = the Road to IndyCar.
  // path = which ladder, rank = money/talent tier (ARCA = 0, Cup = 3), entry = bottom rung (sponsors are earned there),
  // facMul = facility price multiplier, model = car art, promoPos/promoWins = owner promotion rule.
  const SERIES = [
    { id: 'arca', name: 'ARCA SERIES', short: 'ARCA', cars: 20, mult: 1, aiCar: [26, 51], aiDrv: [25, 57], floor: 30, buyIn: 0,
      purseWin: 32000, sponsorPrimary: 12000, sponsorAssoc: 3000, salaryBase: 1, minBudget: 220000, path: 'nascar', rank: 0, entry: true, facMul: 1, model: 'arca', promoPos: 6, promoWins: 2 },
    { id: 'truck', name: 'TRUCK SERIES', short: 'TRUCKS', cars: 24, mult: 2.5, aiCar: [44, 66], aiDrv: [42, 70], floor: 42, buyIn: 150000,
      purseWin: 75000, sponsorPrimary: 30000, sponsorAssoc: 7500, salaryBase: 2.5, minBudget: 600000, path: 'nascar', rank: 1, facMul: 1.8, model: 'truck', promoPos: 5, promoWins: 2 },
    { id: 'oreilly', name: "O'REILLY SERIES", short: "O'REILLY", cars: 28, mult: 6, aiCar: [54, 76], aiDrv: [52, 78], floor: 54, buyIn: 1500000,
      purseWin: 180000, sponsorPrimary: 72000, sponsorAssoc: 18000, salaryBase: 6, minBudget: 1500000, path: 'nascar', rank: 2, facMul: 2.6, model: 'oreilly', promoPos: 5, promoWins: 2 },
    { id: 'cup', name: 'CUP SERIES', short: 'CUP', cars: 40, charters: 36, openExtra: 2, mult: 15, aiCar: [64, 88], aiDrv: [62, 90], floor: 64, buyIn: 5000000,
      purseWin: 450000, sponsorPrimary: 180000, sponsorAssoc: 45000, salaryBase: 15, minBudget: 4000000, path: 'nascar', rank: 3, facMul: 3.4, model: 'cup', top: true },
    { id: 'kart', name: 'REGIONAL KART SERIES', short: 'KARTS', cars: 16, mult: 0.2, aiCar: [14, 33], aiDrv: [14, 42], floor: 18, buyIn: 0,
      purseWin: 2500, sponsorPrimary: 1500, sponsorAssoc: 400, salaryBase: 0.2, minBudget: 30000, path: 'kart', rank: -1, entry: true, facMul: 0.15, model: 'kart', kart: true },
    { id: 'usfj', name: 'USF JUNIORS', short: 'USF JR', cars: 18, mult: 0.8, aiCar: [24, 49], aiDrv: [24, 55], floor: 27, buyIn: 0,
      purseWin: 26000, sponsorPrimary: 10000, sponsorAssoc: 2500, salaryBase: 0.8, minBudget: 180000, path: 'indy', rank: 0, entry: true, facMul: 1, model: 'usf', ow: true, promoPos: 6, promoWins: 2 },
    { id: 'usf2000', name: 'USF2000', short: 'USF2000', cars: 20, mult: 1.6, aiCar: [34, 58], aiDrv: [33, 63], floor: 35, buyIn: 120000,
      purseWin: 45000, sponsorPrimary: 18000, sponsorAssoc: 4500, salaryBase: 1.6, minBudget: 380000, path: 'indy', rank: 0.8, facMul: 1.5, model: 'usf', ow: true, promoPos: 5, promoWins: 2 },
    { id: 'usfpro', name: 'USF PRO 2000', short: 'USF PRO', cars: 18, mult: 3, aiCar: [44, 66], aiDrv: [42, 70], floor: 43, buyIn: 400000,
      purseWin: 80000, sponsorPrimary: 32000, sponsorAssoc: 8000, salaryBase: 3, minBudget: 750000, path: 'indy', rank: 1.5, facMul: 2, model: 'pro', ow: true, promoPos: 5, promoWins: 2 },
    { id: 'nxt', name: 'INDY NXT', short: 'INDY NXT', cars: 20, mult: 6, aiCar: [54, 76], aiDrv: [52, 78], floor: 54, buyIn: 1500000,
      purseWin: 180000, sponsorPrimary: 72000, sponsorAssoc: 18000, salaryBase: 6, minBudget: 1500000, path: 'indy', rank: 2, facMul: 2.6, model: 'nxt', ow: true, promoPos: 5, promoWins: 2 },
    { id: 'indycar', name: 'INDYCAR SERIES', short: 'INDYCAR', cars: 27, mult: 15, aiCar: [64, 88], aiDrv: [62, 90], floor: 64, buyIn: 5000000,
      purseWin: 450000, sponsorPrimary: 180000, sponsorAssoc: 45000, salaryBase: 15, minBudget: 4000000, path: 'indy', rank: 3, facMul: 3.4, model: 'indy', ow: true, top: true },
  ];
  const LADDERS = { nascar: [0, 1, 2, 3], indy: [5, 6, 7, 8, 9] };
  const PATHS = { nascar: { name: 'NASCAR', road: 'ROAD TO THE CUP', first: 0 }, indy: { name: 'ROAD TO INDYCAR', road: 'ROAD TO INDY', first: 5 }, kart: { name: 'KARTING', road: 'KARTING: PICK YOUR PATH', first: 4 } };
  // v1.3 championship formats. cuts = [after race N, drivers left]; double = races worth double points
  const FORMATS = {
    truck: { cuts: [[5, 10], [7, 8], [9, 4]] },
    oreilly: { cuts: [[5, 12], [7, 8], [9, 4]] },
    cup: { cuts: [[4, 16], [6, 12], [8, 8], [9, 4]] },
    nxt: { double: [10] },
    indycar: { double: [10] },
  };
  // v1.4: the real full-season playoff formats ([after race N, drivers left] for a season of `n` races).
  // Any other season length scales them, keeping each round at least one race long; 10 races keeps the v1.3 table.
  const REAL_FMT = { cup: { n: 36, cuts: [[26, 16], [29, 12], [32, 8], [35, 4]] }, oreilly: { n: 33, cuts: [[26, 12], [29, 8], [32, 4]] }, truck: { n: 25, cuts: [[18, 10], [21, 8], [24, 4]] } };
  function formatFor(si, n) {
    const sr = SERIES[si]; n = n || 10; const F = FORMATS[sr.id] || {};
    if (F.double) return { double: [n] };
    if (!F.cuts) return {};
    if (n === 10) return F;
    const R = REAL_FMT[sr.id]; if (n === R.n) return { cuts: R.cuts.map(c => c.slice()) };
    if (n < R.cuts.length + 2) return {}; // too short for playoffs: full-season points
    const cuts = R.cuts.map(c => [Math.round(c[0] * n / R.n), c[1]]);
    cuts[cuts.length - 1][0] = n - 1;
    for (let i = cuts.length - 2; i >= 0; i--) cuts[i][0] = Math.max(1, Math.min(cuts[i][0], cuts[i + 1][0] - 1));
    return { cuts };
  }
  function formatText(si, n) {
    n = n || 10; const F = formatFor(si, n);
    if (F.cuts) return 'PLAYOFFS: TOP ' + F.cuts[0][1] + ' AFTER R' + F.cuts[0][0] + F.cuts.slice(1).map(c => c[1] === 4 ? ', CHAMPIONSHIP 4 AFTER R' + c[0] : ', CUT TO ' + c[1] + ' AFTER R' + c[0]).join('') + '. WIN A ROUND RACE = ADVANCE. BEST FINISH OF THE FINAL 4 IN R' + n + ' WINS IT ALL.';
    if (F.double) return 'FULL-SEASON POINTS. THE FINALE PAYS DOUBLE POINTS.';
    return 'FULL-SEASON POINTS - MOST POINTS AFTER ' + n + ' RACES WINS.';
  }
  // owner promotion rule: finish top `pos` in points, or win `wins` races (wins scale with the season length)
  function promoRule(si, n) { const sr = SERIES[si]; n = n || 10; return { pos: sr.promoPos || 5, wins: Math.max(1, Math.round((sr.promoWins || 2) * n / 10)) }; }
  // points tables: NASCAR style (+ stage points) for stock cars, IndyCar style for open-wheel, club style for karts
  const POINTS_OW = [50, 40, 35, 32, 30, 28, 26, 24, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 5, 5, 5, 5, 5, 5, 5];
  const POINTS_KART = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
  // Track type definitions: lap time is seconds per lap at 1x (visual time)
  const TYPES = {
    short: { name: 'SHORT TRACK', lapTime: 6.5, laps: 90, stages: [25, 55], fuelLaps: 60, wear: 0.0115, tireFall: 0.05,
      draftRange: 55, draft: 0.004, incident: 0.0008, laneRate: 1.0, outsidePen: 0.003, lanes: 2, paceSpacing: 38 },
    intermediate: { name: 'INTERMEDIATE', lapTime: 9, laps: 60, stages: [16, 34], fuelLaps: 26, wear: 0.0155, tireFall: 0.06,
      draftRange: 95, draft: 0.010, incident: 0.0008, laneRate: 0.8, outsidePen: 0.002, lanes: 2, paceSpacing: 40 },
    superspeedway: { name: 'SUPERSPEEDWAY', lapTime: 11, laps: 50, stages: [14, 30], fuelLaps: 22, wear: 0.007, tireFall: 0.02,
      draftRange: 150, draft: 0.034, incident: 0.0005, laneRate: 1.4, outsidePen: 0, lanes: 3, paceSpacing: 40, pack: true }, // v1.7.1: pack = drafting track (two- and three-wide packs)
    road: { name: 'ROAD COURSE', lapTime: 15, laps: 24, stages: [6, 13], fuelLaps: 11, wear: 0.026, tireFall: 0.05,
      draftRange: 50, draft: 0.003, incident: 0.0011, laneRate: 1.0, outsidePen: 0.004, lanes: 2, paceSpacing: 40 },
  };
  // v1.2: REAL tracks (names only). shape 'rp' = rounded polygon [x, y, cornerRadius] listed so the front stretch is the last edge
  // (or sf = vertex whose arc holds the start/finish, e.g. a tri-oval apex). Shapes are scaled to the real length.
  // miles = real lap length, bank = approx. max banking in degrees, wear = tire-wear multiplier (abrasive surfaces).
  const RP = (v, extra) => Object.assign({ kind: 'rp', v }, extra || {});
  const TRACKS = {
    daytona: { name: 'DAYTONA INTERNATIONAL SPEEDWAY', short: 'DAYTONA', type: 'superspeedway', miles: 2.5, bank: 31, city: 'Daytona Beach, FL', note: '2.5-MILE TRI-OVAL',
      shape: RP([[1000, 420, 200], [1000, 0, 200], [0, 0, 200], [0, 420, 200], [500, 510, 1100]], { sf: 4 }) },
    talladega: { name: 'TALLADEGA SUPERSPEEDWAY', short: 'TALLADEGA', type: 'superspeedway', miles: 2.66, bank: 33, city: 'Lincoln, AL', note: '2.66-MILE TRI-OVAL',
      shape: RP([[1100, 420, 210], [1100, 0, 210], [0, 0, 210], [0, 420, 210], [470, 500, 1300]], { sf: 4 }) },
    atlanta: { name: 'ATLANTA MOTOR SPEEDWAY', short: 'ATLANTA', type: 'superspeedway', miles: 1.54, bank: 28, city: 'Hampton, GA', note: '1.54-MILE QUAD-OVAL, PACK DRAFTING',
      shape: RP([[470, 430, 500], [700, 380, 170], [700, 0, 170], [0, 0, 170], [0, 380, 170], [230, 430, 500]]) },
    charlotte: { name: 'CHARLOTTE MOTOR SPEEDWAY', short: 'CHARLOTTE', type: 'intermediate', miles: 1.5, bank: 24, city: 'Concord, NC', note: '1.5-MILE QUAD-OVAL',
      shape: RP([[810, 470, 500], [1050, 410, 190], [1050, 0, 190], [0, 0, 190], [0, 410, 190], [240, 470, 500]]) }, // v1.6: a longer, flatter frontstretch (closer to the real quad-oval) so 40 Cup pit boxes fit
    lasvegas: { name: 'LAS VEGAS MOTOR SPEEDWAY', short: 'LAS VEGAS', type: 'intermediate', miles: 1.5, bank: 20, city: 'Las Vegas, NV', note: '1.5-MILE TRI-OVAL',
      shape: RP([[800, 400, 190], [800, 0, 190], [0, 0, 190], [0, 400, 190], [400, 455, 1300]], { sf: 4, xs: 1.06 }) },
    kansas: { name: 'KANSAS SPEEDWAY', short: 'KANSAS', type: 'intermediate', miles: 1.5, bank: 20, city: 'Kansas City, KS', note: '1.5-MILE TRI-OVAL',
      shape: RP([[760, 400, 200], [760, 0, 200], [0, 0, 200], [0, 400, 200], [380, 465, 1200]], { sf: 4, xs: 1.1 }) },
    texas: { name: 'TEXAS MOTOR SPEEDWAY', short: 'TEXAS', type: 'intermediate', miles: 1.5, bank: 24, city: 'Fort Worth, TX', note: '1.5-MILE QUAD-OVAL',
      shape: RP([[520, 460, 480], [800, 400, 210], [800, 0, 210], [0, 0, 150], [0, 400, 150], [260, 460, 480]]) },
    homestead: { name: 'HOMESTEAD-MIAMI SPEEDWAY', short: 'HOMESTEAD', type: 'intermediate', miles: 1.5, bank: 20, wear: 1.3, city: 'Homestead, FL', note: '1.5-MILE OVAL, WORN SURFACE',
      shape: RP([[800, 420, 210], [800, 0, 210], [0, 0, 210], [0, 420, 210]], { xs: 1.1 }) },
    michigan: { name: 'MICHIGAN INTERNATIONAL SPEEDWAY', short: 'MICHIGAN', type: 'intermediate', miles: 2.0, bank: 18, city: 'Brooklyn, MI', note: '2-MILE D-OVAL',
      shape: RP([[1000, 440, 230], [1000, 0, 230], [0, 0, 230], [0, 440, 230], [500, 525, 2200]], { sf: 4 }) },
    pocono: { name: 'POCONO RACEWAY', short: 'POCONO', type: 'intermediate', miles: 2.5, bank: 14, city: 'Long Pond, PA', note: '2.5-MILE TRIANGLE, THREE DIFFERENT TURNS',
      shape: RP([[1100, 450, 150], [330, 0, 120], [0, 420, 260]]) },
    darlington: { name: 'DARLINGTON RACEWAY', short: 'DARLINGTON', type: 'intermediate', miles: 1.366, bank: 25, wear: 1.4, city: 'Darlington, SC', note: '1.366-MILE EGG, "TOO TOUGH TO TAME"',
      shape: RP([[760, 380, 150], [760, 60, 150], [0, 0, 200], [0, 400, 200]]) },
    indianapolis: { name: 'INDIANAPOLIS MOTOR SPEEDWAY', short: 'INDIANAPOLIS', type: 'intermediate', miles: 2.5, bank: 9, city: 'Indianapolis, IN', note: '2.5-MILE RECTANGLE, FOUR FLAT TURNS',
      shape: RP([[1000, 330, 110], [1000, 0, 110], [0, 0, 110], [0, 330, 110]]) },
    dover: { name: 'DOVER MOTOR SPEEDWAY', short: 'DOVER', type: 'short', miles: 1.0, bank: 24, wear: 1.1, city: 'Dover, DE', note: '1-MILE CONCRETE "MONSTER MILE"',
      shape: RP([[560, 320, 160], [560, 0, 160], [0, 0, 160], [0, 320, 160]], { xs: 1.2 }) },
    phoenix: { name: 'PHOENIX RACEWAY', short: 'PHOENIX', type: 'short', miles: 1.0, bank: 11, city: 'Avondale, AZ', note: '1-MILE FLAT OVAL WITH THE DOGLEG',
      shape: RP([[600, 330, 130], [600, 40, 130], [0, 0, 170], [0, 360, 170], [160, 440, 300]]) },
    richmond: { name: 'RICHMOND RACEWAY', short: 'RICHMOND', type: 'short', miles: 0.75, bank: 14, city: 'Richmond, VA', note: '0.75-MILE D-SHAPED OVAL',
      shape: RP([[560, 320, 150], [560, 0, 150], [0, 0, 150], [0, 320, 150], [280, 385, 900]], { sf: 4 }) },
    bristol: { name: 'BRISTOL MOTOR SPEEDWAY', short: 'BRISTOL', type: 'short', splitPits: true, miles: 0.533, bank: 28, wear: 1.2, city: 'Bristol, TN', note: '0.533-MILE HIGH-BANKED CONCRETE',
      shape: RP([[440, 260, 130], [440, 0, 130], [0, 0, 130], [0, 260, 130]], { xs: 1.3 }) },
    martinsville: { name: 'MARTINSVILLE SPEEDWAY', short: 'MARTINSVILLE', type: 'short', splitPits: true, miles: 0.526, bank: 12, wear: 1.1, city: 'Ridgeway, VA', note: '0.526-MILE PAPERCLIP',
      shape: RP([[600, 200, 100], [600, 0, 100], [0, 0, 100], [0, 200, 100]]) },
    iowa: { name: 'IOWA SPEEDWAY', short: 'IOWA', type: 'short', miles: 0.875, bank: 14, city: 'Newton, IA', note: '0.875-MILE D-SHAPED OVAL',
      shape: RP([[620, 330, 160], [620, 0, 160], [0, 0, 160], [0, 330, 160], [310, 385, 1000]], { sf: 4 }) },
    elko: { name: 'ELKO SPEEDWAY', short: 'ELKO', type: 'short', miles: 0.375, bank: 9, city: 'Elko New Market, MN', note: '3/8-MILE OVAL',
      shape: RP([[360, 240, 120], [360, 0, 120], [0, 0, 120], [0, 240, 120]], { xs: 1.2 }) },
    toledo: { name: 'TOLEDO SPEEDWAY', short: 'TOLEDO', type: 'short', miles: 0.5, bank: 6, city: 'Toledo, OH', note: 'HALF-MILE OVAL',
      shape: RP([[380, 250, 125], [380, 0, 125], [0, 0, 125], [0, 250, 125]], { xs: 1.2 }) },
    berlin: { name: 'BERLIN RACEWAY', short: 'BERLIN', type: 'short', miles: 0.4375, bank: 8, city: 'Marne, MI', note: '7/16-MILE OVAL',
      shape: RP([[400, 220, 110], [400, 0, 110], [0, 0, 110], [0, 220, 110]]) },
    salem: { name: 'SALEM SPEEDWAY', short: 'SALEM', type: 'short', miles: 0.555, bank: 33, city: 'Salem, IN', note: 'HIGH-BANKED HALF-MILE',
      shape: RP([[380, 270, 135], [380, 0, 135], [0, 0, 135], [0, 270, 135]], { xs: 1.3 }) },
    watkinsglen: { name: 'WATKINS GLEN INTERNATIONAL', short: 'WATKINS GLEN', type: 'road', miles: 2.45, bank: 0, city: 'Watkins Glen, NY', note: '2.45-MILE ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [520, 0], [660, -70], [700, -260], [780, -420], [920, -460], [1010, -360], [960, -210], [1060, -110], [1080, 50], [900, 160], [600, 190], [300, 200], [90, 150]] } },
    sonoma: { name: 'SONOMA RACEWAY', short: 'SONOMA', type: 'road', miles: 1.99, bank: 0, wear: 1.2, city: 'Sonoma, CA', note: '1.99-MILE HILLY ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [420, 0], [570, -80], [600, -260], [480, -360], [560, -490], [770, -470], [820, -320], [980, -300], [1010, -120], [860, -40], [820, 120], [600, 200], [300, 170], [110, 120]] } },
    // ---------- v1.4: more real tracks for full-length seasons (layouts are rough pixel versions) ----------
    nhms: { name: 'NEW HAMPSHIRE MOTOR SPEEDWAY', short: 'NEW HAMPSHIRE', type: 'short', miles: 1.058, bank: 7, city: 'Loudon, NH', note: '1.058-MILE FLAT "MAGIC MILE"',
      shape: RP([[600, 300, 135], [600, 0, 135], [0, 0, 135], [0, 300, 135]]) },
    rockingham: { name: 'ROCKINGHAM SPEEDWAY', short: 'ROCKINGHAM', type: 'short', miles: 1.017, bank: 25, wear: 1.4, city: 'Rockingham, NC', note: '1.017-MILE "ROCK", ROUGH SURFACE',
      shape: RP([[590, 330, 165], [590, 20, 150], [0, 0, 160], [0, 330, 170]]) },
    nwilkesboro: { name: 'NORTH WILKESBORO SPEEDWAY', short: 'N. WILKESBORO', type: 'short', miles: 0.625, bank: 14, wear: 1.4, city: 'North Wilkesboro, NC', note: '0.625-MILE OLD-SCHOOL OVAL',
      shape: RP([[500, 250, 125], [500, 0, 125], [0, 0, 125], [0, 260, 125]]) },
    cota: { name: 'CIRCUIT OF THE AMERICAS', short: 'COTA', type: 'road', miles: 2.4, bank: 0, wear: 1.1, city: 'Austin, TX', note: '2.4-MILE NATIONAL LAYOUT, BIG UPHILL TURN 1',
      shape: { kind: 'road', pts: [[0, 0], [520, 0], [600, -110], [520, -200], [600, -300], [780, -330], [900, -260], [880, -120], [1000, -40], [940, 80], [700, 120], [420, 110], [200, 170], [40, 110]] } },
    roval: { name: 'CHARLOTTE ROVAL', short: 'ROVAL', type: 'road', miles: 2.28, bank: 0, city: 'Concord, NC', note: '2.28-MILE ROAD COURSE IN AND AROUND THE OVAL',
      shape: { kind: 'road', pts: [[0, 0], [560, 0], [760, -60], [820, -220], [700, -330], [520, -280], [420, -360], [260, -300], [300, -200], [120, -170], [-80, -260], [-180, -140], [-140, -30]] } },
    chicago: { name: 'CHICAGO STREET COURSE', short: 'CHICAGO', type: 'road', street: true, miles: 2.2, bank: 0, city: 'Chicago, IL', note: '2.2-MILE GRANT PARK STREET COURSE',
      shape: { kind: 'rp', cw: true, // v1.5: Grant Park (map with the lake on top): Columbus Dr start, Balbo, DuSable Lake Shore Dr, Roosevelt, Columbus, Balbo, Michigan Ave + Congress Plaza, Jackson
        v: [[470, 375, 32], [470, 182, 32], [775, 182, 140], [912, 290, 40], [912, 375, 32], [545, 375, 32], [545, 585, 32], [380, 585, 32], [275, 520, 90], [170, 585, 32],
          [70, 585, 32], [70, 375, 32]] } },
    mexico: { name: 'AUTODROMO HERMANOS RODRIGUEZ', short: 'MEXICO CITY', type: 'road', miles: 2.42, bank: 0, city: 'Mexico City, MX', note: '2.42-MILE CIRCUIT THROUGH THE STADIUM',
      shape: { kind: 'road', pts: [[0, 0], [900, 0], [980, -70], [900, -150], [760, -160], [640, -240], [440, -220], [360, -300], [180, -280], [60, -200], [-40, -220], [-120, -120]] } },
    limerock: { name: 'LIME ROCK PARK', short: 'LIME ROCK', type: 'road', miles: 1.53, bank: 0, city: 'Lakeville, CT', note: '1.53-MILE SHORT, FAST ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [520, 0], [660, -60], [640, -200], [500, -240], [380, -200], [200, -260], [40, -220], [-60, -120]] } },
    thermal: { name: 'THE THERMAL CLUB', short: 'THERMAL', type: 'road', miles: 3.067, bank: 0, city: 'Thermal, CA', note: '3.07-MILE DESERT CLUB CIRCUIT',
      shape: { kind: 'road', pts: [[0, 0], [700, 0], [820, -80], [760, -200], [880, -320], [760, -440], [560, -400], [480, -300], [300, -360], [120, -300], [160, -180], [0, -120], [-100, -60]] } },
    // ---------- v1.3: real US kart tracks (layouts simplified, lengths approximate) ----------
    orlandokart: { name: 'ORLANDO KART CENTER', short: 'ORLANDO KART', type: 'road', kart: true, miles: 0.75, bank: 0, city: 'Orlando, FL', note: 'TWISTY CLUB LAYOUT, HOME OF FLORIDA KARTING',
      shape: { kind: 'road', pts: [[0, 0], [300, 0], [420, 30], [440, 130], [340, 170], [250, 230], [300, 310], [470, 300], [560, 200], [620, 40], [720, 40], [740, 220], [660, 400], [380, 430], [120, 400], [-40, 330], [-60, 160]] } },
    ocalagp: { name: 'OCALA GRAN PRIX', short: 'OCALA GP', type: 'road', kart: true, miles: 0.7, bank: 0, city: 'Ocala, FL', note: 'FAST FLORIDA KART CIRCUIT',
      shape: { kind: 'road', pts: [[0, 0], [380, 0], [520, 60], [520, 180], [400, 220], [300, 300], [380, 380], [600, 380], [700, 260], [760, 80], [860, 60], [900, 260], [820, 470], [500, 520], [200, 500], [60, 420], [140, 300], [60, 200], [-60, 120]] } },
    gopro: { name: 'GOPRO MOTORPLEX', short: 'GOPRO', type: 'road', kart: true, miles: 0.8, bank: 0, city: 'Mooresville, NC', note: 'KART CIRCUIT IN RACE CITY USA',
      shape: { kind: 'road', pts: [[0, 0], [260, 0], [360, 70], [300, 160], [380, 240], [520, 220], [560, 100], [660, 80], [700, 220], [640, 360], [460, 400], [300, 360], [160, 400], [20, 340], [60, 220], [-40, 140]] } },
    newcastle: { name: 'NEW CASTLE MOTORSPORTS PARK', short: 'NEW CASTLE', type: 'road', kart: true, miles: 0.9, bank: 0, city: 'New Castle, IN', note: 'BIG MIDWEST KART CIRCUIT',
      shape: { kind: 'road', pts: [[0, 0], [420, 0], [560, -40], [640, 40], [600, 160], [460, 200], [440, 300], [560, 360], [760, 320], [860, 200], [900, 40], [980, 120], [960, 380], [780, 500], [420, 520], [140, 480], [20, 380], [120, 260], [-20, 150]] } },
    cmskart: { name: 'CHARLOTTE MOTOR SPEEDWAY KART TRACK', short: 'CMS KART', type: 'road', kart: true, miles: 0.6, bank: 0, city: 'Concord, NC', note: 'KART TRACK AT CHARLOTTE MOTOR SPEEDWAY',
      shape: { kind: 'road', pts: [[0, 0], [320, 0], [440, -60], [560, 0], [560, 140], [440, 200], [480, 300], [620, 320], [640, 440], [460, 480], [260, 420], [220, 300], [80, 280], [-40, 200], [-60, 80]] } },
    pittrace: { name: 'PITTRACE KARTING', short: 'PITTRACE', type: 'road', kart: true, miles: 0.7, bank: 0, city: 'Wampum, PA', note: 'HILLY PENNSYLVANIA KART CIRCUIT',
      shape: { kind: 'road', pts: [[0, 0], [360, 0], [460, 60], [380, 140], [240, 150], [200, 240], [330, 300], [520, 260], [620, 120], [740, 100], [760, 300], [640, 440], [380, 470], [140, 440], [-20, 360], [-60, 200], [-40, 80]] } },
    // ---------- v1.3: Road to IndyCar tracks (names only; layouts roughly the real shapes) ----------
    stpete: { name: 'STREETS OF ST. PETERSBURG', short: 'ST. PETE', type: 'road', street: true, miles: 1.8, bank: 0, city: 'St. Petersburg, FL', note: '1.8-MILE STREET COURSE, AIRPORT RUNWAY',
      shape: { kind: 'rp', cw: true, pitRight: true, sfT: 0.52, // v1.5: traced from the official map (runway front straight, T1-T3 onto Bayshore, the T4-T9 notch round Pioneer Park, T10 at the Dali)
        v: [[752, 412, 34], [650, 440, 34], [615, 515, 50], [410, 522, 32], [410, 455, 32], [330, 455, 32], [322, 522, 32], [245, 522, 34], [245, 375, 34], [420, 375, 80],
          [510, 318, 32], [492, 215, 32], [506, 175, 32], [440, 45, 40], [575, 25, 40]] } },
    longbeach: { name: 'STREETS OF LONG BEACH', short: 'LONG BEACH', type: 'road', street: true, miles: 1.968, bank: 0, city: 'Long Beach, CA', note: '1.97-MILE STREET COURSE, FAMOUS HAIRPIN',
      shape: { kind: 'rp', cw: true, pitRight: true, sfT: 0.3, pitAt: 0.52, // v1.5: Shoreline Dr front straight, T1 left at Aquarium Way, the fountain, Pine Ave, Seaside Way, the T11 hairpin
        v: [[232, 512, 34], [220, 640, 34], [120, 655, 60], [25, 640, 32], [25, 350, 34], [395, 352, 34], [382, 232, 36], [300, 150, 32], [775, 40, 32], [825, 140, 34],
          [975, 140, 42], [975, 225, 42], [880, 228, 160], [800, 425, 200]] } },
    barber: { name: 'BARBER MOTORSPORTS PARK', short: 'BARBER', type: 'road', miles: 2.38, bank: 0, city: 'Birmingham, AL', note: '2.38-MILE ROLLING ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [480, 0], [640, -80], [660, -240], [560, -330], [600, -460], [760, -500], [880, -400], [860, -220], [960, -120], [940, 60], [780, 150], [560, 130], [400, 220], [200, 230], [60, 140]] } },
    indyroad: { name: 'INDIANAPOLIS ROAD COURSE', short: 'INDY ROAD', type: 'road', miles: 2.439, bank: 0, city: 'Indianapolis, IN', note: '2.44-MILE ROAD COURSE INSIDE THE BRICKYARD',
      shape: { kind: 'road', pts: [[0, 0], [700, 0], [820, -60], [820, -200], [700, -240], [600, -180], [500, -240], [380, -200], [300, -280], [120, -300], [40, -220], [100, -140], [0, -100], [-80, -40]] } },
    detroit: { name: 'DETROIT STREET CIRCUIT', short: 'DETROIT', type: 'road', street: true, miles: 1.645, bank: 0, city: 'Detroit, MI', note: '1.65-MILE DOWNTOWN STREET COURSE',
      shape: { kind: 'rp', sfT: 0.377, splitPit: true, // v1.5: 2023 downtown layout, map turned so Jefferson Ave runs flat (start on Jefferson, T3 hairpin, Bates, Atwater by the river, St. Antoine, Franklin)
        v: [[-60, 266, 41], [-60, 350, 41], [100, 350, 32], [104, 485, 32], [190, 484, 30], [228, 522, 30], [523, 529, 32], [522, 419, 32], [848, 422, 32], [866, 266, 34]] } },
    roadamerica: { name: 'ROAD AMERICA', short: 'ROAD AMERICA', type: 'road', miles: 4.014, bank: 0, city: 'Elkhart Lake, WI', note: '4.0-MILE CLASSIC ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [600, 0], [760, -40], [820, -220], [760, -420], [600, -480], [520, -380], [380, -360], [300, -460], [120, -500], [0, -420], [20, -300], [-100, -220], [-120, -80]] } },
    midohio: { name: 'MID-OHIO SPORTS CAR COURSE', short: 'MID-OHIO', type: 'road', miles: 2.258, bank: 0, city: 'Lexington, OH', note: '2.26-MILE TWISTY ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [420, 0], [520, -80], [480, -200], [600, -300], [760, -260], [800, -120], [920, -60], [900, 100], [700, 160], [520, 120], [380, 200], [180, 200], [40, 120]] } },
    toronto: { name: 'STREETS OF TORONTO', short: 'TORONTO', type: 'road', street: true, miles: 1.786, bank: 0, city: 'Toronto, ON', note: '1.79-MILE EXHIBITION PLACE STREETS',
      shape: { kind: 'rp', cw: true, sfT: 0.62, // v1.5: Exhibition Place - Princes' Blvd start, T1 by the Princes' Gates, Lake Shore Blvd, T3 at Ontario Dr, round BMO Field
        v: [[835, 222, 34], [858, 292, 60], [760, 385, 200], [520, 495, 300], [205, 566, 40], [212, 470, 50], [200, 385, 32], [62, 398, 34], [165, 190, 34], [283, 150, 32],
          [318, 238, 32], [398, 250, 34], [482, 332, 34]] } },
    portland: { name: 'PORTLAND INTERNATIONAL RACEWAY', short: 'PORTLAND', type: 'road', miles: 1.964, bank: 0, city: 'Portland, OR', note: '1.96-MILE FLAT ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [900, 0], [980, -60], [940, -140], [600, -170], [520, -230], [300, -230], [200, -160], [40, -170], [-60, -100]] } },
    nola: { name: 'NOLA MOTORSPORTS PARK', short: 'NOLA', type: 'road', miles: 2.75, bank: 0, city: 'Avondale, LA', note: '2.75-MILE FLAT ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [560, 0], [700, -60], [700, -200], [560, -260], [460, -200], [340, -260], [360, -380], [520, -440], [520, -540], [300, -560], [100, -480], [80, -340], [-60, -260], [-80, -100]] } },
    laguna: { name: 'LAGUNA SECA RACEWAY', short: 'LAGUNA SECA', type: 'road', miles: 2.238, bank: 0, city: 'Monterey, CA', note: '2.24-MILE ROAD COURSE WITH THE CORKSCREW',
      shape: { kind: 'road', pts: [[0, 0], [380, 0], [500, -60], [620, -40], [700, -160], [640, -300], [480, -340], [420, -440], [520, -520], [380, -580], [200, -500], [140, -360], [20, -260], [-80, -120]] } },
    lucasoil: { name: 'LUCAS OIL INDIANAPOLIS RACEWAY PARK', short: 'LUCAS OIL', type: 'short', miles: 0.686, bank: 12, city: 'Brownsburg, IN', note: '0.686-MILE OVAL',
      shape: RP([[440, 270, 135], [440, 0, 135], [0, 0, 135], [0, 270, 135]], { xs: 1.2 }) },
    gateway: { name: 'WORLD WIDE TECHNOLOGY RACEWAY', short: 'GATEWAY', type: 'intermediate', miles: 1.25, bank: 11, city: 'Madison, IL', note: '1.25-MILE EGG-SHAPED OVAL',
      shape: RP([[700, 360, 140], [700, 60, 140], [0, 0, 210], [0, 400, 210]]) },
    milwaukee: { name: 'THE MILWAUKEE MILE', short: 'MILWAUKEE', type: 'short', miles: 1.0, bank: 9, city: 'West Allis, WI', note: '1-MILE FLAT OVAL',
      shape: RP([[640, 330, 170], [640, 0, 170], [0, 0, 170], [0, 330, 170]]) },
    nashville: { name: 'NASHVILLE SUPERSPEEDWAY', short: 'NASHVILLE', type: 'intermediate', miles: 1.33, bank: 14, city: 'Lebanon, TN', note: '1.33-MILE CONCRETE TRI-OVAL',
      shape: RP([[720, 380, 180], [720, 0, 180], [0, 0, 180], [0, 380, 180], [360, 430, 1200]], { sf: 4 }) },
  };
  // v1.3 grandstands, placed where the real ones are: [from, to, depth] as share of a lap from the start/finish line
  // (negative = before the line), always outside the track. Tracks not listed get frontstretch stands.
  const FS = (a, d) => [-a, a, d];
  const STANDS = {
    daytona: [FS(0.18, 96)], talladega: [[-0.21, 0.17, 88]], atlanta: [FS(0.14, 80)], charlotte: [FS(0.16, 86), [0.17, 0.27, 40]], lasvegas: [FS(0.15, 84)],
    kansas: [FS(0.14, 78)], texas: [FS(0.15, 86), [0.18, 0.28, 44]], homestead: [FS(0.13, 72)], michigan: [FS(0.17, 80)], pocono: [FS(0.12, 70)],
    darlington: [FS(0.15, 72), [0.4, 0.6, 36]], indianapolis: [FS(0.12, 84), [0.13, 0.22, 52], [0.78, 0.87, 52]], dover: [FS(0.16, 76), [0.37, 0.63, 54]],
    phoenix: [FS(0.12, 70)], richmond: [FS(0.17, 70), [0.37, 0.63, 38]], bristol: [[0, 1, 66]], martinsville: [FS(0.2, 64), [0.32, 0.68, 46]],
    iowa: [FS(0.15, 62), [0.36, 0.64, 30]], elko: [FS(0.14, 40)], toledo: [FS(0.14, 40)], berlin: [FS(0.14, 40)], salem: [FS(0.15, 44)],
    lucasoil: [FS(0.15, 44)], nhms: [FS(0.15, 66), [0.38, 0.62, 30]], rockingham: [FS(0.14, 56)], nwilkesboro: [FS(0.16, 52), [0.4, 0.6, 30]],
    cota: [FS(0.05, 56)], roval: [FS(0.06, 70)], chicago: [FS(0.06, 56), [0.528, 0.562, 34]], mexico: [FS(0.05, 70)], limerock: [FS(0.04, 36)], thermal: [FS(0.04, 30)], gateway: [FS(0.12, 58)], nashville: [FS(0.14, 66)], milwaukee: [FS(0.14, 58)],
    watkinsglen: [FS(0.05, 54)], sonoma: [FS(0.05, 44)], roadamerica: [FS(0.04, 50)], indyroad: [FS(0.05, 80)], longbeach: [FS(0.06, 60), [0.815, 0.875, 44]], stpete: [FS(0.06, 56), [0.085, 0.13, 40], [0.22, 0.29, 30]],
    // v1.5 street circuits: main straight + the key corners (4th value -1 = on the pit-road side of the track)
    detroit: [FS(0.06, 56), [0.235, 0.3, 44], [0.48, 0.58, 30]], toronto: [FS(0.055, 56), [0.435, 0.475, 40, -1], [0.862, 0.905, 30]],
  };
  // infield lakes (Daytona's Lake Lloyd, Talladega's infield lake): [share of a lap, inward offset]
  const LAKES = { daytona: [0.5, 190], talladega: [0.55, 170] };
  // v1.4 venue pieces: press box over the start/finish (true = on top of the main stand, 'inside' = infield like Indy's
  // Pagoda), the scoring pylon [share of a lap, lateral] in the infield, Bristol's center-hung video board
  const VENUE = { bristol: { board: true }, indianapolis: { press: 'inside', pylon: [-0.045] }, daytona: { pylon: [0.035] }, talladega: { pylon: [0.035] } };
  function venue(tid) { const d = TRACKS[tid]; const v = VENUE[tid] || {}; return { press: v.press !== undefined ? v.press : !d.kart, pylon: v.pylon !== undefined ? v.pylon : (!d.kart && !v.board ? [0.02] : null), board: !!v.board }; }
  function standsFor(tid) { const d = TRACKS[tid]; return STANDS[tid] || (d.kart ? [FS(0.04, 30)] : d.type === 'road' ? [FS(0.05, 50)] : [FS(0.11, 72)]); }
  // 10-race schedules of tracks each series really runs. ARCA & Cup open at Daytona; Cup ends at Phoenix.
  const CALENDARS = [
    ['daytona', 'talladega', 'kansas', 'elko', 'berlin', 'pocono', 'iowa', 'salem', 'bristol', 'toledo'],
    ['daytona', 'atlanta', 'lasvegas', 'bristol', 'martinsville', 'texas', 'darlington', 'charlotte', 'pocono', 'phoenix'],
    ['daytona', 'lasvegas', 'richmond', 'darlington', 'charlotte', 'watkinsglen', 'michigan', 'bristol', 'kansas', 'phoenix'],
    ['daytona', 'atlanta', 'lasvegas', 'talladega', 'charlotte', 'sonoma', 'indianapolis', 'darlington', 'martinsville', 'phoenix'],
    // v1.3: regional kart series at real US kart tracks (doubles back to a few, like a real club season)
    ['orlandokart', 'ocalagp', 'gopro', 'cmskart', 'newcastle', 'pittrace', 'ocalagp', 'gopro', 'cmskart', 'orlandokart'],
    ['nola', 'barber', 'indyroad', 'roadamerica', 'lucasoil', 'midohio', 'watkinsglen', 'portland', 'sonoma', 'laguna'],
    ['stpete', 'nola', 'barber', 'indyroad', 'roadamerica', 'lucasoil', 'midohio', 'toronto', 'portland', 'laguna'],
    ['stpete', 'barber', 'indyroad', 'detroit', 'roadamerica', 'lucasoil', 'midohio', 'toronto', 'portland', 'laguna'],
    ['stpete', 'barber', 'indyroad', 'detroit', 'roadamerica', 'midohio', 'iowa', 'laguna', 'portland', 'milwaukee'],
    ['stpete', 'longbeach', 'barber', 'indyroad', 'indianapolis', 'detroit', 'roadamerica', 'toronto', 'milwaukee', 'nashville'],
  ];
  // v1.4: full seasons in the real order (based on the 2025 calendars, using the tracks in the game; doubleheaders count twice).
  const FULL_CAL = [
    ['daytona', 'phoenix', 'talladega', 'kansas', 'charlotte', 'michigan', 'midohio', 'pocono', 'berlin', 'elko', 'dover', 'lucasoil', 'iowa', 'watkinsglen', 'milwaukee', 'bristol', 'salem', 'toledo', 'nhms', 'kansas'],
    ['daytona', 'atlanta', 'lasvegas', 'homestead', 'martinsville', 'rockingham', 'bristol', 'texas', 'kansas', 'nwilkesboro', 'charlotte', 'nashville', 'michigan', 'pocono', 'limerock', 'lucasoil', 'richmond', 'watkinsglen',
      'darlington', 'bristol', 'nhms', 'roval', 'talladega', 'martinsville', 'phoenix'],
    ['daytona', 'atlanta', 'cota', 'phoenix', 'lasvegas', 'homestead', 'martinsville', 'darlington', 'bristol', 'rockingham', 'talladega', 'texas', 'charlotte', 'nashville', 'portland', 'mexico', 'pocono', 'atlanta',
      'chicago', 'sonoma', 'dover', 'indianapolis', 'iowa', 'watkinsglen', 'daytona', 'darlington', 'bristol', 'kansas', 'roval', 'lasvegas', 'talladega', 'martinsville', 'phoenix'],
    ['daytona', 'atlanta', 'cota', 'phoenix', 'lasvegas', 'homestead', 'martinsville', 'darlington', 'bristol', 'talladega', 'texas', 'kansas', 'charlotte', 'nashville', 'michigan', 'mexico', 'pocono', 'atlanta',
      'chicago', 'sonoma', 'dover', 'indianapolis', 'iowa', 'watkinsglen', 'richmond', 'daytona', 'darlington', 'gateway', 'bristol', 'nhms', 'kansas', 'roval', 'lasvegas', 'talladega', 'martinsville', 'phoenix'],
    ['orlandokart', 'ocalagp', 'gopro', 'cmskart', 'newcastle', 'pittrace', 'orlandokart', 'ocalagp', 'gopro', 'newcastle', 'cmskart', 'orlandokart'],
    ['nola', 'nola', 'barber', 'barber', 'indyroad', 'roadamerica', 'roadamerica', 'lucasoil', 'midohio', 'midohio', 'watkinsglen', 'portland', 'portland', 'sonoma', 'laguna', 'laguna'],
    ['stpete', 'stpete', 'nola', 'nola', 'barber', 'barber', 'indyroad', 'indyroad', 'roadamerica', 'roadamerica', 'lucasoil', 'midohio', 'midohio', 'toronto', 'toronto', 'portland', 'portland', 'laguna'],
    ['stpete', 'stpete', 'barber', 'barber', 'indyroad', 'indyroad', 'lucasoil', 'roadamerica', 'roadamerica', 'midohio', 'midohio', 'toronto', 'toronto', 'detroit', 'portland', 'portland', 'laguna', 'laguna'],
    ['stpete', 'barber', 'indyroad', 'indyroad', 'detroit', 'roadamerica', 'midohio', 'iowa', 'toronto', 'laguna', 'portland', 'milwaukee', 'gateway', 'nashville'],
    ['stpete', 'thermal', 'longbeach', 'barber', 'indyroad', 'indianapolis', 'detroit', 'gateway', 'roadamerica', 'midohio', 'iowa', 'iowa', 'toronto', 'laguna', 'portland', 'milwaukee', 'nashville'],
  ];
  // season lengths you can pick: 0 = full (the real number of races for that series)
  const SEASON_LENS = [6, 10, 16, 0];
  const seasonLenName = (len, si) => len ? String(len) : 'FULL' + (si !== undefined ? ' (' + FULL_CAL[si].length + ')' : '');
  function seasonRaces(si, len) { return len === 10 ? 10 : !len ? FULL_CAL[si].length : Math.min(len, FULL_CAL[si].length); }
  // pick `len` races from the real calendar, spread over the season in real order: always the opener and the finale
  // (and the Indy 500 for IndyCar). 10 races keeps the hand-made v1.2/v1.3 calendars, so old saves feel the same.
  function scheduleFor(si, len) {
    if (len === 10 || len === undefined || len === null) return CALENDARS[si].slice();
    const full = FULL_CAL[si]; const n = seasonRaces(si, len); if (n >= full.length) return full.slice();
    const pick = []; for (let k = 0; k < n; k++) pick.push(Math.round(k * (full.length - 1) / (n - 1)));
    const must = si === 9 ? [full.indexOf('indianapolis')] : [];
    for (const m of must) if (m >= 0 && !pick.includes(m)) { let bi = 1; for (let k = 1; k < n - 1; k++) if (Math.abs(pick[k] - m) < Math.abs(pick[bi] - m)) bi = k; pick[bi] = m; }
    pick.sort((a, b) => a - b);
    return pick.map(i => full[i]);
  }
  // showpiece race names (found by track, so they follow the schedule whatever its length)
  function eventName(seriesIdx, week, sched) {
    if (!sched) { const G = typeof Game !== 'undefined' && Game.S; sched = G && G.seriesIdx === seriesIdx && G.schedule && G.schedule.length ? G.schedule : CALENDARS[seriesIdx]; }
    const tid = sched[week - 1]; if (!tid) return null; const last = sched.length > 1 && week === sched.length;
    if (seriesIdx === 3) { if (week === 1 && tid === 'daytona') return 'DAYTONA 500'; if (last) return 'CHAMPIONSHIP RACE'; if (tid === 'darlington' && sched.lastIndexOf('darlington') === week - 1) return 'SOUTHERN 500'; }
    if (seriesIdx === 9) { if (tid === 'indianapolis') return 'INDY 500'; if (tid === 'longbeach') return 'GRAND PRIX OF LONG BEACH'; if (last) return 'INDYCAR SEASON FINALE'; }
    if (last && seriesIdx === 4) return 'KART SERIES FINALE';
    if (last && seriesIdx === 8) return 'INDY NXT FINALE';
    return null;
  }
  // pre-v1.2 made-up tracks -> closest real track (save migration)
  const OLD_TRACKS = { thunder: 'bristol', paperclip: 'martinsville', hickory: 'richmond', riverbend: 'iowa', lonestar: 'texas', carolina: 'charlotte', desert: 'lasvegas',
    heartland: 'kansas', bayshore: 'daytona', tallapines: 'talladega', blueridge: 'watkinsglen', lakeside: 'sonoma' };
  const OLD_SHORT = { 'THUNDER VALLEY': 'BRISTOL', 'PAPERCLIP': 'MARTINSVILLE', 'HICKORY BOWL': 'RICHMOND', 'RIVERBEND': 'IOWA', 'LONE STAR': 'TEXAS', 'CAROLINA': 'CHARLOTTE',
    'DESERT SUN': 'LAS VEGAS', 'HEARTLAND': 'KANSAS', 'BAYSHORE': 'DAYTONA', 'TALLA PINES': 'TALLADEGA', 'BLUE RIDGE': 'WATKINS GLEN', 'LAKESIDE': 'SONOMA' };
  // race character from real length & banking (on top of the track type)
  const tuneCache = {};
  function trackT(tid) {
    if (tuneCache[tid]) return tuneCache[tid];
    const d = TRACKS[tid]; const base = TYPES[d.type]; const L = 1100 + 780 * d.miles; const bank = d.bank;
    const t = Object.assign({}, base);
    if (d.type === 'road') t.lapTime = +(15 * Math.pow(L / 3000, 0.85)).toFixed(2);
    else t.lapTime = +((6.5 + (L - 1559) * 0.0031) * (1 - (bank - 18) * 0.004)).toFixed(2);
    if (d.type === 'superspeedway') t.draft = base.draft * Math.sqrt(d.miles / 2.5);
    else if (d.type !== 'road') t.draft = base.draft * U.clamp(1 + (bank - 20) * 0.015, 0.8, 1.2);
    if (d.type !== 'road') {
      // high banks = more side-by-side, flat = harder to pass (kept mild so career balance holds)
      t.outsidePen = base.outsidePen * (bank >= 24 ? 0.7 : bank <= 12 ? 1.2 : 1);
      t.laneRate = base.laneRate * (bank >= 24 ? 1.1 : bank <= 12 ? 0.95 : 1);
    }
    t.wear = base.wear * (d.wear || 1);
    // v1.3: kart tracks - short sprints, no pit stops needed, lots of bumping; street courses - walls bite
    if (d.kart) Object.assign(t, { name: 'KART TRACK', laps: 20, stages: [], fuelLaps: 60, wear: 0.006, tireFall: 0.03, draftRange: 40, draft: 0.003, incident: 0.0013, lapTime: +(t.lapTime * 0.9).toFixed(2) });
    if (d.street) { t.incident = base.incident * 1.35; t.name = 'STREET COURSE'; }
    t.miles = d.miles; t.bank = bank; t.perim = L;
    return (tuneCache[tid] = t);
  }
  // v1.3: race settings for a series at a track (open-wheel cars: no stages, quicker laps, less draft; karts: club sprints)
  function raceT(tid, si) {
    const base = trackT(tid); if (si === undefined || si === null) return applyLen(Object.assign({}, base));
    const sr = SERIES[si]; const t = Object.assign({}, base);
    if (sr.ow) {
      t.stages = []; t.lapTime = +(base.lapTime * 0.92).toFixed(2); t.draft = base.draft * 0.6; t.fuelLaps = Math.round(base.fuelLaps * 1.1);
      if (TRACKS[tid].kart) t.laps = 24;
      if (tid === 'indianapolis' && si === 9) t.laps = 70; // the Indy 500 runs long
    }
    if (sr.kart && !TRACKS[tid].kart) { t.stages = []; t.laps = Math.min(base.laps, 30); }
    return applyLen(t);
  }
  // v1.4 race length setting (SETTINGS.raceMult): more or fewer laps; stages keep their share of the race, and the fuel
  // window and tire wear scale with sqrt-ish of the length so a sprint still has a stop or two and a long race has more.
  function applyLen(t, mult) {
    const m = mult || (typeof SETTINGS !== 'undefined' ? SETTINGS.raceMult() : 1); if (m === 1) return t;
    const laps0 = t.laps; t.laps = Math.max(t.laps <= 30 ? 6 : 10, Math.round(laps0 * m)); const k = t.laps / laps0;
    if (t.stages && t.stages.length) { const st = []; for (const x of t.stages) { const v = Math.round(x * k); if (v >= 2 && v < t.laps - 2 && (!st.length || v > st[st.length - 1] + 1)) st.push(v); } t.stages = st; }
    const f = Math.pow(k, 0.6); t.fuelLaps = Math.max(4, Math.round(t.fuelLaps * f)); t.wear = t.wear / f;
    t.lenMult = m; return t;
  }
  const typeName = (tid, si) => raceT(tid, si).name;
  const bankWord = b => b === 0 ? 'ROAD COURSE' : b >= 24 ? 'HIGH BANKS' : b <= 12 ? 'FLAT' : 'MEDIUM BANKS';
  const FIRST = ['Cody', 'Tyler', 'Bubba', 'Ricky', 'Dale', 'Jesse', 'Hunter', 'Mason', 'Logan', 'Chase', 'Colt', 'Wade', 'Brody', 'Kyle', 'Austin', 'Ty', 'Gus', 'Reid', 'Lane', 'Tanner',
    'Dakota', 'Riley', 'Jordan', 'Casey', 'Hailey', 'Toni', 'Sam', 'Maddie', 'Kenzie', 'Jamie', 'Nico', 'Mateo', 'Luis', 'Andre', 'Darius', 'Marcus', 'Jace', 'Rowdy', 'Buck', 'Clint',
    'Ellis', 'Hank', 'Ike', 'Josie', 'Kat', 'Lexi', 'Mo', 'Nash', 'Owen', 'Percy', 'Quinn', 'Rex', 'Shane', 'Trey', 'Vince', 'Zane', 'Aria', 'Bella', 'Cruz', 'Dex'];
  const LAST = ['Rivers', 'Holloway', 'Beckett', 'Strickland', 'Dawson', 'McAllister', 'Pruitt', 'Garrity', 'Whitfield', 'Kessler', 'Odom', 'Tillman', 'Baxley', 'Crenshaw', 'Fontaine',
    'Gentry', 'Harlan', 'Inman', 'Jarrett', 'Kimbrough', 'Landry', 'Mabry', 'Norwood', 'Ogletree', 'Pickett', 'Quarles', 'Radford', 'Satterfield', 'Talbot', 'Underwood', 'Vance',
    'Waddell', 'Yancey', 'Zeller', 'Alvarez', 'Brannigan', 'Castillo', 'Delgado', 'Esposito', 'Ferrell', 'Gaines', 'Huckaby', 'Ivey', 'Jessup', 'Kowalski', 'Lockhart', 'Moretti',
    'Nakamura', 'Okafor', 'Pettibone', 'Ramsey', 'Sutter', 'Toomey', 'Valdez', 'Wofford', 'Yates', 'Booker', 'Coltrane', 'Dupree', 'Easley'];
  const TEAM_A = ['Thunder', 'Redline', 'Blackwater', 'Iron Horse', 'Wildfire', 'Blue Ox', 'Copperhead', 'Big Sky', 'Southern Cross', 'Night Owl', 'Flatout', 'Gold Coast',
    'Ridgeback', 'Tailwind', 'Hammerdown', 'Lone Pine', 'Brickyard', 'Crossroads', 'Stampede', 'Sidewinder'];
  const TEAM_B = ['Motorsports', 'Racing', 'Racing Group', 'Speed Shop', 'Autosport', 'Competition', 'Racing Co.', 'Performance'];
  // Fictional sponsors with livery colors [body, stripe, number]
  const SPONSORS = [
    ['GATOR GRIP TIRES', '#2e8b3a', '#f2d22e'], ['BLAZIN BOLT ENERGY', '#e8e032', '#1a1a1a'], ['CRUSTWORKS PIZZA', '#d9342b', '#f6f0e0'], ['LUCKY LUG NUTS', '#1d5fd1', '#f2f2f2'],
    ['BIG RIG DIESEL', '#2a2a2a', '#f28c18'], ['SODA POPPIN', '#7a33c4', '#f2f2f2'], ['GRANDPAS JERKY', '#8a4b22', '#f2c45a'], ['SURE SHOT INSURANCE', '#f2f2f2', '#1d5fd1'],
    ['TURBO TACO', '#f28c18', '#2e8b3a'], ['MOONSHINE COLA', '#5bb8e8', '#c4232b'], ['HOGWASH SOAP', '#f07ab8', '#f2f2f2'], ['ROADKILL BBQ', '#5a1414', '#f2a018'],
    ['PIXEL PETS', '#29c4b0', '#1a1a1a'], ['DRAGSTRIP DONUTS', '#f2c4dc', '#8a4b22'], ['ACE HARDWARE-ISH', '#c4232b', '#1a1a1a'], ['NITRO NAPS MATTRESS', '#1a2f6b', '#e8e032'],
    ['CRABBY PATTY SEAFOOD', '#e85a2a', '#f2f2f2'], ['GOLD RUSH PAWN', '#d4a017', '#1a1a1a'], ['FROSTY FREEZE', '#bde6f5', '#1d5fd1'], ['HONKY TONK BOOTS', '#6b3d1e', '#e8d5a0'],
    ['PEPPERMILL STEAKS', '#1a1a1a', '#c4232b'], ['SPARKLE SHINE WAX', '#f2f2f2', '#7a33c4'], ['SWAMP FOX BAIT', '#4a6b2a', '#f28c18'], ['RAPID LUBE', '#ffd400', '#1d5fd1'],
    ['STARLIGHT MOTEL', '#2b1d5a', '#f2c45a'], ['CHICKEN SHACK', '#f2d22e', '#c4232b'], ['VELOCITY VPN', '#11b5e4', '#1a1a1a'], ['BACKROAD BANK', '#1f6b4a', '#f2f2f2'],
    ['TOP DOG HOTDOGS', '#c4232b', '#f2d22e'], ['CLOUD NINE AIR', '#f2f2f2', '#11b5e4'], ['MEGA MART', '#1d5fd1', '#f2d22e'], ['HOT ROD HOT SAUCE', '#8b0000', '#f28c18'],
    ['CORNFED CEREAL', '#f2c45a', '#2e8b3a'], ['GRITS & GRAVY', '#e8d5a0', '#5a1414'], ['FULL THROTTLE PHONES', '#1a1a1a', '#29c4b0'], ['BUZZSAW TOOLS', '#f28c18', '#1a1a1a'],
  ];
  const BODY_COLORS = ['#d9342b', '#1d5fd1', '#f2d22e', '#2e8b3a', '#f28c18', '#7a33c4', '#f2f2f2', '#2a2a2a', '#29c4b0', '#f07ab8', '#8a4b22', '#5bb8e8', '#1a2f6b', '#5a1414'];
  const PARTS = {
    engine: { name: 'ENGINE', desc: 'Top speed. Rules superspeedways and long straights.' },
    aero: { name: 'AERO', desc: 'Downforce & drafting. Big on intermediates.' },
    chassis: { name: 'CHASSIS', desc: 'Handling & grip. Wins short tracks and road courses.' },
  };
  const PART_W = {
    short: { engine: .25, aero: .2, chassis: .55 }, intermediate: { engine: .35, aero: .4, chassis: .25 },
    superspeedway: { engine: .55, aero: .35, chassis: .10 }, road: { engine: .2, aero: .3, chassis: .5 },
  };
  const FACILITIES = {
    shop: { name: 'SHOP', desc: 'Faster R&D, bigger part gains, more engineering points. LV 3 / 6 unlock bigger R&D projects.' },
    engineDept: { name: 'ENGINE DEPT', desc: 'Extra horsepower and engine reliability.' },
    simulator: { name: 'SIMULATOR', desc: 'Sharpens drivers on race day, grows young talent and sharpens scout reports.' },
    pitCenter: { name: 'PIT CREW CENTER', desc: 'Faster pit stops and fewer pit road mistakes.' },
    // v1.3
    windTunnel: { name: 'WIND TUNNEL', desc: 'Extra aero on every car. Big on intermediates and in the draft.' },
    chassisRig: { name: 'CHASSIS RIG', desc: 'Extra chassis grip. Wins short tracks, road courses and kart tracks.' },
    fanShop: { name: 'MERCH STORE', desc: 'Sells caps, shirts and die-cast cars. Merch money every race grows with your fans.' },
  };
  const FAC_MAX = 8;
  const FAC_COST = [0, 0, 70000, 140000, 260000, 450000, 700000, 1000000, 1400000]; // cost to reach level index
  // v1.3 R&D tiers: standard always; major needs SHOP LV 3; moonshot needs SHOP LV 6
  const RND_TIERS = [
    { id: 1, name: 'UPGRADE', shop: 1, cost: 1, ep: 1, days: 1, gain: 1 },
    { id: 2, name: 'MAJOR PROJECT', shop: 3, cost: 2.4, ep: 1.8, days: 1.6, gain: 2.1 },
    { id: 3, name: 'MOONSHOT', shop: 6, cost: 5, ep: 3, days: 2.2, gain: 3.6 },
  ];
  // Grassroots used cars for a brand-new owner (ARCA). Ratings are offsets from the ARCA floor.
  const USED_CARS = [
    { id: 'junker', name: 'RUSTY USED CAR', price: 4000, desc: 'RUNS... MOSTLY. LEAVES THE MOST CASH FOR THE SEASON.', parts: { engine: -4, aero: -6, chassis: -5 }, livery: { body: '#8a8a8a', stripe: '#5a1414' } },
    { id: 'used', name: 'USED ARCA CAR', price: 8000, desc: 'A TIRED EX-TEAM CAR. HONEST AND RELIABLE.', parts: { engine: -1, aero: -2, chassis: -1 }, livery: { body: '#1d5fd1', stripe: '#f2f2f2' } },
    { id: 'rebuilt', name: 'REBUILT CHASSIS', price: 12500, desc: 'FRESH WELDS, OLD MOTOR. BEST BUY, TIGHTEST BUDGET.', parts: { engine: 1, aero: 2, chassis: 4 }, livery: { body: '#f2f2f2', stripe: '#d9342b' } },
  ];
  const LOCAL_SPONSORS = [['JOES TIRE SHOP', '#2a2a2a', '#f2d22e'], ['MAIN ST DINER', '#5bb8e8', '#c4232b'], ['COUNTY LINE FEED', '#4a6b2a', '#f2c45a'], ['BIG ALS BODY SHOP', '#c4232b', '#f2f2f2'],
    ['RIVERSIDE HARDWARE', '#1f6b4a', '#f2f2f2'], ['SMITTYS BAIT & TACKLE', '#29c4b0', '#1a1a1a'], ['GRANNYS PIES', '#f2c4dc', '#8a4b22'], ['LAKEVIEW CAR WASH', '#11b5e4', '#f2f2f2'],
    ['DOUBLE D TOWING', '#f28c18', '#1a1a1a'], ['VFW POST 112', '#1a2f6b', '#f2f2f2']];
  // v1.3: karting and open-wheel starter lots (offsets from the series floor, like USED_CARS)
  const USED_KARTS = [
    { id: 'rental', name: 'EX-RENTAL KART', price: 900, desc: 'BENT FRAME, TIRED MOTOR. CHEAP!', parts: { engine: -4, aero: -5, chassis: -6 }, livery: { body: '#f28c18', stripe: '#1a1a1a' } },
    { id: 'club', name: 'CLUB KART', price: 1800, desc: 'A SOLID HAND-ME-DOWN FROM A CLUB RACER.', parts: { engine: -1, aero: -2, chassis: -1 }, livery: { body: '#1d5fd1', stripe: '#f2f2f2' } },
    { id: 'prepped', name: 'RACE-PREPPED KART', price: 2800, desc: 'NEW TIRES, FRESH ENGINE. BEST BUY.', parts: { engine: 1, aero: 1, chassis: 4 }, livery: { body: '#f2f2f2', stripe: '#d9342b' } },
  ];
  const USED_OW = [
    { id: 'owjunk', name: 'TIRED JUNIOR CAR', price: 4000, desc: 'AN OLD CHASSIS WITH A LOT OF MILES.', parts: { engine: -4, aero: -6, chassis: -5 }, livery: { body: '#8a8a8a', stripe: '#1d5fd1' } },
    { id: 'owused', name: 'USED USF JUNIORS CAR', price: 8000, desc: 'EX-TEAM CAR. HONEST AND RELIABLE.', parts: { engine: -1, aero: -2, chassis: -1 }, livery: { body: '#1a2f6b', stripe: '#f2d22e' } },
    { id: 'owprep', name: 'FRESH REBUILD', price: 12500, desc: 'NEW WINGS, OLD MOTOR. BEST BUY.', parts: { engine: 1, aero: 3, chassis: 3 }, livery: { body: '#f2f2f2', stripe: '#d9342b' } },
  ];
  function usedLot(si) { const sr = SERIES[si]; return sr.kart ? USED_KARTS : sr.path === 'indy' ? USED_OW : USED_CARS; }
  // v1.3 random team events. amt = dollars at ARCA money (scaled by series), plus side effects
  const TEAM_EVENTS = [
    { id: 'sponsorBonus', good: true, w: 3, amt: 4000, title: 'SPONSOR BONUS', text: '{sp} LOVED THE TV TIME AND SENT A BONUS CHECK!' },
    { id: 'viral', good: true, w: 3, amt: 2500, rep: 1.5, title: 'VIRAL MOMENT', text: 'A CLIP OF YOUR PIT CREW GOES VIRAL. MERCH FLIES OFF THE SHELF!' },
    { id: 'fanFund', good: true, w: 2, amt: 2000, title: 'FAN CLUB CROWDFUND', text: 'YOUR FAN CLUB CHIPPED IN FOR A SET OF TIRES.' },
    { id: 'tvFeature', good: true, w: 2, amt: 1500, rep: 1, title: 'LOCAL TV FEATURE', text: 'THE LOCAL NEWS RAN A STORY ON THE TEAM. NEW FANS ARE SIGNING UP.' },
    { id: 'contingency', good: true, w: 2, amt: 2500, title: 'CONTINGENCY AWARD', text: 'A PARTS SUPPLIER PAID OUT A CONTINGENCY AWARD.' },
    { id: 'partsSale', good: true, w: 1, amt: 1200, ep: 4, title: 'OLD PARTS SOLD', text: 'THE CREW SOLD OLD PARTS ONLINE AND LEARNED A THING OR TWO.' },
    { id: 'hauler', good: false, w: 3, amt: -3500, title: 'HAULER BREAKDOWN', text: 'THE HAULER BROKE DOWN ON THE INTERSTATE. TOWING AND REPAIRS.' },
    { id: 'fine', good: false, w: 2, amt: -2500, title: 'SERIES FINE', text: 'OFFICIALS FINED THE TEAM FOR AN UNSECURED LUG NUT IN PRACTICE.' },
    { id: 'storm', good: false, w: 2, amt: -3000, title: 'SHOP FLOODED', text: 'A STORM FLOODED THE SHOP. CLEANUP ISN\'T CHEAP.' },
    { id: 'tires', good: false, w: 2, amt: -1500, title: 'TIRE PRICES UP', text: 'THE TIRE SUPPLIER RAISED PRICES THIS WEEK.' },
    { id: 'engineer', good: false, w: 1, amt: -500, ep: -8, title: 'ENGINEER QUITS', text: 'AN ENGINEER LEFT FOR A RIVAL TEAM AND TOOK SOME NOTES WITH HIM.' },
    { id: 'flu', good: false, w: 1, amt: -300, morale: -10, title: 'DRIVER CAUGHT THE FLU', text: '{drv} RACED SICK. MORALE IS DOWN.' },
  ];
  // v1.3 bad-word blocker for player-entered names (ROT13 so the source stays clean).
  // strong = blocked anywhere inside a word; whole = blocked only as a whole word (so BASS, HANCOCK, ESSEX are fine)
  const r13 = w => w.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));
  const BAD_STRONG = ['shpx', 'fuvg', 'phag', 'avttre', 'avttn', 'snttbg', 'snt', 'ovgpu', 'juber', 'fyhg', 'chffl', 'cravf', 'intvan', 'cbea', 'anmv', 'uvgyre', 'ergneq', 'gjng', 'jnax', 'onfgneq', 'nffubyr', 'wnpxnff', 'zbgureshp', 'xvxr', 'genaal', 'qvpxurnq', 'pbpxfhpx', 'qvyqb', 'zbyrfg', 'crqb', 'fuvggl', 'ohggubyr', 'qbhpur', 'oybjwbo', 'unaqwbo', 'ohyyfuvg', 'ubeal', 'betl', 'xxx', 'nffung', 'nffjvc'].map(r13);
  const BAD_WHOLE = ['nff', 'nffrf', 'pbpx', 'pbpxf', 'pbbpu', 'enpr', 'encr', 'encvfg', 'fcvp', 'puvax', 'qlxr', 'phz', 'frk', 'frkl', 'obbo', 'obbof', 'gvgf', 'gvggl', 'nany', 'cvff', 'grng', 'fyhgf', 'jgs', 'fgss', 'xlf', 'avt', 'ubr', 'ubrf', 'cevpx', 'qvpx', 'qvpxf', 'whzc'].map(r13).filter(w => w !== 'race' && w !== 'jump' && w !== 'dick' && w !== 'dicks');
  function cleanToken(t) {
    const leet = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' };
    return String(t).toLowerCase().replace(/[0-9!|@$+]/g, c => leet[c] || c).replace(/[^a-z]/g, '').replace(/(.)\1{2,}/g, '$1$1');
  }
  // returns true when a name is OK to show
  function nameOk(name) {
    const raw = String(name || '').trim(); if (!raw) return true;
    const toks = raw.split(/\s+/).map(cleanToken).filter(Boolean);
    const words = toks.slice();
    // "F U C K" or "F. U. C. K." -> one word
    let run = ''; for (const t of toks) { if (t.length === 1) run += t; else { if (run.length > 1) words.push(run); run = ''; } } if (run.length > 1) words.push(run);
    const single = w => w.replace(/(.)\1+/g, '$1');
    for (const w of words) {
      const cands = [w, single(w)];
      if (cands.some(c => BAD_STRONG.some(b => c.includes(b)))) return false;
    }
    for (const w of toks) if (BAD_WHOLE.includes(w) || BAD_WHOLE.includes(single(w))) return false;
    return true;
  }
  const POINTS = [40, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const XP_PER_LEVEL = 120;
  // ---------- v1.1 ----------
  const VERSION = '1.10';
  // Driver stats shown on cards (aggression is a style: more passes, more wrecks)
  const DRIVER_STATS = [
    ['speed', 'SPEED', 'RAW PACE. THE BIGGEST PART OF LAP TIME.'],
    ['cons', 'CONSISTENCY', 'FEWER MISTAKES AND SPINS, STEADIER LAPS.'],
    ['craft', 'RACECRAFT', 'PASSING AND DRAFTING. HUGE ON SUPERSPEEDWAYS.'],
    ['tires', 'TIRE MGMT', 'SLOWER TIRE WEAR ON LONG RUNS.'],
    ['fuel', 'FUEL SAVING', 'STRETCHES A TANK FURTHER.'],
    ['pit', 'PIT RD/RESTART', 'HITS PIT BOX MARKS, JUMPS RESTARTS.'],
    ['aggr', 'AGGRESSION', 'MORE PASS TRIES - BUT MORE WRECKS.'],
  ];
  const DEV_MAX = 2; // development (reserve) driver spots
  // Second car: price & per-race costs are scaled by series in career.js
  const CAR2 = { price: 45000, rep: 20, runBase: 5000 };
  // Scouts: cost is ARCA price, scaled up in higher series. acc = how much a report reveals (0..1)
  const SCOUTS = [
    { id: 'local', name: 'LOCAL SCOUT', cost: 1000, acc: 0.25, n: 2, potBoost: 0, desc: 'A BUDDY WITH A STOPWATCH. CHEAP, FUZZY REPORTS.' },
    { id: 'regional', name: 'REGIONAL SCOUT', cost: 4000, acc: 0.42, n: 3, potBoost: 6, desc: 'COVERS A FEW STATES. CLEARER REPORTS, BETTER KIDS.' },
    { id: 'national', name: 'NATIONAL SCOUT', cost: 12000, acc: 0.58, n: 3, potBoost: 12, desc: 'THE PRO. SHARP REPORTS AND THE BEST HIDDEN TALENT.' },
  ];
  const FEEDERS = [
    { id: 'karting', name: 'KARTING', age: [14, 17], cur: -6, pot: 14, bias: { speed: 4, craft: 2, fuel: -5, pit: -3 }, desc: 'YOUNG & RAW. HIGHEST CEILING.' },
    { id: 'latemodel', name: 'LATE MODELS', age: [18, 27], cur: 5, pot: 3, bias: { cons: 4, tires: 4, fuel: 3 }, desc: 'READY NOW. LESS UPSIDE.' },
    { id: 'dirt', name: 'DIRT OVALS', age: [16, 25], cur: 0, pot: 8, bias: { craft: 6, aggr: 18, cons: -4 }, desc: 'FEARLESS PASSERS. WILD.' },
    { id: 'legends', name: 'LEGENDS CARS', age: [15, 21], cur: -3, pot: 10, bias: { pit: 5, speed: 2, craft: 2 }, desc: 'SHARP KIDS. GOOD RESTARTS.' },
  ];
  // Trophy cabinet catalog. kind = sprite, metal = color. Per-track and per-series trophies are built from TRACKS/SERIES.
  const MILESTONES = [
    ['firstStart', 'FIRST START', 'star', 'bronze', 'RUN YOUR FIRST RACE.'],
    ['firstTop10', 'FIRST TOP-10', 'star', 'bronze', 'FINISH A RACE IN THE TOP 10.'],
    ['firstStage', 'STAGE WINNER', 'star', 'silver', 'WIN A STAGE.'],
    ['firstPole', 'POLE SITTER', 'star', 'silver', 'QUALIFY ON POLE.'],
    ['firstPodium', 'FIRST PODIUM', 'medal', 'silver', 'FINISH TOP 3.'],
    ['firstWin', 'FIRST WIN', 'cup', 'gold', 'WIN A RACE.'],
    ['firstSponsor', 'FIRST SPONSOR', 'star', 'bronze', 'SIGN YOUR FIRST SPONSOR.'],
    ['firstProspect', 'TALENT SPOTTER', 'star', 'silver', 'SIGN A SCOUTED PROSPECT.'],
    ['twoCars', 'TWO-CAR TEAM', 'star', 'gold', 'RUN A SECOND CAR.'],
    ['oneTwo', 'ONE-TWO FINISH', 'cup', 'silver', 'YOUR TWO CARS FINISH 1ST AND 2ND.'],
    ['wins10', '10 WINS', 'big', 'silver', 'WIN 10 RACES AS A TEAM.'],
    ['wins25', '25 WINS', 'big', 'gold', 'WIN 25 RACES AS A TEAM.'],
    ['million', 'MILLIONAIRE', 'star', 'gold', 'HAVE $1,000,000 IN THE BANK.'],
    ['dodgeWin', 'DODGE UNDERDOG', 'cup', 'silver', 'WIN A RACE WITH A DODGE DEAL.'], // v1.8.1
  ];
  const CUP_TROPHIES = [
    ['playoff', 'PLAYOFF BERTH', 'medal', 'silver', 'MAKE THE CUP PLAYOFFS.'],
    ['round8', 'ROUND OF 8', 'medal', 'silver', 'SURVIVE TO THE CUP ROUND OF 8.'],
    ['champ4', 'CHAMPIONSHIP 4', 'medal', 'gold', 'REACH THE CUP CHAMPIONSHIP 4 FINALE.'],
    ['cupChamp', 'CUP CHAMPION', 'big', 'gold', 'WIN THE CUP SERIES CHAMPIONSHIP.'],
  ];
  // v1.3: open-wheel and karting trophies
  const INDY_TROPHIES = [
    ['kartChamp', 'KART CHAMPION', 'cup', 'bronze', 'WIN THE REGIONAL KART SERIES CHAMPIONSHIP.'],
    ['indy500', 'INDY 500 WINNER', 'big', 'gold', 'WIN THE INDY 500 (INDYCAR).'],
    ['indyChamp', 'INDYCAR CHAMPION', 'big', 'gold', 'WIN THE INDYCAR SERIES CHAMPIONSHIP.'],
  ];
  const CHANGELOG = [
    { v: '1.10', date: 'NOV 27, 2026', title: 'TEAM HQ', items: [
      'NEW: TEAM HQ - A PIXEL-ART CAMPUS FOR YOUR RACE SHOP. TAP A BUILDING TO SEE ITS LEVEL, WHAT IT DOES AND TO UPGRADE IT. BUILDINGS GROW AS THEY LEVEL UP: BIGGER, MORE DETAIL, LIGHTS, HAULERS AND FLAGS.',
      'YOUR FACILITIES ARE THE HQ BUILDINGS: UPGRADING IN TEAM HQ IS THE SAME AS UPGRADING ON THE FACILITIES LIST (STILL THERE UNDER LIST VIEW). THE FAN SHOP IS NOW THE MERCH STORE.',
      'NEW STAT: FANS. WINS, TOP 5S, TOP 10S AND PLAYOFF RUNS GROW YOUR FAN BASE; BAD RACES LOSE A FEW. FANS SHOW ON THE HUB, IN TEAM HQ AND AFTER EVERY RACE.',
      'MERCH SALES NOW GROW WITH YOUR FANS. NEW BUILDINGS: FAN ZONE (FANS GROW FASTER) AND HOSPITALITY SUITES (BETTER SPONSOR OFFERS). OLD SAVES GET FANS FROM THEIR REP AND RESULTS.',
    ] },
    { v: '1.9', date: 'NOV 27, 2026', title: 'OWNER LEAGUE', items: [
      'NEW: OWNER LEAGUE - ONLINE SEASONS FOR 2 TO 8 TEAM OWNERS ON GAME JOLT. CREATE A LEAGUE (NAME, 6 / 10 / 16 REAL CUP TRACKS, MAX OWNERS) AND SHARE ITS 6-CHARACTER CODE, OR JOIN WITH A CODE. YOU ARE THE OWNER, NEVER THE DRIVER.',
      'BUILD A LEAGUE TEAM: NAME, CAR NUMBER, CHEVY / FORD / TOYOTA / DODGE AND ONE DRIVER FROM A POOL (ALL RATED THE SAME, EACH WITH HIS OWN STRENGTH). EVERY OWNER STARTS WITH THE SAME CAR AND BUDGET.',
      'EVERY RACE WEEK: PICK THE SETUP, RACE STRATEGY (PUSH / NORMAL / SAVE) AND PIT PLAN ON CAUTIONS (2 TIRES / 4 TIRES / FUEL ONLY), AND SPEND PRIZE MONEY ON ENGINE, AERO AND PIT CREW UPGRADES THAT LAST ALL SEASON.',
      'THE RACE RUNS WHEN EVERY OWNER IS IN, OR WHEN THE COMMISSIONER TAPS RUN RACE (LATE OWNERS USE THEIR LAST PICKS). THE REAL RACE SIM DECIDES IT - THE SAME RESULT FOR EVERYONE - WITH AI CARS FILLING A 38-CAR FIELD.',
      'RESULTS WITH HEADLINES, WATCH REPLAY OF ANY LEAGUE RACE, CUP-STYLE STANDINGS, THE SCHEDULE AND A CHAMPION CELEBRATION. YOUR CAREER SAVE IS NOT TOUCHED. NEEDS A SIGNED-IN GAME JOLT PLAYER.',
    ] },
    { v: '1.8.1', date: 'NOV 27, 2026', title: 'GAME JOLT TROPHIES', items: [
      'PLAYING ON GAME JOLT WHILE SIGNED IN? YOUR TROPHIES NOW UNLOCK ON GAME JOLT TOO: FIRST START, FIRST TOP-10, FIRST SPONSOR, KART CHAMPION, FIRST PODIUM, POLE SITTER, PLAYOFF BERTH, FIRST WIN, TWO-CAR TEAM, MILLIONAIRE, INDY 500 WINNER, INDYCAR CHAMPION AND CUP CHAMPION. YOU ARE STILL THE OWNER / MANAGER, NEVER THE DRIVER.',
      'NEW TROPHY - DODGE UNDERDOG: WIN A RACE WITH A DODGE DEAL. IT SHOWS IN THE TROPHY CABINET AND ON GAME JOLT.',
      'TROPHIES YOU ALREADY EARNED IN YOUR SAVE ARE SENT TO GAME JOLT ONCE, THE NEXT TIME YOU PLAY THERE.',
      'NEW GAME JOLT SCORE TABLE: YOUR TEAM\'S CAREER WINS. IT UPDATES AFTER A RACE WHEN THE NUMBER GOES UP.',
      'GUESTS, OFFLINE PLAY AND OTHER SITES WORK JUST AS BEFORE. FREE MODE AND THE TUTORIAL NEVER COUNT.',
    ] },
    { v: '1.8', date: 'NOV 27, 2026', title: 'DODGE IS BACK', items: [
      'DODGE RETURNS TO THE CUP SERIES FROM 2027 AS A 4TH MANUFACTURER, NEXT TO CHEVROLET, FORD AND TOYOTA. CUP ONLY: THE TRUCK AND O\'REILLY SERIES KEEP THE BIG 3. YOU ARE STILL THE OWNER / MANAGER, NEVER THE DRIVER.',
      'KAULIG RACING IS DODGE\'S FACTORY TEAM: ONE MID-PACK AI CUP TEAM NOW RUNS AS KAULIG RACING (#16 WHEN THE NUMBER IS FREE) IN BLACK AND RED.',
      'DODGE IS THE UNDERDOG: ITS DEALS PAY 20% LESS AND ITS ENGINE BOOST STARTS AT 75% OF THE BIG 3 IN 2027, THEN CATCHES UP EVERY SEASON (ABOUT EVEN BY 2030).',
      'UNDERDOG PERK: A DODGE DEAL PAYS A WIN BONUS (12% OF THE SEASON DEAL) FOR EACH RACE YOUR TEAM WINS, UP TO 3 A SEASON. IT SHOWS ON THE OFFER AND IN THE RACE MONEY.',
      'DODGE GETS ITS OWN BLACK-AND-RED BADGE IN BUSINESS > MANUFACTURER AND ON THE HUB. OLD SAVES LOAD AS BEFORE; A CUP SAVE PICKS UP KAULIG RACING AND DODGE OFFERS.',
    ] },
    { v: '1.7.1', date: 'NOV 25, 2026', title: 'WHEEL TO WHEEL', items: [
      'THE FIELD NOW RACES SINGLE FILE IN THE RACING LINE AND BATTLES FOR REAL: A FASTER CAR CLOSES UP, PULLS OUT, GOES SIDE BY SIDE FOR A FEW SECONDS AND EITHER MAKES THE PASS OR LIFTS AND TUCKS BACK IN. THE CAR AHEAD SOMETIMES DEFENDS.',
      'ROAD, STREET AND KART TRACKS: PASSES ARE MADE INTO THE BRAKING ZONES, THEN IT IS SINGLE FILE AGAIN.',
      'DRAFTING TRACKS (DAYTONA, TALLADEGA, ATLANTA) KEEP THEIR TWO- AND THREE-WIDE PACKS. RESTARTS ARE STILL DOUBLE FILE EVERYWHERE.',
      'RACE PACE AND RESULTS ARE TUNED TO STAY WHERE THEY WERE: THE SAME CARS AND DRIVERS RUN UP FRONT.',
      'KART TRACKS GET THEIR OWN PIT LANE: A SEPARATE ROAD OFF THE TRACK WITH ONE ROW OF FULL-SIZE BOXES, EVEN FOR A 40-CAR FIELD IN FREE MODE. NO MORE TINY CARS IN A CRAMPED TWO-ROW LANE. IN CLASSIC AND 3D.',
    ] },
    { v: '1.7', date: 'NOV 25, 2026', title: '3D RACE VIEW', items: [
      'NEW SETTING - RACE VIEW: CLASSIC (THE PIXEL TRACK MAP) OR 3D. CLASSIC STAYS THE DEFAULT. IN 3D THE TRACK AND THE CARS ARE DRAWN IN 3D; THE LEADERBOARD, PIT WALL, RADIO CALLS, FLAGS AND EVERY BUTTON STAY JUST THE SAME.',
      '3D WORKS ON EVERY TRACK: BANKED OVALS WITH SAFER WALLS, CATCH FENCES AND GRANDSTANDS, ROAD COURSES AND KART TRACKS WITH CURBS AND GRASS, STREET CIRCUITS BETWEEN CONCRETE WALLS - WITH PIT ROAD, THE PIT BOXES (TWO-ROW LANES TOO) AND THE START / FINISH LINE.',
      'STOCK CARS AND TRUCKS, OPEN-WHEEL CARS AND KARTS IN TEAM COLORS WITH THEIR NUMBERS. YOUR CARS (YOU ARE THE OWNER) WEAR A YELLOW (CAR 1) OR CYAN (CAR 2) MARKER.',
      'THE CAMERA BUTTON (C ON A KEYBOARD) SWITCHES BETWEEN TV CAM (HIGH BROADCAST ANGLE) AND CHASE. RAIN DARKENS THE SKY AND MAKES THE TRACK LOOK WET.',
      '3D QUALITY: LOW (FASTER, NO SHADOWS) OR HIGH. NO WEBGL, OR THE PHONE DROPS THE 3D VIEW? THE RACE CARRIES ON IN THE CLASSIC VIEW.',
    ] },
    { v: '1.6.2', date: 'NOV 25, 2026', title: 'PIT BOX FIX', items: [
      'PIT BOX FIX: PIT BOXES NO LONGER OVERLAP OR RUN INTO THE TURNS. EVERY KART TRACK NOW HAS A STRAIGHT TWO-ROW PIT / GRID LANE (BOXES ON BOTH SIDES OF THE FAST LANE) INSTEAD OF BOXES PILED UP IN THE HAIRPIN.',
      'TIGHT ROAD COURSES (SONOMA, WATKINS GLEN, COTA, BARBER, MID-OHIO, LAGUNA SECA, LONG BEACH) AND BIG FIELDS ON SHORT OVALS (PHOENIX, RICHMOND, IOWA, DOVER, NEW HAMPSHIRE, GATEWAY, NASHVILLE) FIT THEIR BOXES ON THE STRAIGHT: SHIFTED, A LITTLE SMALLER, OR IN TWO ROWS.',
      'NO MORE CURBS FROM THE NEXT CORNER PAINTED ACROSS PIT ROAD ON THE KART TRACKS. THE VERSION LABEL NOW SHOWS THE FULL PATCH NUMBER.',
    ] },
    { v: '1.6', date: 'NOV 24, 2026', title: "OWNER'S BOX", items: [
      'NEW BUSINESS BUTTON ON THE HUB (NEXT TO FREE MODE): CHARTERS, RIVAL OWNERS AND MANUFACTURER DEALS IN ONE PLACE. YOU ARE STILL THE OWNER / MANAGER, NEVER THE DRIVER.',
      'CUP CHARTERS: THE CUP SERIES HAS 36 CHARTERS AND A 40-CAR FIELD. A CHARTERED CAR IS GUARANTEED A STARTING SPOT AND GETS A 30% BIGGER SHARE OF THE PURSE. OPEN CARS RACE IN ON QUALIFYING SPEED - ONLY 4 OPEN SPOTS, SO SOME OPEN CARS GO HOME (DID NOT QUALIFY: NO PURSE, BILLS STILL DUE).',
      'THE CHARTER MARKET: BUY A CHARTER FROM A RIVAL OWNER, SELL ONE, LEASE ONE IN FOR THE REST OF THE SEASON, OR LEASE YOURS OUT FOR CASH. CHARTER VALUES RISE AND FALL WEEK TO WEEK, JUMP BETWEEN SEASONS, AND YOUR OWN CHARTER IS WORTH MORE WHEN YOUR TEAM RUNS WELL. YOU CAN BUY ONE AS EARLY AS THE O\'REILLY SERIES. THE CUP BUY-IN STILL GETS YOU IN AS AN OPEN TEAM, AND LEASING KEEPS CUP AFFORDABLE.',
      'RIVAL OWNERS: FOUR AI OWNERS (VANCE KOLBY, DELIA MARCHETTI, HOLT BRANNIGAN AND REGGIE OKAFOR) TRY TO POACH YOUR DRIVERS AND YOUR NEW CREW CHIEF - MOSTLY WHEN A CONTRACT IS IN ITS LAST YEAR OR THE DRIVER IS RUNNING WELL. YOU GET A NEWS ALERT: COUNTER (A BIDDING WAR OF UP TO 3 ROUNDS) OR LET THEM GO. HAPPY, LOYAL DRIVERS ARE EASIER TO KEEP. RIVALS ALSO BID FOR THE PROSPECTS YOU SCOUT.',
      'CREW CHIEF: EVERY TEAM NOW HAS A CREW CHIEF. A GOOD ONE MAKES PIT STOPS A LITTLE QUICKER. LOSE YOURS AND SOMEONE FROM THE SHOP STEPS UP.',
      'MANUFACTURER DEALS: CHEVROLET, FORD OR TOYOTA IN NASCAR, HONDA OR CHEVROLET ENGINES IN INDYCAR (THE JUNIOR OPEN-WHEEL SERIES USE SPEC ENGINES). OFFERS COME WITH REP AND RESULTS: CASH EVERY RACE AND AN ENGINE BOOST, WITH GOALS LIKE TOP-10 FINISHES OR A WIN. HIT THEM AND THE NEXT DEAL GETS BETTER; MISS THEM AND IT SHRINKS OR ENDS. ONE MAKE AT A TIME - SWITCHING COSTS MONEY. YOUR MAKE SHOWS AS A BADGE ON THE HUB.',
      'CHARLOTTE GETS A LONGER, FLATTER FRONTSTRETCH SO THE 40-CAR CUP PIT ROAD FITS.',
      'RACE DAY - DRIVER RADIO: YOUR DRIVER RADIOS HANDLING TROUBLE DURING THE RACE ("LOOSE IN", "TIGHT OFF", "REARS ARE GOING", "VIBRATION") IN A SMALL BUBBLE THAT NEVER STOPS THE RACE. AT YOUR NEXT STOP THE PIT MENU OFFERS THE FIX: WEDGE, TRACK BAR OR AIR PRESSURE FOR STOCK CARS, FRONT WING, REAR WING OR PRESSURES FOR OPEN-WHEEL CARS (THE CREW CHIEF\'S PICK IS MARKED). THE RIGHT FIX BRINGS THE PACE BACK; THE WRONG ONE (OR NONE) AND THE CAR KEEPS GETTING SLOWER. DRIVERS WITH GOOD FEEDBACK GIVE CLEARER CALLS, AND QUALIFYING TRIM BRINGS MORE HANDLING TROUBLE THAN RACE TRIM.',
      'RACE DAY - PIT CREW: HIRE A BETTER PIT CREW (5 LEVELS, PAID EVERY RACE) AND TRAIN IT ONCE BETWEEN RACES IN BUSINESS > PIT CREW. ONE PIT CREW NUMBER SHOWS EVERYTHING: PIT CENTER + CREW CHIEF + PIT CREW + TRAINING. DURING YOUR STOPS A QUICK TAP GAME APPEARS: TAP (CLICK OR SPACE) WHEN THE MARKER IS ON THE GREEN FOR EACH WHEEL - GOOD TAPS SHAVE TIME, MISSES ADD TIME AND CAN COST A LOOSE-WHEEL PENALTY. AUTO SKIPS IT AND USES YOUR CREW LEVEL (TURN THE GAME OFF ON THE QUALIFYING SCREEN).',
      'RACE DAY - WEATHER: EVERY RACE WEEKEND HAS A FORECAST (SUNNY, CLOUDY OR RAIN LIKELY, WITH A RAIN CHANCE) ON PRACTICE, QUALIFYING AND THE HUB TICKER. ON OVALS RAIN BRINGS A CAUTION AND A RED FLAG; PAST HALFWAY THE RACE CAN BE CALLED AND MADE OFFICIAL. ROAD AND STREET COURSES RACE IN THE RAIN: WETS OR SLICKS, AND THE SWITCH TIMING ON A DRYING TRACK MATTERS. AI TEAMS MAKE THEIR OWN TIRE CALLS. A WEATHER ICON SITS IN THE TOP BAR AND LIGHT RAIN IS DRAWN UNDER THE CARS.',
      'RACE DAY - DRIVER DRAMA: DRIVERS HAVE PERSONALITIES (HOTHEAD, CALM, SHOWMAN, TEAM PLAYER). ON-TRACK CONTACT CAN START A FEUD, A GRUDGE CAN TURN INTO A PAYBACK WRECK, AND AN INTENTIONAL WRECK BRINGS A NASCAR FINE AND LOST POINTS. DRAMA BRINGS FAN HYPE AND A MERCH BOOST. IT SHOWS IN THE NEWS TICKER AND IN BUSINESS > DRAMA, WHERE YOU BACK YOUR DRIVER, FINE HIM OR CALM HIM DOWN - EACH CHANGES MORALE (AND SO HIS LOYALTY) AND THE GRUDGE.',
      'SAVES FROM V1.0 TO V1.5 (AND EARLIER V1.6 SAVES) STILL LOAD. A CUP TEAM FROM AN OLDER SAVE KEEPS RACING WITH A CHARTER, AND EVERY OLD SAVE STARTS WITH A VOLUNTEER PIT CREW, NO FEUDS AND A PERSONALITY FOR EACH DRIVER.',
    ] },
    { v: '1.5', date: 'NOV 24, 2026', title: 'STREET FIGHT', items: [
      'THE 5 STREET CIRCUITS NOW LOOK LIKE THE REAL ONES: ST. PETE, LONG BEACH, DETROIT, TORONTO AND CHICAGO ARE TRACED FROM THE REAL MAPS WITH THE RIGHT NUMBER OF TURNS, IN THE RIGHT ORDER, RUNNING THE RIGHT WAY ROUND.',
      'ST. PETE (14 TURNS): THE LONG FRONT STRAIGHT ON THE ALBERT WHITTED AIRPORT RUNWAY (WITH RUNWAY MARKINGS), THE SHARP TURN 1 RIGHT-HANDER, THE BAYSHORE BACK STRAIGHT, THE TWISTY BIT ROUND PIONEER PARK, TURN 10 BY THE DALI MUSEUM, THE BAY AND A MARINA.',
      'LONG BEACH (11 TURNS): THE CURVING SHORELINE DRIVE FRONT STRAIGHT, TURN 1 AND THE FOUNTAIN, PINE AVENUE, SEASIDE WAY PAST THE CONVENTION CENTER AND ARENA, THE FAMOUS TIGHT TURN 11 HAIRPIN, THE HARBOR AND THE AQUARIUM.',
      'DETROIT (9 TURNS, 2023 DOWNTOWN LAYOUT): THE LONG JEFFERSON AVENUE STRAIGHT WITH A SPLIT PIT LANE IN THE MEDIAN (BOXES ON BOTH SIDES), THE TURN 3 HAIRPIN, THE RIVERFRONT, THE RENAISSANCE CENTER TOWERS AND HUNTINGTON PLACE.',
      'TORONTO (11 TURNS): PRINCES\' BOULEVARD AND THE PRINCES\' GATES, THE LAKE SHORE BOULEVARD STRAIGHT, THE TURN 3 HAIRPIN, BMO FIELD, EXHIBITION PLACE AND LAKE ONTARIO.',
      'CHICAGO (12 TURNS): COLUMBUS DRIVE, BALBO, DUSABLE LAKE SHORE DRIVE, MICHIGAN AVENUE AND CONGRESS PLAZA THROUGH GRANT PARK, WITH BUCKINGHAM FOUNTAIN, THE FIELD MUSEUM, LAKE MICHIGAN AND THE SKYLINE.',
      'CITY SCENERY: BLOCKS OF BUILDINGS WITH ROOFTOPS (DIFFERENT HEIGHTS AND COLOURS, AC UNITS, WATER TOWERS, SOLAR PANELS, ROOF GARDENS, HELIPADS), CONCRETE WALLS AND CATCH FENCING, TIRE BARRIERS AT THE HAIRPINS, CURBS IN THE CORNERS, AND THE PADDOCK BEHIND PIT ROAD.',
      'TIERED GRANDSTANDS ALONG THE MAIN STRAIGHT AND AT THE KEY CORNERS. STREETS ARE A LITTLE NARROWER THAN ROAD COURSES, AND PIT ROAD STAYS ON THE START/FINISH STRAIGHT.',
      'THE CARS ALWAYS DRAW ON TOP OF THE SCENERY, SO NOTHING HIDES THE RACING. SAVES CARRY OVER.',
    ] },
    { v: '1.4', date: 'NOV 24, 2026', title: 'RACE DAY', items: [
      'NEW RACE SCREEN: THE TRACK NOW FILLS THE WHOLE SCREEN, WITH SLIM SEE-THROUGH TV GRAPHICS ON TOP. A THIN TOP BAR (FLAG, LAP X/Y, STAGE), A LEADERBOARD ON THE LEFT (POSITION, TEAM COLORS, CAR NUMBER, 3-LETTER NAME, INTERVAL, UP/DOWN ARROWS, PIT TAGS - YOUR CAR SAYS YOU) THAT HIDES WITH A TAP, AND A SMALL PIT-WALL STRIP ON THE RIGHT.',
      'TV GRAPHICS: A START GRAPHIC WITH STARTING LIGHTS, GREEN FLAG / RESTART / WHITE FLAG / STAGE SPLASHES, A CAUTION BANNER THAT SLAMS IN AND THEN SHRINKS TO A STRIP, "CAUTION - FIELD FROZEN" ON THE LEADERBOARD, A LIVE PIT-STOP TIMER, BATTLE FOR THE LEAD, FASTEST LAP, AND A WAVING CHECKERED FLAG AT THE FINISH.',
      'PIT WALL: PUSH / NORM / SAVE, PIT NOW, 4 TIRE GAUGES, A FUEL GAUGE AND YOUR GAP TO THE CARS AHEAD AND BEHIND. PIT CALLS (4 TIRES, 2 TIRES, FUEL ONLY, STAY OUT) SHOW RIGHT IN THE STRIP WITH THE STOP TIME, PLUS A NEW CHASSIS ADJUSTMENT (A LONGER STOP, A SLIGHTLY BETTER CAR AFTER).',
      'REAL-LOOKING PIT ROADS: PIT BOXES NOW SIT ON THE FRONTSTRETCH ONLY (BRISTOL AND MARTINSVILLE SPLIT THEM BETWEEN THE FRONT AND BACK STRAIGHTS, LIKE THE REAL ONES). ENTRY AND EXIT LANES, A PIT WALL WITH CREW CARTS, AN INSIDE WALL LINE AND MARKED BOXES. CARS SHRINK TO FIT THEIR BOX ON PIT ROAD. SOME SHORT OVALS GOT LONGER STRAIGHTS.',
      'REAL-LOOKING GRANDSTANDS: TIERED SEATS WITH CONCOURSES, STAIRS AND A PACKED CROWD, SUITES AND A PRESS BOX OVER THE START/FINISH, A SCORING PYLON IN THE INFIELD, INDY\'S PAGODA AND BRISTOL\'S CENTER-HUNG VIDEO BOARD.',
      'RACE LENGTH SETTING: SPRINT, SHORT, STANDARD OR LONG (SETTINGS - THE GEAR ON THE HUB). LAPS, STAGES, FUEL AND TIRE WEAR SCALE SO STOPS STILL MAKE SENSE. WORKS IN CAREERS AND FREE MODE, FROM THE NEXT RACE.',
      'SEASON LENGTH: PICK 6, 10, 16 OR THE FULL REAL SEASON WHEN YOU START A CAREER, AND CHANGE IT BETWEEN SEASONS. REAL TRACKS IN THE REAL ORDER (FULL CUP SEASON: 36 RACES). PLAYOFFS AND MOVE-UP RULES SCALE WITH IT. NEW TRACKS: NEW HAMPSHIRE, ROCKINGHAM, NORTH WILKESBORO, COTA, THE CHARLOTTE ROVAL, CHICAGO STREETS, MEXICO CITY, LIME ROCK AND THERMAL.',
      'TUTORIAL: A SHORT, SKIPPABLE TOUR WITH A PRACTICE TEAM (YOUR SAVE IS SAFE). OFFERED ON FIRST LAUNCH, REPLAY IT FROM SETTINGS OR PROFILE.',
      'OLD SAVES (V1.0 TO V1.3) STILL LOAD AND KEEP 10-RACE SEASONS.',
    ] },
    { v: '1.3', date: 'NOV 23, 2026', title: 'TWO ROADS', items: [
      'NEW CAREERS START IN KARTING: A CHEAP KART TEAM IN A REGIONAL KART SERIES AT REAL US KART TRACKS - ORLANDO KART CENTER, OCALA GRAN PRIX, GOPRO MOTORPLEX, NEW CASTLE MOTORSPORTS PARK, THE CHARLOTTE MOTOR SPEEDWAY KART TRACK AND PITTRACE - WITH KART ART. YOU ARE STILL THE OWNER / MANAGER, NEVER THE DRIVER.',
      'PICK YOUR PATH AFTER THE KART SEASON: NASCAR (ARCA > TRUCKS > O\'REILLY > CUP) OR THE ROAD TO INDYCAR (USF JUNIORS > USF2000 > USF PRO 2000 > INDY NXT > INDYCAR) WITH OPEN-WHEEL CARS AND REAL-STYLE SCHEDULES: ST. PETE, LONG BEACH, BARBER, THE INDY ROAD COURSE, THE INDY 500, DETROIT, ROAD AMERICA, MID-OHIO, LAGUNA SECA, IOWA, GATEWAY, TORONTO, PORTLAND, MILWAUKEE AND NASHVILLE.',
      'FREE MODE: PICK ANY SERIES, TRACK AND TEAM AND RACE ONE-OFF. IT NEVER TOUCHES YOUR CAREER SAVE.',
      'TRACKS LOOK MORE LIKE THE REAL THING: GRANDSTANDS WHERE THEY REALLY ARE (DAYTONA\'S HUGE FRONTSTRETCH, BRISTOL\'S BOWL ALL THE WAY AROUND, MARTINSVILLE\'S FRONT AND BACK STANDS, TALLADEGA\'S LONG FRONTSTRETCH, THE INDY TURN STANDS), INFIELD GARAGES, DAYTONA\'S AND TALLADEGA\'S INFIELD LAKES AND CITY STREETS ON STREET COURSES.',
      'REAL PIT ROADS: CARS PEEL OFF BEFORE THE START/FINISH AT THE COMMITMENT LINE, EVERY CAR HAS ITS OWN SPACED-OUT PIT BOX ALONG A PROPERLY LONG PIT ROAD (THE POLE SITTER GETS THE BOX NEAREST THE EXIT), AND THE EXIT BLENDS BACK IN AFTER TURN 1-2.',
      'MERCH INCOME EVERY RACE (BUILD A FAN SHOP FOR MORE) AND RANDOM TEAM EVENTS: SPONSOR BONUSES, VIRAL MOMENTS, HAULER BREAKDOWNS, FINES AND MORE.',
      'TECH INSPECTION: AGGRESSIVE SETUPS AND BRAND-NEW PARTS CAN FAIL. PENALTIES RANGE FROM A FINE TO LOST POINTS, OR A RARE DISQUALIFICATION.',
      'PLAYOFFS WITH ELIMINATIONS: CUP (16 > 12 > 8 > CHAMPIONSHIP 4), O\'REILLY AND TRUCKS (12/10 > 8 > 4). INDYCAR AND INDY NXT END WITH A DOUBLE-POINTS FINALE.',
      'DIFFERENT CAR MODELS FOR EVERY SERIES: KART, ARCA, TRUCK, O\'REILLY, CUP, THE OPEN-WHEEL LADDER AND INDYCAR.',
      'CONTRACT EXTENSIONS: OFFER YOUR DRIVERS 1-3 MORE YEARS (LOWBALL, FAIR OR GENEROUS). MORALE DECIDES IF THEY SIGN.',
      'MORE UPGRADES: FACILITIES GO TO LEVEL 8, NEW WIND TUNNEL, CHASSIS RIG AND FAN SHOP, AND BIGGER R&D PROJECTS (MAJOR PROJECT, MOONSHOT).',
      'NAMES: A NEW GAME STARTS WITH EMPTY OWNER AND TEAM NAME BOXES - YOU TYPE YOUR OWN. A BAD-WORD BLOCKER CHECKS EVERY NAME YOU TYPE: OWNER NAME (NEW GAME AND PROFILE), TEAM NAME AND DRIVER NAMES. YOU CAN NOW RENAME YOUR DRIVERS.',
      'ARCA IS A LITTLE FRIENDLIER: SLIGHTLY WEAKER TOP TEAMS, BIGGER PURSES, TOP 6 (OR 2 WINS) EARNS THE CALL-UP AND THE TRUCKS BUY-IN DROPS TO $150K. OLD SAVES STAY ON THE NASCAR PATH.',
    ] },
    { v: '1.2.1', date: 'NOV 23, 2026', title: 'PC SUPPORT', items: [
      'PC SUPPORT: BETTER SCALING, MOUSE AND KEYBOARD. ON A COMPUTER THE GAME NOW SCALES TO FIT THE WINDOW (CENTRED, PHONE-STYLE LAYOUT, NO GIANT TILES OR TINY TEXT) AND THE PIXEL FONT IS SHARP AT ANY SIZE.',
      'MOUSE: HOVER HIGHLIGHTS ON TILES AND BUTTONS, CLICK ANYTHING YOU WOULD TAP, AND THE MOUSE WHEEL SCROLLS LISTS AND SIDEWAYS CARD ROWS. TROPHY SHELVES WRAP SO EVERY TROPHY SHOWS.',
      'KEYBOARD: ESC = BACK / CLOSE, ENTER OR SPACE = GO RACE / CONFIRM. RACE DAY: 1 PUSH, 2 NORMAL, 3 SAVE, 4 OR P PIT NOW, UP/DOWN ARROWS CHANGE PACE, T SWITCHES CAR, C CAMERA, F SPEED. PIT MENUS: 1-4, ENTER = CREW CHIEF CALL. SMALL KEY HINTS SHOW ON COMPUTERS ONLY.',
      'NO ROTATE-YOUR-PHONE SCREEN ON COMPUTERS. PHONES PLAY EXACTLY AS BEFORE, AND ALL SAVES CARRY OVER.',
    ] },
    { v: '1.2', date: 'NOV 22, 2026', title: 'PIT WALL', items: [
      'NEW PIT WALL LOOK: DARK CHARCOAL PANELS, CHECKERED-FLAG TRIM AND NEON YELLOW & RED ACCENTS ACROSS EVERY MENU.',
      'NEW MAIN HUB: EVERY TILE FITS ON ONE SCREEN - GO RACE, GARAGE, DRIVERS, FACILITIES, SPONSORS, CALENDAR, STANDINGS, TROPHIES AND A BIG CAREER TILE WITH A ROAD-TO-THE-CUP BAR.',
      'CAREER DASHBOARD: TAP CAREER MODE FOR THE PIT WALL - DRIVER PORTRAIT & STATS (SWITCH BETWEEN YOUR CARS), SEASON CALENDAR STRIP, NEXT RACE, MINI STANDINGS, SPONSOR SLOTS, WHAT YOU NEED TO MOVE UP (OR THE BOSS CONFIDENCE METER) AND A BIG GO RACE BUTTON.',
      'NEWS TICKER: A TV-STYLE CRAWL ON THE HUB WITH THE NEXT RACE, SPONSOR OFFERS, RESULTS, STANDINGS AND SCOUTING REPORTS.',
      'REAL TRACKS, STARTING WITH DAYTONA: 24 REAL TRACKS (NAMES ONLY) WITH LAYOUTS SHAPED LIKE THE REAL THING, AND REAL LENGTH & BANKING CHANGING HOW EACH RACE PLAYS. EVERY SERIES RUNS A REAL 10-RACE SCHEDULE - THE CUP SEASON OPENS WITH THE DAYTONA 500 AND ENDS AT PHOENIX.',
      'RESTYLED CAREER PICK, TEAM OWNER SETUP AND SEASON-END SCREENS (SEASON SUMMARY, CHAMPION, RACE-BY-RACE STRIP, TROPHIES WON AND YOUR NEXT MOVE).',
      'OLD SAVES CARRY OVER: OLD MADE-UP TRACKS BECOME THE CLOSEST REAL TRACK, TROPHIES INCLUDED.',
    ] },
    { v: '1.1', date: 'NOV 22, 2026', title: 'TWO CARS & TALENT', items: [
      'SECOND CAR: BUY A 2ND CHASSIS IN THE GARAGE ONCE YOUR TEAM HAS THE REP AND CASH. IT HAS ITS OWN DRIVER, PRIMARY SPONSOR, PRIZE MONEY AND PER-RACE COSTS.',
      'BOTH TEAM CARS RACE, GLOW ON TRACK AND IN THE TOWER, AND GET THEIR OWN PIT CALLS (TAP THE CAR TABS ON RACE DAY).',
      'OWNER POINTS: STANDINGS NOW HAVE AN OWNERS TAB THAT ADDS UP BOTH CARS.',
      'HIRED MANAGER: BIGGER TEAMS IN TRUCKS AND UP CAN RUN TWO CARS.',
      'DRIVER STATS: SPEED, CONSISTENCY, RACECRAFT, TIRE MGMT, FUEL SAVING, PIT ROAD/RESTARTS AND AGGRESSION - ALL USED BY THE RACE SIM.',
      'DRIVERS NOW SHOW AGE, POTENTIAL STARS, MORALE, SALARY AND CONTRACT. YOUNG DRIVERS GROW, OLD ONES SLOW DOWN.',
      'SCOUTING: SEND A LOCAL, REGIONAL OR NATIONAL SCOUT TO KARTING, LATE MODELS, DIRT OR LEGENDS. REPORTS SHOW RANGES THAT NARROW THE MORE YOU SCOUT. SIMULATOR LEVEL SHARPENS REPORTS.',
      'DEVELOPMENT DRIVERS: SIGN UP TO 2 PROSPECTS TO GROW ON THE SIDE, THEN PUT THEM IN A CAR.',
      'PODIUM CELEBRATION AFTER EVERY RACE: TOP 3 ON THE PODIUM WITH CONFETTI, CHAMPAGNE AND A TROPHY - EXTRA FIREWORKS WHEN YOUR CAR IS UP THERE. A BIGGER ONE CROWNS THE SEASON CHAMPION.',
      'TROPHY CABINET: A NEW HUB TILE WITH A SHELF FOR EVERY WIN (PER TRACK), PODIUM, TITLE, CUP PLAYOFF RUN, PROMOTION AND MILESTONE. LOCKED ONES SHOW AS SILHOUETTES - TAP ANY TROPHY FOR DETAILS.',
      'THIS UPDATE LOG. OLD SAVES CARRY OVER - YOUR DRIVERS GOT THEIR NEW STATS AUTOMATICALLY.',
    ] },
    { v: '1.0', date: 'NOV 22, 2026', title: 'INITIAL RELEASE', items: [
      'DRAFTMASTER-STYLE PIXEL HUB WITH TEAM, GARAGE, DRIVERS, FACILITIES, SPONSORS, CALENDAR AND STANDINGS.',
      'TWO CAREERS: TEAM OWNER (GRASSROOTS $15K START, USED CAR LOT, ROOKIES, SPONSORS EARNED BY RESULTS) OR HIRED MANAGER.',
      'THE LADDER: ARCA > TRUCKS > O\'REILLY > CUP, WITH CUP PLAYOFFS AND A CHAMPIONSHIP 4 FINALE.',
      'RACE SIM WITH DRAFTING, PASSING, TIRE WEAR, FUEL, CAUTIONS, STAGES AND PIT STOPS ON 12 TRACKS.',
      'PIT-WALL CALLS: PUSH / NORMAL / SAVE, AND 4 TIRES / 2 TIRES / FUEL / STAY OUT UNDER CAUTION.',
      'AUTOSAVE PLUS EXPORT / IMPORT SAVE CODES.',
    ] },
  ];
  return { venue, FULL_CAL, SEASON_LENS, seasonLenName, seasonRaces, scheduleFor, formatFor, promoRule, applyLen, REAL_FMT, standsFor, LAKES, USED_KARTS, USED_OW, usedLot, TEAM_EVENTS, nameOk, LADDERS, PATHS, FORMATS, formatText, POINTS_OW, POINTS_KART, FAC_MAX, RND_TIERS, INDY_TROPHIES, raceT, typeName,
    USED_CARS, LOCAL_SPONSORS, SERIES, TYPES, TRACKS, CALENDARS, FIRST, LAST, TEAM_A, TEAM_B, SPONSORS, BODY_COLORS, PARTS, PART_W, FACILITIES, FAC_COST, POINTS, XP_PER_LEVEL,
    VERSION, DRIVER_STATS, DEV_MAX, CAR2, SCOUTS, FEEDERS, CHANGELOG, MILESTONES, CUP_TROPHIES, OLD_TRACKS, OLD_SHORT, trackT, bankWord, eventName };
})();
