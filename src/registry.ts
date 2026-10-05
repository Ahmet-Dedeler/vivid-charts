/** Chart registry: layer `type` → renderer. Charts self-register on import. */
import type { Renderer } from './types.js';

const renderers = new Map<string, Renderer>();

export function registerChart(type: string, renderer: Renderer) {
  renderers.set(type, renderer);
}

export function getRenderer(type: string): Renderer | undefined {
  return renderers.get(type);
}

export function listCharts(): string[] {
  return [...renderers.keys()].sort();
}
