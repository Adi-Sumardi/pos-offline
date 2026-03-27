import { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView,
  Platform, Image, Dimensions, Animated,
} from 'react-native';
import { Text, TextInput, Button, HelperText, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { getDb } from '@/db/index';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyPin } from '@/db/seed';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);

  // ─── Animations ───
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo spring in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Card slide up
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  async function handleLogin() {
    if (!username.trim() || !pin.trim()) {
      setError('Username dan PIN wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const db = getDb();
      const normalizedUsername = username.trim().toLowerCase();
      const result = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.username}) = ${normalizedUsername}`)
        .limit(1);

      const user = result[0];
      if (!user || !user.isActive) {
        setError('Username tidak ditemukan atau akun nonaktif');
        return;
      }

      const valid = await verifyPin(pin, user.pinHash);
      if (!valid) {
        setError('PIN salah, coba lagi');
        return;
      }

      login(user);
      if (user.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(kasir)');
      }
    } catch (e: any) {
      setError('Gagal login: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.bg}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
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

        {/* Card */}
        <Animated.View
          style={[
            styles.cardOuter,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Surface style={[styles.card, isTablet && styles.cardTablet]} elevation={0}>
            <Text style={styles.title}>
              Selamat Datang
            </Text>
            <Text style={styles.subtitle}>
              Masuk untuk mengelola toko Anda
            </Text>

            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" />}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
              outlineStyle={{ borderRadius: Radius.md }}
            />

            <TextInput
              label="PIN"
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="lock-outline" />}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
              outlineStyle={{ borderRadius: Radius.md }}
              onSubmitEditing={handleLogin}
            />

            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={styles.btnContent}
              buttonColor={Colors.primary}
              labelStyle={styles.btnLabel}
            >
              Masuk
            </Button>

          </Surface>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bg: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },

  logoWrap: {
    marginBottom: Spacing.xl,
  },

  logoShadow: {
    borderRadius: Radius.xl,
    ...Shadow.lg,
    backgroundColor: '#FFFFFF',
  },

  logo: {
    width: 100,
    height: 100,
    borderRadius: Radius.xl,
  },

  cardOuter: {
    width: '100%',
    maxWidth: 420,
  },

  card: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTablet: {
    maxWidth: 460,
  },

  title: {
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: FontSize.xl,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textHint,
    marginBottom: Spacing.lg,
    fontSize: FontSize.sm,
  },

  input: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },

  errorText: {
    marginBottom: Spacing.xs,
  },

  btn: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    elevation: 0,
  },
  btnContent: {
    paddingVertical: Spacing.xs + 2,
  },
  btnLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});
