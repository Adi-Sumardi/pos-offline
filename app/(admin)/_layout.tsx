import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors } from '@/constants/theme';

export default function AdminLayout() {
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace('/(auth)/login');
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textHint,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.textOnPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Icon source="logout" size={22} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Icon source="view-dashboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Produk',
          tabBarIcon: ({ color, size }) => <Icon source="package-variant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{
          title: 'Member',
          tabBarIcon: ({ color, size }) => <Icon source="account-group" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports/index"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, size }) => <Icon source="chart-bar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Setting',
          tabBarIcon: ({ color, size }) => <Icon source="cog" size={size} color={color} />,
        }}
      />
      {/* Hidden tabs (tidak tampil di tab bar) */}
      <Tabs.Screen name="discounts/index" options={{ href: null, title: 'Kelola Diskon' }} />
      <Tabs.Screen name="expenses/index" options={{ href: null, title: 'Pengeluaran' }} />
      <Tabs.Screen name="products/[id]" options={{ href: null, title: 'Detail Produk' }} />
      <Tabs.Screen name="customers/[id]" options={{ href: null, title: 'Detail Member' }} />
      <Tabs.Screen name="users/index" options={{ href: null, title: 'Manajemen Pengguna' }} />
    </Tabs>
  );
}
