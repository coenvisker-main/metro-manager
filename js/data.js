// --- GAME DATA CONFIGURATION ---

const ZONES_DEF = {
    'centrum': { name: 'Centrum (Start)', cost: 0, unlocked: true },
    'kop_zuid': { name: 'Fase 1: Kop van Zuid', cost: 600, unlocked: false },
    'west_1': { name: 'Fase 2: Schiedam C.', cost: 800, unlocked: false },
    'slinge': { name: 'Fase 3: Slinge', cost: 1000, unlocked: false },
    'oost_1': { name: 'Fase 4: Capelsebrug', cost: 1200, unlocked: false },
    'binnenhof': { name: 'Lijn A: Binnenhof', cost: 1500, unlocked: false },
    'nesselande': { name: 'Lijn B: Nesselande', cost: 1800, unlocked: false },
    'de_terp': { name: 'Lijn C: De Terp', cost: 1800, unlocked: false },
    'west_2': { name: 'West: Vlaardingen/Maassluis', cost: 2000, unlocked: false },
    'hoek_holland': { name: 'Lijn B: Hoek v. Holland', cost: 2500, unlocked: false },
    'spijkenisse': { name: 'Zuid: Spijkenisse', cost: 2200, unlocked: false },
    'de_akkers': { name: 'Lijn C/D: De Akkers', cost: 2500, unlocked: false },
    'randstad': { name: 'Lijn E: Den Haag', cost: 3500, unlocked: false },
};

// Mutable Zones object
let ZONES = JSON.parse(JSON.stringify(ZONES_DEF));

const STATIONS = [
    // CENTRUM
    { id: 'cs', name: 'Centraal', x: 0.45, y: 0.35, zone: 'centrum' },
    { id: 'stadhuis', name: 'Stadhuis', x: 0.48, y: 0.42, zone: 'centrum' },
    { id: 'beurs', name: 'Beurs', x: 0.50, y: 0.50, zone: 'centrum' },
    { id: 'blaak', name: 'Blaak', x: 0.58, y: 0.50, zone: 'centrum' },
    { id: 'leuvehaven', name: 'Leuvehaven', x: 0.50, y: 0.58, zone: 'centrum' },
    { id: 'eendracht', name: 'Eendrachtspl.', x: 0.42, y: 0.51, zone: 'centrum' },
    { id: 'dijkzigt', name: 'Dijkzigt', x: 0.36, y: 0.51, zone: 'centrum' },

    // WEST
    { id: 'coolhaven', name: 'Coolhaven', x: 0.30, y: 0.51, zone: 'west_1' },
    { id: 'delfshaven', name: 'Delfshaven', x: 0.25, y: 0.50, zone: 'west_1' },
    { id: 'marconi', name: 'Marconiplein', x: 0.20, y: 0.45, zone: 'west_1' },
    { id: 'schiedam', name: 'Schiedam C.', x: 0.15, y: 0.38, zone: 'west_1' },
    { id: 'vlaardingen', name: 'Vlaardingen C.', x: 0.10, y: 0.35, zone: 'west_2' },
    { id: 'maassluis', name: 'Maassluis C.', x: 0.08, y: 0.30, zone: 'west_2' },
    { id: 'hvh_haven', name: 'HvH Haven', x: 0.05, y: 0.25, zone: 'hoek_holland' },
    { id: 'hvh_strand', name: 'HvH Strand', x: 0.03, y: 0.23, zone: 'hoek_holland' },

    // ZUID
    { id: 'wilhelmina', name: 'W.Plein', x: 0.50, y: 0.65, zone: 'kop_zuid' },
    { id: 'rijnhaven', name: 'Rijnhaven', x: 0.50, y: 0.70, zone: 'kop_zuid' },
    { id: 'maashaven', name: 'Maashaven', x: 0.50, y: 0.75, zone: 'kop_zuid' },
    { id: 'zuidplein', name: 'Zuidplein', x: 0.48, y: 0.82, zone: 'slinge' },
    { id: 'slinge', name: 'Slinge', x: 0.45, y: 0.88, zone: 'slinge' },
    { id: 'rhoon', name: 'Rhoon', x: 0.40, y: 0.90, zone: 'spijkenisse' },
    { id: 'hoogvliet', name: 'Hoogvliet', x: 0.25, y: 0.90, zone: 'spijkenisse' },
    { id: 'spijk_c', name: 'Spijkenisse C.', x: 0.20, y: 0.94, zone: 'spijkenisse' },
    { id: 'de_akkers', name: 'De Akkers', x: 0.15, y: 0.97, zone: 'de_akkers' },
    { id: 'parkweg', name: 'Parkweg', x: 0.15, y: 0.45, zone: 'west_2' },
    { id: 'pernis', name: 'Pernis', x: 0.18, y: 0.70, zone: 'west_2' },

    // OOST
    { id: 'oostplein', name: 'Oostplein', x: 0.65, y: 0.49, zone: 'oost_1' },
    { id: 'gerdesia', name: 'Gerdesiaweg', x: 0.72, y: 0.48, zone: 'oost_1' },
    { id: 'kralingse', name: 'Kralingse Z.', x: 0.80, y: 0.46, zone: 'oost_1' },
    { id: 'capelse', name: 'Capelsebrug', x: 0.86, y: 0.44, zone: 'oost_1' },
    { id: 'alexander', name: 'Alexander', x: 0.90, y: 0.35, zone: 'binnenhof' },
    { id: 'binnenhof', name: 'Binnenhof', x: 0.88, y: 0.30, zone: 'binnenhof' },
    { id: 'nesselande', name: 'Nesselande', x: 0.96, y: 0.30, zone: 'nesselande' },
    { id: 'slotlaan', name: 'Slotlaan', x: 0.92, y: 0.50, zone: 'de_terp' },
    { id: 'de_terp', name: 'De Terp', x: 0.95, y: 0.55, zone: 'de_terp' },

    // NOORD
    { id: 'blijdorp', name: 'Blijdorp', x: 0.42, y: 0.30, zone: 'randstad' },
    { id: 'pijnacker', name: 'Pijnacker', x: 0.35, y: 0.20, zone: 'randstad' },
    { id: 'den_haag', name: 'Den Haag CS', x: 0.25, y: 0.05, zone: 'randstad' }
];

// OFFICIAL RET LINE COLORS
const ROUTES_DEF = [
    {
        id: 'A', name: 'Lijn A (Binnenhof)', color: '#009E4D', offset: -4, // Green
        path: ['schiedam', 'marconi', 'delfshaven', 'coolhaven', 'dijkzigt', 'eendracht', 'beurs', 'blaak', 'oostplein', 'gerdesia', 'kralingse', 'capelse', 'alexander', 'binnenhof']
    },
    {
        id: 'B', name: 'Lijn B (Nesselande)', color: '#FFD700', offset: 0, // Yellow
        path: ['hvh_strand', 'hvh_haven', 'maassluis', 'vlaardingen', 'schiedam', 'marconi', 'delfshaven', 'coolhaven', 'dijkzigt', 'eendracht', 'beurs', 'blaak', 'oostplein', 'gerdesia', 'kralingse', 'capelse', 'alexander', 'nesselande']
    },
    {
        id: 'C', name: 'Lijn C (De Terp)', color: '#E30613', offset: 4, // Red
        path: ['de_akkers', 'spijk_c', 'hoogvliet', 'pernis', 'parkweg', 'schiedam', 'marconi', 'delfshaven', 'coolhaven', 'dijkzigt', 'eendracht', 'beurs', 'blaak', 'oostplein', 'gerdesia', 'kralingse', 'capelse', 'slotlaan', 'de_terp']
    },
    {
        id: 'D', name: 'Lijn D (De Akkers)', color: '#00A1DE', offset: -3, // Light Blue
        path: ['cs', 'stadhuis', 'beurs', 'leuvehaven', 'wilhelmina', 'rijnhaven', 'maashaven', 'zuidplein', 'slinge', 'rhoon', 'hoogvliet', 'spijk_c', 'de_akkers']
    },
    {
        id: 'E', name: 'Lijn E (Slinge)', color: '#003D86', offset: 3, // Dark Blue
        path: ['den_haag', 'pijnacker', 'blijdorp', 'cs', 'stadhuis', 'beurs', 'leuvehaven', 'wilhelmina', 'rijnhaven', 'maashaven', 'zuidplein', 'slinge']
    }
];
