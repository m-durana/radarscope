<script lang="ts">
  import { untrack } from 'svelte';

  /** Optional teaching/illustration callout pointing at one column. The
   *  label is rendered inside the SVG so it always fits and never clips. */
  export interface FMACallout {
    column: 'at' | 'lat' | 'vert' | 'app';
    label: string;
    tone?: 'good' | 'bad' | 'note';
    /** Default 'above'. */
    placement?: 'above' | 'below';
  }

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
    /** Render a labeled leader pointing at one column. Pixel height
     *  auto-grows to keep the strip itself the same size. */
    callout?: FMACallout;
  }

  let { at, lat, vert, app, boxMs = 10000, width = 320, height = 28, callout }: Props = $props();

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

  // Callout geometry. The strip lives in viewBox y=-14..14 (height 28).
  // When a callout is present, we extend the viewBox vertically by
  // CALLOUT_PAD on the chosen side, render a leader from the column edge
  // out to a label, and grow the rendered pixel height proportionally so
  // the strip itself stays the same size.
  const CALLOUT_PAD = 36;
  const COL_X = { at: -120, lat: -40, vert: 40, app: 120 } as const;
  // Horizontal extra space for end columns so long labels can extend
  // past the strip edge without being clipped by the viewBox.
  const COL_H_EXTRA: Record<'at' | 'lat' | 'vert' | 'app', { left: number; right: number }> = {
    at:   { left: 80, right: 0 },
    lat:  { left: 0,  right: 0 },
    vert: { left: 0,  right: 0 },
    app:  { left: 0,  right: 80 },
  };

  const calloutGeom = $derived.by(() => {
    if (!callout) return null;
    const placement = callout.placement ?? 'above';
    const tone = callout.tone ?? 'note';
    const color = tone === 'good' ? 'var(--pfd-vref, #16a34a)'
                : tone === 'bad'  ? 'var(--pfd-amber, #ffb000)'
                : 'var(--pfd-fg, #ffffff)';
    const cx = COL_X[callout.column];
    const above = placement === 'above';
    // Leader: start just outside the strip edge, end near label baseline.
    const leaderY1 = above ? -14 : 14;
    const leaderY2 = above ? -14 - (CALLOUT_PAD - 12) : 14 + (CALLOUT_PAD - 12);
    const labelY = above ? -14 - (CALLOUT_PAD - 8) : 14 + (CALLOUT_PAD - 4);
    return { cx, above, color, leaderY1, leaderY2, labelY };
  });

  const vb = $derived.by(() => {
    if (!callout) return { x: -160, y: -14, w: 320, h: 28 };
    const above = (callout.placement ?? 'above') === 'above';
    const extras = COL_H_EXTRA[callout.column];
    const x = -160 - extras.left;
    const w = 320 + extras.left + extras.right;
    const y = -14 - (above ? CALLOUT_PAD : 0);
    const h = 28 + CALLOUT_PAD;
    return { x, y, w, h };
  });

  const renderHeight = $derived(callout ? Math.round(height * (vb.h / 28)) : height);
  const renderWidth = $derived(callout ? Math.round(width * (vb.w / 320)) : width);
</script>

<svg
  class="fma"
  width={renderWidth}
  height={renderHeight}
  viewBox="{vb.x} {vb.y} {vb.w} {vb.h}"
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

  {#if callout && calloutGeom}
    {@const g = calloutGeom}
    <line
      x1={g.cx} y1={g.leaderY1}
      x2={g.cx} y2={g.leaderY2}
      stroke={g.color} stroke-width="0.6" opacity="0.85"
    />
    <circle cx={g.cx} cy={g.leaderY1} r="1.4" fill={g.color} />
    <text
      x={g.cx} y={g.labelY}
      text-anchor="middle"
      font-size="9"
      font-weight="600"
      fill={g.color}
    >{callout.label}</text>
  {/if}
</svg>

<style>
  .fma {
    display: block;
    background: var(--pfd-fma, #1a1d23);
  }
</style>
