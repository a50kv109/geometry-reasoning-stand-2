// src/components/school/SchoolToolbar.tsx
// Toolbar for classical drawing instruments in School Mode

import React from 'react';
import { SchoolTool, ToolState } from './schoolTypes';
import { useI18n } from '../../i18n';
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

const TOOL_CONFIGS: {
  id: SchoolTool;
  shortKey: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'select', shortKey: 'V', icon: MousePointer },
  { id: 'point', shortKey: 'P', icon: Dot },
  { id: 'segment', shortKey: 'S', icon: Minus },
  { id: 'line', shortKey: 'L', icon: MoveHorizontal },
  { id: 'circle', shortKey: 'C', icon: Circle },
  { id: 'ruler', shortKey: 'R', icon: Ruler },
  { id: 'compass', shortKey: 'K', icon: Compass },
  { id: 'perp_bisector', shortKey: 'B', icon: Divide },
  { id: 'angle_bisector', shortKey: 'G', icon: GitFork },
  { id: 'perpendicular', shortKey: 'T', icon: CornerDownRight },
  { id: 'parallel', shortKey: 'X', icon: Equal },
  { id: 'erase', shortKey: 'E', icon: Eraser },
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
  const { t } = useI18n();
  const isMultiStepActive = toolState.status !== 'IDLE';

  const getStepHint = (): string => {
    switch (activeTool) {
      case 'select':
        return t('school.hint.select');
      case 'point':
        return t('school.hint.point');
      case 'segment':
        return toolState.status === 'IDLE'
          ? t('school.hint.segment.step1')
          : t('school.hint.segment.step2');
      case 'line':
        return toolState.status === 'IDLE'
          ? t('school.hint.line.step1')
          : t('school.hint.line.step2');
      case 'circle':
        return toolState.status === 'IDLE'
          ? t('school.hint.circle.step1')
          : t('school.hint.circle.step2');
      case 'ruler':
        return toolState.status === 'IDLE'
          ? t('school.hint.ruler.step1')
          : t('school.hint.ruler.step2');
      case 'compass':
        return toolState.status === 'IDLE'
          ? t('school.hint.compass.step1')
          : t('school.hint.compass.step2');
      case 'perp_bisector':
        return toolState.status === 'IDLE'
          ? t('school.hint.perp_bisector.step1')
          : t('school.hint.perp_bisector.step2');
      case 'angle_bisector':
        if (toolState.angleBisectorTargets && toolState.angleBisectorTargets.length === 0) {
          return t('school.hint.angle_bisector.no_targets');
        }
        if (toolState.hoverSmartTargetId && toolState.angleBisectorTargets) {
          const target = toolState.angleBisectorTargets.find(
            (tgt) => tgt.targetId === toolState.hoverSmartTargetId
          );
          if (target) {
            return t('school.hint.angle_bisector.construct', { vertex: target.vertexName });
          }
        }
        if (toolState.lastActionMessage) {
          return toolState.lastActionMessage;
        }
        return t('school.hint.angle_bisector.select');
      case 'perpendicular':
        return toolState.status === 'IDLE'
          ? t('school.hint.perpendicular.step1')
          : t('school.hint.perpendicular.step2');
      case 'parallel':
        return toolState.status === 'IDLE'
          ? t('school.hint.parallel.step1')
          : t('school.hint.parallel.step2');
      case 'erase':
        return t('school.hint.erase');
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
          {TOOL_CONFIGS.map((toolCfg) => {
            const IconComponent = toolCfg.icon;
            const isSelected = activeTool === toolCfg.id;
            const label = t(`school.tool.${toolCfg.id}`);
            const desc = t(`school.tool.${toolCfg.id}.desc`);
            return (
              <button
                key={toolCfg.id}
                id={`schoolTool_${toolCfg.id}`}
                onClick={() => onChangeTool(toolCfg.id)}
                title={`${label} (${desc})`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{label}</span>
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
                ? t('common.undoTooltip')
                : t('common.noUndo')
            }
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              canUndo
                ? 'bg-white hover:bg-slate-50 text-indigo-700 border-slate-300 shadow-2xs cursor-pointer'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>{t('common.undo')}</span>
          </button>

          {/* Clear user constructions button */}
          <button
            id="clearConstructionsBtn"
            onClick={onClearConstructions}
            title={t('school.action.clearConstructionsTooltip')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('school.action.clearConstructions')}</span>
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
                L = {(toolState.rulerMeasurement.distanceModel * scale).toFixed(1)} {t('common.mm')}{' '}
                <span className="text-[10px] text-amber-600 font-normal">
                  ({Math.round(toolState.rulerMeasurement.distanceModel)} {t('common.px')})
                </span>
              </span>
              <button
                id="clearRulerMeasurementBtn"
                onClick={onClearRuler}
                title={t('school.action.closeMeasurement')}
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
              <span>{t('common.cancelEsc')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

