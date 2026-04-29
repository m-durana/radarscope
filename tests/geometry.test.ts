import { describe, it, expect } from 'vitest';
import {
  bearingFromTo,
  distanceBetween,
  findConflicts,
  headingToVector,
  interceptAngle,
  projectAircraft,
  windToVector,
} from '../src/core/geometry.js';
import type { Aircraft, Scenario } from '../src/core/types.js';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('headingToVector', () => {
  it('north (0°) points up (y negative)', () => {
    const v = headingToVector(0, 10);
    expect(close(v.x, 0)).toBe(true);
    expect(close(v.y, -10)).toBe(true);
  });
  it('east (90°) points right', () => {
    const v = headingToVector(90, 10);
    expect(close(v.x, 10)).toBe(true);
    expect(close(v.y, 0)).toBe(true);
  });
  it('south (180°) points down', () => {
    const v = headingToVector(180, 10);
    expect(close(v.x, 0)).toBe(true);
    expect(close(v.y, 10)).toBe(true);
  });
  it('west (270°) points left', () => {
    const v = headingToVector(270, 10);
    expect(close(v.x, -10)).toBe(true);
    expect(close(v.y, 0)).toBe(true);
  });
});

describe('projectAircraft', () => {
  it('60 seconds at 360 kt = 6 nm', () => {
    const a: Aircraft = {
      id: 'a', callsign: 'TEST1', pos: { x: 0, y: 0 }, heading: 0, altitude: 10000, speed: 360,
    };
    const p = projectAircraft(a, 60);
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, -6)).toBe(true);
  });
  it('east at 180 kt for 120s = 6 nm east', () => {
    const a: Aircraft = {
      id: 'a', callsign: 'T', pos: { x: 0, y: 0 }, heading: 90, altitude: 0, speed: 180,
    };
    const p = projectAircraft(a, 120);
    expect(close(p.x, 6)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });
});

describe('bearingFromTo', () => {
  it('north', () => {
    expect(close(bearingFromTo({ x: 0, y: 0 }, { x: 0, y: -5 }), 0)).toBe(true);
  });
  it('east', () => {
    expect(close(bearingFromTo({ x: 0, y: 0 }, { x: 5, y: 0 }), 90)).toBe(true);
  });
  it('south', () => {
    expect(close(bearingFromTo({ x: 0, y: 0 }, { x: 0, y: 5 }), 180)).toBe(true);
  });
  it('west', () => {
    expect(close(bearingFromTo({ x: 0, y: 0 }, { x: -5, y: 0 }), 270)).toBe(true);
  });
});

describe('distanceBetween', () => {
  it('Pythagoras', () => {
    expect(close(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)).toBe(true);
  });
});

describe('interceptAngle', () => {
  it('right turn 30°', () => {
    expect(interceptAngle(90, 120)).toBe(30);
  });
  it('left turn 30°', () => {
    expect(interceptAngle(120, 90)).toBe(-30);
  });
  it('wraps at 350 → 010', () => {
    expect(interceptAngle(350, 10)).toBe(20);
  });
  it('wraps at 010 → 350', () => {
    expect(interceptAngle(10, 350)).toBe(-20);
  });
  it('opposite', () => {
    expect(interceptAngle(0, 180)).toBe(180);
  });
});

describe('findConflicts', () => {
  it('finds head-on conflict', () => {
    const scenario: Scenario = {
      aircraft: [
        { id: 'a', callsign: 'A', pos: { x: 0, y: -10 }, heading: 180, altitude: 10000, speed: 360 },
        { id: 'b', callsign: 'B', pos: { x: 0, y: 10 }, heading: 0, altitude: 10000, speed: 360 },
      ],
    };
    const conflicts = findConflicts(scenario, 180, 5);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].minSeparation).toBeLessThan(5);
  });

  it('ignores conflicts more than 1000 ft apart vertically', () => {
    const scenario: Scenario = {
      aircraft: [
        { id: 'a', callsign: 'A', pos: { x: 0, y: -10 }, heading: 180, altitude: 10000, speed: 360 },
        { id: 'b', callsign: 'B', pos: { x: 0, y: 10 }, heading: 0, altitude: 30000, speed: 360 },
      ],
    };
    expect(findConflicts(scenario, 180, 5)).toEqual([]);
  });

  it('finds no conflict when aircraft are well separated and diverging', () => {
    const scenario: Scenario = {
      aircraft: [
        { id: 'a', callsign: 'A', pos: { x: 10, y: 0 }, heading: 90, altitude: 10000, speed: 300 },
        { id: 'b', callsign: 'B', pos: { x: -10, y: 0 }, heading: 270, altitude: 10000, speed: 300 },
      ],
    };
    expect(findConflicts(scenario, 180, 5)).toEqual([]);
  });
});

describe('windToVector', () => {
  it('wind from 270 (west) blows toward east', () => {
    const v = windToVector(270, 10);
    expect(close(v.x, 10, 1e-6)).toBe(true);
    expect(close(v.y, 0, 1e-6)).toBe(true);
  });
  it('wind from 0 (north) blows toward south', () => {
    const v = windToVector(0, 10);
    expect(close(v.x, 0)).toBe(true);
    expect(close(v.y, 10)).toBe(true);
  });
});
