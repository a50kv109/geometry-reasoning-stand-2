// src/components/aam/AAMGatewayPanel.tsx
// Interactive Visual Interface for AAM Language Kernel -> Geometry Stand Gateway v0.1
// Allows students, teachers, and engineers to test natural language semantic commands in RU, UK, EN.

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Terminal,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { FullGeometryState } from '../../engines/constructionCore';
import {
  normalizeAAMIntent,
  executeAAMGateway,
  AAMGatewayExecutionResult,
} from '../../engines/semantic/aamGateway';
import { useI18n } from '../../i18n';

interface AAMGatewayPanelProps {
  geometryState: FullGeometryState;
  onApplyState?: (nextState: FullGeometryState) => void;
  scale?: number;
}

const PRESET_QUERIES = [
  {
    category: 'ru',
    label: 'Параллель к BC через A',
    query: 'Проведи через точку A прямую, параллельную BC',
  },
  {
    category: 'ru',
    label: 'Перпендикуляр к BC через A',
    query: 'Проведи через A перпендикуляр к BC',
  },
  {
    category: 'ru',
    label: 'Биссектриса угла ABC',
    query: 'Построй биссектрису угла ABC',
  },
  {
    category: 'ru',
    label: 'Серединный перпендикуляр к AB',
    query: 'Построй серединный перпендикуляр к AB',
  },
  {
    category: 'ru',
    label: 'Проверка теоремы Фалеса',
    query: 'Проверь теорему Фалеса для треугольника ABC',
  },
  {
    category: 'ru',
    label: 'Является ли AB диаметром?',
    query: 'Является ли AB диаметром этой окружности?',
  },
  {
    category: 'ru',
    label: 'Параллель + Проверка (Pipeline)',
    query: 'Проведи через точку A прямую, параллельную BC, и проверь, действительно ли она параллельна BC',
  },
  {
    category: 'uk',
    label: 'UK: Пряма, паралельна BC',
    query: 'Проведи через точку A пряму, паралельну BC, і перевір, чи вона паралельна BC',
  },
  {
    category: 'en',
    label: 'EN: Parallel + Verification',
    query: 'Construct line through A parallel to BC and verify whether it is parallel to BC',
  },
  {
    category: 'en',
    label: 'EN: Is AB diameter?',
    query: 'Is AB a diameter of this circle?',
  },
];

export const AAMGatewayPanel: React.FC<AAMGatewayPanelProps> = ({
  geometryState,
  onApplyState,
}) => {
  const { t, locale } = useI18n();
  const [inputText, setInputText] = useState<string>(
    'Проведи через точку A прямую, параллельную BC, и проверь, действительно ли она параллельна BC'
  );
  const [lastResult, setLastResult] = useState<AAMGatewayExecutionResult | null>(null);

  // Real-time intent preview as user types
  const currentIntent = useMemo(() => {
    if (!inputText.trim()) return null;
    return normalizeAAMIntent(inputText);
  }, [inputText]);

  const handleExecute = (overrideText?: string) => {
    const textToRun = overrideText !== undefined ? overrideText : inputText;
    if (!textToRun.trim()) return;

    const res = executeAAMGateway(geometryState, textToRun);
    setLastResult(res);

    if (res.toolCallResult.success && res.toolCallResult.stateChanged && onApplyState) {
      onApplyState(res.nextState);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 text-xs overflow-y-auto">
      {/* 1. Header Banner */}
      <div className="p-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                AAM Engineering Gateway v0.1
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-normal">
                  RU | UK | EN
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                AAM Language Kernel → Universal Semantic Tool Interface → Geometry Stand
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Stand Deterministic Core
            </span>
          </div>
        </div>

        <div className="mt-2 text-[11px] bg-indigo-50/60 border border-indigo-100 rounded p-2 text-indigo-900 leading-relaxed">
          <strong>Архитектурный принцип:</strong> Языковое ядро AAM выполняет нормализацию intent и параметров без геометрических вычислений. Geometry Stand выступает единственным источником математической истины и верификатором.
        </div>
      </div>

      {/* 2. Interactive Input Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2">
        <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
          <Terminal className="w-3.5 h-3.5 text-indigo-600" />
          Инженерно-геометрический запрос на естественном языке:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-900 font-mono shadow-sm"
            placeholder="Например: Проведи через точку A прямую, параллельную BC..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecute();
            }}
          />
          <button
            onClick={() => handleExecute()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Выполнить
          </button>
        </div>

        {/* Presets */}
        <div className="mt-1">
          <div className="text-[10px] text-slate-500 mb-1 font-medium flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            Быстрые тестовые запросы:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUERIES.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(p.query);
                  handleExecute(p.query);
                }}
                className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded text-slate-700 transition-colors text-left"
                title={p.query}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Live Pipeline Flow */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {/* Layer 1: AAM Language Kernel Parsing */}
        {currentIntent && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Слой 1: AAM Language Kernel (Семантическая нормализация)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                Язык: {currentIntent.language.toUpperCase()} | Уверенность: 100%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900 text-slate-100 p-2.5 rounded-md overflow-x-auto">
              <div>
                <span className="text-slate-400"># INTENT:</span>
                <div className="text-emerald-400 font-bold">{currentIntent.intent}</div>
                <div className="mt-1 text-slate-400"># PARAMETERS:</div>
                <div className="text-indigo-300">
                  {JSON.stringify(currentIntent.parameters)}
                </div>
              </div>
              <div>
                <span className="text-slate-400"># SEMANTIC TOOL CALL:</span>
                <pre className="text-amber-300 text-[10px] leading-tight">
                  {JSON.stringify(currentIntent.toolCall, null, 2)}
                </pre>
                {currentIntent.followUpVerification && (
                  <div className="mt-1">
                    <span className="text-slate-400"># FOLLOW-UP VERIFICATION:</span>
                    <pre className="text-purple-300 text-[10px] leading-tight">
                      {JSON.stringify(currentIntent.followUpVerification, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Geometry Stand Execution & Structured Result */}
        {lastResult && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Слой 2: Geometry Reasoning Stand (Детерминированный результат)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Статус исполнения Stand
              </span>
            </div>

            {/* High-level status badges matching user spec */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  CONSTRUCTION
                </span>
                <span
                  className={`mt-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    lastResult.structuredSummary.construction === 'accepted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lastResult.structuredSummary.construction === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {lastResult.structuredSummary.construction}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  RELATION
                </span>
                <span className="mt-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-indigo-100 text-indigo-800">
                  {lastResult.structuredSummary.relation || 'N/A'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  STATUS
                </span>
                <span
                  className={`mt-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    lastResult.structuredSummary.status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lastResult.structuredSummary.status === 'REFUTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {lastResult.structuredSummary.status}
                </span>
              </div>
            </div>

            {/* Explanatory Message */}
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-800 mb-2 leading-relaxed">
              <strong>Отчёт верификации Stand:</strong> {lastResult.structuredSummary.message}
            </div>

            {/* Created entities list if any */}
            {lastResult.toolCallResult.createdEntities &&
              lastResult.toolCallResult.createdEntities.length > 0 && (
                <div className="text-[11px] text-slate-600 mb-2">
                  <span className="font-semibold text-slate-700">Созданные геометрические объекты:</span>{' '}
                  {lastResult.toolCallResult.createdEntities
                    .map((e) => `${e.kind}: ${e.id}`)
                    .join(', ')}
                </div>
              )}

            {/* JSON Output Accordion */}
            <details className="mt-2 text-[10px]">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-800 font-medium">
                Показать полный JSON-ответ Stand (Deterministic Protocol)
              </summary>
              <pre className="mt-1 p-2 bg-slate-900 text-slate-200 rounded font-mono overflow-x-auto max-h-48 text-[9px] leading-tight">
                {JSON.stringify(
                  {
                    construction: lastResult.structuredSummary.construction,
                    relation: lastResult.structuredSummary.relation,
                    status: lastResult.structuredSummary.status,
                    verification:
                      lastResult.followUpVerificationResult?.verification ||
                      lastResult.toolCallResult.verification,
                    createdEntities: lastResult.toolCallResult.createdEntities,
                    affectedEntities: lastResult.toolCallResult.affectedEntities,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
