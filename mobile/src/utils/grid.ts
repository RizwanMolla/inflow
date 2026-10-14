import type { GridDimension } from '../types/deck';

/** "3x4" → { rows: 3, cols: 4 }, tolerating malformed values from older desktop builds. */
export function parseGrid(dim: GridDimension): { rows: number; cols: number } {
  const [r, c] = (dim || '2x3').split('x');
  return { rows: Math.max(1, parseInt(r, 10) || 2), cols: Math.max(1, parseInt(c, 10) || 3) };
}
