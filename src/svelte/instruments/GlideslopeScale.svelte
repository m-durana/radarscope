<script lang="ts">
  import { clampDots } from '../../core/instruments.js';

  interface Props {
    /** Glideslope deviation in dots. Positive = aircraft above slope
     *  → diamond appears BELOW center (the slope is below you). */
    deviation: number;
    /** Signal validity. When false, the diamond hides and a red "G/S"
     *  failure flag is shown. */
    valid?: boolean;
    width?: number;
    height?: number;
  }

  let { deviation, valid = true, width = 24, height = 200 }: Props = $props();

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

  {#if valid}
    <polygon
      points="-9,{dy} 0,{dy + 7} 9,{dy} 0,{dy - 7}"
      fill={pegged ? 'var(--pfd-amber, #ffb000)' : 'var(--pfd-magenta, #d946ef)'}
      stroke="var(--pfd-fg, #ffffff)"
      stroke-width="0.8"
    />
  {:else}
    <!-- Red failure flag where the diamond would be. -->
    <rect x="-9" y="-12" width="18" height="24" fill="#dc2626" stroke="var(--pfd-fg, #ffffff)" stroke-width="0.6" />
    <text x="0" y="-2" text-anchor="middle" font-size="7" font-weight="700" fill="#ffffff">G</text>
    <text x="0" y="6" text-anchor="middle" font-size="7" font-weight="700" fill="#ffffff">S</text>
  {/if}

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
