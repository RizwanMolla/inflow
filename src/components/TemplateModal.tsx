import React, { useEffect } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import type { Workspace } from '../types/workspace';
import { PRESET_TEMPLATES } from '../data/defaults';
import { accentStyle, describeAction, getActionTypeMeta, renderWorkspaceIcon } from '../utils/theme';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Workspace) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onSelectTemplate }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-3xl" role="dialog" aria-modal="true" aria-labelledby="tpl-title">
        <header className="flex items-center justify-between px-5 h-14 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-ink" />
            <div>
              <h2 id="tpl-title" className="text-base font-semibold leading-tight">Templates</h2>
              <p className="text-micro text-ink-3">Start from a ready-made workspace and adjust it to your setup.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_TEMPLATES.map((tpl) => (
            <article
              key={tpl.id}
              className="group flex flex-col rounded-2xl border border-line bg-white/[0.02] hover:border-line-strong hover:bg-white/[0.035] p-4 transition-colors"
              style={accentStyle(tpl.accentColor)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/[0.08] text-[color-mix(in_oklab,var(--accent)_75%,white)] bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]">
                  {renderWorkspaceIcon(tpl.icon, 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{tpl.name}</h3>
                  <p className="text-ui text-ink-2 line-clamp-2">{tpl.description}</p>
                </div>
              </div>

              <ol className="flex-1 space-y-1 mb-3">
                {tpl.actions.map((act) => {
                  const meta = getActionTypeMeta(act.type);
                  return (
                    <li key={act.id} className="flex items-center gap-2 text-ui">
                      <meta.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.hex }} />
                      <span className="truncate">{act.label}</span>
                      <span className="ml-auto text-micro text-ink-3 font-mono truncate max-w-[45%]">{describeAction(act)}</span>
                    </li>
                  );
                })}
              </ol>

              <button type="button" onClick={() => onSelectTemplate(tpl)} className="btn btn-secondary w-full group-hover:border-white/20">
                <Plus className="w-3.5 h-3.5" />
                Add to my workspaces
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
