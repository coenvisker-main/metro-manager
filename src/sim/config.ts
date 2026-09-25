// Spelparameters. Alle balansgetallen staan in `BALANCE`; meet het effect van een wijziging met
// `npm run balance`. Zoneprijzen staan bij de zones zelf, in `src/data/network.ts`.
// Tijden in ms speltijd, geld in euro's, tevredenheid in procentpunten.

export const BALANCE = {
  /** Beginstand van een nieuw spel. */
  start: {
    money: 600,
    reputation: 100,
    ticketPrice: 8,
    /**
     * Treinsnelheid: voortgang per stap van 1/60 s over een afstand van `train.referenceDistance`
     * kaarteenheden. Hoger is sneller.
     */
    trainSpeed: 0.012,
    /** Reizigers per metro. */
    trainCapacity: 20,
    /** Hoe lang een reiziger op een perron wil wachten. */
    patience: 30_000,
    /** Lijnen (index in ROUTES_DEF) waarop bij de start een metro rijdt: D en A. */
    trainRoutes: [3, 0] as readonly number[],
  },

  /** Hoeveel reizigers er verschijnen. */
  demand: {
    /** Basistijd tussen twee spawnpogingen. */
    spawnInterval: 500,
    /** Elk open station maakt de basistijd korter: interval / (1 + stations × deze factor). */
    spawnIntervalPerStation: 0.05,
    /** Kans dat een spawnpoging echt een reiziger oplevert. */
    spawnChance: 0.7,
    /** De vraag groeit met de speltijd: × (1 + minuten × deze factor). 0,1 = na 10 minuten dubbel zoveel reizigers. */
    growthPerMinute: 0.1,
  },

  /** Wat een aangekomen reiziger oplevert. */
  reward: {
    /** Fooi als de reis sneller was dan `tipPatienceShare` × geduld. */
    tip: 5,
    tipPatienceShare: 0.7,
    /** Afstandsbonus per kaarteenheid hemelsbreed van begin- tot eindstation (afgerond naar beneden). */
    distanceBonusPerUnit: 0.1,
    reputationPerArrival: 0.2,
  },

  /** Wat een reiziger kost die het wachten opgeeft. */
  penalty: {
    reputationPerExpired: 1,
  },

  /** Kasstroom: elke `interval` ms worden de exploitatiekosten afgeschreven en eventueel subsidie uitbetaald. */
  cashflow: {
    interval: 10_000,
    /** Exploitatiekosten per metro per minuut. Het saldo mag negatief worden; dan kun je niks kopen. */
    costPerTrainPerMinute: 150,
  },

  /** Subsidie als vangnet: alleen als het saldo onder `moneyThreshold` zakt, tevredenheid × `perReputation` euro. */
  subsidy: {
    moneyThreshold: 300,
    perReputation: 1.5,
  },

  /** Metro's. */
  train: {
    /** Prijs van de eerste metro op een lijn; elke volgende op dezelfde lijn wordt `costGrowth` keer duurder. */
    baseCost: 500,
    costGrowth: 1.3,
    /** Stilstand bij een station. */
    boardingTime: 500,
    /** Treinsnelheid geldt over deze afstand in kaarteenheden; kortere stukken gaan navenant sneller. */
    referenceDistance: 80,
    /** Kortere stukken dan dit rekenen als deze afstand, zodat een metro niet door een station flitst. */
    minDistance: 20,
  },

  /** Investeringen. Na elke aankoop wordt de prijs `costGrowth` keer hoger. */
  upgrades: {
    /** "Frequentie verhogen": alleen snellere metro's. */
    speed: { cost: 300, costGrowth: 1.5, speedFactor: 1.15 },
    /** "Langere metro's". */
    capacity: { cost: 400, costGrowth: 1.5, extraCapacity: 10 },
    /** "Station faciliteiten". */
    comfort: { cost: 600, costGrowth: 1.5, extraTicketPrice: 2, extraPatience: 2500 },
    /** "Promotie campagne". */
    marketing: { cost: 150, costGrowth: 1.3, extraReputation: 25 },
  },

  /** Grenzen en verliescondities. */
  limits: {
    maxReputation: 100,
    /** Max. wachtenden per station voordat de overvol-timer start. */
    stationCapacity: 40,
    /** Hoe lang een station overvol mag zijn voordat het game over is. */
    overloadGracePeriod: 10_000,
    /** Onder dit percentage tevredenheid verschijnt de rode waarschuwingsrand. */
    reputationWarning: 20,
    /** Op of onder dit percentage tevredenheid is het game over. */
    reputationGameOver: 0,
  },
} as const;

// --- Techniek: geen balans ------------------------------------------------

/** Vaste simulatiestap in ms speltijd (60 stappen per seconde), los van de framerate. */
export const STEP_MS = 1000 / 60;

/**
 * Maximale wandkloktijd die één frame mag inhalen. Een haperende browser of een tab die even
 * niet getekend werd, laat de simulatie dan hooguit iets vertragen in plaats van vooruit te springen.
 */
export const MAX_FRAME_MS = 250;

/**
 * Kaartgrootte in kaarteenheden. Stationscoördinaten (0..1) maal deze maat geven de afstand
 * waarmee de simulatie rekent, los van de schermgrootte. Eén eenheid is één pixel op een
 * speelveld van 1200×800: daarop is het tempo gelijk aan dat van vóór fase 2.
 */
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;
