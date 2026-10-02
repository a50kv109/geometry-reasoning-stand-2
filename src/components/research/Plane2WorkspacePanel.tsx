// src/components/research/Plane2WorkspacePanel.tsx
// Audit and Metadata Inspection Panel for Plane 2 Workspace State

import React from 'react';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  FileCode,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Plane2WorkspaceState, Plane2Lifecycle } from '../../engines/research/types';

interface Plane2WorkspacePanelProps {
  workspace: Plane2WorkspaceState | null;
  lifecycle: Plane2Lifecycle;
  onToggleLifecycle: () => void;
  onClose?: () => void;
}

export const Plane2WorkspacePanel: React.FC<Plane2WorkspacePanelProps> = ({
  workspace,
  lifecycle,
  onToggleLifecycle,
}) => {
  if (!workspace) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
        <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="font-semibold text-slate-300 mb-1">Plane 2 Workspace не инициализирована</p>
        <p className="text-xs text-slate-500">
          Нажмите &quot;Клон P1→P2&quot; или &quot;Импорт PGS&quot; на верхней панели для создания изолированного рабочего пространства Plane 2.
        </p>
      </div>
    );
  }

  const {
    geometryState,
    sourceType,
    importedPassport,
    receiverVerification,
    identityRegistry,
    isModified,
    createdAt,
  } = workspace;

  const isFixed = lifecycle === 'FIXED';
  const objectCount =
    Object.keys(geometryState.points).length +
    Object.keys(geometryState.segments).length +
    Object.keys(geometryState.lines).length +
    Object.keys(geometryState.circles).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-950/80 border border-emerald-800/80 rounded-md">
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <span>Plane 2 Workspace Metadata</span>
              <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-mono font-bold ${
                isFixed ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {lifecycle}
              </span>
            </h3>
            <p className="text-slate-400 text-[11px]">
              Изолированное рабочее пространство агента и анализа переносимых паспортов
            </p>
          </div>
        </div>

        <button
          onClick={onToggleLifecycle}
          className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
            isFixed
              ? 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          {isFixed ? <Lock className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>{isFixed ? 'Разблокировать (BUILDING)' : 'Зафиксировать (FIXED)'}</span>
        </button>
      </div>

      {/* Grid Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
        <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
          <div className="text-slate-500 uppercase text-[9px] mb-0.5">Source Type</div>
          <div className="text-indigo-300 font-bold">{sourceType}</div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
          <div className="text-slate-500 uppercase text-[9px] mb-0.5">Modified Status</div>
          <div className={isModified ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
            {isModified ? 'MODIFIED' : 'PRISTINE'}
          </div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
          <div className="text-slate-500 uppercase text-[9px] mb-0.5">Objects Count</div>
          <div className="text-slate-200 font-bold">{objectCount} entities</div>
        </div>

        <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
          <div className="text-slate-500 uppercase text-[9px] mb-0.5">Created At</div>
          <div className="text-slate-400 truncate">{new Date(createdAt).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Receiver Verification Section (if available) */}
      {receiverVerification && (
        <div className="bg-slate-950/80 p-3 rounded-md border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Independent Receiver Verification Report</span>
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
              receiverVerification.verified ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {receiverVerification.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {receiverVerification.checks.map((check, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 bg-slate-900/60 rounded border border-slate-800/60 text-[11px]"
              >
                <span className="text-slate-300 truncate max-w-[180px]">{check.name}</span>
                <span className={`font-mono text-[10px] flex items-center gap-1 ${
                  check.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {check.status === 'PASSED' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  <span>{check.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Imported Passport Metadata (if populated via PGS) */}
      {importedPassport && (
        <div className="bg-slate-950/80 p-3 rounded-md border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-200 font-semibold">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Imported PGS Passport Metadata</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {importedPassport.meta.format} v{importedPassport.meta.version}
            </span>
          </div>
          <div className="text-slate-400 font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div>Generator: <span className="text-slate-200">{importedPassport.meta.generator}</span></div>
            <div>Transfer Mode: <span className="text-indigo-300">{importedPassport.meta.transferMode}</span></div>
            <div>Source Stand: <span className="text-slate-200">{importedPassport.sourceClaim.standId}</span></div>
            <div>Source Claim: <span className={importedPassport.sourceClaim.verified ? 'text-emerald-400' : 'text-rose-400'}>
              {importedPassport.sourceClaim.verified ? 'VERIFIED' : 'UNVERIFIED'}
            </span></div>
          </div>
        </div>
      )}

      {/* Identity Registry Table */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-slate-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <Fingerprint className="w-4 h-4 text-indigo-400" />
            <span>Portable Identity Registry (`identityRegistry`)</span>
          </span>
          <span className="text-slate-500 font-mono text-[10px]">
            {Object.keys(identityRegistry).length} Mappings
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto border border-slate-800 rounded bg-slate-950/60">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono">
                <th className="p-2">localId (Plane 2)</th>
                <th className="p-2">portableId (PGS)</th>
                <th className="p-2">Label</th>
                <th className="p-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {Object.values(identityRegistry).map((m) => (
                <tr key={m.localId} className="hover:bg-slate-900/40">
                  <td className="p-2 font-bold text-emerald-300">{m.localId}</td>
                  <td className="p-2 text-indigo-300 font-bold">{m.portableId}</td>
                  <td className="p-2 text-slate-200">{m.displayLabel || '-'}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                      m.source === 'imported' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
