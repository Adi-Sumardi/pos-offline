import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Portal, Modal, Button, Icon, Divider } from 'react-native-paper';
import { formatRupiah } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import type { Discount } from '@/db/schema';

interface Props {
  visible: boolean;
  discounts: Discount[];
  selected: Discount | null;
  subtotal: number;
  onSelect: (discount: Discount | null) => void;
  onDismiss: () => void;
}

export default function DiscountModal({ visible, discounts, selected, subtotal, onSelect, onDismiss }: Props) {
  function calcDiscount(d: Discount): number {
    if (subtotal < d.minPurchase) return 0;
    let amount = d.type === 'percentage'
      ? Math.round(subtotal * d.value / 100)
      : d.value;
    if (d.maxDiscount && amount > d.maxDiscount) amount = d.maxDiscount;
    return amount;
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.row}>
          <Text style={styles.title}>Pilih Diskon</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Icon source="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>Subtotal: {formatRupiah(subtotal)}</Text>

        <Divider style={{ marginVertical: Spacing.md }} />

        {/* List */}
        {discounts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada diskon aktif</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
            {discounts.map((item, idx) => {
              const disc = calcDiscount(item);
              const isSelected = selected?.id === item.id;
              const canApply = subtotal >= item.minPurchase;

              return (
                <View key={item.id}>
                  {idx > 0 && <Divider />}
                  <TouchableOpacity
                    onPress={() => { onSelect(isSelected ? null : item); onDismiss(); }}
                    disabled={!canApply}
                    activeOpacity={0.6}
                    style={[styles.item, !canApply && { opacity: 0.4 }]}
                  >
                    {/* Check icon or empty circle */}
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <Icon source="check" size={14} color="#fff" />}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, isSelected && { color: Colors.primary }]}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemDesc}>
                        {item.type === 'percentage' ? `${item.value}%` : formatRupiah(item.value)}
                        {item.maxDiscount ? `  ·  Maks ${formatRupiah(item.maxDiscount)}` : ''}
                      </Text>
                      {item.minPurchase > 0 && !canApply && (
                        <Text style={styles.itemWarn}>
                          Min. belanja {formatRupiah(item.minPurchase)}
                        </Text>
                      )}
                    </View>

                    {/* Discount amount */}
                    {canApply && disc > 0 && (
                      <Text style={styles.itemAmount}>−{formatRupiah(disc)}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {selected && (
            <Button
              mode="text"
              textColor={Colors.danger}
              onPress={() => { onSelect(null); onDismiss(); }}
              compact
            >
              Hapus Diskon
            </Button>
          )}
          <Button mode="contained" onPress={onDismiss} buttonColor={Colors.primary} style={{ borderRadius: Radius.md }}>
            Selesai
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textHint,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemWarn: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.success,
  },
  footer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
});
