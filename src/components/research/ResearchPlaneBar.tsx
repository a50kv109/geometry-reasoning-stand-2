// src/components/research/ResearchPlaneBar.tsx
// UI Control Bar for Plane 1 / Plane 2 Workspace Selection and Lifecycle Controls

import React, { useRef } from 'react';
import {
  Layers,
  Copy,
  Download,
  Upload,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  TriangleResearchSession,
  PlaneId,
  Plane2Lifecycle,
} from '../../engines/research/types';

interface ResearchPlaneBarProps {
  session: TriangleResearchSession;
  onSelectActivePlane: (planeId: PlaneId) => void;
  onClonePlane1ToPlane2: () => void;
  onImportPgsToPlane2: (json: string) => void;
  onExportPlane2Pgs: () => void;
  onTogglePlane2Lifecycle: () => void;
  onResetPlane2: () => void;
  onOpenWorkspacePanel?: () => void;
}

export const ResearchPlaneBar: React.FC<ResearchPlaneBarProps> = ({
  session,
  onSelectActivePlane,
  onClonePlane1ToPlane2,
  onImportPgsToPlane2,
  onExportPlane2Pgs,
  onTogglePlane2Lifecycle,
  onResetPlane2,
  onOpenWorkspacePanel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        onImportPgsToPlane2(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isPlane2Active = session.activePlane === 'PLANE_2';
  const isPlane2Fixed = session.plane2Lifecycle === 'FIXED';
  const hasPlane2 = session.plane2 !== null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json,.pgs.json"
        className="hidden"
      />

      {/* Left Group: Active Plane Selector */}
      <div className="flex items-center space-x-1.5">
        <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-1">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Плоскость:</span>
        </span>

        {/* Plane 1 Tab */}
        <button
          onClick={() => onSelectActivePlane('PLANE_1')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
            session.activePlane === 'PLANE_1'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <span>📐 Plane 1 (Authoritative)</span>
        </button>

        {/* Plane 2 Tab */}
        <button
          onClick={() => {
            if (hasPlane2) {
              onSelectActivePlane('PLANE_2');
            } else {
              onClonePlane1ToPlane2();
            }
          }}
          className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 relative ${
            session.activePlane === 'PLANE_2'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : hasPlane2
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <span>🧪 Plane 2 (Workspace)</span>
          {!hasPlane2 && (
            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.2 rounded">
              Создать
            </span>
          )}
        </button>
      </div>

      {/* Middle Group: Workspace Metadata Badges */}
      {hasPlane2 && (
        <div className="flex items-center space-x-2 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 text-[11px]">
          <span className="text-slate-400 font-mono">
            Source: <strong className="text-indigo-300">{session.plane2?.sourceType}</strong>
          </span>

          <span className="text-slate-600">|</span>

          {/* Lifecycle Status */}
          <span className={`flex items-center gap-1 font-semibold ${isPlane2Fixed ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isPlane2Fixed ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            <span>{session.plane2Lifecycle}</span>
          </span>

          {/* Verification Status if Imported */}
          {session.plane2?.receiverVerification && (
            <>
              <span className="text-slate-600">|</span>
              <span className={`flex items-center gap-1 font-semibold ${
                session.plane2.receiverVerification.verified ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {session.plane2.receiverVerification.verified ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                <span>{session.plane2.receiverVerification.status}</span>
              </span>
            </>
          )}

          {/* Is Modified Badge */}
          {session.plane2?.isModified && (
            <span className="ml-1 bg-indigo-950 text-indigo-300 border border-indigo-800 px-1 py-0.2 text-[9px] rounded uppercase font-bold">
              Modified
            </span>
          )}
        </div>
      )}

      {/* Right Group: Plane 2 Management Buttons */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onClonePlane1ToPlane2}
          title="Скопировать Plane 1 в Plane 2"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1"
        >
          <Copy className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Клон P1→P2</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Импортировать PGS Passport напрямую в Plane 2 Workspace"
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Импорт PGS</span>
        </button>

        {hasPlane2 && (
          <>
            <button
              onClick={onExportPlane2Pgs}
              title="Экспортировать Plane 2 Workspace в PGS Passport"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Экспорт P2</span>
            </button>

            <button
              onClick={onTogglePlane2Lifecycle}
              title={isPlane2Fixed ? 'Разблокировать Plane 2 (BUILDING)' : 'Зафиксировать Plane 2 (FIXED / Read-Only)'}
              className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                isPlane2Fixed
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 hover:bg-amber-900'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPlane2Fixed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isPlane2Fixed ? 'Unfix' : 'Fix P2'}</span>
            </button>

            {onOpenWorkspacePanel && (
              <button
                onClick={onOpenWorkspacePanel}
                title="Посмотреть аудит и метаданные Plane 2 Workspace"
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-slate-300" />
              </button>
            )}

            <button
              onClick={onResetPlane2}
              title="Сбросить и удалить Plane 2 Workspace"
              className="px-2 py-1.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
