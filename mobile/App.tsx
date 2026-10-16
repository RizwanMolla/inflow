import React, { useState, useEffect, useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Per-weight imports: the package index would bundle all 18 weights of each family.
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { Play, QrCode, RefreshCw, Settings2, Zap } from 'lucide-react-native';

import type { DeckConfig, DeckSlot, ConnectionConfig, ConnectionState } from './src/types/deck';
import { ConnectionService } from './src/services/connection';
import { Haptics } from './src/services/haptics';
import { QRScannerModal } from './src/components/QRScannerModal';
import { SettingsModal } from './src/components/SettingsModal';
import { DeckScreen } from './src/components/DeckScreen';
import { DeckGrid, type KeyResult } from './src/components/DeckGrid';
import { parseGrid } from './src/utils/grid';
import { GuideCarousel } from './src/components/GuideCarousel';
import { ThemeProvider } from './src/utils/themeContext';
import { AppText, Button, IconButton, Panel, StatusPill, type StatusTone } from './src/ui/primitives';
import { colors } from './src/ui/tokens';

// Keep the splash screen up until Geist has loaded, so text never flashes in the system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

const RESULT_FLASH_MS = 1600;
const DOCK_MODE_KEY = 'inflow_mobile_dock_mode_v1';
const KEEP_AWAKE_TAG = 'inflow-deck';

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
        label: '',
        icon: 'Plus',
      })),
    },
  ],
  updatedAt: new Date().toISOString(),
};

const STATUS: Record<ConnectionState, { tone: StatusTone; pill: string; title: string; body: string }> = {
  connected: {
    tone: 'live',
    pill: 'Connected',
    title: 'Ready when you are',
    body: 'Your deck is live. Keys run on your PC the moment you press them.',
  },
  connecting: {
    tone: 'idle',
    pill: 'Connecting…',
    title: 'Connecting to your PC',
    body: 'Looking for InFlow on your Wi-Fi network.',
  },
  unpaired: {
    tone: 'warning',
    pill: 'Pairing required',
    title: 'Pair with your PC',
    body: 'Your PC issued a new pairing code. Click “Pair phone” in InFlow on the PC and scan it again.',
  },
  disconnected: {
    tone: 'offline',
    pill: 'Offline',
    title: 'PC not reachable',
    body: 'Make sure InFlow is running on your PC and both devices are on the same Wi-Fi.',
  },
  error: {
    tone: 'offline',
    pill: 'Offline',
    title: 'PC not reachable',
    body: 'Make sure InFlow is running on your PC and both devices are on the same Wi-Fi.',
  },
};

function MainApp() {
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
  const [keyResults, setKeyResults] = useState<Record<string, KeyResult>>({});

  const flashResult = useCallback((slotId: string, success: boolean) => {
    const at = Date.now();
    setKeyResults((r) => ({ ...r, [slotId]: { success, at } }));
    setTimeout(() => {
      setKeyResults((r) => {
        if (r[slotId]?.at !== at) return r;
        const { [slotId]: _done, ...rest } = r;
        return rest;
      });
    }, RESULT_FLASH_MS);
    if (success) Haptics.success();
    else Haptics.error();
  }, []);

  // Desk-dock mode: keep the screen on while the phone sits next to the monitor.
  useEffect(() => {
    if (!dockModeEnabled) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [dockModeEnabled]);

  useEffect(() => {
    AsyncStorage.getItem(DOCK_MODE_KEY).then((saved) => {
      if (saved !== null) setDockModeEnabled(saved === 'true');
    });

    ConnectionService.loadConfig().then((cfg) => {
      setConnectionConfig(cfg);
      ConnectionService.connect();
    });

    ConnectionService.getCachedDeckConfig().then((cached) => {
      if (cached?.pages) setDeckConfig(cached);
    });

    const unlistenDeck = ConnectionService.onDeckUpdate(setDeckConfig);
    const unlistenActive = ConnectionService.onActiveStateChange(setActiveWorkspaceId);
    const unlistenConn = ConnectionService.onConnectionStateChange(setConnectionState);
    // The PC reports back once a key has finished running so the key can flash green or red.
    const unlistenResult = ConnectionService.onLaunchResult((result) => {
      if (result.slotId) flashResult(result.slotId, result.success);
    });

    return () => {
      unlistenDeck();
      unlistenActive();
      unlistenConn();
      unlistenResult();
      ConnectionService.disconnect();
    };
  }, [flashResult]);

  const handleToggleDockMode = (enabled: boolean) => {
    setDockModeEnabled(enabled);
    AsyncStorage.setItem(DOCK_MODE_KEY, String(enabled)).catch(() => {});
  };

  const handleSaveConnectionConfig = async (newCfg: ConnectionConfig) => {
    setConnectionConfig(newCfg);
    await ConnectionService.saveConfig(newCfg);
    ConnectionService.disconnect();
    ConnectionService.connect();
  };

  const handleQRScanned = async (scannedData: string) => {
    const parsed = ConnectionService.parsePairingPayload(scannedData);
    if (!parsed) {
      Haptics.error();
      return;
    }
    await handleSaveConnectionConfig({ host: parsed.host, port: parsed.port, autoConnect: true, token: parsed.token });
  };

  const handleTriggerSlot = async (slot: DeckSlot, pageId: string) => {
    const res = await ConnectionService.triggerKey(slot, pageId);
    // Delivery failures never reach the PC, so flash them here; run results come back via LAUNCH_RESULT.
    if (!res.success) flashResult(slot.id, false);
  };

  const isConnected = connectionState === 'connected';
  const status = STATUS[connectionState];
  const topPages = deckConfig.pages.filter((p) => !p.parentId);
  const firstPage = topPages[0] ?? deckConfig.pages[0];
  const { rows, cols } = parseGrid(deckConfig.gridDimension);

  const modals = (
    <>
      <QRScannerModal visible={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleQRScanned} />
      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={connectionConfig}
        onSaveConfig={handleSaveConnectionConfig}
        dockModeEnabled={dockModeEnabled}
        onToggleDockMode={handleToggleDockMode}
      />
    </>
  );

  // Deck mode (forced landscape). Modals render here too so Settings works from the deck menu.
  if (isDeckOpen) {
    return (
      <>
        <DeckScreen
          deckConfig={deckConfig}
          activeWorkspaceId={activeWorkspaceId}
          isConnected={isConnected}
          results={keyResults}
          onTriggerSlot={handleTriggerSlot}
          onCloseDeck={() => setIsDeckOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        {modals}
      </>
    );
  }

  const openDeck = () => setIsDeckOpen(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.brand}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <View>
            <AppText variant="base" style={styles.brandName}>
              InFlow
            </AppText>
            <AppText variant="micro" color={colors.ink3}>
              Companion
            </AppText>
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon={QrCode} label="Scan pairing code" onPress={() => setIsScannerOpen(true)} />
          <IconButton icon={Settings2} label="Settings" onPress={() => setIsSettingsOpen(true)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Connection */}
        <Panel style={styles.connection}>
          <View style={styles.statusRow}>
            <StatusPill tone={status.tone} label={status.pill} />
            {isConnected && (
              <AppText variant="mono" color={colors.ink3} numberOfLines={1} style={styles.host}>
                {connectionConfig.host}:{connectionConfig.port}
              </AppText>
            )}
          </View>
          <View style={styles.connectionText}>
            <AppText variant="title">{status.title}</AppText>
            <AppText variant="ui" color={colors.ink2}>
              {status.body}
            </AppText>
          </View>
          <Button label="Open Stream Deck" icon={Play} iconFill variant="primary" size="lg" onPress={openDeck} />
          {connectionState === 'unpaired' && (
            <Button label="Scan pairing code" icon={QrCode} variant="secondary" onPress={() => setIsScannerOpen(true)} />
          )}
          {(connectionState === 'disconnected' || connectionState === 'error') && (
            <View style={styles.buttonRow}>
              <Button label="Retry" icon={RefreshCw} variant="secondary" style={styles.flex} onPress={() => ConnectionService.connect()} />
              <Button label="Scan QR" icon={QrCode} variant="secondary" style={styles.flex} onPress={() => setIsScannerOpen(true)} />
            </View>
          )}
        </Panel>

        {/* Deck preview, drawn with the same key faces as the deck itself */}
        <Panel style={styles.preview}>
          <View style={styles.previewHeader}>
            <View>
              <AppText variant="eyebrow">Your deck</AppText>
              <AppText variant="sm">{firstPage?.title || 'Deck'}</AppText>
            </View>
            <AppText variant="micro" color={colors.ink3} style={styles.previewMeta}>
              {rows}×{cols} · {topPages.length} page{topPages.length === 1 ? '' : 's'}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Stream Deck" onPress={openDeck} onPressIn={() => Haptics.tick()}>
            <View style={styles.frame}>
              <View style={{ aspectRatio: cols / rows }}>
                <DeckGrid
                  slots={firstPage?.slots ?? []}
                  gridDimension={deckConfig.gridDimension}
                  activeWorkspaceId={activeWorkspaceId}
                  onPressSlot={() => {}}
                  gap={8}
                  preview
                />
              </View>
            </View>
          </Pressable>
          <AppText variant="micro" color={colors.ink3}>
            {isConnected ? 'Live from your PC. Edits made there appear here instantly.' : 'Last synced layout. Reconnect to get the latest.'}
          </AppText>
        </Panel>

        <GuideCarousel onScanPress={() => setIsScannerOpen(true)} />
      </ScrollView>

      {modals}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
  });

  useEffect(() => {
    Haptics.load();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  brandName: {
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  connection: {
    padding: 16,
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  host: {
    flexShrink: 1,
  },
  connectionText: {
    gap: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  preview: {
    padding: 16,
    gap: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  previewMeta: {
    fontVariant: ['tabular-nums'],
  },
  frame: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#0b0b0d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
