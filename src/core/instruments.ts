// Pure math for cockpit instruments. No DOM, no Svelte.
// Widgets stay dumb: scenarios convert physical state → these scalar values
// and pass dots/feet/knots straight to the SVG components.

/** Localizer dot ↔ degree conversion. One dot ≈ 0.5° angular deviation
 *  on a CAT-I ILS (full-scale ±2.5°). The doc gives 0.8°/dot as a rule
 *  of thumb; we use 0.5° to match real CAT-I full-scale of ±2.5° at the
 *  outer end. Either way the widgets only render dots — this is the
 *  helper for scenario builders. */
export const LOC_DEG_PER_DOT = 0.5;

/** Glideslope dot ↔ degree conversion. ±0.7° full scale (±2 dots) on
 *  a 3° glideslope, so 0.35°/dot. */
export const GS_DEG_PER_DOT = 0.35;

/** Clamp deviation to the visible scale (±2 dots). The diamond hits the
 *  end-of-scale chevron at exactly ±2; beyond that it pegs. */
export function clampDots(d: number): number {
  if (d > 2) return 2;
  if (d < -2) return -2;
  return d;
}

/** Convert a raw deviation (dots, possibly past full-scale) into a
 *  pixel offset along a scale of given length. Center is 0. */
export function dotsToOffset(dots: number, scaleLengthPx: number): number {
  // 4 dots fit across the scale (-2 .. +2)
  return (clampDots(dots) / 4) * scaleLengthPx;
}

/** Baro inHg → hPa. PFD shows whichever the airline uses. */
export function inHgToHpa(inHg: number): number {
  return inHg * 33.8639;
}

export function hpaToInHg(hpa: number): number {
  return hpa / 33.8639;
}

/** Map a vertical-speed reading (fpm) to a needle angle for a VSI dial.
 *  Linear in the inner range (±1000), compressed past that. Returns
 *  degrees from horizontal (0 = level, +90 = straight up = climb). */
export function vsiNeedleDeg(fpm: number): number {
  const sign = fpm < 0 ? -1 : 1;
  const m = Math.abs(fpm);
  const inner = Math.min(m, 1000) / 1000;       // 0..1 over first 1000
  const outer = Math.max(0, Math.min(m - 1000, 1000)) / 1000; // 0..1 over next 1000
  // Inner range maps to 60° each side, outer to additional 30°.
  return sign * (inner * 60 + outer * 30);
}

/** Hide the radio altimeter when above this AGL value. Real PFDs blank
 *  the readout above ~2500 ft AGL. */
export const RA_VISIBLE_BELOW_FT = 2500;

/** Pitch ladder lines step every 5°, labelled every 10°. */
export const PITCH_LADDER_STEP_DEG = 5;
