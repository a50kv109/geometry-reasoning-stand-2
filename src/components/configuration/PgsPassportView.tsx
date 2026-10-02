// src/components/configuration/PgsPassportView.tsx
// UI View Component for PGS-2D Passport Inter-Stand Contract
// Complies with Dual Passport architecture, sourceClaim vs receiverVerification, and Transactional Import rules

import React, { useState, useMemo } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Layers,
  Code2,
  CheckCircle2,
  XCircle,
  FileCode2,
} from 'lucide-react';
import { FullGeometryState } from '../../engines/constructionCore';
import {
  projectStateToPgsPassport,
  verifyPgsPassportAsReceiver,
  encodePgsPassportToJson,
  importPgsPassport,
  PGSImportResult,
} from '../../engines/pgs';

interface PgsPassportViewProps {
  geometryState: FullGeometryState;
  onStateUpdate: (newState: FullGeometryState) => void;
}

export const PgsPassportView: React.FC<PgsPassportViewProps> = ({
  geometryState,
  onStateUpdate,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'json' | 'verification'>('overview');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string; details?: string[] } | null>(null);

  // Live projection computed on-demand from SSOT
  const livePassport = useMemo(() => {
    return projectStateToPgsPassport(geometryState, {
      standId: 'geometry-reasoning-stand-2',
      comment: 'Live projection from Triangle Stand FullGeometryState',
    });
  }, [geometryState]);

  // Independent Receiver Verification computed on-demand
  const liveReceiverVerification = useMemo(() => {
    return verifyPgsPassportAsReceiver(livePassport);
  }, [livePassport]);

  const jsonString = useMemo(() => {
    return encodePgsPassportToJson(livePassport, 2);
  }, [livePassport]);

  const handleExport = () => {
    const filename = `triangle-stand-pgs-passport-${Date.now()}.pgs.json`;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const result: PGSImportResult = importPgsPassport(content);

      if (result.success && result.geometryState) {
        onStateUpdate(result.geometryState);
        setImportStatus({
          type: 'success',
          message: 'PGS-2D Passport imported successfully and verified by receiver.',
        });
      } else {
        setImportStatus({
          type: 'error',
          message: result.error || 'Failed to import PGS-2D Passport',
          details: result.details,
        });
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              PGS-2D Inter-Stand Contract
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                v0.1 (EXACT_STATE)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Portable Geometric State 2D — Stand-Agnostic Interoperability Layer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-300" />
            Import .pgs.json
            <input type="file" accept=".json,.pgs.json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PGS Passport
          </button>
        </div>
      </div>

      {/* Import Status Notification */}
      {importStatus && (
        <div
          className={`p-3 rounded-lg border text-xs flex flex-col gap-1 ${
            importStatus.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              {importStatus.message}
            </span>
            <button onClick={() => setImportStatus(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          {importStatus.details && importStatus.details.length > 0 && (
            <ul className="list-disc list-inside mt-1 font-mono text-[11px] text-slate-300 space-y-0.5">
              {importStatus.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Source Claim vs Receiver Verification Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Source Claim */}
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Source Claim (Exporting Stand)
            </div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
              Verified: {livePassport.sourceClaim.verified ? 'YES' : 'NO'}
              <span className="text-xs font-normal text-slate-400">({livePassport.sourceClaim.standId})</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {livePassport.sourceClaim.comment}
            </div>
          </div>
        </div>

        {/* Receiver Verification */}
        <div className={`p-3 bg-slate-950/80 rounded-lg border flex items-start gap-2.5 ${
          liveReceiverVerification.verified ? 'border-emerald-800/80' : 'border-rose-800/80'
        }`}>
          {liveReceiverVerification.verified ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Receiver Verification (Independent Check)
            </div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
              Status: <span className={liveReceiverVerification.verified ? 'text-emerald-400' : 'text-rose-400'}>
                {liveReceiverVerification.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Passed {liveReceiverVerification.checks.filter(c => c.status === 'PASSED').length} of {liveReceiverVerification.checks.length} independent checks
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'overview'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Objects & Topology
        </button>
        <button
          onClick={() => setActiveSubTab('verification')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'verification'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Verification Audit
        </button>
        <button
          onClick={() => setActiveSubTab('json')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'json'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Canonical JSON
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'overview' && (
        <div className="flex flex-col gap-3">
          {/* Objects Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Portable ID</th>
                  <th className="p-2.5">Local ID</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Label</th>
                  <th className="p-2.5">Properties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {livePassport.objects.map((obj) => (
                  <tr key={obj.portableId} className="hover:bg-slate-900/50">
                    <td className="p-2.5 font-bold text-indigo-300">{obj.portableId}</td>
                    <td className="p-2.5 text-slate-400">{obj.localId || '-'}</td>
                    <td className="p-2.5 text-slate-200">{obj.type}</td>
                    <td className="p-2.5 text-slate-300">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-sans font-semibold ${
                        'role' in obj && (obj.role === 'vertex' || obj.role === 'boundary_edge' || obj.role === 'circumcircle')
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {'role' in obj ? obj.role : 'polygon'}
                      </span>
                    </td>
                    <td className="p-2.5 font-sans font-bold text-white">{obj.displayLabel || '-'}</td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {obj.type === 'Point2D' && `(${obj.x.toFixed(1)}, ${obj.y.toFixed(1)})`}
                      {obj.type === 'Segment2D' && `L=${obj.length?.toFixed(1)} mm [${obj.p1Id}→${obj.p2Id}]`}
                      {obj.type === 'Polygon' && `${obj.vertexCount}-gon [${obj.vertexIds.join(', ')}]`}
                      {obj.type === 'Circle2D' && `R=${obj.radius.toFixed(1)} mm (Center: ${obj.centerId})`}
                      {obj.type === 'Line2D' && `[${obj.p1Id}↔${obj.p2Id}]`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Measurements & Relations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Measurements Passport
              </h4>
              <div className="space-y-1 font-mono text-xs">
                {livePassport.measurements.map((m) => (
                  <div key={m.id} className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-400">{m.id}:</span>
                    <span className="text-indigo-300 font-bold">
                      {m.value.toFixed(2)} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Semantic Relations
              </h4>
              <div className="space-y-1 text-xs">
                {livePassport.relations.map((r) => (
                  <div key={r.id} className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <span className="font-bold text-indigo-400 uppercase text-[10px] block">{r.type}</span>
                    <span className="text-slate-300 text-[11px]">{r.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'verification' && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Receiver Verification Report
          </h4>
          <div className="space-y-2 text-xs font-mono">
            {liveReceiverVerification.checks.map((check, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  {check.status === 'PASSED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-white">{check.name}</span>
                    {check.message && (
                      <span className="block text-[11px] text-slate-400 font-sans">{check.message}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    check.status === 'PASSED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'json' && (
        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 shadow transition-colors z-10"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto max-h-[400px]">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
};
