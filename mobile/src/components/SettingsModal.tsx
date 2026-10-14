import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { CheckCircle2, Info, Settings2, Wifi, XCircle } from 'lucide-react-native';
import type { ConnectionConfig } from '../types/deck';
import { ConnectionService, normalizeToken } from '../services/connection';
import { HAPTIC_OPTIONS, Haptics, useHapticLevel } from '../services/haptics';
import { AppText, Button, Segmented, Sheet } from '../ui/primitives';
import { colors, fonts, radius, withAlpha } from '../ui/tokens';

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
  const [pairingCode, setPairingCode] = useState(config.token || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [hapticLevel, setHapticLevel] = useHapticLevel();

  // Re-read the saved config each time the sheet opens (it may have changed via a QR scan).
  useEffect(() => {
    if (!visible) return;
    setHost(config.host);
    setPort(String(config.port));
    setPairingCode(config.token || '');
    setTestResult(null);
  }, [visible, config]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await ConnectionService.testConnection(host.trim(), parseInt(port, 10) || 8080, normalizeToken(pairingCode));
    setTesting(false);
    if (result.success) {
      Haptics.emphasis();
      setTestResult({ success: true, msg: `Paired with InFlow ${result.status?.server_version || '1.x'} on your PC` });
    } else {
      Haptics.error();
      setTestResult({ success: false, msg: result.error || 'Could not reach your PC.' });
    }
  };

  const handleSave = () => {
    onSaveConfig({
      host: host.trim() || '127.0.0.1',
      port: parseInt(port, 10) || 8080,
      autoConnect: true,
      token: normalizeToken(pairingCode),
    });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Settings"
      icon={Settings2}
      animation="slide"
      footer={
        <>
          <Button label="Cancel" variant="ghost" size="sm" onPress={onClose} />
          <Button label="Save & connect" variant="primary" size="sm" onPress={handleSave} />
        </>
      }
    >
      <View style={styles.group}>
        <AppText variant="eyebrow">Connection</AppText>
        <View style={styles.row}>
          <Field label="PC address" value={host} onChangeText={setHost} placeholder="192.168.1.15" style={styles.flex} keyboardType="numbers-and-punctuation" />
          <Field label="Port" value={port} onChangeText={setPort} placeholder="8080" keyboardType="number-pad" style={styles.portField} />
        </View>
        <Field
          label="Pairing code"
          value={pairingCode}
          onChangeText={setPairingCode}
          placeholder="ABCD-EFGH"
          autoCapitalize="characters"
          maxLength={9}
          mono
        />
        <Button
          label={testing ? 'Testing…' : 'Test connection'}
          icon={testing ? undefined : Wifi}
          variant="secondary"
          disabled={testing}
          onPress={handleTestConnection}
        />
        {testResult && (
          <View
            style={[
              styles.result,
              {
                backgroundColor: withAlpha(testResult.success ? colors.success : colors.danger, 0.1),
                borderColor: withAlpha(testResult.success ? colors.success : colors.danger, 0.3),
              },
            ]}
          >
            {testResult.success ? <CheckCircle2 size={15} color={colors.success} /> : <XCircle size={15} color={colors.danger} />}
            <AppText variant="ui" color={testResult.success ? '#a7f3d0' : '#fecaca'} style={styles.flex}>
              {testResult.msg}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.group}>
        <AppText variant="eyebrow">Haptic feedback</AppText>
        <Segmented value={hapticLevel} options={HAPTIC_OPTIONS} onChange={setHapticLevel} />
        <AppText variant="micro" color={colors.ink3}>
          {hapticLevel === 'crisp'
            ? 'Short, precise clicks from the system haptic engine. On Android this follows your “Touch feedback” setting.'
            : hapticLevel === 'strong'
            ? 'Heavier taps using the vibration motor, plus a confirmation when the PC finishes.'
            : 'No vibration when pressing keys.'}
        </AppText>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.flex}>
          <AppText variant="sm">Keep screen awake</AppText>
          <AppText variant="micro" color={colors.ink3}>
            For a phone docked next to your monitor.
          </AppText>
        </View>
        <Switch
          value={dockModeEnabled}
          onValueChange={(v) => {
            Haptics.toggle(v);
            onToggleDockMode(v);
          }}
          thumbColor={dockModeEnabled ? '#ffffff' : '#a1a1aa'}
          trackColor={{ false: colors.field, true: colors.brand }}
          ios_backgroundColor={colors.field}
        />
      </View>

      <View style={styles.info}>
        <Info size={14} color={colors.ink3} />
        <AppText variant="micro" color={colors.ink3} style={styles.flex}>
          Keys, folders and colors are designed in InFlow on your PC and sync here instantly. Scanning the QR code fills in
          the connection fields for you.
        </AppText>
      </View>
    </Sheet>
  );
};

const Field: React.FC<TextInputProps & { label: string; mono?: boolean }> = ({ label, mono, style, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <AppText variant="micro" color={colors.ink3}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.ink3}
        autoCorrect={false}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          mono && styles.mono,
          { borderColor: focused ? withAlpha(colors.brand, 0.6) : colors.line },
        ]}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  portField: {
    width: 88,
  },
  field: {
    gap: 6,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.field,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  mono: {
    fontFamily: fonts.mono,
    letterSpacing: 2,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
