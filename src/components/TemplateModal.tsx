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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-[#1e1e20]/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden my-8 flex flex-col text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-red-500/20 text-red-400 rounded-md border border-red-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-white tracking-tight">Workspace Templates</h2>
              <p className="text-[10px] text-neutral-400">
                Choose a pre-configured workflow to get up and running in seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {PRESET_TEMPLATES.map((tpl) => {
            const accent = getAccentConfig(tpl.accentColor);
            return (
              <div
                key={tpl.id}
                className="group relative rounded-lg bg-black/40 border border-white/5 hover:border-white/20 p-3 flex flex-col justify-between transition-all duration-150"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-md border border-white/10 ${accent.bgGlow}`}>
                        {renderWorkspaceIcon(tpl.icon, 'w-3.5 h-3.5')}
                      </div>
                      <div>
                        <h3 className="text-xs font-medium text-white group-hover:text-red-400 transition-colors">
                          {tpl.name}
                        </h3>
                        <span className="text-[9px] text-neutral-400 font-mono">
                          {tpl.actions.length} curated actions
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-normal mb-2.5">
                    {tpl.description}
                  </p>

                  {/* Actions Preview in Template */}
                  <div className="space-y-1 mb-2.5">
                    {tpl.actions.map((act, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 bg-white/5 border border-white/5 rounded-md flex items-center justify-between text-[10px]"
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          {act.type === 'url' && <Globe className="w-3 h-3 text-sky-400 shrink-0" />}
                          {act.type === 'folder' && <Folder className="w-3 h-3 text-amber-400 shrink-0" />}
                          {act.type === 'file' && <FileText className="w-3 h-3 text-emerald-400 shrink-0" />}
                          {act.type === 'app' && <Terminal className="w-3 h-3 text-purple-400 shrink-0" />}
                          <span className="text-neutral-300 truncate font-mono text-[10px]">{act.label}</span>
                        </div>
                        <span className="text-[8px] text-neutral-400 font-mono uppercase shrink-0 ml-1">
                          {act.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(tpl)}
                  className="w-full mt-1 py-1 px-2.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center space-x-1 shadow-sm active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Use Template</span>
                  <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};