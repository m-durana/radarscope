<script lang="ts">
  import type { Waypoint } from '../core/types.js';

  interface Props {
    waypoint: Waypoint;
    /** Click handler. */
    onclick?: (w: Waypoint) => void;
    selected?: boolean;
  }

  let { waypoint, onclick, selected = false }: Props = $props();

  const r = 0.5;
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
    stroke-width="0.1"
  />
  <text
    x={waypoint.pos.x + 0.7}
    y={waypoint.pos.y + 0.4}
    font-size="1"
    fill={stroke}
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width="0.16"
  >{waypoint.label}</text>

  {#if onclick}
    <circle
      cx={waypoint.pos.x}
      cy={waypoint.pos.y}
      r="1.6"
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
