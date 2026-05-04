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
    height = 290,
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

  // Format thousands with a space separator — Boeing convention on the
  // selected-altitude readout ("3 000" not "3000").
  function fmtAlt(ft: number): string {
    const r = Math.round(ft);
    const s = Math.abs(r).toString();
    if (s.length <= 3) return r.toString();
    const head = s.slice(0, s.length - 3);
    const tail = s.slice(-3);
    return (r < 0 ? '-' : '') + head + ' ' + tail;
  }

  // Rolling-digit drum for the current altitude. The tens digit is on a
  // smooth-scrolling drum (the "20" in "1 520" rolls past as you climb);
  // hundreds-and-up are static. We round the displayed alt down to the
  // nearest 20 ft so the drum advances in real-PFD-style 20 ft steps.
  const altFloor = $derived(Math.floor(alt / 20) * 20);
  const altFrac = $derived((alt - altFloor) / 20); // 0..1 within the next 20 ft
  // Hundreds-and-up portion, displayed with thousands-space separator.
  const altHundredsAndUp = $derived(Math.floor(altFloor / 100));
  const altHundredsText = $derived.by(() => {
    const s = altHundredsAndUp.toString();
    // Group thousands: "15" stays "15", "152" → "1 52", "1234" → "12 34"
    if (s.length <= 1) return s;
    if (s.length <= 2) return s; // up to 9 900 ft, no separator yet
    const head = s.slice(0, s.length - 2);
    const tail = s.slice(-2);
    return head + ' ' + tail;
  });
  // Tens-digit pair shown in the drum: "00", "20", "40", "60", "80" cycling.
  const altTensNow = $derived(((altFloor / 20) % 5) * 20);
  const altTensNext = $derived(((altTensNow + 20) % 100));
  const altTensPrev = $derived(((altTensNow + 80) % 100));
  const fmtTens = (n: number) => n.toString().padStart(2, '0');
</script>

<svg
  class="tape"
  {width}
  {height}
  viewBox="0 -136 80 290"
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
    >{fmtAlt(selectedAlt)}</text>
  {/if}

  <rect x="0" y="-122" width="80" height="270" fill="var(--pfd-tape-bg, #1c2027)" />

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
      {#if t.major && Math.abs(t.y) < 110}
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

  <!-- Current-altitude readout box. Hundreds-and-up portion is static
       text on the left; the tens-pair lives in a drum window on the
       right that scrolls smoothly in 20 ft steps. -->
  <rect x="0" y="-10" width="56" height="20" fill="var(--pfd-bg, #0a0c10)" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.2" />
  <!-- Static hundreds-and-up. Right-anchored so the rightmost char sits
       just left of the drum window. -->
  <text
    x="34"
    y="4"
    text-anchor="end"
    font-size="13"
    font-weight="700"
    fill="var(--pfd-fg, #ffffff)"
  >{altHundredsText}</text>
  <!-- Drum window for the tens-pair. -->
  <defs>
    <clipPath id="alt-tens-clip">
      <rect x="35" y="-9" width="20" height="18" />
    </clipPath>
  </defs>
  <g clip-path="url(#alt-tens-clip)">
    <g transform="translate(0 {-altFrac * 14})">
      <text x="53" y="-9" text-anchor="end" font-size="13" font-weight="700" fill="var(--pfd-fg, #ffffff)">{fmtTens(altTensPrev)}</text>
      <text x="53" y="5"  text-anchor="end" font-size="13" font-weight="700" fill="var(--pfd-fg, #ffffff)">{fmtTens(altTensNow)}</text>
      <text x="53" y="19" text-anchor="end" font-size="13" font-weight="700" fill="var(--pfd-fg, #ffffff)">{fmtTens(altTensNext)}</text>
    </g>
  </g>

  <!-- Baro readout below tape -->
  <text
    x="6"
    y="138"
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
