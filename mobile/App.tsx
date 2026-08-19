import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Zap,
  QrCode,
  Sliders,
  Play,
  Wifi,
  WifiOff,
  Radio,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type {
  DeckConfig,
  DeckSlot,
  ConnectionConfig,
  ConnectionState,
} from './src/types/deck';
import { ConnectionService } from './src/services/connection';
import { QRScannerModal } from './src/components/QRScannerModal';
import { SettingsModal } from './src/components/SettingsModal';
import { DeckScreen } from './src/components/DeckScreen';
import { GuideCarousel } from './src/components/GuideCarousel';
import { ThemeProvider, useTheme } from './src/utils/themeContext';

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

function MainApp() {
  const { theme } = useTheme();
  const [deckConfig, setDeckConfig] = useState<DeckConfig>(DEFAULT_CONFIG);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    host: '127.0.0.1',
    port: 8080,
    autoConnect: true,
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
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

  const isConnected = connectionState === 'connected';

  // If in Deck Mode (Forced Landscape View)
  if (isDeckOpen) {
    return (
      <DeckScreen
        deckConfig={deckConfig}
        activeWorkspaceId={activeWorkspaceId}
        isConnected={isConnected}
        onPressSlot={handlePressSlot}
        onCloseDeck={() => setIsDeckOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    );
  }

  // Home Screen (Portrait Mode)
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      <View style={styles.topbar}>
        {/* Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIconBox}>
            <Zap size={16} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.brandTitle}>InFlow Companion</Text>
            <Text style={styles.brandSubtitle}>Desktop Stream Deck</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setIsScannerOpen(true);
            }}
            style={styles.iconButton}
          >
            <QrCode size={17} color="#e4e4e7" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setIsSettingsOpen(true);
            }}
            style={styles.iconButton}
          >
            <Sliders size={17} color="#e4e4e7" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Status Hero Card */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.connectionCard,
              isConnected ? styles.connectionCardConnected : styles.connectionCardDisconnected,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.statusIndicatorGroup}>
                <View
                  style={[
                    styles.statusDotLarge,
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
                <Text style={styles.connectionStatusTitle}>
                  {connectionState === 'connected'
                    ? 'CONNECTED TO PC'
                    : connectionState === 'connecting'
                    ? 'CONNECTING TO PC...'
                    : 'NOT CONNECTED'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => ConnectionService.connect()}
                style={styles.retryBtn}
              >
                {isConnected ? (
                  <Wifi size={14} color="#34d399" />
                ) : (
                  <WifiOff size={14} color="#f87171" />
                )}
                <Text style={styles.retryBtnText}>
                  {isConnected ? 'Active' : 'Reconnect'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.endpointText}>
              Host Endpoint: <Text style={styles.hostHighlight}>{connectionConfig.host}:{connectionConfig.port}</Text>
            </Text>

            {/* Prominent Dedicated Open Deck Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
                setIsDeckOpen(true);
              }}
              activeOpacity={0.88}
              style={[
                styles.openDeckButton,
                isConnected ? styles.openDeckButtonActive : styles.openDeckButtonDisabled,
              ]}
            >
              <View style={styles.openDeckBtnContent}>
                <View style={styles.openDeckIconCircle}>
                  <Smartphone size={20} color="#ffffff" />
                </View>
                <View style={styles.openDeckTextCol}>
                  <Text style={styles.openDeckTitle}>Open Stream Deck</Text>
                  <Text style={styles.openDeckSub}>
                    {isConnected
                      ? 'Launch landscape console with instant sync'
                      : 'Connect to desktop or preview deck layout'}
                  </Text>
                </View>
              </View>
              <View style={styles.launchIconBox}>
                <Play size={16} color="#ffffff" fill="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature & Connection Guide Carousel */}
        <GuideCarousel onScanPress={() => setIsScannerOpen(true)} />

        {/* Quick Diagnostics & Info */}
        <View style={styles.infoSection}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Layers size={16} color="#818cf8" />
              <Text style={styles.statNumber}>
                {deckConfig.pages.length} Pages
              </Text>
              <Text style={styles.statLabel}>Configured Layouts</Text>
            </View>

            <View style={styles.statBox}>
              <Sparkles size={16} color="#34d399" />
              <Text style={styles.statNumber}>
                {deckConfig.gridDimension} Grid
              </Text>
              <Text style={styles.statLabel}>Landscape Fit</Text>
            </View>
          </View>
        </View>
      </ScrollView>

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

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#101014',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  connectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    backgroundColor: '#121216',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  connectionCardConnected: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  connectionCardDisconnected: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusIndicatorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionStatusTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a1a1aa',
    letterSpacing: 0.6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 10.5,
    color: '#e4e4e7',
    fontWeight: '600',
  },
  endpointText: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 16,
  },
  hostHighlight: {
    color: '#ffffff',
    fontWeight: '600',
  },
  openDeckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
  },
  openDeckButtonActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  openDeckButtonDisabled: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  openDeckBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  openDeckIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openDeckTextCol: {
    flex: 1,
  },
  openDeckTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  openDeckSub: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  launchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  infoSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#121216',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
});
