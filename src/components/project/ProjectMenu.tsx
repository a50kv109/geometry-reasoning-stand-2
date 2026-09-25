// src/components/project/ProjectMenu.tsx
// UI control for Save, Load, Export, Import, and New Project
// Complies with "One Geometry, Many Clients" and "Deterministic Verification" invariants.

import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Save,
  FilePlus,
  Download,
  Upload,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FullGeometryState } from '../../engines/constructionCore';
import {
  createGeometryProject,
  serializeGeometryProject,
  deserializeGeometryProject,
  GeometryProjectSettings,
} from '../../engines/project';
import { useI18n } from '../../i18n';

interface ProjectMenuProps {
  geometryState: FullGeometryState;
  rotationDeg: number;
  scale: number;
  scaleMode: 'degrees' | 'radians' | 'fractions';
  standMode: 'research' | 'school';
  onLoadProjectState: (
    nextState: FullGeometryState,
    settings?: GeometryProjectSettings,
    projectName?: string
  ) => void;
  onNewProject: () => void;
}

export const ProjectMenu: React.FC<ProjectMenuProps> = ({
  geometryState,
  rotationDeg,
  scale,
  scaleMode,
  standMode,
  onLoadProjectState,
  onNewProject,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = () => {
    try {
      const project = createGeometryProject(geometryState, {
        name: 'Geometry Problem',
        settings: {
          rotationDeg,
          scale,
          scaleMode,
          clientModeHint: standMode,
        },
      });

      const jsonStr = serializeGeometryProject(project, { pretty: true });
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geometry-project-v2-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('success', t('header.projectSuccessSaved'));
      setIsOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showNotification('error', msg);
    }
  };

  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
    setIsOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') return;

      const result = deserializeGeometryProject(content);
      if (result.success === false) {
        const errDetails = result.errors.map((err) => err.message).join('; ');
        showNotification('error', `${t('common.error')}: ${errDetails}`);
        return;
      }

      onLoadProjectState(
        result.restoredState,
        result.project.settings,
        result.project.metadata.name
      );

      showNotification(
        'success',
        t('header.projectSuccessLoaded', { name: result.project.metadata.name })
      );
    };

    reader.onerror = () => {
      showNotification('error', 'Failed to read file from disk');
    };

    reader.readAsText(file);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Trigger Button */}
      <button
        id="projectMenuTriggerBtn"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-slate-300 shadow-2xs transition cursor-pointer"
        title={t('header.project')}
      >
        <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
        <span>{t('header.project')}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-1.5 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('header.project')} SSOT
            </p>
          </div>

          <button
            id="saveProjectBtn"
            onClick={handleSave}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <div>
              <div className="font-semibold">{t('header.projectSave')}</div>
              <div className="text-[10px] text-slate-400">JSON Project V1</div>
            </div>
          </button>

          <button
            id="openProjectBtn"
            onClick={handleOpenFilePicker}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <div>
              <div className="font-semibold">{t('header.projectLoad')}</div>
              <div className="text-[10px] text-slate-400">.json</div>
            </div>
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            id="newProjectBtn"
            onClick={() => {
              onNewProject();
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-900 flex items-center gap-2.5 transition cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-500" />
            <div>
              <div className="font-semibold">{t('header.projectNew')}</div>
              <div className="text-[10px] text-slate-400">{t('header.resetTooltip')}</div>
            </div>
          </button>
        </div>
      )}

      {/* Temporary Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 max-w-md px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium flex items-center gap-2.5 z-50 transition ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};
