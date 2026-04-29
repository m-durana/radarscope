<script lang="ts">
  import RadarScope from '../src/svelte/RadarScope.svelte';
  import AircraftBlip from '../src/svelte/AircraftBlip.svelte';
  import RunwayMarker from '../src/svelte/RunwayMarker.svelte';
  import Waypoint from '../src/svelte/Waypoint.svelte';
  import Route from '../src/svelte/Route.svelte';
  import WindTag from '../src/svelte/WindTag.svelte';
  import type { Aircraft, Scenario, Waypoint as WaypointT } from '../src/core/types.js';
  import { findConflicts } from '../src/core/geometry.js';

  // --- Procedural traffic generator (seeded for reproducibility) ----------------
  function mulberry32(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CALLSIGN_PREFIXES = ['AAL', 'DAL', 'UAL', 'BAW', 'AFR', 'KLM', 'DLH', 'SWA', 'JBU', 'ACA'];

  function generateScenario(seed: number, count: number, range: number, windFrom: number, windKt: number, includeRunway: boolean): Scenario {
    const rng = mulberry32(seed);
    const aircraft: Aircraft[] = [];
    for (let i = 0; i < count; i++) {
      const r = (0.3 + rng() * 0.7) * range;
      const theta = rng() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      // Bias heading roughly toward the center to make things interesting.
      const bearingToCenter = (Math.atan2(x, -y) * 180) / Math.PI;
      const noise = (rng() - 0.5) * 90;
      const heading = ((bearingToCenter + 180 + noise) % 360 + 360) % 360;
      aircraft.push({
        id: `ac-${i}`,
        callsign: `${CALLSIGN_PREFIXES[Math.floor(rng() * CALLSIGN_PREFIXES.length)]}${100 + Math.floor(rng() * 900)}`,
        pos: { x, y },
        heading,
        altitude: 5000 + Math.floor(rng() * 30) * 1000,
        speed: 220 + Math.floor(rng() * 240),
      });
    }
    const waypoints: WaypointT[] = [
      { id: 'wp-alpha', pos: { x: range * 0.55, y: -range * 0.35 }, label: 'ALPHA' },
      { id: 'wp-bravo', pos: { x: -range * 0.4, y: -range * 0.55 }, label: 'BRAVO' },
      { id: 'wp-char',  pos: { x: -range * 0.6, y:  range * 0.3  }, label: 'CHARLIE' },
    ];
    return {
      aircraft,
      waypoints,
      runway: includeRunway ? { threshold: { x: 0, y: 0 }, heading: 270, lengthNm: 0.6 } : undefined,
      wind: { from: windFrom, kt: windKt },
      rangeNm: range,
    };
  }

  // --- Reactive controls --------------------------------------------------------
  let seed = $state(7);
  let count = $state(5);
  let range = $state(30);
  let windFrom = $state(280);
  let windKt = $state(15);
  let includeRunway = $state(true);
  let showRoute = $state(false);
  let pickedIds = $state<string[]>([]);
  let log = $state<string[]>([]);

  const scenario = $derived(generateScenario(seed, count, range, windFrom, windKt, includeRunway));
  const conflicts = $derived(findConflicts(scenario, 180, 5));
  const conflictIds = $derived(new Set(conflicts.flatMap((c) => [c.a.id, c.b.id])));

  function handleClick(a: Aircraft) {
    pickedIds = pickedIds.includes(a.id)
      ? pickedIds.filter((id) => id !== a.id)
      : [...pickedIds, a.id];
    log = [
      `[${new Date().toLocaleTimeString()}] click ${a.callsign} (${a.id})`,
      ...log,
    ].slice(0, 20);
  }

  function reseed() {
    seed = Math.floor(Math.random() * 1_000_000);
    pickedIds = [];
  }
</script>

<header>
  <h1>radarscope</h1>
  <p>Aviation-themed SVG primitives. Procedurally generated traffic; click an aircraft to select.</p>
</header>

<div class="layout">
  <div class="scope-card">
    <RadarScope {scenario} size={560} rangeRings={[10, 20, 30, 40, 50].filter((r) => r <= range)}>
      {#if scenario.runway}
        <RunwayMarker runway={scenario.runway} showFinal />
      {/if}

      {#each scenario.waypoints ?? [] as wp (wp.id)}
        <Waypoint waypoint={wp} />
      {/each}

      {#if showRoute && scenario.waypoints && scenario.waypoints.length > 0}
        <Route waypoints={scenario.waypoints} from={scenario.aircraft[0]?.pos} />
      {/if}

      {#each scenario.aircraft as ac (ac.id)}
        <AircraftBlip
          aircraft={ac}
          selected={pickedIds.includes(ac.id)}
          conflict={conflictIds.has(ac.id)}
          onclick={handleClick}
        />
      {/each}

      {#if scenario.wind}
        <WindTag wind={scenario.wind} position={{ x: -range + 2.5, y: -range + 2.5 }} />
      {/if}
    </RadarScope>
  </div>

  <aside class="controls">
    <h2>Controls</h2>

    <div class="field">
      <div class="field-row">
        <label for="count">Aircraft</label>
        <span class="val">{count}</span>
      </div>
      <input id="count" type="range" min="2" max="10" bind:value={count} />
    </div>

    <div class="field">
      <div class="field-row">
        <label for="range">Range (nm)</label>
        <span class="val">{range}</span>
      </div>
      <input id="range" type="range" min="15" max="60" bind:value={range} />
    </div>

    <div class="field">
      <div class="field-row">
        <label for="wd">Wind from</label>
        <span class="val">{windFrom.toString().padStart(3, '0')}°</span>
      </div>
      <input id="wd" type="range" min="0" max="359" bind:value={windFrom} />
    </div>

    <div class="field">
      <div class="field-row">
        <label for="wk">Wind speed</label>
        <span class="val">{windKt} kt</span>
      </div>
      <input id="wk" type="range" min="0" max="60" bind:value={windKt} />
    </div>

    <div class="field">
      <label style="display:flex; gap:0.4rem; align-items:center; cursor:pointer;">
        <input type="checkbox" bind:checked={includeRunway} />
        Show runway + final
      </label>
      <label style="display:flex; gap:0.4rem; align-items:center; cursor:pointer;">
        <input type="checkbox" bind:checked={showRoute} />
        Show route from AC#1
      </label>
    </div>

    <button class="primary" onclick={reseed}>Reseed traffic</button>

    <div class="legend">
      <div class="row"><span class="swatch" style="background: var(--scope-blip)"></span> normal traffic</div>
      <div class="row"><span class="swatch" style="background: var(--scope-conflict)"></span> projected conflict ({conflicts.length})</div>
      <div class="row"><span class="swatch" style="background: var(--scope-selected)"></span> selected ({pickedIds.length})</div>
    </div>

    <div>
      <h2 style="margin-bottom: 0.4rem;">Click log</h2>
      <div class="log">
        {#if log.length === 0}
          <div class="entry">click an aircraft…</div>
        {:else}
          {#each log as line}
            <div class="entry">{line}</div>
          {/each}
        {/if}
      </div>
    </div>
  </aside>
</div>

<footer>
  <strong>API:</strong>
  <code>import {'{'} RadarScope, AircraftBlip {'}'} from 'radarscope/svelte'</code>
  &nbsp;·&nbsp;
  <code>import {'{'} findConflicts {'}'} from 'radarscope'</code>
</footer>
