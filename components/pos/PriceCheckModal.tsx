import { View, StyleSheet } from 'react-native';
import { Text, Portal, Modal, Button, Divider, Chip } from 'react-native-paper';
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
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <View style={styles.handle} />
        <Text style={styles.label}>Cek Harga Produk</Text>
        <Text style={styles.name}>{product.name}</Text>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <Text style={styles.sku}>{product.sku}</Text>

        <Divider style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Harga Jual</Text>
          <Text style={styles.price}>{formatRupiah(product.price)}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.stockLabel}>Stok Tersedia</Text>
          <Text style={[styles.stock, { color: stockColor }]}>
            {formatQty(product.stock, product.unit)}
          </Text>
        </View>

        {product.location && (
          <View style={styles.priceRow}>
            <Text style={styles.stockLabel}>Lokasi Rak</Text>
            <Text style={styles.stockLabel}>📍 {product.location}</Text>
          </View>
        )}

        <Divider style={styles.divider} />

        <View style={styles.btnRow}>
          <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>
            Tutup
          </Button>
          {product.stock > 0 && (
            <Button
              mode="contained"
              onPress={() => { onAddToCart(product); onDismiss(); }}
              style={{ flex: 1, marginLeft: 8 }}
              buttonColor={Colors.primary}
              icon="cart-plus"
            >
              Tambah
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    margin: Spacing.xl,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  label: { fontSize: FontSize.xs, color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xs },
  brand: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sku: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 4 },
  divider: { marginVertical: Spacing.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  priceLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  price: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  stockLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  stock: { fontSize: FontSize.lg, fontWeight: '700' },
  btnRow: { flexDirection: 'row', marginTop: Spacing.sm },
});
