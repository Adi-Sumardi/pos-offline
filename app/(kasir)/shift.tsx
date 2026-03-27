import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { getOpenShift, closeShift, getShiftHistory } from '@/db/queries/shifts';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatRupiah } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

export default function ShiftScreen() {
  const user = useAuthStore((s) => s.user!);
  const [shift, setShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [sh, hist] = await Promise.all([
      getOpenShift(user.id),
      getShiftHistory(user.id),
    ]);
    setShift(sh);
    setHistory(hist);
  }

  async function handleClose() {
    const balance = parseInt(closingBalance.replace(/\./g, '')) || 0;
    if (!closingBalance) { Alert.alert('Error', 'Masukkan saldo kas akhir'); return; }
    Alert.alert('Tutup Shift', `Saldo akhir: ${formatRupiah(balance)}\nYakin menutup shift?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tutup Shift', style: 'default',
        onPress: async () => {
          setClosing(true);
          try {
            const res = await closeShift(shift.id, balance, notes || undefined);
            setResult(res);
            setShift(null);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Hasil tutup shift */}
      {result && (
        <Surface style={styles.resultCard} elevation={2}>
          <Text style={styles.resultTitle}>Shift Berhasil Ditutup</Text>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Saldo Sistem</Text>
            <Text style={styles.rowVal}>{formatRupiah(result.systemBalance)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Saldo Aktual (Input)</Text>
            <Text style={styles.rowVal}>{formatRupiah(result.closingBalance)}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Selisih</Text>
            <Text style={[styles.rowVal, {
              color: result.difference === 0 ? Colors.success :
                result.difference > 0 ? Colors.info : Colors.danger,
              fontWeight: '800',
            }]}>
              {result.difference >= 0 ? '+' : ''}{formatRupiah(result.difference)}
            </Text>
          </View>
          {result.difference === 0 && (
            <Text style={styles.noSelisih}>✓ Tidak ada selisih kas</Text>
          )}
          {result.difference !== 0 && (
            <Text style={styles.selisihWarn}>
              {result.difference > 0 ? '⬆ Kas lebih' : '⬇ Kas kurang'} — harap diperiksa
            </Text>
          )}
          <Button mode="contained" onPress={() => router.back()}
            style={styles.backBtn} buttonColor={Colors.primary}>
            Selesai
          </Button>
        </Surface>
      )}

      {/* Shift aktif */}
      {shift && !result && (
        <Surface style={styles.shiftCard} elevation={2}>
          <Text style={styles.section}>Shift Aktif</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Kasir</Text>
            <Text style={styles.rowVal}>{user.fullName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Dibuka</Text>
            <Text style={styles.rowVal}>{formatDateTime(shift.openedAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Saldo Awal</Text>
            <Text style={styles.rowVal}>{formatRupiah(shift.openingBalance)}</Text>
          </View>

          <Divider style={styles.divider} />
          <Text style={styles.section}>Tutup Shift</Text>
          <Text style={styles.hint}>
            Hitung fisik uang di laci kas, masukkan jumlah totalnya.
            Sistem akan otomatis menghitung selisih.
          </Text>

          <TextInput
            label="Saldo Kas Akhir (Rp)"
            value={closingBalance}
            onChangeText={setClosingBalance}
            mode="outlined"
            keyboardType="number-pad"
            style={styles.input}
            left={<TextInput.Affix text="Rp" />}
          />
          <TextInput
            label="Catatan (opsional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleClose}
            loading={closing}
            style={styles.closeBtn}
            buttonColor={Colors.danger}
            icon="lock-clock"
            contentStyle={{ paddingVertical: 6 }}
          >
            Tutup Shift Sekarang
          </Button>
        </Surface>
      )}

      {!shift && !result && (
        <Surface style={styles.shiftCard} elevation={1}>
          <Text style={styles.noShift}>Tidak ada shift aktif saat ini</Text>
        </Surface>
      )}

      {/* Riwayat Shift */}
      {history.length > 0 && (
        <>
          <Text style={[styles.section, { marginTop: Spacing.lg }]}>Riwayat Shift</Text>
          {history.map((h) => (
            <Surface key={h.id} style={styles.histCard} elevation={1}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{formatDateTime(h.openedAt)}</Text>
                <Text style={[styles.rowVal, {
                  color: h.status === 'OPEN' ? Colors.success : Colors.textHint,
                  fontSize: FontSize.xs,
                }]}>
                  {h.status}
                </Text>
              </View>
              {h.status === 'CLOSED' && h.difference !== null && (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Selisih</Text>
                  <Text style={[styles.rowVal, {
                    color: h.difference === 0 ? Colors.success :
                      h.difference > 0 ? Colors.info : Colors.danger,
                    fontSize: FontSize.xs, fontWeight: '700',
                  }]}>
                    {h.difference >= 0 ? '+' : ''}{formatRupiah(h.difference ?? 0)}
                  </Text>
                </View>
              )}
            </Surface>
          ))}
        </>
      )}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  section: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.md },
  shiftCard: { borderRadius: Radius.md, padding: Spacing.md, backgroundColor: Colors.surface, marginBottom: Spacing.md },
  resultCard: { borderRadius: Radius.md, padding: Spacing.md, backgroundColor: Colors.surface, marginBottom: Spacing.md },
  resultTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.success },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  rowVal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  divider: { marginVertical: Spacing.sm },
  noSelisih: { fontSize: FontSize.sm, color: Colors.success, fontWeight: '600', textAlign: 'center', marginTop: Spacing.sm },
  selisihWarn: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '600', textAlign: 'center', marginTop: Spacing.sm },
  backBtn: { marginTop: Spacing.md, borderRadius: Radius.md },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  closeBtn: { borderRadius: Radius.md, marginTop: Spacing.sm },
  noShift: { textAlign: 'center', color: Colors.textSecondary, padding: Spacing.lg },
  histCard: { borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
});
