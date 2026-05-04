<script lang="ts">
  import type { SpeedBug } from './types.js';

  interface Props {
    /** Indicated airspeed in knots. */
    ias: number;
    /** Reference landing speed (VREF). Drawn as a green line. */
    vref?: number | null;
    /** Optional V-speed bugs (V1, VR, V2, etc.). */
    bugs?: SpeedBug[];
    /** Magenta selected speed bug (MCP/FCU selected). */
    selected?: number | null;
    /** Optional Mach number. When ≥ 0.40 a Mach readout appears below
     *  the IAS box (real PFD convention — Mach is hidden in the
     *  approach regime). */
    mach?: number | null;
    /** Acceleration in knots per second. Drives the speed-trend vector:
     *  a green line from the current IAS to where it will be in 10 s if
     *  acceleration holds. Pass null/undefined to hide. */
    accelKt?: number | null;
    /** Maximum operating speed (VMO/MMO). A red+black "barber pole"
     *  appears above this value on the tape. */
    vmo?: number | null;
    /** Stall speed (Vs / Vs1g). A solid red band appears below this
     *  value. */
    vstall?: number | null;
    /** Minimum maneuvering speed (above Vstall). An amber band fills
     *  the region between vstall and vmin. */
    vmin?: number | null;
    /** Flap-extend limit speed (VFE). A white tick mark appears at this
     *  value. */
    vfe?: number | null;
    /** Ground speed in knots. Shown below the IAS box if provided. */
    gs?: number | null;
    width?: number;
    height?: number;
  }

  let {
    ias,
    vref = null,
    bugs = [],
    selected = null,
    mach = null,
    accelKt = null,
    vmo = null,
    vstall = null,
    vmin = null,
    vfe = null,
    gs = null,
    width = 70,
    height = 290,
  }: Props = $props();

  const showMach = $derived(mach !== null && mach >= 0.4);
  // Trend = where IAS will be in 10 s. Y position on tape is (ias - target) * PX_PER_KT.
  // From center (y=0) to (-accelKt * 10 * PX_PER_KT). Negative accel → trend below center.
  const trendDy = $derived(accelKt !== null ? -accelKt * 10 * 4 : 0);

  // ViewBox is 70 wide, 240 tall. Tape spans full height. 4 px = 1 kt.
  const PX_PER_KT = 4;
  const VISIBLE_RANGE = 30; // ±30 kt around current IAS

  // Major tick every 10 kt, minor every 5 kt.
  const ticks = $derived.by(() => {
    const out: Array<{ kt: number; y: number; major: boolean }> = [];
    const startKt = Math.floor((ias - VISIBLE_RANGE) / 5) * 5;
    const endKt = Math.ceil((ias + VISIBLE_RANGE) / 5) * 5;
    for (let k = startKt; k <= endKt; k += 5) {
      if (k < 0) continue;
      const y = (ias - k) * PX_PER_KT; // 0 = center
      out.push({ kt: k, y, major: k % 10 === 0 });
    }
    return out;
  });

  function bugY(kt: number): number {
    return (ias - kt) * PX_PER_KT;
  }

  // Rolling-digit drum for the IAS box. Tens-and-up digits are static;
  // the ones digit is on a smooth-scrolling drum that picks up the
  // fractional part of `ias`. As IAS climbs, the digit visually slides
  // upward and the next digit comes into view from below.
  const iasFloor = $derived(Math.floor(ias));
  const iasFrac = $derived(ias - iasFloor);
  const iasTens = $derived(Math.floor(iasFloor / 10));
  const iasOnesNow = $derived(iasFloor % 10);
  const iasOnesPrev = $derived((iasOnesNow + 9) % 10);
  const iasOnesNext = $derived((iasOnesNow + 1) % 10);
</script>

<svg
  class="tape"
  {width}
  {height}
  viewBox="-50 -136 70 290"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Airspeed tape, {Math.round(ias)} knots"
>
  <!-- Selected-speed readout strip (above tape) -->
  {#if selected !== null}
    <rect x="-50" y="-136" width="60" height="14" fill="var(--pfd-bg, #0a0c10)" />
    <text
      x="-2"
      y="-125"
      text-anchor="end"
      font-size="11"
      font-weight="700"
      fill="var(--pfd-magenta, #d946ef)"
    >{Math.round(selected)}</text>
  {/if}

  <!-- Background strip. Boeing-style neutral grey via --pfd-tape-bg
       so the colored AI ball stays visually dominant. -->
  <rect x="-50" y="-120" width="60" height="240" fill="var(--pfd-tape-bg, #1c2027)" />

  <!-- Clip the moving tape so labels don't overflow. -->
  <defs>
    <clipPath id="speed-clip">
      <rect x="-50" y="-120" width="60" height="240" />
    </clipPath>
  </defs>

  <g clip-path="url(#speed-clip)">
    <!-- Color bands on the right edge of the tape (x: 0..6).
         Each band stretches from its threshold to the edge of the
         visible range, clipped by the tape clip-path. -->
    {#if vmo !== null}
      {@const yTop = bugY(vmo + 200)}
      {@const yBot = bugY(vmo)}
      <!-- Red+black "barber pole" hatching above VMO -->
      <defs>
        <pattern id="barber" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="#000" />
          <rect width="2" height="4" fill="#dc2626" />
        </pattern>
      </defs>
      <rect x="0" y={yTop} width="6" height={Math.max(0, yBot - yTop)} fill="url(#barber)" />
    {/if}
    {#if vstall !== null}
      {@const yTop = bugY(vstall)}
      {@const yBot = bugY(vstall - 200)}
      <rect x="0" y={yTop} width="6" height={Math.max(0, yBot - yTop)} fill="#dc2626" />
    {/if}
    {#if vmin !== null && vstall !== null && vmin > vstall}
      {@const yTop = bugY(vmin)}
      {@const yBot = bugY(vstall)}
      <rect x="0" y={yTop} width="6" height={Math.max(0, yBot - yTop)} fill="var(--pfd-amber, #ffb000)" />
    {/if}
    {#if vfe !== null}
      <line x1="0" y1={bugY(vfe)} x2="8" y2={bugY(vfe)} stroke="var(--pfd-fg, #ffffff)" stroke-width="1.5" />
    {/if}

    {#each ticks as t}
      <line
        x1={t.major ? -10 : -6}
        y1={t.y}
        x2="0"
        y2={t.y}
        stroke="var(--pfd-fg, #ffffff)"
        stroke-width="1"
      />
      {#if t.major && Math.abs(t.y) < 110}
        <text
          x="-14"
          y={t.y + 3}
          text-anchor="end"
          font-size="9"
          fill="var(--pfd-fg, #ffffff)"
        >{t.kt}</text>
      {/if}
    {/each}

    <!-- VREF reference line (green) with boxed "REF" callout — the
         classic Boeing tag that sits next to the green line. -->
    {#if vref !== null && Math.abs(ias - vref) < VISIBLE_RANGE + 5}
      <line
        x1="-12"
        y1={bugY(vref)}
        x2="0"
        y2={bugY(vref)}
        stroke="var(--pfd-vref, #16a34a)"
        stroke-width="2"
      />
      <rect
        x="-30"
        y={bugY(vref) - 5}
        width="16"
        height="9"
        fill="var(--pfd-tape-bg, #1c2027)"
        stroke="var(--pfd-vref, #16a34a)"
        stroke-width="0.8"
      />
      <text
        x="-22"
        y={bugY(vref) + 2}
        text-anchor="middle"
        font-size="6.5"
        font-weight="700"
        fill="var(--pfd-vref, #16a34a)"
      >REF</text>
    {/if}

    <!-- Custom bugs -->
    {#each bugs as b}
      {#if Math.abs(ias - b.kt) < VISIBLE_RANGE + 5}
        <polygon
          points="0,{bugY(b.kt) - 4} 10,{bugY(b.kt)} 0,{bugY(b.kt) + 4}"
          fill={b.color ?? 'var(--pfd-fg, #ffffff)'}
        />
        {#if b.label}
          <text
            x="-14"
            y={bugY(b.kt) + 3}
            text-anchor="end"
            font-size="7"
            fill={b.color ?? 'var(--pfd-fg, #ffffff)'}
          >{b.label}</text>
        {/if}
      {/if}
    {/each}

    <!-- Speed trend vector (green) -->
    {#if accelKt !== null && Math.abs(accelKt) > 0.05}
      {@const tipY = Math.max(-110, Math.min(110, trendDy))}
      <line
        x1="-2"
        y1="0"
        x2="-2"
        y2={tipY}
        stroke="var(--pfd-vref, #16a34a)"
        stroke-width="1.6"
      />
      <!-- Arrow head -->
      <polygon
        points="-5,{tipY + (tipY < 0 ? 4 : -4)} 1,{tipY + (tipY < 0 ? 4 : -4)} -2,{tipY}"
        fill="var(--pfd-vref, #16a34a)"
      />
    {/if}

    <!-- Selected speed bug (magenta) -->
    {#if selected !== null && Math.abs(ias - selected) < VISIBLE_RANGE + 5}
      <polygon
        points="0,{bugY(selected) - 5} 8,{bugY(selected) - 5} 8,{bugY(selected) + 5} 0,{bugY(selected) + 5}"
        fill="none"
        stroke="var(--pfd-magenta, #d946ef)"
        stroke-width="2"
      />
    {/if}
  </g>

  <!-- Current-value readout box. Tens-and-up digits are static; the
       ones digit lives in a small drum window that scrolls smoothly
       with sub-knot changes — the characteristic glass-cockpit look. -->
  <rect x="-32" y="-11" width="42" height="22" fill="var(--pfd-bg, #0a0c10)" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />
  <!-- Static tens-and-up portion. Right-anchored so the hundreds digit
       is to the left of the drum, and the drum sits at x=6 (right edge). -->
  <text
    x="-3"
    y="5"
    text-anchor="end"
    font-size="13"
    font-weight="700"
    fill="var(--pfd-fg, #ffffff)"
  >{iasTens}</text>
  <!-- Drum window for the ones digit. Clip so neighbours peek but don't
       leak. The inner group translates upward as `iasFrac` increases —
       the current digit slides off the top, the next digit arrives from
       below. -->
  <defs>
    <clipPath id="ias-ones-clip">
      <rect x="-3" y="-9" width="11" height="18" />
    </clipPath>
  </defs>
  <g clip-path="url(#ias-ones-clip)">
    <g transform="translate(0 {-iasFrac * 14})">
      <text x="6" y="-9" text-anchor="end" font-size="13" font-weight="700" fill="var(--pfd-fg, #ffffff)">{iasOnesPrev}</text>
      <text x="6" y="5"  text-anchor="end" font-size="13" font-weight="700" fill="var(--pfd-fg, #ffffff)">{iasOnesNow}</text>
      <text x="6" y="19" text-anchor="end" font-size="13" font-weight="700" fill="var(--pfd-fg, #ffffff)">{iasOnesNext}</text>
    </g>
  </g>

  {#if showMach}
    <text
      x="6"
      y="132"
      text-anchor="end"
      font-size="10"
      fill="var(--pfd-fg, #ffffff)"
    >.{Math.round((mach ?? 0) * 1000)}</text>
  {/if}

  {#if gs !== null}
    {@const gsY = showMach ? 148 : 132}
    <text x="-40" y={gsY} font-size="8" fill="var(--pfd-fg, #ffffff)">GS</text>
    <text
      x="6"
      y={gsY}
      text-anchor="end"
      font-size="10"
      font-weight="700"
      fill="var(--pfd-fg, #ffffff)"
    >{Math.round(gs)}</text>
  {/if}
</svg>

<style>
  .tape {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
