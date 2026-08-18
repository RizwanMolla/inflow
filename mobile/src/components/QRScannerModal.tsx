import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Button,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, QrCode, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedData: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  onScan,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!visible) return null;

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onScan(data);
    setTimeout(() => {
      setScanned(false);
      onClose();
    }, 400);
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
              <QrCode size={18} color="#ef4444" />
              <Text style={styles.title}>Pair with PC (Scan QR)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Camera View */}
          <View style={styles.cameraContainer}>
            {!permission ? (
              <View style={styles.centeredMessage}>
                <Text style={styles.messageText}>Requesting camera permission...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.centeredMessage}>
                <Text style={styles.messageText}>Camera permission is needed to scan QR code</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
                  <Text style={styles.grantBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              >
                <View style={styles.scannerOverlay}>
                  <View style={styles.scanTargetBox} />
                  <Text style={styles.guidanceText}>
                    Point camera at InFlow PC "Pair QR" window
                  </Text>
                </View>
              </CameraView>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Scans <Text style={{ color: '#ef4444' }}>inflow://&lt;ip&gt;:8080</Text> or JSON pairing
            </Text>
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
  cameraContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#000',
    position: 'relative',
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTargetBox: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  guidanceText: {
    marginTop: 16,
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  centeredMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messageText: {
    color: '#a1a1aa',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  grantBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  grantBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  footerText: {
    color: '#71717a',
    fontSize: 10,
    fontFamily: 'System',
  },
});
