import type { SvgNode } from './scene.js';

const VOID_TAGS = new Set(['line', 'circle', 'rect', 'polygon', 'polyline', 'path', 'ellipse', 'use']);

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function attrsToString(attrs: Record<string, string | number>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    const value = typeof v === 'number' ? formatNumber(v) : escapeAttr(v);
    parts.push(`${k}="${value}"`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

function formatNumber(n: number): string {
  // Trim noisy decimals; SVG renderers handle short forms fine.
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(4)).toString();
}

/**
 * Render an SvgNode tree to a self-contained SVG markup string. Suitable for
 * SSR, static export, or piping into any consumer that just wants HTML/SVG.
 */
export function renderToString(node: SvgNode): string {
  const open = `<${node.type}${attrsToString(node.attrs)}>`;
  if (VOID_TAGS.has(node.type) && !node.children?.length && !node.text) {
    return `<${node.type}${attrsToString(node.attrs)} />`;
  }
  const inner =
    (node.children ?? []).map(renderToString).join('') +
    (node.text != null ? escapeText(node.text) : '');
  return `${open}${inner}</${node.type}>`;
}
