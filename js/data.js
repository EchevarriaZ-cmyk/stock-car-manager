/* Static game data: series, tracks, names, sponsors */
'use strict';
const DATA = (() => {
  const SERIES = [
    { id: 'arca', name: 'ARCA SERIES', short: 'ARCA', cars: 20, mult: 1, aiCar: [27, 54], aiDrv: [26, 60], floor: 30, buyIn: 0,
      purseWin: 30000, sponsorPrimary: 12000, sponsorAssoc: 3000, salaryBase: 1, minBudget: 220000 },
    { id: 'truck', name: 'TRUCK SERIES', short: 'TRUCKS', cars: 24, mult: 2.5, aiCar: [44, 66], aiDrv: [42, 70], floor: 42, buyIn: 200000,
      purseWin: 75000, sponsorPrimary: 30000, sponsorAssoc: 7500, salaryBase: 2.5, minBudget: 600000 },
    { id: 'oreilly', name: "O'REILLY SERIES", short: "O'REILLY", cars: 28, mult: 6, aiCar: [54, 76], aiDrv: [52, 78], floor: 54, buyIn: 1500000,
      purseWin: 180000, sponsorPrimary: 72000, sponsorAssoc: 18000, salaryBase: 6, minBudget: 1500000 },
    { id: 'cup', name: 'CUP SERIES', short: 'CUP', cars: 32, mult: 15, aiCar: [64, 88], aiDrv: [62, 90], floor: 64, buyIn: 5000000,
      purseWin: 450000, sponsorPrimary: 180000, sponsorAssoc: 45000, salaryBase: 15, minBudget: 4000000 },
  ];
  // Track type definitions: lap time is seconds per lap at 1x (visual time)
  const TYPES = {
    short: { name: 'SHORT TRACK', lapTime: 6.5, laps: 90, stages: [25, 55], fuelLaps: 60, wear: 0.0115, tireFall: 0.05,
      draftRange: 55, draft: 0.004, incident: 0.0008, laneRate: 1.0, outsidePen: 0.003, lanes: 2, paceSpacing: 38 },
    intermediate: { name: 'INTERMEDIATE', lapTime: 9, laps: 60, stages: [16, 34], fuelLaps: 26, wear: 0.0155, tireFall: 0.06,
      draftRange: 95, draft: 0.010, incident: 0.0008, laneRate: 0.8, outsidePen: 0.002, lanes: 2, paceSpacing: 40 },
    superspeedway: { name: 'SUPERSPEEDWAY', lapTime: 11, laps: 50, stages: [14, 30], fuelLaps: 22, wear: 0.007, tireFall: 0.02,
      draftRange: 150, draft: 0.034, incident: 0.0005, laneRate: 1.4, outsidePen: 0, lanes: 3, paceSpacing: 40 },
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
      shape: RP([[520, 470, 500], [760, 410, 190], [760, 0, 190], [0, 0, 190], [0, 410, 190], [240, 470, 500]]) },
    lasvegas: { name: 'LAS VEGAS MOTOR SPEEDWAY', short: 'LAS VEGAS', type: 'intermediate', miles: 1.5, bank: 20, city: 'Las Vegas, NV', note: '1.5-MILE TRI-OVAL',
      shape: RP([[800, 400, 190], [800, 0, 190], [0, 0, 190], [0, 400, 190], [400, 455, 1300]], { sf: 4 }) },
    kansas: { name: 'KANSAS SPEEDWAY', short: 'KANSAS', type: 'intermediate', miles: 1.5, bank: 20, city: 'Kansas City, KS', note: '1.5-MILE TRI-OVAL',
      shape: RP([[760, 400, 200], [760, 0, 200], [0, 0, 200], [0, 400, 200], [380, 465, 1200]], { sf: 4 }) },
    texas: { name: 'TEXAS MOTOR SPEEDWAY', short: 'TEXAS', type: 'intermediate', miles: 1.5, bank: 24, city: 'Fort Worth, TX', note: '1.5-MILE QUAD-OVAL',
      shape: RP([[520, 460, 480], [800, 400, 210], [800, 0, 210], [0, 0, 150], [0, 400, 150], [260, 460, 480]]) },
    homestead: { name: 'HOMESTEAD-MIAMI SPEEDWAY', short: 'HOMESTEAD', type: 'intermediate', miles: 1.5, bank: 20, wear: 1.3, city: 'Homestead, FL', note: '1.5-MILE OVAL, WORN SURFACE',
      shape: RP([[800, 420, 210], [800, 0, 210], [0, 0, 210], [0, 420, 210]]) },
    michigan: { name: 'MICHIGAN INTERNATIONAL SPEEDWAY', short: 'MICHIGAN', type: 'intermediate', miles: 2.0, bank: 18, city: 'Brooklyn, MI', note: '2-MILE D-OVAL',
      shape: RP([[1000, 440, 230], [1000, 0, 230], [0, 0, 230], [0, 440, 230], [500, 525, 2200]], { sf: 4 }) },
    pocono: { name: 'POCONO RACEWAY', short: 'POCONO', type: 'intermediate', miles: 2.5, bank: 14, city: 'Long Pond, PA', note: '2.5-MILE TRIANGLE, THREE DIFFERENT TURNS',
      shape: RP([[1100, 450, 150], [330, 0, 120], [0, 420, 260]]) },
    darlington: { name: 'DARLINGTON RACEWAY', short: 'DARLINGTON', type: 'intermediate', miles: 1.366, bank: 25, wear: 1.4, city: 'Darlington, SC', note: '1.366-MILE EGG, "TOO TOUGH TO TAME"',
      shape: RP([[760, 380, 150], [760, 60, 150], [0, 0, 200], [0, 400, 200]]) },
    indianapolis: { name: 'INDIANAPOLIS MOTOR SPEEDWAY', short: 'INDIANAPOLIS', type: 'intermediate', miles: 2.5, bank: 9, city: 'Indianapolis, IN', note: '2.5-MILE RECTANGLE, FOUR FLAT TURNS',
      shape: RP([[1000, 330, 110], [1000, 0, 110], [0, 0, 110], [0, 330, 110]]) },
    dover: { name: 'DOVER MOTOR SPEEDWAY', short: 'DOVER', type: 'short', miles: 1.0, bank: 24, wear: 1.1, city: 'Dover, DE', note: '1-MILE CONCRETE "MONSTER MILE"',
      shape: RP([[560, 320, 160], [560, 0, 160], [0, 0, 160], [0, 320, 160]]) },
    phoenix: { name: 'PHOENIX RACEWAY', short: 'PHOENIX', type: 'short', miles: 1.0, bank: 11, city: 'Avondale, AZ', note: '1-MILE FLAT OVAL WITH THE DOGLEG',
      shape: RP([[600, 330, 130], [600, 40, 130], [0, 0, 170], [0, 360, 170], [160, 440, 300]]) },
    richmond: { name: 'RICHMOND RACEWAY', short: 'RICHMOND', type: 'short', miles: 0.75, bank: 14, city: 'Richmond, VA', note: '0.75-MILE D-SHAPED OVAL',
      shape: RP([[560, 320, 150], [560, 0, 150], [0, 0, 150], [0, 320, 150], [280, 385, 900]], { sf: 4 }) },
    bristol: { name: 'BRISTOL MOTOR SPEEDWAY', short: 'BRISTOL', type: 'short', miles: 0.533, bank: 28, wear: 1.2, city: 'Bristol, TN', note: '0.533-MILE HIGH-BANKED CONCRETE',
      shape: RP([[440, 260, 130], [440, 0, 130], [0, 0, 130], [0, 260, 130]]) },
    martinsville: { name: 'MARTINSVILLE SPEEDWAY', short: 'MARTINSVILLE', type: 'short', miles: 0.526, bank: 12, wear: 1.1, city: 'Ridgeway, VA', note: '0.526-MILE PAPERCLIP',
      shape: RP([[600, 200, 100], [600, 0, 100], [0, 0, 100], [0, 200, 100]]) },
    iowa: { name: 'IOWA SPEEDWAY', short: 'IOWA', type: 'short', miles: 0.875, bank: 14, city: 'Newton, IA', note: '0.875-MILE D-SHAPED OVAL',
      shape: RP([[620, 330, 160], [620, 0, 160], [0, 0, 160], [0, 330, 160], [310, 385, 1000]], { sf: 4 }) },
    elko: { name: 'ELKO SPEEDWAY', short: 'ELKO', type: 'short', miles: 0.375, bank: 9, city: 'Elko New Market, MN', note: '3/8-MILE OVAL',
      shape: RP([[360, 240, 120], [360, 0, 120], [0, 0, 120], [0, 240, 120]]) },
    toledo: { name: 'TOLEDO SPEEDWAY', short: 'TOLEDO', type: 'short', miles: 0.5, bank: 6, city: 'Toledo, OH', note: 'HALF-MILE OVAL',
      shape: RP([[380, 250, 125], [380, 0, 125], [0, 0, 125], [0, 250, 125]]) },
    berlin: { name: 'BERLIN RACEWAY', short: 'BERLIN', type: 'short', miles: 0.4375, bank: 8, city: 'Marne, MI', note: '7/16-MILE OVAL',
      shape: RP([[400, 220, 110], [400, 0, 110], [0, 0, 110], [0, 220, 110]]) },
    salem: { name: 'SALEM SPEEDWAY', short: 'SALEM', type: 'short', miles: 0.555, bank: 33, city: 'Salem, IN', note: 'HIGH-BANKED HALF-MILE',
      shape: RP([[380, 270, 135], [380, 0, 135], [0, 0, 135], [0, 270, 135]]) },
    watkinsglen: { name: 'WATKINS GLEN INTERNATIONAL', short: 'WATKINS GLEN', type: 'road', miles: 2.45, bank: 0, city: 'Watkins Glen, NY', note: '2.45-MILE ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [520, 0], [660, -70], [700, -260], [780, -420], [920, -460], [1010, -360], [960, -210], [1060, -110], [1080, 50], [900, 160], [600, 190], [300, 200], [90, 150]] } },
    sonoma: { name: 'SONOMA RACEWAY', short: 'SONOMA', type: 'road', miles: 1.99, bank: 0, wear: 1.2, city: 'Sonoma, CA', note: '1.99-MILE HILLY ROAD COURSE',
      shape: { kind: 'road', pts: [[0, 0], [420, 0], [570, -80], [600, -260], [480, -360], [560, -490], [770, -470], [820, -320], [980, -300], [1010, -120], [860, -40], [820, 120], [600, 200], [300, 170], [110, 120]] } },
  };
  // 10-race schedules of tracks each series really runs. ARCA & Cup open at Daytona; Cup ends at Phoenix.
  const CALENDARS = [
    ['daytona', 'talladega', 'kansas', 'elko', 'berlin', 'pocono', 'iowa', 'salem', 'bristol', 'toledo'],
    ['daytona', 'atlanta', 'lasvegas', 'bristol', 'martinsville', 'texas', 'darlington', 'charlotte', 'pocono', 'phoenix'],
    ['daytona', 'lasvegas', 'richmond', 'darlington', 'charlotte', 'watkinsglen', 'michigan', 'bristol', 'kansas', 'phoenix'],
    ['daytona', 'atlanta', 'lasvegas', 'talladega', 'charlotte', 'sonoma', 'indianapolis', 'darlington', 'martinsville', 'phoenix'],
  ];
  // showpiece race names
  const EVENTS = { '3:1': 'DAYTONA 500', '3:8': 'SOUTHERN 500', '3:10': 'CHAMPIONSHIP RACE' };
  function eventName(seriesIdx, week) { return EVENTS[seriesIdx + ':' + week] || null; }
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
    t.miles = d.miles; t.bank = bank; t.perim = L;
    return (tuneCache[tid] = t);
  }
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
    shop: { name: 'SHOP', desc: 'Faster R&D, bigger part gains, more engineering points.' },
    engineDept: { name: 'ENGINE DEPT', desc: 'Extra horsepower and engine reliability.' },
    simulator: { name: 'SIMULATOR', desc: 'Sharpens drivers on race day, grows young talent and sharpens scout reports.' },
    pitCenter: { name: 'PIT CREW CENTER', desc: 'Faster pit stops and fewer pit road mistakes.' },
  };
  const FAC_COST = [0, 0, 70000, 140000, 260000, 450000]; // cost to reach level index
  // Grassroots used cars for a brand-new owner (ARCA). Ratings are offsets from the ARCA floor.
  const USED_CARS = [
    { id: 'junker', name: 'RUSTY USED CAR', price: 4000, desc: 'RUNS... MOSTLY. LEAVES THE MOST CASH FOR THE SEASON.', parts: { engine: -4, aero: -6, chassis: -5 }, livery: { body: '#8a8a8a', stripe: '#5a1414' } },
    { id: 'used', name: 'USED ARCA CAR', price: 8000, desc: 'A TIRED EX-TEAM CAR. HONEST AND RELIABLE.', parts: { engine: -1, aero: -2, chassis: -1 }, livery: { body: '#1d5fd1', stripe: '#f2f2f2' } },
    { id: 'rebuilt', name: 'REBUILT CHASSIS', price: 12500, desc: 'FRESH WELDS, OLD MOTOR. BEST BUY, TIGHTEST BUDGET.', parts: { engine: 1, aero: 2, chassis: 4 }, livery: { body: '#f2f2f2', stripe: '#d9342b' } },
  ];
  const LOCAL_SPONSORS = [['JOES TIRE SHOP', '#2a2a2a', '#f2d22e'], ['MAIN ST DINER', '#5bb8e8', '#c4232b'], ['COUNTY LINE FEED', '#4a6b2a', '#f2c45a'], ['BIG ALS BODY SHOP', '#c4232b', '#f2f2f2'],
    ['RIVERSIDE HARDWARE', '#1f6b4a', '#f2f2f2'], ['SMITTYS BAIT & TACKLE', '#29c4b0', '#1a1a1a'], ['GRANNYS PIES', '#f2c4dc', '#8a4b22'], ['LAKEVIEW CAR WASH', '#11b5e4', '#f2f2f2'],
    ['DOUBLE D TOWING', '#f28c18', '#1a1a1a'], ['VFW POST 112', '#1a2f6b', '#f2f2f2']];
  const POINTS = [40, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const XP_PER_LEVEL = 120;
  // ---------- v1.1 ----------
  const VERSION = '1.2.1';
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
  ];
  const CUP_TROPHIES = [
    ['playoff', 'PLAYOFF BERTH', 'medal', 'silver', 'MAKE THE CUP PLAYOFFS (TOP 8 AFTER RACE 7).'],
    ['champ4', 'CHAMPIONSHIP 4', 'medal', 'gold', 'REACH THE CUP CHAMPIONSHIP 4 FINALE.'],
    ['cupChamp', 'CUP CHAMPION', 'big', 'gold', 'WIN THE CUP SERIES CHAMPIONSHIP.'],
  ];
  const CHANGELOG = [
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
  return { USED_CARS, LOCAL_SPONSORS, SERIES, TYPES, TRACKS, CALENDARS, FIRST, LAST, TEAM_A, TEAM_B, SPONSORS, BODY_COLORS, PARTS, PART_W, FACILITIES, FAC_COST, POINTS, XP_PER_LEVEL,
    VERSION, DRIVER_STATS, DEV_MAX, CAR2, SCOUTS, FEEDERS, CHANGELOG, MILESTONES, CUP_TROPHIES, OLD_TRACKS, OLD_SHORT, trackT, bankWord, eventName };
})();
