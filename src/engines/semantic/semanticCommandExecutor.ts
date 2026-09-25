// src/engines/semantic/semanticCommandExecutor.ts
// Universal Semantic Command Executor for 2D School Geometry Stand
// Single source of geometric truth: Delegates directly to existing ConstructionCore,
// ParametricAngleSolver, School Construction Planners, and ConfigurationProjector.
// Implements "Agent may be wrong. The Stand must not."

import {
  FullGeometryState,
  dispatchGeometryCommand,
  createDefaultGeometryState,
  calculateEuclideanDistance,
} from '../constructionCore';
import { solveTriangleConfiguration } from '../parametricAngleSolver';
import { planPerpendicularLine } from '../perpendicularLine';
import { planParallelLine } from '../parallelLine';
import { planAngleBisector } from '../angleBisector';
import { planPerpendicularBisector } from '../perpendicularBisector';
import { buildConfigurationView } from '../configuration/configurationProjector';
import { extractSemanticRelations } from '../configuration/semanticRelation';
import { extractSemanticQuantities } from '../configuration/semanticQuantity';
import {
  SemanticCommand,
  SemanticCommandResult,
  SemanticEntitySummary,
  SemanticCommandErrorCode,
} from './types';
import {
  createGeometryProject,
  serializeGeometryProject,
  deserializeGeometryProject,
} from '../project';

/**
 * Resolves human/agent shorthand reference to a canonical line or segment ID.
 * Examples:
 * - "AB" -> "chord_AB"
 * - "BC" -> "chord_BC"
 * - "CA" / "AC" -> "chord_CA"
 * - "chord_AB" -> "chord_AB"
 * - "line_1" -> "line_1"
 */
export function resolveLineOrSegmentId(
  state: FullGeometryState,
  reference: string
): string | null {
  if (!reference) return null;
  const trimmed = reference.trim();

  // Direct match
  if (state.lines[trimmed] || state.segments[trimmed]) {
    return trimmed;
  }

  // Shorthand chord / segment naming
  const upper = trimmed.toUpperCase();
  if (upper === 'AB' || upper === 'BA') {
    if (state.segments['chord_AB']) return 'chord_AB';
  }
  if (upper === 'BC' || upper === 'CB') {
    if (state.segments['chord_BC']) return 'chord_BC';
  }
  if (upper === 'CA' || upper === 'AC') {
    if (state.segments['chord_CA']) return 'chord_CA';
  }

  // Search by endpoints
  if (upper.length === 2) {
    const p1 = upper[0];
    const p2 = upper[1];
    for (const [sId, seg] of Object.entries(state.segments)) {
      if ((seg.p1Id === p1 && seg.p2Id === p2) || (seg.p1Id === p2 && seg.p2Id === p1)) {
        return sId;
      }
    }
    for (const [lId, line] of Object.entries(state.lines)) {
      if ((line.p1Id === p1 && line.p2Id === p2) || (line.p1Id === p2 && line.p2Id === p1)) {
        return lId;
      }
    }
  }

  // Search by point names
  for (const [sId, seg] of Object.entries(state.segments)) {
    const n1 = state.points[seg.p1Id]?.name;
    const n2 = state.points[seg.p2Id]?.name;
    if (n1 && n2 && (n1 + n2 === trimmed || n2 + n1 === trimmed)) {
      return sId;
    }
  }

  return null;
}

/**
 * Resolves point ID by ID or Name.
 */
export function resolvePointId(
  state: FullGeometryState,
  reference: string
): string | null {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (state.points[trimmed]) return trimmed;

  const found = Object.values(state.points).find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase()
  );
  return found ? found.id : null;
}

/**
 * Executes a single semantic command against the deterministic GeometryState.
 * Returns a detailed structured result with full parity across Human UI and AI Agent.
 */
export function executeSemanticCommand(
  state: FullGeometryState,
  command: SemanticCommand
): SemanticCommandResult {
  if (!command || !command.command) {
    return {
      success: false,
      command: 'INVALID_COMMAND' as any,
      stateChanged: false,
      nextState: state,
      previousState: state,
      errorCode: 'INVALID_COMMAND',
      errorMessage: 'Команда не указана или имеет некорректный формат.',
    };
  }

  switch (command.command) {
    // ------------------------------------------------------------------------
    // A. CONFIGURATION COMMANDS
    // ------------------------------------------------------------------------
    case 'SET_TRIANGLE_ANGLES': {
      const solveRes = solveTriangleConfiguration(state.pointsU, command.angles);
      if (!solveRes.success || !solveRes.nextPointsU) {
        let errCode: SemanticCommandErrorCode = 'INSUFFICIENT_ANGLES';
        if (solveRes.mode === 'INVALID') errCode = 'TRIANGLE_ANGLE_SUM_INVALID';
        return {
          success: false,
          command: 'SET_TRIANGLE_ANGLES',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: errCode,
          errorMessage: solveRes.error || solveRes.infoMessage || 'Ошибка задания углов треугольника.',
        };
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'SYNC_BASE_POINTS',
        pointsU: solveRes.nextPointsU,
        R: state.R,
      });

      const configView = buildConfigurationView(nextState);

      return {
        success: true,
        command: 'SET_TRIANGLE_ANGLES',
        stateChanged: true,
        nextState,
        previousState: state,
        affectedEntities: ['A', 'B', 'C', 'chord_AB', 'chord_BC', 'chord_CA'],
        appliedParameters: {
          resolvedAngles: solveRes.resolvedAngles,
          autoCalculatedVertex: solveRes.autoCalculatedVertex,
          mode: solveRes.mode,
          pointsU: solveRes.nextPointsU,
        },
        derivedRelations: extractSemanticRelations(nextState),
        measurements: extractSemanticQuantities(nextState),
        configurationSummary: configView.summary,
        configurationView: configView,
      };
    }

    case 'SET_VERTEX_POSITION':
    case 'MOVE_VERTEX': {
      const pId = resolvePointId(state, command.vertexId);
      if (!pId) {
        return {
          success: false,
          command: command.command,
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Вершина/точка "${command.vertexId}" не найдена.`,
        };
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'MOVE_POINT',
        pointId: pId,
        x: command.x ?? state.points[pId].x,
        y: command.y ?? state.points[pId].y,
        u: command.u,
      });

      const configView = buildConfigurationView(nextState);

      return {
        success: true,
        command: command.command,
        stateChanged: true,
        nextState,
        previousState: state,
        affectedEntities: [pId],
        derivedRelations: extractSemanticRelations(nextState),
        measurements: extractSemanticQuantities(nextState),
        configurationSummary: configView.summary,
      };
    }

    case 'RESET_GEOMETRY': {
      const defaultU = command.pointsU || { A: 0.75, B: 0.08333333333333333, C: 0.25 };
      const defaultR = command.R || state.R || 120;
      const nextState = createDefaultGeometryState(defaultU, defaultR);
      const configView = buildConfigurationView(nextState);

      return {
        success: true,
        command: 'RESET_GEOMETRY',
        stateChanged: true,
        nextState,
        previousState: state,
        affectedEntities: Object.keys(nextState.points),
        configurationSummary: configView.summary,
      };
    }

    case 'CLEAR_USER_CONSTRUCTIONS': {
      const nextState = dispatchGeometryCommand(state, { type: 'CLEAR_USER_CONSTRUCTIONS' });
      const configView = buildConfigurationView(nextState);

      return {
        success: true,
        command: 'CLEAR_USER_CONSTRUCTIONS',
        stateChanged: true,
        nextState,
        previousState: state,
        configurationSummary: configView.summary,
      };
    }

    // ------------------------------------------------------------------------
    // B. BASIC PRIMITIVES
    // ------------------------------------------------------------------------
    case 'DRAW_POINT': {
      const nextCount = state.pointCounter + 1;
      const id = `point_${nextCount}`;
      const name = command.name || `P${nextCount}`;

      const nextState = dispatchGeometryCommand(state, {
        type: 'ADD_POINT',
        point: {
          id,
          name,
          x: command.x,
          y: command.y,
          color: command.color || '#10B981',
          onCircle: command.onCircle,
        },
      });

      return {
        success: true,
        command: 'DRAW_POINT',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: [{ id, kind: 'point', name, role: 'primary' }],
      };
    }

    case 'DRAW_SEGMENT': {
      const p1 = resolvePointId(state, command.p1Id);
      const p2 = resolvePointId(state, command.p2Id);
      if (!p1 || !p2) {
        return {
          success: false,
          command: 'DRAW_SEGMENT',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Одна или обе точки (${command.p1Id}, ${command.p2Id}) не найдены.`,
        };
      }
      if (p1 === p2) {
        return {
          success: false,
          command: 'DRAW_SEGMENT',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'POINTS_COINCIDENT',
          errorMessage: 'Концы отрезка должны быть различными точками.',
        };
      }

      const nextCount = state.segmentCounter + 1;
      const id = `segment_${nextCount}`;
      const nextState = dispatchGeometryCommand(state, {
        type: 'ADD_SEGMENT',
        segment: {
          id,
          p1Id: p1,
          p2Id: p2,
          color: command.color || '#3B82F6',
        },
      });

      return {
        success: true,
        command: 'DRAW_SEGMENT',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: [{ id, kind: 'segment', role: 'primary' }],
      };
    }

    case 'DRAW_LINE': {
      const p1 = resolvePointId(state, command.p1Id);
      const p2 = resolvePointId(state, command.p2Id);
      if (!p1 || !p2) {
        return {
          success: false,
          command: 'DRAW_LINE',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Одна или обе точки (${command.p1Id}, ${command.p2Id}) не найдены.`,
        };
      }
      if (p1 === p2) {
        return {
          success: false,
          command: 'DRAW_LINE',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'POINTS_COINCIDENT',
          errorMessage: 'Прямая требует двух различных точек.',
        };
      }

      const nextCount = state.lineCounter + 1;
      const id = `line_${nextCount}`;
      const nextState = dispatchGeometryCommand(state, {
        type: 'ADD_LINE',
        line: {
          id,
          p1Id: p1,
          p2Id: p2,
          color: command.color || '#3B82F6',
        },
      });

      return {
        success: true,
        command: 'DRAW_LINE',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: [{ id, kind: 'line', role: 'primary' }],
      };
    }

    case 'DRAW_CIRCLE': {
      const center = resolvePointId(state, command.centerId);
      if (!center) {
        return {
          success: false,
          command: 'DRAW_CIRCLE',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Центр окружности "${command.centerId}" не найден.`,
        };
      }

      let radPtId: string | undefined;
      if (command.radiusPointId) {
        radPtId = resolvePointId(state, command.radiusPointId) || undefined;
        if (!radPtId) {
          return {
            success: false,
            command: 'DRAW_CIRCLE',
            stateChanged: false,
            nextState: state,
            previousState: state,
            errorCode: 'ENTITY_NOT_FOUND',
            errorMessage: `Точка радиуса "${command.radiusPointId}" не найдена.`,
          };
        }
      }

      const nextCount = state.circleCounter + 1;
      const id = `circle_${nextCount}`;
      const nextState = dispatchGeometryCommand(state, {
        type: 'ADD_CIRCLE',
        circle: {
          id,
          centerId: center,
          radiusPointId: radPtId,
          radius: command.radius,
          color: command.color || '#8B5CF6',
        },
      });

      return {
        success: true,
        command: 'DRAW_CIRCLE',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: [{ id, kind: 'circle', role: 'primary' }],
      };
    }

    // ------------------------------------------------------------------------
    // C. SCHOOL MODE CONSTRUCTIONS
    // ------------------------------------------------------------------------
    case 'CONSTRUCT_ANGLE_BISECTOR': {
      const vertex = resolvePointId(state, command.vertex);
      if (!vertex) {
        return {
          success: false,
          command: 'CONSTRUCT_ANGLE_BISECTOR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Вершина угла "${command.vertex}" не найдена.`,
        };
      }

      // Determine arm points
      let pAId = command.pAId ? resolvePointId(state, command.pAId) : null;
      let pBId = command.pBId ? resolvePointId(state, command.pBId) : null;

      if (!pAId || !pBId) {
        if (vertex === 'A') {
          pAId = pAId || 'B';
          pBId = pBId || 'C';
        } else if (vertex === 'B') {
          pAId = pAId || 'A';
          pBId = pBId || 'C';
        } else if (vertex === 'C') {
          pAId = pAId || 'A';
          pBId = pBId || 'B';
        } else {
          // Look for segments attached to this vertex
          const attached = Object.values(state.segments)
            .filter((s) => s.p1Id === vertex || s.p2Id === vertex)
            .map((s) => (s.p1Id === vertex ? s.p2Id : s.p1Id));
          if (attached.length >= 2) {
            pAId = pAId || attached[0];
            pBId = pBId || attached[1];
          }
        }
      }

      if (!pAId || !pBId) {
        return {
          success: false,
          command: 'CONSTRUCT_ANGLE_BISECTOR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'PRECONDITION_FAILED',
          errorMessage: 'Не удалось однозначно определить стороны угла. Укажите pAId и pBId.',
        };
      }

      const plan = planAngleBisector(state, pAId, vertex, pBId);
      if (plan.success === false) {
        const fail = plan as { success: false; error: string; errorMessage: string };
        let errCode: SemanticCommandErrorCode = 'PRECONDITION_FAILED';
        if (fail.error === 'POINT_NOT_FOUND') errCode = 'ENTITY_NOT_FOUND';
        if (fail.error === 'COINCIDENT_VERTEX') errCode = 'POINTS_COINCIDENT';
        if (fail.error === 'DEGENERATE_ANGLE') errCode = 'DEGENERATE_ANGLE';
        return {
          success: false,
          command: 'CONSTRUCT_ANGLE_BISECTOR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: errCode,
          errorMessage: fail.errorMessage,
        };
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'BATCH_COMMANDS',
        commands: plan.commands,
      });

      const created: SemanticEntitySummary[] = [
        { id: plan.createdObjectIds.bisectorLineId, kind: 'line', role: 'primary' },
      ];

      return {
        success: true,
        command: 'CONSTRUCT_ANGLE_BISECTOR',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: created,
        affectedEntities: [vertex, pAId, pBId],
        derivedRelations: extractSemanticRelations(nextState),
        measurements: extractSemanticQuantities(nextState),
      };
    }

    case 'CONSTRUCT_PERPENDICULAR': {
      const lineId = resolveLineOrSegmentId(state, command.reference);
      if (!lineId) {
        return {
          success: false,
          command: 'CONSTRUCT_PERPENDICULAR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Базовая линия или отрезок "${command.reference}" не найдены.`,
        };
      }

      let pointInput = command.through;
      if (typeof pointInput === 'string') {
        const resolvedP = resolvePointId(state, pointInput);
        if (!resolvedP) {
          return {
            success: false,
            command: 'CONSTRUCT_PERPENDICULAR',
            stateChanged: false,
            nextState: state,
            previousState: state,
            errorCode: 'ENTITY_NOT_FOUND',
            errorMessage: `Точка "${pointInput}" не найдена в состоянии геометрии.`,
          };
        }
        pointInput = resolvedP;
      }

      const plan = planPerpendicularLine(state, lineId, pointInput);
      if (plan.success === false) {
        const fail = plan as { success: false; error: string; errorMessage: string };
        let errCode: SemanticCommandErrorCode = 'PRECONDITION_FAILED';
        if (fail.error === 'OBJECT_NOT_FOUND' || fail.error === 'POINT_NOT_FOUND') errCode = 'ENTITY_NOT_FOUND';
        if (fail.error === 'DEGENERATE_LINE') errCode = 'DEGENERATE_LINE';
        return {
          success: false,
          command: 'CONSTRUCT_PERPENDICULAR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: errCode,
          errorMessage: fail.errorMessage,
        };
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'BATCH_COMMANDS',
        commands: plan.commands,
      });

      const created: SemanticEntitySummary[] = [
        { id: plan.createdObjectIds.perpendicularLineId, kind: 'line', role: 'primary' },
      ];

      return {
        success: true,
        command: 'CONSTRUCT_PERPENDICULAR',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: created,
        affectedEntities: [lineId, typeof command.through === 'string' ? command.through : 'P'],
        derivedRelations: extractSemanticRelations(nextState),
        measurements: extractSemanticQuantities(nextState),
      };
    }

    case 'CONSTRUCT_PARALLEL': {
      const lineId = resolveLineOrSegmentId(state, command.reference);
      if (!lineId) {
        return {
          success: false,
          command: 'CONSTRUCT_PARALLEL',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: `Базовая линия или отрезок "${command.reference}" не найдены.`,
        };
      }

      let pointInput = command.through;
      if (typeof pointInput === 'string') {
        const resolvedP = resolvePointId(state, pointInput);
        if (!resolvedP) {
          return {
            success: false,
            command: 'CONSTRUCT_PARALLEL',
            stateChanged: false,
            nextState: state,
            previousState: state,
            errorCode: 'ENTITY_NOT_FOUND',
            errorMessage: `Точка "${pointInput}" не найдена в состоянии геометрии.`,
          };
        }
        pointInput = resolvedP;
      }

      const plan = planParallelLine(state, lineId, pointInput);
      if (plan.success === false) {
        const fail = plan as { success: false; error: string; errorMessage: string };
        let errCode: SemanticCommandErrorCode = 'PRECONDITION_FAILED';
        if (fail.error === 'OBJECT_NOT_FOUND' || fail.error === 'LINE_NOT_FOUND' || fail.error === 'POINT_NOT_FOUND') {
          errCode = 'ENTITY_NOT_FOUND';
        }
        if (fail.error === 'POINT_ON_LINE') errCode = 'POINT_ON_LINE_NOT_ALLOWED';
        if (fail.error === 'DEGENERATE_LINE') errCode = 'DEGENERATE_LINE';
        return {
          success: false,
          command: 'CONSTRUCT_PARALLEL',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: errCode,
          errorMessage: fail.errorMessage,
        };
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'BATCH_COMMANDS',
        commands: plan.commands,
      });

      const created: SemanticEntitySummary[] = [
        { id: plan.createdObjectIds.parallelLineId, kind: 'line', role: 'primary' },
      ];

      return {
        success: true,
        command: 'CONSTRUCT_PARALLEL',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: created,
        affectedEntities: [lineId, typeof command.through === 'string' ? command.through : 'P'],
        derivedRelations: extractSemanticRelations(nextState),
        measurements: extractSemanticQuantities(nextState),
      };
    }

    case 'CONSTRUCT_PERPENDICULAR_BISECTOR': {
      let p1 = command.point1 ? resolvePointId(state, command.point1) : null;
      let p2 = command.point2 ? resolvePointId(state, command.point2) : null;

      if ((!p1 || !p2) && command.reference) {
        const segId = resolveLineOrSegmentId(state, command.reference);
        if (segId && state.segments[segId]) {
          p1 = state.segments[segId].p1Id;
          p2 = state.segments[segId].p2Id;
        } else if (segId && state.lines[segId]) {
          p1 = state.lines[segId].p1Id;
          p2 = state.lines[segId].p2Id;
        }
      }

      if (!p1 || !p2) {
        return {
          success: false,
          command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'ENTITY_NOT_FOUND',
          errorMessage: 'Точки или отрезок для серединного перпендикуляра не найдены.',
        };
      }

      const plan = planPerpendicularBisector(state, p1, p2);
      if (plan.success === false) {
        const fail = plan as { success: false; error: string; errorMessage: string };
        let errCode: SemanticCommandErrorCode = 'PRECONDITION_FAILED';
        if (fail.error === 'POINT_NOT_FOUND') errCode = 'ENTITY_NOT_FOUND';
        if (fail.error === 'POINTS_COINCIDENT') errCode = 'POINTS_COINCIDENT';
        return {
          success: false,
          command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: errCode,
          errorMessage: fail.errorMessage,
        };
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'BATCH_COMMANDS',
        commands: plan.commands,
      });

      const created: SemanticEntitySummary[] = [
        { id: plan.createdObjectIds.bisectorLineId, kind: 'line', role: 'primary' },
      ];

      return {
        success: true,
        command: 'CONSTRUCT_PERPENDICULAR_BISECTOR',
        stateChanged: true,
        nextState,
        previousState: state,
        createdEntities: created,
        affectedEntities: [p1, p2],
        derivedRelations: extractSemanticRelations(nextState),
        measurements: extractSemanticQuantities(nextState),
      };
    }

    case 'ERASE_OBJECT': {
      // Guard against deleting base vertices, chords, circumcircle
      if (command.id === 'O' || command.id === 'A' || command.id === 'B' || command.id === 'C' ||
          command.id === 'chord_AB' || command.id === 'chord_BC' || command.id === 'chord_CA' ||
          command.id === 'base_circle') {
        return {
          success: false,
          command: 'ERASE_OBJECT',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: 'BASE_OBJECT_IMMUTABLE',
          errorMessage: `Базовый объект "${command.id}" является частью базового пространства и не может быть удален.`,
        };
      }

      let objType = command.objectType;
      if (!objType) {
        if (state.lines[command.id]) objType = 'line';
        else if (state.segments[command.id]) objType = 'segment';
        else if (state.points[command.id]) objType = 'point';
        else if (state.circles[command.id]) objType = 'circle';
      }

      const nextState = dispatchGeometryCommand(state, {
        type: 'ERASE_OBJECT',
        id: command.id,
        objectType: objType,
      });

      return {
        success: true,
        command: 'ERASE_OBJECT',
        stateChanged: true,
        nextState,
        previousState: state,
        affectedEntities: [command.id],
      };
    }

    // ------------------------------------------------------------------------
    // D. OBSERVATION COMMANDS (READ-ONLY)
    // ------------------------------------------------------------------------
    case 'GET_GEOMETRY_STATE': {
      return {
        success: true,
        command: 'GET_GEOMETRY_STATE',
        stateChanged: false,
        nextState: state,
        previousState: state,
        appliedParameters: {
          R: state.R,
          pointsU: state.pointsU,
          pointsCount: Object.keys(state.points).length,
          segmentsCount: Object.keys(state.segments).length,
          linesCount: Object.keys(state.lines).length,
          circlesCount: Object.keys(state.circles).length,
        },
      };
    }

    case 'GET_CONFIGURATION': {
      const configView = buildConfigurationView(state);
      return {
        success: true,
        command: 'GET_CONFIGURATION',
        stateChanged: false,
        nextState: state,
        previousState: state,
        configurationSummary: configView.summary,
        configurationView: configView,
        derivedRelations: configView.semanticRelations,
        measurements: configView.semanticQuantities,
      };
    }

    case 'GET_RELATIONS': {
      let relations = extractSemanticRelations(state);
      if (command.filter) {
        const { entityId, type, status } = command.filter;
        if (entityId) {
          relations = relations.filter(
            (r) => r.sourceEntityId === entityId || r.targetEntityIds.includes(entityId)
          );
        }
        if (type) {
          relations = relations.filter((r) => r.relationType === type);
        }
        if (status) {
          relations = relations.filter((r) => r.status === status);
        }
      }

      return {
        success: true,
        command: 'GET_RELATIONS',
        stateChanged: false,
        nextState: state,
        previousState: state,
        derivedRelations: relations,
      };
    }

    case 'GET_MEASUREMENTS': {
      let quantities = extractSemanticQuantities(state);
      if (command.filter) {
        const { target, semanticType } = command.filter;
        if (target) {
          quantities = quantities.filter(
            (q) => q.context.vertexId === target || q.name.includes(target)
          );
        }
        if (semanticType) {
          quantities = quantities.filter((q) => q.semanticType === semanticType);
        }
      }

      return {
        success: true,
        command: 'GET_MEASUREMENTS',
        stateChanged: false,
        nextState: state,
        previousState: state,
        measurements: quantities,
      };
    }

    case 'GET_VERIFIED_FACTS': {
      const configView = buildConfigurationView(state);
      const verified = configView.epistemicRegistry.filter(
        (f) => f.status === 'VERIFIED_INVARIANT' || f.isProven
      );

      return {
        success: true,
        command: 'GET_VERIFIED_FACTS',
        stateChanged: false,
        nextState: state,
        previousState: state,
        verifiedFacts: verified,
        appliedParameters: {
          verifiedCount: verified.length,
        },
      };
    }

    // ------------------------------------------------------------------------
    // E. FORMAL VERIFICATION
    // ------------------------------------------------------------------------
    case 'VERIFY_RELATION': {
      const relType = (command.relation || '').toUpperCase().trim();
      const allRelations = extractSemanticRelations(state);
      const configView = buildConfigurationView(state);

      const subjId = command.subject
        ? resolveLineOrSegmentId(state, command.subject) || resolvePointId(state, command.subject) || command.subject
        : undefined;
      const refId = command.reference
        ? resolveLineOrSegmentId(state, command.reference) || resolvePointId(state, command.reference) || command.reference
        : undefined;

      const getLineVector = (id: string): { dx: number; dy: number } | null => {
        const seg = state.segments[id];
        if (seg) {
          const pt1 = state.points[seg.p1Id];
          const pt2 = state.points[seg.p2Id];
          if (pt1 && pt2) return { dx: pt2.x - pt1.x, dy: pt2.y - pt1.y };
        }
        const line = state.lines[id];
        if (line) {
          const pt1 = state.points[line.p1Id];
          const pt2 = state.points[line.p2Id];
          if (pt1 && pt2) return { dx: pt2.x - pt1.x, dy: pt2.y - pt1.y };
        }
        return null;
      };

      if (relType === 'PERPENDICULAR' || relType === 'PERPENDICULAR_TO') {
        const matched = allRelations.find(
          (r) =>
            r.relationType === 'PERPENDICULAR_TO' &&
            ((subjId && refId && (r.sourceEntityId === subjId && r.targetEntityIds.includes(refId))) ||
              (subjId && refId && (r.sourceEntityId === refId && r.targetEntityIds.includes(subjId))) ||
              (!subjId && refId && r.targetEntityIds.includes(refId)) ||
              (subjId && !refId && r.sourceEntityId === subjId))
        );

        if (matched) {
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'PERPENDICULAR',
              status: 'VERIFIED',
              isProven: true,
              explanation: `Отношение взаимной перпендикулярности строго подтверждено: ${matched.formalNotation}`,
              subjectId: subjId,
              referenceId: refId,
              matchedRelation: matched,
            },
          };
        }

        if (subjId && refId) {
          const v1 = getLineVector(subjId);
          const v2 = getLineVector(refId);
          if (v1 && v2) {
            const len1 = Math.hypot(v1.dx, v1.dy);
            const len2 = Math.hypot(v2.dx, v2.dy);
            if (len1 > 1e-4 && len2 > 1e-4) {
              const dot = (v1.dx * v2.dx + v1.dy * v2.dy) / (len1 * len2);
              if (Math.abs(dot) < 0.05) {
                return {
                  success: true,
                  command: 'VERIFY_RELATION',
                  stateChanged: false,
                  nextState: state,
                  previousState: state,
                  verification: {
                    relation: 'PERPENDICULAR',
                    status: 'VERIFIED',
                    isProven: true,
                    explanation: `Прямые ${subjId} и ${refId} взаимно перпендикулярны (угол 90°, cos θ = ${dot.toFixed(4)})`,
                    subjectId: subjId,
                    referenceId: refId,
                    mathematicalCheck: { dotProduct: dot, angleDeg: 90 },
                  },
                };
              } else {
                return {
                  success: true,
                  command: 'VERIFY_RELATION',
                  stateChanged: false,
                  nextState: state,
                  previousState: state,
                  verification: {
                    relation: 'PERPENDICULAR',
                    status: 'REFUTED',
                    isProven: false,
                    explanation: `Прямые ${subjId} и ${refId} НЕ перпендикулярны (скалярное произведение = ${dot.toFixed(4)})`,
                    subjectId: subjId,
                    referenceId: refId,
                    mathematicalCheck: { dotProduct: dot },
                  },
                };
              }
            }
          }
        }

        return {
          success: true,
          command: 'VERIFY_RELATION',
          stateChanged: false,
          nextState: state,
          previousState: state,
          verification: {
            relation: 'PERPENDICULAR',
            status: 'REFUTED',
            isProven: false,
            explanation: `Отношение перпендикулярности между "${command.subject}" и "${command.reference}" не подтверждено.`,
            subjectId: subjId,
            referenceId: refId,
          },
        };
      }

      if (relType === 'PARALLEL' || relType === 'PARALLEL_TO') {
        const matched = allRelations.find(
          (r) =>
            r.relationType === 'PARALLEL_TO' &&
            ((subjId && refId && (r.sourceEntityId === subjId && r.targetEntityIds.includes(refId))) ||
              (subjId && refId && (r.sourceEntityId === refId && r.targetEntityIds.includes(subjId))) ||
              (!subjId && refId && r.targetEntityIds.includes(refId)) ||
              (subjId && !refId && r.sourceEntityId === subjId))
        );

        if (matched) {
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'PARALLEL',
              status: 'VERIFIED',
              isProven: true,
              explanation: `Отношение параллельности строго подтверждено: ${matched.formalNotation}`,
              subjectId: subjId,
              referenceId: refId,
              matchedRelation: matched,
            },
          };
        }

        if (subjId && refId) {
          const v1 = getLineVector(subjId);
          const v2 = getLineVector(refId);
          if (v1 && v2) {
            const len1 = Math.hypot(v1.dx, v1.dy);
            const len2 = Math.hypot(v2.dx, v2.dy);
            if (len1 > 1e-4 && len2 > 1e-4) {
              const cross = (v1.dx * v2.dy - v1.dy * v2.dx) / (len1 * len2);
              if (Math.abs(cross) < 0.05) {
                return {
                  success: true,
                  command: 'VERIFY_RELATION',
                  stateChanged: false,
                  nextState: state,
                  previousState: state,
                  verification: {
                    relation: 'PARALLEL',
                    status: 'VERIFIED',
                    isProven: true,
                    explanation: `Прямые ${subjId} и ${refId} параллельны (sin θ = ${cross.toFixed(4)})`,
                    subjectId: subjId,
                    referenceId: refId,
                    mathematicalCheck: { crossProduct: cross },
                  },
                };
              } else {
                return {
                  success: true,
                  command: 'VERIFY_RELATION',
                  stateChanged: false,
                  nextState: state,
                  previousState: state,
                  verification: {
                    relation: 'PARALLEL',
                    status: 'REFUTED',
                    isProven: false,
                    explanation: `Прямые ${subjId} и ${refId} НЕ параллельны (векторное произведение = ${cross.toFixed(4)})`,
                    subjectId: subjId,
                    referenceId: refId,
                    mathematicalCheck: { crossProduct: cross },
                  },
                };
              }
            }
          }
        }

        return {
          success: true,
          command: 'VERIFY_RELATION',
          stateChanged: false,
          nextState: state,
          previousState: state,
          verification: {
            relation: 'PARALLEL',
            status: 'REFUTED',
            isProven: false,
            explanation: `Отношение параллельности между "${command.subject}" и "${command.reference}" не подтверждено.`,
            subjectId: subjId,
            referenceId: refId,
          },
        };
      }

      if (relType === 'DIAMETER' || relType === 'DIAMETER_OF') {
        const matched = allRelations.find(
          (r) =>
            r.relationType === 'DIAMETER_OF' &&
            (!subjId || r.sourceEntityId === subjId)
        );

        if (matched) {
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'DIAMETER',
              status: 'VERIFIED',
              isProven: true,
              explanation: `Отрезок ${matched.sourceEntityId} доказанно является диаметром описанной окружности (длина = 2R, проходит через центр O).`,
              subjectId: matched.sourceEntityId,
              matchedRelation: matched,
            },
          };
        }

        return {
          success: true,
          command: 'VERIFY_RELATION',
          stateChanged: false,
          nextState: state,
          previousState: state,
          verification: {
            relation: 'DIAMETER',
            status: 'REFUTED',
            isProven: false,
            explanation: `Отрезок "${command.subject || 'исследуемый'}" НЕ является диаметром окружности.`,
            subjectId: subjId,
          },
        };
      }

      if (relType === 'CHORD' || relType === 'CHORD_OF') {
        const matched = allRelations.find(
          (r) =>
            r.relationType === 'CHORD_OF' &&
            (!subjId || r.sourceEntityId === subjId)
        );

        if (matched) {
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'CHORD',
              status: 'VERIFIED',
              isProven: true,
              explanation: `Отрезок ${matched.sourceEntityId} является хордой окружности (оба конца строго принадлежат C_0).`,
              subjectId: matched.sourceEntityId,
              matchedRelation: matched,
            },
          };
        }

        return {
          success: true,
          command: 'VERIFY_RELATION',
          stateChanged: false,
          nextState: state,
          previousState: state,
          verification: {
            relation: 'CHORD',
            status: 'REFUTED',
            isProven: false,
            explanation: `Отрезок "${command.subject}" не является хордой (концы не принадлежат окружности).`,
            subjectId: subjId,
          },
        };
      }

      if (relType === 'POINT_ON_CIRCLE' || relType === 'POINT_ON') {
        const pt = subjId ? state.points[subjId] : null;
        if (pt) {
          const dist = Math.hypot(pt.x, pt.y);
          const onCirc = Math.abs(dist - state.R) < 1.0;
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'POINT_ON_CIRCLE',
              status: onCirc ? 'VERIFIED' : 'REFUTED',
              isProven: onCirc,
              explanation: onCirc
                ? `Точка ${pt.name || pt.id} лежит на окружности (дистанция до центра = ${dist.toFixed(2)} px ≈ R = ${state.R} px)`
                : `Точка ${pt.name || pt.id} НЕ лежит на окружности (дистанция до центра = ${dist.toFixed(2)} px ≠ R = ${state.R} px)`,
              subjectId: pt.id,
              referenceId: 'base_circle',
              mathematicalCheck: { distance: dist, radius: state.R },
            },
          };
        }
      }

      if (
        relType === 'THALES' ||
        relType === 'THALES_THEOREM' ||
        relType === 'THALES_INSCRIBED_RIGHT_ANGLE'
      ) {
        const thalesFact = configView.epistemicRegistry.find(
          (f) => f.ruleId === 'RULE-THALES-DIAMETER' && (f.isProven || f.status === 'VERIFIED_INVARIANT')
        );
        const thalesRel = allRelations.find(
          (r) => r.theoremOrRuleId === 'RULE-THALES-DIAMETER' && r.status === 'VERIFIED'
        );

        if (thalesFact || thalesRel) {
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'THALES_INSCRIBED_RIGHT_ANGLE',
              status: 'VERIFIED',
              isProven: true,
              explanation:
                thalesFact?.title ||
                thalesFact?.basis ||
                thalesRel?.description ||
                'Теорема Фалеса строго доказана: угол треугольника опирается на диаметр и равен 90°.',
              matchedFact: thalesFact,
              matchedRelation: thalesRel,
            },
          };
        } else {
          return {
            success: true,
            command: 'VERIFY_RELATION',
            stateChanged: false,
            nextState: state,
            previousState: state,
            verification: {
              relation: 'THALES_INSCRIBED_RIGHT_ANGLE',
              status: 'REFUTED',
              isProven: false,
              explanation:
                'Теорема Фалеса не выполняется: ни одна сторона треугольника не является диаметром окружности.',
            },
          };
        }
      }

      if (relType === 'ANGLE_BISECTOR' || relType === 'ANGLE_BISECTOR_OF') {
        const matched = allRelations.find(
          (r) => r.relationType === 'ANGLE_BISECTOR_OF' && (!subjId || r.sourceEntityId === subjId)
        );
        return {
          success: true,
          command: 'VERIFY_RELATION',
          stateChanged: false,
          nextState: state,
          previousState: state,
          verification: {
            relation: 'ANGLE_BISECTOR',
            status: matched ? 'VERIFIED' : 'REFUTED',
            isProven: Boolean(matched),
            explanation: matched
              ? `Линия ${matched.sourceEntityId} доказанно является биссектрисой угла.`
              : `Биссектриса для "${command.subject}" не найдена среди доказанных отношений.`,
            matchedRelation: matched,
          },
        };
      }

      if (relType === 'PERPENDICULAR_BISECTOR' || relType === 'PERPENDICULAR_BISECTOR_OF') {
        const matched = allRelations.find(
          (r) => r.relationType === 'PERPENDICULAR_BISECTOR_OF' && (!subjId || r.sourceEntityId === subjId)
        );
        return {
          success: true,
          command: 'VERIFY_RELATION',
          stateChanged: false,
          nextState: state,
          previousState: state,
          verification: {
            relation: 'PERPENDICULAR_BISECTOR',
            status: matched ? 'VERIFIED' : 'REFUTED',
            isProven: Boolean(matched),
            explanation: matched
              ? `Линия ${matched.sourceEntityId} доказанно является серединным перпендикуляром.`
              : `Серединный перпендикуляр для "${command.subject}" не найден среди доказанных отношений.`,
            matchedRelation: matched,
          },
        };
      }

      const genericMatched = allRelations.find(
        (r) =>
          r.relationType === relType ||
          r.relationType.startsWith(relType) ||
          r.id.toLowerCase().includes(relType.toLowerCase())
      );

      return {
        success: true,
        command: 'VERIFY_RELATION',
        stateChanged: false,
        nextState: state,
        previousState: state,
        verification: {
          relation: relType,
          status: genericMatched ? 'VERIFIED' : 'UNVERIFIED',
          isProven: Boolean(genericMatched?.status === 'VERIFIED'),
          explanation: genericMatched
            ? `Отношение ${relType} найдено в модели стенда: ${genericMatched.description}`
            : `Отношение ${relType} не найдено в текущем геометрическом состоянии.`,
          matchedRelation: genericMatched,
        },
      };
    }

    // ------------------------------------------------------------------------
    // F. PROJECT PERSISTENCE (SAVE / LOAD)
    // ------------------------------------------------------------------------
    case 'SAVE_PROJECT': {
      const project = createGeometryProject(state, {
        name: command.name,
        description: command.description,
        author: command.author,
        tags: command.tags,
        benchmarkId: command.benchmarkId,
      });
      const serialized = serializeGeometryProject(project, { pretty: command.pretty ?? true });

      return {
        success: true,
        command: 'SAVE_PROJECT',
        stateChanged: false,
        nextState: state,
        previousState: state,
        savedProject: project,
        serializedProject: serialized,
        infoMessage: `Проект "${project.metadata.name}" успешно сериализован в JSON (версия ${project.version}).`,
      };
    }

    case 'LOAD_PROJECT': {
      const result = deserializeGeometryProject(command.project);

      if (result.success === false) {
        const firstErr = result.errors[0];
        let errCode: SemanticCommandErrorCode = 'INVALID_PROJECT_FORMAT';
        if (firstErr?.code === 'UNSUPPORTED_VERSION') errCode = 'UNSUPPORTED_PROJECT_VERSION';
        else if (firstErr?.code === 'CORRUPTED_ENTITY' || firstErr?.code === 'DANGLING_REFERENCE' || firstErr?.code === 'DUPLICATE_ID') {
          errCode = 'CORRUPTED_PROJECT';
        }

        return {
          success: false,
          command: 'LOAD_PROJECT',
          stateChanged: false,
          nextState: state,
          previousState: state,
          errorCode: errCode,
          errorMessage: `Ошибка загрузки проекта: ${result.errors.map((e) => e.message).join('; ')}`,
        };
      }

      const configView = buildConfigurationView(result.restoredState);

      return {
        success: true,
        command: 'LOAD_PROJECT',
        stateChanged: true,
        nextState: result.restoredState,
        previousState: state,
        savedProject: result.project,
        derivedRelations: extractSemanticRelations(result.restoredState),
        measurements: extractSemanticQuantities(result.restoredState),
        configurationSummary: configView.summary,
        infoMessage: `Проект "${result.project.metadata.name}" (v${result.project.version}) успешно загружен и детерминированно пересчитан.`,
      };
    }

    // ------------------------------------------------------------------------
    // G. BATCH COMMANDS
    // ------------------------------------------------------------------------
    case 'BATCH_SEMANTIC_COMMANDS': {
      let currentState = state;
      const allCreated: SemanticEntitySummary[] = [];
      const allAffected: string[] = [];

      for (const cmd of command.commands) {
        const res = executeSemanticCommand(currentState, cmd);
        if (!res.success) {
          // Transactional abort: if any sub-command fails, state remains at initial state
          return {
            success: false,
            command: 'BATCH_SEMANTIC_COMMANDS',
            stateChanged: false,
            nextState: state,
            previousState: state,
            errorCode: res.errorCode || 'UNKNOWN_ERROR',
            errorMessage: `Ошибка в подкоманде "${cmd.command}": ${res.errorMessage}`,
          };
        }
        currentState = res.nextState;
        if (res.createdEntities) allCreated.push(...res.createdEntities);
        if (res.affectedEntities) allAffected.push(...res.affectedEntities);
      }

      const configView = buildConfigurationView(currentState);

      return {
        success: true,
        command: 'BATCH_SEMANTIC_COMMANDS',
        stateChanged: currentState !== state,
        nextState: currentState,
        previousState: state,
        createdEntities: allCreated,
        affectedEntities: Array.from(new Set(allAffected)),
        derivedRelations: extractSemanticRelations(currentState),
        measurements: extractSemanticQuantities(currentState),
        configurationSummary: configView.summary,
      };
    }

    default:
      return {
        success: false,
        command: (command as any).command || 'UNKNOWN_ERROR',
        stateChanged: false,
        nextState: state,
        previousState: state,
        errorCode: 'INVALID_COMMAND',
        errorMessage: `Неизвестная семантическая команда: ${(command as any).command}`,
      };
  }
}
