import React from 'react';
import { EngineResult, ActiveHighlight, ScaleMode } from '../types';
import { formatArcFraction } from '../engines/geometryState';
import { formatTwoLevelLength } from '../utils/units';

interface ArcChordTableProps {
  engineResult: EngineResult;
  scaleMode: ScaleMode;
  activeHighlight: ActiveHighlight;
  onHoverHighlight: (highlight: ActiveHighlight) => void;
  R: number;
  scale?: number;
}

export const ArcChordTable: React.FC<ArcChordTableProps> = ({
  engineResult,
  scaleMode,
  activeHighlight,
  onHoverHighlight,
  R,
  scale = 1.0,
}) => {
  const pairs: Array<{
    pair: 'AB' | 'BC' | 'CA';
    color: string;
    arcFraction: number;
    chordVal: number;
    oppVertex: 'A' | 'B' | 'C';
  }> = [
    {
      pair: 'AB',
      color: '#10B981', // emerald
      arcFraction: engineResult.arcs.AB,
      chordVal: engineResult.chords.AB,
      oppVertex: 'C',
    },
    {
      pair: 'BC',
      color: '#F59E0B', // amber
      arcFraction: engineResult.arcs.BC,
      chordVal: engineResult.chords.BC,
      oppVertex: 'A',
    },
    {
      pair: 'CA',
      color: '#3B82F6', // blue
      arcFraction: engineResult.arcs.CA,
      chordVal: engineResult.chords.CA,
      oppVertex: 'B',
    },
  ];

  const oppositeRelations: Array<{
    vertex: 'A' | 'B' | 'C';
    angleVal: number;
    oppSide: 'BC' | 'CA' | 'AB';
    oppArcKey: 'BC' | 'CA' | 'AB';
    oppArcFraction: number;
    color: string;
  }> = [
    {
      vertex: 'A',
      angleVal: engineResult.angles.A,
      oppSide: 'BC',
      oppArcKey: 'BC',
      oppArcFraction: engineResult.arcs.BC,
      color: '#F59E0B',
    },
    {
      vertex: 'B',
      angleVal: engineResult.angles.B,
      oppSide: 'CA',
      oppArcKey: 'CA',
      oppArcFraction: engineResult.arcs.CA,
      color: '#3B82F6',
    },
    {
      vertex: 'C',
      angleVal: engineResult.angles.C,
      oppSide: 'AB',
      oppArcKey: 'AB',
      oppArcFraction: engineResult.arcs.AB,
      color: '#10B981',
    },
  ];

  return (
    <div
      id="arcChordTableSection"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              ARC / CHORD TABLE
            </span>
            <span className="text-xs text-slate-600 font-medium">
              — Связь дуг и стягивающих хорд
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Каждая дуга однозначно задаёт длину хорды: чем больше дуга, тем больше хорда (до 180° = 2R)
          </p>
        </div>

        <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md font-semibold">
          Chord = 2R · sin(θ / 2)
        </span>
      </div>

      {/* Table 1: PAIR | ARC | CHORD */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
              <th className="py-2.5 px-3 bg-slate-50 rounded-l-lg">ПАРА (ХОРДА)</th>
              <th className="py-2.5 px-3 bg-slate-50 text-indigo-700">ДУГА (ARC)</th>
              <th className="py-2.5 px-3 bg-slate-50 text-emerald-700">ДЛИНА ХОРДЫ (CHORD)</th>
              <th className="py-2.5 px-3 bg-slate-50 text-slate-600 rounded-r-lg">СВОЙСТВО СВЯЗИ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {pairs.map((p) => {
              const info = formatArcFraction(p.arcFraction);
              const isHighlighted =
                (activeHighlight?.type === 'side' && activeHighlight.id === p.pair) ||
                (activeHighlight?.type === 'arc' && activeHighlight.id === p.pair) ||
                (activeHighlight?.type === 'vertex' && activeHighlight.id === p.oppVertex);

              const isDiameter = Math.abs(p.arcFraction - 0.5) < 0.008;

              return (
                <tr
                  key={p.pair}
                  id={`arcChordRow-${p.pair}`}
                  onMouseEnter={() => onHoverHighlight({ type: 'side', id: p.pair })}
                  onMouseLeave={() => onHoverHighlight(null)}
                  className={`transition-colors cursor-pointer ${
                    isHighlighted ? 'bg-indigo-50/70 font-medium' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: p.color }}
                      />
                      Хорда {p.pair}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap text-indigo-700 font-semibold">
                    {scaleMode === 'radians' ? (
                      <span>
                        {(p.arcFraction * 2 * Math.PI).toFixed(2)} рад{' '}
                        <span className="text-slate-400 font-normal">({info.degreesStr} • {info.fractionStr} кр.)</span>
                      </span>
                    ) : scaleMode === 'fractions' ? (
                      <span>
                        {info.fractionStr} круга{' '}
                        <span className="text-slate-400 font-normal">({info.degreesStr})</span>
                      </span>
                    ) : (
                      <span>
                        {info.degreesStr}{' '}
                        <span className="text-slate-400 font-normal">({info.fractionStr} круга)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    {(() => {
                      const chordLen = formatTwoLevelLength(p.chordVal, scale);
                      return (
                        <div className="flex flex-col">
                          <span className="text-emerald-700 font-bold text-xs">
                            {chordLen.mm}
                          </span>
                          <span className="text-slate-400 text-[10px] font-normal">
                            ({chordLen.px})
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-500">
                    {isDiameter ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                        <span>ДИАМЕТР (D = 2R = {(2 * R * scale).toFixed(1)} мм</span>
                        <span className="text-slate-400 font-normal text-[10px]">/ {(2 * R).toFixed(0)} px)</span>
                      </span>
                    ) : (
                      <span>Хорда дуги {info.degreesStr}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table 2: OPPOSITE RELATION (ANGLE | OPPOSITE SIDE | OPPOSITE ARC) */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            OPPOSITE RELATION (ПРАВИЛО ПРОТИВОПОЛОЖНОСТЕЙ)
          </span>
          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium border border-indigo-100">
            ∠Вершина = ½ Противоположной дуги
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-2 px-3 bg-slate-50 rounded-l-lg">ВПИСАННЫЙ УГОЛ</th>
                <th className="py-2 px-3 bg-slate-50 text-slate-700">ПРОТИВОПОЛОЖНАЯ СТОРОНА</th>
                <th className="py-2 px-3 bg-slate-50 text-indigo-700">ПРОТИВОПОЛОЖНАЯ ДУГА</th>
                <th className="py-2 px-3 bg-slate-50 text-emerald-700 rounded-r-lg">
                  МАТЕМАТИЧЕСКИЙ ЗАКОН
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {oppositeRelations.map((rel) => {
                const isHighlighted =
                  (activeHighlight?.type === 'vertex' && activeHighlight.id === rel.vertex) ||
                  (activeHighlight?.type === 'side' && activeHighlight.id === rel.oppSide) ||
                  (activeHighlight?.type === 'arc' && activeHighlight.id === rel.oppArcKey);

                const arcDeg = Math.round(rel.oppArcFraction * 360);
                const angleDeg = Math.round(rel.angleVal);

                return (
                  <tr
                    key={rel.vertex}
                    id={`oppRelRow-${rel.vertex}`}
                    onMouseEnter={() => onHoverHighlight({ type: 'vertex', id: rel.vertex })}
                    onMouseLeave={() => onHoverHighlight(null)}
                    className={`transition-colors cursor-pointer ${
                      isHighlighted ? 'bg-indigo-50/70 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                      ∠{rel.vertex} ({angleDeg}°)
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className="font-bold px-2 py-0.5 rounded border text-xs bg-white"
                        style={{ borderColor: rel.color, color: rel.color }}
                      >
                        {rel.oppSide}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-indigo-700 whitespace-nowrap">
                      Дуга {rel.oppSide} ({arcDeg}°)
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-emerald-700 whitespace-nowrap font-semibold">
                      {angleDeg}° = ½ · {arcDeg}°
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
