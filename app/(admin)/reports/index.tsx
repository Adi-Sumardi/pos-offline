import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, SegmentedButtons, Divider, Icon } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import {
  getSalesSummary, getDailySales, getCashFlowSummary,
  getExpensesByPeriod, getDebtReport, getTopProducts,
  type SalesSummary, type DailySales,
} from '@/db/queries/reports';
import { formatRupiah } from '@/utils/currency';
import { today, startOfMonth, startOfWeek, formatDate } from '@/utils/date';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import BarChart, { type BarChartDataItem } from '@/components/shared/BarChart';
import { printReport, shareReportPdf } from '@/utils/reportPdf';

type Period = 'today' | 'week' | 'month' | 'custom';

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={statStyles.row}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary },
  value: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
});

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const [tab, setTab] = useState<'sales' | 'cashflow' | 'debt' | 'profit'>('sales');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [cashflow, setCashflow] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [debtReport, setDebtReport] = useState<any[]>([]);

  function getDateRange(): [string, string] {
    const t = today();
    if (period === 'today') return [t, t];
    if (period === 'week') return [startOfWeek(), t];
    if (period === 'month') return [startOfMonth(), t];
    return [startOfMonth(), t]; // custom = bulan ini for now
  }

  async function load() {
    const [from, to] = getDateRange();
    const [s, ds, cf, tp, ex, dr] = await Promise.all([
      getSalesSummary(from, to),
      getDailySales(from, to),
      getCashFlowSummary(from, to),
      getTopProducts(from, to, 10),
      getExpensesByPeriod(from, to),
      getDebtReport(),
    ]);
    setSummary(s);
    setDailySales(ds);
    setCashflow(cf);
    setTopProducts(tp);
    setExpenses(ex);
    setDebtReport(dr);
  }

  useFocusEffect(useCallback(() => { load(); }, [period]));

  const [from, to] = getDateRange();

  // Prepare chart data
  const dailyChartData: BarChartDataItem[] = dailySales.map((d) => ({
    label: formatDate(d.date, 'DD/MM'),
    value: d.revenue,
    color: Colors.primary,
  }));

  const topProductChartData: BarChartDataItem[] = topProducts.slice(0, 7).map((p, i) => ({
    label: p.productName.length > 8 ? p.productName.slice(0, 8) + '…' : p.productName,
    value: p.totalRevenue,
    color: [Colors.primary, Colors.accent, Colors.success, Colors.info, Colors.warning, Colors.primaryLight, Colors.danger][i % 7],
  }));

  const expenseChartData: BarChartDataItem[] = expenses.map((e, i) => ({
    label: e.category.length > 8 ? e.category.slice(0, 8) + '…' : e.category,
    value: e.total,
    color: [Colors.danger, Colors.warning, Colors.accent, Colors.info][i % 4],
  }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Filter Period */}
      <SegmentedButtons
        value={period}
        onValueChange={(v) => setPeriod(v as Period)}
        buttons={[
          { value: 'today', label: 'Hari Ini' },
          { value: 'week', label: 'Minggu Ini' },
          { value: 'month', label: 'Bulan Ini' },
        ]}
        style={styles.segment}
      />
      <Text style={styles.dateRange}>
        {formatDate(from)} — {formatDate(to)}
      </Text>

      {/* Tab Laporan */}
      <View style={styles.tabRow}>
        {[
          { key: 'sales', label: 'Penjualan' },
          { key: 'profit', label: 'Laba' },
          { key: 'cashflow', label: 'Cash Flow' },
          { key: 'debt', label: 'Hutang' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key as any)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Laporan Penjualan */}
      {tab === 'sales' && summary && (
        <>
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Ringkasan Penjualan</Text>
            <Divider style={{ marginBottom: 8 }} />
            <StatRow label="Total Omzet" value={formatRupiah(summary.totalRevenue)} color={Colors.success} />
            <StatRow label="Transaksi" value={String(summary.transactionCount)} />
            <StatRow label="Rata-rata/Transaksi" value={formatRupiah(summary.avgTransaction)} />
            <StatRow label="Total Diskon" value={formatRupiah(summary.totalDiscount)} color={Colors.warning} />
            <Divider style={{ marginVertical: 8 }} />
            <StatRow label="Tunai" value={formatRupiah(summary.cashSales)} />
            <StatRow label="Hutang" value={formatRupiah(summary.debtSales)} />
          </Surface>

          {/* Chart: Penjualan Harian */}
          {dailyChartData.length > 1 && (
            <Surface style={styles.card} elevation={1}>
              <Text style={styles.cardTitle}>📊 Grafik Penjualan Harian</Text>
              <Divider style={{ marginBottom: 8 }} />
              <BarChart
                data={dailyChartData}
                height={180}
                valueFormat="rupiah"
                barColor={Colors.primary}
                title=""
              />
            </Surface>
          )}

          {topProducts.length > 0 && (
            <Surface style={styles.card} elevation={1}>
              <Text style={styles.cardTitle}>Produk Terlaris</Text>
              <Divider style={{ marginBottom: 8 }} />

              {/* Chart: Top Products */}
              {topProductChartData.length > 1 && (
                <>
                  <BarChart
                    data={topProductChartData}
                    height={160}
                    valueFormat="rupiah"
                    showValues
                  />
                  <Divider style={{ marginVertical: 8 }} />
                </>
              )}

              {topProducts.map((p, i) => (
                <View key={i} style={[statStyles.row, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.divider }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600' }} numberOfLines={1}>
                      {i + 1}. {p.productName}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textHint }}>
                      Qty: {p.totalQty}
                    </Text>
                  </View>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary }}>
                    {formatRupiah(p.totalRevenue)}
                  </Text>
                </View>
              ))}
            </Surface>
          )}
        </>
      )}

      {/* Laporan Laba Kotor (FEAT-01) */}
      {tab === 'profit' && summary && (
        <>
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Laporan Laba Kotor</Text>
            <Divider style={{ marginBottom: 8 }} />
            <StatRow label="Total Omzet" value={formatRupiah(summary.totalRevenue)} />
            <StatRow label="Total HPP" value={formatRupiah(summary.totalCost)} color={Colors.danger} />
            <Divider style={{ marginVertical: 8 }} />
            <View style={statStyles.row}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700' }}>Laba Kotor</Text>
              <Text style={{
                fontSize: FontSize.md, fontWeight: '800',
                color: summary.grossProfit >= 0 ? Colors.success : Colors.danger,
              }}>
                {formatRupiah(summary.grossProfit)}
              </Text>
            </View>
            <Text style={{ fontSize: FontSize.xs, color: Colors.textHint, marginTop: 8 }}>
              * Laba kotor = Omzet − HPP (tidak termasuk biaya operasional)
            </Text>
          </Surface>

          {/* Chart: Perbandingan Omzet vs HPP */}
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.cardTitle}>📊 Perbandingan</Text>
            <Divider style={{ marginBottom: 8 }} />
            <BarChart
              data={[
                { label: 'Omzet', value: summary.totalRevenue, color: Colors.success },
                { label: 'HPP', value: summary.totalCost, color: Colors.danger },
                { label: 'Laba', value: Math.max(0, summary.grossProfit), color: Colors.primary },
              ]}
              height={160}
              valueFormat="rupiah"
              showValues
            />
          </Surface>
        </>
      )}

      {/* Cash Flow (FEAT-02) */}
      {tab === 'cashflow' && cashflow && (
        <>
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Arus Kas</Text>
            <Divider style={{ marginBottom: 8 }} />
            <StatRow label="Penjualan Tunai" value={formatRupiah(cashflow.cashIn)} color={Colors.success} />
            <StatRow label="Pembayaran Hutang" value={formatRupiah(cashflow.debtPaid)} color={Colors.success} />
            <StatRow label="Total Masuk" value={formatRupiah(cashflow.totalIn)} color={Colors.success} />
            <Divider style={{ marginVertical: 8 }} />
            <StatRow label="Total Pengeluaran" value={formatRupiah(cashflow.totalOut)} color={Colors.danger} />
            <Divider style={{ marginVertical: 8 }} />
            <View style={statStyles.row}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700' }}>Net Cash Flow</Text>
              <Text style={{
                fontSize: FontSize.md, fontWeight: '800',
                color: cashflow.netCashFlow >= 0 ? Colors.success : Colors.danger,
              }}>
                {formatRupiah(cashflow.netCashFlow)}
              </Text>
            </View>
          </Surface>

          {/* Chart: Kas Masuk vs Keluar */}
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.cardTitle}>📊 Arus Kas</Text>
            <Divider style={{ marginBottom: 8 }} />
            <BarChart
              data={[
                { label: 'Tunai', value: cashflow.cashIn, color: Colors.success },
                { label: 'Bayar Hutang', value: cashflow.debtPaid, color: Colors.info },
                { label: 'Pengeluaran', value: cashflow.totalOut, color: Colors.danger },
              ]}
              height={150}
              valueFormat="rupiah"
              showValues
            />
          </Surface>

          {expenses.length > 0 && (
            <Surface style={styles.card} elevation={1}>
              <Text style={styles.cardTitle}>Pengeluaran per Kategori</Text>
              <Divider style={{ marginBottom: 8 }} />

              {/* Chart: Expenses */}
              {expenseChartData.length > 1 && (
                <>
                  <BarChart
                    data={expenseChartData}
                    height={140}
                    valueFormat="rupiah"
                    showValues
                  />
                  <Divider style={{ marginVertical: 8 }} />
                </>
              )}

              {expenses.map((e, i) => (
                <View key={i} style={[statStyles.row, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.divider }]}>
                  <Text style={statStyles.label}>{e.category} ({e.count}x)</Text>
                  <Text style={[statStyles.value, { color: Colors.danger }]}>{formatRupiah(e.total)}</Text>
                </View>
              ))}
            </Surface>
          )}
        </>
      )}

      {/* Laporan Hutang */}
      {tab === 'debt' && (
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.cardTitle}>Daftar Hutang Member</Text>
          <Divider style={{ marginBottom: 8 }} />
          {debtReport.length === 0 ? (
            <Text style={{ color: Colors.success, textAlign: 'center', padding: 16 }}>
              Semua member lunas ✓
            </Text>
          ) : (
            <>
              {/* Chart: Top Debtors */}
              {debtReport.length > 1 && (
                <>
                  <BarChart
                    data={debtReport.slice(0, 7).map((c, i) => ({
                      label: c.fullName.length > 8 ? c.fullName.slice(0, 8) + '…' : c.fullName,
                      value: c.debtBalance,
                      color: c.debtPercent >= 80 ? Colors.danger : Colors.warning,
                    }))}
                    height={140}
                    valueFormat="rupiah"
                    showValues
                  />
                  <Divider style={{ marginVertical: 8 }} />
                </>
              )}

              {debtReport.map((c, i) => (
                <View key={c.id} style={[
                  { paddingVertical: 10 },
                  i > 0 && { borderTopWidth: 1, borderTopColor: Colors.divider },
                ]}>
                  <View style={statStyles.row}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600' }}>{c.fullName}</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.danger }}>
                      {formatRupiah(c.debtBalance)}
                    </Text>
                  </View>
                  <View style={statStyles.row}>
                    <Text style={statStyles.label}>{c.phone}</Text>
                    <Text style={[statStyles.label, { color: c.debtPercent >= 80 ? Colors.danger : Colors.warning }]}>
                      {c.debtPercent}% dari limit
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </Surface>
      )}

      {/* PDF Export */}
      <View style={styles.pdfRow}>
        <Button
          mode="contained"
          icon="printer"
          buttonColor={Colors.primary}
          style={styles.pdfBtn}
          onPress={async () => {
            if (!summary) { Alert.alert('Info', 'Data belum dimuat'); return; }
            const [from, to] = getDateRange();
            try {
              await printReport({
                period: period === 'today' ? 'Hari Ini' : period === 'week' ? 'Minggu Ini' : 'Bulan Ini',
                dateRange: `${formatDate(from)} — ${formatDate(to)}`,
                summary,
                topProducts,
                cashflow,
                expenses,
                debtReport,
              });
            } catch (e: any) { Alert.alert('Error', e.message); }
          }}
        >
          Cetak PDF
        </Button>
        <Button
          mode="outlined"
          icon="share-variant"
          style={styles.pdfBtn}
          onPress={async () => {
            if (!summary) { Alert.alert('Info', 'Data belum dimuat'); return; }
            const [from, to] = getDateRange();
            try {
              await shareReportPdf({
                period: period === 'today' ? 'Hari Ini' : period === 'week' ? 'Minggu Ini' : 'Bulan Ini',
                dateRange: `${formatDate(from)} — ${formatDate(to)}`,
                summary,
                topProducts,
                cashflow,
                expenses,
                debtReport,
              });
            } catch (e: any) { Alert.alert('Error', e.message); }
          }}
        >
          Share PDF
        </Button>
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  segment: { marginBottom: Spacing.sm },
  dateRange: { fontSize: FontSize.xs, color: Colors.textHint, textAlign: 'center', marginBottom: Spacing.md },
  tabRow: { flexDirection: 'row', marginBottom: Spacing.md, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Colors.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textOnPrimary, fontWeight: '700' },
  card: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  pdfRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  pdfBtn: { flex: 1, borderRadius: Radius.md },
});
