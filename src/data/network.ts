// Netwerkdata: zones, stations en lijnen van het RET-metronetwerk.
// Coördinaten zijn genormaliseerd (0..1) ten opzichte van de kaart.

export type ZoneId =
  | 'centrum'
  | 'kop_zuid'
  | 'west_1'
  | 'slinge'
  | 'oost_1'
  | 'binnenhof'
  | 'nesselande'
  | 'de_terp'
  | 'west_2'
  | 'hoek_holland'
  | 'spijkenisse'
  | 'de_akkers'
  | 'randstad';

export interface ZoneDef {
  name: string;
  cost: number;
  unlocked: boolean;
}

export type Zones = Record<ZoneId, ZoneDef>;

export interface StationDef {
  id: string;
  name: string;
  x: number;
  y: number;
  zone: ZoneId;
  /** Waypoints zijn onzichtbare knikpunten in het spoor. */
  type?: 'waypoint';
}

export interface RouteDef {
  id: string;
  name: string;
  color: string;
  /** Verschuiving in pixels zodat parallelle lijnen naast elkaar liggen. */
  offset: number;
  path: readonly string[];
}

export const ZONES_DEF: Readonly<Zones> = {
  centrum: { name: 'Centrum (Start)', cost: 0, unlocked: true },
  kop_zuid: { name: 'Zuid 1: Kop van Zuid', cost: 600, unlocked: false },
  west_1: { name: 'West 1: Schiedam', cost: 800, unlocked: false },
  slinge: { name: 'Zuid 2: Slinge', cost: 1000, unlocked: false },
  oost_1: { name: 'Oost 1: Capelsebrug', cost: 1200, unlocked: false },
  binnenhof: { name: 'Lijn A: Ommoord', cost: 1500, unlocked: false },
  nesselande: { name: 'Lijn B: Nesselande', cost: 1800, unlocked: false },
  de_terp: { name: 'Lijn C: Capelle', cost: 1800, unlocked: false },
  west_2: { name: 'West 2: Vlaardingen', cost: 2000, unlocked: false },
  hoek_holland: { name: 'Lijn B: Hoek v. Holland', cost: 2500, unlocked: false },
  spijkenisse: { name: 'Zuid 3: Spijkenisse', cost: 2200, unlocked: false },
  de_akkers: { name: 'Eindpunt: De Akkers', cost: 2500, unlocked: false },
  randstad: { name: 'Lijn E: Den Haag', cost: 3500, unlocked: false },
};

export const STATIONS: readonly StationDef[] = [
  // --- WAYPOINTS (Invisible Nodes for Bends) ---
  // Line B West Bend (Vlaardingen West -> Maassluis Centrum)
  { id: 'wp_maassluis_bend', name: '', x: 0.22, y: 0.49, zone: 'west_2', type: 'waypoint' },
  // Line C Schiedam Turn (Schiedam C -> Parkweg)
  { id: 'wp_schiedam_turn', name: '', x: 0.41, y: 0.49, zone: 'west_2', type: 'waypoint' },
  // Line C/D Join (Pernis/Poortugaal -> Tussenwater)
  { id: 'wp_join', name: '', x: 0.41, y: 0.78, zone: 'spijkenisse', type: 'waypoint' },
  // Line D South Bend (Slinge -> Rhoon) - 90 degree turn
  { id: 'wp_slinge_bend', name: '', x: 0.61, y: 0.78, zone: 'spijkenisse', type: 'waypoint' },
  // Graskruid Split Point
  { id: 'wp_graskruid_split', name: '', x: 0.84, y: 0.27, zone: 'binnenhof', type: 'waypoint' },

  // --- USER PROVIDED COORDINATES (Adjusted for bends) ---

  // RANDSTADRAIL (Lijn E) - STRICT DIAGONAL
  { id: 'den_haag', name: 'Den Haag CS', x: 0.38, y: 0.09, zone: 'randstad' },
  { id: 'laan_noi', name: 'Laan v NOI', x: 0.4, y: 0.09, zone: 'randstad' },
  { id: 'voorburg_loo', name: 'Voorburg', x: 0.45, y: 0.09, zone: 'randstad' },
  { id: 'leidschendam', name: 'Leidschendam', x: 0.49, y: 0.09, zone: 'randstad' },
  { id: 'forepark', name: 'Forepark', x: 0.52, y: 0.09, zone: 'randstad' }, // Start Horizontal
  { id: 'leidschenveen', name: 'Leidschenveen', x: 0.55, y: 0.12, zone: 'randstad' }, // Diagonal
  { id: 'nootdorp', name: 'Nootdorp', x: 0.58, y: 0.15, zone: 'randstad' }, // Diagonal
  { id: 'pijnacker_c', name: 'Pijnacker C', x: 0.61, y: 0.18, zone: 'randstad' }, // Vertical Start
  { id: 'pijnacker_z', name: 'Pijnacker Z', x: 0.61, y: 0.22, zone: 'randstad' },
  { id: 'berkel', name: 'Berkel', x: 0.61, y: 0.26, zone: 'randstad' },
  { id: 'rodenrijs', name: 'Rodenrijs', x: 0.61, y: 0.3, zone: 'randstad' },
  { id: 'meijersplein', name: 'Meijersplein', x: 0.61, y: 0.34, zone: 'randstad' },
  { id: 'melanchthon', name: 'Melanchthon', x: 0.61, y: 0.38, zone: 'randstad' },
  { id: 'blijdorp', name: 'Blijdorp', x: 0.61, y: 0.42, zone: 'randstad' },

  // CENTRUM (North-South Axis)
  { id: 'cs', name: 'Centraal', x: 0.61, y: 0.45, zone: 'centrum' },
  { id: 'stadhuis', name: 'Stadhuis', x: 0.61, y: 0.47, zone: 'centrum' },
  { id: 'beurs', name: 'Beurs', x: 0.61, y: 0.49, zone: 'centrum' },
  { id: 'leuvehaven', name: 'Leuvehaven', x: 0.61, y: 0.55, zone: 'centrum' },
  { id: 'wilhelmina', name: 'W.Plein', x: 0.61, y: 0.59, zone: 'kop_zuid' },
  { id: 'rijnhaven', name: 'Rijnhaven', x: 0.61, y: 0.63, zone: 'kop_zuid' },
  { id: 'maashaven', name: 'Maashaven', x: 0.61, y: 0.67, zone: 'kop_zuid' },
  { id: 'zuidplein', name: 'Zuidplein', x: 0.61, y: 0.71, zone: 'slinge' },
  { id: 'slinge', name: 'Slinge', x: 0.61, y: 0.75, zone: 'slinge' },

  // HOEK VAN HOLLAND (Lijn B West)
  { id: 'hvh_strand', name: 'HvH Strand', x: 0.05, y: 0.32, zone: 'hoek_holland' },
  { id: 'hvh_haven', name: 'HvH Haven', x: 0.08, y: 0.35, zone: 'hoek_holland' },
  { id: 'steendijk', name: 'Steendijkpolder', x: 0.12, y: 0.39, zone: 'west_2' },
  { id: 'maassluis_west', name: 'Maassluis W.', x: 0.15, y: 0.42, zone: 'west_2' },
  { id: 'maassluis_c', name: 'Maassluis C.', x: 0.18, y: 0.45, zone: 'west_2' },

  // WEST (Lijn A/B/C Common)
  { id: 'vlaardingen_west', name: 'Vlaardingen W.', x: 0.25, y: 0.49, zone: 'west_2' },
  { id: 'vlaardingen_c', name: 'Vlaardingen C.', x: 0.29, y: 0.49, zone: 'west_2' },
  { id: 'vlaardingen_oost', name: 'Vlaardingen O.', x: 0.33, y: 0.49, zone: 'west_2' },
  { id: 'schiedam_nieuw', name: 'Schiedam Nw.', x: 0.37, y: 0.49, zone: 'west_2' },
  { id: 'schiedam_c', name: 'Schiedam C.', x: 0.43, y: 0.49, zone: 'west_1' },
  { id: 'marconi', name: 'Marconiplein', x: 0.47, y: 0.49, zone: 'west_1' },
  { id: 'delfshaven', name: 'Delfshaven', x: 0.5, y: 0.49, zone: 'west_1' },
  { id: 'coolhaven', name: 'Coolhaven', x: 0.53, y: 0.49, zone: 'west_1' },
  { id: 'dijkzigt', name: 'Dijkzigt', x: 0.56, y: 0.49, zone: 'centrum' },
  { id: 'eendracht', name: 'Eendrachtspl.', x: 0.58, y: 0.49, zone: 'centrum' },

  // OOST (Lijn A/B/C Common)
  { id: 'blaak', name: 'Blaak', x: 0.65, y: 0.49, zone: 'centrum' },
  { id: 'oostplein', name: 'Oostplein', x: 0.69, y: 0.49, zone: 'centrum' },
  { id: 'gerdesia', name: 'Gerdesiaweg', x: 0.72, y: 0.49, zone: 'oost_1' },
  { id: 'voorschoter', name: 'Voorschoterln', x: 0.75, y: 0.49, zone: 'oost_1' },
  { id: 'kralingse', name: 'Kralingse Z.', x: 0.78, y: 0.49, zone: 'oost_1' },
  { id: 'capelse', name: 'Capelsebrug', x: 0.81, y: 0.49, zone: 'oost_1' },

  // CAPELLE (Lijn C East)
  { id: 'slotlaan', name: 'Slotlaan', x: 0.85, y: 0.49, zone: 'de_terp' },
  { id: 'capelle_c', name: 'Capelle C.', x: 0.88, y: 0.49, zone: 'de_terp' },
  { id: 'de_terp', name: 'De Terp', x: 0.91, y: 0.49, zone: 'de_terp' },

  // OMMOORD/NESSELANDE SPLIT
  { id: 'schenkel', name: 'Schenkel', x: 0.84, y: 0.46, zone: 'binnenhof' },
  { id: 'prinsenlaan', name: 'Prinsenlaan', x: 0.84, y: 0.43, zone: 'binnenhof' },
  { id: 'oosterflank', name: 'Oosterflank', x: 0.84, y: 0.4, zone: 'binnenhof' },
  { id: 'alexander', name: 'Alexander', x: 0.84, y: 0.37, zone: 'binnenhof' },
  { id: 'graskruid', name: 'Graskruid', x: 0.84, y: 0.33, zone: 'binnenhof' },

  // OMMOORD (Lijn A East)
  { id: 'romeynshof', name: 'Romeynshof', x: 0.79, y: 0.27, zone: 'binnenhof' },
  { id: 'binnenhof', name: 'Binnenhof', x: 0.76, y: 0.27, zone: 'binnenhof' },

  // NESSELANDE (Lijn B East)
  { id: 'hesseplaats', name: 'Hesseplaats', x: 0.87, y: 0.27, zone: 'nesselande' },
  { id: 'nieuw_verlaat', name: 'Nw. Verlaat', x: 0.9, y: 0.27, zone: 'nesselande' },
  { id: 'ambachtsland', name: 'Ambachtsland', x: 0.93, y: 0.27, zone: 'nesselande' },
  { id: 'de_tochten', name: 'De Tochten', x: 0.96, y: 0.27, zone: 'nesselande' },
  { id: 'nesselande', name: 'Nesselande', x: 0.99, y: 0.27, zone: 'nesselande' },

  // PERNIS/SPIJKENISSE (Lijn C South) - SHIFTED LEFT TO 0.41
  { id: 'parkweg', name: 'Parkweg', x: 0.41, y: 0.54, zone: 'west_2' },
  { id: 'troelstra', name: 'Troelstralaan', x: 0.41, y: 0.6, zone: 'west_2' },
  { id: 'vijfsluizen', name: 'Vijfsluizen', x: 0.41, y: 0.65, zone: 'west_2' },
  { id: 'pernis', name: 'Pernis', x: 0.41, y: 0.71, zone: 'west_2' },

  // SPIJKENISSE (Lijn C/D Common) - STRICT DIAGONAL FROM JOIN
  { id: 'tussenwater', name: 'Tussenwater', x: 0.37, y: 0.82, zone: 'spijkenisse' },
  { id: 'hoogvliet', name: 'Hoogvliet', x: 0.34, y: 0.85, zone: 'spijkenisse' },
  { id: 'zalmplaat', name: 'Zalmplaat', x: 0.31, y: 0.88, zone: 'spijkenisse' },
  { id: 'spijkenisse_c', name: 'Spijkenisse C.', x: 0.28, y: 0.91, zone: 'spijkenisse' },
  { id: 'heemraad', name: 'Heemraadlaan', x: 0.25, y: 0.94, zone: 'de_akkers' },
  { id: 'de_akkers', name: 'De Akkers', x: 0.22, y: 0.97, zone: 'de_akkers' },

  // RHOON (Lijn D South) - SHIFTED UP TO 0.78
  { id: 'poortugaal', name: 'Poortugaal', x: 0.51, y: 0.78, zone: 'spijkenisse' },
  { id: 'rhoon', name: 'Rhoon', x: 0.55, y: 0.78, zone: 'spijkenisse' },
];

// Officiële RET-lijnkleuren en routes
export const ROUTES_DEF: readonly RouteDef[] = [
  {
    id: 'A',
    name: 'Lijn A (Binnenhof)',
    color: '#009E4D',
    offset: -4, // Green
    path: [
      'schiedam_c',
      'marconi',
      'delfshaven',
      'coolhaven',
      'dijkzigt',
      'eendracht',
      'beurs',
      'blaak',
      'oostplein',
      'gerdesia',
      'voorschoter',
      'kralingse',
      'capelse',
      'schenkel',
      'prinsenlaan',
      'oosterflank',
      'alexander',
      'graskruid',
      'wp_graskruid_split',
      'romeynshof',
      'binnenhof',
    ],
  },
  {
    id: 'B',
    name: 'Lijn B (Nesselande)',
    color: '#FFD700',
    offset: 0, // Yellow
    path: [
      'hvh_strand',
      'hvh_haven',
      'steendijk',
      'maassluis_west',
      'maassluis_c',
      'wp_maassluis_bend',
      'vlaardingen_west',
      'vlaardingen_c',
      'vlaardingen_oost',
      'schiedam_nieuw',
      'schiedam_c',
      'marconi',
      'delfshaven',
      'coolhaven',
      'dijkzigt',
      'eendracht',
      'beurs',
      'blaak',
      'oostplein',
      'gerdesia',
      'voorschoter',
      'kralingse',
      'capelse',
      'schenkel',
      'prinsenlaan',
      'oosterflank',
      'alexander',
      'graskruid',
      'wp_graskruid_split',
      'hesseplaats',
      'nieuw_verlaat',
      'ambachtsland',
      'de_tochten',
      'nesselande',
    ],
  },
  {
    id: 'C',
    name: 'Lijn C (De Terp)',
    color: '#E30613',
    offset: 4, // Red
    path: [
      'de_akkers',
      'heemraad',
      'spijkenisse_c',
      'zalmplaat',
      'hoogvliet',
      'tussenwater',
      'wp_join',
      'pernis',
      'vijfsluizen',
      'troelstra',
      'parkweg',
      'wp_schiedam_turn',
      'schiedam_c',
      'marconi',
      'delfshaven',
      'coolhaven',
      'dijkzigt',
      'eendracht',
      'beurs',
      'blaak',
      'oostplein',
      'gerdesia',
      'voorschoter',
      'kralingse',
      'capelse',
      'slotlaan',
      'capelle_c',
      'de_terp',
    ],
  },
  {
    id: 'D',
    name: 'Lijn D (De Akkers)',
    color: '#00A1DE',
    offset: -3, // Light Blue
    path: [
      'cs',
      'stadhuis',
      'beurs',
      'leuvehaven',
      'wilhelmina',
      'rijnhaven',
      'maashaven',
      'zuidplein',
      'slinge',
      'wp_slinge_bend',
      'rhoon',
      'poortugaal',
      'wp_join',
      'tussenwater',
      'hoogvliet',
      'zalmplaat',
      'spijkenisse_c',
      'heemraad',
      'de_akkers',
    ],
  },
  {
    id: 'E',
    name: 'Lijn E (Slinge)',
    color: '#003D86',
    offset: 3, // Dark Blue
    path: [
      'den_haag',
      'laan_noi',
      'voorburg_loo',
      'leidschendam',
      'forepark',
      'leidschenveen',
      'nootdorp',
      'pijnacker_c',
      'pijnacker_z',
      'berkel',
      'rodenrijs',
      'meijersplein',
      'melanchthon',
      'blijdorp',
      'cs',
      'stadhuis',
      'beurs',
      'leuvehaven',
      'wilhelmina',
      'rijnhaven',
      'maashaven',
      'zuidplein',
      'slinge',
    ],
  },
];

/** Positie van stationsnamen op de kaart (standaard: boven het station). */
export const LABEL_CFG: Readonly<Record<'top' | 'bottom' | 'right' | 'left', readonly string[]>> = {
  top: [
    'vlaardingen_west',
    'vlaardingen_oost',
    'schiedam_c',
    'delfshaven',
    'dijkzigt',
    'oostplein',
    'voorschoter',
    'capelse',
    'capelle_c',
    'hesseplaats',
    'ambachtsland',
    'nesselande',
    'romeynshof',
  ],
  bottom: [
    'vlaardingen_c',
    'schiedam_nieuw',
    'marconi',
    'coolhaven',
    'eendracht',
    'blaak',
    'gerdesia',
    'kralingse',
    'slotlaan',
    'de_terp',
    'nieuw_verlaat',
    'de_tochten',
    'binnenhof',
  ],
  right: [
    'cs',
    'stadhuis',
    'leuvehaven',
    'wilhelmina',
    'rijnhaven',
    'maashaven',
    'zuidplein',
    'slinge',
    'rhoon',
    'poortugaal',
    'tussenwater',
    'hoogvliet',
    'zalmplaat',
    'spijkenisse_c',
    'heemraad',
    'de_akkers',
    'blijdorp',
    'melanchthon',
    'meijersplein',
    'rodenrijs',
    'berkel',
    'pijnacker_z',
    'pijnacker_c',
    'nootdorp',
    'leidschenveen',
    'forepark',
    'leidschendam',
    'voorburg_loo',
    'laan_noi',
    'den_haag',
    'parkweg',
    'troelstra',
    'vijfsluizen',
    'pernis',
    'schenkel',
    'prinsenlaan',
    'oosterflank',
    'alexander',
  ],
  left: ['beurs'],
};

/** Overstapstations die groter getekend worden. */
export const MAJOR_STATIONS: readonly string[] = [
  'beurs',
  'cs',
  'schiedam_c',
  'kralingse',
  'zuidplein',
  'spijkenisse_c',
];

const STATION_BY_ID = new Map(STATIONS.map((s) => [s.id, s]));

export function getStation(id: string): StationDef {
  const s = STATION_BY_ID.get(id);
  if (!s) throw new Error(`Onbekend station: ${id}`);
  return s;
}

export function cloneZones(): Zones {
  return structuredClone(ZONES_DEF) as Zones;
}
