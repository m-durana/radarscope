#!/usr/bin/env node
// Fetch OurAirports CSVs, filter to a curated bundle, write to src/data/airports.json.
// Run with: node scripts/fetch-airports.mjs
//
// Source: https://ourairports.com/data/ — public domain (CC0).
// Output: src/data/airports.json — a typed RealAirport[] subset.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'src/data/airports.json');

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const RUNWAYS_URL  = 'https://davidmegginson.github.io/ourairports-data/runways.csv';

// Inline a copy of the CSV parser from src/data/csv.ts so this script has zero deps
// and is runnable on a fresh checkout without a build step.
function parseCsv(text) {
  const rows = []; let cur = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); field = ''; rows.push(cur); cur = []; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const header = rows[0]; const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === '') continue;
    const rec = {};
    for (let c = 0; c < header.length; c++) rec[header[c]] = row[c] ?? '';
    out.push(rec);
  }
  return out;
}

async function fetchText(url) {
  console.error(`fetching ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function makeEnd(prefix, r) {
  const ident = r[`${prefix}_ident`]; if (!ident) return null;
  const lat = parseFloat(r[`${prefix}_latitude_deg`]);
  const lon = parseFloat(r[`${prefix}_longitude_deg`]);
  const heading = parseFloat(r[`${prefix}_heading_degT`]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(heading)) return null;
  const elev = parseFloat(r[`${prefix}_elevation_ft`]);
  const disp = parseFloat(r[`${prefix}_displaced_threshold_ft`]);
  return {
    ident, lat, lon, headingDegT: heading,
    elevationFt: Number.isFinite(elev) ? elev : undefined,
    displacedThresholdFt: Number.isFinite(disp) ? disp : undefined,
  };
}

async function main() {
  const [airportsCsv, runwaysCsv] = await Promise.all([
    fetchText(AIRPORTS_URL),
    fetchText(RUNWAYS_URL),
  ]);

  const airportRows = parseCsv(airportsCsv);
  const runwayRows  = parseCsv(runwaysCsv);

  // Build runway map keyed by airport ICAO.
  const rwMap = new Map();
  for (const r of runwayRows) {
    if (r.closed === '1') continue;
    const lengthFt = parseInt(r.length_ft, 10);
    if (!Number.isFinite(lengthFt) || lengthFt <= 0) continue;
    const le = makeEnd('le', r); const he = makeEnd('he', r);
    if (!le || !he) continue;
    const list = rwMap.get(r.airport_ident) ?? [];
    list.push({
      lengthFt,
      widthFt: r.width_ft ? parseInt(r.width_ft, 10) : undefined,
      surface: r.surface || undefined,
      lighted: r.lighted === '1',
      closed: false,
      le, he,
    });
    rwMap.set(r.airport_ident, list);
  }

  // Filter airports: large_airport (and medium with paved 5000ft+ runways and IATA),
  // with valid lat/lon. Keeps the bundle small but covers anything you'd quiz on.
  const out = [];
  for (const r of airportRows) {
    const lat = parseFloat(r.latitude_deg); const lon = parseFloat(r.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (r.type !== 'large_airport' && r.type !== 'medium_airport') continue;
    const rws = rwMap.get(r.ident) ?? [];
    const longestPaved = rws
      .filter((rw) => /asphalt|concrete|asph|conc|asph-conc|paved/i.test(rw.surface ?? ''))
      .reduce((m, rw) => Math.max(m, rw.lengthFt), 0);

    const isLarge = r.type === 'large_airport';
    const isQualifyingMedium =
      r.type === 'medium_airport' &&
      r.iata_code &&
      r.scheduled_service === 'yes' &&
      longestPaved >= 5000;

    if (!isLarge && !isQualifyingMedium) continue;
    if (rws.length === 0) continue;

    out.push({
      icao: r.ident || r.gps_code || '',
      iata: r.iata_code || '',
      name: r.name || '',
      country: r.iso_country || '',
      municipality: r.municipality || undefined,
      lat, lon,
      elevationFt: r.elevation_ft ? parseInt(r.elevation_ft, 10) : undefined,
      type: r.type,
      runways: rws,
    });
  }

  // Stable sort by ICAO so diffs are minimal across regenerations.
  out.sort((a, b) => a.icao.localeCompare(b.icao));

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  const sizeKb = (JSON.stringify(out).length / 1024).toFixed(1);
  console.error(`wrote ${out.length} airports to ${OUT} (${sizeKb} KB)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
