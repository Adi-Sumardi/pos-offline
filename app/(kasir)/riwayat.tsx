import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  Text, Surface, Chip, Divider, Portal, Modal, Button, Icon, ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getTransactionsByDate, getTransactionItems, voidTransaction } from '@/db/queries/transactions';
import { useAuthStore } from '@/stores/useAuthStore';
import { reprintReceipt } from '@/utils/receipt';
import { formatRupiah } from '@/utils/currency';
import { formatDateTime, today } from '@/utils/date';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import EmptyState from '@/components/shared/EmptyState';

type Trx = Awaited<ReturnType<typeof getTransactionsByDate>>[0];
type TrxItem = Awaited<ReturnType<typeof getTransactionItems>>[0];

export default function RiwayatScreen() {
  const user = useAuthStore((s) => s.user!);
  const isAdmin = user.role === 'admin';

  const [transactions, setTransactions] = useState<Trx[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [selected, setSelected] = useState<Trx | null>(null);
  const [items, setItems] = useState<TrxItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reprinting, setReprinting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      const todayStr = today();
      const data = await getTransactionsByDate(todayStr, todayStr);
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(trx: Trx) {
    setSelected(trx);
    setLoadingItems(true);
    try {
      const data = await getTransactionItems(trx.id);
      setItems(data);
    } finally {
      setLoadingItems(false);
    }
  }

  function handleVoid() {
    if (!selected || !isAdmin) return;
    Alert.prompt(
      'Void Transaksi',
      `Yakin void ${selected.trxCode}?\nMasukkan alasan:`,
      async (reason) => {
        if (!reason?.trim()) {
          Alert.alert('Error', 'Alasan tidak boleh kosong');
          return;
        }
        setVoiding(true);
        try {
          await voidTransaction(selected.id, user.id, reason.trim());
          setSelected(null);
          await load();
          Alert.alert('Berhasil', 'Transaksi berhasil di-void');
        } catch (e: any) {
          Alert.alert('Gagal', e.message);
        } finally {
          setVoiding(false);
        }
      },
      'plain-text'
    );
  }

  function paymentLabel(type: string) {
    return type === 'cash' ? 'Tunai' : 'Hutang';
  }

  function paymentColor(type: string) {
    return type === 'cash' ? Colors.success : Colors.warning;
  }

  function renderItem({ item }: { item: Trx }) {
    const isVoid = item.status === 'VOID';
    return (
      <TouchableOpacity onPress={() => openDetail(item)}>
        <Surface style={[styles.card, isVoid && styles.voidCard]} elevation={1}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trxCode, isVoid && styles.voidText]}>{item.trxCode}</Text>
              <Text style={styles.trxTime}>{formatDateTime(item.createdAt)}</Text>
              {item.notes ? (
                <Text style={styles.trxNotes} numberOfLines={1}>📝 {item.notes}</Text>
              ) : null}
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.trxTotal, isVoid && styles.voidText]}>
                {formatRupiah(item.total)}
              </Text>
              <View style={styles.chips}>
                <Chip
                  compact
                  style={[styles.chip, { backgroundColor: paymentColor(item.paymentType) + '20' }]}
                  textStyle={{ fontSize: 10, color: paymentColor(item.paymentType), fontWeight: '700' }}
                >
                  {paymentLabel(item.paymentType)}
                </Chip>
                {isVoid && (
                  <Chip
                    compact
                    style={[styles.chip, { backgroundColor: Colors.dangerLight }]}
                    textStyle={{ fontSize: 10, color: Colors.danger, fontWeight: '700' }}
                  >
                    VOID
                  </Chip>
                )}
              </View>
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  }

  const totalOmzet = transactions
    .filter((t) => t.status === 'DONE')
    .reduce((s, t) => s + t.total, 0);
  const totalTunai = transactions
    .filter((t) => t.status === 'DONE' && t.paymentType === 'cash')
    .reduce((s, t) => s + t.total, 0);
  const totalHutang = transactions
    .filter((t) => t.status === 'DONE' && t.paymentType === 'debt')
    .reduce((s, t) => s + t.total, 0);

  return (
    <View style={styles.root}>
      {/* Ringkasan hari ini */}
      <Surface style={styles.summary} elevation={1}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{formatRupiah(totalOmzet)}</Text>
            <Text style={styles.summaryLabel}>Total Hari Ini</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: Colors.success }]}>{formatRupiah(totalTunai)}</Text>
            <Text style={styles.summaryLabel}>Tunai</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: Colors.warning }]}>{formatRupiah(totalHutang)}</Text>
            <Text style={styles.summaryLabel}>Hutang</Text>
          </View>
        </View>
      </Surface>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => String(t.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada transaksi"
              subtitle="Transaksi hari ini akan muncul di sini"
            />
          }
        />
      )}

      {/* Detail Modal */}
      <Portal>
        <Modal
          visible={!!selected}
          onDismiss={() => setSelected(null)}
          contentContainerStyle={styles.modal}
        >
          {selected && (
            <>
              <View style={styles.handle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selected.trxCode}</Text>
                  <Text style={styles.modalSub}>{formatDateTime(selected.createdAt)}</Text>
                </View>
                <Chip
                  style={{
                    backgroundColor: selected.status === 'VOID'
                      ? Colors.dangerLight
                      : Colors.successLight,
                  }}
                  textStyle={{
                    color: selected.status === 'VOID' ? Colors.danger : Colors.success,
                    fontWeight: '700',
                    fontSize: FontSize.xs,
                  }}
                >
                  {selected.status}
                </Chip>
              </View>

              <Divider style={styles.divider} />

              {/* Items */}
              {loadingItems ? (
                <ActivityIndicator style={{ padding: Spacing.lg }} color={Colors.primary} />
              ) : (
                items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.productName}</Text>
                      <Text style={styles.itemDetail}>
                        {item.quantity} {item.productUnit} × {formatRupiah(item.unitPrice)}
                      </Text>
                    </View>
                    <Text style={styles.itemSubtotal}>{formatRupiah(item.subtotal)}</Text>
                  </View>
                ))
              )}

              <Divider style={styles.divider} />

              {/* Summary */}
              {selected.discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Diskon ({selected.discountName ?? ''})</Text>
                  <Text style={[styles.summaryRowVal, { color: Colors.accent }]}>
                    -{formatRupiah(selected.discountAmount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryRowLabel, { fontWeight: '700', color: Colors.textPrimary }]}>Total</Text>
                <Text style={styles.totalVal}>{formatRupiah(selected.total)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Metode</Text>
                <Text style={[styles.summaryRowVal, { color: paymentColor(selected.paymentType), fontWeight: '700' }]}>
                  {paymentLabel(selected.paymentType)}
                </Text>
              </View>
              {selected.notes ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Catatan</Text>
                  <Text style={[styles.summaryRowVal, { flex: 1, textAlign: 'right' }]}>{selected.notes}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setSelected(null)} style={{ flex: 1 }}>
                  Tutup
                </Button>
                <Button
                  mode="outlined"
                  icon="printer"
                  loading={reprinting}
                  onPress={async () => {
                    if (!selected) return;
                    setReprinting(true);
                    try { await reprintReceipt(selected.trxCode, user.fullName); }
                    catch (e: any) { Alert.alert('Gagal', e.message); }
                    finally { setReprinting(false); }
                  }}
                  style={{ flex: 1 }}
                >
                  Cetak
                </Button>
                {isAdmin && selected.status === 'DONE' && (
                  <Button
                    mode="outlined"
                    onPress={handleVoid}
                    loading={voiding}
                    style={{ flex: 1 }}
                    textColor={Colors.danger}
                  >
                    Void
                  </Button>
                )}
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryGrid: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  list: { padding: Spacing.md, paddingBottom: 40 },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  voidCard: { opacity: 0.55 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  trxCode: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  trxTime: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  trxNotes: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
  voidText: { color: Colors.textHint, textDecorationLine: 'line-through' },
  cardRight: { alignItems: 'flex-end' },
  trxTotal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  chips: { flexDirection: 'row', gap: 4, marginTop: 4 },
  chip: { height: 22 },

  // Modal
  modal: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  divider: { marginVertical: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  itemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  itemDetail: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  itemSubtotal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryRowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryRowVal: { fontSize: FontSize.sm, color: Colors.textPrimary },
  totalVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
