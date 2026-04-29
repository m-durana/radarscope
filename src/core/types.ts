/**
 * Coordinate convention
 * ---------------------
 * - All positions are in nautical miles (nm), relative to the scope center (0, 0).
 * - x: positive = east, negative = west.
 * - y: positive = south, negative = north. (Y-down, matching SVG screen coords.)
 *   This means a position at { x: 0, y: -10 } is 10 nm due north of the center.
 * - Heading: degrees, 0–360, true north up. 0 = north, 90 = east, 180 = south, 270 = west.
 *
 * Why y-down? It means scope coordinates can drop straight into an SVG viewBox
 * without per-axis flipping, while heading semantics stay aviation-conventional.
 */

export type Heading = number;

export interface Position {
  x: number;
  y: number;
}

export interface Aircraft {
  id: string;
  callsign: string;
  pos: Position;
  heading: Heading;
  /** feet MSL */
  altitude: number;
  /** knots groundspeed */
  speed: number;
}

export interface Runway {
  threshold: Position;
  /** Runway centerline heading at the landing threshold (the direction of landing). */
  heading: Heading;
  /** Runway length in nm (default 0.6 ≈ 3650 ft). */
  lengthNm?: number;
  /** Render the dashed extended-centerline for this runway. Default false. */
  showFinal?: boolean;
}

export interface Wind {
  /** Direction the wind is coming FROM, in degrees true. */
  from: Heading;
  /** Wind speed in knots. */
  kt: number;
}

export interface Waypoint {
  id: string;
  pos: Position;
  label: string;
}

export interface Scenario {
  aircraft: Aircraft[];
  /** All runways visible in the scope. Set `showFinal: true` on the active one
   *  to render its extended-centerline / final-approach course. */
  runways?: Runway[];
  /** Deprecated singular form — prefer `runways: [...]`. Kept for one release. */
  runway?: Runway;
  waypoints?: Waypoint[];
  wind?: Wind;
  /** Outer ring radius in nm. Default 30. */
  rangeNm?: number;
}
