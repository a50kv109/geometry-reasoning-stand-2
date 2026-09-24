// src/components/school/SchoolToolbar.tsx
// Toolbar for classical drawing instruments in School Mode

import React from 'react';
import { SchoolTool, ToolState } from './schoolTypes';
import {
  MousePointer,
  Dot,
  Minus,
  MoveHorizontal,
  Circle,
  Ruler,
  Compass,
  Divide,
  GitFork,
  CornerDownRight,
  Equal,
  Eraser,
  X,
  RotateCcw,
  Undo2,
} from 'lucide-react';

interface SchoolToolbarProps {
  activeTool: SchoolTool;
  onChangeTool: (tool: SchoolTool) => void;
  toolState: ToolState;
  onCancelOperation: () => void;
  onClearRuler: () => void;
  onClearConstructions: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  scale?: number;
}

const TOOLS: {
  id: SchoolTool;
  label: string;
  shortKey: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    id: 'select',
    label: 'Выделение',
    shortKey: 'V',
    icon: MousePointer,
    description: 'Выделение и перемещение точек',
  },
  {
    id: 'point',
    label: 'Точка',
    shortKey: 'P',
    icon: Dot,
    description: 'Поставить точку на плоскости или окружности',
  },
  {
    id: 'segment',
    label: 'Отрезок',
    shortKey: 'S',
    icon: Minus,
    description: 'Отрезок между двумя точками',
  },
  {
    id: 'line',
    label: 'Прямая',
    shortKey: 'L',
    icon: MoveHorizontal,
    description: 'Бесконечная прямая через две точки',
  },
  {
    id: 'circle',
    label: 'Окружность',
    shortKey: 'C',
    icon: Circle,
    description: 'Окружность по центру и точке радиуса',
  },
  {
    id: 'ruler',
    label: 'Линейка',
    shortKey: 'R',
    icon: Ruler,
    description: 'Измерение расстояния между точками (без создания объектов)',
  },
  {
    id: 'compass',
    label: 'Циркуль',
    shortKey: 'K',
    icon: Compass,
    description: 'Перенос радиуса / построение окружности циркулем',
  },
  {
    id: 'perp_bisector',
    label: 'Серед. перпендикуляр',
    shortKey: 'B',
    icon: Divide,
    description: 'Серединный перпендикуляр к отрезку (классическое построение)',
  },
  {
    id: 'angle_bisector',
    label: 'Биссектриса угла',
    shortKey: 'G',
    icon: GitFork,
    description: 'Классическая внутренняя биссектриса угла по выбранной вершине',
  },
  {
    id: 'perpendicular',
    label: 'Перпендикуляр к L',
    shortKey: 'T',
    icon: CornerDownRight,
    description: 'Классический перпендикуляр к прямой L через точку P (L → P)',
  },
  {
    id: 'parallel',
    label: 'Параллель к L',
    shortKey: 'X',
    icon: Equal,
    description: 'Классическая параллельная прямая через точку P к прямой L (L → P)',
  },
  {
    id: 'erase',
    label: 'Ластик',
    shortKey: 'E',
    icon: Eraser,
    description: 'Удаление построенного объекта',
  },
];

export const SchoolToolbar: React.FC<SchoolToolbarProps> = ({
  activeTool,
  onChangeTool,
  toolState,
  onCancelOperation,
  onClearRuler,
  onClearConstructions,
  onUndo,
  canUndo = false,
  scale = 1.0,
}) => {
  const isMultiStepActive = toolState.status !== 'IDLE';

  const getStepHint = (): string => {
    switch (activeTool) {
      case 'select':
        return 'Кликните и перетащите любую точку чертежа';
      case 'point':
        return 'Кликните на плоскости или окружности для создания точки';
      case 'segment':
        return toolState.status === 'IDLE'
          ? 'Кликните первую точку отрезка'
          : 'Кликните вторую точку отрезка (ESC для отмены)';
      case 'line':
        return toolState.status === 'IDLE'
          ? 'Кликните первую точку прямой'
          : 'Кликните вторую точку прямой (ESC для отмены)';
      case 'circle':
        return toolState.status === 'IDLE'
          ? 'Кликните точку центра окружности'
          : 'Кликните точку на радиусе (ESC для отмены)';
      case 'ruler':
        return toolState.status === 'IDLE'
          ? 'Кликните первую точку для измерения'
          : 'Кликните вторую точку (ESC для отмены)';
      case 'compass':
        return toolState.status === 'IDLE'
          ? 'Кликните центр для ножки циркуля'
          : 'Задайте раствор циркуля вторым кликом (ESC для отмены)';
      case 'perp_bisector':
        return toolState.status === 'IDLE'
          ? 'Кликните первую точку отрезка (или существующий отрезок)'
          : 'Кликните вторую точку отрезка для построения перпендикуляра (ESC для отмены)';
      case 'angle_bisector':
        if (toolState.angleBisectorTargets && toolState.angleBisectorTargets.length === 0) {
          return 'Нет подходящих вершин для построения биссектрисы';
        }
        if (toolState.hoverSmartTargetId && toolState.angleBisectorTargets) {
          const target = toolState.angleBisectorTargets.find(
            (t) => t.targetId === toolState.hoverSmartTargetId
          );
          if (target) {
            return `Построить биссектрису угла ${target.vertexName}`;
          }
        }
        if (toolState.lastActionMessage) {
          return toolState.lastActionMessage;
        }
        return 'Выберите вершину угла — доступные вершины подсвечены';
      case 'perpendicular':
        return toolState.status === 'IDLE'
          ? 'Шаг 1/2: Выберите прямую или отрезок L'
          : 'Шаг 2/2: Кликните точку P для проведения перпендикуляра (ESC для отмены)';
      case 'parallel':
        return toolState.status === 'IDLE'
          ? 'Шаг 1/2: Выберите прямую или отрезок L'
          : 'Шаг 2/2: Кликните точку P для проведения параллельной прямой (ESC для отмены)';
      case 'erase':
        return 'Ластик: кликните по объекту, чтобы удалить его. ESC — отмена.';
      default:
        return '';
    }
  };

  return (
    <div
      id="schoolToolbarContainer"
      className="w-full flex flex-col gap-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xs"
    >
      {/* Upper Bar: Instruments Palette + Geometry Operations */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {TOOLS.map((t) => {
            const IconComponent = t.icon;
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                id={`schoolTool_${t.id}`}
                onClick={() => onChangeTool(t.id)}
                title={`${t.label} (${t.description})`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Group: Undo & Clear Drawing */}
        <div className="flex items-center gap-1.5">
          {/* Centralized Geometry Undo Button */}
          <button
            id="schoolUndoBtn"
            onClick={onUndo}
            disabled={!canUndo}
            title={
              canUndo
                ? 'Отменить последнее действие (Ctrl+Z)'
                : 'Нет действий для отмены'
            }
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              canUndo
                ? 'bg-white hover:bg-slate-50 text-indigo-700 border-slate-300 shadow-2xs cursor-pointer'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Отменить</span>
          </button>

          {/* Clear user constructions button */}
          <button
            id="clearConstructionsBtn"
            onClick={onClearConstructions}
            title="Удалить все пользовательские построения (оставив базовый треугольник и окружность)"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Очистить чертёж</span>
          </button>
        </div>
      </div>

      {/* Lower Bar: Tool Step Status & Dynamic Action Feedback */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
          activeTool === 'erase'
            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
            : 'bg-slate-50 border-slate-200/80 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              activeTool === 'erase' ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500 animate-pulse'
            }`}
          />
          <span className="font-medium">{getStepHint()}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Ruler Measurement Display */}
          {toolState.rulerMeasurement && (
            <div
              id="rulerMeasurementBadge"
              className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono text-xs font-bold"
            >
              <Ruler className="w-3.5 h-3.5 text-amber-600" />
              <span>
                L = {(toolState.rulerMeasurement.distanceModel * scale).toFixed(1)} мм{' '}
                <span className="text-[10px] text-amber-600 font-normal">
                  ({Math.round(toolState.rulerMeasurement.distanceModel)} px)
                </span>
              </span>
              <button
                id="clearRulerMeasurementBtn"
                onClick={onClearRuler}
                title="Закрыть измерение"
                className="hover:text-amber-700 ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Escape cancel button if in multi-step mode or active erase tool */}
          {(isMultiStepActive || activeTool === 'erase') && (
            <button
              id="cancelToolOperationBtn"
              onClick={onCancelOperation}
              className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-rose-600 border border-rose-200 rounded text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Отмена (ESC)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
