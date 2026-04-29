import { describe, it, expect } from 'vitest';
import {
  bearingGeo,
  distNmGeo,
  geoToScope,
  scopeToGeo,
  parseCsv,
  parseOurAirportsAirports,
  parseOurAirportsRunways,
  attachRunways,
  findAirportByIcao,
  findAirportByIata,
  approachesByIcao,
  allAirports,
} from '../src/data/index.js';

const close = (a: number, b: number, eps = 1e-2) => Math.abs(a - b) < eps;

describe('geoToScope / scopeToGeo', () => {
  const center = { lat: 37.6213, lon: -122.379 }; // KSFO

  it('center maps to (0, 0)', () => {
    const p = geoToScope(center, center);
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });

  it('1° north (≈60 nm) maps to negative y', () => {
    const p = geoToScope(center, { lat: center.lat + 1, lon: center.lon });
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, -60)).toBe(true);
  });

  it('1° east at 37°N maps to ~47 nm east', () => {
    const p = geoToScope(center, { lat: center.lat, lon: center.lon + 1 });
    // cos(37.6°) * 60 ≈ 47.5 nm
    expect(close(p.x, 47.5, 0.5)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });

  it('round-trip is identity', () => {
    const target = { lat: 37.7, lon: -122.5 };
    const p = geoToScope(center, target);
    const back = scopeToGeo(center, p);
    expect(close(back.lat, target.lat, 1e-6)).toBe(true);
    expect(close(back.lon, target.lon, 1e-6)).toBe(true);
  });
});

describe('distNmGeo / bearingGeo', () => {
  it('SFO → JFK ≈ 2247 nm', () => {
    const sfo = { lat: 37.6213, lon: -122.379 };
    const jfk = { lat: 40.6398, lon: -73.7789 };
    const d = distNmGeo(sfo, jfk);
    expect(d).toBeGreaterThan(2200);
    expect(d).toBeLessThan(2300);
  });

  it('bearing east from prime meridian = 90°', () => {
    const a = { lat: 0, lon: 0 };
    const b = { lat: 0, lon: 5 };
    expect(close(bearingGeo(a, b), 90, 0.5)).toBe(true);
  });
});

describe('parseCsv', () => {
  it('handles quoted commas + escapes', () => {
    const csv = 'a,b,c\n1,"two, with comma","three ""quoted"""\n4,5,6\n';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      { a: '1', b: 'two, with comma', c: 'three "quoted"' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  it('skips empty trailing lines', () => {
    expect(parseCsv('a\n1\n\n')).toEqual([{ a: '1' }]);
  });
});

describe('OurAirports parsers', () => {
  const airportsCsv =
    'id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords\n' +
    '1,KTST,large_airport,Test Intl,40.0,-100.0,1500,NA,US,US-TX,Testville,yes,KTST,TST,TST,,,\n' +
    '2,XCLO,closed,Closed Field,0,0,0,NA,US,,,,,,,,,';

  const runwaysCsv =
    'id,airport_ref,airport_ident,length_ft,width_ft,surface,lighted,closed,le_ident,le_latitude_deg,le_longitude_deg,le_elevation_ft,le_heading_degT,le_displaced_threshold_ft,he_ident,he_latitude_deg,he_longitude_deg,he_elevation_ft,he_heading_degT,he_displaced_threshold_ft\n' +
    '1,1,KTST,10000,200,ASPH,1,0,09,40.0,-100.05,1500,90,0,27,40.0,-99.95,1500,270,0\n';

  it('parses airports + filters closed by default', () => {
    const airports = parseOurAirportsAirports(airportsCsv);
    expect(airports).toHaveLength(1);
    expect(airports[0].icao).toBe('KTST');
    expect(airports[0].iata).toBe('TST');
  });

  it('parses runways and attaches by ICAO', () => {
    const airports = parseOurAirportsAirports(airportsCsv);
    const rwMap = parseOurAirportsRunways(runwaysCsv);
    attachRunways(airports, rwMap);
    expect(airports[0].runways).toHaveLength(1);
    expect(airports[0].runways[0].le.ident).toBe('09');
    expect(airports[0].runways[0].he.headingDegT).toBe(270);
  });
});

describe('bundled airport dataset', () => {
  it('includes a respectable number of airports', () => {
    expect(allAirports().length).toBeGreaterThan(500);
  });

  it('finds KSFO by ICAO', () => {
    const ap = findAirportByIcao('KSFO');
    expect(ap?.iata).toBe('SFO');
    expect(ap?.runways.length).toBeGreaterThan(0);
  });

  it('finds LHR by IATA', () => {
    const ap = findAirportByIata('LHR');
    expect(ap?.icao).toBe('EGLL');
  });
});

describe('bundled approaches', () => {
  it('has at least one approach per seeded airport', () => {
    expect(approachesByIcao('KSFO').length).toBeGreaterThan(0);
    expect(approachesByIcao('EGLL').length).toBeGreaterThan(0);
  });

  it('approach finalCourseT roughly matches its runway heading', () => {
    const ksfo = findAirportByIcao('KSFO')!;
    const apps = approachesByIcao('KSFO');
    for (const app of apps) {
      const end =
        ksfo.runways.find((rw) => rw.le.ident === app.runway)?.le ??
        ksfo.runways.find((rw) => rw.he.ident === app.runway)?.he;
      expect(end).toBeDefined();
      expect(Math.abs(app.finalCourseT - end!.headingDegT)).toBeLessThan(1);
    }
  });
});
