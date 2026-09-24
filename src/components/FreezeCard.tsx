import React from 'react';
import { FrozenSnapshot } from '../types';
import { Snowflake, Play, ArrowDown, CheckCircle2 } from 'lucide-react';

interface FreezeCardProps {
  frozenSnapshot: FrozenSnapshot | null;
  onToggleFreeze: () => void;
  isFrozen: boolean;
  scale?: number;
}

export const FreezeCard: React.FC<FreezeCardProps> = ({
  frozenSnapshot,
  onToggleFreeze,
  isFrozen,
  scale = 1.0,
}) => {
  return (
    <div
      id="freezeTriangleSection"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              FREEZE TRIANGLE
            </span>
            <span className="text-xs text-slate-600 font-medium">
              — Фиксация состояния для сравнительного анализа
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Зафиксируйте интересную конфигурацию для детального сопоставления путей вычисления
          </p>
        </div>

        <button
          id="freezeToggleBtn"
          onClick={onToggleFreeze}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-xs ${
            isFrozen
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-100'
          }`}
        >
          {isFrozen ? (
            <>
              <Play className="w-3.5 h-3.5" /> РАЗМОРОЗИТЬ (LIVE)
            </>
          ) : (
            <>
              <Snowflake className="w-3.5 h-3.5" /> ЗАМОРОЗИТЬ ТРЕУГОЛЬНИК (FREEZE)
            </>
          )}
        </button>
      </div>

      {isFrozen && frozenSnapshot ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>
                <strong>SAME TRIANGLE — TWO DESCRIPTIONS</strong>: Геометрия зафиксирована в момент времени {new Date(frozenSnapshot.timestamp).toLocaleTimeString()}.
              </span>
            </div>
            <div className="font-mono text-[11px] bg-white border border-indigo-200 px-2.5 py-0.5 rounded text-indigo-800 font-semibold shadow-xs">
              R = {(frozenSnapshot.R * scale).toFixed(1)} мм{' '}
              <span className="text-slate-400 font-normal">({frozenSnapshot.R.toFixed(0)} px)</span>
            </div>
          </div>

          {/* Frozen Geometric State Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Дуги</span>
              <div className="font-mono text-indigo-600 font-bold mt-1 leading-relaxed">
                AB: {(frozenSnapshot.classicalResult.arcs.AB * 360).toFixed(0)}°<br />
                BC: {(frozenSnapshot.classicalResult.arcs.BC * 360).toFixed(0)}°<br />
                CA: {(frozenSnapshot.classicalResult.arcs.CA * 360).toFixed(0)}°
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Хорды (Стороны)</span>
              <div className="font-mono text-emerald-600 font-bold mt-1 leading-relaxed text-[11px]">
                AB: {(frozenSnapshot.classicalResult.chords.AB * scale).toFixed(1)} мм{' '}
                <span className="text-slate-400 font-normal text-[10px]">({frozenSnapshot.classicalResult.chords.AB.toFixed(1)} px)</span><br />
                BC: {(frozenSnapshot.classicalResult.chords.BC * scale).toFixed(1)} мм{' '}
                <span className="text-slate-400 font-normal text-[10px]">({frozenSnapshot.classicalResult.chords.BC.toFixed(1)} px)</span><br />
                CA: {(frozenSnapshot.classicalResult.chords.CA * scale).toFixed(1)} мм{' '}
                <span className="text-slate-400 font-normal text-[10px]">({frozenSnapshot.classicalResult.chords.CA.toFixed(1)} px)</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Вписанные углы</span>
              <div className="font-mono text-amber-600 font-bold mt-1 leading-relaxed">
                ∠A: {frozenSnapshot.classicalResult.angles.A.toFixed(1)}°<br />
                ∠B: {frozenSnapshot.classicalResult.angles.B.toFixed(1)}°<br />
                ∠C: {frozenSnapshot.classicalResult.angles.C.toFixed(1)}°
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Центр O</span>
              <div className="font-bold text-slate-800 mt-1">
                {frozenSnapshot.classicalResult.classification === 'acute' && 'INSIDE (внутри)'}
                {frozenSnapshot.classicalResult.classification === 'right' && 'ON SIDE (на стороне)'}
                {frozenSnapshot.classicalResult.classification === 'obtuse' && 'OUTSIDE (снаружи)'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {frozenSnapshot.classicalResult.classificationName}
              </div>
            </div>
          </div>

          {/* Dual Computation Pathways Breakdown */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">
              COMPUTATION PATH : ДВА ВЫЧИСЛИТЕЛЬНЫХ ПУТИ ОДНОЙ СИСТЕМЫ
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Classical Path */}
              <div className="bg-slate-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-800 text-xs uppercase tracking-wide">
                    CLASSICAL (TRIGONOMETRIC)
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                    Аналитическая геометрия
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>1. Положение вершин A, B, C</span>
                    <span className="text-[10px] text-slate-400 font-mono">2D координаты</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>2. Углы & sin/cos</span>
                    <span className="text-[10px] text-indigo-600 font-mono">(R·cos θ, R·sin θ)</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>3. Длины хорд через sqrt</span>
                    <span className="text-[10px] text-indigo-600 font-mono">√((Δx)² + (Δy)²)</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>4. Углы треугольника</span>
                    <span className="text-[10px] text-indigo-600 font-mono">Теорема косинусов (acos)</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>5. Площадь</span>
                    <span className="text-[10px] text-indigo-600 font-mono">Формула Герона</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-indigo-100">
                  Оценочная стоимость: <strong className="text-indigo-700 font-mono">{frozenSnapshot.classicalResult.ops.total} ops</strong> (Trig: {frozenSnapshot.classicalResult.ops.trig}, Sqrt: {frozenSnapshot.classicalResult.ops.sqrt})
                </div>
              </div>

              {/* Relational / Matrix Path */}
              <div className="bg-slate-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 text-xs uppercase tracking-wide">
                    RELATIONAL / MATRIX (STRUCTURAL)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    Циклическая топология
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>1. Положение вершин на окружности</span>
                    <span className="text-[10px] text-slate-400 font-mono">u ∈ [0, 1)</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>2. Циклический порядок & 3 дуги</span>
                    <span className="text-[10px] text-emerald-600 font-mono">d1 + d2 + d3 = 1.0</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>3. Отношения противоположностей</span>
                    <span className="text-[10px] text-emerald-600 font-mono">∠A = ½ дуги BC</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>4. Чистая топологическая классификация</span>
                    <span className="text-[10px] text-emerald-600 font-mono">d_max ⋛ 0.5 (без trig!)</span>
                  </div>
                  <div className="flex justify-center text-slate-400"><ArrowDown className="w-3.5 h-3.5" /></div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                    <span>5. Метрический переход (хорды)</span>
                    <span className="text-[10px] text-emerald-600 font-mono">2R·sin(d·π)</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-emerald-100">
                  Оценочная стоимость: <strong className="text-emerald-700 font-mono">{frozenSnapshot.matrixResult.ops.total} ops</strong> (Trig: {frozenSnapshot.matrixResult.ops.trig}, Sqrt: {frozenSnapshot.matrixResult.ops.sqrt})
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
          Нажмите <strong className="text-slate-800">«ЗАМОРОЗИТЬ ТРЕУГОЛЬНИК»</strong>, чтобы сохранить текущую геометрию и открыть синхронное пошаговое сравнение путей CLASSICAL и MATRIX.
        </div>
      )}
    </div>
  );
};
