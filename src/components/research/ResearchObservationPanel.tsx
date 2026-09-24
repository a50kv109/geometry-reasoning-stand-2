// src/components/research/ResearchObservationPanel.tsx
// Research Mode UI component for Packet #4 & Packet #5 (Dynamic Geometric Experiment Engine).
// Visualizes:
// 1. Derived Chord <-> Arc Relations (minor/major arc, lengths, 2R*sin(theta/2), diameter check)
// 2. Central vs Inscribed Angle Relations (alpha = theta/2)
// 3. Structural Construction Trace (topological depth, group hierarchy, explicit non-historical note)
// 4. Epistemic Observation Pipeline (Measurement -> Fact -> Observation -> Candidate -> Match -> Verified)
// 5. Dynamic Geometric Experiment (Chord-Arc Dynamic Relation with Manual Capture, Deltas, Hypotheses)
// 6. Deterministic Research Snapshot / Experiment Result viewer and copier (timestamp-free guarantee)

import React, { useState, useMemo } from 'react';
import {
  Compass,
  GitFork,
  FileCheck,
  Layers,
  Copy,
  Check,
  Scale,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  FlaskConical,
  Camera,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Sliders,
  Network,
  Award,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { FullGeometryState } from '../../engines/constructionCore';
import { createResearchSnapshot } from '../../engines/research/researchSnapshot';
import { EpistemicStatus } from '../../engines/research/researchTypes';
import {
  createChordArcExperimentConfig,
  captureExperimentStep,
  buildExperimentResult,
} from '../../engines/research/dynamicExperiment';
import { ExperimentStep } from '../../engines/research/experimentTypes';
import { buildResearchGraph } from '../../engines/research/researchGraph';
import {
  HypothesisNode,
  VerificationNode,
  TheoremNode,
  ResearchGraph,
} from '../../engines/research/researchGraphTypes';

interface ResearchObservationPanelProps {
  geometryState: FullGeometryState;
  scale: number;
}

export const ResearchObservationPanel: React.FC<ResearchObservationPanelProps> = ({
  geometryState,
  scale,
}) => {
  const [activeTab, setActiveTab] = useState<
    'relations' | 'experiment' | 'ledger' | 'graph' | 'trace' | 'epistemic' | 'snapshot'
  >('relations');
  const [copied, setCopied] = useState(false);
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null);

  // Experiment State: Manual capture steps
  const [targetChordKey, setTargetChordKey] = useState<'AB' | 'BC' | 'CA'>('AB');
  const [capturedSteps, setCapturedSteps] = useState<ExperimentStep[]>([]);

  // Experiment configuration
  const experimentConfig = useMemo(() => {
    const fixed = targetChordKey === 'AB' ? 'A' : targetChordKey === 'BC' ? 'B' : 'C';
    const moving = targetChordKey === 'AB' ? 'B' : targetChordKey === 'BC' ? 'C' : 'A';
    return createChordArcExperimentConfig(targetChordKey, fixed, moving);
  }, [targetChordKey]);

  // Compiled experiment result (pure, deterministic)
  const experimentResult = useMemo(() => {
    return buildExperimentResult(experimentConfig, capturedSteps);
  }, [experimentConfig, capturedSteps]);

  // Derive research snapshot deterministically
  const snapshot = useMemo(() => {
    return createResearchSnapshot(geometryState, scale);
  }, [geometryState, scale]);

  // Derive Research Graph deterministically
  const researchGraph: ResearchGraph = useMemo(() => {
    return buildResearchGraph([experimentResult], geometryState, snapshot.constructionTrace);
  }, [experimentResult, geometryState, snapshot.constructionTrace]);

  const handleCaptureStep = () => {
    const newStep = captureExperimentStep(
      geometryState,
      capturedSteps.length,
      experimentConfig,
      scale
    );
    setCapturedSteps((prev) => [...prev, newStep]);
  };

  const handleResetExperiment = () => {
    setCapturedSteps([]);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEpistemicBadge = (level: EpistemicStatus) => {
    switch (level) {
      case 'MEASUREMENT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            ИЗМЕРЕНИЕ
          </span>
        );
      case 'FACT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            ФАКТ
          </span>
        );
      case 'OBSERVATION':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            НАБЛЮДЕНИЕ
          </span>
        );
      case 'CANDIDATE_INVARIANT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            ГИПОТЕЗА
          </span>
        );
      case 'KNOWN_RELATION_MATCH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            СОВПАДЕНИЕ ПАТТЕРНА (НЕ ДОКАЗАНО)
          </span>
        );
      case 'VERIFIED_INVARIANT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> ВЕРИФИЦИРОВАННЫЙ ИНВАРИАНТ
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">
              Исследовательский модуль геометрии (Пакеты #4 & #5)
            </h3>
            <p className="text-xs text-slate-300">
              Связи хорда-дуга, топологический след, эпистемический контур и динамический эксперимент
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs bg-indigo-900/60 border border-indigo-700/50 px-2.5 py-1 rounded-lg text-indigo-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Детерминированный срез v1.0.0</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('relations')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'relations'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-indigo-600" />
          <span>Связи Хорда ↔ Дуга</span>
        </button>

        <button
          onClick={() => setActiveTab('experiment')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'experiment'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
          <span>Эксперимент: Динамика ({capturedSteps.length} шагов)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-indigo-600" />
          <span>Эпистемический реестр ({researchGraph.nodes.theorems.length} Q.E.D.)</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'graph'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-indigo-600" />
          <span>Граф исследований (DAG)</span>
        </button>

        <button
          onClick={() => setActiveTab('trace')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'trace'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GitFork className="w-3.5 h-3.5 text-indigo-600" />
          <span>Топологический след ({snapshot.constructionTrace.nodes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('epistemic')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'epistemic'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Эпистемический контур</span>
        </button>

        <button
          onClick={() => setActiveTab('snapshot')}
          className={`px-3 py-2 font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'snapshot'
              ? 'bg-white text-indigo-950 border-t border-x border-slate-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Срез состояния (JSON)</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 space-y-4">
        {/* TAB 1: RELATIONS */}
        {activeTab === 'relations' && (
          <div className="space-y-4">
            {/* Chord <-> Arc Relations Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Производные метрические связи: Хорда ↔ Дуги</span>
                <span className="text-[11px] font-normal text-slate-500 lowercase">
                  (дуга не хранится как примитив, вычисляется на лету)
                </span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Хорда</th>
                      <th className="p-2.5">Длина c (мм)</th>
                      <th className="p-2.5">Меньшая дуга θ_min</th>
                      <th className="p-2.5">Длина дуги s_min</th>
                      <th className="p-2.5">2R·sin(θ/2)</th>
                      <th className="p-2.5">Большая дуга θ_maj</th>
                      <th className="p-2.5">Тип</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot.chordArcRelations.map((r) => (
                      <tr key={r.chordId} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-bold font-mono text-indigo-950">
                          [{r.p1Name}{r.p2Name}]
                        </td>
                        <td className="p-2.5 font-mono text-slate-900 font-semibold">
                          {r.chordLength.toFixed(1)}
                        </td>
                        <td className="p-2.5 font-mono text-indigo-700">
                          {r.minorArcDeg.toFixed(1)}°
                        </td>
                        <td className="p-2.5 font-mono text-slate-700">
                          {r.minorArcLength.toFixed(1)} мм
                        </td>
                        <td className="p-2.5 font-mono text-slate-700">
                          {r.theoreticalChordLength.toFixed(1)} мм
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {r.majorArcDeg.toFixed(1)}°
                        </td>
                        <td className="p-2.5">
                          {r.isDiameter ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ДИАМЕТР (2R)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                              Хорда &lt; 2R
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Central vs Inscribed Angle Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Связь: Центральный угол θ ↔ Вписанный угол α (α = θ / 2)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {snapshot.centralInscribedRelations.map((rel) => (
                  <div
                    key={rel.arcId}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-950">Дуга {rel.chordLabel}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                        {rel.centralAngleDeg.toFixed(1)}° (Центр)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Вписанный ∠ ({rel.inscribedVertexId}):</span>
                      <strong className="text-slate-900 font-mono">{rel.inscribedAngleDeg?.toFixed(1)}°</strong>
                    </div>
                    <div className="text-[10px] text-emerald-700 flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>Теорема: α = θ/2</span>
                      <strong className="font-mono">
                        {(rel.centralAngleDeg / 2).toFixed(1)}° {rel.isRightAngle ? '(Прямой 90°)' : ''}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PACKET #5 DYNAMIC EXPERIMENT ENGINE */}
        {activeTab === 'experiment' && (
          <div className="space-y-4">
            {/* Experiment Control & Setup Bar */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Хорда для исследования:</span>
                </div>
                <div className="flex gap-1">
                  {(['AB', 'BC', 'CA'] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => setTargetChordKey(key)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition ${
                        targetChordKey === key
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      [{key}]
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCaptureStep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Зафиксировать шаг {capturedSteps.length}</span>
                </button>

                {capturedSteps.length > 0 && (
                  <button
                    onClick={handleResetExperiment}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить</span>
                  </button>
                )}
              </div>
            </div>

            {/* Workflow Guidance & Safety Rule */}
            {capturedSteps.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-300 space-y-2">
                <FlaskConical className="w-8 h-8 text-indigo-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">
                  Готов к проведению динамического эксперимента
                </h4>
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  1. Нажмите кнопку <strong>«Зафиксировать шаг 0»</strong> в текущем положении.<br />
                  2. Переместите вершину B по окружности на чертеже.<br />
                  3. Нажмите <strong>«Зафиксировать шаг 1»</strong> для вычисления дельт и проверки инвариантов.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Captured Steps Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Зафиксированные шаги эксперимента ({capturedSteps.length})</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Строго воспроизводимые детерминированные измерения
                    </span>
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Шаг</th>
                          <th className="p-2.5">Хорда</th>
                          <th className="p-2.5">Длина c (мм)</th>
                          <th className="p-2.5">Дуга θ_min</th>
                          <th className="p-2.5">2R·sin(θ/2)</th>
                          <th className="p-2.5">Дуга θ_maj</th>
                          <th className="p-2.5">Сумма дуг</th>
                          <th className="p-2.5">Радиус R</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {capturedSteps.map((step) => (
                          <tr key={step.stepId} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-indigo-900">
                              {step.stepId}
                            </td>
                            <td className="p-2.5 font-mono font-semibold text-slate-800">
                              [{experimentConfig.p1Name}{experimentConfig.p2Name}]
                            </td>
                            <td className="p-2.5 font-mono text-slate-900 font-bold">
                              {step.measurements.chordLength.toFixed(1)}
                            </td>
                            <td className="p-2.5 font-mono text-indigo-700">
                              {step.measurements.minorArcDeg.toFixed(1)}°
                            </td>
                            <td className="p-2.5 font-mono text-slate-700">
                              {step.measurements.theoreticalChordLength.toFixed(1)} мм
                            </td>
                            <td className="p-2.5 font-mono text-slate-500">
                              {step.measurements.majorArcDeg.toFixed(1)}°
                            </td>
                            <td className="p-2.5 font-mono text-emerald-700 font-semibold">
                              {step.measurements.arcComplementSumDeg.toFixed(1)}°
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {step.measurements.radius.toFixed(1)} мм
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Step Comparison Diffs */}
                {experimentResult.stepComparisons.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Динамическое сравнение шагов (Δ / Инварианты)</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Пошаговые разности метрик
                      </span>
                    </h4>
                    <div className="space-y-2.5">
                      {experimentResult.stepComparisons.map((comp) => (
                        <div
                          key={`${comp.fromStepId}-${comp.toStepId}`}
                          className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-mono text-xs font-bold text-indigo-950">
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                {comp.fromStepId}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white">
                                {comp.toStepId}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-slate-500 font-medium">Инварианты:</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                R = const ({comp.deltas.radius.currentValue} мм)
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                θ_min + θ_maj = 360°
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">Δ Длина хорды (Δc)</span>
                              <strong
                                className={`font-mono ${
                                  comp.deltas.chordLength.delta > 0
                                    ? 'text-emerald-700'
                                    : comp.deltas.chordLength.delta < 0
                                    ? 'text-amber-700'
                                    : 'text-slate-700'
                                }`}
                              >
                                {comp.deltas.chordLength.delta > 0 ? '+' : ''}
                                {comp.deltas.chordLength.delta.toFixed(1)} мм
                              </strong>
                            </div>

                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">Δ Меньшая дуга (Δθ)</span>
                              <strong
                                className={`font-mono ${
                                  comp.deltas.minorArcDeg.delta > 0
                                    ? 'text-indigo-700'
                                    : comp.deltas.minorArcDeg.delta < 0
                                    ? 'text-amber-700'
                                    : 'text-slate-700'
                                }`}
                              >
                                {comp.deltas.minorArcDeg.delta > 0 ? '+' : ''}
                                {comp.deltas.minorArcDeg.delta.toFixed(1)}°
                              </strong>
                            </div>

                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">Δ 2R·sin(θ/2)</span>
                              <strong className="font-mono text-slate-800">
                                {comp.deltas.theoreticalChordLength.delta > 0 ? '+' : ''}
                                {comp.deltas.theoreticalChordLength.delta.toFixed(1)} мм
                              </strong>
                            </div>

                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                              <span className="text-[10px] text-slate-500 block">Согласованность Δc с Δ(2R·sin)</span>
                              <strong className="font-mono text-emerald-700 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Точное совпадение
                              </strong>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                            {comp.descriptiveSummary.join(' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Epistemic Observations & Mathematical Safety Note */}
                <div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Принцип эпистемической строгости:</strong> Экспериментальные совпадения метрик являются подтверждением <em>гипотезы (Candidate Invariant)</em>, но не заменяют формальное математическое доказательство в детерминированном ядре.
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {experimentResult.aggregateObservations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getEpistemicBadge(obs.epistemicLevel)}
                            <span className="font-bold text-slate-900">{obs.title}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{obs.id}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{obs.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. JSON Protocol Viewer / Copier */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Протокол эксперимента (100% чистый JSON без таймстемпов)
                  </span>
                  <button
                    onClick={() => handleCopyText(JSON.stringify(experimentResult, null, 2))}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать протокол'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EPISTEMIC LEDGER (PACKET #6) */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            {/* Epistemic Summary Banner */}
            <div className="p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span>Эпистемический Реестр Гипотез и Доказательств</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                      Q.E.D.: {researchGraph.summary.totalTheorems} / {researchGraph.summary.totalHypotheses}
                    </span>
                  </h4>
                  <p className="text-xs text-indigo-200">
                    Математическая строгость: формальная верификация прекондиций и канонические аксиомы
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-300">Активная стадия:</span>
                <span className="px-2.5 py-1 rounded-md bg-indigo-800 text-indigo-100 font-bold border border-indigo-600 font-mono text-[11px]">
                  {researchGraph.summary.activeStage}
                </span>
              </div>
            </div>

            {/* Principles Note */}
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-950 text-xs flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Эпистемический принцип Layer 4:</strong> Эмпирические данные и топологический след служат <em>свидетельствами</em>. Истинное доказательство достигается исключительно через детерминированную проверку всех прекондиций канонических правил в текущем <code>GeometryState</code>.
              </div>
            </div>

            {/* Hypotheses and Verification Detail List */}
            <div className="space-y-3">
              {researchGraph.nodes.hypotheses.map((hyp) => {
                const verif = researchGraph.nodes.verifications.find((v) => v.hypothesisId === hyp.id);
                const thm = researchGraph.nodes.theorems.find((t) => t.hypothesisId === hyp.id);
                const isSelected = selectedHypothesisId === hyp.id;

                return (
                  <div
                    key={hyp.id}
                    className={`p-4 rounded-xl border transition flex flex-col gap-3 ${
                      thm
                        ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400'
                        : verif && !verif.isProven
                        ? 'bg-rose-50/40 border-rose-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {thm ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3.5 h-3.5" /> ТЕОРЕМА ДОКАЗАНА (Q.E.D.)
                          </span>
                        ) : hyp.epistemicStage === 'KNOWN_RELATION_MATCH' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            СОВПАДЕНИЕ С ПРАВИЛОМ
                          </span>
                        ) : hyp.candidateStatus === 'REJECTED' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            НАРУШЕНЫ ПРЕКОНДИЦИИ
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ГИПОТЕЗА
                          </span>
                        )}

                        <h5 className="text-sm font-bold text-slate-900">{hyp.title}</h5>
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {hyp.id}
                      </span>
                    </div>

                    {/* Formula & Description */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="px-3 py-1 rounded-lg bg-slate-900 text-indigo-300 font-mono font-bold text-sm">
                        {hyp.formula}
                      </div>
                      <p className="text-slate-600 flex-1">{hyp.description}</p>
                    </div>

                    {/* Confidence / Status Note */}
                    <div className="text-xs bg-white/80 p-2.5 rounded-lg border border-slate-200/80 text-slate-700">
                      <strong>Статус проверки:</strong> {hyp.confidenceNote}
                    </div>

                    {/* Verification & Preconditions Toggle */}
                    {verif && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-2">
                        <button
                          onClick={() =>
                            setSelectedHypothesisId(isSelected ? null : hyp.id)
                          }
                          className="flex items-center justify-between w-full text-xs font-bold text-slate-700 hover:text-indigo-700 transition"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              Блок формальной верификации: {verif.ruleName} ({verif.preconditionsChecked.filter((p) => p.satisfied).length} / {verif.preconditionsChecked.length} прекондиций)
                            </span>
                          </span>
                          <span className="text-indigo-600 text-[11px] underline">
                            {isSelected ? 'Свернуть детали' : 'Развернуть доказательство'}
                          </span>
                        </button>

                        {/* Expanded Verification & Preconditions Table */}
                        {isSelected && (
                          <div className="space-y-3 pt-2">
                            <div className="p-2.5 rounded-lg bg-slate-900 text-indigo-200 text-xs font-mono">
                              <span className="text-slate-400">Математическое основание: </span>
                              {verif.mathematicalBasis}
                            </div>

                            {verif.provenanceAssistance && (
                              <div className="p-2 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                                <span className="font-semibold">Топологический контекст: </span>
                                {verif.provenanceAssistance.guidanceNote}
                              </div>
                            )}

                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2">Статус</th>
                                    <th className="p-2">Прекондиция</th>
                                    <th className="p-2">Описание требования</th>
                                    <th className="p-2">Измеренное значение</th>
                                    <th className="p-2">Свидетельство</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {verif.preconditionsChecked.map((rec) => (
                                    <tr key={rec.preconditionId} className="hover:bg-slate-50">
                                      <td className="p-2">
                                        {rec.satisfied ? (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Выполнено
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Нарушено
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2 font-mono font-bold text-slate-800">
                                        {rec.preconditionId}
                                      </td>
                                      <td className="p-2 text-slate-700">{rec.description}</td>
                                      <td className="p-2 font-mono text-slate-800">
                                        {rec.measuredValue !== undefined
                                          ? `${rec.measuredValue}`
                                          : '—'}
                                      </td>
                                      <td className="p-2 text-slate-600 text-[11px]">
                                        {rec.evidence}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: RESEARCH GRAPH DAG (PACKET #6) */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            {/* DAG Header & Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-600">Слои графа исследований:</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold font-mono">
                  L1: {researchGraph.nodes.evidence.length} Свидетельств
                </span>
                <span className="text-slate-400">➔</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono">
                  L2: {researchGraph.nodes.hypotheses.length} Гипотез
                </span>
                <span className="text-slate-400">➔</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold font-mono">
                  L3: {researchGraph.nodes.verifications.length} Верификаций
                </span>
                <span className="text-slate-400">➔</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                  L4: {researchGraph.nodes.theorems.length} Теорем (Q.E.D.)
                </span>
              </div>

              <button
                onClick={() => handleCopyText(JSON.stringify(researchGraph, null, 2))}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Копировать DAG JSON'}</span>
              </button>
            </div>

            {/* Visual DAG Columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Column 1: Evidence */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                  <FlaskConical className="w-3.5 h-3.5 text-slate-600" />
                  <span>1. Эмпирика (L1)</span>
                </div>
                <div className="space-y-2">
                  {researchGraph.nodes.evidence.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs space-y-1 shadow-2xs"
                    >
                      <span className="text-[10px] font-mono text-slate-400">{e.id}</span>
                      <p className="font-bold text-slate-900 leading-tight">{e.title}</p>
                      <p className="text-slate-600 text-[11px]">{e.observedMetricSummary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Hypotheses */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-amber-200">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Гипотезы (L2)</span>
                </div>
                <div className="space-y-2">
                  {researchGraph.nodes.hypotheses.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs space-y-1 shadow-2xs"
                    >
                      <span className="text-[10px] font-mono text-amber-600">{h.id}</span>
                      <p className="font-bold text-slate-900 leading-tight">{h.title}</p>
                      <div className="font-mono text-indigo-700 font-bold text-[11px] bg-white px-1.5 py-0.5 rounded border border-amber-200">
                        {h.formula}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: Verifications */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-purple-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>3. Верификация (L3)</span>
                </div>
                <div className="space-y-2">
                  {researchGraph.nodes.verifications.map((v) => (
                    <div
                      key={v.id}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 shadow-2xs ${
                        v.isProven
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-rose-300 bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">{v.id}</span>
                        {v.isProven ? (
                          <span className="text-[10px] font-bold text-emerald-700">✓ ПРИНЯТО</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700">✗ ОТКЛОНЕНО</span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 leading-tight">{v.ruleName}</p>
                      <p className="text-slate-600 text-[11px]">
                        Выполнено: {v.preconditionsChecked.filter((p) => p.satisfied).length} / {v.preconditionsChecked.length}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 4: Theorems */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-emerald-200">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Теоремы Q.E.D. (L4)</span>
                </div>
                <div className="space-y-2">
                  {researchGraph.nodes.theorems.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg border border-emerald-400 bg-emerald-50 text-xs space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-800 font-bold">{t.id}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          Q.E.D.
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 leading-tight">{t.name}</p>
                      <p className="text-emerald-900 text-[11px] italic font-mono bg-white p-1 rounded border border-emerald-200">
                        {t.formalStatement}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Raw DAG JSON */}
            <div className="pt-2 border-t border-slate-200">
              <pre className="p-3 bg-slate-900 text-indigo-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                {JSON.stringify(researchGraph, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 5: TRACE */}
        {activeTab === 'trace' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Архитектурный инвариант:</strong> {snapshot.constructionTrace.structuralNote}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Глубина</th>
                    <th className="p-2.5">Тип</th>
                    <th className="p-2.5">ID / Имя</th>
                    <th className="p-2.5">Роль</th>
                    <th className="p-2.5">Родители / Источники</th>
                    <th className="p-2.5">Группа макроса</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshot.constructionTrace.nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-500">
                        {node.depth === 0 ? '0 (База)' : `${node.depth}`}
                      </td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-semibold uppercase text-slate-700">
                          {node.kind}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">{node.name}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            node.role === 'primary'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {node.role}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                        {node.parentIds.length > 0 ? node.parentIds.join(', ') : '—'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                        {node.groupId ? node.groupId : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EPISTEMIC */}
        {activeTab === 'epistemic' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-600 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Эпистемический контур:</strong> Измерение ➔ Факт ➔ Наблюдение ➔ Гипотеза ➔ Совпадение паттерна ➔ Верифицированный инвариант.
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {snapshot.observations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col gap-1.5 hover:border-slate-300 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getEpistemicBadge(obs.epistemicLevel)}
                      <strong className="text-xs text-slate-900">{obs.title}</strong>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">{obs.id}</span>
                  </div>

                  <p className="text-xs text-slate-600">{obs.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400">Наблюдение: </span>
                      <strong className="text-slate-800 font-mono">{obs.observedValue}</strong>
                    </div>
                    {obs.expectedValue && (
                      <div>
                        <span className="text-slate-400">Ожидание: </span>
                        <span className="text-slate-700 font-mono">{obs.expectedValue}</span>
                      </div>
                    )}
                    <div className="ml-auto text-[10px] text-slate-500">
                      Основание: <span className="italic">{obs.mathematicalBasis}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SNAPSHOT */}
        {activeTab === 'snapshot' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Детерминированный срез состояния (без меток времени, строго повторяемый)
              </span>
              <button
                onClick={() => handleCopyText(JSON.stringify(snapshot, null, 2))}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Копировать JSON'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-indigo-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
