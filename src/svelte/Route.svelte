<script lang="ts">
  import type { Waypoint } from '../core/types.js';

  interface Props {
    waypoints: Waypoint[];
    /** If set, draws a line from this position to the first waypoint (e.g. aircraft current position). */
    from?: { x: number; y: number };
  }

  let { waypoints, from }: Props = $props();

  const points = $derived.by(() => {
    const list = from ? [from, ...waypoints.map((w) => w.pos)] : waypoints.map((w) => w.pos);
    return list.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
  });
</script>

{#if waypoints.length > 0}
  <polyline
    {points}
    fill="none"
    stroke="var(--scope-route, #6096ba)"
    stroke-width="0.1"
    stroke-dasharray="0.6 0.3"
    opacity="0.7"
  />
{/if}
