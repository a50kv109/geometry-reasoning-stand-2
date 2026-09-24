import React from 'react';
import { VertexId, ActiveHighlight, EngineResult } from '../types';

interface RelationMapProps {
  engineResult: EngineResult;
  activeHighlight: ActiveHighlight;
  onHoverHighlight: (highlight: ActiveHighlight) => void;
  scale?: number;
}

export const RelationMap: React.FC<RelationMapProps> = ({
  engineResult,
  activeHighlight,
  onHoverHighlight,
  scale = 1.0,
}) => {
  const relations: Array<{
    vertex: VertexId;
    oppositeSide: 'BC' | 'CA' | 'AB';
    oppositeArcName: string;
    oppositeArcFraction: number;
    angleVal: number;
    chordVal: number;
    color: string;
  }> = [
    {
      vertex: 'A',
      oppositeSide: 'BC',
      oppositeArcName: 'Дуга BC',
      oppositeArcFraction: engineResult.arcs.BC,
      angleVal: engineResult.angles.A,
      chordVal: engineResult.chords.BC,
      color: '#F59E0B', // amber-500
    },
    {
      vertex: 'B',
      oppositeSide: 'CA',
      oppositeArcName: 'Дуга CA',
      oppositeArcFraction: engineResult.arcs.CA,
      angleVal: engineResult.angles.B,
      chordVal: engineResult.chords.CA,
      color: '#3B82F6', // blue-500
    },
    {
      vertex: 'C',
      oppositeSide: 'AB',
      oppositeArcName: 'Дуга AB',
      oppositeArcFraction: engineResult.arcs.AB,
      angleVal: engineResult.angles.C,
      chordVal: engineResult.chords.AB,
      color: '#10B981', // emerald-500
    },
  ];

  return (
    <div
      id="relationMapSection"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3.5"
    >
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            RELATION MAP
          </span>
          <span className="text-xs text-slate-600 font-medium">
            — Карта взаимосвязей
          </span>
        </div>
        <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md font-medium">
          Вписанный угол = ½ противоположной дуги
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Каждая вершина треугольника геометрически связана с <strong>противоположной стороной-хордой</strong> и <strong>противоположной дугой</strong> окружности:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {relations.map((rel) => {
          const isActive =
            (activeHighlight?.type === 'vertex' && activeHighlight.id === rel.vertex) ||
            (activeHighlight?.type === 'side' && activeHighlight.id === rel.oppositeSide) ||
            (activeHighlight?.type === 'arc' && activeHighlight.id === rel.oppositeSide);

          return (
            <div
              key={rel.vertex}
              id={`relationCard-${rel.vertex}`}
              onMouseEnter={() => onHoverHighlight({ type: 'vertex', id: rel.vertex })}
              onMouseLeave={() => onHoverHighlight(null)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-300 scale-[1.02]'
                  : 'bg-slate-50/80 border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold text-sm">
                <span className="flex items-center gap-1.5 text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                  ∠{rel.vertex} ({Math.round(rel.angleVal)}°)
                </span>
                <span className="text-indigo-600 font-bold text-base">⟷</span>
                <span
                  className="px-2.5 py-1 rounded-lg border text-xs font-sans font-bold bg-white shadow-xs"
                  style={{ borderColor: rel.color, color: rel.color }}
                >
                  {rel.oppositeSide}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px] space-y-1.5 text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Противоположная дуга:</span>
                  <span className="font-semibold text-slate-800">
                    {Math.round(rel.oppositeArcFraction * 360)}°
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Хорда ({rel.oppositeSide}):</span>
                  <span className="font-mono text-right">
                    <strong className="text-slate-900 text-xs">{(rel.chordVal * scale).toFixed(1)} мм</strong>{' '}
                    <span className="text-slate-400 text-[10px] font-normal">({rel.chordVal.toFixed(1)} px)</span>
                  </span>
                </div>
                <div className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 p-1.5 rounded-md mt-1 text-center">
                  ∠{rel.vertex} = ½ · {rel.oppositeArcName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
