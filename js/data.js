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
  // shape params for geometry builder
  const TRACKS = {
    thunder: { name: 'THUNDER VALLEY SPEEDWAY', short: 'THUNDER VALLEY', type: 'short', shape: { kind: 'oval', r: 175, straight: 230 }, city: 'Bristol-ish, TN' },
    paperclip: { name: 'PAPERCLIP RACEWAY', short: 'PAPERCLIP', type: 'short', shape: { kind: 'oval', r: 120, straight: 380 }, city: 'Ridgeway, VA' },
    hickory: { name: 'HICKORY BOWL', short: 'HICKORY BOWL', type: 'short', shape: { kind: 'oval', r: 160, straight: 300 }, city: 'Hickory, NC' },
    riverbend: { name: 'RIVERBEND SHORT TRACK', short: 'RIVERBEND', type: 'short', shape: { kind: 'oval', r: 190, straight: 200 }, city: 'Iowa Falls, IA' },
    lonestar: { name: 'LONE STAR MOTOR SPEEDWAY', short: 'LONE STAR', type: 'intermediate', shape: { kind: 'trioval', r: 220, straight: 420, bump: 55 }, city: 'Fort Worth-ish, TX' },
    carolina: { name: 'CAROLINA MILE & A HALF', short: 'CAROLINA', type: 'intermediate', shape: { kind: 'trioval', r: 230, straight: 380, bump: 70 }, city: 'Concord-ish, NC' },
    desert: { name: 'DESERT SUN SPEEDWAY', short: 'DESERT SUN', type: 'intermediate', shape: { kind: 'oval', r: 240, straight: 400 }, city: 'Las Vegas-ish, NV' },
    heartland: { name: 'HEARTLAND MOTOR SPEEDWAY', short: 'HEARTLAND', type: 'intermediate', shape: { kind: 'trioval', r: 210, straight: 460, bump: 45 }, city: 'Kansas-ish, KS' },
    bayshore: { name: 'BAYSHORE INTL SPEEDWAY', short: 'BAYSHORE', type: 'superspeedway', shape: { kind: 'trioval', r: 260, straight: 700, bump: 85 }, city: 'Daytona-ish, FL' },
    tallapines: { name: 'TALLA PINES SUPERSPEEDWAY', short: 'TALLA PINES', type: 'superspeedway', shape: { kind: 'trioval', r: 270, straight: 760, bump: 70 }, city: 'Talladega-ish, AL' },
    blueridge: { name: 'BLUE RIDGE ROAD COURSE', short: 'BLUE RIDGE', type: 'road', shape: { kind: 'road', pts: [[0, 0], [700, 0], [820, 60], [840, 200], [700, 260], [560, 200], [430, 320], [520, 460], [380, 520], [120, 500], [40, 380], [160, 240], [20, 140]] }, city: 'Watkins-ish, NY' },
    lakeside: { name: 'LAKESIDE PARK CIRCUIT', short: 'LAKESIDE', type: 'road', shape: { kind: 'road', pts: [[0, 0], [760, 0], [900, 120], [780, 220], [620, 180], [520, 300], [700, 420], [600, 520], [260, 520], [300, 360], [120, 300], [-40, 160]] }, city: 'Elkhart-ish, WI' },
  };
  const CALENDARS = [
    ['bayshore', 'thunder', 'lonestar', 'hickory', 'blueridge', 'carolina', 'riverbend', 'tallapines', 'heartland', 'paperclip'],
    ['bayshore', 'paperclip', 'desert', 'thunder', 'lakeside', 'lonestar', 'hickory', 'tallapines', 'carolina', 'riverbend'],
    ['bayshore', 'lonestar', 'thunder', 'desert', 'blueridge', 'tallapines', 'paperclip', 'heartland', 'hickory', 'carolina'],
    ['bayshore', 'desert', 'thunder', 'lonestar', 'lakeside', 'tallapines', 'paperclip', 'carolina', 'hickory', 'heartland'],
  ];
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
    simulator: { name: 'SIMULATOR', desc: 'Sharpens your driver on race day and grows young talent.' },
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
  return { USED_CARS, LOCAL_SPONSORS, SERIES, TYPES, TRACKS, CALENDARS, FIRST, LAST, TEAM_A, TEAM_B, SPONSORS, BODY_COLORS, PARTS, PART_W, FACILITIES, FAC_COST, POINTS, XP_PER_LEVEL };
})();
