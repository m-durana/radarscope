<script lang="ts">
  import { getContext } from 'svelte';
  import type { Waypoint } from '../core/types.js';

  interface Props {
    waypoint: Waypoint;
    /** Click handler. */
    onclick?: (w: Waypoint) => void;
    selected?: boolean;
  }

  let { waypoint, onclick, selected = false }: Props = $props();

  const zoomCtx = getContext<{ value: number }>('radarscope:zoom') ?? { value: 1 };
  const z = $derived(zoomCtx.value);

  const r = $derived(0.5 / z);
  const stroke = $derived(selected ? 'var(--scope-selected, #facc15)' : 'var(--scope-waypoint, #6096ba)');

  function handleClick() {
    onclick?.(waypoint);
  }
</script>

<g class="waypoint" data-id={waypoint.id}>
  <polygon
    points={`${waypoint.pos.x},${waypoint.pos.y - r} ${waypoint.pos.x + r},${waypoint.pos.y} ${waypoint.pos.x},${waypoint.pos.y + r} ${waypoint.pos.x - r},${waypoint.pos.y}`}
    fill="none"
    {stroke}
    stroke-width={0.1 / z}
  />
  <text
    x={waypoint.pos.x + 0.7 / z}
    y={waypoint.pos.y + 0.4 / z}
    font-size={1 / z}
    fill={stroke}
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width={0.16 / z}
  >{waypoint.label}</text>

  {#if onclick}
    <circle
      cx={waypoint.pos.x}
      cy={waypoint.pos.y}
      r={1.6 / z}
      fill="transparent"
      style="cursor: pointer;"
      onclick={handleClick}
      role="button"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-label={waypoint.label}
    />
  {/if}
</g>
