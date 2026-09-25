// src/components/school/SchoolObjectInventory.tsx
// Displays geometric object inventory and pedagogical construction companion in School Mode

import React, { useMemo } from 'react';
import { FullGeometryState } from '../../engines/geometryState';
import { SchoolTool, RulerMeasurement } from './schoolTypes';
import { useI18n } from '../../i18n';
import {
  Dot,
  Minus,
  MoveHorizontal,
  Circle,
  Ruler,
  Compass,
  Sparkles,
  Info,
  BookOpen,
  MousePointerClick,
} from 'lucide-react';
import { resolveSchoolContext } from './reference/schoolKnowledgeResolver';
import { SchoolContextPanel } from './reference/SchoolContextPanel';

interface SchoolObjectInventoryProps {
  geometryState: FullGeometryState;
  scale?: number;
  activeTool: SchoolTool;
  rulerMeasurement?: RulerMeasurement | null;
  onClearRuler?: () => void;
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string | null) => void;
}

export const SchoolObjectInventory: React.FC<SchoolObjectInventoryProps> = ({
  geometryState,
  scale = 1.0,
  activeTool,
  rulerMeasurement,
  onClearRuler,
  selectedEntityId,
  onSelectEntity,
}) => {
  const { t } = useI18n();
  const pointsList = Object.values(geometryState.points);
  const segmentsList = Object.values(geometryState.segments);
  const linesList = Object.values(geometryState.lines);
  const circlesList = Object.values(geometryState.circles);

  // Pure deterministic resolution of pedagogical explanation payload
  const contextPayload = useMemo(() => {
    if (!selectedEntityId) return null;
    return resolveSchoolContext(selectedEntityId, geometryState, scale);
  }, [selectedEntityId, geometryState, scale]);

  const toolInfo = {
    title: t(`school.pedagogy.${activeTool}.title`),
    hint: t(`school.pedagogy.${activeTool}.hint`),
    rule: t(`school.pedagogy.${activeTool}.rule`),
  };

  const handleToggleSelect = (id: string) => {
    if (selectedEntityId === id) {
      onSelectEntity?.(null);
    } else {
      onSelectEntity?.(id);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs">
      {/* 1. Contextual School Reference Panel (Packet #3) */}
      <SchoolContextPanel
        payload={contextPayload}
        onClearSelection={() => onSelectEntity?.(null)}
      />

      {/* 2. Active Tool Pedagogical Card */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>{toolInfo.title}</span>
        </div>
        <p className="text-slate-600 leading-relaxed text-[11px]">{toolInfo.hint}</p>
        <div className="mt-1 pt-1.5 border-t border-indigo-100/80 text-[10px] text-indigo-800 font-medium italic">
          📜 {toolInfo.rule}
        </div>
      </div>

      {/* 3. Active Ruler Measurement Highlight */}
      {rulerMeasurement && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-amber-600" />
            <div>
              <div className="font-bold text-amber-950 text-xs">{t('school.inventory.currentRuler')}</div>
              <div className="font-mono text-xs font-black text-amber-800">
                L = {(rulerMeasurement.distanceModel * scale).toFixed(1)} {t('common.mm')}{' '}
                <span className="text-[10px] font-normal text-amber-700">
                  ({Math.round(rulerMeasurement.distanceModel)} {t('common.px')})
                </span>
              </div>
            </div>
          </div>
          {onClearRuler && (
            <button
              onClick={onClearRuler}
              className="text-[10px] px-2 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded font-semibold transition cursor-pointer"
            >
              {t('common.reset')}
            </button>
          )}
        </div>
      )}

      {/* 4. Geometric Objects Registry with Interactive Selection */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-1">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            {t('school.inventory.title')}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {t('school.inventory.counts', {
              p: pointsList.length,
              s: segmentsList.length,
              l: linesList.length,
              c: circlesList.length,
            })}
          </span>
        </div>

        {/* 4a. Points */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-600 text-[11px] flex items-center gap-1">
            <Dot className="w-3.5 h-3.5 text-indigo-500" />
            {t('school.inventory.points')} ({pointsList.length})
          </span>
          <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto pr-1">
            {pointsList.map((p) => {
              const isSelected = selectedEntityId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleToggleSelect(p.id)}
                  className={`flex items-center justify-between px-2 py-1 rounded border text-[11px] font-mono transition text-left cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300'
                      : p.isBaseVertex
                      ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                      : 'bg-indigo-50/50 border-indigo-200 text-indigo-900 hover:bg-indigo-100/60'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : p.color || '#475569' }}
                    />
                    {p.name}:
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    ({(p.x * scale).toFixed(0)}, {(p.y * scale).toFixed(0)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4b. Segments */}
        <div className="flex flex-col gap-1 mt-1">
          <span className="font-semibold text-slate-600 text-[11px] flex items-center gap-1">
            <Minus className="w-3.5 h-3.5 text-sky-500" />
            {t('school.inventory.segments')} ({segmentsList.length})
          </span>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
            {segmentsList.map((s) => {
              const isSelected = selectedEntityId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleToggleSelect(s.id)}
                  className={`flex items-center justify-between px-2 py-1 rounded border text-[11px] font-mono transition text-left cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-300'
                      : s.isBaseChord
                      ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                      : 'bg-sky-50/50 border-sky-200 text-sky-900 hover:bg-sky-100/60'
                  }`}
                >
                  <span className="font-bold">
                    {s.p1Id}
                    {s.p2Id}
                    {s.isBaseChord && (
                      <span className={`text-[9px] font-normal ml-1 ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                        ({t('school.inventory.chord')})
                      </span>
                    )}
                  </span>
                  <span className={`font-bold ${isSelected ? 'text-white' : 'text-sky-800'}`}>
                    {(s.length * scale).toFixed(1)} {t('common.mm')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4c. Circles */}
        <div className="flex flex-col gap-1 mt-1">
          <span className="font-semibold text-slate-600 text-[11px] flex items-center gap-1">
            <Circle className="w-3.5 h-3.5 text-violet-500" />
            {t('school.inventory.circles')} ({circlesList.length})
          </span>
          <div className="flex flex-col gap-1">
            {circlesList.map((c) => {
              const isSelected = selectedEntityId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleToggleSelect(c.id)}
                  className={`flex items-center justify-between px-2 py-1 rounded border text-[11px] font-mono transition text-left cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-700 shadow-xs ring-2 ring-violet-300'
                      : c.isBaseCircumcircle
                      ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                      : 'bg-violet-50/50 border-violet-200 text-violet-900 hover:bg-violet-100/60'
                  }`}
                >
                  <span className="font-bold">
                    {c.isBaseCircumcircle ? t('school.inventory.circumcircle') : t('school.inventory.circleCenter', { center: c.centerId })}
                  </span>
                  <span className={`font-bold ${isSelected ? 'text-white' : 'text-violet-800'}`}>
                    R = {(c.radius * scale).toFixed(1)} {t('common.mm')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4d. Lines (if any) */}
        {linesList.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <span className="font-semibold text-slate-600 text-[11px] flex items-center gap-1">
              <MoveHorizontal className="w-3.5 h-3.5 text-slate-500" />
              {t('school.inventory.lines')} ({linesList.length})
            </span>
            <div className="flex flex-col gap-1">
              {linesList.map((l) => {
                const isSelected = selectedEntityId === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => handleToggleSelect(l.id)}
                    className={`flex items-center justify-between px-2 py-1 rounded border text-[11px] font-mono transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold">
                      {t('school.inventory.linePoints', { p1: l.p1Id, p2: l.p2Id })}
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                      {t('school.inventory.infinite')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


