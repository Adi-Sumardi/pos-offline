import { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Text, TextInput, Button, SegmentedButtons,
  Switch, Divider, Portal, Modal, Icon,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getProductById, createProduct, updateProduct, adjustStock } from '@/db/queries/products';
import { getDb } from '@/db/index';
import { categories } from '@/db/schema';
import type { Product } from '@/db/schema';
import { useAuthStore } from '@/stores/useAuthStore';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { generateSku, generateTrxCode } from '@/utils/trxCode';
import { parseRupiah, formatNumber } from '@/utils/currency';
import QRCode from 'react-native-qrcode-svg';
import { printSingleQr } from '@/utils/qrPrint';

type UnitType = 'piece' | 'bulk_small' | 'liquid';

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const adminId = useAuthStore((s) => s.user!.id);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [unitType, setUnitType] = useState<UnitType>('piece');
  const [qtyStep, setQtyStep] = useState('1');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [catList, setCatList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Stok opname modal
  const [showOpname, setShowOpname] = useState(false);
  const [opnameStock, setOpnameStock] = useState('');
  const [opnameNotes, setOpnameNotes] = useState('');

  // QR Code
  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    loadCategories();
    if (!isNew) loadProduct();
  }, [id]);

  async function loadCategories() {
    const db = getDb();
    const cats = await db.select().from(categories);
    setCatList(cats);
    if (isNew && cats.length > 0) setCategoryId(cats[0].id);
  }

  async function loadProduct() {
    const p = await getProductById(Number(id));
    if (!p) return;
    setName(p.name);
    setSku(p.sku);
    setBrand(p.brand ?? '');
    setPrice(formatNumber(p.price));
    setCostPrice(formatNumber(p.costPrice));
    setStock(String(p.stock));
    setMinStock(String(p.minStock));
    setUnit(p.unit);
    setUnitType(p.unitType as UnitType);
    setQtyStep(String(p.qtyStep));
    setLocation(p.location ?? '');
    setNotes(p.notes ?? '');
    setIsActive(p.isActive);
    setCategoryId(p.categoryId ?? null);
  }

  // Auto set unit & qtyStep saat unitType berubah
  function onUnitTypeChange(val: string) {
    const t = val as UnitType;
    setUnitType(t);
    if (t === 'liquid') { setUnit('liter'); setQtyStep('0.5'); }
    else if (t === 'bulk_small') { setUnit('pcs'); setQtyStep('1'); }
    else { setUnit('pcs'); setQtyStep('1'); }
  }

  async function handleSave() {
    const parsedPrice = parseRupiah(price);
    const parsedStock = parseFloat(stock);
    const parsedMinStock = parseFloat(minStock);
    const parsedQtyStep = parseFloat(qtyStep);

    if (!name.trim() || !sku.trim() || !price) {
      Alert.alert('Error', 'Nama, SKU, dan Harga wajib diisi');
      return;
    }
    if (parsedPrice <= 0) {
      Alert.alert('Error', 'Harga jual harus lebih dari 0');
      return;
    }
    if (isNew && (isNaN(parsedStock) || parsedStock < 0)) {
      Alert.alert('Error', 'Stok awal tidak valid (harus angka ≥ 0)');
      return;
    }
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      Alert.alert('Error', 'Stok minimum tidak valid');
      return;
    }
    if (isNaN(parsedQtyStep) || parsedQtyStep <= 0) {
      Alert.alert('Error', 'Kelipatan qty tidak valid (harus > 0)');
      return;
    }
    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        brand: brand.trim() || null,
        price: parsedPrice,
        costPrice: parseRupiah(costPrice),
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        minStock: isNaN(parsedMinStock) ? 5 : parsedMinStock,
        unit: unit.trim(),
        unitType,
        qtyStep: isNaN(parsedQtyStep) ? 1 : parsedQtyStep,
        location: location.trim() || null,
        notes: notes.trim() || null,
        isActive,
        categoryId,
      };

      if (isNew) {
        await createProduct(data as any, adminId);
        Alert.alert('Berhasil', 'Produk berhasil ditambahkan', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await updateProduct(Number(id), data, adminId);
        Alert.alert('Berhasil', 'Produk berhasil diperbarui', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpname() {
    const newStock = parseFloat(opnameStock);
    if (isNaN(newStock) || newStock < 0) {
      Alert.alert('Error', 'Masukkan stok yang valid');
      return;
    }
    if (!opnameNotes.trim()) {
      Alert.alert('Error', 'Catatan alasan wajib diisi');
      return;
    }
    try {
      await adjustStock(Number(id), adminId, newStock, opnameNotes);
      setStock(String(newStock));
      setShowOpname(false);
      setOpnameStock('');
      setOpnameNotes('');
      Alert.alert('Berhasil', 'Stok berhasil disesuaikan');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  const catOptions = catList.map((c) => ({ label: c.name, value: String(c.id) }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.section}>Informasi Produk</Text>

        <TextInput label="Nama Produk *" value={name} onChangeText={setName}
          mode="outlined" style={styles.input} />

        <TextInput label="SKU *" value={sku} onChangeText={(t) => setSku(t.toUpperCase())}
          mode="outlined" style={styles.input}
          autoCapitalize="characters" />

        <TextInput label="Merek / Brand" value={brand} onChangeText={setBrand}
          mode="outlined" style={styles.input} />

        {/* Kategori */}
        <Text style={styles.label}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {catList.map((c) => (
            <View key={c.id} style={{ marginRight: 8 }}>
              <Button
                mode={categoryId === c.id ? 'contained' : 'outlined'}
                compact
                onPress={() => setCategoryId(c.id)}
                style={{ borderRadius: Radius.full }}
              >
                {c.name}
              </Button>
            </View>
          ))}
        </ScrollView>

        <Divider style={styles.divider} />
        <Text style={styles.section}>Jenis & Satuan</Text>

        <Text style={styles.label}>Tipe Produk</Text>
        <SegmentedButtons
          value={unitType}
          onValueChange={onUnitTypeChange}
          buttons={[
            { value: 'piece', label: 'Satuan' },
            { value: 'bulk_small', label: 'Eceran' },
            { value: 'liquid', label: 'Cair/Liter' },
          ]}
          style={styles.segment}
        />

        <View style={styles.row}>
          <TextInput label="Satuan" value={unit} onChangeText={setUnit}
            mode="outlined" style={[styles.input, { flex: 1 }]} />
          <TextInput label="Kelipatan Qty" value={qtyStep}
            onChangeText={setQtyStep} mode="outlined"
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1, marginLeft: 8 }]} />
        </View>

        <Divider style={styles.divider} />
        <Text style={styles.section}>Harga & Stok</Text>

        <TextInput label="Harga Jual (Rp) *" value={price}
          onChangeText={setPrice} mode="outlined"
          keyboardType="number-pad" style={styles.input}
          left={<TextInput.Affix text="Rp" />} />

        <TextInput label="HPP / Harga Beli (Rp)" value={costPrice}
          onChangeText={setCostPrice} mode="outlined"
          keyboardType="number-pad" style={styles.input}
          left={<TextInput.Affix text="Rp" />} />

        <View style={styles.row}>
          <TextInput label={isNew ? 'Stok Awal' : 'Stok Saat Ini'}
            value={stock} onChangeText={setStock}
            mode="outlined" keyboardType="decimal-pad"
            style={[styles.input, { flex: 1 }]}
            editable={isNew} />
          <TextInput label="Stok Minimum" value={minStock}
            onChangeText={setMinStock} mode="outlined"
            keyboardType="decimal-pad"
            style={[styles.input, { flex: 1, marginLeft: 8 }]} />
        </View>

        {!isNew && (
          <Button mode="outlined" onPress={() => setShowOpname(true)}
            style={styles.opnameBtn} icon="tune">
            Stok Opname
          </Button>
        )}

        <Divider style={styles.divider} />
        <Text style={styles.section}>Informasi Tambahan</Text>

        <TextInput label="Lokasi Rak (contoh: A1, B2-atas)"
          value={location} onChangeText={setLocation}
          mode="outlined" style={styles.input} />

        <TextInput label="Catatan" value={notes} onChangeText={setNotes}
          mode="outlined" multiline numberOfLines={3} style={styles.input} />

        <View style={styles.switchRow}>
          <Text>Produk Aktif</Text>
          <Switch value={isActive} onValueChange={setIsActive} color={Colors.primary} />
        </View>

        {/* QR Code Section — hanya untuk produk yang sudah tersimpan */}
        {!isNew && sku ? (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.section}>QR Code Produk</Text>

            <View style={styles.qrContainer}>
              <View style={styles.qrCard}>
                <QRCode
                  value={sku}
                  size={180}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                  getRef={(ref: any) => (qrRef.current = ref)}
                />
                <Text style={styles.qrSku}>{sku}</Text>
                <Text style={styles.qrName} numberOfLines={1}>{name}</Text>
              </View>

              <View style={styles.qrActions}>
                <Button
                  mode="contained"
                  icon="printer"
                  buttonColor={Colors.primary}
                  style={styles.qrBtn}
                  onPress={async () => {
                    try {
                      await printSingleQr({ sku, name, price: parseRupiah(price) });
                    } catch (e: any) {
                      Alert.alert('Error', e.message);
                    }
                  }}
                >
                  Cetak Label
                </Button>
                <Button
                  mode="outlined"
                  icon="information-outline"
                  style={styles.qrBtn}
                  onPress={() => {
                    Alert.alert('QR Code', `SKU produk ini: ${sku}\n\nScan QR ini di halaman kasir untuk menambahkan produk ke keranjang.`);
                  }}
                >
                  Info QR
                </Button>
              </View>
            </View>
          </>
        ) : null}

        <Button mode="contained" onPress={handleSave} loading={loading}
          style={styles.saveBtn} buttonColor={Colors.primary}
          contentStyle={{ paddingVertical: 6 }}>
          {isNew ? 'Tambah Produk' : 'Simpan Perubahan'}
        </Button>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Stok Opname Modal */}
      <Portal>
        <Modal visible={showOpname} onDismiss={() => setShowOpname(false)}
          contentContainerStyle={styles.modal}>
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>Stok Opname</Text>
          <Text style={styles.modalSub}>Stok saat ini: {stock}</Text>
          <TextInput label="Stok Aktual (hasil hitung fisik)"
            value={opnameStock} onChangeText={setOpnameStock}
            mode="outlined" keyboardType="decimal-pad" style={styles.input} />
          <TextInput label="Alasan / Catatan *"
            value={opnameNotes} onChangeText={setOpnameNotes}
            mode="outlined" multiline style={styles.input} />
          <View style={styles.row}>
            <Button mode="outlined" onPress={() => setShowOpname(false)} style={{ flex: 1 }}>
              Batal
            </Button>
            <Button mode="contained" onPress={handleOpname}
              style={{ flex: 1, marginLeft: 8 }} buttonColor={Colors.primary}>
              Simpan
            </Button>
          </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  section: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  row: { flexDirection: 'row' },
  chipScroll: { marginBottom: Spacing.md },
  segment: { marginBottom: Spacing.md },
  divider: { marginVertical: Spacing.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  opnameBtn: { marginBottom: Spacing.sm, borderColor: Colors.primary },
  saveBtn: { marginTop: Spacing.sm, borderRadius: Radius.md },
  modal: { backgroundColor: Colors.surface, margin: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.lg, paddingTop: Spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  qrContainer: { alignItems: 'center', marginBottom: Spacing.md },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  qrSku: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.sm },
  qrName: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, maxWidth: 200 },
  qrActions: { flexDirection: 'row', gap: Spacing.sm },
  qrBtn: { borderRadius: Radius.md, flex: 1 },
});
