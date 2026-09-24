// src/engines/geometryHistory.ts
// Pure, deterministic geometry state history engine for Undo ("Назад на один шаг")
// Adheres strictly to the "GeometryState is single source of truth" invariant.

import { FullGeometryState } from './constructionCore';

export interface GeometryHistory {
  past: FullGeometryState[];
  present: FullGeometryState;
  maxDepth: number;
}

/**
 * Creates initial geometry history container
 */
export function createInitialHistory(
  initialState: FullGeometryState,
  maxDepth: number = 50
): GeometryHistory {
  return {
    past: [],
    present: initialState,
    maxDepth,
  };
}

/**
 * Pushes a new committed geometry state to history.
 * If nextState is structurally identical to present, it is ignored (no duplicate history entries).
 */
export function pushHistoryState(
  history: GeometryHistory,
  nextState: FullGeometryState
): GeometryHistory {
  // Quick structural/reference equality check
  if (history.present === nextState) {
    return history;
  }

  // Deep comparison to prevent identical duplicate state pushes
  if (areGeometryStatesEqual(history.present, nextState)) {
    return history;
  }

  const updatedPast = [...history.past, history.present];
  if (updatedPast.length > history.maxDepth) {
    updatedPast.shift(); // Evict oldest entry when exceeding max depth
  }

  return {
    past: updatedPast,
    present: nextState,
    maxDepth: history.maxDepth,
  };
}

/**
 * Pops the last committed state from history, restoring previous GeometryState.
 * Returns null if history is empty (cannot undo).
 */
export function popHistoryState(history: GeometryHistory): {
  newHistory: GeometryHistory;
  restoredState: FullGeometryState;
} | null {
  if (history.past.length === 0) {
    return null;
  }

  const restoredState = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, history.past.length - 1);

  return {
    newHistory: {
      past: newPast,
      present: restoredState,
      maxDepth: history.maxDepth,
    },
    restoredState,
  };
}

/**
 * Returns true if undo is available
 */
export function canUndo(history: GeometryHistory): boolean {
  return history.past.length > 0;
}

/**
 * Compares two FullGeometryState instances deterministically
 */
export function areGeometryStatesEqual(
  a: FullGeometryState,
  b: FullGeometryState
): boolean {
  if (a.R !== b.R) return false;
  if (
    a.pointsU.A !== b.pointsU.A ||
    a.pointsU.B !== b.pointsU.B ||
    a.pointsU.C !== b.pointsU.C
  ) {
    return false;
  }

  const pointsA = Object.keys(a.points);
  const pointsB = Object.keys(b.points);
  if (pointsA.length !== pointsB.length) return false;
  for (const k of pointsA) {
    const pA = a.points[k];
    const pB = b.points[k];
    if (!pB) return false;
    if (Math.abs(pA.x - pB.x) > 1e-4 || Math.abs(pA.y - pB.y) > 1e-4) return false;
  }

  const segsA = Object.keys(a.segments);
  const segsB = Object.keys(b.segments);
  if (segsA.length !== segsB.length) return false;
  for (const k of segsA) {
    const sA = a.segments[k];
    const sB = b.segments[k];
    if (!sB || sA.p1Id !== sB.p1Id || sA.p2Id !== sB.p2Id) return false;
  }

  const linesA = Object.keys(a.lines);
  const linesB = Object.keys(b.lines);
  if (linesA.length !== linesB.length) return false;
  for (const k of linesA) {
    const lA = a.lines[k];
    const lB = b.lines[k];
    if (!lB || lA.p1Id !== lB.p1Id || lA.p2Id !== lB.p2Id) return false;
  }

  const circsA = Object.keys(a.circles);
  const circsB = Object.keys(b.circles);
  if (circsA.length !== circsB.length) return false;
  for (const k of circsA) {
    const cA = a.circles[k];
    const cB = b.circles[k];
    if (!cB || cA.centerId !== cB.centerId || Math.abs(cA.radius - cB.radius) > 1e-4) {
      return false;
    }
  }

  return true;
}
