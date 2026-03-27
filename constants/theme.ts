import { MD3LightTheme } from 'react-native-paper';

// ═══════════════════════════════════════════════════════
// Color Palette — White & Blue (Clean, Elegant, Professional)
// ═══════════════════════════════════════════════════════
export const Colors = {
  // Brand blues
  primary:       '#2563EB',   // Vibrant blue — primary actions
  primaryLight:  '#3B82F6',   // Lighter blue — hover/pressed
  primaryDark:   '#1D4ED8',   // Deep blue — headers
  primarySoft:   '#EFF6FF',   // Very soft blue — tinted backgrounds
  primaryMuted:  '#DBEAFE',   // Muted blue — chips, tags, badges

  // Accent
  accent:        '#F59E0B',   // Amber — CTA, highlights
  accentLight:   '#FCD34D',

  // Status
  success:       '#10B981',
  successLight:  '#D1FAE5',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  danger:        '#EF4444',
  dangerLight:   '#FEE2E2',
  info:          '#3B82F6',
  infoLight:     '#DBEAFE',

  // Neutrals — clean white foundation
  background:    '#F8FAFC',   // Very subtle cool gray
  surface:       '#FFFFFF',   // Pure white cards
  surfaceVariant:'#F1F5F9',   // Light gray variant
  border:        '#E2E8F0',   // Soft border
  divider:       '#F1F5F9',   // Very light divider

  // Typography
  textPrimary:   '#0F172A',   // Slate 900 — sharp contrast
  textSecondary: '#64748B',   // Slate 500 — secondary
  textHint:      '#94A3B8',   // Slate 400 — hints, placeholders
  textOnPrimary: '#FFFFFF',   // White on blue
  textOnAccent:  '#FFFFFF',

  // Debt status
  debtSafe:      '#10B981',
  debtWarn:      '#F59E0B',
  debtCritical:  '#EF4444',
  debtBlocked:   '#DC2626',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs:    11,
  sm:    13,
  md:    15,
  lg:    17,
  xl:    20,
  xxl:   24,
  xxxl:  30,
};

export const Shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary:          Colors.primary,
    primaryContainer: Colors.primaryMuted,
    secondary:        Colors.accent,
    background:       Colors.background,
    surface:          Colors.surface,
    surfaceVariant:   Colors.surfaceVariant,
    error:            Colors.danger,
    outline:          Colors.border,
  },
};
