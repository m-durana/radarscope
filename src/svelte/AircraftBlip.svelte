<script lang="ts">
  import type { Aircraft } from '../core/types.js';
  import { headingToVector } from '../core/geometry.js';

  interface Props {
    aircraft: Aircraft;
    selected?: boolean;
    conflict?: boolean;
    /** Heading-vector length in nm. Default 2. */
    vectorNm?: number;
    /** Click handler (proxied to the blip's hit area). */
    onclick?: (a: Aircraft) => void;
  }

  let { aircraft, selected = false, conflict = false, vectorNm = 2, onclick }: Props = $props();

  const stroke = $derived(
    conflict
      ? 'var(--scope-conflict, #ef4444)'
      : selected
        ? 'var(--scope-selected, #facc15)'
        : 'var(--scope-blip, #a3cef1)',
  );

  const vec = $derived(headingToVector(aircraft.heading, vectorNm));

  const triangle = $derived.by(() => {
    const triR = 0.6;
    const back = headingToVector(aircraft.heading, -triR);
    const left = headingToVector((aircraft.heading + 130) % 360, triR);
    const right = headingToVector((aircraft.heading + 230) % 360, triR);
    return [
      { x: aircraft.pos.x + back.x + left.x, y: aircraft.pos.y + back.y + left.y },
      { x: aircraft.pos.x + vec.x * 0.5, y: aircraft.pos.y + vec.y * 0.5 },
      { x: aircraft.pos.x + back.x + right.x, y: aircraft.pos.y + back.y + right.y },
    ]
      .map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)
      .join(' ');
  });

  const flAlt = $derived(`FL${Math.round(aircraft.altitude / 100).toString().padStart(3, '0')}`);
  const speedTxt = $derived(`${Math.round(aircraft.speed)}`);

  function handleClick() {
    onclick?.(aircraft);
  }
</script>

<g
  class="blip"
  data-id={aircraft.id}
  data-conflict={conflict ? 'true' : 'false'}
  data-selected={selected ? 'true' : 'false'}
>
  <line
    x1={aircraft.pos.x}
    y1={aircraft.pos.y}
    x2={aircraft.pos.x + vec.x}
    y2={aircraft.pos.y + vec.y}
    {stroke}
    stroke-width="0.12"
    stroke-linecap="round"
    opacity="0.7"
  />
  <polygon points={triangle} fill={stroke} {stroke} stroke-width="0.08" />
  <text
    x={aircraft.pos.x + 1}
    y={aircraft.pos.y - 1}
    font-size="1.1"
    fill="var(--scope-tag, #cdd9e2)"
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width="0.18"
  >{aircraft.callsign}</text>
  <text
    x={aircraft.pos.x + 1}
    y={aircraft.pos.y + 0.2}
    font-size="0.95"
    fill="var(--scope-tag-dim, #97a4ab)"
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width="0.16"
  >{flAlt} {speedTxt}</text>

  {#if onclick}
    <!-- Invisible large hit area for easy tapping. -->
    <circle
      cx={aircraft.pos.x}
      cy={aircraft.pos.y}
      r="2"
      fill="transparent"
      style="cursor: pointer;"
      onclick={handleClick}
      role="button"
      tabindex="0"
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-label={`${aircraft.callsign} ${flAlt}`}
    />
  {/if}
</g>
