// src/components/layout/WorkspaceSplitter.tsx
// Draggable vertical divider with quick 50/50 reset button
// Pure presentation component: zero modification of GeometryState or mathematical kernel.

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { GripVertical, SplitSquareHorizontal } from 'lucide-react';

interface WorkspaceSplitterProps {
  splitPercent: number; // 35 to 75
  onSplitChange: (newPercent: number) => void;
  onResetSplit: () => void;
  minPercent?: number; // default 35
  maxPercent?: number; // default 75
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const WorkspaceSplitter: React.FC<WorkspaceSplitterProps> = ({
  splitPercent,
  onSplitChange,
  onResetSplit,
  minPercent = 35,
  maxPercent = 75,
  containerRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPercent = Math.max(minPercent, Math.min(maxPercent, rawPercent));
      onSplitChange(clampedPercent);
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [containerRef, minPercent, maxPercent, onSplitChange]);

  const isDefaultSplit = Math.abs(splitPercent - 50) < 1;

  return (
    <div
      id="workspaceSplitter"
      aria-label="Draggable workspace divider"
      className="hidden lg:flex relative flex-col items-center justify-center w-2.5 hover:w-3.5 -mx-1 z-30 transition-all select-none group"
    >
      {/* Visual background track */}
      <div
        onPointerDown={handlePointerDown}
        className={`w-full h-full flex flex-col items-center justify-center cursor-col-resize transition ${
          isDragging ? 'bg-indigo-500/20' : 'bg-transparent hover:bg-slate-200/60'
        }`}
        title="Потяните для изменения пропорций чертежа и аналитической панели"
      >
        {/* Central hairline */}
        <div
          className={`w-[2px] h-full transition ${
            isDragging
              ? 'bg-indigo-600 shadow-sm shadow-indigo-300'
              : 'bg-slate-300 group-hover:bg-indigo-400'
          }`}
        />

        {/* Grab Handle Icon */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 px-0.5 py-3 rounded-full bg-white border shadow-xs flex items-center justify-center transition ${
            isDragging
              ? 'border-indigo-600 text-indigo-600 scale-110 shadow-indigo-100'
              : 'border-slate-300 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300'
          }`}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      </div>

      {/* Quick 50/50 Reset Badge (appears when not at 50% or on hover) */}
      {!isDefaultSplit && (
        <button
          id="resetSplitBtn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResetSplit();
          }}
          title="Сбросить соотношение панелей на 50/50"
          className="absolute top-2 -translate-x-1/2 left-1/2 px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 border border-indigo-200 shadow-xs text-[10px] font-bold tracking-tight flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
        >
          <SplitSquareHorizontal className="w-3 h-3" />
          <span>50/50</span>
        </button>
      )}
    </div>
  );
};
