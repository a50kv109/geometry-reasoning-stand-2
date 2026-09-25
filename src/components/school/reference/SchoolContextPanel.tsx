// src/components/school/reference/SchoolContextPanel.tsx
// Passive UI component for Packet #3: Contextual School Reference
// Invariant: Pure renderer of ContextualExplanationPayload, zero geometry calculation logic.

import React from 'react';
import { ContextualExplanationPayload } from './schoolKnowledgeTypes';
import { useI18n } from '../../../i18n';
import {
  BookOpen,
  Sparkles,
  Info,
  CheckCircle2,
  GitBranch,
  Layers,
  X,
  Sigma,
} from 'lucide-react';

interface SchoolContextPanelProps {
  payload: ContextualExplanationPayload | null;
  onClearSelection?: () => void;
}

export const SchoolContextPanel: React.FC<SchoolContextPanelProps> = ({
  payload,
  onClearSelection,
}) => {
  const { t } = useI18n();

  if (!payload) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex flex-col items-center justify-center text-center gap-2 min-h-[160px]">
        <BookOpen className="w-6 h-6 text-slate-400" />
        <div className="font-semibold text-slate-700 text-[13px]">
          {t('school.reference.emptyTitle')}
        </div>
        <p className="text-[11px] max-w-xs text-slate-500">
          {t('school.reference.emptyDesc')}
        </p>
      </div>
    );
  }

  const badgeStyles = {
    base: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    auxiliary: 'bg-purple-50 text-purple-700 border-purple-200',
    theorem: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  }[payload.badge.variant];

  return (
    <div
      id="schoolContextPanel"
      className="flex flex-col gap-3 p-3.5 bg-white border border-indigo-100/80 rounded-xl shadow-xs text-xs"
    >
      {/* Header with Classification Badge and Object Title */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${badgeStyles}`}
            >
              {payload.badge.label}
            </span>
            <span className="font-mono text-[10px] text-slate-400">ID: {payload.entityId}</span>
          </div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-none" />
            {payload.level1_identification.title}
          </h3>
        </div>
        {onClearSelection && (
          <button
            onClick={onClearSelection}
            title={t('common.close')}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Level 1: Identification & Definition */}
      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex flex-col gap-1">
        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span>{t('school.reference.defTitle')}</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
          {payload.level1_identification.definition}
        </p>
      </div>

      {/* Level 2: Verified Properties */}
      <div className="p-2.5 bg-sky-50/50 border border-sky-100 rounded-lg flex flex-col gap-1.5">
        <div className="text-[11px] font-bold text-sky-900 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
          <span>{t('school.reference.propsTitle')}</span>
        </div>
        <ul className="flex flex-col gap-1 pl-5 list-disc text-[11px] text-slate-700">
          {payload.level2_properties.items.map((prop, idx) => (
            <li key={idx} className="leading-snug">
              {prop}
            </li>
          ))}
        </ul>
      </div>

      {/* Level 3: Context / Provenance */}
      {payload.level3_provenance && (
        <div className="p-2.5 bg-amber-50/40 border border-amber-100 rounded-lg flex flex-col gap-1">
          <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('school.reference.provTitle')}</span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed pl-5">
            {payload.level3_provenance.description}
          </p>
          {payload.level3_provenance.hasProvenance && (
            <div className="mt-1 pt-1 border-t border-amber-100 text-[10px] text-amber-800/90 italic pl-5">
              {t('school.reference.provNote')}
            </div>
          )}
        </div>
      )}

      {/* Level 4: Theorem & Mathematical Formula (when verified) */}
      {payload.level4_theorem && (
        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
            <Sigma className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t('school.reference.thmTitle')} {payload.level4_theorem.name}</span>
          </div>
          <p className="text-[11px] text-emerald-900 leading-relaxed pl-5">
            {payload.level4_theorem.statement}
          </p>
          {payload.level4_theorem.formula && (
            <div className="ml-5 mt-1 px-2.5 py-1 bg-white border border-emerald-200 rounded-md font-mono text-xs font-bold text-emerald-900 shadow-2xs inline-block self-start">
              {payload.level4_theorem.formula}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

