import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActiveHighlight, FrozenSnapshot, ScaleMode } from './types';
import { ClassicalEngine } from './engines/classicalEngine';
import { MatrixEngine } from './engines/matrixEngine';
import {
  computeGeometryBase,
  FullGeometryState,
  createDefaultGeometryState,
  dispatchGeometryCommand,
  GeometryCommand,
  solveTargetAngle,
  solveTriangleConfiguration,
  TriangleAngleInputSpec,
  VertexId,
} from './engines/geometryState';
import {
  createInitialHistory,
  pushHistoryState,
  popHistoryState,
  canUndo,
  GeometryHistory,
} from './engines/geometryHistory';
import { createGeometrySnapshot, computeTransition } from './engines/temporalObserver';
import { CanvasStage } from './components/CanvasStage';
import { RelationMap } from './components/RelationMap';
import { TriangleStateTable } from './components/TriangleStateTable';
import { ArcChordTable } from './components/ArcChordTable';
import { TopologicalClassCard } from './components/TopologicalClassCard';
import { FreezeCard } from './components/FreezeCard';
import { EngineBenchmarkPanel } from './components/EngineBenchmarkPanel';
import { LearningGuide } from './components/LearningGuide';
import { InteractiveTextbook } from './components/InteractiveTextbook';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceSplitter } from './components/layout/WorkspaceSplitter';
import {
  CircleDot,
  Sparkles,
  RefreshCw,
  Activity,
  GraduationCap,
  PencilRuler,
  Microscope,
  Undo2,
} from 'lucide-react';
import { SchoolTool } from './components/school/schoolTypes';
import { SchoolModeWrapper } from './components/school/SchoolModeWrapper';
import { SchoolObjectInventory } from './components/school/SchoolObjectInventory';
import { ResearchObservationPanel } from './components/research/ResearchObservationPanel';
import { GeometryConfigurationPanel } from './components/configuration/GeometryConfigurationPanel';
import { Table } from 'lucide-react';

export default function App() {
  // Primary Stand Mode: 'research' (Лаборатория / Исследование) | 'school' (Школьный режим / Чертёжные инструменты)
  const [standMode, setStandMode] = useState<'research' | 'school'>('research');

  // Active Tool in School Mode
  const [activeSchoolTool, setActiveSchoolTool] = useState<SchoolTool>('select');

  // Geometric State (positions on normalized circle [0, 1))
  const [pointsU, setPointsU] = useState<{ A: number; B: number; C: number }>({
    A: 0.12,
    B: 0.45,
    C: 0.78,
  });

  const R = 100; // Standard radius

  // Single Source of Geometric Truth for School Constructions & Invariants
  const [geometryState, setGeometryState] = useState<FullGeometryState>(() =>
    createDefaultGeometryState(
      {
        A: 0.12,
        B: 0.45,
        C: 0.78,
      },
      R
    )
  );

  // Centralized Geometry Undo History Stack
  const [history, setHistory] = useState<GeometryHistory>(() =>
    createInitialHistory(
      createDefaultGeometryState(
        {
          A: 0.12,
          B: 0.45,
          C: 0.78,
        },
        R
      )
    )
  );

  // Workspace Splitter State (35% to 75%, default 50%)
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rotation around center O (in degrees [0, 360))
  const [rotationDeg, setRotationDeg] = useState<number>(0);

  // Pre-drag snapshot to record history only on completed drag
  const preDragSnapshotRef = useRef<{
    geometryState: FullGeometryState;
    pointsU: { A: number; B: number; C: number };
    rotationDeg: number;
  } | null>(null);

  const handleDragStart = useCallback(() => {
    preDragSnapshotRef.current = {
      geometryState,
      pointsU,
      rotationDeg,
    };
  }, [geometryState, pointsU, rotationDeg]);

  const handleDragCommit = useCallback(() => {
    if (preDragSnapshotRef.current) {
      const prev = preDragSnapshotRef.current;
      if (
        prev.pointsU.A !== pointsU.A ||
        prev.pointsU.B !== pointsU.B ||
        prev.pointsU.C !== pointsU.C ||
        prev.rotationDeg !== rotationDeg ||
        prev.geometryState !== geometryState
      ) {
        setHistory((curr) => pushHistoryState(curr, prev.geometryState));
      }
      preDragSnapshotRef.current = null;
    }
  }, [pointsU, rotationDeg, geometryState]);

  // Protractor and Arcs Scale Mode: 'degrees' | 'radians' | 'fractions'
  const [scaleMode, setScaleMode] = useState<ScaleMode>('degrees');

  // Educational scale factor (default: 1 px = 1 mm)
  const [scale, setScale] = useState<number>(1.0);

  // Selected Geometric Entity in School Context Reference
  const [selectedSchoolEntityId, setSelectedSchoolEntityId] = useState<string | null>(null);

  // Right Panel Active Tab: 'school' | 'stats' | 'config' | 'learning'
  const [rightPanelTab, setRightPanelTab] = useState<'school' | 'stats' | 'config' | 'learning'>('stats');

  const [currentEngine, setCurrentEngine] = useState<'classical' | 'matrix'>('classical');
  const [verifyEnabled, setVerifyEnabled] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenSnapshot, setFrozenSnapshot] = useState<FrozenSnapshot | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight>(null);
  const [mode, setMode] = useState<'explore' | 'learn'>('explore');

  // Pure Geometry Core Command Dispatcher
  const handleDispatchCommand = useCallback(
    (cmd: GeometryCommand) => {
      // For non-drag commands, record previous state into history before modifying
      if (cmd.type !== 'MOVE_POINT') {
        setHistory((curr) => pushHistoryState(curr, geometryState));
      }

      setGeometryState((prev) => {
        const next = dispatchGeometryCommand(prev, cmd);
        if (
          next.pointsU.A !== pointsU.A ||
          next.pointsU.B !== pointsU.B ||
          next.pointsU.C !== pointsU.C
        ) {
          setPointsU(next.pointsU);
          setBaselineSnapshot(createGeometrySnapshot({ pointsU: next.pointsU, R, scale }));
        }
        return next;
      });
    },
    [geometryState, pointsU, R, scale]
  );

  // Update base points from Canvas dragging or Presets
  const handleChangePointsU = useCallback(
    (newPts: { A: number; B: number; C: number }) => {
      setPointsU(newPts);
      setGeometryState((prev) =>
        dispatchGeometryCommand(prev, {
          type: 'SYNC_BASE_POINTS',
          pointsU: newPts,
          R,
        })
      );
    },
    [R]
  );

  // Target Angle input handler (Minimal Geometric Disturbance solver for single angle)
  const handleApplyTargetAngle = useCallback(
    (vertexId: VertexId, targetAngleDeg: number) => {
      const solution = solveTargetAngle(pointsU, vertexId, targetAngleDeg);
      if (!solution.success || !solution.nextPointsU) {
        return { success: false, error: solution.error };
      }
      // Record previous state for single-step atomic undo
      setHistory((curr) => pushHistoryState(curr, geometryState));
      setPointsU(solution.nextPointsU);
      setGeometryState((prev) =>
        dispatchGeometryCommand(prev, {
          type: 'SYNC_BASE_POINTS',
          pointsU: solution.nextPointsU!,
          R,
        })
      );
      setBaselineSnapshot(createGeometrySnapshot({ pointsU: solution.nextPointsU, R, scale }));
      return { success: true };
    },
    [geometryState, pointsU, R, scale]
  );

  // Full Triangle Configuration solver (Two Angles -> Auto 3rd, or Three Angles with sum=180°)
  const handleApplyTriangleAngles = useCallback(
    (spec: TriangleAngleInputSpec) => {
      const solution = solveTriangleConfiguration(pointsU, spec);
      if (!solution.success || !solution.nextPointsU) {
        return {
          success: false,
          error: solution.error,
          infoMessage: solution.infoMessage,
        };
      }
      // Record previous state for single-step atomic undo
      setHistory((curr) => pushHistoryState(curr, geometryState));
      setPointsU(solution.nextPointsU);
      setGeometryState((prev) =>
        dispatchGeometryCommand(prev, {
          type: 'SYNC_BASE_POINTS',
          pointsU: solution.nextPointsU!,
          R,
        })
      );
      setBaselineSnapshot(createGeometrySnapshot({ pointsU: solution.nextPointsU, R, scale }));
      return {
        success: true,
        resolvedAngles: solution.resolvedAngles,
      };
    },
    [geometryState, pointsU, R, scale]
  );

  const handleMoveSchoolPoint = useCallback(
    (pointId: string, modelPos: { x: number; y: number }) => {
      handleDispatchCommand({
        type: 'MOVE_POINT',
        pointId,
        x: modelPos.x,
        y: modelPos.y,
      });
    },
    [handleDispatchCommand]
  );

  // Centralized Geometry Undo Action
  const canUndoAction = canUndo(history);

  const handleUndo = useCallback(() => {
    const popped = popHistoryState(history);
    if (!popped) return;

    setHistory(popped.newHistory);
    const restored = popped.restoredState;
    setGeometryState(restored);
    setPointsU(restored.pointsU);
    setBaselineSnapshot(createGeometrySnapshot({ pointsU: restored.pointsU, R, scale }));

    // Deselect entity if no longer present in restored state
    if (selectedSchoolEntityId) {
      const exists =
        restored.points[selectedSchoolEntityId] ||
        restored.segments[selectedSchoolEntityId] ||
        restored.lines[selectedSchoolEntityId] ||
        restored.circles[selectedSchoolEntityId];
      if (!exists) {
        setSelectedSchoolEntityId(null);
      }
    }
  }, [history, R, scale, selectedSchoolEntityId]);

  // Global Ctrl+Z / Cmd+Z shortcut for Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);


  // Compute geometry & engine results
  const classicalEngine = useMemo(() => new ClassicalEngine(), []);
  const matrixEngine = useMemo(() => new MatrixEngine(), []);

  const classicalResult = useMemo(
    () => classicalEngine.compute(pointsU, R),
    [classicalEngine, pointsU, R]
  );

  const matrixResult = useMemo(
    () => matrixEngine.compute(pointsU, R),
    [matrixEngine, pointsU, R]
  );

  const activeResult = currentEngine === 'classical' ? classicalResult : matrixResult;
  const geoBase = useMemo(() => computeGeometryBase(pointsU, R), [pointsU, R]);

  // Baseline snapshot for temporal observation (t0 -> t1)
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    createGeometrySnapshot({ pointsU, R, scale })
  );

  // Current snapshot derived purely from geometry parameters (Rule 3: Snapshot !== EngineResult)
  const currentSnapshot = useMemo(
    () => createGeometrySnapshot({ pointsU, R, scale }),
    [pointsU, R, scale]
  );

  // Dynamic transition & deltas
  const transition = useMemo(
    () => computeTransition(baselineSnapshot, currentSnapshot),
    [baselineSnapshot, currentSnapshot]
  );

  // Handlers
  const handleSelectPreset = (type: 'acute' | 'right' | 'obtuse') => {
    setHistory((curr) => pushHistoryState(curr, geometryState));
    let newPts = { A: 0.08, B: 0.42, C: 0.75 };
    if (type === 'acute') {
      newPts = { A: 0.08, B: 0.42, C: 0.75 };
    } else if (type === 'right') {
      newPts = { A: 0.0, B: 0.5, C: 0.25 };
    } else if (type === 'obtuse') {
      newPts = { A: 0.04, B: 0.18, C: 0.76 };
    }
    handleChangePointsU(newPts);
    setBaselineSnapshot(createGeometrySnapshot({ pointsU: newPts, R, scale }));
  };

  const handleReset = () => {
    setHistory((curr) => pushHistoryState(curr, geometryState));
    const defaultPts = { A: 0.08, B: 0.42, C: 0.75 };
    handleChangePointsU(defaultPts);
    setRotationDeg(0);
    setBaselineSnapshot(createGeometrySnapshot({ pointsU: defaultPts, R, scale }));
  };

  const handleToggleFreeze = () => {
    if (isFrozen) {
      setIsFrozen(false);
    } else {
      setFrozenSnapshot({
        timestamp: Date.now(),
        points: { ...pointsU },
        R,
        classicalResult: { ...classicalResult },
        matrixResult: { ...matrixResult },
      });
      setIsFrozen(true);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F8FAFC] text-slate-800 select-none font-sans">
      {/* Top Header (Fixed bar, does not scroll) */}
      <header className="flex-none w-full border-b border-slate-200 bg-white px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-100">
            <CircleDot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm leading-tight text-slate-900">
                Circle Triangle Stand
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {Math.round(splitPercent)} / {Math.round(100 - splitPercent)} WORKBENCH
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Геометрический стенд : Исследование и школьные чертёжные инструменты
            </p>
          </div>
        </div>

        {/* Primary Stand Mode Switcher (Research vs School Mode) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
          <button
            id="modeSwitchResearchBtn"
            onClick={() => {
              setStandMode('research');
              if (rightPanelTab === 'school') setRightPanelTab('stats');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              standMode === 'research'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Microscope className="w-3.5 h-3.5 text-indigo-600" />
            <span>Исследование</span>
          </button>
          <button
            id="modeSwitchSchoolBtn"
            onClick={() => {
              setStandMode('school');
              setRightPanelTab('school');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              standMode === 'school'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PencilRuler className="w-3.5 h-3.5" />
            <span>Школьный режим</span>
          </button>
        </div>

        {/* Presets and Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Quick Presets */}
          <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 px-1 font-medium">Пресеты:</span>
            <button
              id="topPresetAcute"
              onClick={() => handleSelectPreset('acute')}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                activeResult.classification === 'acute'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Острый
            </button>
            <button
              id="topPresetRight"
              onClick={() => handleSelectPreset('right')}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                activeResult.classification === 'right'
                  ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Прямой (Фалес)
            </button>
            <button
              id="topPresetObtuse"
              onClick={() => handleSelectPreset('obtuse')}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                activeResult.classification === 'obtuse'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Тупой
            </button>
          </div>

          <button
            id="resetPointsBtn"
            onClick={handleReset}
            title="Сбросить точки и угол поворота"
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Сброс
          </button>

          {/* Header Geometry Undo Button */}
          <button
            id="headerUndoBtn"
            onClick={handleUndo}
            disabled={!canUndoAction}
            title={
              canUndoAction
                ? 'Отменить последнее действие (Ctrl+Z)'
                : 'Нет действий для отмены'
            }
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition border ${
              canUndoAction
                ? 'bg-white hover:bg-slate-50 text-indigo-700 border-slate-300 shadow-2xs cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Отменить</span>
          </button>
        </div>
      </header>

      {/* Main Resizable Split Workspace:
          Left: GEOMETRY (Fixed in place, overflow-hidden, 100% visible)
          Center: Resizable Splitter with 50/50 Quick Reset
          Right: ANALYSIS (Scrollable, own independent scrollbar)
      */}
      <main
        ref={workspaceContainerRef}
        className="flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden"
      >
        
        {/* ========================================================
            ЛЕВАЯ ПАНЕЛЬ — GEOMETRY (Настраиваемая ширина [35%, 75%])
            ВСЕГДА ОСТАЁТСЯ ПОЛНОСТЬЮ ВИДИМОЙ, НЕ СКРОЛЛИТСЯ
            ======================================================== */}
        <section
          id="geometryLeftPanel"
          aria-label="Geometry Workbench"
          style={isDesktop ? { width: `${splitPercent}%`, flexBasis: `${splitPercent}%` } : undefined}
          className="h-full overflow-hidden flex flex-col p-3 md:p-4 bg-white/70 border-r border-slate-200 justify-between shrink-0 min-w-0"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                GEOMETRY
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {standMode === 'school' ? 'Школьный чертёжный планшет' : 'Интерактивный циферблат'}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              {standMode === 'school'
                ? 'Используйте панель инструментов над чертежом'
                : 'Тяните вершины A, B, C или вращайте диск ↻'}
            </div>
          </div>

          {/* Interactive Geometry Stage (Maximizing Available Screen Space) */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center">
            {standMode === 'school' ? (
              <SchoolModeWrapper
                geometryState={geometryState}
                onDispatchCommand={handleDispatchCommand}
                scale={scale}
                activeTool={activeSchoolTool}
                onChangeTool={setActiveSchoolTool}
                onUndo={handleUndo}
                canUndo={canUndoAction}
              >
                {({ toolState, previewData, handlePointerDown, handlePointerMove, handlePointerUp }) => (
                  <CanvasStage
                    pointsU={pointsU}
                    onChangePoints={handleChangePointsU}
                    rotationDeg={rotationDeg}
                    onChangeRotation={setRotationDeg}
                    scaleMode={scaleMode}
                    onChangeScaleMode={setScaleMode}
                    activeHighlight={activeHighlight}
                    onHoverHighlight={setActiveHighlight}
                    engineResult={activeResult}
                    R={R}
                    scale={scale}
                    onChangeScale={setScale}
                    schoolMode={true}
                    schoolState={geometryState}
                    schoolPreview={previewData}
                    activeTool={activeSchoolTool}
                    rulerMeasurement={toolState.rulerMeasurement}
                    smartTargets={toolState.angleBisectorTargets}
                    hoverSmartTargetId={toolState.hoverSmartTargetId}
                    onSchoolPointerDown={handlePointerDown}
                    onSchoolPointerMove={handlePointerMove}
                    onSchoolPointerUp={handlePointerUp}
                    onMoveSchoolPoint={handleMoveSchoolPoint}
                    onDragStart={handleDragStart}
                    onDragCommit={handleDragCommit}
                  />
                )}
              </SchoolModeWrapper>
            ) : (
              <CanvasStage
                pointsU={pointsU}
                onChangePoints={handleChangePointsU}
                rotationDeg={rotationDeg}
                onChangeRotation={setRotationDeg}
                scaleMode={scaleMode}
                onChangeScaleMode={setScaleMode}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                engineResult={activeResult}
                R={R}
                scale={scale}
                onChangeScale={setScale}
                schoolMode={false}
                schoolState={geometryState}
                onDragStart={handleDragStart}
                onDragCommit={handleDragCommit}
              />
            )}
          </div>
        </section>

        {/* ========================================================
            РАЗДЕЛИТЕЛЬНАЯ ПОЛОСА — WORKSPACE SPLITTER (Desktop)
            ======================================================== */}
        <WorkspaceSplitter
          splitPercent={splitPercent}
          onSplitChange={setSplitPercent}
          onResetSplit={() => setSplitPercent(50)}
          containerRef={workspaceContainerRef}
        />

        {/* ========================================================
            ПРАВАЯ ПАНЕЛЬ — ANALYSIS (Настраиваемая ширина [25%, 65%])
            ИМЕЕТ СОБСТВЕННЫЙ СКРОЛЛ (overflow-y: auto)
            ======================================================== */}
        <section
          id="analysisRightPanel"
          aria-label="Analysis & Calculations"
          style={isDesktop ? { width: `${100 - splitPercent}%`, flexBasis: `${100 - splitPercent}%` } : undefined}
          className="h-full overflow-y-auto p-4 md:p-6 flex flex-col gap-5 bg-[#F8FAFC] flex-1 min-w-0"
        >
          {/* Top Mode Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300/70 shadow-2xs">
              {standMode === 'school' && (
                <button
                  id="rightTabSchoolBtn"
                  onClick={() => setRightPanelTab('school')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    rightPanelTab === 'school'
                      ? 'bg-white text-indigo-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PencilRuler className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ЧЕРТЁЖ И ОБЪЕКТЫ</span>
                </button>
              )}
              <button
                id="rightTabStatsBtn"
                onClick={() => {
                  setRightPanelTab('stats');
                  setMode('explore');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  rightPanelTab === 'stats'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>СТАТИСТИКА / ЛАБОРАТОРИЯ</span>
              </button>
              <button
                id="rightTabConfigBtn"
                onClick={() => {
                  setRightPanelTab('config');
                  setMode('explore');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  rightPanelTab === 'config'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-indigo-600" />
                <span>КОНФИГУРАЦИЯ (GCM-01)</span>
              </button>
              <button
                id="rightTabLearningBtn"
                onClick={() => {
                  setRightPanelTab('learning');
                  setMode('learn');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  rightPanelTab === 'learning'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>ОБУЧЕНИЕ</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                1 px = {scale} мм (учебный)
              </span>
              <div className="text-[11px] font-mono text-slate-400">
                ↕ Прокрутка
              </div>
            </div>
          </div>

          {rightPanelTab === 'school' ? (
            <ErrorBoundary fallbackTitle="Ошибка отображения объектов чертежа">
              <SchoolObjectInventory
                geometryState={geometryState}
                scale={scale}
                activeTool={activeSchoolTool}
                selectedEntityId={selectedSchoolEntityId}
                onSelectEntity={setSelectedSchoolEntityId}
              />
            </ErrorBoundary>
          ) : rightPanelTab === 'config' ? (
            <ErrorBoundary fallbackTitle="Ошибка отображения семантической конфигурации">
              <GeometryConfigurationPanel
                geometryState={geometryState}
                scale={scale}
              />
            </ErrorBoundary>
          ) : rightPanelTab === 'stats' ? (

            <ErrorBoundary fallbackTitle="Ошибка отображения лаборатории">
              {/* 1. TRIANGLE STATE */}
              <TriangleStateTable
                vertices={geoBase.vertices}
                classicalResult={classicalResult}
                matrixResult={matrixResult}
                R={R}
                scale={scale}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                transition={transition}
                onResetBaseline={() => setBaselineSnapshot(currentSnapshot)}
                onApplyTriangleAngles={handleApplyTriangleAngles}
                onApplySingleTargetAngle={handleApplyTargetAngle}
              />

              {/* 2. RELATION MAP */}
              <RelationMap
                engineResult={activeResult}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                scale={scale}
              />

              {/* 3. ARC / CHORD TABLE */}
              <ArcChordTable
                engineResult={activeResult}
                scaleMode={scaleMode}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                R={R}
                scale={scale}
              />

              {/* 4. TOPOLOGICAL CLASS */}
              <TopologicalClassCard
                engineResult={activeResult}
              />

              {/* 5. GEOMETRY CONFIGURATION VIEW (GCM-01) */}
              <GeometryConfigurationPanel
                geometryState={geometryState}
                scale={scale}
              />

              {/* 6. RESEARCH OBSERVATION MODULE (PACKET #4) */}
              <ResearchObservationPanel
                geometryState={geometryState}
                scale={scale}
              />

              {/* 6. CLASSICAL / MATRIX, OPERATION COUNT, VERIFY, EXPERIMENT / BENCHMARK */}
              <EngineBenchmarkPanel
                currentEngine={currentEngine}
                onSelectEngine={setCurrentEngine}
                activeResult={activeResult}
                classicalResult={classicalResult}
                matrixResult={matrixResult}
                verifyEnabled={verifyEnabled}
                onToggleVerify={() => setVerifyEnabled(!verifyEnabled)}
                pointsU={pointsU}
                R={R}
              />

              {/* 6. LEARN MODE */}
              <LearningGuide
                currentClass={activeResult.classification}
                onSelectPreset={handleSelectPreset}
                mode={mode}
                onSetMode={(m) => {
                  setMode(m);
                  if (m === 'learn') setRightPanelTab('learning');
                }}
              />

              {/* 7. FREEZE TRIANGLE */}
              <FreezeCard
                frozenSnapshot={frozenSnapshot}
                onToggleFreeze={handleToggleFreeze}
                isFrozen={isFrozen}
                scale={scale}
              />

              {/* Educational Philosophy Footer */}
              <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 mt-2">
                Система понятий: <strong className="text-slate-600">ОКРУЖНОСТЬ ➔ ТОЧКИ ➔ ХОРДЫ ➔ ДУГИ ➔ РАДИУСЫ ➔ УГЛЫ ➔ СВЯЗИ ➔ ВЫЧИСЛЕНИЯ</strong>
              </div>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary fallbackTitle="Ошибка отображения интерактивного учебника">
              <InteractiveTextbook
                vertices={geoBase.vertices}
                engineResult={activeResult}
                classicalResult={classicalResult}
                matrixResult={matrixResult}
                R={R}
                scale={scale}
                activeHighlight={activeHighlight}
                onHoverHighlight={setActiveHighlight}
                onSelectPreset={handleSelectPreset}
                frozenSnapshot={frozenSnapshot}
                isFrozen={isFrozen}
                pointsU={pointsU}
                onChangePoints={setPointsU}
                scaleMode={scaleMode}
                onChangeScaleMode={setScaleMode}
              />
            </ErrorBoundary>
          )}
        </section>

      </main>
    </div>
  );
}
