# radarscope

Aviation-themed SVG primitives for top-down radar / ATC views: scopes, aircraft blips, runways, waypoints, wind tags, plus the geometry math you'd otherwise re-derive every project.

- **Framework-agnostic core** — zero dependencies, just TypeScript. Geometry helpers (`headingToVector`, `findConflicts`, `interceptAngle`, …) and a scene-graph that renders to a static SVG string.
- **Svelte 5 adapter** — ergonomic reactive components (`<RadarScope>`, `<AircraftBlip>`, `<RunwayMarker>`, `<Waypoint>`, `<Route>`, `<WindTag>`) that consume the same geometry. Subpath export, opt-in.
- **Real-world data** — bundled airport + runway data from the public-domain [OurAirports](https://ourairports.com) dataset (~1100 large/medium airports), plus a CSV parser if you want to load the full dataset yourself, plus a starter set of well-known approaches. Subpath export, opt-in.
- **Themable** — every visual is driven by CSS custom properties (`--scope-bg`, `--scope-blip`, `--scope-conflict`, …) so it slots into your existing palette.

## Install

```sh
npm install radarscope
# Svelte adapter is opt-in — bring your own Svelte 5
```

For local development against a sibling project:

```jsonc
// games/package.json
{
  "dependencies": {
    "radarscope": "file:../radarscope"
  }
}
```

## Quickstart — Svelte

```svelte
<script lang="ts">
  import { RadarScope, AircraftBlip, RunwayMarker } from 'radarscope/svelte';
  import { findConflicts, type Scenario } from 'radarscope';

  const scenario: Scenario = {
    aircraft: [
      { id: '1', callsign: 'AAL123', pos: { x: 5, y: -10 }, heading: 240, altitude: 18000, speed: 280 },
      { id: '2', callsign: 'DAL456', pos: { x: -8, y:  -2 }, heading:  90, altitude: 18000, speed: 260 },
    ],
    runway: { threshold: { x: 0, y: 0 }, heading: 270 },
    rangeNm: 30,
  };

  const conflictIds = new Set(findConflicts(scenario, 180, 5).flatMap((c) => [c.a.id, c.b.id]));
</script>

<RadarScope {scenario} size={520}>
  <RunwayMarker runway={scenario.runway!} showFinal />
  {#each scenario.aircraft as ac (ac.id)}
    <AircraftBlip
      aircraft={ac}
      conflict={conflictIds.has(ac.id)}
      onclick={(a) => console.log('clicked', a.callsign)}
    />
  {/each}
</RadarScope>
```

## Quickstart — vanilla / SSR

```ts
import { buildScopeScene, renderToString, type Scenario } from 'radarscope';

const scenario: Scenario = {
  aircraft: [
    { id: '1', callsign: 'BAW100', pos: { x: 0, y: -8 }, heading: 180, altitude: 12000, speed: 240 },
  ],
  rangeNm: 30,
};

const svg = renderToString(buildScopeScene(scenario, { size: 600 }));
document.getElementById('mount')!.innerHTML = svg;
```

## Coordinates

- Positions are in **nautical miles**, relative to the scope center `(0, 0)`.
- `x` increases east, `y` increases south. Y-down so values map directly into SVG screen coords without flipping.
- Headings are degrees true (0–360), with `0` = north.

## API surface

### Core (`radarscope`)

```ts
// types
type Heading = number;
interface Position { x: number; y: number; }
interface Aircraft { id, callsign, pos, heading, altitude /* ft */, speed /* kt GS */ }
interface Runway   { threshold, heading, lengthNm? }
interface Wind     { from /* deg true */, kt }
interface Waypoint { id, pos, label }
interface Scenario { aircraft, runway?, waypoints?, wind?, rangeNm? }

// geometry
headingToVector(h, len): Position
projectAircraft(a, seconds): Position
bearingFromTo(a, b): Heading
distanceBetween(a, b): number  // nm
interceptAngle(current, target): number  // signed, (-180, 180]
findConflicts(scenario, horizonSec, separationNm, verticalFt?): ConflictPair[]
windToVector(fromHeading, kt): Position

// scene → SVG
buildScopeScene(scenario, opts?): SvgNode
buildAircraftBlip / buildRunway / buildWaypoint / buildWindTag (also exported individually)
renderToString(node): string
```

### Real-world data (`radarscope/data`)

Bundled subset of [OurAirports](https://ourairports.com) (CC0 public domain), filtered to ~1100 airports: every `large_airport`, plus `medium_airport`s with scheduled service, an IATA code, and a paved runway ≥5000 ft. Each airport carries its full runway data (heading, length, threshold lat/lon).

```ts
import {
  // Bundled lookups
  allAirports,
  findAirportByIcao,
  findAirportByIata,
  airportsByCountry,

  // Geographic ↔ scope projection
  geoToScope, scopeToGeo, distNmGeo, bearingGeo,

  // CSV parser for OurAirports' full dataset (load it yourself if you need
  // every airport — the bundled subset covers every commercially-served field).
  parseCsv,
  parseOurAirportsAirports,
  parseOurAirportsRunways,
  attachRunways,

  // Starter approach set (~18 well-known ILS approaches; minimums/FAF
  // intentionally undefined — fill those in against authoritative AIPs).
  allApproaches, approachesByIcao, approachesByRunway,
} from 'radarscope/data';

// Build a scope centered on a real airport with real runways:
import { headingToVector } from 'radarscope';

const ksfo = findAirportByIcao('KSFO')!;
const center = { lat: ksfo.lat, lon: ksfo.lon };

const scenario = {
  rangeNm: 30,
  runway: {
    threshold: geoToScope(center, ksfo.runways[2].le), // 28R landing threshold
    heading: ksfo.runways[2].he.headingDegT,           // arriving from the east
  },
  aircraft: [/* … */],
};
```

The `radarscope/data` subpath bundles ~150 KB gzipped of airport JSON. It's a separate entry point, so consumers who don't import it pay nothing.

To refresh the bundled data against the latest OurAirports release:

```sh
node scripts/fetch-airports.mjs
```

### Svelte adapter (`radarscope/svelte`)

```svelte
<RadarScope scenario size={520} rangeRings={[10, 20, 30]}>
  <RunwayMarker runway={…} showFinal finalNm={12} />
  <Waypoint waypoint={…} onclick={(w) => …} selected />
  <Route waypoints={…} from={ac.pos} />
  <AircraftBlip aircraft={…} selected conflict vectorNm={2} onclick={(a) => …} />
  <WindTag wind={…} position={{ x: -27, y: -27 }} />
</RadarScope>
```

All children render inside the parent `<RadarScope>`'s coordinate system (nm-units), so positions on a `Waypoint` or `AircraftBlip` are passed in nm, not pixels.

## Theming

The lib reads CSS custom properties with sensible dark-mode defaults. Override any of:

```css
:root {
  --scope-bg: #0c1116;
  --scope-stroke: #3a4750;
  --scope-blip: #a3cef1;
  --scope-conflict: #ef4444;
  --scope-selected: #facc15;
  --scope-tag: #cdd9e2;
  --scope-tag-dim: #97a4ab;
  --scope-runway: #cdd9e2;
  --scope-final: #6b7480;
  --scope-waypoint: #6096ba;
  --scope-route: #6096ba;
}
```

For a light theme, override `--scope-bg` and the contrast colors; everything else flows.

## Demo

```sh
npm install
npm run dev
```

Opens an interactive sandbox: aircraft count slider, range rings, wind controls, click-to-select, conflict highlighting from the geometry helpers.

## Tests

```sh
npm run test
```

Unit tests cover the geometry primitives (the load-bearing math) and the SVG-string renderer.

## Data attribution

Bundled airport + runway data is derived from [OurAirports](https://ourairports.com), released into the public domain (CC0). Re-distributing the bundled JSON is permitted; attributing OurAirports is encouraged.

## License

MIT (the library code). The bundled airport data is CC0 from OurAirports.
