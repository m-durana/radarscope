<script lang="ts">
  import { getContext } from 'svelte';
  import type { Aircraft } from '../core/types.js';
  import { headingToVector } from '../core/geometry.js';

  interface Props {
    aircraft: Aircraft;
    selected?: boolean;
    conflict?: boolean;
    /** Predicted-track ("speed") vector length in minutes of flight. Real ATC
     *  systems (STARS, ERAM, Eurocat) draw a line projecting forward to where
     *  the aircraft will be at current speed in N minutes — controller-
     *  selectable, typically off / 1 / 2 / 3 min. Set to 0 to hide.
     *  If omitted, falls back to the parent scope's `radarscope:vectorMin`
     *  context, otherwise defaults to 1. */
    vectorMin?: number;
    /** Legacy: explicit vector length in nm. Overrides vectorMin if set. */
    vectorNm?: number;
    /** Click handler (proxied to the blip's hit area). */
    onclick?: (a: Aircraft) => void;
  }

  let { aircraft, selected = false, conflict = false, vectorMin, vectorNm, onclick }: Props = $props();

  const vectorMinCtx = getContext<{ value: number }>('radarscope:vectorMin') ?? null;
  const effMin = $derived(vectorMin ?? vectorMinCtx?.value ?? 1);
  // Speed in knots × minutes / 60 = nm projected. Falls back to vectorNm if set.
  const vecLenNm = $derived(
    vectorNm !== undefined ? vectorNm : Math.max(0, (aircraft.speed * effMin) / 60),
  );

  // Read the parent scope's zoom so cosmetic sizes stay pixel-constant.
  // Real ATC scopes don't scale blips/labels with range; only positions and
  // the heading vector (a real distance) scale with the viewBox.
  const zoomCtx = getContext<{ value: number }>('radarscope:zoom') ?? { value: 1 };
  const z = $derived(zoomCtx.value);

  const stroke = $derived(
    conflict
      ? 'var(--scope-conflict, #ef4444)'
      : selected
        ? 'var(--scope-selected, #facc15)'
        : 'var(--scope-blip, #a3cef1)',
  );

  const vec = $derived(headingToVector(aircraft.heading, vecLenNm));

  const triangle = $derived.by(() => {
    const triR = 0.6 / z;
    const back = headingToVector(aircraft.heading, -triR);
    const left = headingToVector((aircraft.heading + 130) % 360, triR);
    const right = headingToVector((aircraft.heading + 230) % 360, triR);
    const tip = headingToVector(aircraft.heading, 1 / z);
    return [
      { x: aircraft.pos.x + back.x + left.x, y: aircraft.pos.y + back.y + left.y },
      { x: aircraft.pos.x + tip.x, y: aircraft.pos.y + tip.y },
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
  {#if vecLenNm > 0}
    <line
      x1={aircraft.pos.x}
      y1={aircraft.pos.y}
      x2={aircraft.pos.x + vec.x}
      y2={aircraft.pos.y + vec.y}
      {stroke}
      stroke-width={0.09 / z}
      stroke-linecap="round"
      opacity="0.7"
    />
  {/if}
  <polygon points={triangle} fill={stroke} {stroke} stroke-width={0.08 / z} />
  <text
    x={aircraft.pos.x + 1 / z}
    y={aircraft.pos.y - 1 / z}
    font-size={1.1 / z}
    fill="var(--scope-tag, #cdd9e2)"
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width={0.18 / z}
  >{aircraft.callsign}</text>
  <text
    x={aircraft.pos.x + 1 / z}
    y={aircraft.pos.y + 0.2 / z}
    font-size={0.95 / z}
    fill="var(--scope-tag-dim, #97a4ab)"
    paint-order="stroke"
    stroke="var(--scope-bg, #0c1116)"
    stroke-width={0.16 / z}
  >{flAlt} {speedTxt}</text>

  {#if onclick}
    <!-- Invisible large hit area for easy tapping. Stays constant pixel size. -->
    <circle
      cx={aircraft.pos.x}
      cy={aircraft.pos.y}
      r={2 / z}
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
