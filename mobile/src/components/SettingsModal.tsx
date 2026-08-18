import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Sliders, X, Check, Wifi, ShieldCheck, Zap } from 'lucide-react-native';
import type { ConnectionConfig } from '../types/deck';
import { ConnectionService } from '../services/connection';
import * as Haptics from 'expo-haptics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  config: ConnectionConfig;
  onSaveConfig: (config: ConnectionConfig) => void;
  dockModeEnabled: boolean;
  onToggleDockMode: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  config,
  onSaveConfig,
  dockModeEnabled,
  onToggleDockMode,
}) => {
  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!visible) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const p = parseInt(port, 10) || 8080;
    const result = await ConnectionService.testConnection(host.trim(), p);
    setTesting(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTestResult({
        success: true,
        msg: `Connected to PC! (Server v${result.status?.serverVersion || '1.0.0'})`,
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setTestResult({
        success: false,
        msg: result.error || 'Could not reach PC server.',
      });
    }
  };

  const handleSave = () => {
    const p = parseInt(port, 10) || 8080;
    const updated: ConnectionConfig = {
      host: host.trim() || '127.0.0.1',
      port: p,
      autoConnect: true,
    };
    onSaveConfig(updated);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sliders size={18} color="#ef4444" />
              <Text style={styles.title}>Companion Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* Host PC IP Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>PC IP ADDRESS / HOST</Text>
              <TextInput
                value={host}
                onChangeText={setHost}
                placeholder="e.g. 192.168.1.15"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {/* Port Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>PORT (DEFAULT: 8080)</Text>
              <TextInput
                value={port}
                onChangeText={setPort}
                placeholder="8080"
                placeholderTextColor="#52525b"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              onPress={handleTestConnection}
              disabled={testing}
              style={styles.testBtn}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Wifi size={14} color="#fafafa" />
              )}
              <Text style={styles.testBtnText}>
                {testing ? 'Testing...' : 'Test Connection to PC'}
              </Text>
            </TouchableOpacity>

            {/* Test Result Message */}
            {testResult && (
              <View
                style={[
                  styles.resultBox,
                  testResult.success ? styles.resultSuccess : styles.resultError,
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    testResult.success ? styles.textSuccess : styles.textError,
                  ]}
                >
                  {testResult.msg}
                </Text>
              </View>
            )}

            {/* Desk Dock Mode Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Desk-Dock Mode (Keep Awake)</Text>
                <Text style={styles.toggleDesc}>
                  Prevents screen dimming/sleeping when mounted on phone stand.
                </Text>
              </View>
              <Switch
                value={dockModeEnabled}
                onValueChange={onToggleDockMode}
                thumbColor={dockModeEnabled ? '#ef4444' : '#71717a'}
                trackColor={{ false: '#27272a', true: 'rgba(239, 68, 68, 0.4)' }}
              />
            </View>

            {/* Information Callout */}
            <View style={styles.infoBox}>
              <ShieldCheck size={14} color="#34d399" />
              <Text style={styles.infoText}>
                Deck buttons, labels & colors are managed dynamically from your PC InFlow "Mobile Deck" menu.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save & Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#161618',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0d0d0f',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  testBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  testBtnText: {
    color: '#fafafa',
    fontSize: 12,
    fontWeight: '600',
  },
  resultBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  textSuccess: {
    color: '#34d399',
  },
  textError: {
    color: '#f87171',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleDesc: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 10.5,
    color: '#a1a1aa',
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#121214',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
