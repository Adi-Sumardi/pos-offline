import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, FAB, Surface, Button, Portal, Modal, TextInput } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getExpenses, createExpense, deleteExpense, EXPENSE_CATEGORIES } from '@/db/queries/expenses';
import { formatRupiah } from '@/utils/currency';
import { formatDate, today, startOfMonth } from '@/utils/date';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import EmptyState from '@/components/shared/EmptyState';

export default function ExpensesScreen() {
  const userId = useAuthStore((s) => s.user!.id);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  // Form
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(today());

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const data = await getExpenses(startOfMonth(), today());
    setExpenses(data);
    setTotal(data.reduce((s, e) => s + e.amount, 0));
  }

  async function handleAdd() {
    const amt = parseInt(amount.replace(/\./g, '')) || 0;
    if (amt <= 0) { Alert.alert('Error', 'Masukkan nominal yang valid'); return; }
    try {
      await createExpense({ category, amount: amt, notes: notes || null, expenseDate: date, userId });
      setShowAdd(false);
      setAmount('');
      setNotes('');
      setDate(today());
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete(id: number) {
    Alert.alert('Hapus Pengeluaran', 'Yakin ingin menghapus data ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => { await deleteExpense(id); await load(); },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <Surface style={styles.totalCard} elevation={2}>
        <Text style={styles.totalLabel}>Total Pengeluaran Bulan Ini</Text>
        <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
      </Surface>

      <FlatList
        data={expenses}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="Belum ada pengeluaran" subtitle="Tap + untuk mencatat pengeluaran" />}
        renderItem={({ item }) => (
          <Surface style={styles.card} elevation={1}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cat}>{item.category}</Text>
                <Text style={styles.date}>{formatDate(item.expenseDate)}</Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>{formatRupiah(item.amount)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.delete}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Surface>
        )}
      />

      <FAB icon="plus" style={styles.fab} color={Colors.textOnPrimary}
        onPress={() => setShowAdd(true)} />

      <Portal>
        <Modal visible={showAdd} onDismiss={() => setShowAdd(false)}
          contentContainerStyle={styles.modal}>
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>Catat Pengeluaran</Text>

          <Text style={styles.label}>Kategori</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCategory(c)}
                style={[styles.catChip, category === c && styles.catChipActive]}>
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput label="Nominal (Rp)" value={amount} onChangeText={setAmount}
            mode="outlined" keyboardType="number-pad" style={styles.input}
            left={<TextInput.Affix text="Rp" />} />
          <TextInput label="Tanggal" value={date} onChangeText={setDate}
            mode="outlined" style={styles.input} placeholder="YYYY-MM-DD" />
          <TextInput label="Keterangan (opsional)" value={notes} onChangeText={setNotes}
            mode="outlined" style={styles.input} />

          <View style={styles.btnRow}>
            <Button mode="outlined" onPress={() => setShowAdd(false)} style={{ flex: 1 }}>Batal</Button>
            <Button mode="contained" onPress={handleAdd}
              style={{ flex: 1, marginLeft: 8 }} buttonColor={Colors.primary}>Simpan</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  totalCard: { margin: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, backgroundColor: Colors.surface },
  totalLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  totalValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.danger },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  card: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  cat: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  date: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
  notes: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  amount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.danger },
  delete: { fontSize: FontSize.xs, color: Colors.danger, marginTop: 4 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: Colors.primary },
  modal: { backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.xl, padding: Spacing.lg, paddingTop: Spacing.sm, maxHeight: '80%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary },
  catChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  btnRow: { flexDirection: 'row', marginTop: Spacing.sm },
});
