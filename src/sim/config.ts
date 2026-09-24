// Spelparameters. Fase 2 (zie docs/ROADMAP.md) brengt alle balansgetallen hier samen.

export const GAME_CONFIG = {
  /** Max. wachtenden per station voordat de overvol-timer start. */
  MAX_STATION_CAPACITY: 40,
  /** ms dat een station overvol mag zijn voordat het game over is. */
  OVERLOAD_GRACE_PERIOD: 10000,
  /** Onder dit percentage tevredenheid verschijnt de rode waarschuwingsrand. */
  REP_WARNING_THRESHOLD: 20,
  /** Op of onder dit percentage tevredenheid is het game over. */
  CRITICAL_REP_THRESHOLD: 0,
} as const;

/** Referentiesnelheid waartegen spawn-tempo en geduld geschaald worden. */
export const BASE_SPEED = 0.006;

/** Lijnen (index in ROUTES_DEF) waarop bij de start een metro rijdt: D en A. */
export const INITIAL_TRAIN_ROUTES: readonly number[] = [3, 0];
