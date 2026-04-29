import type { RealAirport, RealRunway, RealRunwayEnd } from './types.js';

/**
 * Parse a CSV-formatted string into rows of objects keyed by header.
 * Handles quoted fields, embedded commas in quotes, and "" escapes.
 * Not a streaming parser — fine for inputs up to ~50 MB.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        cur.push(field); field = '';
      } else if (c === '\n') {
        cur.push(field); field = '';
        rows.push(cur); cur = [];
      } else if (c === '\r') {
        // ignore — handled by following \n
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }

  if (rows.length === 0) return [];
  const header = rows[0];
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === '') continue;
    const rec: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      rec[header[c]] = row[c] ?? '';
    }
    out.push(rec);
  }
  return out;
}

/**
 * Parse OurAirports `airports.csv` into the lib's `RealAirport[]` shape.
 * Runways are NOT attached — call `attachRunways(airports, parseRunwaysCsv(...))`
 * to merge a runways.csv from the same source.
 *
 * Filters: drops closed, heliport, seaplane_base, balloonport airports by default.
 */
export function parseOurAirportsAirports(csv: string, opts: { keepTypes?: ReadonlySet<string> } = {}): RealAirport[] {
  const keep = opts.keepTypes ?? new Set(['large_airport', 'medium_airport', 'small_airport']);
  const rows = parseCsv(csv);
  const out: RealAirport[] = [];
  for (const r of rows) {
    if (!keep.has(r.type)) continue;
    const lat = parseFloat(r.latitude_deg);
    const lon = parseFloat(r.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      icao: r.ident || r.gps_code || '',
      iata: r.iata_code || '',
      name: r.name || '',
      country: r.iso_country || '',
      municipality: r.municipality || undefined,
      lat,
      lon,
      elevationFt: r.elevation_ft ? parseInt(r.elevation_ft, 10) : undefined,
      type: r.type,
      runways: [],
    });
  }
  return out;
}

/** Parse OurAirports `runways.csv`; returns one entry per runway, keyed by airport ICAO. */
export function parseOurAirportsRunways(csv: string): Map<string, RealRunway[]> {
  const rows = parseCsv(csv);
  const out = new Map<string, RealRunway[]>();
  for (const r of rows) {
    if (r.closed === '1') continue;
    const ident = r.airport_ident;
    if (!ident) continue;
    const lengthFt = parseInt(r.length_ft, 10);
    if (!Number.isFinite(lengthFt) || lengthFt <= 0) continue;
    const le = makeEnd('le', r);
    const he = makeEnd('he', r);
    if (!le || !he) continue;
    const list = out.get(ident) ?? [];
    list.push({
      lengthFt,
      widthFt: r.width_ft ? parseInt(r.width_ft, 10) : undefined,
      surface: r.surface || undefined,
      lighted: r.lighted === '1',
      closed: false,
      le,
      he,
    });
    out.set(ident, list);
  }
  return out;
}

function makeEnd(prefix: 'le' | 'he', r: Record<string, string>): RealRunwayEnd | null {
  const ident = r[`${prefix}_ident`];
  if (!ident) return null;
  const lat = parseFloat(r[`${prefix}_latitude_deg`]);
  const lon = parseFloat(r[`${prefix}_longitude_deg`]);
  const heading = parseFloat(r[`${prefix}_heading_degT`]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(heading)) return null;
  const elev = parseFloat(r[`${prefix}_elevation_ft`]);
  const disp = parseFloat(r[`${prefix}_displaced_threshold_ft`]);
  return {
    ident,
    lat,
    lon,
    headingDegT: heading,
    elevationFt: Number.isFinite(elev) ? elev : undefined,
    displacedThresholdFt: Number.isFinite(disp) ? disp : undefined,
  };
}

/** Mutates `airports`, attaching runways by ICAO. Returns the same array for chaining. */
export function attachRunways(airports: RealAirport[], runwayMap: Map<string, RealRunway[]>): RealAirport[] {
  for (const ap of airports) {
    const rws = runwayMap.get(ap.icao);
    if (rws) ap.runways = rws;
  }
  return airports;
}
