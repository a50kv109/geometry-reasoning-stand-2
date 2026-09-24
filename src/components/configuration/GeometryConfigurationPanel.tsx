// src/components/configuration/GeometryConfigurationPanel.tsx
// UI View Component for GCM-01: Geometry Configuration View.
// Principles:
// 1. "The Stand must not lie."
// 2. Read-only, transient projection over existing geometry state.
// 3. Structured tabular human view, AI context copy, and Excel/CSV download.

import React, { useState, useMemo } from 'react';
import {
  Table,
  FileSpreadsheet,
  Bot,
  Copy,
  Check,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  GitFork,
  BookOpen,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { FullGeometryState } from '../../engines/constructionCore';
import {
  buildConfigurationView,
  ConfigurationCategory,
  ConfigurationEntityKind,
  ConfigurationRecord,
  generateExcelXmlWorkbook,
  serializeConfigurationForAI,
  serializeConfigurationToCsv,
  serializeConfigurationToJson,
  serializeConfigurationToTsv,
} from '../../engines/configuration';

interface GeometryConfigurationPanelProps {
  geometryState: FullGeometryState;
  scale: number;
}

export const GeometryConfigurationPanel: React.FC<GeometryConfigurationPanelProps> = ({
  geometryState,
  scale,
}) => {
  // Transient projection computed on-demand from current state
  const configView = useMemo(() => {
    return buildConfigurationView(geometryState, { scale });
  }, [geometryState, scale]);

  const [activeTab, setActiveTab] = useState<'table' | 'topology' | 'epistemic' | 'ai'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ConfigurationCategory | 'ALL'>('ALL');
  const [selectedKind, setSelectedKind] = useState<ConfigurationEntityKind | 'ALL'>('ALL');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return configView.records.filter((rec) => {
      if (selectedCategory !== 'ALL' && rec.category !== selectedCategory) return false;
      if (selectedKind !== 'ALL' && rec.kind !== selectedKind) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.id.toLowerCase().includes(q) ||
          rec.name.toLowerCase().includes(q) ||
          rec.role.toLowerCase().includes(q) ||
          rec.epistemicStatus.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [configView.records, selectedCategory, selectedKind, searchQuery]);

  const handleCopy = (text: string, actionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAction(actionKey);
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string, isProven: boolean) => {
    if (isProven) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <ShieldCheck className="w-3 h-3" /> Q.E.D.
        </span>
      );
    }
    switch (status) {
      case 'MEASUREMENT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            ИЗМЕРЕНИЕ
          </span>
        );
      case 'FACT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-100 text-sky-800">
            ФАКТ
          </span>
        );
      case 'OBSERVATION':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
            НАБЛЮДЕНИЕ
          </span>
        );
      case 'CANDIDATE_INVARIANT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
            ГИПОТЕЗА
          </span>
        );
      case 'KNOWN_RELATION_MATCH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800">
            ПАТТЕРН
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getKindBadge = (kind: ConfigurationEntityKind) => {
    switch (kind) {
      case 'point':
        return <span className="font-mono text-indigo-700 font-bold">Точка</span>;
      case 'segment':
        return <span className="font-mono text-cyan-800 font-semibold">Отрезок</span>;
      case 'line':
        return <span className="font-mono text-teal-800">Прямая</span>;
      case 'circle':
        return <span className="font-mono text-indigo-900 font-bold">Окружность</span>;
      case 'derived_chord_arc':
        return <span className="font-mono text-purple-800 font-semibold">Хорда ↔ Дуга</span>;
      case 'angle':
        return <span className="font-mono text-amber-800 font-semibold">Угол</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>Семантическая конфигурация чертежа (GCM-01)</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 font-mono">
                Read-Only Projection
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Единое структурированное представление геометрии для человека, Excel и AI
            </p>
          </div>
        </div>

        {/* Quick Summary Chips */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-900/60 border border-indigo-700/50 text-indigo-200 font-mono text-[11px]">
            Сущностей: {configView.summary.totalRecords}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-[11px]">
            Q.E.D.: {configView.summary.verifiedTheoremCount}
          </span>
        </div>
      </div>

      {/* Action Bar: Export & Formats */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            id="cfgTabTableBtn"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Таблица ({filteredRecords.length})</span>
          </button>

          <button
            id="cfgTabTopologyBtn"
            onClick={() => setActiveTab('topology')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'topology'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Топология DAG ({configView.topology.edges.length})</span>
          </button>

          <button
            id="cfgTabEpistemicBtn"
            onClick={() => setActiveTab('epistemic')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'epistemic'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Эпистемический реестр</span>
          </button>

          <button
            id="cfgTabAiBtn"
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Контекст (JSON)</span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="cfgDownloadExcelBtn"
            onClick={() => {
              const xml = generateExcelXmlWorkbook(configView);
              handleDownloadFile(xml, `geometry_configuration_${configView.configurationId}.xml`, 'application/vnd.ms-excel');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
            title="Скачать структурированную книгу Excel (.xml)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xml)</span>
          </button>

          <button
            id="cfgDownloadCsvBtn"
            onClick={() => {
              const csv = serializeConfigurationToCsv(configView);
              handleDownloadFile(csv, `geometry_configuration_${configView.configurationId}.csv`, 'text/csv;charset=utf-8;');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
            title="Скачать файл CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            id="cfgCopyTsvBtn"
            onClick={() => {
              const tsv = serializeConfigurationToTsv(configView);
              handleCopy(tsv, 'tsv');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
            title="Скопировать для вставки в Excel / Google Таблицы"
          >
            {copiedAction === 'tsv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAction === 'tsv' ? 'Скопировано!' : 'Копировать TSV'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4">
        {/* TAB 1: TABLE VIEW */}
        {activeTab === 'table' && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск сущности по ID, имени, роли..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px] font-medium">Категория:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700"
                >
                  <option value="ALL">Все категории</option>
                  <option value="base_primitive">Базовые примитивы</option>
                  <option value="topological_construction">Построения DAG</option>
                  <option value="derived_relation">Связи хорда-дуга</option>
                </select>

                <span className="text-slate-500 text-[11px] font-medium">Тип:</span>
                <select
                  value={selectedKind}
                  onChange={(e) => setSelectedKind(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700"
                >
                  <option value="ALL">Все типы</option>
                  <option value="point">Точки</option>
                  <option value="segment">Отрезки</option>
                  <option value="circle">Окружности</option>
                  <option value="derived_chord_arc">Связи хорда-дуга</option>
                  <option value="angle">Углы</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-8"></th>
                    <th className="p-2.5">ID сущности</th>
                    <th className="p-2.5">Название</th>
                    <th className="p-2.5">Тип</th>
                    <th className="p-2.5">Глубина</th>
                    <th className="p-2.5">Родители</th>
                    <th className="p-2.5">Ключевые метрики</th>
                    <th className="p-2.5">Эпистемический статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec) => {
                    const isExpanded = expandedRecordId === rec.id;
                    const metricsPreview = Object.entries(rec.metrics)
                      .slice(0, 2)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');

                    return (
                      <React.Fragment key={rec.id}>
                        <tr
                          className={`hover:bg-slate-50/80 cursor-pointer transition ${
                            isExpanded ? 'bg-indigo-50/30' : ''
                          }`}
                          onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                        >
                          <td className="p-2.5 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">
                            {rec.id}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-800">
                            {rec.name}
                          </td>
                          <td className="p-2.5">{getKindBadge(rec.kind)}</td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {rec.depth}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                            {rec.parentIds.length > 0 ? rec.parentIds.join(', ') : '—'}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">
                            {metricsPreview}
                          </td>
                          <td className="p-2.5">
                            {getStatusBadge(rec.epistemicStatus, rec.isProven)}
                          </td>
                        </tr>

                        {/* Expanded Inspector Sub-Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-indigo-100">
                            <td colSpan={8} className="p-3.5 space-y-2.5 text-xs">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Parameters */}
                                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Параметры состояния
                                  </span>
                                  <pre className="text-[11px] font-mono text-slate-800 overflow-x-auto">
                                    {JSON.stringify(rec.parameters, null, 2)}
                                  </pre>
                                </div>

                                {/* Full Metrics */}
                                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Метрики геометрии
                                  </span>
                                  <div className="space-y-1">
                                    {Object.entries(rec.metrics).map(([k, v]) => (
                                      <div key={k} className="flex justify-between font-mono text-[11px]">
                                        <span className="text-slate-600">{k}:</span>
                                        <strong className="text-slate-900">{v}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Lineage & Epistemic Link */}
                                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                      Топологические связи
                                    </span>
                                    <div className="text-[11px] text-slate-700 space-y-0.5">
                                      <div>Родители: <span className="font-mono font-bold text-indigo-700">{rec.parentIds.join(', ') || 'нет'}</span></div>
                                      <div>Потомки: <span className="font-mono font-bold text-slate-800">{rec.childIds.join(', ') || 'нет'}</span></div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                                    <span className="font-semibold text-slate-700">Провенанс: </span>
                                    {rec.provenanceNote || 'Базовый примитив'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TOPOLOGY DAG VIEW */}
        {activeTab === 'topology' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Топологический граф зависимостей (DAG):</strong> Отражает направленную иерархию построения чертежа. Уровень глубины 0 — базовые точки и окружность; производные элементы строятся на основе родителей.
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">ID ребра</th>
                    <th className="p-2.5">Родитель (Source)</th>
                    <th className="p-2.5">Потомок (Target)</th>
                    <th className="p-2.5">Тип связи</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {configView.topology.edges.map((edge) => (
                    <tr key={edge.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-slate-500">{edge.id}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-900">{edge.sourceId}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{edge.targetId}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                          {edge.relation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EPISTEMIC REGISTRY */}
        {activeTab === 'epistemic' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {configView.epistemicRegistry.map((entry, idx) => (
                <div
                  key={`${entry.entityId}-${idx}`}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                    entry.isProven
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{entry.title}</span>
                    {getStatusBadge(entry.status, entry.isProven)}
                  </div>
                  <div className="p-2 rounded bg-slate-900 text-indigo-200 font-mono text-xs">
                    {entry.formula}
                  </div>
                  <p className="text-[11px] text-slate-600">{entry.basis}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AI CONTEXT PROMPT / JSON */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">
                Семантический срез для передачи AI агенту / LLM
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="cfgCopyAiPromptBtn"
                  onClick={() => {
                    const aiPrompt = serializeConfigurationForAI(configView);
                    handleCopy(aiPrompt, 'ai_prompt');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                >
                  {copiedAction === 'ai_prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAction === 'ai_prompt' ? 'Скопировано!' : 'Копировать AI Prompt'}</span>
                </button>

                <button
                  id="cfgCopyFullJsonBtn"
                  onClick={() => {
                    const fullJson = serializeConfigurationToJson(configView, true);
                    handleCopy(fullJson, 'full_json');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
                >
                  {copiedAction === 'full_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAction === 'full_json' ? 'Скопировано!' : 'Копировать полный JSON'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-900 text-indigo-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
              {serializeConfigurationForAI(configView)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
