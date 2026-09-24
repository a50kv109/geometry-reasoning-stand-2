import React, { useState, useMemo } from 'react';
import { EngineResult } from '../types';
import { ClassicalEngine } from '../engines/classicalEngine';
import { MatrixEngine } from '../engines/matrixEngine';
import { Gauge, CheckCircle2, AlertTriangle, Play, Cpu, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { createGeometrySnapshot } from '../engines/temporalObserver';
import { checkGeometryInvariants } from '../engines/invariants';

interface EngineBenchmarkPanelProps {
  currentEngine: 'classical' | 'matrix';
  onSelectEngine: (engine: 'classical' | 'matrix') => void;
  activeResult: EngineResult;
  classicalResult: EngineResult;
  matrixResult: EngineResult;
  verifyEnabled: boolean;
  onToggleVerify: () => void;
  pointsU: { A: number; B: number; C: number };
  R: number;
}

export const EngineBenchmarkPanel: React.FC<EngineBenchmarkPanelProps> = ({
  currentEngine,
  onSelectEngine,
  activeResult,
  classicalResult,
  matrixResult,
  verifyEnabled,
  onToggleVerify,
  pointsU,
  R,
}) => {
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResults, setBenchResults] = useState<{
    classicalTimeMs: number;
    matrixTimeMs: number;
    iterations: number;
  } | null>(null);
  const [showInvariants, setShowInvariants] = useState(false);

  // Compute differences for VERIFY
  const areaDiff = Math.abs(classicalResult.area - matrixResult.area);
  const perimeterDiff = Math.abs(classicalResult.perimeter - matrixResult.perimeter);
  const isMatch = areaDiff < 0.2 && perimeterDiff < 0.2;

  // Geometry Invariants Audit
  const snapshot = useMemo(
    () => createGeometrySnapshot({ pointsU, R, scale: 1.0 }),
    [pointsU, R]
  );
  const invariantChecks = useMemo(
    () => checkGeometryInvariants(snapshot, activeResult),
    [snapshot, activeResult]
  );
  const allInvariantsPassed = invariantChecks.every((c) => c.passed);

  // Real micro-benchmark runner (isolated execution loop)
  const runMicroBenchmark = () => {
    setBenchRunning(true);
    setTimeout(() => {
      const iterations = 25000;
      const cEngine = new ClassicalEngine();
      const mEngine = new MatrixEngine();

      // Warmup
      for (let i = 0; i < 500; i++) {
        cEngine.compute(pointsU, R);
        mEngine.compute(pointsU, R);
      }

      // Classical timing
      const t0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        cEngine.compute(pointsU, R);
      }
      const t1 = performance.now();
      const classicalTimeMs = t1 - t0;

      // Matrix timing
      const t2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        mEngine.compute(pointsU, R);
      }
      const t3 = performance.now();
      const matrixTimeMs = t3 - t2;

      setBenchResults({
        classicalTimeMs: Number(classicalTimeMs.toFixed(2)),
        matrixTimeMs: Number(matrixTimeMs.toFixed(2)),
        iterations,
      });
      setBenchRunning(false);
    }, 50);
  };

  return (
    <div
      id="computationEnginePanel"
      className="bg-indigo-900 rounded-xl shadow-lg p-5 text-white border border-indigo-800 flex flex-col gap-4"
    >
      {/* Header & Verify Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">
            ENGINE OUTPUT
          </h3>
          <p className="text-[11px] text-indigo-200/80">
            Вычислительные ядра: Classical (Trig) vs Relational Matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          {verifyEnabled && (
            <div
              id="verifyStatusBadge"
              className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700/80"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isMatch ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></div>
              <span className={isMatch ? 'text-emerald-300' : 'text-amber-300'}>
                {isMatch ? 'VERIFY: MATCH' : `DIFF (ΔS: ${areaDiff.toFixed(2)})`}
              </span>
            </div>
          )}

          <button
            id="toggleVerifyBtn"
            onClick={onToggleVerify}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition ${
              verifyEnabled
                ? 'bg-indigo-800 text-indigo-200 border-indigo-600'
                : 'bg-indigo-950 text-indigo-400 border-indigo-800'
            }`}
          >
            VERIFY: {verifyEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Classical Path vs Matrix Path Highlight Grid */}
      <div className="grid grid-cols-2 gap-4 bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/60">
        <div
          onClick={() => onSelectEngine('classical')}
          className={`space-y-1 p-2.5 rounded-lg cursor-pointer transition border ${
            currentEngine === 'classical'
              ? 'bg-indigo-800/80 border-indigo-500 shadow-xs'
              : 'border-transparent hover:bg-indigo-800/40'
          }`}
        >
          <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
            Classical Path
          </div>
          <div className="text-sm font-bold text-white">Trigonometry</div>
          <div className="text-[10px] text-indigo-200/70 font-mono">2R · sin(θ/2)</div>
        </div>

        <div
          onClick={() => onSelectEngine('matrix')}
          className={`space-y-1 p-2.5 rounded-lg cursor-pointer transition border ${
            currentEngine === 'matrix'
              ? 'bg-indigo-800/80 border-indigo-500 shadow-xs'
              : 'border-transparent hover:bg-indigo-800/40'
          }`}
        >
          <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
            Matrix Path
          </div>
          <div className="text-sm font-bold text-white">Relational Map</div>
          <div className="text-[10px] text-emerald-300/90 font-mono">Chord(Arc / Cycle)</div>
        </div>
      </div>

      {/* Invariants Audit Tray (SOL-style verification) */}
      {verifyEnabled && (
        <div className="bg-indigo-950/60 border border-indigo-700/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-semibold">
              <ShieldCheck className={`w-4 h-4 ${allInvariantsPassed ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>Инварианты геометрии ({invariantChecks.filter((c) => c.passed).length}/{invariantChecks.length} проверок)</span>
            </div>
            <button
              onClick={() => setShowInvariants(!showInvariants)}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-white px-2 py-0.5 rounded bg-indigo-900/60 hover:bg-indigo-800 transition cursor-pointer"
            >
              <span>{showInvariants ? 'Скрыть' : 'Детали'}</span>
              {showInvariants ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {showInvariants && (
            <div className="space-y-1 pt-1 text-[11px]">
              {invariantChecks.map((chk) => (
                <div
                  key={chk.name}
                  className="flex items-center justify-between bg-indigo-900/50 p-2 rounded-lg border border-indigo-800/60"
                >
                  <div className="flex items-center gap-1.5">
                    {chk.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="text-slate-200">{chk.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-slate-400">
                      факт: <strong className={chk.passed ? 'text-emerald-300' : 'text-amber-300'}>{chk.actual}</strong>
                    </span>
                    <span className="text-slate-500">| норма: {chk.expected}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Est. Operation Cost Summary matching Geometric Balance */}
      <div className="pt-2 border-t border-indigo-800 flex justify-between items-center">
        <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">
          Est. Operation Cost
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-white font-mono">{classicalResult.ops.total} Ops</div>
            <div className="text-[9px] text-indigo-300/70">Classical</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-400 font-mono">{matrixResult.ops.total} Ops</div>
            <div className="text-[9px] text-emerald-300/70">Matrix</div>
          </div>
        </div>
      </div>

      {/* Operation Breakdown Grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
        <div className="bg-indigo-950/50 p-2 rounded-lg border border-indigo-800/60">
          <span className="text-indigo-300/80 block text-[10px]">Add/Sub</span>
          <span id="opCountAddSub" className="font-mono font-bold text-white">
            {activeResult.ops.addSub}
          </span>
        </div>
        <div className="bg-indigo-950/50 p-2 rounded-lg border border-indigo-800/60">
          <span className="text-indigo-300/80 block text-[10px]">Mul/Div</span>
          <span id="opCountMulDiv" className="font-mono font-bold text-white">
            {activeResult.ops.mulDiv}
          </span>
        </div>
        <div className="bg-indigo-950/50 p-2 rounded-lg border border-indigo-800/60">
          <span className="text-indigo-300/80 block text-[10px]">Sqrt (√)</span>
          <span id="opCountSqrt" className="font-mono font-bold text-white">
            {activeResult.ops.sqrt}
          </span>
        </div>
        <div className="bg-indigo-950/50 p-2 rounded-lg border border-indigo-800/60">
          <span className="text-indigo-300/80 block text-[10px]">Trig (sin/cos)</span>
          <span
            id="opCountTrig"
            className={`font-mono font-bold ${
              currentEngine === 'classical' ? 'text-indigo-300' : 'text-emerald-400'
            }`}
          >
            {activeResult.ops.trig}
          </span>
        </div>
      </div>

      {/* Isolated Benchmark Runner */}
      <div className="bg-indigo-950/40 border border-indigo-800/70 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-medium">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Стресс-тест ядер (25 000 итераций)</span>
          </div>
          <button
            id="runBenchmarkBtn"
            onClick={runMicroBenchmark}
            disabled={benchRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            {benchRunning ? 'Замер...' : 'Запустить тест'}
          </button>
        </div>

        {benchResults && (
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-indigo-900/90 p-2 rounded-lg border border-indigo-700">
              <span className="text-[10px] text-indigo-300 block">Classical (Trig):</span>
              <span className="font-mono font-bold text-white">
                {benchResults.classicalTimeMs} ms
              </span>
            </div>
            <div className="bg-indigo-900/90 p-2 rounded-lg border border-emerald-500/40">
              <span className="text-[10px] text-emerald-300 block">Matrix (Relational):</span>
              <span className="font-mono font-bold text-emerald-400">
                {benchResults.matrixTimeMs} ms
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
