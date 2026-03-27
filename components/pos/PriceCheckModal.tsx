import { View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text, Button, Divider, Icon } from 'react-native-paper';
import { formatRupiah, formatQty } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import type { Product } from '@/db/schema';

interface Props {
  visible: boolean;
  product: Product | null;
  onDismiss: () => void;
  onAddToCart: (product: Product) => void;
}

export default function PriceCheckModal({ visible, product, onDismiss, onAddToCart }: Props) {
  if (!product) return null;

  const stockColor =
    product.stock <= 0 ? Colors.danger :
    product.stock <= product.minStock ? Colors.warning :
    Colors.success;

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
              {/* Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={styles.label}>CEK HARGA</Text>
                <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
                  <Icon source="close" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Product Info */}
              <Text style={styles.name}>{product.name}</Text>
              {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
              <Text style={styles.sku}>{product.sku}</Text>

              {/* Price Highlight */}
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Harga Jual</Text>
                <Text style={styles.price}>{formatRupiah(product.price)}</Text>
              </View>

              {/* Info Rows */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Stok Tersedia</Text>
                  <Text style={[styles.infoVal, { color: stockColor, fontWeight: '700' }]}>
                    {formatQty(product.stock, product.unit)}
                  </Text>
                </View>

                {product.location && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Lokasi Rak</Text>
                    <Text style={styles.infoVal}>📍 {product.location}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.btnRow}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={styles.btn}
                  contentStyle={styles.btnContent}
                >
                  Tutup
                </Button>
                {product.stock > 0 && (
                  <Button
                    mode="contained"
                    onPress={() => { onAddToCart(product); onDismiss(); }}
                    style={[styles.btn, { marginLeft: 8 }]}
                    buttonColor={Colors.primary}
                    icon="cart-plus"
                    contentStyle={styles.btnContent}
                  >
                    Tambah
                  </Button>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textHint,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  brand: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sku: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
  priceCard: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: FontSize.xxxl,
    fontWeight: '900',
    color: Colors.primary,
  },
  infoSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  infoVal: { fontSize: FontSize.sm, color: Colors.textPrimary },
  btnRow: { flexDirection: 'row', marginTop: Spacing.md },
  btn: { flex: 1, borderRadius: Radius.md },
  btnContent: { paddingVertical: 4 },
});
