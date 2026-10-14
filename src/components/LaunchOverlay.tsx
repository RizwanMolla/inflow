import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Circle, Loader2, X } from 'lucide-react';
import type { LaunchReport } from '../types/workspace';
import { describeAction, getActionTypeMeta } from '../utils/theme';

interface LaunchOverlayProps {
  report: LaunchReport | null;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 4500;

export const LaunchOverlay: React.FC<LaunchOverlayProps> = ({ report, onClose }) => {
  const allGood = !!report?.isComplete && report.failedActions === 0;

  // Clean runs dismiss themselves; failures stay until read.
  useEffect(() => {
    if (!allGood) return;
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [allGood, report?.endTime, onClose]);

  if (!report) return null;

  const done = report.progressList.filter((p) => p.status === 'success' || p.status === 'error').length;
  const pct = report.totalActions ? Math.round((done / report.totalActions) * 100) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 w-[360px] rounded-2xl bg-[#1a1a1d]/95 border border-line-strong shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl overflow-hidden animate-slide-up"
    >
      <div className="h-0.5 bg-white/5">
        <div
          className={`h-full transition-[width] duration-300 ${report.failedActions ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {!report.isComplete ? (
            <Loader2 className="w-3.5 h-3.5 text-brand-ink animate-spin flex-shrink-0" />
          ) : allGood ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h4 className="text-ui font-semibold truncate">{report.workspaceName}</h4>
            <p className="text-micro text-ink-3 tabular-nums">
              {report.isComplete
                ? `${report.succeededActions} of ${report.totalActions} steps · ${(((report.endTime ?? Date.now()) - report.startTime) / 1000).toFixed(1)}s`
                : `Running step ${Math.min(done + 1, report.totalActions)} of ${report.totalActions}`}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="btn btn-sm btn-ghost btn-icon" aria-label="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ol className="max-h-52 overflow-y-auto px-2 pb-2 space-y-0.5">
        {report.progressList.map((item, idx) => {
          const meta = getActionTypeMeta(item.type);
          return (
            <li key={item.actionId || idx} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
              <span className="flex-shrink-0">
                {item.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-brand-ink animate-spin" />}
                {item.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {item.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                {item.status === 'pending' && <Circle className="w-3.5 h-3.5 text-ink-3" />}
              </span>
              <meta.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.hex }} />
              <div className="flex-1 min-w-0">
                <div className={`text-ui truncate ${item.status === 'pending' ? 'text-ink-3' : 'text-ink'}`}>{item.label}</div>
                {item.status === 'error' ? (
                  <div className="text-micro text-red-300 truncate" title={item.error}>
                    {item.error || 'Failed'}
                  </div>
                ) : (
                  <div className="text-micro text-ink-3 font-mono truncate">
                    {describeAction({ id: item.actionId, type: item.type, label: item.label, target: item.target })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
