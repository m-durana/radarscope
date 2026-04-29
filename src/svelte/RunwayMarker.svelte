<script lang="ts">
  import { getContext } from 'svelte';
  import type { Runway } from '../core/types.js';
  import { headingToVector } from '../core/geometry.js';

  interface Props {
    runway: Runway;
    /** Render the dashed extended-centerline. Falls back to runway.showFinal. */
    showFinal?: boolean;
    /** Length of the extended centerline in nm. Default 12. */
    finalNm?: number;
  }

  let { runway, showFinal, finalNm = 12 }: Props = $props();

  const zoomCtx = getContext<{ value: number }>('radarscope:zoom') ?? { value: 1 };
  const z = $derived(zoomCtx.value);

  const isActive = $derived(showFinal ?? runway.showFinal ?? false);
  const len = $derived(runway.lengthNm ?? 0.6);
  const fwd = $derived(headingToVector(runway.heading, len));
  const finalCourse = $derived(headingToVector((runway.heading + 180) % 360, finalNm));
  // Real ATC scopes (STARS / openScope) draw all runways with a single uniform
  // thin stroke — visual hierarchy comes from the dashed centerline on the
  // ACTIVE runway, not from making it thicker. Strokes are screen-pixel
  // constant, so we counter-scale by the parent scope's zoom.
  const stroke = 'var(--scope-runway, #97a4ab)';
</script>

<g class={isActive ? 'runway runway-active' : 'runway runway-inactive'}>
  {#if isActive}
    <line
      x1={runway.threshold.x}
      y1={runway.threshold.y}
      x2={runway.threshold.x + finalCourse.x}
      y2={runway.threshold.y + finalCourse.y}
      stroke="var(--scope-final, #a3cef1)"
      stroke-width={0.06 / z}
      stroke-dasharray="{0.4 / z} {0.4 / z}"
      opacity="0.8"
    />
  {/if}
  <line
    x1={runway.threshold.x}
    y1={runway.threshold.y}
    x2={runway.threshold.x + fwd.x}
    y2={runway.threshold.y + fwd.y}
    {stroke}
    stroke-width={0.06 / z}
    stroke-linecap="square"
  />
</g>
