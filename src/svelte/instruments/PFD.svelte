<script lang="ts">
  // Composite PFD. Pure layout: arranges the nine widgets in a standard
  // glass-cockpit configuration. Has no rendering logic of its own; if
  // you want to tweak how a single instrument looks, edit that widget,
  // not this file.
  import AttitudeIndicator from './AttitudeIndicator.svelte';
  import SpeedTape from './SpeedTape.svelte';
  import AltitudeTape from './AltitudeTape.svelte';
  import VSI from './VSI.svelte';
  import HeadingTape from './HeadingTape.svelte';
  import LocalizerScale from './LocalizerScale.svelte';
  import GlideslopeScale from './GlideslopeScale.svelte';
  import FMAStrip from './FMAStrip.svelte';
  import APAnnunciator from './APAnnunciator.svelte';
  import RadioAltimeter from './RadioAltimeter.svelte';
  import WindReadout from './WindReadout.svelte';
  import type { FlightDirector, FmaState, SpeedBug } from './types.js';

  interface Props {
    pitch: number;
    roll: number;
    fd?: FlightDirector | null;
    /** Sideslip in g for the slip/skid trapezoid. */
    slip?: number | null;
    ias: number;
    vref?: number | null;
    bugs?: SpeedBug[];
    selectedSpeed?: number | null;
    /** Mach number; appears on the speed tape when ≥ 0.40. */
    mach?: number | null;
    /** Speed acceleration in kt/s; drives the speed-trend vector. */
    accelKt?: number | null;
    /** VMO/MMO; barber-pole band above this on the speed tape. */
    vmo?: number | null;
    /** Stall speed; red band below. */
    vstall?: number | null;
    /** Min maneuvering speed; amber band between vstall and vmin. */
    vmin?: number | null;
    /** Flap-extend limit; white tick. */
    vfe?: number | null;
    /** Ground speed in knots. */
    gs?: number | null;
    alt: number;
    selectedAlt?: number | null;
    baro: number;
    baroUnit?: 'inHg' | 'hPa';
    /** DA / MDA cyan tick on the altitude tape. */
    daBaro?: number | null;
    daSource?: 'BARO' | 'RADIO';
    fpm: number;
    /** Selected vertical-speed reference for V/S autopilot mode. */
    selectedFpm?: number | null;
    hdg: number;
    hdgBug?: number | null;
    track?: number | null;
    /** Selected course / DTK. */
    course?: number | null;
    locDots: number;
    gsDots: number;
    /** When false, the LOC scale shows a red failure flag. */
    locValid?: boolean;
    /** When false, the G/S scale shows a red failure flag. */
    gsValid?: boolean;
    fma: FmaState;
    /** Autopilot engagement state shown between FMA and AI.
     *  'CMD' = autopilot engaged, 'FD' = flight director only, null = off. */
    apEngaged?: 'CMD' | 'FD' | null;
    /** Optional sub-label below AP state (e.g. "LNAV/VNAV"). */
    apSubtext?: string | null;
    ra?: number | null;
    da?: number | null;
    /** TCAS RA red band on the VSI. */
    tcasRedBand?: { lo: number; hi: number } | null;
    /** TCAS RA green band on the VSI. */
    tcasGreenBand?: { lo: number; hi: number } | null;
    /** Wind FROM direction in degrees true. */
    windFrom?: number | null;
    /** Wind speed in knots. */
    windKt?: number | null;
  }

  let {
    pitch,
    roll,
    fd = null,
    slip = null,
    ias,
    vref = null,
    bugs = [],
    selectedSpeed = null,
    mach = null,
    accelKt = null,
    vmo = null,
    vstall = null,
    vmin = null,
    vfe = null,
    gs = null,
    alt,
    selectedAlt = null,
    baro,
    baroUnit = 'inHg',
    daBaro = null,
    daSource = 'BARO',
    fpm,
    selectedFpm = null,
    hdg,
    hdgBug = null,
    track = null,
    course = null,
    locDots,
    gsDots,
    locValid = true,
    gsValid = true,
    fma,
    apEngaged = null,
    apSubtext = null,
    ra = null,
    da = null,
    tcasRedBand = null,
    tcasGreenBand = null,
    windFrom = null,
    windKt = null,
  }: Props = $props();
</script>

<div class="pfd">
  <div class="row fma-row">
    <FMAStrip at={fma.at} lat={fma.lat} vert={fma.vert} app={fma.app} width={400} height={28} />
  </div>

  <div class="row ap-row">
    <APAnnunciator engaged={apEngaged} subtext={apSubtext} width={240} height={22} />
  </div>

  <div class="row main-row">
    <div class="cell speed">
      <SpeedTape
        ias={ias} vref={vref} bugs={bugs} selected={selectedSpeed}
        mach={mach} accelKt={accelKt}
        vmo={vmo} vstall={vstall} vmin={vmin} vfe={vfe} gs={gs}
        width={70} height={290}
      />
    </div>

    <div class="cell ai-stack">
      <AttitudeIndicator pitch={pitch} roll={roll} fd={fd} slip={slip} width={240} height={240} />
      <div class="ra-pos">
        <RadioAltimeter ra={ra} da={da} width={100} height={32} />
      </div>
      <div class="loc-pos">
        <LocalizerScale deviation={locDots} valid={locValid} width={200} height={20} />
      </div>
      <div class="gs-pos">
        <GlideslopeScale deviation={gsDots} valid={gsValid} width={20} height={200} />
      </div>
    </div>

    <div class="cell alt">
      <AltitudeTape
        alt={alt} selectedAlt={selectedAlt} baro={baro} baroUnit={baroUnit}
        fpm={fpm} da={daBaro} daSource={daSource}
        width={80} height={290}
      />
    </div>

    <div class="cell vsi">
      <VSI
        fpm={fpm} selectedFpm={selectedFpm}
        tcasRedBand={tcasRedBand} tcasGreenBand={tcasGreenBand}
        width={36} height={290}
      />
    </div>
  </div>

  <div class="row hdg-row">
    <HeadingTape hdg={hdg} bug={hdgBug} track={track} course={course} width={280} height={44} />
    {#if windFrom !== null && windKt !== null}
      <div class="wind-pos">
        <WindReadout from={windFrom} kt={windKt} width={80} height={28} />
      </div>
    {/if}
  </div>
</div>

<style>
  .pfd {
    /* Pin width to content so a flex parent doesn't stretch the PFD
     * across its container — keeps the rows aligned to a single column. */
    align-self: flex-start;
    width: max-content;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    background: var(--pfd-bg, #0a0c10);
    border: 1px solid var(--pfd-bezel, #2a2f38);
    border-radius: 8px;
  }
  .row { display: flex; align-items: center; }
  .fma-row, .hdg-row, .ap-row { justify-content: center; }
  .hdg-row { gap: 8px; align-items: center; }
  .wind-pos { display: inline-block; }
  .main-row { gap: 4px; align-items: flex-start; }
  .ai-stack {
    position: relative;
    display: inline-block;
  }
  .ra-pos {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .loc-pos {
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }
  /* G/S scale floats just outside the AI ball, right side. Matches the
   * Boeing PFD layout — kept inside the AI cell so it doesn't bias the
   * row width and push the AI off-center. */
  .gs-pos {
    position: absolute;
    top: 20px;
    right: -22px;
    pointer-events: none;
  }
  /* Pad the speed cell so its outer width matches alt(80) + vsi(36) on
   * the right. Without this, the AI sits left of center because the
   * right side is wider. The SpeedTape itself stays right-aligned
   * against the AI. */
  .cell.speed {
    width: 116px;
    display: flex;
    justify-content: flex-end;
  }
</style>
