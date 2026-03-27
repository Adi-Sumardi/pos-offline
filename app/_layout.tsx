import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, StyleSheet } from 'react-native';
import { initDatabase } from '@/db/index';
import { seedDefaultData } from '@/db/seed';
import { AppTheme } from '@/constants/theme';
import LoadingScreen from '@/components/shared/LoadingScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        await seedDefaultData();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!ready) {
    return <LoadingScreen message="Memuat aplikasi..." />;
  }

  if (error) {
    return <LoadingScreen message={`Error: ${error}`} isError />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={AppTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(kasir)" />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
