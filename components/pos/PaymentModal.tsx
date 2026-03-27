import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Portal, Modal, Button, TextInput, Divider, SegmentedButtons } from 'react-native-paper';
import { formatRupiah, parseRupiah } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import type { Customer } from '@/db/schema';

interface Props {
  visible: boolean;
  total: number;
  subtotal: number;
  discountAmount: number;
  customer: Customer | null;
  onConfirmCash: (amountPaid: number) => void;
  onConfirmDebt: () => void;
  onSelectCustomer: () => void;
  onDismiss: () => void;
  notes: string;
  onNotesChange: (v: string) => void;
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

export default function PaymentModal({
  visible, total, subtotal, discountAmount,
  customer, onConfirmCash, onConfirmDebt,
  onSelectCustomer, onDismiss, notes, onNotesChange,
}: Props) {
  const [payType, setPayType] = useState<'cash' | 'debt'>('cash');
  const [amountPaid, setAmountPaid] = useState('');

  const paid = parseRupiah(amountPaid);
  const change = paid - total;
  const canPay = payType === 'cash' ? paid >= total : !!customer && customer.debtLimit > 0;
  const newDebt = customer ? customer.debtBalance + total : 0;
  const willExceedLimit = customer && customer.debtLimit > 0 && newDebt > customer.debtLimit;

  function handleCash() {
    if (paid < total) return;
    onConfirmCash(paid);
    setAmountPaid('');
  }

  function setQuickAmount(amount: number) {
    // Bulatkan ke kelipatan terdekat yang >= total
    const rounded = Math.ceil(total / amount) * amount;
    setAmountPaid(String(rounded));
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Handle / drag indicator */}
          <View style={styles.handle} />
          <Text style={styles.title}>Pembayaran</Text>

          {/* Ringkasan */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryVal}>{formatRupiah(subtotal)}</Text>
            </View>
            {discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: Colors.success }]}>Diskon</Text>
                <Text style={[styles.summaryVal, { color: Colors.success }]}>
                  − {formatRupiah(discountAmount)}
                </Text>
              </View>
            )}
            <Divider style={{ marginVertical: 6 }} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalVal}>{formatRupiah(total)}</Text>
            </View>
          </View>

          {/* Catatan Transaksi (FEAT-07) */}
          <TextInput
            label="Catatan (opsional)"
            value={notes}
            onChangeText={onNotesChange}
            mode="outlined"
            style={styles.notesInput}
            dense
            placeholder="Contoh: untuk kendaraan Honda Beat"
          />

          {/* Pilih Metode */}
          <SegmentedButtons
            value={payType}
            onValueChange={(v) => setPayType(v as any)}
            buttons={[
              { value: 'cash', label: 'Tunai', icon: 'cash' },
              { value: 'debt', label: 'Hutang', icon: 'account-credit-card' },
            ]}
            style={styles.segment}
          />

          {/* TUNAI */}
          {payType === 'cash' && (
            <>
              <TextInput
                label="Uang Diterima (Rp)"
                value={amountPaid}
                onChangeText={setAmountPaid}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
                left={<TextInput.Affix text="Rp" />}
              />

              {/* Nominal cepat */}
              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((a) => (
                  <TouchableOpacity key={a} style={styles.quickBtn} onPress={() => setQuickAmount(a)}>
                    <Text style={styles.quickText}>{formatRupiah(a).replace('Rp ', '')}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.quickBtn, styles.exactBtn]} onPress={() => setAmountPaid(String(total))}>
                  <Text style={[styles.quickText, { color: Colors.primary }]}>Pas</Text>
                </TouchableOpacity>
              </View>

              {paid >= total && (
                <View style={styles.changeCard}>
                  <Text style={styles.changeLabel}>Kembalian</Text>
                  <Text style={styles.changeVal}>{formatRupiah(change)}</Text>
                </View>
              )}
            </>
          )}

          {/* HUTANG */}
          {payType === 'debt' && (
            <>
              {customer ? (
                <View style={[styles.memberCard, willExceedLimit && styles.memberDanger]}>
                  <View style={styles.memberRow}>
                    <View>
                      <Text style={styles.memberName}>{customer.fullName}</Text>
                      <Text style={styles.memberSub}>{customer.memberCode} · {customer.phone}</Text>
                    </View>
                    <TouchableOpacity onPress={onSelectCustomer}>
                      <Text style={styles.changeLink}>Ganti</Text>
                    </TouchableOpacity>
                  </View>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>Hutang saat ini</Text>
                    <Text style={[styles.debtVal, { color: Colors.warning }]}>
                      {formatRupiah(customer.debtBalance)}
                    </Text>
                  </View>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>+ Transaksi ini</Text>
                    <Text style={[styles.debtVal, { color: Colors.primary }]}>
                      {formatRupiah(total)}
                    </Text>
                  </View>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>= Total hutang baru</Text>
                    <Text style={[styles.debtVal, { color: willExceedLimit ? Colors.danger : Colors.textPrimary, fontWeight: '800' }]}>
                      {formatRupiah(newDebt)}
                    </Text>
                  </View>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>Limit hutang</Text>
                    <Text style={styles.debtLabel}>{formatRupiah(customer.debtLimit)}</Text>
                  </View>
                  {willExceedLimit && (
                    <Text style={styles.dangerText}>⚠ Hutang akan melebihi limit!</Text>
                  )}
                </View>
              ) : (
                <TouchableOpacity onPress={onSelectCustomer} style={styles.selectMember}>
                  <Text style={styles.selectMemberText}>Pilih Member untuk Hutang →</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Tombol Bayar */}
          <View style={styles.btnRow}>
            <Button mode="outlined" onPress={onDismiss} style={{ flex: 1 }}>Batal</Button>
            <Button
              mode="contained"
              disabled={!canPay || !!willExceedLimit}
              onPress={payType === 'cash' ? handleCash : onConfirmDebt}
              style={{ flex: 1, marginLeft: 8 }}
              buttonColor={Colors.success}
              icon="check-circle"
              contentStyle={{ paddingVertical: 4 }}
              labelStyle={{ fontWeight: '800', fontSize: FontSize.md }}
            >
              {payType === 'cash' ? 'Bayar' : 'Catat Hutang'}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: Spacing.md },
  summary: { backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryVal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  totalLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  totalVal: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary },
  notesInput: { marginBottom: Spacing.md, backgroundColor: Colors.surface },
  segment: { marginBottom: Spacing.md },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1, borderColor: Colors.border,
  },
  exactBtn: { borderColor: Colors.primary },
  quickText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  changeCard: { backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeLabel: { fontSize: FontSize.md, color: Colors.success },
  changeVal: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.success },
  memberCard: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface },
  memberDanger: { backgroundColor: Colors.dangerLight },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  memberName: { fontSize: FontSize.md, fontWeight: '700' },
  memberSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  changeLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  debtRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  debtLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  debtVal: { fontSize: FontSize.sm, fontWeight: '600' },
  dangerText: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: '700', marginTop: Spacing.sm },
  selectMember: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  selectMemberText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
  btnRow: { flexDirection: 'row', marginTop: Spacing.sm },
});
