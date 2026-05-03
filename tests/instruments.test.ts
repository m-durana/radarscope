import { describe, it, expect } from 'vitest';
import {
  clampDots,
  dotsToOffset,
  inHgToHpa,
  hpaToInHg,
  vsiNeedleDeg,
  RA_VISIBLE_BELOW_FT,
} from '../src/core/instruments.js';

describe('instruments math', () => {
  it('clamps deviation to ±2 dots', () => {
    expect(clampDots(0)).toBe(0);
    expect(clampDots(1.5)).toBe(1.5);
    expect(clampDots(2.0)).toBe(2);
    expect(clampDots(2.7)).toBe(2);
    expect(clampDots(-3.0)).toBe(-2);
  });

  it('maps dots to a pixel offset across a scale', () => {
    expect(dotsToOffset(0, 200)).toBe(0);
    expect(dotsToOffset(2, 200)).toBe(100);   // full-scale = half the scale
    expect(dotsToOffset(-2, 200)).toBe(-100);
    expect(dotsToOffset(5, 200)).toBe(100);   // pegged at full-scale
  });

  it('converts baro inHg ↔ hPa', () => {
    expect(inHgToHpa(29.92)).toBeCloseTo(1013.2, 1);
    expect(hpaToInHg(1013.2)).toBeCloseTo(29.92, 2);
  });

  it('vsi needle: zero at level, climbs negative (toward top)', () => {
    expect(vsiNeedleDeg(0)).toBe(0);
    expect(vsiNeedleDeg(1000)).toBeGreaterThan(0); // climb sign convention
    expect(vsiNeedleDeg(-1000)).toBeLessThan(0);
    // Outer compression: doubling fpm past 1000 doesn't double the angle.
    expect(Math.abs(vsiNeedleDeg(2000))).toBeLessThan(2 * Math.abs(vsiNeedleDeg(1000)));
  });

  it('RA visibility threshold matches doc', () => {
    expect(RA_VISIBLE_BELOW_FT).toBe(2500);
  });
});
