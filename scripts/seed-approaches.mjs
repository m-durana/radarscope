#!/usr/bin/env node
// Seed src/data/approaches.json with a starter set of well-known ILS approaches.
// Only fills fields that are derivable from the bundled airport data — runway
// heading, course, etc. Detailed minimums / FAF coordinates are left undefined
// and should be added by hand against authoritative AIPs when needed.
//
// Run with: node scripts/seed-approaches.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AIRPORTS = resolve(ROOT, 'src/data/airports.json');
const OUT = resolve(ROOT, 'src/data/approaches.json');

const airports = JSON.parse(readFileSync(AIRPORTS, 'utf8'));

// Each seed entry names an airport + runway designator. The runway's headingDegT
// from airports.json becomes the approach's finalCourseT.
const SEEDS = [
  { airport: 'KSFO', runway: '28R', type: 'ILS' },
  { airport: 'KSFO', runway: '28L', type: 'ILS' },
  { airport: 'EGLL', runway: '27R', type: 'ILS' },
  { airport: 'EGLL', runway: '09L', type: 'ILS' },
  { airport: 'KLAX', runway: '25L', type: 'ILS' },
  { airport: 'KLAX', runway: '07R', type: 'ILS' },
  { airport: 'KJFK', runway: '04R', type: 'ILS' },
  { airport: 'KJFK', runway: '13L', type: 'ILS' },
  { airport: 'EHAM', runway: '06',  type: 'ILS' },
  { airport: 'EHAM', runway: '36R', type: 'ILS' },
  { airport: 'KORD', runway: '10C', type: 'ILS' },
  { airport: 'KORD', runway: '28R', type: 'ILS' },
  { airport: 'KATL', runway: '09L', type: 'ILS' },
  { airport: 'KATL', runway: '27R', type: 'ILS' },
  { airport: 'KDEN', runway: '16R', type: 'ILS' },
  { airport: 'RJTT', runway: '34R', type: 'ILS' },
  { airport: 'OMDB', runway: '12L', type: 'ILS' },
  { airport: 'OMDB', runway: '30R', type: 'ILS' },
];

function findRunwayEnd(airport, designator) {
  for (const rw of airport.runways) {
    if (rw.le.ident === designator) return rw.le;
    if (rw.he.ident === designator) return rw.he;
  }
  return null;
}

const out = [];
for (const seed of SEEDS) {
  const ap = airports.find((a) => a.icao === seed.airport);
  if (!ap) { console.warn(`skip: ${seed.airport} not in bundle`); continue; }
  const end = findRunwayEnd(ap, seed.runway);
  if (!end) { console.warn(`skip: ${seed.airport} ${seed.runway} not found`); continue; }
  out.push({
    name: `${seed.type} RWY ${seed.runway}`,
    airport: seed.airport,
    runway: seed.runway,
    type: seed.type,
    finalCourseT: Math.round(end.headingDegT * 10) / 10,
    // Minimums, FAF, IAF, missed approach intentionally left undefined. These
    // require sourcing against published AIPs and aren't safely derivable.
  });
}

out.sort((a, b) => (a.airport + a.runway).localeCompare(b.airport + b.runway));
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.error(`wrote ${out.length} approaches to ${OUT}`);
