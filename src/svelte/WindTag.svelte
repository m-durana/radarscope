<script lang="ts">
  import type { Wind } from '../core/types.js';
  import { headingToVector } from '../core/geometry.js';

  interface Props {
    wind: Wind;
    /** Position the tag at one of the four corners (in nm relative to scope center). */
    position: { x: number; y: number };
    /** Barb length in nm. Default 1.6. */
    lengthNm?: number;
  }

  let { wind, position, lengthNm = 1.6 }: Props = $props();

  const tip = $derived(headingToVector((wind.from + 180) % 360, lengthNm));
  const label = $derived(`${Math.round(wind.from).toString().padStart(3, '0')}/${Math.round(wind.kt)}`);
</script>

<g class="wind">
  <line
    x1={position.x}
    y1={position.y}
    x2={position.x + tip.x}
    y2={position.y + tip.y}
    stroke="var(--scope-tag, #cdd9e2)"
    stroke-width="0.18"
    stroke-linecap="round"
  />
  <circle cx={position.x} cy={position.y} r="0.25" fill="var(--scope-tag, #cdd9e2)" />
  <text
    x={position.x + 2.2}
    y={position.y + 0.5}
    font-size="1.1"
    fill="var(--scope-tag, #cdd9e2)"
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width="0.18"
  >{label}</text>
</g>
