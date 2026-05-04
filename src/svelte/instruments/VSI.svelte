<script lang="ts">
  interface Props {
    /** Vertical speed in feet per minute. Positive = climb. */
    fpm: number;
    /** Selected vertical speed reference (used in V/S autopilot mode).
     *  Drawn as a magenta caret on the scale. Pass null/undefined to hide. */
    selectedFpm?: number | null;
    /** TCAS resolution-advisory red band [lo, hi] in fpm — the "do not
     *  fly here" zone. Pass null to hide. */
    tcasRedBand?: { lo: number; hi: number } | null;
    /** TCAS resolution-advisory green band [lo, hi] in fpm — the "fly
     *  here" zone (corrective RAs). Pass null to hide. */
    tcasGreenBand?: { lo: number; hi: number } | null;
    width?: number;
    height?: number;
  }

  let {
    fpm,
    selectedFpm = null,
    tcasRedBand = null,
    tcasGreenBand = null,
    width = 36,
    height = 240,
  }: Props = $props();

  // Vertical scale, ±2000 fpm full range. Compressed past ±1000.
  // We map to a y-pixel position (0 = level, negative = climb above center).
  const HALF_HEIGHT = 110;

  function fpmToY(f: number): number {
    const sign = f < 0 ? 1 : -1; // climb goes up = negative y
    const m = Math.abs(f);
    const inner = Math.min(m, 1000) / 1000;
    const outer = Math.max(0, Math.min(m - 1000, 1000)) / 1000;
    // Inner takes 65% of half-height, outer takes 35%.
    return sign * (inner * HALF_HEIGHT * 0.65 + outer * HALF_HEIGHT * 0.35);
  }

  const ticks = [-2000, -1000, -500, 500, 1000, 2000];
  const needleY = $derived(fpmToY(fpm));
  // Show numeric readout in hundreds-of-fpm rounded.
  const readout = $derived(Math.round(fpm / 100) * 100);
</script>

<svg
  class="vsi"
  {width}
  {height}
  viewBox="-18 -120 36 240"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Vertical speed, {readout} feet per minute"
>
  <rect x="-18" y="-120" width="36" height="240" fill="var(--pfd-bg, #0a0c10)" />

  <!-- TCAS resolution-advisory bands (rendered behind the scale).
       Red = avoid; green = fly here. fpmToY clamps via the inner/outer
       compression, so band edges line up with needle position. -->
  {#if tcasRedBand}
    {@const yA = fpmToY(tcasRedBand.lo)}
    {@const yB = fpmToY(tcasRedBand.hi)}
    <rect x="-14" y={Math.min(yA, yB)} width="4" height={Math.abs(yA - yB)} fill="#dc2626" />
  {/if}
  {#if tcasGreenBand}
    {@const yA = fpmToY(tcasGreenBand.lo)}
    {@const yB = fpmToY(tcasGreenBand.hi)}
    <rect x="-14" y={Math.min(yA, yB)} width="4" height={Math.abs(yA - yB)} fill="#16a34a" />
  {/if}

  <!-- Center reference (level flight) -->
  <line x1="-12" y1="0" x2="12" y2="0" stroke="var(--pfd-fg, #ffffff)" stroke-width="0.8" opacity="0.5" />

  <!-- Tick marks + labels (hundreds-of-fpm shown as integers) -->
  {#each ticks as t}
    {@const y = fpmToY(t)}
    <line x1="-10" y1={y} x2="-4" y2={y} stroke="var(--pfd-fg, #ffffff)" stroke-width="1" />
    <text
      x="-12"
      y={y + 3}
      text-anchor="end"
      font-size="7"
      fill="var(--pfd-fg, #ffffff)"
    >{Math.abs(t) / 1000}{Math.abs(t) >= 1000 ? '' : '.5'}</text>
  {/each}

  <!-- Selected VS reference caret (magenta) -->
  {#if selectedFpm !== null}
    {@const sy = fpmToY(selectedFpm)}
    <polygon
      points="-12,{sy - 4} -4,{sy} -12,{sy + 4}"
      fill="none"
      stroke="var(--pfd-magenta, #d946ef)"
      stroke-width="1.5"
    />
  {/if}

  <!-- Needle from pivot at right edge to current value -->
  <line
    x1="14"
    y1="0"
    x2="-2"
    y2={needleY}
    stroke="var(--pfd-magenta, #d946ef)"
    stroke-width="2.2"
    stroke-linecap="round"
  />

  <!-- Numeric readout when |fpm| > 200 -->
  {#if Math.abs(fpm) > 200}
    <text
      x="0"
      y={needleY < 0 ? needleY - 6 : needleY + 12}
      text-anchor="middle"
      font-size="9"
      font-weight="700"
      fill="var(--pfd-fg, #ffffff)"
    >{readout > 0 ? '+' : ''}{readout}</text>
  {/if}
</svg>

<style>
  .vsi {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
