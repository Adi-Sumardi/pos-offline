import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role === 'admin') return <Redirect href="/(admin)" />;
  return <Redirect href="/(kasir)" />;
}
