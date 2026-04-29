/**
 * Real-world data types for use with `radarscope/data`. Distinct from the
 * core `Aircraft` / `Runway` (which use scope-local nm coordinates) — these
 * use WGS84 lat/lon and ship from public navdata sources.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface RealRunwayEnd {
  /** Runway designator at this end, e.g. "27L", "13R", "31". */
  ident: string;
  lat: number;
  lon: number;
  elevationFt?: number;
  /** Magnetic heading is more useful for IFR display, but we don't ship it
   *  (depends on local magnetic variation). True heading from OurAirports. */
  headingDegT: number;
  /** Threshold displaced from the physical runway end, in feet. */
  displacedThresholdFt?: number;
}

export interface RealRunway {
  /** Length of paved/usable surface, feet. */
  lengthFt: number;
  widthFt?: number;
  surface?: string;
  lighted?: boolean;
  closed?: boolean;
  le: RealRunwayEnd;
  he: RealRunwayEnd;
}

export interface RealAirport {
  /** ICAO ident, e.g. "KJFK", "EGLL". */
  icao: string;
  /** IATA code, e.g. "JFK", "LHR". May be empty for some airports. */
  iata: string;
  name: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US", "GB". */
  country: string;
  municipality?: string;
  lat: number;
  lon: number;
  elevationFt?: number;
  /** "large_airport" | "medium_airport" | "small_airport" (OurAirports type). */
  type: string;
  runways: RealRunway[];
}

/**
 * A simplified IFR approach. Hand-authored / curated rather than pulled from
 * navdata — covers ILS / RNAV / VOR approaches well enough for quiz-style use.
 */
export interface Approach {
  /** Approach name as you'd see it on the plate, e.g. "ILS RWY 28R", "RNAV (GPS) Z RWY 13L". */
  name: string;
  /** Airport ICAO. */
  airport: string;
  /** Runway designator the approach serves (e.g. "28R"). Match against `RealRunway.le.ident` or `.he.ident`. */
  runway: string;
  /** "ILS" | "LOC" | "RNAV" | "VOR" | "NDB" | "LDA" | "VISUAL". */
  type: string;
  /** Final approach course, degrees true. */
  finalCourseT: number;
  /** Decision height or minimum descent altitude, feet AGL. */
  minimumsFt?: number;
  /** Decision altitude / MDA, feet MSL. */
  daMdaFtMsl?: number;
  /** Final approach fix (FAF). */
  faf?: { name: string; lat: number; lon: number; altitudeFt: number };
  /** Initial approach fix (IAF) — first fix you'd cross when joining the procedure. */
  iaf?: { name: string; lat: number; lon: number; altitudeFt: number };
  /** Missed approach climb-to altitude, feet MSL. */
  missedAltitudeFt?: number;
  /** Plain-English missed approach instruction (e.g. "Climb to 4000 then direct CHARLIE hold"). */
  missedInstruction?: string;
  /** Visibility minimums, statute miles or RVR. Free-form. */
  visibility?: string;
}
