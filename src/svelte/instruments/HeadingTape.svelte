<script lang="ts">
  interface Props {
    /** Magnetic heading in degrees, 0..360. */
    hdg: number;
    /** Selected heading bug (magenta), degrees. */
    bug?: number | null;
    /** Track over ground (green diamond), degrees. */
    track?: number | null;
    /** Selected course / DTK (desired track) from FMS or VOR/ILS source.
     *  Drawn as a magenta arrow on the tape and a "CRS xxx" readout in
     *  the corner. Real PFDs put the full course pointer on the HSI/ND;
     *  this is the PFD-side cue. Pass null/undefined to hide. */
    course?: number | null;
    width?: number;
    height?: number;
  }

  let {
    hdg,
    bug = null,
    track = null,
    course = null,
    width = 280,
    height = 44,
  }: Props = $props();

  const PX_PER_DEG = 4;
  const VISIBLE_DEG = 35;

  function norm(d: number): number {
    return ((d % 360) + 360) % 360;
  }

  function delta(target: number): number {
    // Shortest signed delta from current hdg to target, in -180..180.
    const d = norm(target) - norm(hdg);
    if (d > 180) return d - 360;
    if (d < -180) return d + 360;
    return d;
  }

  // Major ticks every 10°, labelled cardinals (N/E/S/W) + every 30°.
  const ticks = $derived.by(() => {
    const out: Array<{ deg: number; x: number; major: boolean; label: string }> = [];
    const center = Math.round(hdg / 10) * 10;
    for (let off = -VISIBLE_DEG; off <= VISIBLE_DEG; off += 5) {
      const deg = norm(center + off);
      const x = (deg - hdg) * PX_PER_DEG;
      // Wrap into ±visible range
      const xWrapped = x > VISIBLE_DEG * PX_PER_DEG ? x - 360 * PX_PER_DEG
        : x < -VISIBLE_DEG * PX_PER_DEG ? x + 360 * PX_PER_DEG : x;
      const major = deg % 10 === 0;
      let label = '';
      if (major) {
        if (deg === 0) label = 'N';
        else if (deg === 90) label = 'E';
        else if (deg === 180) label = 'S';
        else if (deg === 270) label = 'W';
        else if (deg % 30 === 0) label = (deg / 10).toString().padStart(2, '0');
      }
      out.push({ deg, x: xWrapped, major, label });
    }
    return out;
  });
</script>

<svg
  class="hdg"
  {width}
  {height}
  viewBox="-140 -22 280 44"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Heading tape, {Math.round(norm(hdg))} degrees"
>
  <rect x="-140" y="-22" width="280" height="44" fill="var(--pfd-bg, #0a0c10)" />

  <defs>
    <clipPath id="hdg-clip">
      <rect x="-140" y="-22" width="280" height="32" />
    </clipPath>
  </defs>

  <g clip-path="url(#hdg-clip)">
    {#each ticks as t}
      <line
        x1={t.x}
        y1="-10"
        x2={t.x}
        y2={t.major ? -2 : -6}
        stroke="var(--pfd-fg, #ffffff)"
        stroke-width="1"
      />
      {#if t.label}
        <text
          x={t.x}
          y="6"
          text-anchor="middle"
          font-size="9"
          fill="var(--pfd-fg, #ffffff)"
        >{t.label}</text>
      {/if}
    {/each}

    <!-- Heading bug -->
    {#if bug !== null}
      {@const dx = delta(bug) * PX_PER_DEG}
      {#if Math.abs(dx) <= VISIBLE_DEG * PX_PER_DEG}
        <polygon
          points="{dx - 4},-10 {dx + 4},-10 {dx + 4},-6 {dx},-2 {dx - 4},-6"
          fill="var(--pfd-magenta, #d946ef)"
        />
      {/if}
    {/if}

    <!-- Track diamond (green) -->
    {#if track !== null}
      {@const tx = delta(track) * PX_PER_DEG}
      {#if Math.abs(tx) <= VISIBLE_DEG * PX_PER_DEG}
        <polygon
          points="{tx},-12 {tx + 3},-9 {tx},-6 {tx - 3},-9"
          fill="var(--pfd-vref, #16a34a)"
        />
      {/if}
    {/if}

    <!-- Course pointer (magenta arrow) -->
    {#if course !== null}
      {@const cx = delta(course) * PX_PER_DEG}
      {#if Math.abs(cx) <= VISIBLE_DEG * PX_PER_DEG}
        <line x1={cx} y1="-10" x2={cx} y2="-2" stroke="var(--pfd-magenta, #d946ef)" stroke-width="1.5" />
        <polygon
          points="{cx - 4},-2 {cx + 4},-2 {cx},2"
          fill="var(--pfd-magenta, #d946ef)"
        />
      {/if}
    {/if}
  </g>

  <!-- CRS readout in the bottom-left corner -->
  {#if course !== null}
    <text
      x="-138"
      y="20"
      font-size="8"
      fill="var(--pfd-magenta, #d946ef)"
    >CRS {Math.round(norm(course)).toString().padStart(3, '0')}</text>
  {/if}

  <!-- Center pointer (lubber line) -->
  <polygon points="0,-12 -4,-18 4,-18" fill="var(--pfd-amber, #ffb000)" />

  <!-- Current heading readout -->
  <rect x="-14" y="11" width="28" height="11" fill="var(--pfd-bg, #0a0c10)" stroke="var(--pfd-amber, #ffb000)" stroke-width="1" />
  <text
    x="0"
    y="20"
    text-anchor="middle"
    font-size="9"
    font-weight="700"
    fill="var(--pfd-amber, #ffb000)"
  >{Math.round(norm(hdg)).toString().padStart(3, '0')}</text>
</svg>

<style>
  .hdg {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
