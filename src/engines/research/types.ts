// src/engines/research/types.ts
// Data structures for Plane 1 + Plane 2 Workspace System in Triangle Stand

import { FullGeometryState } from '../constructionCore';
import { PGS2DPassport, PGSReceiverVerification } from '../pgs/types';

export type PlaneId = 'PLANE_1' | 'PLANE_2';
export type Plane2Lifecycle = 'BUILDING' | 'FIXED';
export type PortableIdentitySource = 'imported' | 'agent_created' | 'cloned_from_plane1';
export type Plane2SourceType = 'plane1_clone' | 'pgs_import' | 'empty_sandbox';

export interface PortableIdentityMapping {
  portableId: string;
  localId: string;
  displayLabel?: string;
  source: PortableIdentitySource;
}

export interface Plane2WorkspaceState {
  /** Pure SSOT Geometry Engine State (mutable for agent/user constructions) */
  geometryState: FullGeometryState;

  /** Source provenance of Plane 2 */
  sourceType: Plane2SourceType;

  /** Original imported PGS passport (if populated via PGS import) */
  importedPassport?: PGS2DPassport;

  /** Independent Receiver Verification result */
  receiverVerification?: PGSReceiverVerification;

  /** Explicit Portable Identity Registry preserving original portableIds (mapped by localId) */
  identityRegistry: Record<string, PortableIdentityMapping>;

  /** Flag indicating if agent/user made modifications after import/clone */
  isModified: boolean;

  /** ISO timestamp when Plane 2 workspace was initialized */
  createdAt: string;
}

export interface PlaneOverlayState {
  enabled: boolean;
  mix: number; // [0, 1] where 0 = Plane 1 100%, 0.5 = 50/50 Lens, 1 = Plane 2 100%
}

export interface TriangleResearchSession {
  /** Authoritative Plane 1 (SSOT) */
  plane1: FullGeometryState;

  /** Independent Experimental Workspace Plane 2 */
  plane2: Plane2WorkspaceState | null;

  /** Active plane receiving user/agent commands */
  activePlane: PlaneId;

  /** Lifecycle mode of Plane 2 (BUILDING or FIXED) */
  plane2Lifecycle: Plane2Lifecycle;

  /** Presentation state for Plane 1 / Plane 2 Overlay Lens */
  overlay: PlaneOverlayState;
}
