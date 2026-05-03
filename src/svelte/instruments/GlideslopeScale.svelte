<script lang="ts">
  import { clampDots } from '../../core/instruments.js';

  interface Props {
    /** Glideslope deviation in dots. Positive = aircraft above slope
     *  → diamond appears BELOW center (the slope is below you). */
    deviation: number;
    width?: number;
    height?: number;
  }

  let { deviation, width = 24, height = 200 }: Props = $props();

  const PX_PER_DOT = 40;
  const dy = $derived(clampDots(deviation) * PX_PER_DOT);
  const pegged = $derived(Math.abs(deviation) > 2);
</script>

<svg
  class="gs"
  {width}
  {height}
  viewBox="-12 -100 24 200"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Glideslope deviation, {deviation.toFixed(1)} dots"
>
  <rect x="-12" y="-100" width="24" height="200" fill="var(--pfd-bg, #0a0c10)" />

  <line x1="0" y1="-80" x2="0" y2="80" stroke="var(--pfd-fg, #ffffff)" stroke-width="0.8" opacity="0.6" />

  {#each [-2, -1, 1, 2] as d}
    <circle cx="0" cy={d * PX_PER_DOT} r="2.5" fill="none" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />
  {/each}

  <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />

  <polygon
    points="-9,{dy} 0,{dy + 7} 9,{dy} 0,{dy - 7}"
    fill={pegged ? 'var(--pfd-amber, #ffb000)' : 'var(--pfd-magenta, #d946ef)'}
    stroke="var(--pfd-fg, #ffffff)"
    stroke-width="0.8"
  />

  <!-- G/S label, top-center, smaller so it doesn't dwarf the scale. -->
  <text
    x="0"
    y="-92"
    text-anchor="middle"
    font-size="6"
    fill="var(--pfd-fg, #ffffff)"
    opacity="0.7"
  >G/S</text>
</svg>

<style>
  .gs {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
