// src/engines/research/sessionDispatcher.ts
// Session Command Dispatcher with Plane 1 / Plane 2 Isolation and Lifecycle Controls

import { GeometryCommand, dispatchGeometryCommand } from '../constructionCore';
import {
  TriangleResearchSession,
  PlaneId,
  Plane2Lifecycle,
  PortableIdentityMapping,
} from './types';

export interface SessionDispatchResult {
  success: boolean;
  session: TriangleResearchSession;
  error?: string;
}

/**
 * Dispatches a GeometryCommand to the active plane inside a TriangleResearchSession.
 * Enforces Plane 1 / Plane 2 state isolation and Plane 2 FIXED protection.
 */
export function dispatchSessionCommand(
  session: TriangleResearchSession,
  command: GeometryCommand
): SessionDispatchResult {
  if (session.activePlane === 'PLANE_1') {
    // Dispatch to authoritative Plane 1
    const nextPlane1 = dispatchGeometryCommand(session.plane1, command);
    return {
      success: true,
      session: {
        ...session,
        plane1: nextPlane1, // plane2 remains 100% untouched
      },
    };
  }

  // Dispatching to Plane 2
  if (!session.plane2) {
    return {
      success: false,
      session,
      error: 'PLANE_2_NOT_INITIALIZED: Plane 2 workspace has not been created or imported',
    };
  }

  if (session.plane2Lifecycle === 'FIXED') {
    return {
      success: false,
      session, // Strictly unchanged
      error: 'PLANE_FIXED_READ_ONLY: Plane 2 is locked in FIXED lifecycle mode and cannot be mutated',
    };
  }

  // Mutate Plane 2 geometry state
  const prevGeoState = session.plane2.geometryState;
  const nextGeoState = dispatchGeometryCommand(prevGeoState, command);

  // Sync identity registry for newly created objects on Plane 2 (source: agent_created)
  const updatedRegistry: Record<string, PortableIdentityMapping> = { ...session.plane2.identityRegistry };

  // Points
  for (const [id, pt] of Object.entries(nextGeoState.points)) {
    if (!updatedRegistry[id]) {
      updatedRegistry[id] = {
        portableId: `pt_${id}`,
        localId: id,
        displayLabel: pt.name || id,
        source: 'agent_created',
      };
    }
  }

  // Segments
  for (const [id] of Object.entries(nextGeoState.segments)) {
    if (!updatedRegistry[id]) {
      updatedRegistry[id] = {
        portableId: `seg_${id}`,
        localId: id,
        displayLabel: id,
        source: 'agent_created',
      };
    }
  }

  // Lines
  for (const [id] of Object.entries(nextGeoState.lines)) {
    if (!updatedRegistry[id]) {
      updatedRegistry[id] = {
        portableId: `line_${id}`,
        localId: id,
        displayLabel: id,
        source: 'agent_created',
      };
    }
  }

  // Circles
  for (const [id] of Object.entries(nextGeoState.circles)) {
    if (!updatedRegistry[id]) {
      updatedRegistry[id] = {
        portableId: `circle_${id}`,
        localId: id,
        displayLabel: id,
        source: 'agent_created',
      };
    }
  }

  return {
    success: true,
    session: {
      ...session,
      // plane1 remains 100% untouched reference!
      plane2: {
        ...session.plane2,
        geometryState: nextGeoState,
        identityRegistry: updatedRegistry,
        isModified: true,
      },
    },
  };
}

/**
 * Sets active plane in session
 */
export function setActivePlane(
  session: TriangleResearchSession,
  activePlane: PlaneId
): TriangleResearchSession {
  if (activePlane === 'PLANE_2' && !session.plane2) {
    throw new Error('Cannot switch to PLANE_2 before initializing Plane 2 Workspace');
  }
  return {
    ...session,
    activePlane,
  };
}

/**
 * Sets lifecycle mode for Plane 2
 */
export function setPlane2Lifecycle(
  session: TriangleResearchSession,
  plane2Lifecycle: Plane2Lifecycle
): TriangleResearchSession {
  return {
    ...session,
    plane2Lifecycle,
  };
}

/**
 * Sets Plane Overlay Lens enabled status (Presentation State only - NEVER mutates GeometryState!)
 */
export function setOverlayEnabled(
  session: TriangleResearchSession,
  enabled: boolean
): TriangleResearchSession {
  const currentOverlay = session.overlay || { enabled: false, mix: 0.5 };
  return {
    ...session,
    overlay: {
      ...currentOverlay,
      enabled,
    },
  };
}

/**
 * Sets Plane Overlay Lens slider mix [0, 1] (0 = 100% P1, 0.5 = 50/50 Lens, 1 = 100% P2)
 * Presentation State only - NEVER mutates GeometryState or activePlane!
 */
export function setOverlayMix(
  session: TriangleResearchSession,
  mix: number
): TriangleResearchSession {
  const clampedMix = Math.max(0, Math.min(1, mix));
  const currentOverlay = session.overlay || { enabled: true, mix: clampedMix };
  return {
    ...session,
    overlay: {
      ...currentOverlay,
      mix: clampedMix,
    },
  };
}

/**
 * Resets Plane 2 Workspace to null
 */
export function resetPlane2(session: TriangleResearchSession): TriangleResearchSession {
  return {
    ...session,
    plane2: null,
    activePlane: 'PLANE_1',
    plane2Lifecycle: 'BUILDING',
    overlay: { enabled: false, mix: 0.5 },
  };
}
