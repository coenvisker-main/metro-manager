// Spelparameters. Fase 2 (zie docs/ROADMAP.md) brengt alle balansgetallen hier samen.

export const GAME_CONFIG = {
  /** Max. wachtenden per station voordat de overvol-timer start. */
  MAX_STATION_CAPACITY: 40,
  /** ms speltijd dat een station overvol mag zijn voordat het game over is. */
  OVERLOAD_GRACE_PERIOD: 10000,
  /** Onder dit percentage tevredenheid verschijnt de rode waarschuwingsrand. */
  REP_WARNING_THRESHOLD: 20,
  /** Op of onder dit percentage tevredenheid is het game over. */
  CRITICAL_REP_THRESHOLD: 0,
  /** ms speltijd dat een metro stilstaat bij een station. */
  BOARDING_TIME: 500,
} as const;

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

/** Referentiesnelheid waartegen spawn-tempo en geduld geschaald worden. */
export const BASE_SPEED = 0.006;

/** Lijnen (index in ROUTES_DEF) waarop bij de start een metro rijdt: D en A. */
export const INITIAL_TRAIN_ROUTES: readonly number[] = [3, 0];
