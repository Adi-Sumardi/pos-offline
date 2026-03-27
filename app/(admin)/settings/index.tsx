import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import {
  Text, TextInput, Button, Divider, Surface, List,
  Portal, Modal, ActivityIndicator,
} from 'react-native-paper';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllSettings, setSettings } from '@/db/queries/settings';
import { closeDatabase, initDatabase } from '@/db/index';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { formatDateTime } from '@/utils/date';

const DB_NAME = 'pos_toko_kurnia.db';

function getDbPath(): string {
  return `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
}

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [paperSize, setPaperSize] = useState('58mm');
  const [saving, setSaving] = useState(false);

  // Backup/Restore states
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const s = await getAllSettings();
    setStoreName(s.store_name ?? '');
    setStoreAddress(s.store_address ?? '');
    setStorePhone(s.store_phone ?? '');
    setReceiptFooter(s.receipt_footer ?? '');
    setPaperSize(s.paper_size ?? '58mm');

    // Check last backup
    try {
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const info = await FileSystem.getInfoAsync(backupDir);
      if (info.exists) {
        const files = await FileSystem.readDirectoryAsync(backupDir);
        const dbFiles = files.filter((f) => f.endsWith('.db')).sort().reverse();
        if (dbFiles.length > 0) {
          // Extract timestamp from filename
          const match = dbFiles[0].match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
          if (match) {
            setLastBackup(match[1].replace('_', ' ').replace(/-/g, (m, offset) => offset > 4 ? ':' : '-'));
          }
        }
      }
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setSettings({
        store_name: storeName,
        store_address: storeAddress,
        store_phone: storePhone,
        receipt_footer: receiptFooter,
        paper_size: paperSize,
      });
      Alert.alert('Berhasil', 'Pengaturan disimpan');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    Alert.alert(
      'Backup Data',
      'Buat backup database ke penyimpanan lokal?\n\nFile backup akan berisi seluruh data (produk, transaksi, member, dll).',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            setBackingUp(true);
            try {
              const dbPath = getDbPath();
              const dbInfo = await FileSystem.getInfoAsync(dbPath);
              if (!dbInfo.exists) {
                throw new Error('Database file tidak ditemukan');
              }

              // Create backups directory
              const backupDir = `${FileSystem.documentDirectory}backups/`;
              await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

              // Generate backup filename with timestamp
              const now = new Date();
              const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
              const backupFileName = `backup_${timestamp}.db`;
              const backupPath = `${backupDir}${backupFileName}`;

              // Copy database to backup location
              await FileSystem.copyAsync({
                from: dbPath,
                to: backupPath,
              });

              setLastBackup(now.toISOString());

              // Share the backup file
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                Alert.alert(
                  'Backup Berhasil! ✅',
                  `File: ${backupFileName}\nUkuran: ${((dbInfo as any).size / 1024).toFixed(1)} KB\n\nIngin share/simpan file backup?`,
                  [
                    { text: 'Nanti', style: 'cancel' },
                    {
                      text: 'Share/Simpan',
                      onPress: async () => {
                        await Sharing.shareAsync(backupPath, {
                          mimeType: 'application/x-sqlite3',
                          dialogTitle: `Backup POS - ${timestamp}`,
                        });
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Backup Berhasil! ✅', `File disimpan: ${backupFileName}`);
              }
            } catch (e: any) {
              Alert.alert('Backup Gagal', e.message);
            } finally {
              setBackingUp(false);
            }
          },
        },
      ]
    );
  }

  async function handleRestore() {
    Alert.alert(
      '⚠️ Restore Data',
      'PERHATIAN: Restore akan MENGGANTI SEMUA data yang ada saat ini dengan data dari file backup.\n\nPastikan Anda sudah backup data terbaru sebelum melakukan restore.\n\nLanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pilih File Backup',
          style: 'destructive',
          onPress: async () => {
            try {
              // Pick a file
              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }

              const pickedFile = result.assets[0];

              // Validate file extension
              if (!pickedFile.name?.endsWith('.db')) {
                Alert.alert('Error', 'File harus berformat .db (SQLite database)');
                return;
              }

              // Confirm again
              Alert.alert(
                'Konfirmasi Restore',
                `File: ${pickedFile.name}\nUkuran: ${((pickedFile.size || 0) / 1024).toFixed(1)} KB\n\nYakin ingin restore? Data lama akan HILANG.`,
                [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'Restore Sekarang',
                    style: 'destructive',
                    onPress: async () => {
                      setRestoring(true);
                      try {
                        // Close current database
                        await closeDatabase();

                        const dbPath = getDbPath();

                        // Backup current database first (safety)
                        const safetyBackupDir = `${FileSystem.documentDirectory}backups/`;
                        await FileSystem.makeDirectoryAsync(safetyBackupDir, { intermediates: true });
                        const safetyPath = `${safetyBackupDir}pre_restore_${Date.now()}.db`;

                        const currentDbInfo = await FileSystem.getInfoAsync(dbPath);
                        if (currentDbInfo.exists) {
                          await FileSystem.copyAsync({
                            from: dbPath,
                            to: safetyPath,
                          });
                        }

                        // Replace database with backup
                        await FileSystem.copyAsync({
                          from: pickedFile.uri,
                          to: dbPath,
                        });

                        // Re-initialize database
                        await initDatabase();
                        await load();

                        Alert.alert(
                          'Restore Berhasil! ✅',
                          'Data berhasil dipulihkan dari backup.\nSilakan restart aplikasi untuk memastikan semua data termuat dengan benar.',
                          [
                            {
                              text: 'OK - Logout',
                              onPress: () => {
                                logout();
                                router.replace('/(auth)/login');
                              },
                            },
                          ]
                        );
                      } catch (e: any) {
                        // Try to re-initialize the database
                        try { await initDatabase(); } catch {}
                        Alert.alert('Restore Gagal', e.message);
                      } finally {
                        setRestoring(false);
                      }
                    },
                  },
                ]
              );
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  function handleLogout() {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: () => { logout(); router.replace('/(auth)/login'); },
      },
    ]);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Informasi Toko</Text>
      <TextInput label="Nama Toko" value={storeName} onChangeText={setStoreName}
        mode="outlined" style={styles.input} />
      <TextInput label="Alamat Toko" value={storeAddress} onChangeText={setStoreAddress}
        mode="outlined" multiline style={styles.input} />
      <TextInput label="Nomor Telepon" value={storePhone} onChangeText={setStorePhone}
        mode="outlined" keyboardType="phone-pad" style={styles.input} />

      <Divider style={styles.divider} />
      <Text style={styles.section}>Pengaturan Struk</Text>
      <TextInput label="Footer Struk" value={receiptFooter} onChangeText={setReceiptFooter}
        mode="outlined" style={styles.input} />

      <Text style={styles.label}>Ukuran Kertas</Text>
      <View style={styles.paperRow}>
        {['58mm', '80mm'].map((p) => (
          <Button key={p} mode={paperSize === p ? 'contained' : 'outlined'}
            onPress={() => setPaperSize(p)} style={styles.paperBtn}
            buttonColor={paperSize === p ? Colors.primary : undefined}>
            {p}
          </Button>
        ))}
      </View>

      <Button mode="contained" onPress={handleSave} loading={saving}
        style={styles.saveBtn} buttonColor={Colors.primary}
        contentStyle={{ paddingVertical: 6 }}>
        Simpan Pengaturan
      </Button>

      <Divider style={styles.divider} />
      <Text style={styles.section}>Akun & Keamanan</Text>

      <Surface style={styles.menuCard} elevation={1}>
        <List.Item
          title="Manajemen Pengguna"
          description="Tambah / edit akun kasir"
          left={(p) => <List.Icon {...p} icon="account-multiple" color={Colors.primary} />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/(admin)/users' as any)}
        />
      </Surface>

      <Divider style={styles.divider} />
      <Text style={styles.section}>Backup & Restore</Text>

      <Surface style={styles.menuCard} elevation={1}>
        <List.Item
          title="Backup Data"
          description={lastBackup ? `Terakhir: ${formatDateTime(lastBackup)}` : 'Belum pernah backup'}
          left={(p) => <List.Icon {...p} icon="database-export" color={Colors.success} />}
          right={(p) =>
            backingUp
              ? <ActivityIndicator size={20} color={Colors.success} style={{ marginRight: 8 }} />
              : <List.Icon {...p} icon="chevron-right" />
          }
          onPress={backingUp ? undefined : handleBackup}
        />
        <Divider />
        <List.Item
          title="Restore Data"
          description="Pulihkan dari file backup (.db)"
          left={(p) => <List.Icon {...p} icon="database-import" color={Colors.warning} />}
          right={(p) =>
            restoring
              ? <ActivityIndicator size={20} color={Colors.warning} style={{ marginRight: 8 }} />
              : <List.Icon {...p} icon="chevron-right" />
          }
          onPress={restoring ? undefined : handleRestore}
        />
      </Surface>

      <Text style={styles.backupHint}>
        💡 Backup secara berkala untuk menghindari kehilangan data. File backup dapat disimpan ke Google Drive, dikirim via WhatsApp, atau dipindahkan ke komputer.
      </Text>

      <Divider style={styles.divider} />

      <Surface style={styles.menuCard} elevation={1}>
        <List.Item
          title="Tentang Aplikasi"
          description="POS Toko Kurnia v1.0.0"
          left={(p) => <List.Icon {...p} icon="information" color={Colors.info} />}
        />
      </Surface>

      <Button mode="outlined" onPress={handleLogout}
        style={styles.logoutBtn} textColor={Colors.danger}>
        Logout
      </Button>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  section: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  divider: { marginVertical: Spacing.md },
  paperRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  paperBtn: { flex: 1, borderRadius: Radius.md },
  saveBtn: { borderRadius: Radius.md },
  menuCard: { borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden', marginBottom: Spacing.md },
  logoutBtn: { borderRadius: Radius.md, borderColor: Colors.danger, marginTop: Spacing.sm },
  backupHint: {
    fontSize: FontSize.xs,
    color: Colors.textHint,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
