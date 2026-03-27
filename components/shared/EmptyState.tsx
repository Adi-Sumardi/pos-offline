import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ title, subtitle }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textHint,
    textAlign: 'center',
  },
});
