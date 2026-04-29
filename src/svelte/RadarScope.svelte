<script lang="ts">
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Scenario } from '../core/types.js';
  import RunwayMarker from './RunwayMarker.svelte';

  interface Props {
    scenario: Scenario;
    /** Pixel size of the rendered scope (square). If omitted, the scope fills its container width with a 1:1 aspect ratio. */
    size?: number;
    /** Range rings (nm). Default [10, 20, 30]. */
    rangeRings?: number[];
    /** Optional class name forwarded to the root <svg>. */
    class?: string;
    /** Allow wheel/pinch zoom + drag pan. Default true. */
    zoomable?: boolean;
    /** Min/max zoom multipliers. Defaults: 1× (no zoom-out) to 8×. */
    minZoom?: number;
    maxZoom?: number;
    /** Children render inside the scope's coordinate system (nm-units). */
    children?: Snippet;
  }

  let {
    scenario,
    size = 520,
    rangeRings = [10, 20, 30],
    class: className = '',
    zoomable = true,
    minZoom = 1,
    maxZoom = 8,
    children,
  }: Props = $props();

  const baseRange = $derived(scenario.rangeNm ?? 30);

  // Zoom state — viewBox is recomputed reactively.
  let zoom = $state(1);
  let panX = $state(0); // nm offset (pan center); +x = view shifted east
  let panY = $state(0);

  // Expose zoom to children so cosmetic sizes (blip icons, labels, strokes)
  // can stay screen-pixel constant — real ATC scopes don't scale glyphs with
  // range. Real distances (heading vectors, runway length, centerlines) stay
  // in nm and naturally scale with the viewBox.
  setContext('radarscope:zoom', { get value() { return zoom; } });

  const visibleRange = $derived(baseRange / zoom);
  const visibleRings = $derived(rangeRings.filter((r) => r > 0 && r <= visibleRange * 1.2));
  const viewBox = $derived(
    `${-visibleRange + panX} ${-visibleRange + panY} ${visibleRange * 2} ${visibleRange * 2}`,
  );

  const runways = $derived(
    scenario.runways ?? (scenario.runway ? [scenario.runway] : []),
  );
  // Inactive first, active last so the active strip draws on top.
  const sortedRunways = $derived(
    [...runways].sort((a, b) => Number(!!a.showFinal) - Number(!!b.showFinal)),
  );

  let svgEl: SVGSVGElement | null = $state(null);
  let dragging = $state(false);
  let dragStart: { x: number; y: number; panX: number; panY: number } | null = null;
  // Pinch state
  let pinchPointers: Map<number, { x: number; y: number }> = new Map();
  let pinchStart: { dist: number; zoom: number; cx: number; cy: number } | null = null;

  function clampZoom(z: number): number {
    return Math.min(maxZoom, Math.max(minZoom, z));
  }

  function clampPan(): void {
    const lim = baseRange - visibleRange; // can't pan beyond the natural scope
    if (lim <= 0) { panX = 0; panY = 0; return; }
    panX = Math.min(lim, Math.max(-lim, panX));
    panY = Math.min(lim, Math.max(-lim, panY));
  }

  /** Pixel → scope (nm) coordinates given the current viewBox. */
  function pixelToScope(px: number, py: number): { x: number; y: number } {
    if (!svgEl) return { x: 0, y: 0 };
    const rect = svgEl.getBoundingClientRect();
    const fx = (px - rect.left) / rect.width;
    const fy = (py - rect.top) / rect.height;
    const x = -visibleRange + panX + fx * visibleRange * 2;
    const y = -visibleRange + panY + fy * visibleRange * 2;
    return { x, y };
  }

  function onWheel(e: WheelEvent) {
    if (!zoomable) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = Math.exp(delta * 0.0015);
    const newZoom = clampZoom(zoom * factor);
    if (newZoom === zoom) return;
    // Zoom toward cursor: keep the scope-coord under the cursor stationary.
    const before = pixelToScope(e.clientX, e.clientY);
    zoom = newZoom;
    const after = pixelToScope(e.clientX, e.clientY);
    panX += before.x - after.x;
    panY += before.y - after.y;
    clampPan();
  }

  function onPointerDown(e: PointerEvent) {
    if (!zoomable) return;
    // Don't intercept clicks on interactive children (blips, waypoints).
    const target = e.target as Element;
    if (target.closest('[role="button"], button, a')) return;

    pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchPointers.size === 2 && svgEl) {
      const [p1, p2] = [...pinchPointers.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      pinchStart = { dist, zoom, cx, cy };
      dragging = false;
      svgEl.setPointerCapture(e.pointerId);
    } else if (pinchPointers.size === 1) {
      // Begin pan
      svgEl?.setPointerCapture(e.pointerId);
      dragging = true;
      dragStart = { x: e.clientX, y: e.clientY, panX, panY };
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!zoomable) return;
    if (pinchPointers.has(e.pointerId)) {
      pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinchStart && pinchPointers.size === 2) {
      const [p1, p2] = [...pinchPointers.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const newZoom = clampZoom(pinchStart.zoom * (dist / pinchStart.dist));
      const before = pixelToScope(pinchStart.cx, pinchStart.cy);
      zoom = newZoom;
      const after = pixelToScope(pinchStart.cx, pinchStart.cy);
      panX += before.x - after.x;
      panY += before.y - after.y;
      clampPan();
    } else if (dragging && dragStart && svgEl) {
      const rect = svgEl.getBoundingClientRect();
      const dxPx = e.clientX - dragStart.x;
      const dyPx = e.clientY - dragStart.y;
      // Convert pixel drag to scope-nm; drag should move the view in the
      // same direction (pan = -drag).
      const nmPerPx = (visibleRange * 2) / rect.width;
      panX = dragStart.panX - dxPx * nmPerPx;
      panY = dragStart.panY - dyPx * nmPerPx;
      clampPan();
    }
  }

  function onPointerUp(e: PointerEvent) {
    pinchPointers.delete(e.pointerId);
    if (pinchPointers.size < 2) pinchStart = null;
    if (pinchPointers.size === 0) {
      dragging = false;
      dragStart = null;
    }
    try { svgEl?.releasePointerCapture(e.pointerId); } catch {}
  }

  function reset() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  function zoomIn() {
    const newZoom = clampZoom(zoom * 1.5);
    zoom = newZoom;
    clampPan();
  }
  function zoomOut() {
    const newZoom = clampZoom(zoom / 1.5);
    zoom = newZoom;
    clampPan();
  }
</script>

<div class="scope-wrap">
  <svg
    bind:this={svgEl}
    xmlns="http://www.w3.org/2000/svg"
    {viewBox}
    width={size}
    height={size}
    preserveAspectRatio="xMidYMid meet"
    class={`radarscope ${className}`}
    class:dragging
    class:zoomable
    font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    role={zoomable ? 'application' : undefined}
    aria-label={zoomable ? 'Radar scope — drag to pan, scroll to zoom' : undefined}
    onwheel={onWheel}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <rect
      x={-baseRange}
      y={-baseRange}
      width={baseRange * 2}
      height={baseRange * 2}
      fill="var(--scope-bg, #0c1116)"
    />
    <line x1={-baseRange} y1={0} x2={baseRange} y2={0} stroke="var(--scope-stroke, #3a4750)" stroke-width={0.04 / zoom} />
    <line x1={0} y1={-baseRange} x2={0} y2={baseRange} stroke="var(--scope-stroke, #3a4750)" stroke-width={0.04 / zoom} />
    {#each visibleRings as r}
      <circle
        cx="0"
        cy="0"
        r={r}
        fill="none"
        stroke="var(--scope-stroke, #3a4750)"
        stroke-width={0.08 / zoom}
        stroke-dasharray="{0.4 / zoom} {0.4 / zoom}"
      />
    {/each}
    <circle cx="0" cy="0" r={0.3 / zoom} fill="var(--scope-stroke, #3a4750)" />

    {#each sortedRunways as rw, i (i)}
      <RunwayMarker runway={rw} showFinal={!!rw.showFinal} />
    {/each}

    {@render children?.()}
  </svg>

  {#if zoomable}
    <div class="zoom-ui">
      <button class="zb" onclick={zoomIn} aria-label="Zoom in" title="Zoom in">+</button>
      <button class="zb" onclick={zoomOut} aria-label="Zoom out" title="Zoom out" disabled={zoom <= minZoom}>−</button>
      <button class="zb reset" onclick={reset} aria-label="Reset zoom" title="Reset" disabled={zoom === 1 && panX === 0 && panY === 0}>⟲</button>
    </div>
  {/if}
</div>

<style>
  .scope-wrap {
    position: relative;
    display: inline-block;
    line-height: 0;
  }
  .radarscope {
    display: block;
    max-width: 100%;
    height: auto;
    user-select: none;
    touch-action: none;
  }
  .radarscope.zoomable { cursor: grab; }
  .radarscope.zoomable.dragging { cursor: grabbing; }
  .zoom-ui {
    position: absolute;
    right: 0.4rem;
    bottom: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .zb {
    width: 2rem; height: 2rem;
    border-radius: 4px;
    background: rgba(20, 26, 34, 0.85);
    color: #cdd9e2;
    border: 1px solid rgba(60, 72, 84, 0.85);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }
  .zb:hover { border-color: var(--scope-blip, #a3cef1); color: #fff; }
  .zb:disabled { opacity: 0.35; cursor: default; }
  .zb.reset { font-size: 0.95rem; }
</style>
