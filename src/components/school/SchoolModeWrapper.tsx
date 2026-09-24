// src/components/school/SchoolModeWrapper.tsx
// Interaction Layer & Multi-Step Tool State Machine for School Mode
// Invariant: Translates user actions into Core commands; GeometryState remains single source of truth.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SchoolTool, ToolState, SchoolPreviewData, RulerMeasurement } from './schoolTypes';
import {
  FullGeometryState,
  GeometryCommand,
  calculateEuclideanDistance,
  dispatchGeometryCommand,
  snapToGeometry,
  applyPerpendicularBisector,
  applyAngleBisector,
  getValidAngleBisectorTargets,
  applyPerpendicularLine,
  applyParallelLine,
  pointToLineDistance,
  computeParallelPreviewIntersections,
  computePerpendicularPreviewIntersections,
} from '../../engines/geometryState';
import { SchoolToolbar } from './SchoolToolbar';

interface SchoolModeWrapperProps {
  geometryState: FullGeometryState;
  onDispatchCommand: (cmd: GeometryCommand) => void;
  scale?: number;
  activeTool: SchoolTool;
  onChangeTool: (tool: SchoolTool) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  children: (props: {
    toolState: ToolState;
    previewData: SchoolPreviewData | null;
    handlePointerDown: (
      modelPos: { x: number; y: number },
      screenPos: { x: number; y: number },
      target?: { type: 'point' | 'segment' | 'line' | 'circle'; id: string }
    ) => void;
    handlePointerMove: (
      modelPos: { x: number; y: number },
      screenPos: { x: number; y: number }
    ) => void;
    handlePointerUp: () => void;
  }) => React.ReactNode;
}

export const SchoolModeWrapper: React.FC<SchoolModeWrapperProps> = ({
  geometryState,
  onDispatchCommand,
  scale = 1.0,
  activeTool,
  onChangeTool,
  onUndo,
  canUndo = false,
  children,
}) => {
  const [toolState, setToolState] = useState<ToolState>({
    tool: activeTool,
    status: 'IDLE',
    firstPoint: undefined,
    previewPoint: undefined,
    rulerMeasurement: null,
    hoverTarget: null,
    hoverSmartTargetId: null,
    lastActionMessage: null,
  });

  // Dynamically discover valid angle bisector targets from existing GeometryState
  const angleBisectorTargets = useMemo(() => {
    if (activeTool === 'angle_bisector') {
      return getValidAngleBisectorTargets(geometryState);
    }
    return [];
  }, [activeTool, geometryState]);

  // When activeTool changes from props, cancel any pending multi-step operation
  useEffect(() => {
    setToolState((prev) => ({
      ...prev,
      tool: activeTool,
      status: 'IDLE',
      firstPoint: undefined,
      secondPoint: undefined,
      selectedLineId: undefined,
      previewPoint: undefined,
      hoverSmartTargetId: null,
      lastActionMessage: null,
    }));
  }, [activeTool]);

  // Cancel multi-step operation (ESC or Cancel button)
  const handleCancelOperation = useCallback(() => {
    setToolState((prev) => ({
      ...prev,
      status: 'IDLE',
      firstPoint: undefined,
      secondPoint: undefined,
      selectedLineId: undefined,
      previewPoint: undefined,
      hoverSmartTargetId: null,
      lastActionMessage: null,
    }));
    if (activeTool === 'erase') {
      onChangeTool('select');
    }
  }, [activeTool, onChangeTool]);

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelOperation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelOperation]);

  const handleClearRuler = useCallback(() => {
    setToolState((prev) => ({
      ...prev,
      rulerMeasurement: null,
    }));
  }, []);

  const handleClearConstructions = useCallback(() => {
    handleCancelOperation();
    onDispatchCommand({ type: 'CLEAR_USER_CONSTRUCTIONS' });
  }, [handleCancelOperation, onDispatchCommand]);

  // Helper to ensure a point exists in GeometryState, returning its ID
  const getOrCreatePoint = useCallback(
    (pos: { x: number; y: number }, snapDist: number = 8): { id: string; x: number; y: number } => {
      const snap = snapToGeometry(pos, geometryState, snapDist);
      if (snap.snappedPointId) {
        return {
          id: snap.snappedPointId,
          x: snap.x,
          y: snap.y,
        };
      }

      // Create new point through Core command
      const nextCount = geometryState.pointCounter + 1;
      const newId = `P${nextCount}`;
      onDispatchCommand({
        type: 'ADD_POINT',
        point: {
          id: newId,
          name: newId,
          x: snap.x,
          y: snap.y,
          u: snap.u,
          onCircle: snap.snappedToCircle,
        },
      });

      return {
        id: newId,
        x: snap.x,
        y: snap.y,
      };
    },
    [geometryState, onDispatchCommand]
  );

  // Pointer Down handler
  const handlePointerDown = useCallback(
    (
      rawModelPos: { x: number; y: number },
      _screenPos: { x: number; y: number },
      target?: { type: 'point' | 'segment' | 'line' | 'circle'; id: string }
    ) => {
      const snap = snapToGeometry(rawModelPos, geometryState, 10);
      const modelPos = { x: snap.x, y: snap.y };

      switch (activeTool) {
        case 'select': {
          // Handled via drag interactions in CanvasStage
          break;
        }

        case 'point': {
          // Add point directly via Core command
          getOrCreatePoint(rawModelPos, 6);
          break;
        }

        case 'segment': {
          if (toolState.status === 'IDLE') {
            const p1 = getOrCreatePoint(rawModelPos, 10);
            setToolState((prev) => ({
              ...prev,
              status: 'POINT_1_SELECTED',
              firstPoint: p1,
              previewPoint: modelPos,
            }));
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
            const p2 = getOrCreatePoint(rawModelPos, 10);
            if (p2.id !== toolState.firstPoint.id) {
              onDispatchCommand({
                type: 'ADD_SEGMENT',
                segment: {
                  p1Id: toolState.firstPoint.id!,
                  p2Id: p2.id,
                },
              });
            }
            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'line': {
          if (toolState.status === 'IDLE') {
            const p1 = getOrCreatePoint(rawModelPos, 10);
            setToolState((prev) => ({
              ...prev,
              status: 'POINT_1_SELECTED',
              firstPoint: p1,
              previewPoint: modelPos,
            }));
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
            const p2 = getOrCreatePoint(rawModelPos, 10);
            if (p2.id !== toolState.firstPoint.id) {
              onDispatchCommand({
                type: 'ADD_LINE',
                line: {
                  p1Id: toolState.firstPoint.id!,
                  p2Id: p2.id,
                },
              });
            }
            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'circle': {
          if (toolState.status === 'IDLE') {
            const center = getOrCreatePoint(rawModelPos, 10);
            setToolState((prev) => ({
              ...prev,
              status: 'POINT_1_SELECTED',
              firstPoint: center,
              previewPoint: modelPos,
            }));
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
            const radPt = getOrCreatePoint(rawModelPos, 10);
            const r = calculateEuclideanDistance(toolState.firstPoint, radPt);
            if (r > 1e-3) {
              onDispatchCommand({
                type: 'ADD_CIRCLE',
                circle: {
                  centerId: toolState.firstPoint.id!,
                  radiusPointId: radPt.id,
                  radius: r,
                },
              });
            }
            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'ruler': {
          if (toolState.status === 'IDLE') {
            setToolState((prev) => ({
              ...prev,
              status: 'POINT_1_SELECTED',
              firstPoint: { x: modelPos.x, y: modelPos.y, id: snap.snappedPointId },
              previewPoint: modelPos,
            }));
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
            const p1 = toolState.firstPoint;
            const p2 = modelPos;
            const dist = calculateEuclideanDistance(p1, p2);

            const measurement: RulerMeasurement = {
              p1,
              p2,
              distanceModel: dist,
              distanceMm: dist * scale,
              distancePx: dist,
            };

            // Notice: RULER ONLY updates local toolState measurement.
            // It MUST NOT dispatch any mutation to GeometryState!
            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              previewPoint: undefined,
              rulerMeasurement: measurement,
            }));
          }
          break;
        }

        case 'compass': {
          if (toolState.status === 'IDLE') {
            const center = getOrCreatePoint(rawModelPos, 10);
            setToolState((prev) => ({
              ...prev,
              status: 'POINT_1_SELECTED',
              firstPoint: center,
              previewPoint: modelPos,
            }));
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
            const radPt = getOrCreatePoint(rawModelPos, 10);
            const r = calculateEuclideanDistance(toolState.firstPoint, radPt);
            if (r > 1e-3) {
              onDispatchCommand({
                type: 'ADD_CIRCLE',
                circle: {
                  centerId: toolState.firstPoint.id!,
                  radiusPointId: radPt.id,
                  radius: r,
                },
              });
            }
            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'perp_bisector': {
          // Direct click on existing segment: instant bisector construction
          if (target && target.type === 'segment') {
            const seg = geometryState.segments[target.id];
            if (seg) {
              const { plan } = applyPerpendicularBisector(geometryState, seg.p1Id, seg.p2Id);
              if (plan.success) {
                onDispatchCommand({
                  type: 'BATCH_COMMANDS',
                  commands: plan.commands,
                });
              }
              setToolState((prev) => ({
                ...prev,
                status: 'IDLE',
                firstPoint: undefined,
                previewPoint: undefined,
              }));
              break;
            }
          }

          // Two-point selection mode
          if (toolState.status === 'IDLE') {
            const pt1 = getOrCreatePoint(rawModelPos, 10);
            setToolState((prev) => ({
              ...prev,
              status: 'POINT_1_SELECTED',
              firstPoint: pt1,
              previewPoint: modelPos,
            }));
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
            const pt2 = getOrCreatePoint(rawModelPos, 10);
            if (toolState.firstPoint.id && pt2.id && toolState.firstPoint.id !== pt2.id) {
              const { plan } = applyPerpendicularBisector(
                geometryState,
                toolState.firstPoint.id,
                pt2.id
              );
              if (plan.success) {
                onDispatchCommand({
                  type: 'BATCH_COMMANDS',
                  commands: plan.commands,
                });
              }
            }
            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'angle_bisector': {
          // Direct Smart Target Selection:
          // Find if user clicked on or near a valid angle vertex
          const clickedTarget = angleBisectorTargets.find((t) => {
            if (target && target.type === 'point' && target.id === t.targetId) return true;
            if (snap.snappedPointId && snap.snappedPointId === t.targetId) return true;
            const pt = geometryState.points[t.vertexPointId];
            if (pt && Math.hypot(pt.x - rawModelPos.x, pt.y - rawModelPos.y) < 18) return true;
            return false;
          });

          if (clickedTarget) {
            // Apply existing classical angle bisector construction
            const { plan } = applyAngleBisector(
              geometryState,
              clickedTarget.arm1PointId,
              clickedTarget.vertexPointId,
              clickedTarget.arm2PointId
            );

            if (plan.success) {
              onDispatchCommand({
                type: 'BATCH_COMMANDS',
                commands: plan.commands,
              });
              setToolState((prev) => ({
                ...prev,
                status: 'IDLE',
                firstPoint: undefined,
                secondPoint: undefined,
                previewPoint: undefined,
                hoverSmartTargetId: null,
                lastActionMessage: `Биссектриса угла ${clickedTarget.vertexName} построена`,
              }));
            }
          }
          // If clicked outside of any valid target: zero mutation to GeometryState
          break;
        }

        case 'perpendicular': {
          if (toolState.status === 'IDLE') {
            // Step 1: Select line or segment L
            let targetLineId: string | undefined;
            if (target && (target.type === 'line' || target.type === 'segment')) {
              targetLineId = target.id;
            } else {
              // Check if user clicked near any line or segment
              let bestDist = 12;
              for (const seg of Object.values(geometryState.segments)) {
                const p1 = geometryState.points[seg.p1Id];
                const p2 = geometryState.points[seg.p2Id];
                if (p1 && p2) {
                  const d = pointToLineDistance(rawModelPos, p1, p2);
                  if (d < bestDist) {
                    bestDist = d;
                    targetLineId = seg.id;
                  }
                }
              }
              for (const l of Object.values(geometryState.lines)) {
                const p1 = geometryState.points[l.p1Id];
                const p2 = geometryState.points[l.p2Id];
                if (p1 && p2) {
                  const d = pointToLineDistance(rawModelPos, p1, p2);
                  if (d < bestDist) {
                    bestDist = d;
                    targetLineId = l.id;
                  }
                }
              }
            }

            if (targetLineId) {
              setToolState((prev) => ({
                ...prev,
                status: 'POINT_1_SELECTED',
                selectedLineId: targetLineId,
                previewPoint: modelPos,
              }));
            }
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.selectedLineId) {
            // Step 2: Atomic commit of perpendicular line + all intersections
            const pointPInput = snap.snappedPointId
              ? snap.snappedPointId
              : { x: snap.x, y: snap.y };

            const { plan } = applyPerpendicularLine(
              geometryState,
              toolState.selectedLineId,
              pointPInput
            );

            if (plan.success) {
              onDispatchCommand({
                type: 'BATCH_COMMANDS',
                commands: plan.commands,
              });
            }

            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              secondPoint: undefined,
              selectedLineId: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'parallel': {
          if (toolState.status === 'IDLE') {
            // Step 1: Select line or segment L
            let targetLineId: string | undefined;
            if (target && (target.type === 'line' || target.type === 'segment')) {
              targetLineId = target.id;
            } else {
              // Check if user clicked near any line or segment
              let bestDist = 12;
              for (const seg of Object.values(geometryState.segments)) {
                const p1 = geometryState.points[seg.p1Id];
                const p2 = geometryState.points[seg.p2Id];
                if (p1 && p2) {
                  const d = pointToLineDistance(rawModelPos, p1, p2);
                  if (d < bestDist) {
                    bestDist = d;
                    targetLineId = seg.id;
                  }
                }
              }
              for (const l of Object.values(geometryState.lines)) {
                const p1 = geometryState.points[l.p1Id];
                const p2 = geometryState.points[l.p2Id];
                if (p1 && p2) {
                  const d = pointToLineDistance(rawModelPos, p1, p2);
                  if (d < bestDist) {
                    bestDist = d;
                    targetLineId = l.id;
                  }
                }
              }
            }

            if (targetLineId) {
              setToolState((prev) => ({
                ...prev,
                status: 'POINT_1_SELECTED',
                selectedLineId: targetLineId,
                previewPoint: modelPos,
              }));
            }
          } else if (toolState.status === 'POINT_1_SELECTED' && toolState.selectedLineId) {
            // Step 2: Atomic commit of parallel line + all intersections
            const pointPInput = snap.snappedPointId
              ? snap.snappedPointId
              : { x: snap.x, y: snap.y };

            const { plan } = applyParallelLine(
              geometryState,
              toolState.selectedLineId,
              pointPInput
            );

            if (plan.success) {
              onDispatchCommand({
                type: 'BATCH_COMMANDS',
                commands: plan.commands,
              });
            }

            setToolState((prev) => ({
              ...prev,
              status: 'IDLE',
              firstPoint: undefined,
              secondPoint: undefined,
              selectedLineId: undefined,
              previewPoint: undefined,
            }));
          }
          break;
        }

        case 'erase': {
          if (target) {
            onDispatchCommand({
              type: 'ERASE_OBJECT',
              objectType: target.type,
              id: target.id,
            });
          } else if (snap.snappedPointId && !geometryState.points[snap.snappedPointId]?.isBaseVertex) {
            onDispatchCommand({
              type: 'ERASE_OBJECT',
              objectType: 'point',
              id: snap.snappedPointId,
            });
          }
          break;
        }

        default:
          break;
      }
    },
    [activeTool, toolState, angleBisectorTargets, geometryState, getOrCreatePoint, onDispatchCommand, scale]
  );

  // Pointer Move handler (updates smart target hover and temporary preview point)
  const handlePointerMove = useCallback(
    (rawModelPos: { x: number; y: number }, _screenPos: { x: number; y: number }) => {
      if (activeTool === 'angle_bisector') {
        const hoveredTarget = angleBisectorTargets.find((t) => {
          const pt = geometryState.points[t.vertexPointId];
          if (pt && Math.hypot(pt.x - rawModelPos.x, pt.y - rawModelPos.y) < 20) return true;
          return false;
        });

        const newTargetId = hoveredTarget ? hoveredTarget.targetId : null;
        setToolState((prev) => {
          if (prev.hoverSmartTargetId === newTargetId) return prev;
          return {
            ...prev,
            hoverSmartTargetId: newTargetId,
          };
        });
        return;
      }

      if (toolState.status === 'POINT_1_SELECTED' || toolState.status === 'POINT_2_SELECTED') {
        const snap = snapToGeometry(rawModelPos, geometryState, 10);
        setToolState((prev) => ({
          ...prev,
          previewPoint: { x: snap.x, y: snap.y },
        }));
      }
    },
    [activeTool, angleBisectorTargets, toolState.status, geometryState]
  );

  const handlePointerUp = useCallback(() => {
    // Select tool dragging up is handled in CanvasStage
  }, []);

  // Compute preview data for the canvas
  const previewData: SchoolPreviewData | null = useMemo(() => {
    if (!toolState.previewPoint) {
      return null;
    }

    if (toolState.status === 'POINT_1_SELECTED' && toolState.firstPoint) {
      let radius: number | undefined;
      if (activeTool === 'circle' || activeTool === 'compass') {
        radius = calculateEuclideanDistance(toolState.firstPoint, toolState.previewPoint);
      }

      return {
        tool: activeTool,
        firstPoint: toolState.firstPoint,
        currentPoint: toolState.previewPoint,
        radius,
      };
    }

    if (toolState.status === 'POINT_1_SELECTED' && toolState.selectedLineId) {
      const lineObj =
        geometryState.lines[toolState.selectedLineId] ||
        geometryState.segments[toolState.selectedLineId];
      if (lineObj) {
        const pt1 = geometryState.points[lineObj.p1Id];
        const pt2 = geometryState.points[lineObj.p2Id];
        if (pt1 && pt2) {
          const transientIntersections =
            activeTool === 'parallel'
              ? computeParallelPreviewIntersections(
                  { p1: pt1, p2: pt2 },
                  toolState.previewPoint,
                  geometryState
                )
              : activeTool === 'perpendicular'
              ? computePerpendicularPreviewIntersections(
                  { p1: pt1, p2: pt2 },
                  toolState.previewPoint,
                  geometryState
                )
              : undefined;

          return {
            tool: activeTool,
            currentPoint: toolState.previewPoint,
            selectedLineId: toolState.selectedLineId,
            referenceLineCoords: {
              p1: { x: pt1.x, y: pt1.y },
              p2: { x: pt2.x, y: pt2.y },
            },
            transientIntersections,
          };
        }
      }
    }

    if (toolState.status === 'POINT_2_SELECTED' && toolState.secondPoint) {
      return {
        tool: activeTool,
        firstPoint: toolState.secondPoint,
        currentPoint: toolState.previewPoint,
      };
    }

    return null;
  }, [
    toolState.status,
    toolState.firstPoint,
    toolState.secondPoint,
    toolState.selectedLineId,
    toolState.previewPoint,
    activeTool,
    geometryState,
  ]);

  const enrichedToolState = useMemo(
    () => ({
      ...toolState,
      angleBisectorTargets,
    }),
    [toolState, angleBisectorTargets]
  );

  return (
    <div className="flex flex-col w-full h-full gap-2">
      <SchoolToolbar
        activeTool={activeTool}
        onChangeTool={onChangeTool}
        toolState={enrichedToolState}
        onCancelOperation={handleCancelOperation}
        onClearRuler={handleClearRuler}
        onClearConstructions={handleClearConstructions}
        onUndo={onUndo}
        canUndo={canUndo}
        scale={scale}
      />
      <div className="flex-1 min-h-0 w-full relative">
        {children({
          toolState: enrichedToolState,
          previewData,
          handlePointerDown,
          handlePointerMove,
          handlePointerUp,
        })}
      </div>
    </div>
  );
};
