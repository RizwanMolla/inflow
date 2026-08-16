import React from 'react';
import {
  X,
  Sparkles,
  Plus,
  ArrowRight,
  Globe,
  Folder,
  FileText,
  Terminal,
} from 'lucide-react';
import type { Workspace } from '../types/workspace';
import { PRESET_TEMPLATES } from '../data/defaults';
import { renderWorkspaceIcon, getAccentConfig } from '../utils/theme';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Workspace) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Workspace Templates</h2>
              <p className="text-xs text-slate-400">
                Choose a pre-configured workflow to get up and running in seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[68vh] overflow-y-auto">
          {PRESET_TEMPLATES.map((tpl) => {
            const accent = getAccentConfig(tpl.accentColor);
            return (
              <div
                key={tpl.id}
                className="group relative rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/90 p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-xl border border-white/5 ${accent.bgGlow}`}>
                        {renderWorkspaceIcon(tpl.icon, 'w-5 h-5')}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {tpl.name}
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {tpl.actions.length} curated actions
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {tpl.description}
                  </p>

                  {/* Actions Preview in Template */}
                  <div className="space-y-1.5 mb-4">
                    {tpl.actions.map((act, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {act.type === 'url' && <Globe className="w-3 h-3 text-sky-400 shrink-0" />}
                          {act.type === 'folder' && <Folder className="w-3 h-3 text-amber-400 shrink-0" />}
                          {act.type === 'file' && <FileText className="w-3 h-3 text-emerald-400 shrink-0" />}
                          {act.type === 'app' && <Terminal className="w-3 h-3 text-purple-400 shrink-0" />}
                          <span className="text-slate-300 truncate font-medium">{act.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase shrink-0">
                          {act.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(tpl)}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 transform active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Use This Template</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
