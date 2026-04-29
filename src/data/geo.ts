import type { Position } from '../core/types.js';
import type { GeoPoint } from './types.js';

const NM_PER_DEG_LAT = 60;          // 1° latitude ≈ 60 nm (very nearly).
const DEG2RAD = Math.PI / 180;

/**
 * Project a geographic point onto a scope centered at `center`. Returns nm
 * relative to the scope center, in radarscope's y-down convention (+y = south).
 *
 * Uses an equirectangular projection, accurate to better than 0.5% for any
 * scope under ~50 nm radius. For larger scopes or polar regions, the user
 * should swap in proper ENU.
 */
export function geoToScope(center: GeoPoint, point: GeoPoint): Position {
  const dLat = point.lat - center.lat;
  const dLon = point.lon - center.lon;
  const cosLat = Math.cos(center.lat * DEG2RAD);
  // y-down: positive lat (north) maps to negative y.
  return {
    x: dLon * NM_PER_DEG_LAT * cosLat,
    y: -dLat * NM_PER_DEG_LAT,
  };
}

/** Inverse of `geoToScope`. */
export function scopeToGeo(center: GeoPoint, pos: Position): GeoPoint {
  const cosLat = Math.cos(center.lat * DEG2RAD);
  return {
    lat: center.lat - pos.y / NM_PER_DEG_LAT,
    lon: center.lon + pos.x / (NM_PER_DEG_LAT * cosLat),
  };
}

/** Great-circle-ish distance between two geographic points, in nm. */
export function distNmGeo(a: GeoPoint, b: GeoPoint): number {
  // Haversine — accurate everywhere on the globe.
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLon = (b.lon - a.lon) * DEG2RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(h));
  // Earth radius in nm: 3440.065
  return 3440.065 * c;
}

/** Initial bearing (deg true) from `a` to `b` on a great circle. */
export function bearingGeo(a: GeoPoint, b: GeoPoint): number {
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;
  const dLon = (b.lon - a.lon) * DEG2RAD;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}
