import { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import {
  Text, Searchbar, FAB, Surface, Chip, Badge, Icon,
  Portal, Modal, Button, Divider,
} from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { getAllProducts, getLowStockProducts } from '@/db/queries/products';
import { formatRupiah, formatQty } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import EmptyState from '@/components/shared/EmptyState';
import { printAllQr, printQrByCategory } from '@/utils/qrPrint';

type Product = Awaited<ReturnType<typeof getAllProducts>>[0];

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showQrMenu, setShowQrMenu] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const data = await getAllProducts(true);
    setProducts(data);
    setFiltered(data);
  }

  function onSearch(q: string) {
    setSearch(q);
    const lower = q.toLowerCase();
    setFiltered(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower) ||
          (p.categoryName ?? '').toLowerCase().includes(lower)
      )
    );
  }

  function stockColor(p: Product): string {
    if (p.stock <= 0) return Colors.danger;
    if (p.stock <= p.minStock) return Colors.warning;
    return Colors.success;
  }

  function renderItem({ item }: { item: Product }) {
    return (
      <TouchableOpacity onPress={() => router.push(`/(admin)/products/${item.id}` as any)}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {!item.isActive && (
                  <Chip compact style={styles.inactiveChip} textStyle={{ fontSize: 10 }}>Nonaktif</Chip>
                )}
              </View>
              <Text style={styles.sku}>{item.sku} · {item.categoryName ?? '-'}</Text>
              {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.price}>{formatRupiah(item.price)}</Text>
              <View style={styles.stockRow}>
                <View style={[styles.dot, { backgroundColor: stockColor(item) }]} />
                <Text style={[styles.stock, { color: stockColor(item) }]}>
                  {formatQty(item.stock, item.unit)}
                </Text>
              </View>
              {item.location ? (
                <Text style={styles.location}>📍 {item.location}</Text>
              ) : null}
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      <Searchbar
        placeholder="Cari produk atau SKU..."
        value={search}
        onChangeText={onSearch}
        style={styles.search}
        inputStyle={{ fontSize: FontSize.sm }}
      />

      <View style={styles.countRow}>
        <Text style={styles.countText}>{filtered.length} produk</Text>
        <Text style={styles.countText}>
          {products.filter((p) => p.stock <= p.minStock).length} stok menipis
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Belum ada produk" subtitle="Tap + untuk menambah produk baru" />
        }
      />

      {/* FABs */}
      <FAB
        icon="qrcode"
        style={styles.fabQr}
        color={Colors.textOnPrimary}
        onPress={() => setShowQrMenu(true)}
        size="small"
      />
      <FAB
        icon="plus"
        style={styles.fab}
        color={Colors.textOnPrimary}
        onPress={() => router.push('/(admin)/products/new' as any)}
      />

      {/* QR Print Menu */}
      <Portal>
        <Modal visible={showQrMenu} onDismiss={() => setShowQrMenu(false)}
          contentContainerStyle={styles.qrModal}>
          <View style={styles.handle} />
          <Text style={styles.qrTitle}>Cetak Label QR Code</Text>
          <Text style={styles.qrSub}>Pilih opsi pencetakan label QR</Text>
          <Divider style={{ marginVertical: Spacing.md }} />

          <TouchableOpacity
            style={styles.qrOption}
            onPress={async () => {
              setShowQrMenu(false);
              if (products.length === 0) {
                Alert.alert('Info', 'Belum ada produk untuk dicetak');
                return;
              }
              await printAllQr(products.map(p => ({
                sku: p.sku, name: p.name, price: p.price,
                categoryName: p.categoryName ?? undefined,
              })));
            }}
          >
            <Icon source="printer" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.qrOptTitle}>Semua Produk</Text>
              <Text style={styles.qrOptDesc}>{products.length} label akan dicetak</Text>
            </View>
            <Icon source="chevron-right" size={20} color={Colors.textHint} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            style={styles.qrOption}
            onPress={() => {
              setShowQrMenu(false);
              setShowCatPicker(true);
            }}
          >
            <Icon source="shape" size={24} color={Colors.accent} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.qrOptTitle}>Per Kategori</Text>
              <Text style={styles.qrOptDesc}>Pilih kategori untuk dicetak</Text>
            </View>
            <Icon source="chevron-right" size={20} color={Colors.textHint} />
          </TouchableOpacity>

          <Divider />

          <TouchableOpacity
            style={styles.qrOption}
            onPress={() => {
              setShowQrMenu(false);
              Alert.alert('Info', 'Buka detail produk dan scroll ke bawah untuk melihat & cetak QR per produk.');
            }}
          >
            <Icon source="card-text" size={24} color={Colors.success} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.qrOptTitle}>Per Produk (Satuan)</Text>
              <Text style={styles.qrOptDesc}>Buka detail produk → QR Code</Text>
            </View>
            <Icon source="chevron-right" size={20} color={Colors.textHint} />
          </TouchableOpacity>

          <Button mode="outlined" onPress={() => setShowQrMenu(false)}
            style={{ marginTop: Spacing.md, borderRadius: Radius.md }}>Tutup</Button>
        </Modal>
      </Portal>

      {/* Category Picker for QR Print */}
      <Portal>
        <Modal visible={showCatPicker} onDismiss={() => setShowCatPicker(false)}
          contentContainerStyle={styles.qrModal}>
          <View style={styles.handle} />
          <Text style={styles.qrTitle}>Pilih Kategori</Text>
          <Divider style={{ marginVertical: Spacing.md }} />

          {(() => {
            const cats = [...new Set(products.map(p => p.categoryName ?? 'Tanpa Kategori'))];
            return cats.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.qrOption}
                onPress={async () => {
                  setShowCatPicker(false);
                  const catProducts = products.filter(p => (p.categoryName ?? 'Tanpa Kategori') === cat);
                  await printQrByCategory(
                    catProducts.map(p => ({ sku: p.sku, name: p.name, price: p.price })),
                    cat
                  );
                }}
              >
                <Icon source="tag" size={20} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.qrOptTitle}>{cat}</Text>
                  <Text style={styles.qrOptDesc}>
                    {products.filter(p => (p.categoryName ?? 'Tanpa Kategori') === cat).length} produk
                  </Text>
                </View>
              </TouchableOpacity>
            ));
          })()}

          <Button mode="outlined" onPress={() => setShowCatPicker(false)}
            style={{ marginTop: Spacing.md, borderRadius: Radius.md }}>Batal</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  search: { margin: Spacing.md, borderRadius: Radius.md },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  countText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  inactiveChip: { backgroundColor: Colors.border },
  sku: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  brand: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', marginLeft: Spacing.sm },
  price: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stock: { fontSize: FontSize.xs, fontWeight: '600' },
  location: { fontSize: 10, color: Colors.textHint, marginTop: 2 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: Colors.primary },
  fabQr: { position: 'absolute', bottom: 84, right: 20, backgroundColor: Colors.accent },
  qrModal: {
    backgroundColor: Colors.surface,
    marginHorizontal: 24,
    borderRadius: Radius.xl,
    padding: 20,
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
  qrTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  qrSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  qrOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  qrOptTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  qrOptDesc: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
});
