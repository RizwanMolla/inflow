import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  X,
  Palette,
  Sliders,
  LogOut,
  Check,
  Moon,
  Sun,
  Layers,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, DeckThemeMode } from '../utils/themeContext';

interface DeckMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onCloseDeck: () => void;
  isConnected: boolean;
}

export const DeckMenuModal: React.FC<DeckMenuModalProps> = ({
  visible,
  onClose,
  onOpenSettings,
  onCloseDeck,
  isConnected,
}) => {
  const { theme, themeMode, setThemeMode } = useTheme();

  if (!visible) return null;

  const handleSelectTheme = (mode: DeckThemeMode) => {
    Haptics.selectionAsync().catch(() => {});
    setThemeMode(mode);
  };

  const themeOptions: { mode: DeckThemeMode; label: string; previewBg: string; previewBorder: string; icon: any }[] = [
    {
      mode: 'black',
      label: 'Pitch Black',
      previewBg: '#000000',
      previewBorder: 'rgba(255, 255, 255, 0.25)',
      icon: Moon,
    },
    {
      mode: 'gray',
      label: 'Titanium Gray',
      previewBg: '#1e1e24',
      previewBorder: 'rgba(255, 255, 255, 0.25)',
      icon: Layers,
    },
    {
      mode: 'white',
      label: 'Studio White',
      previewBg: '#f4f4f6',
      previewBorder: 'rgba(0, 0, 0, 0.2)',
      icon: Sun,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              {/* Menu Header */}
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.title, { color: theme.text }]}>Deck Options</Text>
                  {/* Status Indicator */}
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isConnected
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        borderColor: isConnected
                          ? 'rgba(16, 185, 129, 0.35)'
                          : 'rgba(239, 68, 68, 0.35)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isConnected ? '#10b981' : '#ef4444' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isConnected ? '#34d399' : '#f87171' },
                      ]}
                    >
                      {isConnected ? 'LIVE SYNC' : 'DISCONNECTED'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Theme Selection Section */}
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Palette size={14} color={theme.accent} />
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SELECT THEME</Text>
                </View>
                <View style={styles.themeRow}>
                  {themeOptions.map((opt) => {
                    const isSelected = themeMode === opt.mode;
                    const IconComp = opt.icon;
                    return (
                      <TouchableOpacity
                        key={opt.mode}
                        onPress={() => handleSelectTheme(opt.mode)}
                        activeOpacity={0.8}
                        style={[
                          styles.themeButton,
                          {
                            backgroundColor: opt.previewBg,
                            borderColor: isSelected ? theme.accent : opt.previewBorder,
                          },
                          isSelected && styles.themeButtonSelected,
                        ]}
                      >
                        <IconComp
                          size={16}
                          color={opt.mode === 'white' ? '#18181b' : '#ffffff'}
                        />
                        <Text
                          style={[
                            styles.themeBtnText,
                            { color: opt.mode === 'white' ? '#18181b' : '#ffffff' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Check size={12} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsList}>
                {/* Open Settings */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  style={[styles.actionRow, { borderBottomColor: theme.border }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionRowLeft}>
                    <View style={[styles.actionIconBox, { backgroundColor: `${theme.accent}15` }]}>
                      <Sliders size={16} color={theme.accent} />
                    </View>
                    <View>
                      <Text style={[styles.actionText, { color: theme.text }]}>Settings & Network</Text>
                      <Text style={[styles.actionSubtext, { color: theme.textSecondary }]}>IP, port & keep-awake options</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Close Deck */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onCloseDeck();
                  }}
                  style={styles.actionRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionRowLeft}>
                    <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <LogOut size={16} color="#ef4444" />
                    </View>
                    <View>
                      <Text style={[styles.actionText, { color: '#ef4444' }]}>Close Deck</Text>
                      <Text style={[styles.actionSubtext, { color: theme.textSecondary }]}>Return to companion home</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  themeButtonSelected: {
    borderWidth: 2,
  },
  themeBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
});
