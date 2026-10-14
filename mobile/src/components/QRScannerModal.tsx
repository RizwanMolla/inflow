import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, QrCode } from 'lucide-react-native';
import { Haptics } from '../services/haptics';
import { AppText, Button, Sheet } from '../ui/primitives';
import { colors } from '../ui/tokens';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedData: string) => void;
}

const TARGET = 210;
const CORNER = 28;

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.emphasis();
    onScan(data);
    setTimeout(() => {
      setScanned(false);
      onClose();
    }, 400);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Pair with your PC" icon={QrCode} animation="slide" scroll={false}>
      <View style={styles.camera}>
        {!permission ? (
          <View style={styles.message}>
            <AppText variant="ui" color={colors.ink2}>
              Checking camera access…
            </AppText>
          </View>
        ) : !permission.granted ? (
          <View style={styles.message}>
            <Camera size={26} color={colors.ink3} />
            <AppText variant="ui" color={colors.ink2} align="center">
              InFlow needs the camera to read the pairing QR code.
            </AppText>
            <Button label="Allow camera" variant="primary" size="sm" onPress={requestPermission} />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.target}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.steps}>
        <AppText variant="ui" color={colors.ink2}>
          On your PC, open InFlow and click <AppText variant="ui" weight="semibold">Pair phone</AppText> in the top bar, then point
          the camera at the code.
        </AppText>
        <AppText variant="micro" color={colors.ink3}>
          No camera? Type the address and pairing code from your PC into Settings on this phone.
        </AppText>
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  camera: {
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.line,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  target: {
    width: TARGET,
    height: TARGET,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.brand,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
  steps: {
    gap: 6,
  },
});
