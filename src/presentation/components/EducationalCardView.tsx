// src/presentation/components/EducationalCardView.tsx
// Pure Presentation React Component for Educational Card (EV-01).
// Principles:
// - Zero geometry calculations
// - Zero state mutations
// - Clear separation between Educational Inquiry and Verified Fact (Q.E.D.)

import React from 'react';
import {
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  Info,
} from 'lucide-react';
import { EducationalCardViewModel } from '../educationalTypes';
import { ActiveHighlight } from '../../types';

interface EducationalCardViewProps {
  viewModel: EducationalCardViewModel;
  onHoverHighlight?: (highlight: ActiveHighlight) => void;
  isActive?: boolean;
  onToggleActive?: () => void;
}

export const EducationalCardView: React.FC<EducationalCardViewProps> = ({
  viewModel,
  onHoverHighlight,
  isActive = false,
  onToggleActive,
}) => {
  const { state, title, context, inquiry, verifiedFact, evidence, template } = viewModel;

  const isVerified = state === 'AVAILABLE' || state === 'ACTIVE';
  const isBroken = state === 'BROKEN';
  const isUnavailable = state === 'UNAVAILABLE';

  const handleFocusClick = () => {
    if (onHoverHighlight && template.activeHighlightMapping) {
      onHoverHighlight(template.activeHighlightMapping);
    }
    if (onToggleActive) {
      onToggleActive();
    }
  };

  return (
    <div
      id="educationalCardContainer"
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isVerified
          ? 'bg-white border-indigo-200 ring-1 ring-indigo-100'
          : isBroken
          ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
          : 'bg-slate-50 border-slate-200 opacity-80'
      }`}
    >
      {/* Header with Card Title and Status Badge */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isVerified
                ? 'bg-indigo-600 text-white'
                : isBroken
                ? 'bg-amber-600 text-white'
                : 'bg-slate-400 text-white'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ОБРАЗОВАТЕЛЬНАЯ ЛИНЗА • EV-01
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  УСЛОВИЯ ВЫПОЛНЕНЫ
                </span>
              )}
              {isBroken && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  УСЛОВИЕ ТЕОРЕМЫ НАРУШЕНО
                </span>
              )}
              {isUnavailable && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                  НЕДОСТУПНО
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
              {title}
            </h3>
          </div>
        </div>

        {/* Visual Focus Trigger Button */}
        <button
          id="btnCardVisualFocus"
          type="button"
          onClick={handleFocusClick}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            isActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="Сфокусировать чертёж на диаметре и вершине прямого угла"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isActive ? 'Фокус активен' : 'Сфокусировать'}</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Context Narrative */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {context}
        </p>

        {/* 1. EDUCATIONAL INQUIRY (Учебный вопрос / Задача) — NOT Marked Q.E.D. */}
        <div
          id="educationalInquiryBlock"
          className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
        >
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Вопрос для исследования (Inquiry):</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {inquiry.question}
          </p>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{inquiry.promptAction}</span>
          </div>
          {inquiry.hint && (
            <p className="text-[11px] text-slate-400 italic">
              Подсказка: {inquiry.hint}
            </p>
          )}
        </div>

        {/* 2. VERIFIED FACT (Отображается ТОЛЬКО при выполнении условий и доказанности) */}
        {verifiedFact && isVerified && (
          <div
            id="verifiedFactBlock"
            className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Доказанный инвариант (Verified Fact):</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-emerald-700 text-white uppercase shadow-2xs">
                Q.E.D.
              </span>
            </div>

            <div className="font-mono text-base font-bold text-emerald-950 bg-white/90 p-2.5 rounded-lg border border-emerald-200/80 text-center">
              {verifiedFact.formula}
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              {verifiedFact.statement}
            </p>

            <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-700 border-t border-emerald-100">
              <span>Правило ядра: <code className="font-mono font-semibold">{evidence.ruleId}</code></span>
              <span>{verifiedFact.mathematicalDomain}</span>
            </div>
          </div>
        )}

        {/* 3. BROKEN STATE REACTION (Педагогическое объяснение при нарушении условий) */}
        {isBroken && (
          <div
            id="brokenPrerequisiteBlock"
            className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5"
          >
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Условия теоремы в текущей конфигурации нарушены</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Теорема Фалеса утверждает прямой угол <strong>только при условии</strong>, что хорда AB является диаметром. В данный момент условие не соблюдено:
            </p>
            {evidence.failedPreconditions && evidence.failedPreconditions.length > 0 && (
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 bg-white/70 p-2.5 rounded-lg border border-amber-200">
                {evidence.failedPreconditions.map((f, idx) => (
                  <li key={idx} className="font-medium">{f}</li>
                ))}
              </ul>
            )}
            <div className="text-xs text-amber-800 italic bg-amber-100/60 p-2 rounded border border-amber-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Переместите точки A и B так, чтобы отрезок AB прошёл строго через центр O (диаметр 180°).</span>
            </div>
          </div>
        )}

        {/* Highlighted Entities Summary */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600">Элементы фокуса:</span>
          {template.highlightEntities.map((e) => (
            <span
              key={e.entityId}
              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
            >
              {e.label || e.entityId}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
