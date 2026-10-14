import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, KeyRound, MonitorSmartphone, RefreshCw, ShieldCheck, Wifi, X } from 'lucide-react';
import type { ServerStatus } from '../types/workspace';
import { Native, isTauriEnvironment, type ConnectionInfo } from '../services/native';

interface QRPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ServerStatus | null;
}

const formatCode = (token: string) => (token.length === 8 ? `${token.slice(0, 4)}-${token.slice(4)}` : token);

export const QRPairingModal: React.FC<QRPairingModalProps> = ({ isOpen, onClose, status }) => {
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const isTauri = isTauriEnvironment();

  const load = useCallback(async () => setInfo(await Native.getConnectionInfo()), []);

  useEffect(() => {
    if (!isOpen) return;
    load();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, load, onClose]);

  // The port can change if 8080 was busy, so refresh once the server reports in.
  useEffect(() => {
    if (isOpen && status?.online) load();
  }, [isOpen, status?.online, status?.port, load]);

  if (!isOpen) return null;

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const resetPairing = async () => {
    const ok = await Native.confirm(
      'Create a new pairing code? Every phone paired with the current code is disconnected and must scan again.',
      'Reset pairing'
    );
    if (!ok) return;
    setResetting(true);
    await Native.regeneratePairingToken();
    await load();
    setResetting(false);
  };

  const host = info ? `${info.ip}:${status?.port ?? info.port}` : '…';
  const payload = info
    ? JSON.stringify({ scheme: 'inflow', host: info.ip, port: status?.port ?? info.port, token: info.token, version: 2 })
    : '';
  const clients = status?.connectedClients ?? 0;

  const statusLine = !isTauri
    ? { tone: 'text-ink-2', dot: 'bg-neutral-500', text: 'Pairing needs the desktop app' }
    : !status?.online
    ? { tone: 'text-red-300', dot: 'bg-red-500', text: status?.error || 'Starting deck server…' }
    : clients > 0
    ? { tone: 'text-emerald-300', dot: 'bg-emerald-400', text: `${clients} phone${clients === 1 ? '' : 's'} connected` }
    : { tone: 'text-amber-200', dot: 'bg-amber-400 animate-pulse', text: 'Waiting for your phone…' };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-[560px]" role="dialog" aria-modal="true" aria-labelledby="pair-title">
        <header className="flex items-center justify-between px-5 h-14 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <MonitorSmartphone className="w-3.5 h-3.5 text-brand-ink" />
            <h2 id="pair-title" className="text-base font-semibold">Pair your phone</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="p-5 grid grid-cols-[200px_1fr] gap-6 items-start">
          <div className="space-y-2">
            <div className="aspect-square rounded-2xl bg-white p-3 flex items-center justify-center shadow-[0_0_0_1px_rgb(255_255_255/0.1)]">
              {isTauri && info ? (
                <QRCodeSVG value={payload} size={176} level="M" />
              ) : (
                <div className="text-center text-micro text-neutral-500 px-3">
                  QR code appears in the desktop app
                </div>
              )}
            </div>
            <div className={`flex items-center justify-center gap-1.5 text-micro font-medium ${statusLine.tone}`} role="status">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusLine.dot}`} />
              <span className="truncate" title={statusLine.text}>{statusLine.text}</span>
            </div>
          </div>

          <div className="space-y-4">
            <ol className="space-y-2.5 text-ui text-ink-2">
              {[
                'Open InFlow Companion on your phone.',
                'Tap the scan button and point the camera at this code.',
                'Tap “Open Stream Deck” and press any key.',
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/[0.07] text-micro font-semibold text-ink flex items-center justify-center flex-shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="rounded-xl border border-line bg-black/20 divide-y divide-line">
              <CopyRow label="Address" value={host} mono copied={copied === 'host'} onCopy={() => copy('host', host)} />
              <CopyRow
                label="Pairing code"
                value={info ? formatCode(info.token) : '…'}
                mono
                copied={copied === 'code'}
                onCopy={() => info && copy('code', formatCode(info.token))}
              />
            </div>

            <ul className="space-y-1.5 text-micro text-ink-3">
              <li className="flex gap-2">
                <Wifi className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                Phone and PC must be on the same Wi-Fi network.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                Only devices with this code can see or press your keys.
              </li>
            </ul>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 px-5 h-14 border-t border-line flex-shrink-0 bg-black/20">
          <button type="button" onClick={resetPairing} disabled={!isTauri || resetting} className="btn btn-sm btn-ghost">
            {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Reset pairing code
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};

const CopyRow: React.FC<{ label: string; value: string; mono?: boolean; copied: boolean; onCopy: () => void }> = ({
  label,
  value,
  mono,
  copied,
  onCopy,
}) => (
  <div className="flex items-center justify-between gap-3 px-3 h-11">
    <span className="text-micro text-ink-3">{label}</span>
    <div className="flex items-center gap-1.5 min-w-0">
      <span className={`truncate select-all ${mono ? 'font-mono text-ui tracking-wide' : 'text-ui'}`}>{value}</span>
      <button type="button" onClick={onCopy} className="btn btn-sm btn-ghost btn-icon" aria-label={`Copy ${label}`}>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  </div>
);
