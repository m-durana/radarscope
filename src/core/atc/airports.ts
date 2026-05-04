// Airport schema — TypeScript adaptation of the openscope airport JSON
// format. Schema/semantics ported from openscope (MIT, Copyright (c)
// 2014 Jon Ross), see ATTRIBUTIONS.md and licenses/openscope-LICENSE.md.
//
// Source spec: openscope/documentation/airport-format.md
//
// Pure types only — no runtime code. A real ATC scope or ND can load an
// openscope airport file and validate against this shape directly.

/** Latitude/longitude pair (decimal degrees, signed). */
export type LatLon = [lat: number, lon: number];

/** Same as LatLon but with an optional elevation suffix string ("432ft"). */
export type LatLonAlt = [lat: number, lon: number, elevation?: string];

/** Field used by parsers — coordinates accept four formats interchangeably:
 *   - signed decimal:        [40.94, -76.61]
 *   - hemisphere decimal:    ["N40.94", "W76.61"]
 *   - degrees-minutes:       ["N40d56.811", "W076d37.037"]
 *   - degrees-minutes-secs:  ["N40d56m48.65", "W076d37m02.20"]
 * After parsing, all coordinates are signed decimal degrees in this lib. */
export type RawLatLon = LatLon | [string, string] | [string, string, string];

/** Wind. Angle is **true** heading (NOT magnetic). Speed in knots. */
export interface Wind {
  angle: number;
  speed: number;
}

/** Controller callsigns spoken on the radio. */
export interface RadioCallsigns {
  twr: string;
  app: string;
  dep: string;
}

export interface RangeRings {
  enabled: boolean;
  center: LatLon;
  radius_nm: number;
}

/** A 2-tuple keyed by runway end (index 0 = first name, index 1 = opposite). */
export type RunwayPair<T> = [T, T];

export interface Runway {
  /** ["16R", "34L"] — both ends, opposite directions. */
  name: RunwayPair<string>;
  /** Threshold positions for each end. */
  end: RunwayPair<LatLonAlt>;
  ils?: RunwayPair<boolean>;
  /** Distance from threshold ILS antenna serves, nm. */
  ils_distance?: RunwayPair<number>;
  /** LOC reception max range, nm. */
  loc_maxDist?: RunwayPair<number>;
  /** Glideslope angle in degrees (typically 3.0). */
  glideslope?: RunwayPair<number>;
  /** Max altitude G/S is captured at (ft). */
  ils_gs_maxHeight?: number;
  /** Min lateral separation from a parallel runway (ft). */
  sepFromAdjacent?: number;
}

/** Floor/ceiling are flight levels (hundreds of feet). First entry is the
 *  outer perimeter; subsequent entries are sub-sectors. */
export interface AirspaceVolume {
  floor: number;
  ceiling: number;
  airspace_class: string;
  poly: LatLon[];
  labelPositions?: LatLon[];
}

export interface RestrictedArea {
  name?: string;
  /** Vertical limit, e.g. "FL180" or "8000ft". */
  height: string;
  poly: LatLon[];
  labelPositions?: LatLon[];
}

/** A waypoint reference in a SID/STAR route. Either a fix name (with
 *  optional restrictions like "DCT70+|S250-") or a [name, restriction] pair.
 *  Name prefixes:
 *    ^FOO   fly-over
 *    @FOO   hold at fix
 *    #270   fly heading 270 instead of a fix
 *  Restriction syntax (after a '|' or as 2nd tuple element):
 *    A70+   at or above FL070
 *    A70-   at or below FL070
 *    A70    at FL070
 *    S250-  at or below 250 KIAS
 *    Multiple constraints joined by '|'. */
export type RouteSeg = string | [fix: string, restriction: string];

export interface Sid {
  icao: string;
  name: string;
  /** Default altitude restriction (ft), if any. */
  altitude?: number;
  /** Per-runway initial segments. */
  rwy: Record<string, RouteSeg[]>;
  /** Common body of the procedure. */
  body?: RouteSeg[];
  /** Exit transitions, keyed by exit fix. */
  exitPoints: Record<string, RouteSeg[]>;
  /** Display polylines, each a list of fix names. '*' anchors a label. */
  draw: string[][];
}

export interface Star {
  icao: string;
  name: string;
  /** Entry transitions, keyed by entry fix. */
  entryPoints: Record<string, RouteSeg[]>;
  body?: RouteSeg[];
  /** Per-runway final segments. */
  rwy: Record<string, RouteSeg[]>;
  draw: string[][];
}

/** Probability-weighted airline list: [icao/callsign, weight]. */
export type AirlineWeight = [airline: string, weight: number];

export interface SpawnPattern {
  origin: string;
  destination: string;
  category: 'departure' | 'arrival' | 'overflight';
  /** Route in openscope dot-syntax: 'KSFO.OFFSH9.SXC..HLI..SQS'. */
  route: string;
  /** Single ft, range [lo, hi], or "" for default. */
  altitude: number | [number, number] | '';
  /** KIAS, or "" for default. */
  speed: number | '';
  method: string;
  /** Aircraft per hour. */
  rate: number;
  airlines: AirlineWeight[];
}

/** A drawable map overlay (coastlines, taxiways, etc.). lines = quads
 *  [lat1, lon1, lat2, lon2]. */
export interface MapOverlay {
  name: string;
  lines: [number, number, number, number][];
}

export interface Airport {
  airac: number;
  radio: RadioCallsigns;
  icao: string;
  iata: string;
  /** Magnetic declination in degrees east. Used to convert true ↔ magnetic. */
  magnetic_north: number;
  /** Despawn radius in **kilometres** (not nm — openscope quirk). */
  ctr_radius: number;
  /** Sim ceiling in feet. */
  ctr_ceiling: number;
  /** Default top-of-climb for departures, in feet. */
  initial_alt: number;
  /** Field reference point. */
  position: LatLonAlt;
  rangeRings: RangeRings;
  has_terrain: boolean;
  wind: Wind;
  arrivalRunway: string;
  departureRunway: string;
  defaultMaps: string[];
  airspace: AirspaceVolume[];
  fixes: Record<string, LatLon | [number, number, string]>;
  restricted?: RestrictedArea[];
  runways: Runway[];
  airways: Record<string, string[]>;
  sids: Record<string, Sid>;
  stars: Record<string, Star>;
  spawnPatterns: SpawnPattern[];
  maps: MapOverlay[];
}
