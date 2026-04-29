import type { Aircraft, Heading, Position, Scenario } from './types.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Convert a compass heading + length to a vector in scope coordinates (y-down).
 * heading 0   → { x: 0, y: -len } (north / up)
 * heading 90  → { x: len, y: 0 }  (east / right)
 */
export function headingToVector(h: Heading, len: number): Position {
  const r = h * DEG2RAD;
  return { x: Math.sin(r) * len, y: -Math.cos(r) * len };
}

/** Project an aircraft forward in time at constant heading and groundspeed. */
export function projectAircraft(a: Aircraft, seconds: number): Position {
  // speed is knots = nm/hour; convert to nm/sec.
  const distNm = (a.speed / 3600) * seconds;
  const v = headingToVector(a.heading, distNm);
  return { x: a.pos.x + v.x, y: a.pos.y + v.y };
}

/** Bearing (degrees true) from `a` to `b`. */
export function bearingFromTo(a: Position, b: Position): Heading {
  const dx = b.x - a.x;
  // Y is flipped vs. compass north, so undo it for atan2.
  const dy = -(b.y - a.y);
  let deg = Math.atan2(dx, dy) * RAD2DEG;
  if (deg < 0) deg += 360;
  return deg;
}

/** Euclidean distance in nm (positions are already in nm). */
export function distanceBetween(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Signed intercept angle between current heading and target course.
 * Positive = need to turn right; negative = turn left. Range (-180, 180].
 */
export function interceptAngle(current: Heading, target: Heading): number {
  let d = ((target - current) % 360 + 540) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

export interface ConflictPair {
  a: Aircraft;
  b: Aircraft;
  /** Minimum predicted separation (nm) within the horizon. */
  minSeparation: number;
  /** Time (seconds from now) at which the minimum separation occurs. */
  tSeconds: number;
}

/**
 * Find pairs of aircraft predicted to lose `separationNm` of separation within
 * `horizonSeconds`, using straight-line projection at current heading & speed.
 *
 * Vertical separation (altitude) is checked too: pairs that differ by more than
 * `verticalFt` (default 1000 ft) are NOT conflicts even if their lateral paths cross.
 */
export function findConflicts(
  scenario: Scenario,
  horizonSeconds: number,
  separationNm: number,
  verticalFt = 1000,
): ConflictPair[] {
  const ac = scenario.aircraft;
  const out: ConflictPair[] = [];
  const stepSec = Math.max(1, Math.floor(horizonSeconds / 60));
  for (let i = 0; i < ac.length; i++) {
    for (let j = i + 1; j < ac.length; j++) {
      const A = ac[i];
      const B = ac[j];
      if (Math.abs(A.altitude - B.altitude) > verticalFt) continue;
      let minSep = Infinity;
      let tMin = 0;
      for (let t = 0; t <= horizonSeconds; t += stepSec) {
        const pa = projectAircraft(A, t);
        const pb = projectAircraft(B, t);
        const d = distanceBetween(pa, pb);
        if (d < minSep) {
          minSep = d;
          tMin = t;
        }
      }
      if (minSep < separationNm) {
        out.push({ a: A, b: B, minSeparation: minSep, tSeconds: tMin });
      }
    }
  }
  return out;
}

/**
 * Convert a wind expressed in true direction + speed into a velocity vector
 * (the direction the air is MOVING, opposite of `from`). Useful for crab-angle math.
 */
export function windToVector(fromHeading: Heading, kt: number): Position {
  // Air moves in (from + 180) direction.
  const movingTo = (fromHeading + 180) % 360;
  return headingToVector(movingTo, kt);
}
