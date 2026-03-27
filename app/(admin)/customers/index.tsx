import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Searchbar, FAB, Surface, ProgressBar, Chip } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { getAllCustomers, searchCustomers } from '@/db/queries/customers';
import { formatRupiah } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import EmptyState from '@/components/shared/EmptyState';

type Customer = Awaited<ReturnType<typeof getAllCustomers>>[0];

function debtColor(balance: number, limit: number): string {
  if (limit === 0) return Colors.textHint;
  const pct = balance / limit;
  if (pct >= 1) return Colors.debtBlocked;
  if (pct >= 0.8) return Colors.debtCritical;
  if (pct >= 0.5) return Colors.debtWarn;
  return Colors.debtSafe;
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const data = await getAllCustomers(false);
    setCustomers(data);
  }

  async function onSearch(q: string) {
    setSearch(q);
    if (q.trim().length < 2) { load(); return; }
    const data = await searchCustomers(q);
    setCustomers(data);
  }

  function renderItem({ item }: { item: Customer }) {
    const pct = item.debtLimit > 0 ? item.debtBalance / item.debtLimit : 0;
    const color = debtColor(item.debtBalance, item.debtLimit);

    return (
      <TouchableOpacity onPress={() => router.push(`/(admin)/customers/${item.id}` as any)}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.fullName}</Text>
                {!item.isActive && (
                  <Chip compact style={styles.inactiveChip} textStyle={{ fontSize: 10 }}>Nonaktif</Chip>
                )}
              </View>
              <Text style={styles.sub}>{item.memberCode} · {item.phone}</Text>
              {item.address ? <Text style={styles.addr} numberOfLines={1}>{item.address}</Text> : null}
            </View>
            <View style={styles.debtCol}>
              {item.debtBalance > 0 ? (
                <>
                  <Text style={[styles.debtAmount, { color }]}>{formatRupiah(item.debtBalance)}</Text>
                  <Text style={styles.debtLabel}>hutang</Text>
                </>
              ) : (
                <Text style={styles.noDebt}>✓ Lunas</Text>
              )}
            </View>
          </View>

          {item.debtLimit > 0 && (
            <View style={styles.progressWrap}>
              <ProgressBar
                progress={Math.min(pct, 1)}
                color={color}
                style={styles.progress}
              />
              <Text style={styles.limitText}>
                Limit: {formatRupiah(item.debtLimit)} ({Math.round(pct * 100)}%)
              </Text>
            </View>
          )}
        </Surface>
      </TouchableOpacity>
    );
  }

  const withDebt = customers.filter((c) => c.debtBalance > 0).length;

  return (
    <View style={styles.root}>
      <Searchbar
        placeholder="Cari nama, nomor HP, atau kode..."
        value={search}
        onChangeText={onSearch}
        style={styles.search}
        inputStyle={{ fontSize: FontSize.sm }}
      />
      <View style={styles.summary}>
        <Text style={styles.summaryText}>{customers.length} member</Text>
        <Text style={[styles.summaryText, { color: withDebt > 0 ? Colors.danger : Colors.success }]}>
          {withDebt} memiliki hutang
        </Text>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Belum ada member" subtitle="Tap + untuk mendaftarkan member baru" />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color={Colors.textOnPrimary}
        onPress={() => router.push('/(admin)/customers/new' as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  search: { margin: Spacing.md, borderRadius: Radius.md },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  summaryText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  card: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  inactiveChip: { backgroundColor: Colors.border },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  addr: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 2 },
  debtCol: { alignItems: 'flex-end', marginLeft: Spacing.sm },
  debtAmount: { fontSize: FontSize.sm, fontWeight: '700' },
  debtLabel: { fontSize: FontSize.xs, color: Colors.textHint },
  noDebt: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  progressWrap: { marginTop: Spacing.sm },
  progress: { height: 6, borderRadius: 3 },
  limitText: { fontSize: 10, color: Colors.textHint, marginTop: 4 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: Colors.primary },
});
