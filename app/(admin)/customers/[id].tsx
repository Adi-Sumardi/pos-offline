import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Divider, Surface, Switch, Portal, Modal, Icon } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import {
  getCustomerById, createCustomer, updateCustomer,
  getCustomerDebtHistory, getDebtPaymentHistory, payDebt,
} from '@/db/queries/customers';
import { printDebtInvoice, shareDebtInvoice } from '@/utils/debtInvoice';
import { formatRupiah } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

export default function CustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const cashierId = useAuthStore((s) => s.user!.id);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [debtLimit, setDebtLimit] = useState('0');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [debtHistory, setDebtHistory] = useState<any[]>([]);
  const [payHistory, setPayHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [printingInvoice, setPrintingInvoice] = useState(false);
  const [sharingInvoice, setSharingInvoice] = useState(false);

  // Bayar hutang modal
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => { if (!isNew) loadData(); }, [id]);

  async function loadData() {
    const c = await getCustomerById(Number(id));
    if (!c) return;
    setCustomer(c);
    setFullName(c.fullName);
    setPhone(c.phone);
    setAddress(c.address ?? '');
    setDebtLimit(String(c.debtLimit));
    setNotes(c.notes ?? '');
    setIsActive(c.isActive);
    const [dh, ph] = await Promise.all([
      getCustomerDebtHistory(Number(id)),
      getDebtPaymentHistory(Number(id)),
    ]);
    setDebtHistory(dh);
    setPayHistory(ph);
  }

  async function handleSave() {
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Nama dan nomor HP wajib diisi'); return;
    }
    setLoading(true);
    try {
      const data = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        debtLimit: parseInt(debtLimit) || 0,
        notes: notes.trim() || undefined,
        isActive,
      };
      if (isNew) {
        await createCustomer(data);
        Alert.alert('Berhasil', 'Member berhasil didaftarkan', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        await updateCustomer(Number(id), data);
        Alert.alert('Berhasil', 'Data member diperbarui', [{ text: 'OK', onPress: () => loadData() }]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayDebt() {
    const amount = parseInt(payAmount.replace(/\./g, '')) || 0;
    if (amount <= 0) { Alert.alert('Error', 'Masukkan nominal yang valid'); return; }
    try {
      await payDebt(Number(id), cashierId, amount, payNotes || undefined);
      setShowPay(false);
      setPayAmount('');
      setPayNotes('');
      await loadData();
      Alert.alert('Berhasil', `Pembayaran hutang ${formatRupiah(amount)} berhasil dicatat`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* Header Hutang (edit mode) */}
        {!isNew && customer && (
          <Surface style={styles.debtCard} elevation={2}>
            <View style={styles.debtRow}>
              <View>
                <Text style={styles.debtLabel}>Saldo Hutang</Text>
                <Text style={[styles.debtValue, { color: customer.debtBalance > 0 ? Colors.danger : Colors.success }]}>
                  {formatRupiah(customer.debtBalance)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.debtLabel}>Limit Hutang</Text>
                <Text style={styles.limitValue}>{formatRupiah(customer.debtLimit)}</Text>
              </View>
            </View>
            {customer.debtBalance > 0 && (
              <>
                <Button mode="contained" onPress={() => setShowPay(true)}
                  style={styles.payBtn} buttonColor={Colors.success}
                  icon="cash">
                  Bayar Hutang
                </Button>
                <View style={styles.invoiceBtns}>
                  <Button
                    mode="outlined"
                    icon="printer"
                    loading={printingInvoice}
                    onPress={async () => {
                      setPrintingInvoice(true);
                      try { await printDebtInvoice(Number(id)); }
                      catch (e: any) { Alert.alert('Gagal', e.message); }
                      finally { setPrintingInvoice(false); }
                    }}
                    style={styles.invoiceBtn}
                    compact
                  >
                    Cetak Tagihan
                  </Button>
                  <Button
                    mode="outlined"
                    icon="share-variant"
                    loading={sharingInvoice}
                    onPress={async () => {
                      setSharingInvoice(true);
                      try { await shareDebtInvoice(Number(id)); }
                      catch (e: any) { Alert.alert('Gagal', e.message); }
                      finally { setSharingInvoice(false); }
                    }}
                    style={styles.invoiceBtn}
                    compact
                  >
                    Share Tagihan
                  </Button>
                </View>
              </>
            )}
          </Surface>
        )}

        <Text style={styles.section}>Data Member</Text>
        <TextInput label="Nama Lengkap *" value={fullName} onChangeText={setFullName}
          mode="outlined" style={styles.input} />
        <TextInput label="Nomor HP *" value={phone} onChangeText={setPhone}
          mode="outlined" keyboardType="phone-pad" style={styles.input} />
        <TextInput label="Alamat" value={address} onChangeText={setAddress}
          mode="outlined" multiline style={styles.input} />
        <TextInput label="Limit Hutang (Rp)" value={debtLimit}
          onChangeText={setDebtLimit} mode="outlined"
          keyboardType="number-pad" style={styles.input}
          left={<TextInput.Affix text="Rp" />} />
        <TextInput label="Catatan" value={notes} onChangeText={setNotes}
          mode="outlined" multiline style={styles.input} />
        <View style={styles.switchRow}>
          <Text>Member Aktif</Text>
          <Switch value={isActive} onValueChange={setIsActive} color={Colors.primary} />
        </View>

        <Button mode="contained" onPress={handleSave} loading={loading}
          style={styles.saveBtn} buttonColor={Colors.primary}
          contentStyle={{ paddingVertical: 6 }}>
          {isNew ? 'Daftarkan Member' : 'Simpan Perubahan'}
        </Button>

        {/* Riwayat Pembayaran Hutang */}
        {payHistory.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.section}>Riwayat Bayar Hutang</Text>
            {payHistory.map((p) => (
              <Surface key={p.id} style={styles.histItem} elevation={1}>
                <View style={styles.histRow}>
                  <View>
                    <Text style={styles.histMain}>{formatRupiah(p.amount)}</Text>
                    <Text style={styles.histSub}>{formatDateTime(p.paidAt)}</Text>
                  </View>
                  {p.notes && <Text style={styles.histNote}>{p.notes}</Text>}
                </View>
              </Surface>
            ))}
          </>
        )}

        {/* Riwayat Transaksi */}
        {debtHistory.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.section}>Riwayat Transaksi</Text>
            {debtHistory.map((t) => (
              <Surface key={t.id} style={styles.histItem} elevation={1}>
                <View style={styles.histRow}>
                  <View>
                    <Text style={styles.histMain}>{t.trxCode}</Text>
                    <Text style={styles.histSub}>{formatDateTime(t.createdAt)}</Text>
                  </View>
                  <Text style={[styles.histMain, { color: t.status === 'VOID' ? Colors.textHint : Colors.primary }]}>
                    {t.status === 'VOID' ? 'VOID' : formatRupiah(t.total)}
                  </Text>
                </View>
              </Surface>
            ))}
          </>
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <Portal>
        <Modal visible={showPay} onDismiss={() => setShowPay(false)}
          contentContainerStyle={styles.modal}>
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>Bayar Hutang</Text>
          <Text style={styles.modalSub}>
            Saldo hutang: {formatRupiah(customer?.debtBalance ?? 0)}
          </Text>
          <TextInput label="Nominal Bayar (Rp)" value={payAmount}
            onChangeText={setPayAmount} mode="outlined"
            keyboardType="number-pad" style={styles.input} />
          <TextInput label="Catatan (opsional)" value={payNotes}
            onChangeText={setPayNotes} mode="outlined" style={styles.input} />
          <View style={styles.row}>
            <Button mode="outlined" onPress={() => setShowPay(false)} style={{ flex: 1 }}>Batal</Button>
            <Button mode="contained" onPress={handlePayDebt}
              style={{ flex: 1, marginLeft: 8 }} buttonColor={Colors.success}>
              Simpan
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  debtCard: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface },
  debtRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  debtLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  debtValue: { fontSize: FontSize.xl, fontWeight: '800' },
  limitValue: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  payBtn: { borderRadius: Radius.md, marginBottom: Spacing.sm },
  invoiceBtns: { flexDirection: 'row', gap: Spacing.sm },
  invoiceBtn: { flex: 1, borderRadius: Radius.md, borderColor: Colors.accent },
  section: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  saveBtn: { marginTop: Spacing.sm, borderRadius: Radius.md },
  divider: { marginVertical: Spacing.md },
  histItem: { borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histMain: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  histSub: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
  histNote: { fontSize: FontSize.xs, color: Colors.textSecondary, maxWidth: 120, textAlign: 'right' },
  modal: { backgroundColor: Colors.surface, margin: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg, paddingTop: Spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  row: { flexDirection: 'row' },
});
