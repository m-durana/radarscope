<script lang="ts">
  import { RA_VISIBLE_BELOW_FT } from '../../core/instruments.js';

  interface Props {
    /** Radio altitude in feet AGL. Pass null/undefined to hide. */
    ra?: number | null;
    /** Decision altitude in feet AGL. When RA falls below this, the
     *  readout turns amber and "MINIMUMS" annunciates. */
    da?: number | null;
    width?: number;
    height?: number;
  }

  let { ra = null, da = null, width = 100, height = 44 }: Props = $props();

  const visible = $derived(ra !== null && ra <= RA_VISIBLE_BELOW_FT);
  const belowDa = $derived(ra !== null && da !== null && ra <= da);
  const color = $derived(belowDa ? 'var(--pfd-amber, #ffb000)' : 'var(--pfd-fg, #ffffff)');
</script>

<svg
  class="ra"
  {width}
  {height}
  viewBox="-50 -22 100 44"
  xmlns="http://www.w3.org/2000/svg"
  aria-label={visible ? `Radio altimeter, ${Math.round(ra ?? 0)} feet AGL` : 'Radio altimeter, off-scale'}
>
  <rect x="-50" y="-22" width="100" height="44" fill="var(--pfd-bg, #0a0c10)" />

  {#if visible}
    <text
      x="0"
      y="2"
      text-anchor="middle"
      font-size="16"
      font-weight="700"
      fill={color}
    >{Math.round(ra ?? 0)}</text>
    <text
      x="0"
      y="13"
      text-anchor="middle"
      font-size="6"
      fill="var(--pfd-fg, #ffffff)"
      opacity="0.7"
    >RA</text>
    {#if belowDa}
      <text
        x="0"
        y="-12"
        text-anchor="middle"
        font-size="7"
        font-weight="700"
        fill="var(--pfd-amber, #ffb000)"
      >MINIMUMS</text>
    {/if}
  {:else}
    <text
      x="0"
      y="4"
      text-anchor="middle"
      font-size="8"
      fill="var(--pfd-fg, #ffffff)"
      opacity="0.4"
    >---</text>
  {/if}
</svg>

<style>
  .ra {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
