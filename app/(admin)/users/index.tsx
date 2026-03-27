import { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Text, Surface, Button, Portal, Modal, Icon,
  ActivityIndicator, Switch, Chip, Divider,
} from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import {
  getAllUsers, createUser, updateUser,
  resetUserPin, deactivateUser,
} from '@/db/queries/users';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { formatDateTime } from '@/utils/date';

type UserRow = Awaited<ReturnType<typeof getAllUsers>>[0];

export default function UserManagementScreen() {
  const currentUser = useAuthStore((s) => s.user!);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'kasir'>('kasir');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reset PIN modal
  const [showResetPin, setShowResetPin] = useState<UserRow | null>(null);
  const [newPin, setNewPin] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormPin('');
    setFormRole('kasir');
    setFormActive(true);
    setShowForm(true);
  }

  function openEditForm(user: UserRow) {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormFullName(user.fullName);
    setFormPin('');
    setFormRole(user.role as 'admin' | 'kasir');
    setFormActive(user.isActive);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formFullName.trim()) {
      Alert.alert('Error', 'Nama lengkap wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        // Update
        await updateUser(editingUser.id, {
          fullName: formFullName.trim(),
          role: formRole,
          isActive: formActive,
        });
        Alert.alert('Berhasil', 'Data pengguna diperbarui');
      } else {
        // Create
        if (!formUsername.trim()) {
          Alert.alert('Error', 'Username wajib diisi');
          setSaving(false);
          return;
        }
        if (!formPin || formPin.length < 4) {
          Alert.alert('Error', 'PIN minimal 4 digit');
          setSaving(false);
          return;
        }
        await createUser({
          username: formUsername.trim().toLowerCase(),
          fullName: formFullName.trim(),
          pin: formPin,
          role: formRole,
        });
        Alert.alert('Berhasil', `Pengguna "${formFullName}" berhasil dibuat\nPIN: ${formPin}`);
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPin() {
    if (!showResetPin) return;
    if (!newPin || newPin.length < 4) {
      Alert.alert('Error', 'PIN baru minimal 4 digit');
      return;
    }
    try {
      await resetUserPin(showResetPin.id, newPin);
      Alert.alert('Berhasil', `PIN untuk "${showResetPin.fullName}" berhasil direset`);
      setShowResetPin(null);
      setNewPin('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function handleDeactivate(user: UserRow) {
    if (user.id === currentUser.id) {
      Alert.alert('Error', 'Tidak bisa menonaktifkan akun sendiri');
      return;
    }
    Alert.alert(
      'Nonaktifkan Pengguna',
      `Yakin nonaktifkan "${user.fullName}"?\nPengguna tidak akan bisa login.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Nonaktifkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateUser(user.id);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  function renderUser({ item }: { item: UserRow }) {
    const isSelf = item.id === currentUser.id;
    return (
      <Surface style={[styles.card, !item.isActive && styles.inactiveCard]} elevation={1}>
        <TouchableOpacity onPress={() => openEditForm(item)} activeOpacity={0.7}>
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <Icon
                source={item.role === 'admin' ? 'shield-account' : 'account'}
                size={24}
                color={item.isActive ? Colors.primary : Colors.textHint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, !item.isActive && styles.inactiveText]}>
                  {item.fullName}
                </Text>
                {isSelf && (
                  <Chip compact style={styles.selfChip} textStyle={styles.selfChipText}>
                    Anda
                  </Chip>
                )}
              </View>
              <Text style={styles.userSub}>@{item.username}</Text>
              <View style={styles.metaRow}>
                <Chip
                  compact
                  style={[
                    styles.roleChip,
                    { backgroundColor: item.role === 'admin' ? Colors.infoLight : Colors.successLight },
                  ]}
                  textStyle={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: item.role === 'admin' ? Colors.info : Colors.success,
                  }}
                >
                  {item.role.toUpperCase()}
                </Chip>
                {!item.isActive && (
                  <Chip compact style={styles.inactiveChip} textStyle={styles.inactiveChipText}>
                    NONAKTIF
                  </Chip>
                )}
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { setShowResetPin(item); setNewPin(''); }}
              >
                <Icon source="lock-reset" size={18} color={Colors.warning} />
              </TouchableOpacity>
              {!isSelf && item.isActive && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDeactivate(item)}
                >
                  <Icon source="account-off" size={18} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Surface>
    );
  }

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'admin' && u.isActive).length;
  const kasirCount = users.filter((u) => u.role === 'kasir' && u.isActive).length;

  return (
    <View style={styles.root}>
      {/* Summary */}
      <Surface style={styles.summary} elevation={1}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Aktif</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: Colors.info }]}>{adminCount}</Text>
            <Text style={styles.summaryLabel}>Admin</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: Colors.success }]}>{kasirCount}</Text>
            <Text style={styles.summaryLabel}>Kasir</Text>
          </View>
        </View>
      </Surface>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ color: Colors.textHint }}>Belum ada pengguna</Text>
            </View>
          }
        />
      )}

      {/* FAB tambah user */}
      <TouchableOpacity style={styles.fab} onPress={openCreateForm} activeOpacity={0.8}>
        <Icon source="account-plus" size={26} color={Colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Form Modal */}
      <Portal>
        <Modal
          visible={showForm}
          onDismiss={() => setShowForm(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>
            {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
          </Text>

          {!editingUser && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Username</Text>
              <RNTextInput
                value={formUsername}
                onChangeText={setFormUsername}
                placeholder="contoh: kasir2"
                style={styles.textInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nama Lengkap</Text>
            <RNTextInput
              value={formFullName}
              onChangeText={setFormFullName}
              placeholder="Nama lengkap"
              style={styles.textInput}
            />
          </View>

          {!editingUser && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PIN (min. 4 digit)</Text>
              <RNTextInput
                value={formPin}
                onChangeText={setFormPin}
                placeholder="Masukkan PIN"
                style={styles.textInput}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              <Button
                mode={formRole === 'kasir' ? 'contained' : 'outlined'}
                onPress={() => setFormRole('kasir')}
                style={{ flex: 1 }}
                buttonColor={formRole === 'kasir' ? Colors.success : undefined}
                compact
              >
                Kasir
              </Button>
              <Button
                mode={formRole === 'admin' ? 'contained' : 'outlined'}
                onPress={() => setFormRole('admin')}
                style={{ flex: 1 }}
                buttonColor={formRole === 'admin' ? Colors.info : undefined}
                compact
              >
                Admin
              </Button>
            </View>
          </View>

          {editingUser && (
            <View style={styles.switchRow}>
              <Text style={{ fontSize: FontSize.sm }}>Akun Aktif</Text>
              <Switch
                value={formActive}
                onValueChange={setFormActive}
                color={Colors.primary}
              />
            </View>
          )}

          <View style={styles.btnRow}>
            <Button
              mode="outlined"
              onPress={() => setShowForm(false)}
              style={{ flex: 1, borderRadius: Radius.md }}
            >
              Batal
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              style={{ flex: 1, borderRadius: Radius.md }}
              buttonColor={Colors.primary}
            >
              {editingUser ? 'Simpan' : 'Buat Akun'}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Reset PIN Modal */}
      <Portal>
        <Modal
          visible={!!showResetPin}
          onDismiss={() => setShowResetPin(null)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>Reset PIN</Text>
          <Text style={styles.modalSub}>
            Reset PIN untuk: {showResetPin?.fullName}
          </Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PIN Baru (min. 4 digit)</Text>
            <RNTextInput
              value={newPin}
              onChangeText={setNewPin}
              placeholder="Masukkan PIN baru"
              style={styles.textInput}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              autoFocus
            />
          </View>
          <View style={styles.btnRow}>
            <Button
              mode="outlined"
              onPress={() => setShowResetPin(null)}
              style={{ flex: 1, borderRadius: Radius.md }}
            >
              Batal
            </Button>
            <Button
              mode="contained"
              onPress={handleResetPin}
              style={{ flex: 1, borderRadius: Radius.md }}
              buttonColor={Colors.warning}
            >
              Reset PIN
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  summary: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryGrid: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  list: { padding: Spacing.md, paddingBottom: 80 },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  inactiveCard: { opacity: 0.55 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  inactiveText: { color: Colors.textHint },
  userSub: { fontSize: FontSize.xs, color: Colors.textHint, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  roleChip: { height: 18 },
  selfChip: { backgroundColor: Colors.primaryLight + '30', height: 18 },
  selfChipText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  inactiveChip: { backgroundColor: Colors.dangerLight, height: 18 },
  inactiveChipText: { fontSize: 9, fontWeight: '700', color: Colors.danger },
  cardActions: { flexDirection: 'column', gap: 8 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  modal: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceVariant,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
