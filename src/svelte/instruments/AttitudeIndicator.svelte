<script lang="ts">
  import type { FlightDirector } from './types.js';
  import { PITCH_LADDER_STEP_DEG } from '../../core/instruments.js';

  interface Props {
    /** Pitch in degrees, positive = nose up. */
    pitch: number;
    /** Roll in degrees, positive = right wing down. */
    roll: number;
    /** Optional flight director V-bars (commanded attitude). */
    fd?: FlightDirector | null;
    /** Lateral acceleration in g (sideslip). Positive = ball right.
     *  Drives the slip/skid trapezoid under the roll pointer.
     *  Pass null/undefined to hide. */
    slip?: number | null;
    width?: number;
    height?: number;
  }

  let { pitch, roll, fd = null, slip = null, width = 240, height = 240 }: Props = $props();

  // Internal SVG units. 100 = full radius. Pitch ladder: 10° = 20 units.
  const PX_PER_DEG = 2;

  // Roll the entire horizon group via a transform on the parent <g>.
  const horizonY = $derived(pitch * PX_PER_DEG);

  // Pitch ladder lines (every 5°, labelled every 10°), -30..+30.
  const ladder = $derived.by(() => {
    const lines: Array<{ deg: number; y: number; halfWidth: number; label: boolean }> = [];
    for (let d = -30; d <= 30; d += PITCH_LADDER_STEP_DEG) {
      if (d === 0) continue;
      const major = d % 10 === 0;
      lines.push({
        deg: d,
        y: -d * PX_PER_DEG, // negative deg below horizon
        halfWidth: major ? 24 : 12,
        label: major,
      });
    }
    return lines;
  });

  // Roll arc tick marks (10, 20, 30, 45, 60).
  const ROLL_TICKS = [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60];

  // Boeing convention: roll pointer turns amber past ~35° bank.
  const HIGH_BANK_DEG = 35;
  const overBank = $derived(Math.abs(roll) > HIGH_BANK_DEG);
  const rollPointerColor = $derived(overBank ? 'var(--pfd-amber, #ffb000)' : 'var(--pfd-fg, #ffffff)');

  // Build the amber bank-protection arc segments (from ±33° to ±67°).
  // SVG arc path centered on (0,0), radius 92, drawn as two strokes.
  function arcPath(startDeg: number, endDeg: number, r: number): string {
    // Roll-scale convention: 0° at top, positive = right. Convert to SVG
    // angle (0° = +x). Top is -90° in SVG, so deg → svgDeg = deg - 90.
    const a1 = ((startDeg - 90) * Math.PI) / 180;
    const a2 = ((endDeg - 90) * Math.PI) / 180;
    const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
    const x2 = Math.cos(a2) * r, y2 = Math.sin(a2) * r;
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  const BANK_ARC_R = 92;
</script>

<svg
  class="ai"
  {width}
  {height}
  viewBox="-100 -100 200 200"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Attitude indicator"
>
  <!-- Round mask so the horizon stays inside the AI ball. -->
  <defs>
    <clipPath id="ai-clip">
      <circle cx="0" cy="0" r="92" />
    </clipPath>
  </defs>

  <!-- Background bezel -->
  <circle cx="0" cy="0" r="98" fill="var(--pfd-bg, #0a0c10)" />

  <!-- Horizon: rotated by roll, translated by pitch. -->
  <g clip-path="url(#ai-clip)">
    <g transform="rotate({-roll}) translate(0 {horizonY})">
      <!-- Sky / ground. Defaults are saturated Boeing-style (vivid blue
           and warm brown). Override via --pfd-sky / --pfd-ground. -->
      <rect x="-300" y="-300" width="600" height="300" fill="var(--pfd-sky, #1d6fb8)" />
      <rect x="-300" y="0" width="600" height="300" fill="var(--pfd-ground, #8b4a1e)" />
      <!-- Horizon line -->
      <line x1="-300" y1="0" x2="300" y2="0" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />

      <!-- Pitch ladder. Major marks (±10°, ±20°, ±30°) get inward-
           pointing tabs at the line ends — the Boeing convention that
           always cues which way the horizon sits relative to the mark. -->
      {#each ladder as l}
        <line
          x1={-l.halfWidth}
          y1={l.y}
          x2={l.halfWidth}
          y2={l.y}
          stroke="var(--pfd-fg, #ffffff)"
          stroke-width="1"
        />
        {#if l.label}
          {@const tabDir = l.deg > 0 ? 3.5 : -3.5}
          <line x1={-l.halfWidth} y1={l.y} x2={-l.halfWidth} y2={l.y + tabDir} stroke="var(--pfd-fg, #ffffff)" stroke-width="1" />
          <line x1={l.halfWidth} y1={l.y} x2={l.halfWidth} y2={l.y + tabDir} stroke="var(--pfd-fg, #ffffff)" stroke-width="1" />
          <text
            x={-l.halfWidth - 4}
            y={l.y + 2}
            text-anchor="end"
            font-size="6"
            fill="var(--pfd-fg, #ffffff)"
          >{Math.abs(l.deg)}</text>
          <text
            x={l.halfWidth + 4}
            y={l.y + 2}
            text-anchor="start"
            font-size="6"
            fill="var(--pfd-fg, #ffffff)"
          >{Math.abs(l.deg)}</text>
        {/if}
      {/each}
    </g>
  </g>

  <!-- Roll scale arc -->
  <g class="roll-scale">
    <!-- High-bank protection arcs (amber, 33°..67° each side) -->
    <path d={arcPath(33, 67, BANK_ARC_R)} fill="none" stroke="var(--pfd-amber, #ffb000)" stroke-width="2" />
    <path d={arcPath(-67, -33, BANK_ARC_R)} fill="none" stroke="var(--pfd-amber, #ffb000)" stroke-width="2" />

    {#each ROLL_TICKS as t}
      <line
        x1="0"
        y1="-92"
        x2="0"
        y2={Math.abs(t) >= 30 ? -100 : -96}
        stroke="var(--pfd-fg, #ffffff)"
        stroke-width="1"
        transform="rotate({t})"
      />
    {/each}
    <!-- Sky pointer (triangle at top) -->
    <polygon points="0,-92 -4,-86 4,-86" fill="var(--pfd-amber, #ffb000)" />
    <!-- Roll indicator + slip/skid trapezoid (rolls with attitude). -->
    <g transform="rotate({-roll})">
      <polygon points="0,-86 -4,-80 4,-80" fill={rollPointerColor} />
      {#if slip !== null}
        {@const slipDx = Math.max(-8, Math.min(8, slip * 8))}
        <polygon
          points="{-6 + slipDx},-78 {6 + slipDx},-78 {5 + slipDx},-75 {-5 + slipDx},-75"
          fill="none"
          stroke="var(--pfd-fg, #ffffff)"
          stroke-width="1"
        />
      {/if}
    </g>
  </g>

  <!-- Flight director V-bars -->
  {#if fd}
    {@const fdY = (pitch - fd.pitch) * PX_PER_DEG}
    {@const fdRoll = -roll + fd.roll}
    <g class="shadowed" transform="rotate({fdRoll}) translate(0 {fdY})">
      <polyline
        points="-30,0 0,8 30,0"
        fill="none"
        stroke="var(--pfd-magenta, #d946ef)"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
    </g>
  {/if}

  <!-- Aircraft reference symbol (fixed, doesn't roll). -->
  <g class="aircraft-ref shadowed">
    <line x1="-40" y1="0" x2="-12" y2="0" stroke="var(--pfd-amber, #ffb000)" stroke-width="2.5" />
    <line x1="12" y1="0" x2="40" y2="0" stroke="var(--pfd-amber, #ffb000)" stroke-width="2.5" />
    <line x1="-12" y1="0" x2="-12" y2="6" stroke="var(--pfd-amber, #ffb000)" stroke-width="2.5" />
    <line x1="12" y1="0" x2="12" y2="6" stroke="var(--pfd-amber, #ffb000)" stroke-width="2.5" />
    <rect x="-3" y="-2" width="6" height="4" fill="var(--pfd-amber, #ffb000)" />
  </g>
</svg>

<style>
  .ai {
    display: block;
    background: var(--pfd-bg, #0a0c10);
    border-radius: 6px;
  }
  /* Legibility halo around the FD bars and the fixed aircraft symbol so
   * they read clearly against either the sky or ground fill. Technique
   * referenced from licarth/a320pfd (see ATTRIBUTIONS.md). */
  .shadowed {
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.85));
  }
</style>
