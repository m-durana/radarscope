<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Scenario } from '../core/types.js';

  interface Props {
    scenario: Scenario;
    /** Pixel size of the rendered scope (square). Default 520. */
    size?: number;
    /** Range rings (nm). Default [10, 20, 30]. */
    rangeRings?: number[];
    /** Optional class name forwarded to the root <svg>. */
    class?: string;
    /** Children render inside the scope's coordinate system (nm-units). */
    children?: Snippet;
  }

  let { scenario, size = 520, rangeRings = [10, 20, 30], class: className = '', children }: Props = $props();

  const range = $derived(scenario.rangeNm ?? 30);
  const visibleRings = $derived(rangeRings.filter((r) => r > 0 && r <= range));
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox={`${-range} ${-range} ${range * 2} ${range * 2}`}
  width={size}
  height={size}
  class={`radarscope ${className}`}
  font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
>
  <rect
    x={-range}
    y={-range}
    width={range * 2}
    height={range * 2}
    fill="var(--scope-bg, #0c1116)"
  />
  <line x1={-range} y1={0} x2={range} y2={0} stroke="var(--scope-stroke, #3a4750)" stroke-width="0.04" />
  <line x1={0} y1={-range} x2={0} y2={range} stroke="var(--scope-stroke, #3a4750)" stroke-width="0.04" />
  {#each visibleRings as r}
    <circle
      cx="0"
      cy="0"
      r={r}
      fill="none"
      stroke="var(--scope-stroke, #3a4750)"
      stroke-width="0.08"
      stroke-dasharray="0.4 0.4"
    />
  {/each}
  <circle cx="0" cy="0" r="0.3" fill="var(--scope-stroke, #3a4750)" />

  {@render children?.()}
</svg>

<style>
  .radarscope {
    display: block;
    max-width: 100%;
    height: auto;
    user-select: none;
  }
</style>
