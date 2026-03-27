import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { formatRupiah, formatQty } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import type { Product } from '@/db/schema';

interface Props {
  product: Product & { categoryName?: string | null };
  onPress: () => void;
  onLongPress?: () => void;
}

export default function ProductCard({ product, onPress, onLongPress }: Props) {
  const stockPct = product.minStock > 0 ? product.stock / product.minStock : 1;
  const stockColor =
    product.stock <= 0 ? Colors.danger :
    product.stock <= product.minStock ? Colors.warning :
    Colors.success;

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <Surface style={[styles.card, product.stock <= 0 && styles.outOfStock]} elevation={1}>
        {/* Kategori badge */}
        {product.categoryName && (
          <Text style={styles.category} numberOfLines={1}>{product.categoryName}</Text>
        )}

        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}

        <View style={styles.footer}>
          <Text style={styles.price}>{formatRupiah(product.price)}</Text>
          <Text style={[styles.stock, { color: stockColor }]}>
            {formatQty(product.stock, product.unit)}
          </Text>
        </View>

        {product.location ? (
          <Text style={styles.location}>📍 {product.location}</Text>
        ) : null}

        {product.stock <= 0 && (
          <View style={styles.outBadge}>
            <Text style={styles.outText}>Habis</Text>
          </View>
        )}
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    margin: 4,
    minHeight: 110,
  },
  outOfStock: { opacity: 0.6 },
  category: {
    fontSize: 10,
    color: Colors.textHint,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 18,
    flex: 1,
  },
  brand: { fontSize: 10, color: Colors.textHint, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  price: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  stock: { fontSize: 10, fontWeight: '600' },
  location: { fontSize: 10, color: Colors.textHint, marginTop: 2 },
  outBadge: {
    position: 'absolute',
    top: 6, right: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  outText: { fontSize: 10, color: Colors.danger, fontWeight: '700' },
});
