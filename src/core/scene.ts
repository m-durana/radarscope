import type { Aircraft, Runway, Scenario, Waypoint, Wind } from './types.js';
import { headingToVector } from './geometry.js';

export interface SvgNode {
  type: string;
  attrs: Record<string, string | number>;
  children?: SvgNode[];
  text?: string;
}

export interface ScopeOptions {
  /** Pixel size of the rendered scope (square). Default 520. */
  size?: number;
  /** Range rings (nm), measured from center. Default [10, 20, 30]. */
  rangeRings?: number[];
  /** Pre-computed conflict pairs to highlight in red. Provide ids of aircraft. */
  conflictIds?: ReadonlySet<string>;
  /** Subset of aircraft ids to render in the "selected" style. */
  selectedIds?: ReadonlySet<string>;
}

const NS = 'http://www.w3.org/2000/svg';

function el(type: string, attrs: Record<string, string | number>, children?: SvgNode[], text?: string): SvgNode {
  return { type, attrs, children, text };
}

/**
 * Build a complete top-down SVG scene for a scenario. Returns an SvgNode tree
 * the caller can either feed into `renderToString` (for SSR / static use) or
 * walk in their own framework adapter.
 */
export function buildScopeScene(scenario: Scenario, opts: ScopeOptions = {}): SvgNode {
  const range = scenario.rangeNm ?? 30;
  const size = opts.size ?? 520;
  const rings = opts.rangeRings ?? [10, 20, 30];
  const conflictIds = opts.conflictIds ?? new Set<string>();
  const selectedIds = opts.selectedIds ?? new Set<string>();

  const children: SvgNode[] = [];
  children.push(buildScopeFrame(range, rings));
  // Render runways: prefer the new `runways` array; fall back to legacy singular `runway`.
  const runways = scenario.runways ?? (scenario.runway ? [scenario.runway] : []);
  // Inactive first, active (showFinal) last so the active line draws on top.
  const sortedRunways = [...runways].sort((a, b) => Number(!!a.showFinal) - Number(!!b.showFinal));
  for (const rw of sortedRunways) children.push(buildRunway(rw));
  for (const wp of scenario.waypoints ?? []) children.push(buildWaypoint(wp));
  for (const ac of scenario.aircraft) {
    children.push(buildAircraftBlip(ac, {
      selected: selectedIds.has(ac.id),
      conflict: conflictIds.has(ac.id),
    }));
  }
  if (scenario.wind) children.push(buildWindTag(scenario.wind, range));

  return el(
    'svg',
    {
      xmlns: NS,
      viewBox: `${-range} ${-range} ${range * 2} ${range * 2}`,
      width: size,
      height: size,
      class: 'radarscope',
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    },
    children,
  );
}

export function buildScopeFrame(range: number, rings: number[]): SvgNode {
  const ringNodes: SvgNode[] = rings
    .filter((r) => r > 0 && r <= range)
    .map((r) =>
      el('circle', {
        cx: 0,
        cy: 0,
        r,
        fill: 'none',
        stroke: 'var(--scope-stroke, #3a4750)',
        'stroke-width': 0.08,
        'stroke-dasharray': '0.4 0.4',
      }),
    );

  const crosshair: SvgNode[] = [
    el('line', { x1: -range, y1: 0, x2: range, y2: 0, stroke: 'var(--scope-stroke, #3a4750)', 'stroke-width': 0.04 }),
    el('line', { x1: 0, y1: -range, x2: 0, y2: range, stroke: 'var(--scope-stroke, #3a4750)', 'stroke-width': 0.04 }),
  ];

  return el(
    'g',
    { class: 'scope-frame' },
    [
      el('rect', {
        x: -range,
        y: -range,
        width: range * 2,
        height: range * 2,
        fill: 'var(--scope-bg, #0c1116)',
      }),
      ...crosshair,
      ...ringNodes,
      el('circle', { cx: 0, cy: 0, r: 0.3, fill: 'var(--scope-stroke, #3a4750)' }),
    ],
  );
}

export interface BlipOptions {
  selected?: boolean;
  conflict?: boolean;
  /** Heading-vector length in nm. Default 2. */
  vectorNm?: number;
}

export function buildAircraftBlip(ac: Aircraft, opts: BlipOptions = {}): SvgNode {
  const vec = headingToVector(ac.heading, opts.vectorNm ?? 2);
  const tipX = ac.pos.x + vec.x;
  const tipY = ac.pos.y + vec.y;
  const stroke = opts.conflict
    ? 'var(--scope-conflict, #ef4444)'
    : opts.selected
      ? 'var(--scope-selected, #facc15)'
      : 'var(--scope-blip, #a3cef1)';

  // Triangle pointed along heading, sized in nm.
  const triR = 0.6;
  const back = headingToVector(ac.heading, -triR);
  const left = headingToVector((ac.heading + 130) % 360, triR);
  const right = headingToVector((ac.heading + 230) % 360, triR);
  const points = [
    { x: ac.pos.x + back.x + left.x, y: ac.pos.y + back.y + left.y },
    { x: ac.pos.x + vec.x * 0.5, y: ac.pos.y + vec.y * 0.5 },
    { x: ac.pos.x + back.x + right.x, y: ac.pos.y + back.y + right.y },
  ]
    .map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`)
    .join(' ');

  // Tag offset to upper-right of the blip; pinned to nearest "outside" of the scope center.
  const tagX = ac.pos.x + 1.0;
  const tagY = ac.pos.y - 1.0;
  const flAlt = `FL${Math.round(ac.altitude / 100).toString().padStart(3, '0')}`;
  const speedTxt = `${Math.round(ac.speed)}`;

  return el(
    'g',
    {
      class: 'blip',
      'data-id': ac.id,
      'data-conflict': opts.conflict ? 'true' : 'false',
      'data-selected': opts.selected ? 'true' : 'false',
    },
    [
      el('line', {
        x1: ac.pos.x,
        y1: ac.pos.y,
        x2: tipX,
        y2: tipY,
        stroke,
        'stroke-width': 0.12,
        'stroke-linecap': 'round',
        opacity: 0.7,
      }),
      el('polygon', {
        points,
        fill: stroke,
        stroke,
        'stroke-width': 0.08,
      }),
      el(
        'text',
        {
          x: tagX,
          y: tagY,
          'font-size': 1.1,
          fill: 'var(--scope-tag, #cdd9e2)',
          'paint-order': 'stroke',
          stroke: 'var(--scope-bg, #0c1116)',
          'stroke-width': 0.18,
        },
        [],
        ac.callsign,
      ),
      el(
        'text',
        {
          x: tagX,
          y: tagY + 1.2,
          'font-size': 0.95,
          fill: 'var(--scope-tag-dim, #97a4ab)',
          'paint-order': 'stroke',
          stroke: 'var(--scope-bg, #0c1116)',
          'stroke-width': 0.16,
        },
        [],
        `${flAlt} ${speedTxt}`,
      ),
    ],
  );
}

export function buildRunway(rw: Runway): SvgNode {
  const len = rw.lengthNm ?? 0.6;
  const fwd = headingToVector(rw.heading, len);
  const showFinal = rw.showFinal ?? false;

  // Real ATC scopes (STARS, openScope) draw every runway with the same uniform
  // thin grey stroke — hierarchy comes from the dashed centerline on the
  // ACTIVE runway, not from making it thicker. This stops parallel-runway
  // airports (KORD, KATL, KDFW) from rendering as a chunky stack of bars.
  const stroke = 'var(--scope-runway, #97a4ab)';
  const strokeWidth = 0.06;

  const children: SvgNode[] = [];
  if (showFinal) {
    const finalCourseLen = 12;
    const finalCourse = headingToVector((rw.heading + 180) % 360, finalCourseLen);
    children.push(
      el('line', {
        x1: rw.threshold.x,
        y1: rw.threshold.y,
        x2: rw.threshold.x + finalCourse.x,
        y2: rw.threshold.y + finalCourse.y,
        stroke: 'var(--scope-final, #a3cef1)',
        'stroke-width': 0.06,
        'stroke-dasharray': '0.4 0.4',
        opacity: 0.8,
      }),
    );
  }
  children.push(
    el('line', {
      x1: rw.threshold.x,
      y1: rw.threshold.y,
      x2: rw.threshold.x + fwd.x,
      y2: rw.threshold.y + fwd.y,
      stroke,
      'stroke-width': strokeWidth,
      'stroke-linecap': 'square',
    }),
  );

  return el('g', { class: showFinal ? 'runway runway-active' : 'runway runway-inactive' }, children);
}

export function buildWaypoint(wp: Waypoint): SvgNode {
  const r = 0.5;
  return el('g', { class: 'waypoint', 'data-id': wp.id }, [
    el('polygon', {
      points: `${wp.pos.x},${wp.pos.y - r} ${wp.pos.x + r},${wp.pos.y} ${wp.pos.x},${wp.pos.y + r} ${wp.pos.x - r},${wp.pos.y}`,
      fill: 'none',
      stroke: 'var(--scope-waypoint, #6096ba)',
      'stroke-width': 0.1,
    }),
    el(
      'text',
      {
        x: wp.pos.x + 0.7,
        y: wp.pos.y + 0.4,
        'font-size': 1,
        fill: 'var(--scope-waypoint, #6096ba)',
        'paint-order': 'stroke',
        stroke: 'var(--scope-bg, #0c1116)',
        'stroke-width': 0.16,
      },
      [],
      wp.label,
    ),
  ]);
}

export function buildWindTag(wind: Wind, range: number): SvgNode {
  const x = -range + 2.5;
  const y = -range + 2.5;
  const len = 1.6;
  // Wind barb points the way wind is blowing TO (opposite of `from`).
  const tip = headingToVector((wind.from + 180) % 360, len);
  return el('g', { class: 'wind' }, [
    el('line', {
      x1: x,
      y1: y,
      x2: x + tip.x,
      y2: y + tip.y,
      stroke: 'var(--scope-tag, #cdd9e2)',
      'stroke-width': 0.18,
      'stroke-linecap': 'round',
    }),
    el('circle', { cx: x, cy: y, r: 0.25, fill: 'var(--scope-tag, #cdd9e2)' }),
    el(
      'text',
      {
        x: x + 2.2,
        y: y + 0.5,
        'font-size': 1.1,
        fill: 'var(--scope-tag, #cdd9e2)',
        'paint-order': 'stroke',
        stroke: 'var(--scope-bg, #0c1116)',
        'stroke-width': 0.18,
      },
      [],
      `${Math.round(wind.from).toString().padStart(3, '0')}/${Math.round(wind.kt)}`,
    ),
  ]);
}
