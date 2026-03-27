import { useState, useRef } from 'react';
import { View, StyleSheet, Vibration, TouchableOpacity, TouchableWithoutFeedback, Modal } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { searchBySku } from '@/db/queries/products';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import type { Product } from '@/db/schema';

interface Props {
  visible: boolean;
  onFound: (product: Product) => void;
  onNotFound: (sku: string) => void;
  onDismiss: () => void;
  priceCheckMode?: boolean;
}

export default function ScannerModal({ visible, onFound, onNotFound, onDismiss, priceCheckMode }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState('');
  const cooldownRef = useRef(false);

  async function handleBarcodeScan({ data }: { data: string }) {
    if (cooldownRef.current || data === lastScan) return;
    cooldownRef.current = true;
    setScanning(false);
    setLastScan(data);
    Vibration.vibrate(100);

    try {
      const product = await searchBySku(data.trim().toUpperCase());
      if (product) {
        onFound(product);
      } else {
        onNotFound(data);
      }
    } finally {
      setTimeout(() => {
        cooldownRef.current = false;
        setScanning(true);
      }, 2000);
    }
  }

  if (!permission) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {priceCheckMode ? 'Cek Harga' : 'Scan Produk'}
                </Text>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                  <Icon source="close" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {!permission.granted ? (
                <View style={styles.permWrap}>
                  <Text style={styles.permText}>Izin kamera diperlukan untuk scan QR/Barcode</Text>
                  <Button mode="contained" onPress={requestPermission} buttonColor={Colors.primary}>
                    Izinkan Kamera
                  </Button>
                </View>
              ) : (
                <View style={styles.cameraWrap}>
                  <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'pdf417'],
                    }}
                    onBarcodeScanned={scanning ? handleBarcodeScan : undefined}
                  >
                    <View style={styles.overlay}>
                      <View style={styles.frame}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                      </View>
                      <Text style={styles.hint}>
                        {priceCheckMode
                          ? 'Arahkan kamera ke QR Code produk\nuntuk melihat informasi harga'
                          : 'Arahkan kamera ke QR Code atau Barcode\npada label / kotak penyimpanan'}
                      </Text>
                    </View>
                  </CameraView>
                </View>
              )}

              {/* Button Tutup */}
              <View style={styles.btnWrap}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={styles.cancelBtn}
                  contentStyle={{ paddingVertical: 4 }}
                >
                  Tutup
                </Button>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const CORNER = 24;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrap: { height: 300 },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, position: 'relative' },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: Colors.accent, borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: {
    color: Colors.textOnPrimary, fontSize: FontSize.xs, textAlign: 'center',
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  permWrap: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  permText: { textAlign: 'center', color: Colors.textSecondary },
  btnWrap: { padding: Spacing.lg, paddingTop: Spacing.md },
  cancelBtn: { borderRadius: Radius.md },
});
