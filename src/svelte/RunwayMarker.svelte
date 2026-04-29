<script lang="ts">
  import type { Runway } from '../core/types.js';
  import { headingToVector } from '../core/geometry.js';

  interface Props {
    runway: Runway;
    /** Show the dashed extended-centerline / final approach course. Default true. */
    showFinal?: boolean;
    /** Length of the extended centerline in nm. Default 12. */
    finalNm?: number;
  }

  let { runway, showFinal = true, finalNm = 12 }: Props = $props();

  const len = $derived(runway.lengthNm ?? 0.6);
  const fwd = $derived(headingToVector(runway.heading, len));
  const finalCourse = $derived(headingToVector((runway.heading + 180) % 360, finalNm));
</script>

<g class="runway">
  {#if showFinal}
    <line
      x1={runway.threshold.x}
      y1={runway.threshold.y}
      x2={runway.threshold.x + finalCourse.x}
      y2={runway.threshold.y + finalCourse.y}
      stroke="var(--scope-final, #6b7480)"
      stroke-width="0.08"
      stroke-dasharray="0.5 0.5"
    />
  {/if}
  <line
    x1={runway.threshold.x}
    y1={runway.threshold.y}
    x2={runway.threshold.x + fwd.x}
    y2={runway.threshold.y + fwd.y}
    stroke="var(--scope-runway, #cdd9e2)"
    stroke-width="0.4"
    stroke-linecap="square"
  />
</g>
