// src/components/research/PlaneOverlaySlider.tsx
// Compact Vertical Overlay Lens Controller for Plane 1 / Plane 2 Visual Comparison

import React from 'react';
import { Eye, Layers, Sparkles } from 'lucide-react';
import { PlaneOverlayState } from '../../engines/research/types';

interface PlaneOverlaySliderProps {
  overlay: PlaneOverlayState;
  hasPlane2: boolean;
  onToggleOverlay: () => void;
  onChangeMix: (mix: number) => void;
}

export const PlaneOverlaySlider: React.FC<PlaneOverlaySliderProps> = ({
  overlay,
  hasPlane2,
  onToggleOverlay,
  onChangeMix,
}) => {
  if (!hasPlane2) return null;

  const alpha1Percent = Math.round((1 - overlay.mix) * 100);
  const alpha2Percent = Math.round(overlay.mix * 100);
  const isLens5050 = Math.abs(overlay.mix - 0.5) < 0.08;

  return (
    <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-2 font-sans text-xs">
      {/* Overlay Toggle Button */}
      <button
        onClick={onToggleOverlay}
        className={`px-3 py-1.5 rounded-lg shadow-md font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
          overlay.enabled
            ? 'bg-indigo-900/90 text-indigo-200 border-indigo-700 shadow-indigo-900/30'
            : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
        }`}
      >
        <Eye className="w-3.5 h-3.5 text-indigo-400" />
        <span>Overlay Lens</span>
        <span
          className={`px-1.5 py-0.2 text-[9px] rounded uppercase font-mono font-bold ${
            overlay.enabled ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {overlay.enabled ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Expanded Slider Control Widget when Enabled */}
      {overlay.enabled && (
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 p-3 rounded-xl shadow-xl flex flex-col items-center gap-2.5 w-44 text-slate-200 text-xs">
          {/* Status Label */}
          <div className="flex items-center justify-between w-full font-mono text-[10px] pb-1 border-b border-slate-800 text-slate-400">
            <span className="text-indigo-400 font-bold">P1: {alpha1Percent}%</span>
            <span className="text-emerald-400 font-bold">P2: {alpha2Percent}%</span>
          </div>

          {/* Lens Indicator */}
          {isLens5050 && (
            <div className="bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-full justify-center">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>50/50 DIFFERENCE LENS</span>
            </div>
          )}

          {/* Vertical/Horizontal Range Slider */}
          <div className="w-full flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-400">P1</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={overlay.mix}
              onChange={(e) => onChangeMix(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[10px] font-bold text-emerald-400">P2</span>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1 w-full text-[10px] font-mono pt-1">
            <button
              onClick={() => onChangeMix(0)}
              className={`py-1 rounded border transition ${
                overlay.mix === 0
                  ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              P1 100%
            </button>
            <button
              onClick={() => onChangeMix(0.5)}
              className={`py-1 rounded border transition ${
                isLens5050
                  ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              50/50
            </button>
            <button
              onClick={() => onChangeMix(1)}
              className={`py-1 rounded border transition ${
                overlay.mix === 1
                  ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              P2 100%
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
