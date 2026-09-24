import React, { useState, useRef, useEffect } from 'react';
import { EngineResult, VertexPoint, ActiveHighlight, GeometryTransition } from '../types';
import { formatCircleFraction, VertexId } from '../engines/geometryState';
import { formatTwoLevelLength, formatTwoLevelArea } from '../utils/units';
import { Activity, RotateCcw, Edit3, Check, X, Sparkles, Sliders, Info, AlertTriangle } from 'lucide-react';

interface TriangleStateTableProps {
  vertices: VertexPoint[];
  classicalResult: EngineResult;
  matrixResult: EngineResult;
  R: number;
  scale?: number;
  activeHighlight: ActiveHighlight;
  onHoverHighlight: (highlight: ActiveHighlight) => void;
  transition?: GeometryTransition | null;
  onResetBaseline?: () => void;
  onApplyTriangleAngles?: (angles: { A?: number | null; B?: number | null; C?: number | null }) => {
    success: boolean;
    error?: string;
    infoMessage?: string;
    resolvedAngles?: { A: number; B: number; C: number };
  };
  onApplySingleTargetAngle?: (vertexId: VertexId, targetAngleDeg: number) => { success: boolean; error?: string };
}

// Dialog for configuring triangle angles (2 angles -> auto 3rd, or 3 angles -> sum 180)
interface TriangleAngleConfigDialogProps {
  isOpen: boolean;
  initialVertex?: VertexId;
  currentAngles: { A: number; B: number; C: number };
  onClose: () => void;
  onApply: (spec: { A?: number | null; B?: number | null; C?: number | null }) => {
    success: boolean;
    error?: string;
    infoMessage?: string;
  };
  onApplySingle?: (vertexId: VertexId, targetAngleDeg: number) => { success: boolean; error?: string };
}

export const TriangleAngleConfigDialog: React.FC<TriangleAngleConfigDialogProps> = ({
  isOpen,
  initialVertex = 'A',
  currentAngles,
  onClose,
  onApply,
  onApplySingle,
}) => {
  const [valA, setValA] = useState<string>(currentAngles.A.toFixed(1));
  const [valB, setValB] = useState<string>(currentAngles.B.toFixed(1));
  const [valC, setValC] = useState<string>(currentAngles.C.toFixed(1));

  // Which angles were explicitly edited in this session
  const [activeAngles, setActiveAngles] = useState<{ A: boolean; B: boolean; C: boolean }>({
    A: false,
    B: false,
    C: false,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const inputCRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValA(currentAngles.A.toFixed(1));
      setValB(currentAngles.B.toFixed(1));
      setValC(currentAngles.C.toFixed(1));
      setActiveAngles({ A: false, B: false, C: false });
      setErrorMessage(null);
      setInfoMessage(null);

      setTimeout(() => {
        if (initialVertex === 'A') inputARef.current?.select();
        else if (initialVertex === 'B') inputBRef.current?.select();
        else if (initialVertex === 'C') inputCRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentAngles, initialVertex]);

  if (!isOpen) return null;

  // Parse input values
  const numA = parseFloat(valA.replace(',', '.'));
  const numB = parseFloat(valB.replace(',', '.'));
  const numC = parseFloat(valC.replace(',', '.'));

  const isAValid = !isNaN(numA) && numA >= 0.5 && numA <= 179;
  const isBValid = !isNaN(numB) && numB >= 0.5 && numB <= 179;
  const isCValid = !isNaN(numC) && numC >= 0.5 && numC <= 179;

  // Identify auto-calculated angle if exactly 2 inputs are set
  let autoVertex: VertexId | null = null;
  let autoVal: number | null = null;

  const validCount = (isAValid ? 1 : 0) + (isBValid ? 1 : 0) + (isCValid ? 1 : 0);

  // If user changed A & B -> auto C
  if (activeAngles.A && activeAngles.B && !activeAngles.C && isAValid && isBValid) {
    autoVertex = 'C';
    autoVal = 180 - numA - numB;
  } else if (activeAngles.A && activeAngles.C && !activeAngles.B && isAValid && isCValid) {
    autoVertex = 'B';
    autoVal = 180 - numA - numC;
  } else if (activeAngles.B && activeAngles.C && !activeAngles.A && isBValid && isCValid) {
    autoVertex = 'A';
    autoVal = 180 - numB - numC;
  }

  const handleAngleChange = (vId: VertexId, value: string) => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (vId === 'A') {
      setValA(value);
      setActiveAngles((prev) => ({ ...prev, A: true }));
      const pA = parseFloat(value.replace(',', '.'));
      if (!isNaN(pA) && isBValid && !activeAngles.C) {
        const c = 180 - pA - numB;
        if (c > 0 && c < 180) setValC(c.toFixed(1));
      } else if (!isNaN(pA) && isCValid && !activeAngles.B) {
        const b = 180 - pA - numC;
        if (b > 0 && b < 180) setValB(b.toFixed(1));
      }
    } else if (vId === 'B') {
      setValB(value);
      setActiveAngles((prev) => ({ ...prev, B: true }));
      const pB = parseFloat(value.replace(',', '.'));
      if (!isNaN(pB) && isAValid && !activeAngles.C) {
        const c = 180 - numA - pB;
        if (c > 0 && c < 180) setValC(c.toFixed(1));
      } else if (!isNaN(pB) && isCValid && !activeAngles.A) {
        const a = 180 - pB - numC;
        if (a > 0 && a < 180) setValA(a.toFixed(1));
      }
    } else if (vId === 'C') {
      setValC(value);
      setActiveAngles((prev) => ({ ...prev, C: true }));
      const pC = parseFloat(value.replace(',', '.'));
      if (!isNaN(pC) && isAValid && !activeAngles.B) {
        const b = 180 - numA - pC;
        if (b > 0 && b < 180) setValB(b.toFixed(1));
      } else if (!isNaN(pC) && isBValid && !activeAngles.A) {
        const a = 180 - numB - pC;
        if (a > 0 && a < 180) setValA(a.toFixed(1));
      }
    }
  };

  const handleApplyPreset = (presetA: number, presetB: number, presetC: number) => {
    setValA(presetA.toFixed(1));
    setValB(presetB.toFixed(1));
    setValC(presetC.toFixed(1));
    setActiveAngles({ A: true, B: true, C: true });
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleCommit = () => {
    // Collect parsed numbers
    const parsedA = isAValid ? numA : null;
    const parsedB = isBValid ? numB : null;
    const parsedC = isCValid ? numC : null;

    // Check count of active angles
    const activeCount = (activeAngles.A ? 1 : 0) + (activeAngles.B ? 1 : 0) + (activeAngles.C ? 1 : 0);

    // If only 1 angle was changed and user didn't specify second
    if (activeCount === 1) {
      const singleVertex = activeAngles.A ? 'A' : activeAngles.B ? 'B' : 'C';
      const singleVal = singleVertex === 'A' ? parsedA : singleVertex === 'B' ? parsedB : parsedC;
      
      setInfoMessage('Для однозначного задания треугольника введите второй угол, либо используйте «Применить к одному углу».');
      return;
    }

    const res = onApply({
      A: parsedA,
      B: parsedB,
      C: parsedC,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Ошибка задания углов');
      if (res.infoMessage) setInfoMessage(res.infoMessage);
    } else {
      onClose();
    }
  };

  const handleApplySingleDisturbance = () => {
    if (!onApplySingle) return;
    const singleVertex: VertexId = activeAngles.A ? 'A' : activeAngles.B ? 'B' : activeAngles.C ? 'C' : initialVertex;
    const val = singleVertex === 'A' ? numA : singleVertex === 'B' ? numB : numC;
    if (isNaN(val) || val < 0.5 || val > 179) {
      setErrorMessage('Угол должен быть от 0.5° до 179°');
      return;
    }
    const res = onApplySingle(singleVertex, val);
    if (!res.success) {
      setErrorMessage(res.error || 'Ошибка применения');
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Status message calculation
  const totalSum = (isAValid ? numA : 0) + (isBValid ? numB : 0) + (isCValid ? numC : 0);
  const isSum180 = Math.abs(totalSum - 180.0) < 0.1;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        id="triangleAngleConfigDialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Задать конфигурацию углов</h3>
              <p className="text-[11px] text-slate-400">
                Задайте два угла (третий вычислится автоматически) или все три с суммой 180°
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* 3 Angles Inputs Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Angle A */}
            <div className={`p-3 rounded-xl border-2 transition-all ${
              autoVertex === 'A'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-100'
                : activeAngles.A
                ? 'bg-indigo-50/50 border-indigo-500'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">∠A</span>
                {autoVertex === 'A' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    AUTO
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  ref={inputARef}
                  type="number"
                  step="any"
                  min="0.5"
                  max="179"
                  value={valA}
                  onChange={(e) => handleAngleChange('A', e.target.value)}
                  className="w-full pr-5 pl-2 py-1.5 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.5–179"
                />
                <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">
                  °
                </span>
              </div>
            </div>

            {/* Angle B */}
            <div className={`p-3 rounded-xl border-2 transition-all ${
              autoVertex === 'B'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-100'
                : activeAngles.B
                ? 'bg-indigo-50/50 border-indigo-500'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">∠B</span>
                {autoVertex === 'B' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    AUTO
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  ref={inputBRef}
                  type="number"
                  step="any"
                  min="0.5"
                  max="179"
                  value={valB}
                  onChange={(e) => handleAngleChange('B', e.target.value)}
                  className="w-full pr-5 pl-2 py-1.5 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.5–179"
                />
                <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">
                  °
                </span>
              </div>
            </div>

            {/* Angle C */}
            <div className={`p-3 rounded-xl border-2 transition-all ${
              autoVertex === 'C'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-100'
                : activeAngles.C
                ? 'bg-indigo-50/50 border-indigo-500'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800">∠C</span>
                {autoVertex === 'C' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    AUTO
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  ref={inputCRef}
                  type="number"
                  step="any"
                  min="0.5"
                  max="179"
                  value={valC}
                  onChange={(e) => handleAngleChange('C', e.target.value)}
                  className="w-full pr-5 pl-2 py-1.5 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.5–179"
                />
                <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">
                  °
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Validation / Status Feedback */}
          <div className="flex flex-col gap-1.5">
            {autoVertex && autoVal !== null ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Авторасчёт третьего угла:</span>{' '}
                  ∠{autoVertex} = 180° − {autoVertex === 'C' ? `(${numA}° + ${numB}°)` : autoVertex === 'B' ? `(${numA}° + ${numC}°)` : `(${numB}° + ${numC}°)`} = <strong>{autoVal.toFixed(1)}°</strong>
                </div>
              </div>
            ) : isSum180 ? (
              <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span>Сумма углов треугольника: <strong>{totalSum.toFixed(1)}°</strong> (180.0° ✓)</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span>Текущая сумма углов: <strong>{totalSum.toFixed(1)}°</strong>. Для сохранения евклидова треугольника сумма углов должна быть строго <strong>180.0°</strong>.</span>
                </div>
              </div>
            )}

            {infoMessage && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>{infoMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Quick Presets for Geometry Problems */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Учебные пресеты (задачи):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset(45, 45, 90)}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                45° - 45° - 90° (Прямоуг. равн.)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(60, 60, 60)}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                60° - 60° - 60° (Равносторонний)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(30, 60, 90)}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                30° - 60° - 90° (Фалес)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(40, 70, 70)}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                40° - 70° - 70° (Равнобедр.)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(50, 60, 70)}
                className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                50° - 60° - 70° (Разносторон.)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleApplySingleDisturbance}
            title="Применить только к текущему углу (остальные дуги сохранят пропорции)"
            className="text-xs text-indigo-700 hover:text-indigo-900 font-medium underline underline-offset-2 transition cursor-pointer"
          >
            Изменить только один угол
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Отмена (Esc)
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={!isSum180 && !autoVertex}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5 ${
                isSum180 || autoVertex
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Применить к чертежу (Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EditableAngleCellProps {
  vertexId: VertexId;
  currentAngleDeg: number;
  onOpenDialog: (vertexId: VertexId) => void;
}

const EditableAngleCell: React.FC<EditableAngleCellProps> = ({
  vertexId,
  currentAngleDeg,
  onOpenDialog,
}) => {
  return (
    <div
      id={`angleCell-${vertexId}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDialog(vertexId);
      }}
      title={`Кликните, чтобы задать углы треугольника числом (начиная с ∠${vertexId})`}
      className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-indigo-100/80 hover:text-indigo-950 border border-transparent hover:border-indigo-300 transition-all cursor-pointer select-none"
    >
      <span className="font-bold text-indigo-700 group-hover:text-indigo-950 transition-colors">
        {currentAngleDeg.toFixed(1)}°
      </span>
      <Edit3 className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-indigo-600 transition-opacity" />
    </div>
  );
};

export const TriangleStateTable: React.FC<TriangleStateTableProps> = ({
  vertices,
  classicalResult,
  matrixResult,
  R,
  scale = 1.0,
  activeHighlight,
  onHoverHighlight,
  transition,
  onResetBaseline,
  onApplyTriangleAngles,
  onApplySingleTargetAngle,
}) => {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [dialogInitialVertex, setDialogInitialVertex] = useState<VertexId>('A');

  const vA = vertices.find((v) => v.id === 'A')!;
  const vB = vertices.find((v) => v.id === 'B')!;
  const vC = vertices.find((v) => v.id === 'C')!;

  const lenAB = formatTwoLevelLength(classicalResult.chords.AB, scale);
  const lenBC = formatTwoLevelLength(classicalResult.chords.BC, scale);
  const lenCA = formatTwoLevelLength(classicalResult.chords.CA, scale);

  const isDiameterAB = Math.abs(matrixResult.arcs.AB - 0.5) < 0.008;
  const isDiameterBC = Math.abs(matrixResult.arcs.BC - 0.5) < 0.008;
  const isDiameterCA = Math.abs(matrixResult.arcs.CA - 0.5) < 0.008;

  const perimClassical = formatTwoLevelLength(classicalResult.perimeter, scale);
  const perimMatrix = formatTwoLevelLength(matrixResult.perimeter, scale);

  const areaClassical = formatTwoLevelArea(classicalResult.area, scale);
  const areaMatrix = formatTwoLevelArea(matrixResult.area, scale);

  const radiusFormatted = formatTwoLevelLength(R, scale);

  const handleOpenDialog = (vId: VertexId) => {
    setDialogInitialVertex(vId);
    setIsConfigDialogOpen(true);
  };

  const handleApplyConfig = (spec: { A?: number | null; B?: number | null; C?: number | null }) => {
    if (!onApplyTriangleAngles) return { success: false, error: 'Обработчик не настроен' };
    return onApplyTriangleAngles(spec);
  };

  const rows: Array<{
    id: string;
    category: string;
    element: string;
    classicalVal: React.ReactNode;
    matrixVal: React.ReactNode;
    relationVal: string;
    highlightKey?: ActiveHighlight;
  }> = [
    {
      id: 'vertex-A',
      category: 'Вершины',
      element: 'Вершина A',
      classicalVal: (
        <EditableAngleCell
          vertexId="A"
          currentAngleDeg={vA.angleDeg}
          onOpenDialog={handleOpenDialog}
        />
      ),
      matrixVal: <span>u = {vA.u.toFixed(2)} ({(vA.u * 100).toFixed(0)}% цикла)</span>,
      relationVal: 'A ⟷ противоположная дуга BC',
      highlightKey: { type: 'vertex', id: 'A' },
    },
    {
      id: 'vertex-B',
      category: 'Вершины',
      element: 'Вершина B',
      classicalVal: (
        <EditableAngleCell
          vertexId="B"
          currentAngleDeg={vB.angleDeg}
          onOpenDialog={handleOpenDialog}
        />
      ),
      matrixVal: <span>u = {vB.u.toFixed(2)} ({(vB.u * 100).toFixed(0)}% цикла)</span>,
      relationVal: 'B ⟷ противоположная дуга CA',
      highlightKey: { type: 'vertex', id: 'B' },
    },
    {
      id: 'vertex-C',
      category: 'Вершины',
      element: 'Вершина C',
      classicalVal: (
        <EditableAngleCell
          vertexId="C"
          currentAngleDeg={vC.angleDeg}
          onOpenDialog={handleOpenDialog}
        />
      ),
      matrixVal: <span>u = {vC.u.toFixed(2)} ({(vC.u * 100).toFixed(0)}% цикла)</span>,
      relationVal: 'C ⟷ противоположная дуга AB',
      highlightKey: { type: 'vertex', id: 'C' },
    },
    {
      id: 'arc-AB',
      category: 'Дуги',
      element: 'Дуга AB',
      classicalVal: <span>{(classicalResult.arcs.AB * 360).toFixed(0)}°</span>,
      matrixVal: <span>{formatCircleFraction(matrixResult.arcs.AB)}</span>,
      relationVal: 'Хорда AB, напротив ∠C',
      highlightKey: { type: 'arc', id: 'AB' },
    },
    {
      id: 'arc-BC',
      category: 'Дуги',
      element: 'Дуга BC',
      classicalVal: <span>{(classicalResult.arcs.BC * 360).toFixed(0)}°</span>,
      matrixVal: <span>{formatCircleFraction(matrixResult.arcs.BC)}</span>,
      relationVal: 'Хорда BC, напротив ∠A',
      highlightKey: { type: 'arc', id: 'BC' },
    },
    {
      id: 'arc-CA',
      category: 'Дуги',
      element: 'Дуга CA',
      classicalVal: <span>{(classicalResult.arcs.CA * 360).toFixed(0)}°</span>,
      matrixVal: <span>{formatCircleFraction(matrixResult.arcs.CA)}</span>,
      relationVal: 'Хорда CA, напротив ∠B',
      highlightKey: { type: 'arc', id: 'CA' },
    },
    {
      id: 'side-AB',
      category: 'Стороны (Хорды)',
      element: 'Сторона AB',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{lenAB.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({lenAB.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">
            {isDiameterAB ? `D = 2R = ${lenAB.mm}` : lenAB.mm}
          </span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">
            {isDiameterAB ? `(2R = ${lenAB.px})` : `(${lenAB.px})`}
          </span>
        </div>
      ),
      relationVal: 'C ⟷ AB (хорда дуги AB)',
      highlightKey: { type: 'side', id: 'AB' },
    },
    {
      id: 'side-BC',
      category: 'Стороны (Хорды)',
      element: 'Сторона BC',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{lenBC.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({lenBC.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">
            {isDiameterBC ? `D = 2R = ${lenBC.mm}` : lenBC.mm}
          </span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">
            {isDiameterBC ? `(2R = ${lenBC.px})` : `(${lenBC.px})`}
          </span>
        </div>
      ),
      relationVal: 'A ⟷ BC (хорда дуги BC)',
      highlightKey: { type: 'side', id: 'BC' },
    },
    {
      id: 'side-CA',
      category: 'Стороны (Хорды)',
      element: 'Сторона CA',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{lenCA.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({lenCA.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">
            {isDiameterCA ? `D = 2R = ${lenCA.mm}` : lenCA.mm}
          </span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">
            {isDiameterCA ? `(2R = ${lenCA.px})` : `(${lenCA.px})`}
          </span>
        </div>
      ),
      relationVal: 'B ⟷ CA (хорда дуги CA)',
      highlightKey: { type: 'side', id: 'CA' },
    },
    {
      id: 'angle-A',
      category: 'Углы',
      element: '∠A',
      classicalVal: (
        <EditableAngleCell
          vertexId="A"
          currentAngleDeg={classicalResult.angles.A}
          onOpenDialog={handleOpenDialog}
        />
      ),
      matrixVal: <span>½ дуги BC ({(matrixResult.arcs.BC * 180).toFixed(1)}°)</span>,
      relationVal: 'A ⟷ дуга BC',
      highlightKey: { type: 'vertex', id: 'A' },
    },
    {
      id: 'angle-B',
      category: 'Углы',
      element: '∠B',
      classicalVal: (
        <EditableAngleCell
          vertexId="B"
          currentAngleDeg={classicalResult.angles.B}
          onOpenDialog={handleOpenDialog}
        />
      ),
      matrixVal: <span>½ дуги CA ({(matrixResult.arcs.CA * 180).toFixed(1)}°)</span>,
      relationVal: 'B ⟷ дуга CA',
      highlightKey: { type: 'vertex', id: 'B' },
    },
    {
      id: 'angle-C',
      category: 'Углы',
      element: '∠C',
      classicalVal: (
        <EditableAngleCell
          vertexId="C"
          currentAngleDeg={classicalResult.angles.C}
          onOpenDialog={handleOpenDialog}
        />
      ),
      matrixVal: <span>½ дуги AB ({(matrixResult.arcs.AB * 180).toFixed(1)}°)</span>,
      relationVal: 'C ⟷ дуга AB',
      highlightKey: { type: 'vertex', id: 'C' },
    },
    {
      id: 'radius-R',
      category: 'Метрика',
      element: 'Радиус R',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{radiusFormatted.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({radiusFormatted.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">R = {radiusFormatted.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({radiusFormatted.px})</span>
        </div>
      ),
      relationVal: 'OA = OB = OC = R (общий центр)',
      highlightKey: { type: 'center' },
    },
    {
      id: 'center-O',
      category: 'Метрика',
      element: 'Центр O',
      classicalVal: (
        <span>
          {classicalResult.classification === 'acute'
            ? 'INSIDE (внутри)'
            : classicalResult.classification === 'right'
            ? 'ON SIDE (на стороне)'
            : 'OUTSIDE (снаружи)'}
        </span>
      ),
      matrixVal: (
        <span>
          {matrixResult.classification === 'acute'
            ? 'd_max < 0.5 (внутри)'
            : matrixResult.classification === 'right'
            ? 'd_max = 0.5 (диаметр)'
            : 'd_max > 0.5 (снаружи)'}
        </span>
      ),
      relationVal: 'Положение центра относительно хорд',
      highlightKey: { type: 'center' },
    },
    {
      id: 'perimeter',
      category: 'Метрика',
      element: 'Периметр',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{perimClassical.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({perimClassical.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">{perimMatrix.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({perimMatrix.px})</span>
        </div>
      ),
      relationVal: 'AB + BC + CA (сумма хорд)',
    },
    {
      id: 'area',
      category: 'Метрика',
      element: 'Площадь S',
      classicalVal: (
        <div className="flex flex-col">
          <span className="font-bold text-indigo-700">{areaClassical.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({areaClassical.px})</span>
        </div>
      ),
      matrixVal: (
        <div className="flex flex-col">
          <span className="font-bold text-emerald-700">{areaMatrix.mm}</span>
          <span className="text-slate-400 text-[10px] font-normal font-mono">({areaMatrix.px})</span>
        </div>
      ),
      relationVal: 'Площадь вписанного треугольника',
    },
  ];

  return (
    <div
      id="triangleStateTableSection"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            TRIANGLE STATE
          </span>
          <span className="text-xs text-slate-600 ml-2 font-medium">
            — Один треугольник → Два способа описания
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btnOpenAngleConfig"
            onClick={() => handleOpenDialog('A')}
            title="Задать точные числовые углы треугольника"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition cursor-pointer shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Задать углы числом</span>
          </button>
          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
            1 px = {scale} мм
          </span>
          <span className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
            Live Sync
          </span>
        </div>
      </div>

      {/* Temporal Transition Banner (Observation of Dynamics t0 -> t1) */}
      {transition && (
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-600 text-white">
                <Activity className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Динамика изменений ({transition.changedVertex ? `Перемещена вершина ${transition.changedVertex}` : 'Изменение геометрии'})
              </span>
            </div>
            {onResetBaseline && (
              <button
                onClick={onResetBaseline}
                title="Принять текущее положение треугольника за точку отсчёта t0"
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100/60 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Зафиксировать t₀</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Δ Угла {transition.changedVertex || 'A'}</span>
              <span className={`font-mono font-bold text-xs ${
                (transition.deltas.deltaAngles[transition.changedVertex || 'A'] || 0) >= 0 ? 'text-indigo-700' : 'text-amber-700'
              }`}>
                {(transition.deltas.deltaAngles[transition.changedVertex || 'A'] || 0) >= 0 ? '+' : ''}
                {(transition.deltas.deltaAngles[transition.changedVertex || 'A'] || 0).toFixed(1)}°
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">
                Δ Дуги {transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'}
              </span>
              <span className={`font-mono font-bold text-xs ${
                (transition.deltas.deltaArcs[transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'] || 0) >= 0 ? 'text-indigo-700' : 'text-amber-700'
              }`}>
                {(transition.deltas.deltaArcs[transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'] || 0) >= 0 ? '+' : ''}
                {(transition.deltas.deltaArcs[transition.changedVertex === 'A' ? 'BC' : transition.changedVertex === 'B' ? 'CA' : 'AB'] || 0).toFixed(1)}°
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Δ Площади S</span>
              <span className={`font-mono font-bold text-xs ${
                transition.deltas.deltaArea >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {transition.deltas.deltaArea >= 0 ? '+' : ''}
                {transition.deltas.deltaArea.toFixed(1)} мм²
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100 flex flex-col">
              <span className="text-[10px] text-slate-500 font-medium">Δ Периметра P</span>
              <span className={`font-mono font-bold text-xs ${
                transition.deltas.deltaPerimeter >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {transition.deltas.deltaPerimeter >= 0 ? '+' : ''}
                {transition.deltas.deltaPerimeter.toFixed(1)} мм
              </span>
            </div>
          </div>

          {transition.invariantStatuses && transition.invariantStatuses.length > 0 && (
            <div className="bg-white/90 p-2 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-slate-700">
                Инвариант Фалеса (∠ACB = 90°):
              </span>
              <span
                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                  transition.invariantStatuses[0].status === 'PRESERVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : transition.invariantStatuses[0].status === 'DEGENERATE'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {transition.invariantStatuses[0].status === 'PRESERVED'
                  ? 'СОХРАНЁН (PRESERVED)'
                  : transition.invariantStatuses[0].status === 'DEGENERATE'
                  ? 'ВЫРОЖДЕН (DEGENERATE)'
                  : 'НАРУШЕН (BROKEN)'}
              </span>
            </div>
          )}

          <p className="text-[11px] text-indigo-900/80 leading-relaxed font-normal">
            <strong>Закон связи в динамике:</strong> перемещение вершины на окружности непрерывно изменяет опирающуюся на неё дугу и угол в строгой пропорции: <code className="text-indigo-950 font-bold bg-white/70 px-1 py-0.5 rounded">Δ∠ = ½ · ΔДуга</code>.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
              <th className="py-2.5 px-3 bg-slate-50 rounded-l-lg">ЭЛЕМЕНТ</th>
              <th className="py-2.5 px-3 bg-slate-50 text-indigo-700">CLASSICAL (Trig)</th>
              <th className="py-2.5 px-3 bg-slate-50 text-emerald-700">RELATIONAL / MATRIX</th>
              <th className="py-2.5 px-3 bg-slate-50 text-slate-600 rounded-r-lg">ОТНОШЕНИЕ В СИСТЕМЕ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => {
              const isHighlighted =
                row.highlightKey &&
                activeHighlight &&
                row.highlightKey.type === activeHighlight.type &&
                (row.highlightKey as any).id === (activeHighlight as any).id;

              return (
                <tr
                  key={row.id}
                  id={`stateTableRow-${row.id}`}
                  onMouseEnter={() => row.highlightKey && onHoverHighlight(row.highlightKey)}
                  onMouseLeave={() => onHoverHighlight(null)}
                  className={`transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-indigo-50/70 text-indigo-950 font-medium'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {row.element}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    {row.classicalVal}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    {row.matrixVal}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {row.relationVal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Triangle Angles Configuration Dialog */}
      <TriangleAngleConfigDialog
        isOpen={isConfigDialogOpen}
        initialVertex={dialogInitialVertex}
        currentAngles={{
          A: classicalResult.angles.A,
          B: classicalResult.angles.B,
          C: classicalResult.angles.C,
        }}
        onClose={() => setIsConfigDialogOpen(false)}
        onApply={handleApplyConfig}
        onApplySingle={onApplySingleTargetAngle}
      />
    </div>
  );
};
