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
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-lg p-5 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-2.5">
          {report.isComplete ? (
            report.failedActions === 0 ? (
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
            )
          ) : (
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-white">{report.workspaceName}</h4>
            <p className="text-[11px] text-slate-400">
              {report.isComplete
                ? `Finished in ${((report.endTime! - report.startTime) / 1000).toFixed(1)}s (${report.succeededActions}/${report.totalActions} executed)`
                : 'Executing action sequence...'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Progress List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {report.progressList.map((item, idx) => {
          const meta = getActionTypeMeta(item.type);
          const Icon = meta.icon;

          return (
            <div
              key={item.actionId || idx}
              className="p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <div className="shrink-0">
                  {item.status === 'running' && (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  {item.status === 'pending' && (
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>

                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-200 font-medium truncate">{item.label}</span>
              </div>

              <div className="text-[10px] font-mono text-slate-500 truncate max-w-[130px] ml-2">
                {item.status === 'error' ? (
                  <span className="text-red-400">{item.error || 'Failed'}</span>
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
