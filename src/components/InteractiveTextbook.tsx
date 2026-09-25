import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Eye,
  Layers,
  Calculator,
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
  Maximize2,
  Lock,
  Target,
  HelpCircle,
  Lightbulb,
  Award,
  BookOpen,
} from 'lucide-react';
import {
  VertexPoint,
  VertexId,
  EngineResult,
  ActiveHighlight,
  TriangleClass,
  FrozenSnapshot,
  ScaleMode,
  GeometryTrace,
} from '../types';
import { formatCircleFraction } from '../engines/geometryState';
import { formatTwoLevelLength, formatTwoLevelArea } from '../utils/units';
import {
  createGeometrySnapshot,
  buildAngleTrace,
  buildRadianTrace,
} from '../engines/temporalObserver';
import { EducationalCardView } from '../presentation/components/EducationalCardView';
import { evaluateThalesCard } from '../presentation/templates/thalesCardTemplate';
import { FullGeometryState, createDefaultGeometryState } from '../engines/constructionCore';
import { useI18n } from '../i18n';

interface InteractiveTextbookProps {
  vertices: VertexPoint[];
  engineResult: EngineResult;
  classicalResult: EngineResult;
  matrixResult: EngineResult;
  R: number;
  scale?: number;
  activeHighlight: ActiveHighlight;
  onHoverHighlight: (highlight: ActiveHighlight) => void;
  onSelectPreset: (type: 'acute' | 'right' | 'obtuse') => void;
  frozenSnapshot: FrozenSnapshot | null;
  isFrozen: boolean;
  pointsU?: { A: number; B: number; C: number };
  onChangePoints?: (newPoints: { A: number; B: number; C: number }) => void;
  scaleMode?: ScaleMode;
  onChangeScaleMode?: (mode: ScaleMode) => void;
}

type TopicCategory =
  | 'all'
  | 'sides'
  | 'angles'
  | 'arcs'
  | 'circle'
  | 'area'
  | 'perimeter'
  | 'special'
  | 'pi_ratio'
  | 'radian_ratio'
  | 'radians_scale'
  | 'ratio_quiz';

export const InteractiveTextbook: React.FC<InteractiveTextbookProps> = ({
  vertices,
  engineResult,
  classicalResult,
  matrixResult,
  R,
  scale = 1.0,
  activeHighlight,
  onHoverHighlight,
  onSelectPreset,
  frozenSnapshot,
  isFrozen,
  pointsU,
  onChangePoints,
  scaleMode = 'degrees',
  onChangeScaleMode,
}) => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<TopicCategory>('all');
  const [useFrozenData, setUseFrozenData] = useState<boolean>(false);
  const [methodTab, setMethodTab] = useState<'both' | 'classical' | 'relational'>('both');
  const [isThalesCardActive, setIsThalesCardActive] = useState<boolean>(false);

  // Trace interactive states (Logical Derivation Chains)
  const [angleTraceVertex, setAngleTraceVertex] = useState<VertexId | null>(null);
  const [showRadianTrace, setShowRadianTrace] = useState<boolean>(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Determine which data to use for formulas: current live or frozen snapshot
  const activeSourceResult = (useFrozenData && frozenSnapshot) 
    ? frozenSnapshot.classicalResult 
    : engineResult;
  const activeRadius = (useFrozenData && frozenSnapshot) 
    ? frozenSnapshot.R 
    : R;

  // Read-only FullGeometryState projection for Educational Layer (EV-01)
  const fullGeoState = useMemo<FullGeometryState>(() => {
    const pts = pointsU ?? {
      A: vertices.find((v) => v.id === 'A')?.u ?? 0.08,
      B: vertices.find((v) => v.id === 'B')?.u ?? 0.42,
      C: vertices.find((v) => v.id === 'C')?.u ?? 0.75,
    };
    return createDefaultGeometryState(pts, activeRadius);
  }, [vertices, pointsU, activeRadius]);

  const thalesCardViewModel = useMemo(() => {
    return evaluateThalesCard(fullGeoState, undefined, isThalesCardActive);
  }, [fullGeoState, isThalesCardActive]);

  // Snapshot strictly for Trace derivation
  const currentSnapshot = useMemo(() => {
    const pts = pointsU ?? {
      A: vertices.find((v) => v.id === 'A')?.u ?? 0.08,
      B: vertices.find((v) => v.id === 'B')?.u ?? 0.42,
      C: vertices.find((v) => v.id === 'C')?.u ?? 0.75,
    };
    return createGeometrySnapshot({
      pointsU: pts,
      R: activeRadius,
      scale: scale ?? 1.0,
    });
  }, [pointsU, vertices, activeRadius, scale]);

  // Key measurements
  const chords = activeSourceResult.chords;
  const angles = activeSourceResult.angles;
  const arcs = activeSourceResult.arcs;

  // Degrees of central angles corresponding to arcs
  const centralDegAB = arcs.AB * 360;
  const centralDegBC = arcs.BC * 360;
  const centralDegCA = arcs.CA * 360;

  // Live values for ratio lessons
  const currentR_mm = activeRadius * scale;
  const currentD_mm = 2 * currentR_mm;
  const currentC_mm = 2 * Math.PI * currentR_mm;
  const piRatio = currentD_mm > 0 ? currentC_mm / currentD_mm : Math.PI;

  const arcAB_fraction = arcs.AB;
  const arcAB_mm = arcAB_fraction * 2 * Math.PI * currentR_mm;
  const arcAB_deg = arcAB_fraction * 360;
  const arcAB_rad = arcAB_fraction * 2 * Math.PI;
  const radianRatio = currentR_mm > 0 ? arcAB_mm / currentR_mm : 0;
  const isOneRadianFound = Math.abs(radianRatio - 1.0) < 0.045;

  const handleSetOneRadian = () => {
    if (!pointsU || !onChangePoints) return;
    const oneRadFraction = 1 / (2 * Math.PI);
    const newB = (pointsU.A + oneRadFraction) % 1;
    const newC = (pointsU.A + 0.55) % 1;
    onChangePoints({
      A: pointsU.A,
      B: Number(newB.toFixed(5)),
      C: Number(newC.toFixed(5)),
    });
  };

  // Dual format lengths
  const lenAB = formatTwoLevelLength(chords.AB, scale);
  const lenBC = formatTwoLevelLength(chords.BC, scale);
  const lenCA = formatTwoLevelLength(chords.CA, scale);

  const radiusFormat = formatTwoLevelLength(activeRadius, scale);
  const diameterFormat = formatTwoLevelLength(2 * activeRadius, scale);

  const perimeterFormat = formatTwoLevelLength(activeSourceResult.perimeter, scale);
  const areaFormat = formatTwoLevelArea(activeSourceResult.area, scale);

  // Circle metrics
  const circumferencePx = 2 * Math.PI * activeRadius;
  const circumferenceFormat = formatTwoLevelLength(circumferencePx, scale);
  const circleAreaPx = Math.PI * activeRadius * activeRadius;
  const circleAreaFormat = formatTwoLevelArea(circleAreaPx, scale);

  // Category filter buttons
  const categories: Array<{ id: TopicCategory; label: string; count: number }> = [
    { id: 'all', label: t('textbook.cat.all'), count: 12 },
    { id: 'sides', label: t('textbook.cat.sides'), count: 3 },
    { id: 'angles', label: t('textbook.cat.angles'), count: 3 },
    { id: 'arcs', label: t('textbook.cat.arcs'), count: 3 },
    { id: 'circle', label: t('textbook.cat.circle'), count: 3 },
    { id: 'area', label: t('textbook.cat.area'), count: 2 },
    { id: 'perimeter', label: t('textbook.cat.perimeter'), count: 1 },
    { id: 'special', label: t('textbook.cat.special'), count: 3 },
    { id: 'pi_ratio', label: t('textbook.cat.pi_ratio'), count: 2 },
    { id: 'radian_ratio', label: t('textbook.cat.radian_ratio'), count: 2 },
    { id: 'radians_scale', label: t('textbook.cat.radians_scale'), count: 2 },
    { id: 'ratio_quiz', label: t('textbook.cat.ratio_quiz'), count: 5 },
  ];

  return (
    <div
      id="interactiveTextbookContainer"
      className="flex flex-col gap-4 text-slate-800"
    >
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-indigo-700/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-700/60 pb-3.5 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <GraduationCap className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold tracking-tight text-white flex items-center gap-2">
                {t('textbook.title')}
              </h2>
              <p className="text-xs text-indigo-200/90 font-medium">
                {t('textbook.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-indigo-950/80 border border-indigo-600/50 text-indigo-200 px-2.5 py-1 rounded-lg">
              {t('textbook.scaleLabel', { scale })}
            </span>
          </div>
        </div>

        {/* Dynamic Concept Pipeline */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-indigo-100 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/40">
          <span className="text-indigo-300 font-bold uppercase tracking-wider text-[10px]">{t('textbook.pipelineTitle')}</span>
          <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700/50">{t('textbook.pipelineStep1')}</span>
          <span className="text-indigo-400">➔</span>
          <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700/50">{t('textbook.pipelineStep2')}</span>
          <span className="text-indigo-400">➔</span>
          <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700/50">{t('textbook.pipelineStep3')}</span>
          <span className="text-indigo-400">➔</span>
          <span className="bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700/50">{t('textbook.pipelineStep4')}</span>
          <span className="text-indigo-400">➔</span>
          <span className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-600/50 font-bold">{t('textbook.pipelineStep5')}</span>
        </div>

        {/* Frozen State Alert (if triangle is frozen) */}
        {frozenSnapshot && (
          <div className="mt-3 bg-amber-500/10 border border-amber-400/30 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('textbook.frozenAlert')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setUseFrozenData(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  !useFrozenData
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'text-amber-200 hover:bg-amber-500/20'
                }`}
              >
                {t('textbook.liveTriangle')}
              </button>
              <button
                onClick={() => setUseFrozenData(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  useFrozenData
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'text-amber-200 hover:bg-amber-500/20'
                }`}
              >
                {t('textbook.useSnapshot')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Controls Bar: Topic Filters + View Mode */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Method Switcher: Both / Classical / Relational */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 text-xs">
          <button
            onClick={() => setMethodTab('both')}
            className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
              methodTab === 'both' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('textbook.methods.both')}
          </button>
          <button
            onClick={() => setMethodTab('classical')}
            className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
              methodTab === 'classical' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('textbook.methods.classical')}
          </button>
          <button
            onClick={() => setMethodTab('relational')}
            className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
              methodTab === 'relational' ? 'bg-white text-emerald-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('textbook.methods.relational')}
          </button>
        </div>
      </div>

      {/* 3. Cards Feed */}
      <div className="flex flex-col gap-4">

        {/* =========================================================
            ОБРАЗОВАТЕЛЬНЫЙ СЛОЙ ПРЕДСТАВЛЕНИЯ (EV-01)
           ========================================================= */}
        <EducationalCardView
          viewModel={thalesCardViewModel}
          onHoverHighlight={onHoverHighlight}
          isActive={isThalesCardActive}
          onToggleActive={() => setIsThalesCardActive((prev) => !prev)}
        />

        {/* =========================================================
            ТЕМА 1: ХОРДЫ И СТОРОНЫ ТРЕУГОЛЬНИКА
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'sides') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-2 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. СТОРОНЫ ТРЕУГОЛЬНИКА — ЭТО ХОРДЫ ОКРУЖНОСТИ
              </h3>
            </div>

            {/* Formula Card: AB */}
            <FormulaCard
              title="Длина хорды AB (сторона треугольника AB)"
              categoryBadge="Сторона AB"
              isHighlighted={activeHighlight?.type === 'side' && activeHighlight.id === 'AB'}
              onMouseEnter={() => onHoverHighlight({ type: 'side', id: 'AB' })}
              onMouseLeave={() => onHoverHighlight(null)}
              description="Сторона треугольника AB является хордой описанной окружности. Хорда стягивает дугу AB с центральным углом α."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono">
                    <div className="text-indigo-950 font-bold text-sm">AB = 2R · sin(α / 2)</div>
                    <div className="text-slate-500 text-[11px] mt-1">
                      где R — радиус окружности ({activeRadius} px = {radiusFormat.mm}),<br />
                      α — центральный угол дуги AB ({centralDegAB.toFixed(1)}°).
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Подстановка значений с левого циферблата:</div>
                    <div className="font-mono text-slate-800 text-xs">
                      AB = 2 · {activeRadius} · sin({(centralDegAB / 2).toFixed(1)}°) = 2 · {activeRadius} · {Math.sin((centralDegAB / 2) * Math.PI / 180).toFixed(4)}
                    </div>
                    <div className="font-mono font-bold text-emerald-700 text-sm pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Итог: AB = {lenAB.mm}</span>
                      <span className="text-slate-400 font-normal text-xs font-mono">({lenAB.px})</span>
                    </div>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                    <div className="text-emerald-950 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                      <span>Цепочка отношений:</span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Точки A, B ➔ Дуга AB ➔ Доля цикла d ➔ Хорда
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      В реляционной модели дуга AB занимает долю круга <strong>d = {formatCircleFraction(arcs.AB)}</strong> ({centralDegAB.toFixed(0)}°).
                      Хорда однозначно определяется долей дуги: <strong>AB = 2R · sin(π · d)</strong>.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono space-y-1">
                    <div>Доля цикла дуги: d = {arcs.AB.toFixed(3)}</div>
                    <div>Длина хорды: {(2 * activeRadius * Math.sin(Math.PI * arcs.AB) * scale).toFixed(1)} мм ({chords.AB.toFixed(1)} px)</div>
                  </div>
                </div>
              }
              methodTab={methodTab}
            />

            {/* Formula Card: BC */}
            <FormulaCard
              title="Длина хорды BC (сторона треугольника BC)"
              categoryBadge="Сторона BC"
              isHighlighted={activeHighlight?.type === 'side' && activeHighlight.id === 'BC'}
              onMouseEnter={() => onHoverHighlight({ type: 'side', id: 'BC' })}
              onMouseLeave={() => onHoverHighlight(null)}
              description="Сторона BC стягивает дугу BC и лежит напротив вписанного угла ∠A."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono">
                    <div className="text-indigo-950 font-bold text-sm">BC = 2R · sin(α_BC / 2) = 2R · sin(∠A)</div>
                    <div className="text-slate-500 text-[11px] mt-1">
                      α_BC = {centralDegBC.toFixed(1)}°, противоположный вписанный угол ∠A = {angles.A.toFixed(1)}°.
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-mono text-slate-800 text-xs">
                      BC = 2 · {activeRadius} · sin({angles.A.toFixed(1)}°) = 2 · {activeRadius} · {Math.sin(angles.A * Math.PI / 180).toFixed(4)}
                    </div>
                    <div className="font-mono font-bold text-emerald-700 text-sm pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Итог: BC = {lenBC.mm}</span>
                      <span className="text-slate-400 font-normal text-xs font-mono">({lenBC.px})</span>
                    </div>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-[11px]">
                    <span className="font-bold text-emerald-950">Связь A ⟷ BC: </span>
                    <span>Вершина A определяет раствор противоположной дуги BC ({formatCircleFraction(arcs.BC)}).</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                    Итог: {lenBC.mm} ({lenBC.px})
                  </div>
                </div>
              }
              methodTab={methodTab}
            />

            {/* Formula Card: CA */}
            <FormulaCard
              title="Длина хорды CA (сторона треугольника CA)"
              categoryBadge="Сторона CA"
              isHighlighted={activeHighlight?.type === 'side' && activeHighlight.id === 'CA'}
              onMouseEnter={() => onHoverHighlight({ type: 'side', id: 'CA' })}
              onMouseLeave={() => onHoverHighlight(null)}
              description="Сторона CA стягивает дугу CA и лежит напротив вписанного угла ∠B."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono">
                    <div className="text-indigo-950 font-bold text-sm">CA = 2R · sin(α_CA / 2) = 2R · sin(∠B)</div>
                    <div className="text-slate-500 text-[11px] mt-1">
                      α_CA = {centralDegCA.toFixed(1)}°, противоположный угол ∠B = {angles.B.toFixed(1)}°.
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-mono text-slate-800 text-xs">
                      CA = 2 · {activeRadius} · sin({angles.B.toFixed(1)}°) = 2 · {activeRadius} · {Math.sin(angles.B * Math.PI / 180).toFixed(4)}
                    </div>
                    <div className="font-mono font-bold text-emerald-700 text-sm pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Итог: CA = {lenCA.mm}</span>
                      <span className="text-slate-400 font-normal text-xs font-mono">({lenCA.px})</span>
                    </div>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-[11px]">
                    <span className="font-bold text-emerald-950">Связь B ⟷ CA: </span>
                    <span>Вершина B стягивает дугу CA ({formatCircleFraction(arcs.CA)}).</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                    Итог: {lenCA.mm} ({lenCA.px})
                  </div>
                </div>
              }
              methodTab={methodTab}
            />
          </div>
        )}

        {/* =========================================================
            ТЕМА 2: ВПИСАННЫЕ УГЛЫ
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'angles') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                2. ВПИСАННЫЕ УГЛЫ — ТЕОРЕМА О ВПИСАННОМ УГЛЕ
              </h3>
            </div>

            {/* Formula Card: Inscribed Angle Rule */}
            <FormulaCard
              title="Теорема о вписанном угле: ∠ = ½ дуги"
              categoryBadge="Углы A, B, C"
              description="Вписанный угол опирается на дугу и равен ровно половине её градусной меры (или половине соответствующего центрального угла)."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono text-slate-800">
                    <div className="font-bold text-sm text-indigo-950">∠A = ½ · Дуга(BC) = ½ · {centralDegBC.toFixed(1)}° = {angles.A.toFixed(1)}°</div>
                    <div className="font-bold text-sm text-indigo-950 mt-1">∠B = ½ · Дуга(CA) = ½ · {centralDegCA.toFixed(1)}° = {angles.B.toFixed(1)}°</div>
                    <div className="font-bold text-sm text-indigo-950 mt-1">∠C = ½ · Дуга(AB) = ½ · {centralDegAB.toFixed(1)}° = {angles.C.toFixed(1)}°</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs flex justify-between items-center text-indigo-700 font-bold">
                    <span>Сумма углов: ∠A + ∠B + ∠C = 180°</span>
                    <span className="text-emerald-700">
                      {(angles.A + angles.B + angles.C).toFixed(1)}° = 180° ✓
                    </span>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950">Реляционное свойство дуг:</div>
                  <p className="text-slate-600 text-[11px]">
                    Дуги BC, CA и AB в сумме составляют ровно 1.0 (целый круг, 360°).
                    Поскольку каждый угол равен половине своей дуги, сумма всех трёх углов:
                    ½ · (Дуга BC + Дуга CA + Дуга AB) = ½ · 360° = <strong>180°</strong>.
                  </p>
                </div>
              }
              methodTab={methodTab}
              traceBlock={
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Логический вывод угла (Trace):</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(['A', 'B', 'C'] as VertexId[]).map((vId) => (
                        <button
                          key={vId}
                          onClick={() => setAngleTraceVertex(angleTraceVertex === vId ? null : vId)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition cursor-pointer ${
                            angleTraceVertex === vId
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Trace ∠{vId}
                        </button>
                      ))}
                    </div>
                  </div>
                  {angleTraceVertex && (
                    <TraceTimeline
                      trace={buildAngleTrace(angleTraceVertex, currentSnapshot)}
                      onClose={() => setAngleTraceVertex(null)}
                    />
                  )}
                </div>
              }
            />
          </div>
        )}

        {/* =========================================================
            ТЕМА 3: ДУГИ ОКРУЖНОСТИ
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'arcs') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                3. ДУГИ ОКРУЖНОСТИ — ДЕЛЕНИЕ ЦИКЛА НА ТРИ СЕКТОРА
              </h3>
            </div>

            <FormulaCard
              title="Сумма дуг окружности: Дуга AB + Дуга BC + Дуга CA = 360°"
              categoryBadge="Дуги"
              description="Три вершины A, B, C делят замкнутую окружность на три дуги без перекрытий и пробелов."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono space-y-1">
                    <div>Дуга AB = {centralDegAB.toFixed(1)}° ({formatCircleFraction(arcs.AB)})</div>
                    <div>Дуга BC = {centralDegBC.toFixed(1)}° ({formatCircleFraction(arcs.BC)})</div>
                    <div>Дуга CA = {centralDegCA.toFixed(1)}° ({formatCircleFraction(arcs.CA)})</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs flex justify-between items-center text-slate-800">
                    <span className="font-semibold">Сумма дуг:</span>
                    <span className="font-bold text-indigo-700">
                      {centralDegAB.toFixed(1)}° + {centralDegBC.toFixed(1)}° + {centralDegCA.toFixed(1)}° = 360.0° ✓
                    </span>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 font-mono text-[11px]">
                    Сумма долей цикла: d_AB + d_BC + d_CA = 1.0 (100%)
                  </div>
                  <div className="font-mono text-slate-700 text-[11px] bg-white p-2 rounded border border-emerald-200">
                    {arcs.AB.toFixed(3)} + {arcs.BC.toFixed(3)} + {arcs.CA.toFixed(3)} = {(arcs.AB + arcs.BC + arcs.CA).toFixed(3)}
                  </div>
                </div>
              }
              methodTab={methodTab}
            />
          </div>
        )}

        {/* =========================================================
            ТЕМА 4: РАДИУС И ДИАМЕТР
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'circle') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                4. РАДИУС, ДИАМЕТР И МЕТРИКИ ОКРУЖНОСТИ
              </h3>
            </div>

            <FormulaCard
              title="Радиус R и Диаметр D = 2R"
              categoryBadge="Окружность"
              description="Радиус R — расстояние от центра O до любой вершины (OA = OB = OC = R). Диаметр — наибольшая хорда окружности."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                    <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                      <div className="text-slate-500 text-[10px]">РАДИУС R:</div>
                      <div className="text-indigo-900 font-bold text-sm">{radiusFormat.mm}</div>
                      <div className="text-slate-400 text-[10px]">({radiusFormat.px})</div>
                    </div>
                    <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                      <div className="text-slate-500 text-[10px]">ДИАМЕТР D = 2R:</div>
                      <div className="text-indigo-900 font-bold text-sm">{diameterFormat.mm}</div>
                      <div className="text-slate-400 text-[10px]">({diameterFormat.px})</div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Длина окружности C = 2πR:</span>
                      <span className="font-bold text-slate-900">{circumferenceFormat.mm} <span className="text-slate-400 font-normal font-mono text-[10px]">({circumferenceFormat.px})</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Площадь круга S_круг = πR²:</span>
                      <span className="font-bold text-slate-900">{circleAreaFormat.mm} <span className="text-slate-400 font-normal font-mono text-[10px]">({circleAreaFormat.px})</span></span>
                    </div>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-xs">
                  <div className="font-bold text-emerald-950 mb-1">Центральное свойство:</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Все вершины A, B, C равноудалены от центра O на расстояние R. Любая хорда не может превышать диаметр D = 2R (хорда максимальна, когда дуга равна ровно половине окружности: 180° или 0.5).
                  </p>
                </div>
              }
              methodTab={methodTab}
            />
          </div>
        )}

        {/* =========================================================
            ТЕМА 5: ПЛОЩАДЬ ТРЕУГОЛЬНИКА
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'area') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                5. ПЛОЩАДЬ ВПИСАННОГО ТРЕУГОЛЬНИКА
              </h3>
            </div>

            {/* Area Formulas */}
            <FormulaCard
              title="Площадь: S = ½ · a · b · sin(C) и S = abc / (4R)"
              categoryBadge="Площадь S"
              description="Площадь треугольника через две стороны и синус угла между ними, либо через три стороны и радиус описанной окружности R."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono space-y-1.5">
                    <div className="text-indigo-950 font-bold text-sm">Формула 1: S = ½ · a · b · sin(∠C)</div>
                    <div className="text-slate-600 text-[11px]">
                      S = ½ · {chords.BC.toFixed(1)} · {chords.CA.toFixed(1)} · sin({angles.C.toFixed(1)}°)
                    </div>
                    <div className="text-indigo-950 font-bold text-sm pt-1 border-t border-indigo-200/60">
                      Формула 2: S = (a · b · c) / (4R)
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      S = ({chords.BC.toFixed(1)} · {chords.CA.toFixed(1)} · {chords.AB.toFixed(1)}) / (4 · {activeRadius})
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Итоговая площадь:</span>
                    <span className="font-bold text-purple-700 text-sm">
                      S = {areaFormat.mm} <span className="text-slate-400 font-normal text-xs">({areaFormat.px})</span>
                    </span>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 font-mono text-[11px]">
                    Формула через радиус и углы: S = 2R² · sin(A) · sin(B) · sin(C)
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Поскольку a = 2R sin A, b = 2R sin B, c = 2R sin C, площадь можно выразить напрямую через три вписанных угла и радиус окружности:
                    S = 2 · {activeRadius}² · sin({angles.A.toFixed(1)}°) · sin({angles.B.toFixed(1)}°) · sin({angles.C.toFixed(1)}°).
                  </p>
                  <div className="font-mono text-emerald-800 font-bold text-xs bg-white p-2 rounded border border-emerald-200">
                    S = {areaFormat.mm} ({areaFormat.px})
                  </div>
                </div>
              }
              methodTab={methodTab}
            />
          </div>
        )}

        {/* =========================================================
            ТЕМА 6: ПЕРИМЕТР
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'perimeter') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                6. ПЕРИМЕТР ТРЕУГОЛЬНИКА
              </h3>
            </div>

            <FormulaCard
              title="Периметр P = AB + BC + CA"
              categoryBadge="Периметр P"
              description="Сумма длин трёх сторон треугольника (хорд окружности)."
              classicalBlock={
                <div className="space-y-2 text-xs">
                  <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 font-mono space-y-1">
                    <div className="text-indigo-950 font-bold text-sm">P = a + b + c</div>
                    <div className="text-slate-600 text-[11px]">
                      P = {(chords.AB * scale).toFixed(1)} + {(chords.BC * scale).toFixed(1)} + {(chords.CA * scale).toFixed(1)} мм
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Итоговый периметр:</span>
                    <span className="font-bold text-teal-700 text-sm">
                      P = {perimeterFormat.mm} <span className="text-slate-400 font-normal text-xs">({perimeterFormat.px})</span>
                    </span>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 font-mono text-[11px]">
                    P = 2R · (sin A + sin B + sin C)
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Периметр выражается через сумму синусов углов треугольника, умноженную на диаметр 2R.
                  </p>
                </div>
              }
              methodTab={methodTab}
            />
          </div>
        )}

        {/* =========================================================
            ТЕМА 7: ОСОБЫЕ СЛУЧАИ И ТОПОЛОГИЯ
           ========================================================= */}
        {(activeCategory === 'all' || activeCategory === 'special') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200 pb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                7. ОСОБЫЕ СЛУЧАИ: ОСТРОУГОЛЬНЫЙ, ПРЯМОУГОЛЬНЫЙ, ТУПОУГОЛЬНЫЙ
              </h3>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="text-xs text-slate-600 leading-relaxed">
                Положение центра окружности <strong>O</strong> строго зависит от величины углов и дуг:
              </div>

              {/* Three Case Buttons with Formulas and Explanations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Acute */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">ОСТРОУГОЛЬНЫЙ</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        O внутри
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Все три угла &lt; 90°. Все три дуги &lt; 180° (d_max &lt; 0.5). Центр O строго внутри треугольника.
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectPreset('acute')}
                    className="w-full py-1.5 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    Поставить на циферблате
                  </button>
                </div>

                {/* Right */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-950">ПРЯМОУГОЛЬНЫЙ</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                        Теорема Фалеса
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Один угол ровно 90°. Противоположная дуга ровно 180° (d = 0.5, полуокружность!). Гипотенуза = <strong>D = 2R</strong>. Центр O лежит ровно на середине гипотенузы!
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectPreset('right')}
                    className="w-full py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Поставить 90° (Диаметр)
                  </button>
                </div>

                {/* Obtuse */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">ТУПОУГОЛЬНЫЙ</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        O снаружи
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      Один угол &gt; 90°. Противоположная дуга &gt; 180° (d_max &gt; 0.5). Центр O находится снаружи треугольника.
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectPreset('obtuse')}
                    className="w-full py-1.5 bg-white border border-slate-300 hover:border-amber-400 hover:text-amber-700 rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    Поставить на циферблате
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            8. π — ОТНОШЕНИЕ ДЛИНЫ ВСЕЙ ОКРУЖНОСТИ К ДИАМЕТРУ
            ======================================================== */}
        {(activeCategory === 'all' || activeCategory === 'pi_ratio') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                8
              </span>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                π — отношение длины всей окружности к диаметру
              </h3>
            </div>

            {/* Pedagogical Lead Quote */}
            <div className="bg-indigo-50/80 border-l-4 border-indigo-600 p-4 rounded-r-xl">
              <p className="text-xs md:text-sm font-semibold text-indigo-950 leading-relaxed">
                «<strong>Отношение</strong> — это когда мы сравниваем одну величину с другой делением. Деление показывает, <em>во сколько раз</em> одна величина больше другой. <strong>Число π показывает, во сколько раз длина всей окружности больше её диаметра</strong>.»
              </p>
            </div>

            {/* Pedagogical Contrast: π vs Радиан */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-900 text-white rounded-xl text-xs font-mono">
              <div className="bg-indigo-950/90 border border-indigo-500/50 p-3 rounded-lg flex flex-col gap-1">
                <div className="text-indigo-300 font-bold uppercase tracking-wider text-[11px]">Число π — для ВСЕЙ окружности</div>
                <div className="text-white font-black text-sm">π = C / D</div>
                <div className="text-slate-300 text-[11px] font-sans">
                  Отношение длины <strong>всей окружности C</strong> к <strong>диаметру D</strong>.
                </div>
              </div>
              <div className="bg-emerald-950/90 border border-emerald-500/50 p-3 rounded-lg flex flex-col gap-1">
                <div className="text-emerald-300 font-bold uppercase tracking-wider text-[11px]">Радиан θ — для ВЫБРАННОЙ дуги</div>
                <div className="text-white font-black text-sm">θ = s / R</div>
                <div className="text-slate-300 text-[11px] font-sans">
                  Отношение длины <strong>выбранной дуги s</strong> к <strong>радиусу R</strong>.
                </div>
              </div>
            </div>

            {/* Geometric Terminology Precision */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">Геометрическая точность: различаем понятия</div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] list-disc list-inside">
                <li><strong>Окружность</strong> — замкнутая граница круга (её длина <em>C</em>).</li>
                <li><strong>Круг</strong> — плоская фигура, область плоскости внутри окружности.</li>
                <li><strong>Дуга</strong> — криволинейная часть окружности между двумя точками (её длина <em>s</em>).</li>
                <li><strong>Хорда</strong> — отрезок прямой линии между двумя точками окружности.</li>
                <li><strong>Диаметр (D)</strong> — отрезок через центр, соединяющий точки окружности (<em>D = 2R</em>).</li>
                <li><strong>Радиус (R)</strong> — отрезок от центра до любой точки окружности.</li>
              </ul>
            </div>

            <FormulaCard
              title="π = C / D (Геометрический смысл числа π)"
              categoryBadge="8.1. Смысл числа π"
              description="Возьмём любой круг. Измерим длину всей окружности C и диаметр D. Разделим одно на другое."
              isHighlighted={activeHighlight?.type === 'ratio' && activeHighlight.kind === 'pi'}
              onMouseEnter={() => onHoverHighlight({ type: 'ratio', kind: 'pi' })}
              onMouseLeave={() => onHoverHighlight(null)}
              methodTab={methodTab}
              classicalBlock={
                <div className="space-y-3">
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-1.5 font-mono text-xs">
                    <div className="text-indigo-950 font-bold">
                      π = Длина всей окружности / Диаметр = C / D
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      где C — длина всей окружности, D — диаметр круга.
                    </div>
                    <div className="text-indigo-800 font-semibold">
                      Текущие значения: C ≈ {currentC_mm.toFixed(1)} мм, D = {currentD_mm.toFixed(1)} мм
                    </div>
                    <div className="text-emerald-700 font-bold bg-white p-2 rounded-lg border border-emerald-200">
                      C / D = {currentC_mm.toFixed(1)} / {currentD_mm.toFixed(1)} = {piRatio.toFixed(5)}... ≈ 3.14159
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                    <p>
                      <strong>Что удивительно?</strong> Какой бы круг мы ни взяли — монетку, колесо велосипеда, экватор Земли или наш круг в лаборатории — отношение всегда одно и то же: <strong>≈ 3.14159</strong>!
                    </p>
                    <p className="text-amber-800 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px]">
                      ⚠️ <strong>Формулировка для ребёнка:</strong> Число π показывает, во сколько раз длина всей окружности больше её диаметра. Это безразмерное отношение, а не миллиметры.
                    </p>
                  </div>

                  <button
                    onClick={() => onHoverHighlight({ type: 'ratio', kind: 'pi' })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Показать отношение C / D на круге
                  </button>
                </div>
              }
              relationalBlock={
                <div className="space-y-3">
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-1.5 font-mono text-xs">
                    <div className="text-emerald-950 font-bold">
                      C = π × D = 2 × π × R
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Вывод формулы из определения:
                    </div>
                    <div className="text-emerald-800 font-medium">
                      Раз C / D = π ➔ умножаем обе части на D ➔ C = π × D
                    </div>
                    <div className="text-emerald-900 font-semibold bg-white p-2 rounded-lg border border-emerald-200">
                      Так как D = 2R ➔ C = 2πR = 2 × 3.1416 × {currentR_mm.toFixed(1)} = {currentC_mm.toFixed(1)} мм
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Формулу длины всей окружности <strong>не нужно зубрить</strong>: она является прямым следствием определения числа π как геометрического отношения!
                  </p>
                </div>
              }
            />
          </div>
        )}

        {/* ========================================================
            9. РАДИАН — ОТНОШЕНИЕ ДЛИНЫ ВЫБРАННОЙ ДУГИ К РАДИУСУ
            ======================================================== */}
        {(activeCategory === 'all' || activeCategory === 'radian_ratio') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                9
              </span>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Радиан — отношение длины выбранной дуги к радиусу
              </h3>
            </div>

            {/* Pedagogical Lead Quote */}
            <div className="bg-emerald-50/80 border-l-4 border-emerald-600 p-4 rounded-r-xl">
              <p className="text-xs md:text-sm font-semibold text-emerald-950 leading-relaxed">
                «Снова отношение! Но теперь мы сравниваем не всю окружность с диаметром, а <strong>длину выбранной дуги с радиусом</strong>. <strong>Радиан показывает, сколько радиусов содержится в длине выбранной дуги</strong>: <strong>θ = s / R</strong>.»
              </p>
            </div>

            {/* Live Interactive Experiment: "FIND 1 RADIAN" */}
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-700/60 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-lg">
                    <Target className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                      Интерактивный тренажёр: «НАЙДИ 1 РАДИАН»
                    </h4>
                    <p className="text-[11px] text-emerald-200/90 font-medium">
                      Двигайте точку B по окружности, пока длина выбранной дуги s не станет в точности равна радиусу R!
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSetOneRadian}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Установить ровно 1 радиан (57.3°)
                </button>
              </div>

              {/* 5 Real-Time Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
                <div className="bg-emerald-950/70 border border-emerald-700/50 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider mb-1">Выбранная дуга s (AB)</div>
                  <div className="font-bold text-white text-sm">{arcAB_mm.toFixed(1)} мм</div>
                  <div className="text-[10px] text-slate-400 font-normal">{(arcAB_fraction * 100).toFixed(1)}% круга</div>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-700/50 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider mb-1">Радиус R</div>
                  <div className="font-bold text-white text-sm">{currentR_mm.toFixed(1)} мм</div>
                  <div className="text-[10px] text-slate-400 font-normal">эталонный отрезок</div>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-700/50 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider mb-1">Отношение s / R</div>
                  <div className="font-bold text-emerald-300 text-sm">{radianRatio.toFixed(3)}</div>
                  <div className="text-[10px] text-slate-400 font-normal">радиусов в длине дуги</div>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-700/50 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider mb-1">Угол θ (рад)</div>
                  <div className="font-bold text-white text-sm">{arcAB_rad.toFixed(3)} рад</div>
                  <div className="text-[10px] text-slate-400 font-normal">θ = s / R</div>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-700/50 p-2.5 rounded-xl text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider mb-1">Угол в градусах</div>
                  <div className="font-bold text-amber-300 text-sm">{arcAB_deg.toFixed(1)}°</div>
                  <div className="text-[10px] text-slate-400 font-normal">1 рад ≈ 57.3°</div>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div className="mt-1">
                {isOneRadianFound ? (
                  <div className="bg-emerald-500 text-slate-950 p-3 rounded-xl font-bold text-xs flex items-center justify-between gap-2 shadow-md animate-pulse">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
                      <span>
                        🎯 <strong>ИДЕАЛЬНО! ВЫ НАШЛИ 1 РАДИАН! ДЛИНА ВЫБРАННОЙ ДУГИ = РАДИУС!</strong>
                        <br />
                        <span className="font-normal text-[11px] opacity-90">
                          Длина выбранной дуги s ({arcAB_mm.toFixed(1)} мм) в точности равна радиусу R ({currentR_mm.toFixed(1)} мм). Отношение s / R = 1.000.
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => onHoverHighlight({ type: 'ratio', kind: 'radian' })}
                      className="shrink-0 bg-slate-950 text-white px-2.5 py-1 rounded-md text-[11px] font-bold"
                    >
                      Подсветить
                    </button>
                  </div>
                ) : radianRatio < 1 ? (
                  <div className="bg-emerald-950/90 border border-emerald-600/70 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2">
                    <span className="text-emerald-200">
                      🟡 <strong>Длина дуги s меньше радиуса R</strong> (s/R = {radianRatio.toFixed(2)} &lt; 1). Двигайте точку B дальше по окружности!
                    </span>
                    <button
                      onClick={() => onHoverHighlight({ type: 'ratio', kind: 'radian' })}
                      className="shrink-0 bg-emerald-800 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-semibold"
                    >
                      Подсветить дугу и радиус
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-950/90 border border-emerald-600/70 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2">
                    <span className="text-emerald-200">
                      🔵 <strong>Длина дуги s больше радиуса R</strong> (s/R = {radianRatio.toFixed(2)} &gt; 1). Верните точку B немного назад!
                    </span>
                    <button
                      onClick={() => onHoverHighlight({ type: 'ratio', kind: 'radian' })}
                      className="shrink-0 bg-emerald-800 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-semibold"
                    >
                      Подсветить дугу и радиус
                    </button>
                  </div>
                )}
              </div>
            </div>

            <FormulaCard
              title="Определение радиана: θ = s / R"
              categoryBadge="9.1. Геометрическое определение"
              description="1 радиан — это центральный угол, который опирается на дугу, длина которой равна радиусу окружности (s = R)."
              isHighlighted={activeHighlight?.type === 'ratio' && activeHighlight.kind === 'radian'}
              onMouseEnter={() => onHoverHighlight({ type: 'ratio', kind: 'radian' })}
              onMouseLeave={() => onHoverHighlight(null)}
              methodTab={methodTab}
              classicalBlock={
                <div className="space-y-3">
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-1.5 font-mono text-xs">
                    <div className="text-emerald-950 font-bold">
                      θ (в радианах) = Длина выбранной дуги / Радиус = s / R
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      где s — длина выбранной дуги, R — радиус окружности.
                    </div>
                    <div className="text-emerald-800 font-semibold bg-white p-2 rounded-lg border border-emerald-200">
                      Если длина дуги s = R ➔ отношение s / R = 1. Это ровно 1 радиан ≈ 57.2958° ≈ 57°17′45″
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                    <p className="text-emerald-950 font-semibold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 text-[11px]">
                      💬 <strong>Формулировка для ребёнка:</strong> Радиан показывает, сколько радиусов содержится в длине выбранной дуги.
                    </p>
                    <p>
                      В радианах угол измеряется не в искусственных «градусах» (придуманных в древнем Вавилоне), а непосредственно в <strong>долях собственного радиуса окружности</strong>!
                    </p>
                  </div>
                </div>
              }
              relationalBlock={
                <div className="space-y-3">
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-1.5 font-mono text-xs">
                    <div className="text-emerald-950 font-bold">
                      Длина выбранной дуги через радианы: s = θ × R
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Вывод: раз θ = s / R, умножаем обе части формулы на радиус R:
                    </div>
                    <div className="text-emerald-800 font-semibold bg-white p-2 rounded-lg border border-emerald-200">
                      s = {arcAB_rad.toFixed(2)} рад × {currentR_mm.toFixed(1)} мм = {arcAB_mm.toFixed(1)} мм
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    В тригонометрии и физике именно радианная мера делает формулы чистыми, без лишних коэффициентов π/180!
                  </p>
                </div>
              }
              traceBlock={
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Логический вывод радиана (Trace):</span>
                    </span>
                    <button
                      onClick={() => setShowRadianTrace(!showRadianTrace)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition bg-emerald-100 text-emerald-900 hover:bg-emerald-200 cursor-pointer"
                    >
                      {showRadianTrace ? 'Скрыть Trace' : 'Показать Trace дуги AB'}
                    </button>
                  </div>
                  {showRadianTrace && (
                    <TraceTimeline
                      trace={buildRadianTrace('AB', currentSnapshot)}
                      onClose={() => setShowRadianTrace(false)}
                    />
                  )}
                </div>
              }
            />
          </div>
        )}

        {/* ========================================================
            10. ЕДИНАЯ СИСТЕМА: π, РАДИАНЫ, ГРАДУСЫ И ДОЛИ
            ======================================================== */}
        {(activeCategory === 'all' || activeCategory === 'radians_scale') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold text-xs flex items-center justify-center">
                10
              </span>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                π, радианы, градусы и доли круга — единая система
              </h3>
            </div>

            <div className="bg-purple-50/80 border-l-4 border-purple-600 p-4 rounded-r-xl">
              <p className="text-xs md:text-sm font-semibold text-purple-950 leading-relaxed">
                «Почему в полном круге ровно <strong>2π радиан</strong>? Потому что длина всей окружности равна 2πR. Если разделить всю длину C на радиус R, мы получим: <strong>C / R = 2πR / R = 2π</strong>! Всё сходится в одну красивую точку!»
              </p>
            </div>

            {/* Visual Landmark Comparison Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>Таблица ориентиров (наведите на шкалу диска)</span>
                </div>
                {onChangeScaleMode && (
                  <button
                    onClick={() => onChangeScaleMode('radians')}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                  >
                    Включить шкалу РАДИАНЫ на круге
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-mono uppercase">
                      <th className="py-2 px-2.5">Доля круга</th>
                      <th className="py-2 px-2.5">Градусы (°)</th>
                      <th className="py-2 px-2.5">Радианы (точно)</th>
                      <th className="py-2 px-2.5">Радианы (число)</th>
                      <th className="py-2 px-2.5">Смысл для ребёнка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr className="hover:bg-purple-50/50">
                      <td className="py-2 px-2.5 font-bold text-purple-800">1/12 круга</td>
                      <td className="py-2 px-2.5 font-bold text-amber-800">30°</td>
                      <td className="py-2 px-2.5 font-bold text-emerald-700">π / 6</td>
                      <td className="py-2 px-2.5 text-slate-600">≈ 0.52 рад</td>
                      <td className="py-2 px-2.5 font-sans text-slate-700">1 час на циферблате</td>
                    </tr>
                    <tr className="hover:bg-purple-50/50">
                      <td className="py-2 px-2.5 font-bold text-purple-800">1/6 круга</td>
                      <td className="py-2 px-2.5 font-bold text-amber-800">60°</td>
                      <td className="py-2 px-2.5 font-bold text-emerald-700">π / 3</td>
                      <td className="py-2 px-2.5 text-slate-600">≈ 1.05 рад</td>
                      <td className="py-2 px-2.5 font-sans text-slate-700">Чуть больше 1 радиана!</td>
                    </tr>
                    <tr className="hover:bg-purple-50/50 bg-indigo-50/30">
                      <td className="py-2 px-2.5 font-bold text-purple-800">1/4 круга</td>
                      <td className="py-2 px-2.5 font-bold text-amber-800">90°</td>
                      <td className="py-2 px-2.5 font-bold text-emerald-700">π / 2</td>
                      <td className="py-2 px-2.5 text-slate-600">≈ 1.57 рад</td>
                      <td className="py-2 px-2.5 font-sans text-slate-700">Четверть круга (прямой угол)</td>
                    </tr>
                    <tr className="hover:bg-purple-50/50 bg-purple-50/40">
                      <td className="py-2 px-2.5 font-bold text-purple-800">1/2 круга</td>
                      <td className="py-2 px-2.5 font-bold text-amber-800">180°</td>
                      <td className="py-2 px-2.5 font-bold text-emerald-700">π</td>
                      <td className="py-2 px-2.5 text-slate-600">≈ 3.14 рад</td>
                      <td className="py-2 px-2.5 font-sans text-slate-700">Половина круга (развёрнутый)</td>
                    </tr>
                    <tr className="hover:bg-purple-50/50">
                      <td className="py-2 px-2.5 font-bold text-purple-800">3/4 круга</td>
                      <td className="py-2 px-2.5 font-bold text-amber-800">270°</td>
                      <td className="py-2 px-2.5 font-bold text-emerald-700">3π / 2</td>
                      <td className="py-2 px-2.5 text-slate-600">≈ 4.71 рад</td>
                      <td className="py-2 px-2.5 font-sans text-slate-700">Три четверти круга</td>
                    </tr>
                    <tr className="hover:bg-purple-50/50 bg-emerald-50/40 font-bold">
                      <td className="py-2 px-2.5 text-purple-900">1 целый круг</td>
                      <td className="py-2 px-2.5 text-amber-900">360°</td>
                      <td className="py-2 px-2.5 text-emerald-800">2π</td>
                      <td className="py-2 px-2.5 text-slate-900">≈ 6.28 рад</td>
                      <td className="py-2 px-2.5 font-sans text-emerald-900">Полный оборот (вся окружность C = 2πR)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            11. ИНТЕРАКТИВНЫЙ ТЕСТ НА ПОНИМАНИЕ
            ======================================================== */}
        {(activeCategory === 'all' || activeCategory === 'ratio_quiz') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                11
              </span>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                Интерактивный тест: Проверь себя (Отношения, π и Радиан)
              </h3>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <p className="text-xs text-slate-600">
                Ответьте на 5 простых вопросов, чтобы закрепить понимание геометрических отношений:
              </p>

              {(() => {
                const quizQuestions = [
                  {
                    id: 1,
                    question: '1. Что означает слово «отношение» в геометрии?',
                    options: [
                      'Сравнение двух величин делением (во сколько раз одна больше другой)',
                      'Сумма длин двух отрезков',
                      'Разность между дугой и радиусом',
                    ],
                    correct: 0,
                    explanation: 'Отношение — это результат деления: оно показывает, во сколько раз одна величина превосходит другую.',
                  },
                  {
                    id: 2,
                    question: '2. Что такое число π?',
                    options: [
                      'Длина самого большого круга в метрах',
                      'Отношение длины всей окружности к её диаметру (C / D)',
                      'Количество градусов в треугольнике',
                    ],
                    correct: 1,
                    explanation: 'π — это безразмерное геометрическое отношение C / D: длина всей окружности всегда ровно в π (≈ 3.14159) раз больше диаметра круга.',
                  },
                  {
                    id: 3,
                    question: '3. При каком условии центральный угол равен ровно 1 радиану?',
                    options: [
                      'Когда угол равен строго 90°',
                      'Когда дуга равна половине окружности',
                      'Когда длина выбранной дуги равна радиусу окружности (s = R)',
                    ],
                    correct: 2,
                    explanation: 'По определению θ = s / R: когда длина выбранной дуги s равна радиусу R (s = R), отношение s / R = 1 радиан (≈ 57.3°).',
                  },
                  {
                    id: 4,
                    question: '4. Сколько радиан содержит полный круг (360°)?',
                    options: [
                      'π радиан (≈ 3.14 рад)',
                      '2π радиан (≈ 6.28 рад)',
                      '4 радиана',
                    ],
                    correct: 1,
                    explanation: 'Так как длина всей окружности C = 2πR, отношение всей окружности к радиусу равно C / R = 2πR / R = 2π радиан.',
                  },
                  {
                    id: 5,
                    question: '5. Какой угол в градусах соответствует π / 2 радиан?',
                    options: [
                      '90° (прямой угол, четверть круга)',
                      '45° (острый угол)',
                      '180° (развёрнутый угол)',
                    ],
                    correct: 0,
                    explanation: 'Раз полный круг 2π = 360°, то половина π = 180°, а четверть π/2 = 90°.',
                  },
                ];

                const score = quizQuestions.filter((q) => quizAnswers[q.id] === q.correct).length;

                return (
                  <>
                    {quizQuestions.map((q) => {
                      const selected = quizAnswers[q.id];
                      const isAnswered = selected !== undefined;
                      const isCorrect = selected === q.correct;

                      return (
                        <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                          <div className="font-bold text-xs text-slate-900">
                            {q.question}
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {q.options.map((opt, optIdx) => {
                              let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';
                              if (isAnswered) {
                                if (optIdx === q.correct) {
                                  btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                                } else if (selected === optIdx) {
                                  btnStyle = 'bg-rose-100 border-rose-400 text-rose-950';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${btnStyle}`}
                                >
                                  <span className="font-mono mr-2 font-bold text-slate-400">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {isAnswered && (
                            <div
                              className={`text-[11px] p-2 rounded-lg border leading-relaxed ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-amber-50 border-amber-200 text-amber-900'
                              }`}
                            >
                              <strong>{isCorrect ? 'Верно!' : 'Пояснение:'}</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-700">
                        Правильно отвечено: <strong className="text-emerald-700">{score}</strong> из {quizQuestions.length}
                      </span>
                      <button
                        onClick={() => setQuizAnswers({})}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                      >
                        Сбросить ответы
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

interface TraceTimelineProps {
  trace: GeometryTrace;
  onClose?: () => void;
}

const TraceTimeline: React.FC<TraceTimelineProps> = ({ trace, onClose }) => {
  return (
    <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Логический вывод (Trace): {trace.target}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Итог: {trace.finalValue}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {trace.steps.map((step) => (
          <div
            key={step.stepNumber}
            className="flex items-start gap-2.5 text-xs bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60"
          >
            <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center mt-0.5">
              {step.stepNumber}
            </span>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-200">{step.from}</span>
                <span className="text-slate-400 font-mono">─({step.relation})─▶</span>
                <span className="font-bold text-emerald-300">{step.to}</span>
                <span className="font-mono text-indigo-300 ml-auto bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700">
                  {step.value}
                </span>
              </div>
              <p className="text-[11px] text-slate-300/90 leading-normal">
                {step.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface FormulaCardProps {
  title: string;
  categoryBadge: string;
  description: string;
  classicalBlock: React.ReactNode;
  relationalBlock: React.ReactNode;
  methodTab: 'both' | 'classical' | 'relational';
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  traceBlock?: React.ReactNode;
}

const FormulaCard: React.FC<FormulaCardProps> = ({
  title,
  categoryBadge,
  description,
  classicalBlock,
  relationalBlock,
  methodTab,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  traceBlock,
}) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`p-4 rounded-xl border transition-all duration-200 bg-white ${
        isHighlighted
          ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md scale-[1.005]'
          : 'border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      {/* Header with Title & Eye Highlight Badge */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
              {categoryBadge}
            </span>
            <h4 className="text-xs md:text-sm font-bold text-slate-800">
              {title}
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="shrink-0">
          <span
            title="Наведите курсор, чтобы подсветить элемент на левом рисунке"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 cursor-pointer hover:text-indigo-600 hover:border-indigo-300"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Подсветить</span>
          </span>
        </div>
      </div>

      {/* Content depending on methodTab */}
      {methodTab === 'both' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          <div>
            <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              <span>Классический путь (Тригонометрия)</span>
            </div>
            {classicalBlock}
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Реляционный / Матричный путь</span>
            </div>
            {relationalBlock}
          </div>
        </div>
      ) : methodTab === 'classical' ? (
        <div className="pt-1">
          <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            <span>Классический путь (Школьная тригонометрия)</span>
          </div>
          {classicalBlock}
        </div>
      ) : (
        <div className="pt-1">
          <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Реляционный / Матричный путь (Связи объектов)</span>
          </div>
          {relationalBlock}
        </div>
      )}

      {/* Trace block (logical derivation chain) */}
      {traceBlock && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {traceBlock}
        </div>
      )}
    </div>
  );
};
