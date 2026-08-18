import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Smartphone,
  Wifi,
  Copy,
  Check,
  Radio,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import type { ServerStatus } from '../types/workspace';

interface QRPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRPairingModal: React.FC<QRPairingModalProps> = ({ isOpen, onClose }) => {
  const [ip, setIp] = useState('127.0.0.1');
  const [port, setPort] = useState(8080);
  const [mdnsService, setMdnsService] = useState('_inflow._tcp');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadConnectionData();
      const interval = setInterval(checkStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadConnectionData = async () => {
    setLoading(true);
    try {
      const info = await StorageService.getServerConnectionInfo();
      setIp(info.ip);
      setPort(info.port);
      setMdnsService(info.mdnsService);
      await checkStatus();
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    const status = await StorageService.getServerStatus();
    setServerStatus(status);
  };

  if (!isOpen) return null;

  const pairingPayload = JSON.stringify({
    scheme: 'inflow',
    host: ip,
    port: port,
    mdns: mdnsService,
    version: '1.0.0',
    timestamp: Date.now(),
  });

  const connectionUri = `inflow://${ip}:${port}`;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(connectionUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#161618] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-neutral-200 font-sans flex flex-col">
        {/* Header Glow */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-indigo-500" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Mobile Deck QR Pairing</h2>
              <p className="text-[11px] text-neutral-400 font-mono">Connect InFlow Mobile Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center space-y-4">
          {/* Server Status Pill */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900/90 border border-white/10 text-xs">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">Server Live (Port {port})</span>
            </div>
            <div className="flex items-center space-x-1.5 text-neutral-400 font-mono text-[11px]">
              <Radio className="w-3 h-3 text-indigo-400" />
              <span>{serverStatus?.connectedClients || 0} Connected</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-3.5 bg-white rounded-xl shadow-inner flex flex-col items-center justify-center border-2 border-white/20">
            <QRCodeSVG
              value={pairingPayload}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Quick Guidance Instructions */}
          <div className="w-full space-y-2 text-xs">
            <div className="flex items-start space-x-2 text-neutral-300">
              <Wifi className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-tight">
                Ensure both PC and phone are connected to the same local Wi-Fi network.
              </p>
            </div>
            <div className="flex items-start space-x-2 text-neutral-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-tight">
                Auto-Discovery (mDNS <code className="text-white/80 font-mono">_inflow._tcp</code>) is enabled automatically.
              </p>
            </div>
          </div>

          {/* Manual Connection Info */}
          <div className="w-full bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">Manual Host URI</span>
            <div className="flex items-center justify-between bg-neutral-900 border border-white/5 rounded-lg px-2.5 py-1.5 font-mono text-xs">
              <span className="text-neutral-200 select-all truncate">{connectionUri}</span>
              <button
                onClick={handleCopyUri}
                className="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white rounded text-[11px] flex items-center space-x-1 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-900/60 border-t border-white/[0.08] flex items-center justify-between text-xs text-neutral-400">
          <button
            onClick={loadConnectionData}
            disabled={loading}
            className="flex items-center space-x-1 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh IP</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
