import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function KasirLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="riwayat" options={{ title: 'Riwayat Transaksi' }} />
      <Stack.Screen name="shift" options={{ title: 'Manajemen Shift', presentation: 'modal' }} />
    </Stack>
  );
}
