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

      const nextState = dispatchGeometryCommand(state, {
        type: 'ERASE_OBJECT',
        id: command.id,
        objectType: command.objectType,
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
    // E. BATCH COMMANDS
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
