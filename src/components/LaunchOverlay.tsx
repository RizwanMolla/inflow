import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import type { LaunchReport } from '../types/workspace';
import { getActionTypeMeta } from '../utils/theme';

interface LaunchOverlayProps {
  report: LaunchReport | null;
  onClose: () => void;
}

export const LaunchOverlay: React.FC<LaunchOverlayProps> = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-[#1e1e20]/80 border border-white/10 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-3 overflow-hidden animate-slide-up text-neutral-200 font-sans">
      {/* HUD Panel Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
        <div className="flex items-center space-x-2">
          {report.isComplete ? (
            report.failedActions === 0 ? (
              <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="p-1 bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            )
          ) : (
            <div className="p-1 bg-red-500/20 text-red-400 rounded-md border border-red-500/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-white tracking-tight">{report.workspaceName}</h4>
            <p className="text-[10px] text-neutral-400 font-mono">
              {report.isComplete
                ? `${((report.endTime! - report.startTime) / 1000).toFixed(1)}s • ${report.succeededActions}/${report.totalActions} done`
                : 'Executing workflow...'}
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

      {/* High-Density Action Progress Rows */}
      <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
        {report.progressList.map((item, idx) => {
          const meta = getActionTypeMeta(item.type);
          const Icon = meta.icon;

          return (
            <div
              key={item.actionId || idx}
              className="p-1.5 bg-black/40 border border-white/5 rounded-md flex items-center justify-between text-xs transition-colors hover:border-white/10"
            >
              <div className="flex items-center space-x-2 truncate min-w-0">
                <div className="shrink-0">
                  {item.status === 'running' && (
                    <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  )}
                  {item.status === 'pending' && (
                    <Clock className="w-3 h-3 text-neutral-500" />
                  )}
                </div>

                <Icon className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="text-neutral-200 text-[11px] font-medium truncate">{item.label}</span>
              </div>

              <div className="text-[10px] font-mono text-neutral-400 truncate max-w-[110px] ml-2 shrink-0">
                {item.status === 'error' ? (
                  <span className="text-red-400 font-sans">{item.error || 'Failed'}</span>
                ) : (
                  item.target
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};