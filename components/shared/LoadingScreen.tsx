import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface Props {
  message?: string;
  isError?: boolean;
}

export default function LoadingScreen({ message = 'Memuat...', isError = false }: Props) {
  // ─── Animation values ───
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const dotScale1 = useRef(new Animated.Value(0.4)).current;
  const dotScale2 = useRef(new Animated.Value(0.4)).current;
  const dotScale3 = useRef(new Animated.Value(0.4)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Logo entrance: scale up + fade in with spring
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text slide up + fade in (after logo)
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Shimmer glow on logo (subtle pulse)
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Loading dots bounce animation
    if (!isError) {
      const dotAnimation = (dot: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.4,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );

      dotAnimation(dotScale1, 0).start();
      dotAnimation(dotScale2, 200).start();
      dotAnimation(dotScale3, 400).start();
    }
  }, []);

  return (
    <View style={styles.root}>
      {/* Subtle radial glow behind logo */}
      <Animated.View style={[styles.glow, { opacity: shimmerOpacity }]} />

      {/* Logo with spring animation */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoShadow}>
          <Image
            source={require('@/assets/toko-kurnia.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      {/* App name & tagline */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>POS Toko Kurnia</Text>
        <Text style={styles.tagline}>Sistem Kasir Modern & Handal</Text>
      </Animated.View>

      {/* Loading indicator or error */}
      <Animated.View
        style={[
          styles.bottomSection,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        {isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{message}</Text>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            {/* Animated dots */}
            <View style={styles.dotsRow}>
              <Animated.View style={[styles.dot, { transform: [{ scale: dotScale1 }] }]} />
              <Animated.View style={[styles.dot, styles.dotMiddle, { transform: [{ scale: dotScale2 }] }]} />
              <Animated.View style={[styles.dot, { transform: [{ scale: dotScale3 }] }]} />
            </View>
            <Text style={styles.loadingText}>{message}</Text>
          </View>
        )}
      </Animated.View>

      {/* Version */}
      <Animated.View style={[styles.versionContainer, { opacity: textOpacity }]}>
        <Text style={styles.version}>v1.0.0</Text>
      </Animated.View>
    </View>
  );
}

const LOGO_SIZE = 120;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  // Subtle blue glow behind logo
  glow: {
    position: 'absolute',
    width: LOGO_SIZE * 2.5,
    height: LOGO_SIZE * 2.5,
    borderRadius: LOGO_SIZE * 1.25,
    backgroundColor: Colors.primarySoft,
    top: '50%',
    left: '50%',
    marginTop: -(LOGO_SIZE * 2.5) / 2 - 30,
    marginLeft: -(LOGO_SIZE * 2.5) / 2,
  },

  logoContainer: {
    marginBottom: Spacing.lg,
  },

  logoShadow: {
    borderRadius: Radius.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    backgroundColor: '#FFFFFF',
  },

  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: Radius.xl,
  },

  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },

  appName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },

  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textHint,
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },

  bottomSection: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },

  dotMiddle: {
    marginHorizontal: 8,
  },

  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textHint,
    letterSpacing: 0.3,
  },

  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },

  errorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },

  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  versionContainer: {
    position: 'absolute',
    bottom: 40,
  },

  version: {
    fontSize: FontSize.xs,
    color: Colors.textHint,
    letterSpacing: 1,
  },
});
