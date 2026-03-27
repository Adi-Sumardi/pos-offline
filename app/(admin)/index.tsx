import { useEffect, useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Text, Surface, Icon, Chip } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { getSalesSummary, getDailySales, type DailySales } from '@/db/queries/reports';
import { getLowStockProducts } from '@/db/queries/products';
import { getDebtReport } from '@/db/queries/reports';
import { formatRupiah } from '@/utils/currency';
import { today, startOfMonth, formatDate } from '@/utils/date';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/stores/useAuthStore';

const { width } = Dimensions.get('window');

interface KPICardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

function KPICard({ label, value, icon, color, onPress }: KPICardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.kpiWrap} disabled={!onPress}>
      <Surface style={styles.kpiCard} elevation={2}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
          <Icon source={icon} size={26} color={color} />
        </View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </Surface>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [topDebtors, setTopDebtors] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);

  async function load() {
    const from = startOfMonth();
    const to = today();
    const [s, ls, td, ds] = await Promise.all([
      getSalesSummary(from, to),
      getLowStockProducts(),
      getDebtReport(),
      getDailySales(from, to),
    ]);
    setSummary(s);
    setLowStock(ls);
    setTopDebtors(td.slice(0, 5));
    setDailySales(ds);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <Text style={styles.greeting}>
        Selamat datang, {user?.fullName} 👋
      </Text>
      <Text style={styles.period}>
        Periode: {formatDate(startOfMonth())} — {formatDate(today())}
      </Text>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KPICard
          label="Omzet Bulan Ini"
          value={formatRupiah(summary?.totalRevenue ?? 0)}
          icon="cash-multiple"
          color={Colors.success}
          onPress={() => router.navigate('/(admin)/reports' as any)}
        />
        <KPICard
          label="Laba Kotor"
          value={formatRupiah(summary?.grossProfit ?? 0)}
          icon="trending-up"
          color={Colors.primary}
          onPress={() => router.navigate('/(admin)/reports' as any)}
        />
        <KPICard
          label="Transaksi"
          value={String(summary?.transactionCount ?? 0)}
          icon="receipt"
          color={Colors.accent}
        />
        <KPICard
          label="Stok Menipis"
          value={String(lowStock.length)}
          icon="alert"
          color={lowStock.length > 0 ? Colors.warning : Colors.success}
          onPress={() => router.navigate('/(admin)/products' as any)}
        />
      </View>

      {/* Shortcut Menu */}
      <Text style={styles.sectionTitle}>Menu Cepat</Text>
      <View style={styles.shortcutRow}>
        {[
          { label: 'Kelola Produk', icon: 'package-variant', href: '/(admin)/products' },
          { label: 'Data Member', icon: 'account-group', href: '/(admin)/customers' },
          { label: 'Pengeluaran', icon: 'cash-minus', href: '/(admin)/expenses' },
          { label: 'Diskon', icon: 'tag-multiple', href: '/(admin)/discounts' },
          { label: 'Laporan', icon: 'chart-bar', href: '/(admin)/reports' },
          { label: 'Setting', icon: 'cog', href: '/(admin)/settings' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.shortcut}
            onPress={() => router.navigate(item.href as any)}
          >
            <Surface style={styles.shortcutCard} elevation={1}>
              <Icon source={item.icon} size={28} color={Colors.primary} />
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Surface>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stok Menipis */}
      {lowStock.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Stok Menipis</Text>
          <Surface style={styles.listCard} elevation={1}>
            {lowStock.slice(0, 5).map((p, i) => (
              <View key={p.id} style={[styles.listRow, i > 0 && styles.listDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listMain}>{p.name}</Text>
                  <Text style={styles.listSub}>{p.sku}</Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: p.stock <= 0 ? Colors.dangerLight : Colors.warningLight }}
                  textStyle={{ color: p.stock <= 0 ? Colors.danger : Colors.warning, fontSize: 11 }}
                >
                  {p.stock} {p.unit}
                </Chip>
              </View>
            ))}
          </Surface>
        </>
      )}

      {/* Hutang Terbesar */}
      {topDebtors.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Hutang Terbesar</Text>
          <Surface style={styles.listCard} elevation={1}>
            {topDebtors.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.listRow, i > 0 && styles.listDivider]}
                onPress={() => router.push(`/(admin)/customers/${c.id}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.listMain}>{c.fullName}</Text>
                  <Text style={styles.listSub}>{c.phone}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.listMain, { color: Colors.danger }]}>
                    {formatRupiah(c.debtBalance)}
                  </Text>
                  <Text style={styles.listSub}>{c.debtPercent}% dari limit</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Surface>
        </>
      )}

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  greeting: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  period: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  kpiWrap: { width: '50%', padding: 6 },
  kpiCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    alignItems: 'flex-start',
  },
  kpiIcon: { borderRadius: Radius.sm, padding: 8, marginBottom: Spacing.sm },
  kpiValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  shortcutRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  shortcut: { width: '33.33%', padding: 6 },
  shortcutCard: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shortcutLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },
  listCard: { borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  listDivider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  listMain: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  listSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
