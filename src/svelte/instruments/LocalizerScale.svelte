<script lang="ts">
  import { clampDots } from '../../core/instruments.js';

  interface Props {
    /** Localizer deviation in dots. Positive = aircraft right of course
     *  → diamond appears LEFT of center (showing where the course is). */
    deviation: number;
    width?: number;
    height?: number;
  }

  let { deviation, width = 200, height = 24 }: Props = $props();

  // ViewBox 200 wide. Scale spans 160 px → 40 px per dot at ±2 full-scale.
  const PX_PER_DOT = 40;
  // CDI convention: diamond shows where the course is, opposite the
  // deviation sign. So dx = -deviation * PX_PER_DOT.
  const dx = $derived(-clampDots(deviation) * PX_PER_DOT);
  const pegged = $derived(Math.abs(deviation) > 2);
</script>

<svg
  class="loc"
  {width}
  {height}
  viewBox="-100 -12 200 24"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Localizer deviation, {deviation.toFixed(1)} dots"
>
  <rect x="-100" y="-12" width="200" height="24" fill="var(--pfd-bg, #0a0c10)" />

  <!-- Scale line -->
  <line x1="-80" y1="0" x2="80" y2="0" stroke="var(--pfd-fg, #ffffff)" stroke-width="0.8" opacity="0.6" />

  <!-- Dots: -2, -1, +1, +2 (center is the LOC needle, drawn separately). -->
  {#each [-2, -1, 1, 2] as d}
    <circle cx={d * PX_PER_DOT} cy="0" r="2.5" fill="none" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />
  {/each}

  <!-- Center reference (vertical tick) -->
  <line x1="0" y1="-9" x2="0" y2="9" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />

  <!-- Diamond -->
  <polygon
    points="{dx},-9 {dx + 7},0 {dx},9 {dx - 7},0"
    fill={pegged ? 'var(--pfd-amber, #ffb000)' : 'var(--pfd-magenta, #d946ef)'}
    stroke="var(--pfd-fg, #ffffff)"
    stroke-width="0.8"
  />

  <!-- LOC label, in the top-left corner so it doesn't overlap dots. -->
  <text
    x="-98"
    y="-3"
    font-size="6"
    fill="var(--pfd-fg, #ffffff)"
    opacity="0.7"
  >LOC</text>
</svg>

<style>
  .loc {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
