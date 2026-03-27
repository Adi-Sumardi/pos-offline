import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { formatRupiah, formatNumber } from '@/utils/currency';

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartDataItem[];
  /** Tinggi area chart dalam pixel */
  height?: number;
  /** Format label value — 'rupiah' | 'number' */
  valueFormat?: 'rupiah' | 'number';
  /** Apakah menampilkan value di atas bar */
  showValues?: boolean;
  /** Warna bar default */
  barColor?: string;
  /** Warna background grid */
  gridColor?: string;
  /** Jumlah garis grid horizontal */
  gridLines?: number;
  /** Title chart */
  title?: string;
}

export default function BarChart({
  data,
  height = 200,
  valueFormat = 'rupiah',
  showValues = true,
  barColor = Colors.primary,
  gridColor = Colors.divider,
  gridLines = 4,
  title,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>Tidak ada data</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const formatValue = (v: number) =>
    valueFormat === 'rupiah' ? formatRupiah(v) : formatNumber(v);

  // Abbreviated format for axis labels
  const formatAxis = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
    return String(v);
  };

  // Generate grid values
  const gridValues: number[] = [];
  for (let i = 0; i <= gridLines; i++) {
    gridValues.push(Math.round((maxValue / gridLines) * i));
  }

  const barWidth = Math.max(16, Math.min(48, 280 / data.length));
  const gap = Math.max(4, Math.min(12, 120 / data.length));

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.chartArea}>
        {/* Y-axis labels */}
        <View style={[styles.yAxis, { height }]}>
          {[...gridValues].reverse().map((val, i) => (
            <Text key={i} style={styles.yLabel}>
              {formatAxis(val)}
            </Text>
          ))}
        </View>

        {/* Chart body */}
        <View style={[styles.chartBody, { height }]}>
          {/* Grid lines */}
          {gridValues.map((_, i) => (
            <View
              key={`grid-${i}`}
              style={[
                styles.gridLine,
                {
                  backgroundColor: gridColor,
                  bottom: (i / gridLines) * height,
                },
              ]}
            />
          ))}

          {/* Bars */}
          <View style={styles.barsContainer}>
            {data.map((item, i) => {
              const barHeight = Math.max(2, (item.value / maxValue) * (height - 24));
              const color = item.color || barColor;
              return (
                <View key={i} style={[styles.barGroup, { width: barWidth, marginHorizontal: gap / 2 }]}>
                  {/* Value above bar */}
                  {showValues && item.value > 0 && (
                    <Text style={styles.barValue} numberOfLines={1}>
                      {formatAxis(item.value)}
                    </Text>
                  )}
                  {/* Bar */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        width: barWidth,
                        backgroundColor: color,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X-axis labels */}
      <View style={[styles.xAxis, { paddingLeft: 36 }]}>
        {data.map((item, i) => (
          <View key={i} style={[styles.xLabelContainer, { width: barWidth + gap }]}>
            <Text style={styles.xLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textHint,
    fontSize: FontSize.sm,
  },
  chartArea: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 36,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  yLabel: {
    fontSize: 8,
    color: Colors.textHint,
  },
  chartBody: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    paddingTop: 16,
  },
  barGroup: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 0,
  },
  barValue: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  bar: {
    minHeight: 2,
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 4,
  },
  xLabelContainer: {
    alignItems: 'center',
  },
  xLabel: {
    fontSize: 8,
    color: Colors.textHint,
    textAlign: 'center',
  },
});
