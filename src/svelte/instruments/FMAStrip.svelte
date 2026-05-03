<script lang="ts">
  import { untrack } from 'svelte';

  interface Props {
    /** Autothrottle column: SPEED, THR, IDLE, RETARD, HOLD. */
    at: string;
    /** Lateral mode column: LOC, HDG, LNAV, ROLLOUT. */
    lat: string;
    /** Vertical mode column: G/S, V/S, ALT, FLARE. */
    vert: string;
    /** Approach status column: LAND 3, LAND 2, NO AUTOLAND, ILS. */
    app: string;
    /** Milliseconds the white "mode change" box stays around a column
     *  after the value changes. Real PFDs use ~10 s. Set to 0 to disable. */
    boxMs?: number;
    width?: number;
    height?: number;
  }

  let { at, lat, vert, app, boxMs = 10000, width = 320, height = 28 }: Props = $props();

  // Color hints per common FMA convention.
  function colorOf(label: string): string {
    const u = label.toUpperCase();
    if (u.startsWith('NO AUTOLAND') || u === 'NO AP') return 'var(--pfd-amber, #ffb000)';
    if (u.startsWith('LAND 3') || u === 'FLARE') return 'var(--pfd-vref, #16a34a)';
    if (u.startsWith('LAND 2')) return 'var(--pfd-amber, #ffb000)';
    return 'var(--pfd-fg, #ffffff)';
  }

  // Track the last value seen for each column. When it changes, set a
  // timer to show the change-box for boxMs. Initial-value captures are
  // intentional — these are mutable baselines updated inside $effect.
  /* svelte-ignore state_referenced_locally */
  let lastAt = at;
  /* svelte-ignore state_referenced_locally */
  let lastLat = lat;
  /* svelte-ignore state_referenced_locally */
  let lastVert = vert;
  /* svelte-ignore state_referenced_locally */
  let lastApp = app;
  let boxAt = $state(false);
  let boxLat = $state(false);
  let boxVert = $state(false);
  let boxApp = $state(false);
  let timers: Record<string, number> = {};

  function arm(col: 'at' | 'lat' | 'vert' | 'app') {
    if (boxMs <= 0) return;
    if (timers[col]) clearTimeout(timers[col]);
    if (col === 'at') boxAt = true;
    if (col === 'lat') boxLat = true;
    if (col === 'vert') boxVert = true;
    if (col === 'app') boxApp = true;
    timers[col] = window.setTimeout(() => {
      if (col === 'at') boxAt = false;
      if (col === 'lat') boxLat = false;
      if (col === 'vert') boxVert = false;
      if (col === 'app') boxApp = false;
    }, boxMs);
  }

  $effect(() => {
    // Read the props so the effect re-runs on change, but use untrack
    // for the box state writes so we don't loop.
    const a = at, l = lat, v = vert, p = app;
    untrack(() => {
      if (a !== lastAt) { lastAt = a; arm('at'); }
      if (l !== lastLat) { lastLat = l; arm('lat'); }
      if (v !== lastVert) { lastVert = v; arm('vert'); }
      if (p !== lastApp) { lastApp = p; arm('app'); }
    });
  });

  const cols = $derived([
    { label: at, x: -120, box: boxAt },
    { label: lat, x: -40, box: boxLat },
    { label: vert, x: 40, box: boxVert },
    { label: app, x: 120, box: boxApp },
  ]);
</script>

<svg
  class="fma"
  {width}
  {height}
  viewBox="-160 -14 320 28"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Flight mode annunciator"
>
  <rect x="-160" y="-14" width="320" height="28" fill="var(--pfd-fma, #1a1d23)" />

  <!-- Column dividers -->
  {#each [-80, 0, 80] as x}
    <line x1={x} y1="-14" x2={x} y2="14" stroke="var(--pfd-fg, #ffffff)" stroke-width="0.4" opacity="0.3" />
  {/each}

  {#each cols as c}
    {#if c.box}
      <rect
        x={c.x - 36}
        y="-12"
        width="72"
        height="24"
        fill="none"
        stroke="var(--pfd-fg, #ffffff)"
        stroke-width="1.2"
      />
    {/if}
    <text
      x={c.x}
      y="4"
      text-anchor="middle"
      font-size="11"
      font-weight="700"
      fill={colorOf(c.label)}
    >{c.label}</text>
  {/each}
</svg>

<style>
  .fma {
    display: block;
    background: var(--pfd-fma, #1a1d23);
  }
</style>
