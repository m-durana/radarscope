// Shared types for instrument widgets.
// Each widget keeps its own Props interface inline — these are the
// cross-cutting structural types only.

export interface FlightDirector {
  /** Commanded pitch in degrees (positive = nose up). */
  pitch: number;
  /** Commanded roll in degrees (positive = right wing down). */
  roll: number;
}

export interface SpeedBug {
  /** IAS in knots where the bug sits on the tape. */
  kt: number;
  /** Bug color. CSS color string. Defaults to magenta on the SpeedTape
   *  if omitted (the standard "selected speed" convention). */
  color?: string;
  /** Optional short label rendered next to the bug (e.g. "VR", "V2"). */
  label?: string;
}

/** FMA (Flight Mode Annunciator) strip. Empty string = blank column.
 *  Real FMAs are 5 columns; the doc spec uses 4. We keep 4 here. */
export interface FmaState {
  /** Autothrottle mode: SPEED, THR REF, RETARD, IDLE, HOLD, etc. */
  at: string;
  /** Lateral mode: LOC, HDG SEL, LNAV, ROLLOUT, etc. */
  lat: string;
  /** Vertical mode: G/S, V/S, ALT, FLARE, etc. */
  vert: string;
  /** Approach mode: LAND 3, LAND 2, NO AUTOLAND, ILS, etc. */
  app: string;
}
