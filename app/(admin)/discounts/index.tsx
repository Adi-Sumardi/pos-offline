import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, FAB, Surface, Switch, Portal, Modal, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { getAllDiscounts, createDiscount, toggleDiscount, deleteDiscount } from '@/db/queries/discounts';
import { formatRupiah } from '@/utils/currency';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import EmptyState from '@/components/shared/EmptyState';

type Discount = Awaited<ReturnType<typeof getAllDiscounts>>[0];

export default function DiscountsScreen() {
  const adminId = useAuthStore((s) => s.user!.id);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setDiscounts(await getAllDiscounts());
  }

  async function handleToggle(id: number, current: boolean) {
    await toggleDiscount(id, !current);
    await load();
  }

  async function handleDelete(id: number, name: string) {
    Alert.alert('Hapus Diskon', `Hapus diskon "${name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => { await deleteDiscount(id); await load(); },
      },
    ]);
  }

  async function handleAdd() {
    if (!name.trim() || !value) { Alert.alert('Error', 'Nama dan nilai diskon wajib diisi'); return; }
    try {
      await createDiscount({
        name: name.trim(),
        type,
        value: parseFloat(value) || 0,
        scope: 'all',
        minPurchase: parseInt(minPurchase) || 0,
        maxDiscount: maxDiscount ? parseInt(maxDiscount) : undefined,
        notes: notes || undefined,
        createdBy: adminId,
      });
      setShowAdd(false);
      setName(''); setValue(''); setMinPurchase('0'); setMaxDiscount(''); setNotes('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function discountLabel(d: Discount): string {
    return d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value);
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={discounts}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="Belum ada diskon" subtitle="Tap + untuk membuat diskon baru" />}
        renderItem={({ item }) => (
          <Surface style={styles.card} elevation={1}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.discName}>{item.name}</Text>
                <Text style={styles.discValue}>{discountLabel(item)}</Text>
                {item.minPurchase > 0 && (
                  <Text style={styles.sub}>Min. belanja: {formatRupiah(item.minPurchase)}</Text>
                )}
                {item.maxDiscount && (
                  <Text style={styles.sub}>Maks. diskon: {formatRupiah(item.maxDiscount)}</Text>
                )}
                {item.notes && <Text style={styles.sub}>{item.notes}</Text>}
              </View>
              <View style={styles.actions}>
                <Switch
                  value={item.isActive}
                  onValueChange={() => handleToggle(item.id, item.isActive)}
                  color={Colors.success}
                />
                <Text style={[styles.statusText, { color: item.isActive ? Colors.success : Colors.textHint }]}>
                  {item.isActive ? 'Aktif' : 'Nonaktif'}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                  <Text style={styles.deleteText}>Hapus</Text>
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
          <Text style={styles.modalTitle}>Buat Diskon Baru</Text>

          <TextInput label="Nama Diskon *" value={name} onChangeText={setName}
            mode="outlined" style={styles.input} />

          <Text style={styles.label}>Tipe Diskon</Text>
          <SegmentedButtons
            value={type}
            onValueChange={(v) => setType(v as any)}
            buttons={[
              { value: 'percentage', label: 'Persentase (%)' },
              { value: 'fixed', label: 'Nominal (Rp)' },
            ]}
            style={styles.segment}
          />

          <TextInput
            label={type === 'percentage' ? 'Nilai (%) *' : 'Nilai Diskon (Rp) *'}
            value={value} onChangeText={setValue}
            mode="outlined" keyboardType="decimal-pad" style={styles.input}
            right={type === 'percentage' ? <TextInput.Affix text="%" /> : <TextInput.Affix text="Rp" />}
          />

          {type === 'percentage' && (
            <TextInput label="Maksimal Diskon (Rp, kosongkan = tidak ada batas)"
              value={maxDiscount} onChangeText={setMaxDiscount}
              mode="outlined" keyboardType="number-pad" style={styles.input} />
          )}

          <TextInput label="Minimum Pembelian (Rp)" value={minPurchase}
            onChangeText={setMinPurchase} mode="outlined"
            keyboardType="number-pad" style={styles.input} />

          <TextInput label="Keterangan" value={notes} onChangeText={setNotes}
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
  list: { padding: Spacing.md, paddingBottom: 80 },
  card: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  discName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  discValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.accent, marginTop: 2 },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actions: { alignItems: 'center', marginLeft: Spacing.sm },
  statusText: { fontSize: 10, marginTop: 2 },
  deleteText: { fontSize: FontSize.xs, color: Colors.danger, marginTop: 8 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: Colors.accent },
  modal: { backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.xl, padding: Spacing.lg, paddingTop: Spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  segment: { marginBottom: Spacing.sm },
  btnRow: { flexDirection: 'row', marginTop: Spacing.sm },
});
