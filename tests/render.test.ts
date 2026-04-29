import { describe, it, expect } from 'vitest';
import { buildScopeScene, renderToString } from '../src/core/index.js';
import type { Scenario } from '../src/core/index.js';

describe('buildScopeScene + renderToString', () => {
  const scenario: Scenario = {
    aircraft: [
      { id: 'a', callsign: 'AAL123', pos: { x: 5, y: -5 }, heading: 90, altitude: 18000, speed: 280 },
    ],
    runway: { threshold: { x: 0, y: 0 }, heading: 270 },
    rangeNm: 30,
  };

  it('produces a valid <svg> root', () => {
    const node = buildScopeScene(scenario);
    expect(node.type).toBe('svg');
    expect(node.attrs.viewBox).toBe('-30 -30 60 60');
  });

  it('renders a self-contained SVG string', () => {
    const out = renderToString(buildScopeScene(scenario));
    expect(out.startsWith('<svg')).toBe(true);
    expect(out).toContain('AAL123');
    expect(out).toContain('FL180');
    expect(out.endsWith('</svg>')).toBe(true);
  });

  it('escapes special characters in tag text', () => {
    const out = renderToString(
      buildScopeScene({
        aircraft: [
          { id: 'a', callsign: 'A&B<C>', pos: { x: 0, y: 0 }, heading: 0, altitude: 10000, speed: 200 },
        ],
        rangeNm: 30,
      }),
    );
    expect(out).toContain('A&amp;B&lt;C&gt;');
    expect(out).not.toContain('A&B<C>');
  });
});
