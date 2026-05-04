<script lang="ts">
  // Autopilot engagement annunciator. Sits between the FMA strip and
  // the AI in the standard Boeing layout — a thin row showing whether
  // the autopilot is fully engaged (CMD), in flight-director-only mode
  // (FD), or off (blank). The optional `subtext` line below is for
  // armed source labels (e.g. "LNAV/VNAV", "GPS", "ILS").
  //
  // This is separate from <FMAStrip>, which shows the active
  // mode-string columns (AT / LAT / VERT / APP). The AP annunciator is
  // a higher-level "is the autopilot driving the aircraft" indicator.

  interface Props {
    /** 'CMD' = autopilot engaged (Boeing); 'FD' = flight director only;
     *  null = neither — annunciator hidden. */
    engaged?: 'CMD' | 'FD' | null;
    /** Optional sub-label below the engagement state. */
    subtext?: string | null;
    width?: number;
    height?: number;
  }

  let { engaged = null, subtext = null, width = 240, height = 22 }: Props = $props();
</script>

<svg
  class="ap"
  {width}
  {height}
  viewBox="-120 -11 240 22"
  xmlns="http://www.w3.org/2000/svg"
  aria-label={engaged ? `Autopilot ${engaged}${subtext ? ', ' + subtext : ''}` : 'Autopilot disengaged'}
>
  <rect x="-120" y="-11" width="240" height="22" fill="var(--pfd-bg, #0a0c10)" />
  {#if engaged}
    <text
      x="0"
      y={subtext ? -1 : 5}
      text-anchor="middle"
      font-size="10"
      font-weight="700"
      fill="var(--pfd-fma, #34c957)"
    >{engaged}</text>
    {#if subtext}
      <text
        x="0"
        y="9"
        text-anchor="middle"
        font-size="8"
        fill="var(--pfd-fg, #ffffff)"
      >{subtext}</text>
    {/if}
  {/if}
</svg>

<style>
  .ap {
    display: block;
    background: var(--pfd-bg, #0a0c10);
  }
</style>
