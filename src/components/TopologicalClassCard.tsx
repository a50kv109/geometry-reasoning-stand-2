import React from 'react';
import { EngineResult } from '../types';
import { formatArcFraction } from '../engines/geometryState';
import { Compass, CheckCircle2, ArrowRight } from 'lucide-react';

interface TopologicalClassCardProps {
  engineResult: EngineResult;
}

export const TopologicalClassCard: React.FC<TopologicalClassCardProps> = ({
  engineResult,
}) => {
  const maxArcFraction = Math.max(
    engineResult.arcs.AB,
    engineResult.arcs.BC,
    engineResult.arcs.CA
  );
  const maxArcDeg = Math.round(maxArcFraction * 360);
  const maxArcInfo = formatArcFraction(maxArcFraction);

  let maxArcName = 'AB';
  if (engineResult.arcs.BC === maxArcFraction) maxArcName = 'BC';
  else if (engineResult.arcs.CA === maxArcFraction) maxArcName = 'CA';

  return (
    <div
      id="topologicalClassCard"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              TOPOLOGICAL CLASSIFICATION
            </span>
            <span className="text-xs text-slate-600 font-medium">
              — Классификация без тригонометрии
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Тип треугольника и положение центра O зависят только от максимальной дуги d_max
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded-lg text-xs font-bold border ${
            engineResult.classification === 'right'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : engineResult.classification === 'obtuse'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}
        >
          {engineResult.classificationName.toUpperCase()}
        </div>
      </div>

      {/* 3 Topological Rules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {/* Acute Rule */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            engineResult.classification === 'acute'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>ОСТРЫЙ</span>
            <span className="font-mono text-[11px] text-indigo-700">d_max &lt; 0.5</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Все дуги &lt; 180° (половины круга).
          </p>
          <div className="mt-2 text-[11px] font-semibold text-indigo-900 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Центр O внутри</span>
          </div>
        </div>

        {/* Right Rule */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            engineResult.classification === 'right'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>ПРЯМОЙ (Фалес)</span>
            <span className="font-mono text-[11px] text-emerald-700">d_max = 0.5</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ровно одна дуга = 180° (полуокружность).
          </p>
          <div className="mt-2 text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Центр O на стороне</span>
          </div>
        </div>

        {/* Obtuse Rule */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            engineResult.classification === 'obtuse'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>ТУПОЙ</span>
            <span className="font-mono text-[11px] text-amber-700">d_max &gt; 0.5</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Одна дуга &gt; 180° (больше полукруга).
          </p>
          <div className="mt-2 text-[11px] font-semibold text-amber-900 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Центр O снаружи</span>
          </div>
        </div>
      </div>

      {/* Current State Indicator */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span>
            Текущая максимальная дуга: <strong>Дуга {maxArcName}</strong> ={' '}
            <span className="font-mono font-bold text-indigo-700">
              {maxArcDeg}° ({maxArcInfo.fractionStr} круга)
            </span>
          </span>
        </div>
        <div className="font-medium text-[11px] text-slate-600">
          {engineResult.classification === 'acute' && 'd_max < 0.5 ➔ Все углы < 90° ➔ Центр O ВНУТРИ'}
          {engineResult.classification === 'right' && 'd_max = 0.5 ➔ Противолежащий угол = 90° ➔ Центр O НА СТОРОНЕ'}
          {engineResult.classification === 'obtuse' && 'd_max > 0.5 ➔ Противолежащий угол > 90° ➔ Центр O СНАРУЖИ'}
        </div>
      </div>
    </div>
  );
};
