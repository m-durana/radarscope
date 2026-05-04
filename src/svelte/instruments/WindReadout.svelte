<script lang="ts">
  // Tiny wind-vector readout. Standard PFD/ND corner content:
  // "<from°>/<kt>" plus a small arrow pointing in the wind direction.
  // Real PFDs put this top-left of the ND, but Airbus PFDs show it on
  // the PFD itself.

  interface Props {
    /** Wind FROM direction in degrees true (0..360). Pass null to hide. */
    from?: number | null;
    /** Wind speed in knots. */
    kt?: number | null;
    width?: number;
    height?: number;
  }

  let { from = null, kt = null, width = 80, height = 28 }: Props = $props();

  const visible = $derived(from !== null && kt !== null);
  // SVG arrow needs to point in the wind's TO direction. Wind FROM 270
  // means it's blowing eastward (TO 90). Convert to SVG rotation: 0° in
  // our convention = north (up). SVG rotate uses degrees clockwise from
  // +x. North-up needs offset of -90.
  const toDir = $derived(((from ?? 0) + 180) % 360);
  const rotateDeg = $derived(toDir - 90);
</script>

<svg
  class="wind"
  {width}
  {height}
  viewBox="-40 -14 80 28"
  xmlns="http://www.w3.org/2000/svg"
  aria-label={visible ? `Wind ${Math.round(from ?? 0)} at ${Math.round(kt ?? 0)} knots` : 'Wind unavailable'}
>
  <rect x="-40" y="-14" width="80" height="28" fill="var(--pfd-bg, #0a0c10)" />
  {#if visible}
    <!-- Arrow showing wind TO direction (where it's blowing). -->
    <g transform="translate(-28 0) rotate({rotateDeg})">
      <line x1="-7" y1="0" x2="7" y2="0" stroke="var(--pfd-fg, #ffffff)" stroke-width="1.4" />
      <polygon points="7,0 3,-3 3,3" fill="var(--pfd-fg, #ffffff)" />
    </g>
    <text
      x="-12"
      y="4"
      font-size="10"
      fill="var(--pfd-fg, #ffffff)"
    >{Math.round(from ?? 0).toString().padStart(3, '0')}°/{Math.round(kt ?? 0)}</text>
  {:else}
    <text x="0" y="4" text-anchor="middle" font-size="8" fill="var(--pfd-fg, #ffffff)" opacity="0.4">--/--</text>
  {/if}
</svg>

<style>
  .wind {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
