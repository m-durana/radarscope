<script lang="ts">
  interface Props {
    /** Indicated altitude in feet. */
    alt: number;
    /** MCP/FCU selected altitude (magenta bug). */
    selectedAlt?: number | null;
    /** Baro setting. Number is interpreted by `baroUnit`. */
    baro: number;
    /** Unit for baro readout. Default 'inHg'. */
    baroUnit?: 'inHg' | 'hPa';
    /** Vertical speed in feet per minute. Drives the altitude-trend
     *  vector — a green line projecting where the altitude will be in
     *  6 s. Pass null/undefined to hide. */
    fpm?: number | null;
    /** Decision altitude or minimum descent altitude in feet. Drawn as
     *  a small cyan tick on the tape with a "BARO MIN" / "RADIO MIN"
     *  label. Pass null/undefined to hide. */
    da?: number | null;
    /** Source label for the DA tick. Default "BARO". */
    daSource?: 'BARO' | 'RADIO';
    width?: number;
    height?: number;
  }

  let {
    alt,
    selectedAlt = null,
    baro,
    baroUnit = 'inHg',
    fpm = null,
    da = null,
    daSource = 'BARO',
    width = 80,
    height = 272,
  }: Props = $props();

  // Altitude alert: amber outline around selected-alt readout when
  // within 1000 ft of the target. Real PFDs additionally flash within
  // 200 ft; we model that with an extra-bright outline.
  const alertWithin1000 = $derived(
    selectedAlt !== null && Math.abs(alt - selectedAlt) <= 1000,
  );
  const alertWithin200 = $derived(
    selectedAlt !== null && Math.abs(alt - selectedAlt) <= 200,
  );

  // 6-second projection: ft = fpm * (6/60) = fpm / 10. Tape y = (alt - target) * PX_PER_FT.
  // From center (0) to (-projFt * PX_PER_FT). Climb (positive fpm) → trend above center (negative y).
  const trendDy = $derived(fpm !== null ? -(fpm / 10) * 0.6 : 0);

  // 200 ft visible above + below center. 1 px per ft → 400 px tall? Use
  // 0.6 px / ft so the tape is denser than the speed tape.
  const PX_PER_FT = 0.6;
  const VISIBLE_RANGE_FT = 200;

  const ticks = $derived.by(() => {
    const out: Array<{ ft: number; y: number; major: boolean }> = [];
    const step = 20; // 20 ft minor, 100 ft major
    const startFt = Math.floor((alt - VISIBLE_RANGE_FT) / step) * step;
    const endFt = Math.ceil((alt + VISIBLE_RANGE_FT) / step) * step;
    for (let f = startFt; f <= endFt; f += step) {
      const y = (alt - f) * PX_PER_FT;
      out.push({ ft: f, y, major: f % 100 === 0 });
    }
    return out;
  });

  function bugY(ft: number): number {
    return (alt - ft) * PX_PER_FT;
  }

  const baroText = $derived(
    baroUnit === 'inHg' ? baro.toFixed(2) : Math.round(baro).toString(),
  );
</script>

<svg
  class="tape"
  {width}
  {height}
  viewBox="0 -136 80 272"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Altitude tape, {Math.round(alt)} feet"
>
  <!-- Selected-altitude readout strip (above tape). Amber outline
       arms within 1000 ft of target, brightens within 200 ft — the
       altitude-alert convention from real glass cockpits. -->
  {#if selectedAlt !== null}
    <rect
      x="0"
      y="-136"
      width="60"
      height="14"
      fill="var(--pfd-bg, #0a0c10)"
      stroke={alertWithin1000 ? 'var(--pfd-amber, #ffb000)' : 'none'}
      stroke-width={alertWithin200 ? 2 : 1}
    />
    <text
      x="42"
      y="-125"
      text-anchor="end"
      font-size="11"
      font-weight="700"
      fill="var(--pfd-magenta, #d946ef)"
    >{Math.round(selectedAlt)}</text>
  {/if}

  <rect x="0" y="-120" width="80" height="240" fill="var(--pfd-bg, #0a0c10)" />

  <defs>
    <clipPath id="alt-clip">
      <rect x="0" y="-120" width="60" height="240" />
    </clipPath>
  </defs>

  <g clip-path="url(#alt-clip)">
    {#each ticks as t}
      <line
        x1="0"
        y1={t.y}
        x2={t.major ? 10 : 6}
        y2={t.y}
        stroke="var(--pfd-fg, #ffffff)"
        stroke-width="1"
      />
      {#if t.major}
        <text
          x="14"
          y={t.y + 3}
          text-anchor="start"
          font-size="9"
          fill="var(--pfd-fg, #ffffff)"
        >{t.ft}</text>
      {/if}
    {/each}

    <!-- Altitude trend vector (green, 6 s projection) -->
    {#if fpm !== null && Math.abs(fpm) > 50}
      {@const tipY = Math.max(-110, Math.min(110, trendDy))}
      <line
        x1="2"
        y1="0"
        x2="2"
        y2={tipY}
        stroke="var(--pfd-vref, #16a34a)"
        stroke-width="1.6"
      />
      <polygon
        points="-1,{tipY + (tipY < 0 ? 4 : -4)} 5,{tipY + (tipY < 0 ? 4 : -4)} 2,{tipY}"
        fill="var(--pfd-vref, #16a34a)"
      />
    {/if}

    <!-- Selected altitude bug (magenta) -->
    {#if selectedAlt !== null && Math.abs(alt - selectedAlt) < VISIBLE_RANGE_FT + 50}
      <polygon
        points="0,{bugY(selectedAlt) - 5} 0,{bugY(selectedAlt) + 5} 10,{bugY(selectedAlt) + 5} 10,{bugY(selectedAlt) - 5}"
        fill="none"
        stroke="var(--pfd-magenta, #d946ef)"
        stroke-width="2"
      />
    {/if}

    <!-- Decision-altitude / minimum-descent tick (cyan) -->
    {#if da !== null && Math.abs(alt - da) < VISIBLE_RANGE_FT + 50}
      <line
        x1="0"
        y1={bugY(da)}
        x2="14"
        y2={bugY(da)}
        stroke="var(--pfd-cyan, #22d3ee)"
        stroke-width="2"
      />
      <text
        x="18"
        y={bugY(da) + 3}
        font-size="6"
        fill="var(--pfd-cyan, #22d3ee)"
      >{daSource} MIN</text>
    {/if}
  </g>

  <!-- Current readout box -->
  <rect x="0" y="-10" width="44" height="20" fill="var(--pfd-bg, #0a0c10)" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />
  <text
    x="40"
    y="4"
    text-anchor="end"
    font-size="13"
    font-weight="700"
    fill="var(--pfd-fg, #ffffff)"
  >{Math.round(alt)}</text>

  <!-- Baro readout below tape -->
  <text
    x="6"
    y="115"
    font-size="9"
    fill="var(--pfd-magenta, #d946ef)"
  >{baroText} {baroUnit === 'inHg' ? 'IN' : 'HPA'}</text>
</svg>

<style>
  .tape {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
