import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Portal, Modal, TextInput } from 'react-native-paper';
import { formatRupiah, formatQty } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import type { Product } from '@/db/schema';

interface Props {
  visible: boolean;
  product: Product | null;
  onConfirm: (qty: number) => void;
  onDismiss: () => void;
}

export default function QtyModal({ visible, product, onConfirm, onDismiss }: Props) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) setQty(product.qtyStep);
  }, [product]);

  if (!product) return null;

  const step = product.qtyStep;
  const subtotal = Math.round(product.price * qty);
  const isLiquid = product.unitType === 'liquid';
  const isBulk = product.unitType === 'bulk_small';

  const quickValues = isLiquid
    ? [0.25, 0.5, 1, 1.5, 2, 3]
    : isBulk
    ? [5, 10, 20, 50, 100]
    : [1, 2, 3, 5, 10];

  function increment() {
    const next = Math.round((qty + step) * 100) / 100;
    if (next <= product!.stock) setQty(next);
  }

  function decrement() {
    const next = Math.round((qty - step) * 100) / 100;
    if (next >= step) setQty(next);
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productSku}>{product.sku} · Stok: {formatQty(product.stock, product.unit)}</Text>

        {/* Qty Stepper */}
        <View style={styles.stepper}>
          <TouchableOpacity onPress={decrement} style={styles.stepBtn} disabled={qty <= step}>
            <Text style={[styles.stepIcon, qty <= step && { color: Colors.textHint }]}>−</Text>
          </TouchableOpacity>

          <TextInput
            value={String(qty)}
            onChangeText={(t) => {
              const n = parseFloat(t);
              if (!isNaN(n) && n > 0 && n <= product.stock) setQty(n);
            }}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.qtyInput}
            dense
            textAlign="center"
            outlineColor={Colors.primary}
            activeOutlineColor={Colors.primary}
          />

          <TouchableOpacity onPress={increment} style={styles.stepBtn} disabled={qty >= product.stock}>
            <Text style={[styles.stepIcon, qty >= product.stock && { color: Colors.textHint }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Pilihan cepat */}
        <View style={styles.quickRow}>
          {quickValues
            .filter((v) => v <= product.stock)
            .map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.quickBtn, qty === v && styles.quickBtnActive]}
                onPress={() => setQty(v)}
              >
                <Text style={[styles.quickText, qty === v && styles.quickTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* Subtotal */}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>{formatRupiah(subtotal)}</Text>
        </View>

        {/* Aksi */}
        <View style={styles.btnRow}>
          <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Batal</Button>
          <Button
            mode="contained"
            onPress={() => onConfirm(qty)}
            style={{ flex: 1, marginLeft: 8 }}
            buttonColor={Colors.primary}
          >
            Tambah ke Keranjang
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
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
  productName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  productSku: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  stepIcon: { fontSize: 28, fontWeight: '300', color: Colors.textPrimary, lineHeight: 34 },
  qtyInput: { width: 100, textAlign: 'center', backgroundColor: Colors.surface },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md, justifyContent: 'center' },
  quickBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  quickTextActive: { color: Colors.textOnPrimary, fontWeight: '700' },
  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg, marginBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  subtotalLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  subtotalValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  btnRow: { flexDirection: 'row' },
});
