import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Zap,
  Layers,
  QrCode,
  Sliders,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type {
  DeckConfig,
  DeckSlot,
  ConnectionConfig,
  ConnectionState,
} from './src/types/deck';
import { ConnectionService } from './src/services/connection';
import { DeckGrid } from './src/components/DeckGrid';
import { QRScannerModal } from './src/components/QRScannerModal';
import { SettingsModal } from './src/components/SettingsModal';

const DEFAULT_CONFIG: DeckConfig = {
  version: 1,
  gridDimension: '2x3',
  activePageId: 'workspaces',
  pages: [
    {
      id: 'workspaces',
      title: 'Workspaces',
      slots: Array.from({ length: 6 }).map((_, i) => ({
        id: `slot-ws-${i}`,
        type: 'empty',
        label: 'Empty Slot',
        icon: 'Plus',
      })),
    },
    {
      id: 'quick_actions',
      title: 'Quick Actions',
      slots: Array.from({ length: 6 }).map((_, i) => ({
        id: `slot-act-${i}`,
        type: 'empty',
        label: 'Empty Slot',
        icon: 'Plus',
      })),
    },
  ],
  updatedAt: new Date().toISOString(),
};

export default function App() {
  const [deckConfig, setDeckConfig] = useState<DeckConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'quick_actions'>('workspaces');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    host: '127.0.0.1',
    port: 8080,
    autoConnect: true,
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dockModeEnabled, setDockModeEnabled] = useState(true);

  // Keep screen awake for desk dock mode
  if (dockModeEnabled) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKeepAwake();
  }

  useEffect(() => {
    // 1. Load saved config & cached deck
    ConnectionService.loadConfig().then((cfg) => {
      setConnectionConfig(cfg);
      ConnectionService.connect();
    });

    ConnectionService.getCachedDeckConfig().then((cached) => {
      if (cached && cached.pages) {
        setDeckConfig(cached);
      }
    });

    // 2. Register live listeners
    const unlistenDeck = ConnectionService.onDeckUpdate((newConfig) => {
      setDeckConfig(newConfig);
    });

    const unlistenActive = ConnectionService.onActiveStateChange((activeId) => {
      setActiveWorkspaceId(activeId);
    });

    const unlistenConn = ConnectionService.onConnectionStateChange((state) => {
      setConnectionState(state);
    });

    return () => {
      unlistenDeck();
      unlistenActive();
      unlistenConn();
      ConnectionService.disconnect();
    };
  }, []);

  const handleSaveConnectionConfig = async (newCfg: ConnectionConfig) => {
    setConnectionConfig(newCfg);
    await ConnectionService.saveConfig(newCfg);
    ConnectionService.disconnect();
    ConnectionService.connect();
  };

  const handleQRScanned = async (scannedData: string) => {
    const parsed = ConnectionService.parsePairingPayload(scannedData);
    if (parsed) {
      const updated: ConnectionConfig = {
        host: parsed.host,
        port: parsed.port,
        autoConnect: true,
      };
      await handleSaveConnectionConfig(updated);
    }
  };

  const handlePressSlot = async (slot: DeckSlot) => {
    if (slot.type === 'empty' || !slot.targetId) return;

    if (slot.type === 'workspace') {
      await ConnectionService.triggerLaunch(slot.targetId);
    } else if (slot.type === 'quick_action') {
      const parentWsId = slot.targetWorkspaceId || slot.targetId;
      await ConnectionService.triggerLaunch(parentWsId, slot.targetId);
    }
  };

  const activePage =
    deckConfig.pages.find((p) => p.id === activeTab) || deckConfig.pages[0];

  const isConnected = connectionState === 'connected';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      {/* Top Header Bar */}
      <View style={styles.topbar}>
        {/* Brand & Connection Pill */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIconBox}>
            <Zap size={16} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.brandTitle}>InFlow Mobile</Text>
            {/* Live Connection Pill */}
            <TouchableOpacity
              onPress={() => ConnectionService.connect()}
              style={styles.statusPill}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      connectionState === 'connected'
                        ? '#10b981'
                        : connectionState === 'connecting'
                        ? '#f59e0b'
                        : '#ef4444',
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {connectionState === 'connected'
                  ? `Connected (${connectionConfig.host})`
                  : connectionState === 'connecting'
                  ? 'Connecting...'
                  : 'Tap to Reconnect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => setIsScannerOpen(true)}
            style={styles.iconButton}
          >
            <QrCode size={18} color="#e4e4e7" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsSettingsOpen(true)}
            style={styles.iconButton}
          >
            <Sliders size={18} color="#e4e4e7" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab('workspaces');
          }}
          style={[styles.tabBtn, activeTab === 'workspaces' && styles.tabBtnActive]}
        >
          <Layers
            size={14}
            color={activeTab === 'workspaces' ? '#ef4444' : '#71717a'}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'workspaces' && styles.tabBtnTextActive,
            ]}
          >
            Workspaces
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setActiveTab('quick_actions');
          }}
          style={[styles.tabBtn, activeTab === 'quick_actions' && styles.tabBtnActive]}
        >
          <Zap
            size={14}
            color={activeTab === 'quick_actions' ? '#ef4444' : '#71717a'}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'quick_actions' && styles.tabBtnTextActive,
            ]}
          >
            Quick Actions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Touch Grid Deck Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DeckGrid
          slots={activePage.slots}
          gridDimension={deckConfig.gridDimension}
          activeWorkspaceId={activeWorkspaceId}
          onPressSlot={handlePressSlot}
        />
      </ScrollView>

      {/* Bottom Stream Deck Footer Cue */}
      <View style={styles.footerBar}>
        <Text style={styles.footerHint}>
          {isConnected
            ? '⚡ Tap any key to trigger launch sequence on PC'
            : '⚠️ PC Disconnected — Scan QR to Pair'}
        </Text>
      </View>

      {/* Modals */}
      <QRScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScanned}
      />

      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={connectionConfig}
        onSaveConfig={handleSaveConnectionConfig}
        dockModeEnabled={dockModeEnabled}
        onToggleDockMode={setDockModeEnabled}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d0d0f',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#121214',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9.5,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#141416',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#ef4444',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBar: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#121214',
  },
  footerHint: {
    fontSize: 10.5,
    color: '#71717a',
    fontWeight: '500',
  },
});
