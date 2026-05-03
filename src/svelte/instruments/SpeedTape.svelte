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
    height = 272,
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
</script>

<svg
  class="tape"
  {width}
  {height}
  viewBox="-50 -136 70 272"
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

  <!-- Background strip -->
  <rect x="-50" y="-120" width="60" height="240" fill="var(--pfd-bg, #0a0c10)" />

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
      {#if t.major}
        <text
          x="-14"
          y={t.y + 3}
          text-anchor="end"
          font-size="9"
          fill="var(--pfd-fg, #ffffff)"
        >{t.kt}</text>
      {/if}
    {/each}

    <!-- VREF reference line (green) -->
    {#if vref !== null && Math.abs(ias - vref) < VISIBLE_RANGE + 5}
      <line
        x1="-12"
        y1={bugY(vref)}
        x2="0"
        y2={bugY(vref)}
        stroke="var(--pfd-vref, #16a34a)"
        stroke-width="2"
      />
      <text
        x="-14"
        y={bugY(vref) - 2}
        text-anchor="end"
        font-size="7"
        fill="var(--pfd-vref, #16a34a)"
      >VREF</text>
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

  <!-- Current-value readout box (always centered). Wider so 4-digit
       speeds and the chevron tip stay inside. -->
  <rect x="-32" y="-11" width="42" height="22" fill="var(--pfd-bg, #0a0c10)" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />
  <text
    x="6"
    y="5"
    text-anchor="end"
    font-size="13"
    font-weight="700"
    fill="var(--pfd-fg, #ffffff)"
  >{Math.round(ias)}</text>

  {#if showMach}
    <text
      x="-2"
      y="128"
      text-anchor="end"
      font-size="10"
      fill="var(--pfd-fg, #ffffff)"
    >.{Math.round((mach ?? 0) * 1000)}</text>
  {/if}

  {#if gs !== null}
    {@const gsY = showMach ? 134 : 128}
    <text x="-32" y={gsY} font-size="8" fill="var(--pfd-fg, #ffffff)">GS</text>
    <text
      x="-2"
      y={gsY}
      text-anchor="end"
      font-size="9"
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
