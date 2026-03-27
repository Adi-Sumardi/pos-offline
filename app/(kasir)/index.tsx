import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Alert, ScrollView, TextInput as RNTextInput,
} from 'react-native';
import {
  Text, Searchbar, Surface, Icon, Badge,
  Button, Portal, Modal, Chip,
} from 'react-native-paper';
import { router } from 'expo-router';

import { getAllProducts, searchProducts } from '@/db/queries/products';
import { searchCustomers } from '@/db/queries/customers';
import { getActiveDiscounts } from '@/db/queries/discounts';
import { processTransaction } from '@/db/queries/transactions';
import { getOpenShift, openShift } from '@/db/queries/shifts';
import { getDb } from '@/db/index';
import { categories } from '@/db/schema';


import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';

import ProductCard from '@/components/pos/ProductCard';
import QtyModal from '@/components/pos/QtyModal';
import ScannerModal from '@/components/pos/ScannerModal';
import PriceCheckModal from '@/components/pos/PriceCheckModal';
import PaymentModal from '@/components/pos/PaymentModal';
import DiscountModal from '@/components/pos/DiscountModal';

import { formatRupiah, formatQty } from '@/utils/currency';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { printReceipt, shareReceipt, type ReceiptData } from '@/utils/receipt';

import type { Product, Customer, Discount } from '@/db/schema';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const PRODUCT_COL = isTablet ? 3 : 2;

export default function POSScreen() {
  const user = useAuthStore((s) => s.user!);
  const cart = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catList, setCatList] = useState<{ id: number; name: string }[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([]);
  const [shift, setShift] = useState<any>(null);

  // Modal states
  const [qtyProduct, setQtyProduct] = useState<Product | null>(null);
  const [scanVisible, setScanVisible] = useState(false);
  const [priceCheckProduct, setPriceCheckProduct] = useState<Product | null>(null);
  const [priceCheckMode, setPriceCheckMode] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showCart, setShowCart] = useState(false);  // Mobile: drawer
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<Customer[]>([]);

  // Success modal
  const [successTrxCode, setSuccessTrxCode] = useState('');
  const [successReceiptData, setSuccessReceiptData] = useState<ReceiptData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Opening shift modal
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const [prods, cats, discs, sh] = await Promise.all([
      getAllProducts(),
      getDb().select().from(categories),
      getActiveDiscounts(),
      getOpenShift(user.id),
    ]);
    setProducts(prods as unknown as Product[]);
    setCatList(cats);
    setActiveDiscounts(discs as Discount[]);
    setShift(sh);
    if (!sh) setShowOpenShift(true);
  }

  async function doSearch(q: string, catId: number | null) {
    if (!q.trim() && !catId) {
      const data = await getAllProducts();
      setProducts(data as unknown as Product[]);
    } else {
      const data = await searchProducts(q, catId ?? undefined);
      setProducts(data as unknown as Product[]);
    }
  }

  function onSearch(q: string) {
    setSearchQuery(q);
    doSearch(q, selectedCat);
  }

  function onCatSelect(id: number | null) {
    setSelectedCat(id);
    doSearch(searchQuery, id);
  }

  function onProductPress(product: Product) {
    if (product.stock <= 0) {
      Alert.alert('Stok Habis', `${product.name} tidak tersedia saat ini`);
      return;
    }
    if (priceCheckMode) {
      setPriceCheckProduct(product);
      return;
    }
    // Selalu tampilkan QtyModal untuk konfirmasi
    setQtyProduct(product);
  }

  function onQtyConfirm(qty: number) {
    if (qtyProduct) {
      cart.addItem(qtyProduct, qty);
      setQtyProduct(null);
    }
  }

  function onScanFound(product: Product) {
    setScanVisible(false);
    if (priceCheckMode) {
      setPriceCheckProduct(product);
      return;
    }
    if (product.stock <= 0) {
      Alert.alert('Stok Habis', `${product.name} tidak tersedia`);
      return;
    }
    setQtyProduct(product);
  }

  function onScanNotFound(sku: string) {
    setScanVisible(false);
    Alert.alert('Produk Tidak Ditemukan', `SKU: ${sku}\nProduk tidak ditemukan di database`);
  }

  async function onConfirmCash(amountPaid: number) {
    setShowPayment(false);
    await processTrx('cash', amountPaid);
  }

  async function onConfirmDebt() {
    setShowPayment(false);
    await processTrx('debt', cart.getTotal());
  }

  async function processTrx(paymentType: 'cash' | 'debt', amountPaid: number) {
    const subtotal = cart.getSubtotal();
    const total = cart.getTotal();
    const receiptData: ReceiptData = {
      trxCode: '',
      items: cart.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        productUnit: i.product.unit,
        unitPrice: i.product.price,
        subtotal: i.subtotal,
      })),
      subtotal,
      discountName: cart.discount?.name ?? null,
      discountAmount: cart.discountAmount,
      total,
      paymentType,
      amountPaid,
      changeAmount: paymentType === 'cash' ? amountPaid - total : 0,
      customerName: cart.customer?.fullName ?? null,
      cashierName: user.fullName,
      notes: cart.notes,
      createdAt: new Date().toISOString(),
    };
    try {
      const trxCode = await processTransaction({
        items: cart.items,
        customer: cart.customer,
        discount: cart.discount,
        discountAmount: cart.discountAmount,
        paymentType,
        amountPaid,
        notes: cart.notes,
        cashierId: user.id,
      });
      cart.clearCart();
      receiptData.trxCode = trxCode;
      setSuccessTrxCode(trxCode);
      setSuccessReceiptData(receiptData);
      setShowSuccess(true);
    } catch (e: any) {
      Alert.alert('Gagal Transaksi', e.message);
    }
  }

  async function searchMember(q: string) {
    setMemberQuery(q);
    if (q.trim().length < 2) { setMemberResults([]); return; }
    const data = await searchCustomers(q);
    setMemberResults(data);
  }

  async function handleOpenShift() {
    try {
      const balance = parseInt(openingBalance.replace(/\./g, '')) || 0;
      const sh = await openShift(user.id, balance);
      setShift(sh);
      setShowOpenShift(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  const subtotal = cart.getSubtotal();
  const total = cart.getTotal();
  const itemCount = cart.getItemCount();

  // Render product grid item
  function renderProduct({ item }: { item: Product }) {
    return (
      <View style={{ flex: 1 / PRODUCT_COL, padding: 4 }}>
        <ProductCard
          product={item as any}
          onPress={() => onProductPress(item)}
          onLongPress={() => {
            setPriceCheckMode(true);
            setPriceCheckProduct(item);
          }}
        />
      </View>
    );
  }

  // CART PANEL (untuk tablet: inline di kanan, mobile: modal)
  function CartPanel() {
    return (
      <View style={styles.cartPanel}>
        {/* Cart Header */}
        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>Keranjang</Text>
          {cart.items.length > 0 && (
            <TouchableOpacity onPress={() => Alert.alert('Kosongkan Keranjang', 'Yakin?', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Kosongkan', style: 'destructive', onPress: () => cart.clearCart() },
            ])}>
              <Text style={styles.clearCart}>Kosongkan</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cart Items */}
        <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
          {cart.items.length === 0 ? (
            <View style={styles.cartEmpty}>
              <Icon source="cart-outline" size={48} color={Colors.textHint} />
              <Text style={styles.cartEmptyText}>Belum ada produk</Text>
            </View>
          ) : (
            cart.items.map((item) => (
              <View key={item.product.id} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>{formatRupiah(item.product.price)} / {item.product.unit}</Text>
                </View>
                <View style={styles.cartQtyRow}>
                  <TouchableOpacity
                    onPress={() => cart.updateQuantity(item.product.id, item.quantity - item.product.qtyStep)}
                    style={styles.qtyBtn}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{formatQty(item.quantity, item.product.unit)}</Text>
                  <TouchableOpacity
                    onPress={() => cart.updateQuantity(item.product.id, item.quantity + item.product.qtyStep)}
                    style={styles.qtyBtn}
                    disabled={item.quantity >= item.product.stock}
                  >
                    <Text style={[styles.qtyBtnText, item.quantity >= item.product.stock && { color: Colors.textHint }]}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.cartItemSubtotal}>{formatRupiah(item.subtotal)}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Member (hutang) */}
        <TouchableOpacity
          style={styles.memberBtn}
          onPress={() => { setShowMemberSearch(true); setMemberQuery(''); setMemberResults([]); }}
        >
          {cart.customer ? (
            <View style={styles.memberSelected}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{cart.customer.fullName}</Text>
                <Text style={styles.memberSub}>{cart.customer.memberCode}</Text>
              </View>
              <TouchableOpacity onPress={() => cart.setCustomer(null)}>
                <Icon source="close-circle" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.memberPlaceholder}>+ Pilih Member (untuk hutang)</Text>
          )}
        </TouchableOpacity>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>{formatRupiah(subtotal)}</Text>
          </View>

          <TouchableOpacity onPress={() => setShowDiscount(true)} style={styles.discRow}>
            <Text style={[styles.summaryLabel, { color: Colors.accent }]}>
              {cart.discount ? cart.discount.name : '+ Tambah Diskon'}
            </Text>
            {cart.discountAmount > 0 && (
              <Text style={{ color: Colors.success, fontWeight: '700' }}>
                − {formatRupiah(cart.discountAmount)}
              </Text>
            )}
          </TouchableOpacity>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalVal}>{formatRupiah(total)}</Text>
          </View>
        </View>

        {/* Pay Buttons */}
        <View style={styles.payBtnRow}>
          <Button
            mode="contained"
            disabled={cart.items.length === 0}
            onPress={() => setShowPayment(true)}
            style={styles.payBtn}
            buttonColor={Colors.success}
            icon="cash-register"
            labelStyle={{ fontSize: FontSize.md, fontWeight: '800' }}
            contentStyle={{ paddingVertical: 6 }}
          >
            BAYAR
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <Surface style={styles.topBar} elevation={3}>
        <View style={styles.topLeft}>
          <Text style={styles.storeName}>Toko Kurnia</Text>
          <Text style={styles.cashierName}>{user.fullName}</Text>
        </View>
        <View style={styles.topActions}>
          {/* Mode Cek Harga (FEAT-06) */}
          <TouchableOpacity
            style={[styles.topBtn, priceCheckMode && styles.topBtnActive]}
            onPress={() => setPriceCheckMode(!priceCheckMode)}
          >
            <Icon source="tag-search" size={20} color={priceCheckMode ? Colors.accent : Colors.textOnPrimary} />
            <Text style={[styles.topBtnText, priceCheckMode && { color: Colors.accent }]}>
              {priceCheckMode ? 'Cek Harga' : 'Cek Harga'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={() => setScanVisible(true)}>
            <Icon source="qrcode-scan" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.topBtnText}>Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/(kasir)/riwayat' as any)}>
            <Icon source="history" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.topBtnText}>Riwayat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={() => router.push('/(kasir)/shift' as any)}>
            <Icon source="clock-outline" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.topBtnText}>Shift</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.topBtn} onPress={() => { useAuthStore.getState().logout(); router.replace('/(auth)/login'); }}>
            <Icon source="logout" size={20} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </Surface>

      <View style={styles.body}>
        {/* LEFT: Product Panel */}
        <View style={isTablet ? styles.productPanelTablet : styles.productPanelMobile}>
          {/* Search + Category Filter */}
          <Searchbar
            placeholder="Cari produk atau SKU..."
            value={searchQuery}
            onChangeText={onSearch}
            style={styles.searchBar}
            inputStyle={{ fontSize: FontSize.sm }}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar}>
            <TouchableOpacity
              style={[styles.catChip, !selectedCat && styles.catChipActive]}
              onPress={() => onCatSelect(null)}
            >
              <Text style={[styles.catChipText, !selectedCat && styles.catChipTextActive]}>Semua</Text>
            </TouchableOpacity>
            {catList.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, selectedCat === c.id && styles.catChipActive]}
                onPress={() => onCatSelect(c.id)}
              >
                <Text style={[styles.catChipText, selectedCat === c.id && styles.catChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Mode indicator */}
          {priceCheckMode && (
            <View style={styles.priceCheckBanner}>
              <Icon source="tag-search" size={16} color={Colors.accent} />
              <Text style={styles.priceCheckText}>Mode Cek Harga — Tap produk untuk lihat harga</Text>
              <TouchableOpacity onPress={() => setPriceCheckMode(false)}>
                <Icon source="close" size={16} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={products}
            keyExtractor={(i) => String(i.id)}
            numColumns={PRODUCT_COL}
            renderItem={renderProduct}
            contentContainerStyle={styles.productList}
            ListEmptyComponent={
              <View style={styles.emptyProd}>
                <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
              </View>
            }
          />
        </View>

        {/* RIGHT: Cart (Tablet only — inline) */}
        {isTablet && <CartPanel />}
      </View>

      {/* Mobile: Cart FAB */}
      {!isTablet && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => setShowCart(true)}
        >
          <Icon source="cart" size={28} color={Colors.textOnPrimary} />
          {itemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{Math.round(itemCount)}</Text>
            </View>
          )}
          {total > 0 && (
            <Text style={styles.cartFabTotal}>{formatRupiah(total)}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Mobile: Cart Modal */}
      <Portal>
        <Modal
          visible={!isTablet && showCart}
          onDismiss={() => setShowCart(false)}
          contentContainerStyle={styles.cartModal}
        >
          <CartPanel />
        </Modal>
      </Portal>

      {/* Open Shift Modal */}
      <Portal>
        <Modal visible={showOpenShift} dismissable={false} contentContainerStyle={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Buka Shift</Text>
          <Text style={styles.modalSub}>Masukkan saldo kas awal sebelum mulai berjualan</Text>
          <View style={{ marginTop: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6 }}>Saldo Kas Awal (Rp)</Text>
            <RNTextInput
              value={openingBalance}
              onChangeText={setOpeningBalance}
              keyboardType="number-pad"
              style={styles.balanceInput}
              placeholder="0"
            />
          </View>
          <Button mode="contained" onPress={handleOpenShift}
            style={styles.shiftBtn} buttonColor={Colors.primary}
            contentStyle={{ paddingVertical: 6 }}>
            Mulai Shift
          </Button>
        </Modal>
      </Portal>

      {/* Member Search Modal */}
      <Portal>
        <Modal visible={showMemberSearch} onDismiss={() => setShowMemberSearch(false)}
          contentContainerStyle={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Pilih Member</Text>
          <Searchbar
            placeholder="Cari nama atau nomor HP..."
            value={memberQuery}
            onChangeText={searchMember}
            style={{ marginBottom: Spacing.md }}
            autoFocus
          />
          {memberResults.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.memberResult}
              onPress={() => { cart.setCustomer(m); setShowMemberSearch(false); }}
            >
              <Text style={styles.memberResultName}>{m.fullName}</Text>
              <Text style={styles.memberResultSub}>
                {m.phone} · Hutang: {formatRupiah(m.debtBalance)} / {formatRupiah(m.debtLimit)}
              </Text>
            </TouchableOpacity>
          ))}
          {memberQuery.length >= 2 && memberResults.length === 0 && (
            <Text style={styles.noResult}>Member tidak ditemukan</Text>
          )}
        </Modal>
      </Portal>

      {/* Success Modal */}
      <Portal>
        <Modal visible={showSuccess} onDismiss={() => setShowSuccess(false)}
          contentContainerStyle={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.successIcon}>
            <Icon source="check-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Transaksi Berhasil!</Text>
          <Text style={styles.successCode}>{successTrxCode}</Text>

          <View style={styles.successBtns}>
            <Button mode="outlined" icon="printer"
              loading={printing}
              onPress={async () => {
                if (!successReceiptData) return;
                setPrinting(true);
                try { await printReceipt(successReceiptData); }
                catch (e: any) { Alert.alert('Print Gagal', e.message); }
                finally { setPrinting(false); }
              }}
              style={styles.successBtn}>
              Print
            </Button>
            <Button mode="outlined" icon="share-variant"
              loading={printing}
              onPress={async () => {
                if (!successReceiptData) return;
                setPrinting(true);
                try { await shareReceipt(successReceiptData); }
                catch (e: any) { Alert.alert('Share Gagal', e.message); }
                finally { setPrinting(false); }
              }}
              style={styles.successBtn}>
              Share
            </Button>
            <Button mode="contained" onPress={() => setShowSuccess(false)}
              style={styles.successBtn} buttonColor={Colors.primary}>
              Selesai
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Modals */}
      <QtyModal
        visible={!!qtyProduct}
        product={qtyProduct}
        onConfirm={onQtyConfirm}
        onDismiss={() => setQtyProduct(null)}
      />

      <ScannerModal
        visible={scanVisible}
        priceCheckMode={priceCheckMode}
        onFound={onScanFound}
        onNotFound={onScanNotFound}
        onDismiss={() => setScanVisible(false)}
      />

      <PriceCheckModal
        visible={!!priceCheckProduct}
        product={priceCheckProduct}
        onDismiss={() => { setPriceCheckProduct(null); setPriceCheckMode(false); }}
        onAddToCart={(p) => { setQtyProduct(p); setPriceCheckMode(false); }}
      />

      <DiscountModal
        visible={showDiscount}
        discounts={activeDiscounts}
        selected={cart.discount}
        subtotal={subtotal}
        onSelect={cart.setDiscount}
        onDismiss={() => setShowDiscount(false)}
      />

      <PaymentModal
        visible={showPayment}
        total={total}
        subtotal={subtotal}
        discountAmount={cart.discountAmount}
        customer={cart.customer}
        notes={cart.notes}
        onNotesChange={cart.setNotes}
        onConfirmCash={onConfirmCash}
        onConfirmDebt={onConfirmDebt}
        onSelectCustomer={() => { setShowPayment(false); setShowMemberSearch(true); }}
        onDismiss={() => setShowPayment(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Top Bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingTop: 44, paddingBottom: Spacing.sm,
  },
  topLeft: {},
  storeName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textOnPrimary },
  cashierName: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  topActions: { flexDirection: 'row', gap: Spacing.sm },
  topBtn: { alignItems: 'center', padding: 6 },
  topBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.sm },
  topBtnText: { fontSize: 9, color: Colors.textOnPrimary, marginTop: 2 },

  body: { flex: 1, flexDirection: isTablet ? 'row' : 'column' },

  // Product panel
  productPanelTablet: { flex: 1, borderRightWidth: 1, borderRightColor: Colors.divider },
  productPanelMobile: { flex: 1 },
  searchBar: { margin: Spacing.sm, borderRadius: Radius.md },
  catBar: { paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm, flexGrow: 0 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, marginRight: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.textOnPrimary, fontWeight: '700' },
  priceCheckBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warningLight, padding: Spacing.sm,
    marginHorizontal: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.sm,
  },
  priceCheckText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600' },
  productList: { padding: Spacing.sm, paddingBottom: 80 },
  emptyProd: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.textHint },

  // Cart panel
  cartPanel: {
    width: isTablet ? 340 : '100%',
    backgroundColor: Colors.surface,
    flex: isTablet ? undefined : 1,
    borderTopWidth: isTablet ? 0 : 1,
    borderTopColor: Colors.divider,
  },
  cartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  cartTitle: { fontSize: FontSize.md, fontWeight: '700' },
  clearCart: { fontSize: FontSize.xs, color: Colors.danger },
  cartItems: { flex: 1, maxHeight: isTablet ? 320 : 220 },
  cartEmpty: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  cartEmptyText: { color: Colors.textHint, fontSize: FontSize.sm },
  cartItem: {
    padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  cartItemName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  cartItemPrice: { fontSize: FontSize.xs, color: Colors.textHint },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: Colors.textPrimary, lineHeight: 22 },
  qtyVal: { fontSize: FontSize.sm, fontWeight: '700', paddingHorizontal: 10, minWidth: 60, textAlign: 'center' },
  cartItemSubtotal: { marginLeft: 'auto', fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  memberBtn: {
    margin: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    padding: Spacing.sm, backgroundColor: Colors.surfaceVariant,
  },
  memberSelected: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  memberSub: { fontSize: FontSize.xs, color: Colors.textHint },
  memberPlaceholder: { fontSize: FontSize.xs, color: Colors.primary, textAlign: 'center' },
  summary: { padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryVal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  discRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalRow: { marginTop: 6 },
  totalLabel: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  totalVal: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary },
  payBtnRow: { padding: Spacing.sm },
  payBtn: { borderRadius: Radius.md },

  // Mobile Cart FAB
  cartFab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: Colors.primary, borderRadius: 30,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    gap: 8, elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8,
  },
  cartBadge: {
    backgroundColor: Colors.accent, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  cartBadgeText: { fontSize: 11, color: Colors.textOnPrimary, fontWeight: '800' },
  cartFabTotal: { fontSize: FontSize.sm, color: Colors.textOnPrimary, fontWeight: '700' },
  cartModal: {
    backgroundColor: Colors.surface,
    margin: 0, bottom: 0, position: 'absolute', left: 0, right: 0,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
  },

  // Modals
  modal: { backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: Radius.xl, padding: Spacing.lg, paddingTop: Spacing.sm },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.xs },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  balanceInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: FontSize.xl, fontWeight: '700',
    color: Colors.textPrimary, textAlign: 'center',
  },
  shiftBtn: { marginTop: Spacing.lg, borderRadius: Radius.md },
  memberResult: {
    padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.surfaceVariant,
    marginBottom: Spacing.sm,
  },
  memberResultName: { fontSize: FontSize.sm, fontWeight: '700' },
  memberResultSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  noResult: { textAlign: 'center', color: Colors.textHint, padding: Spacing.md },
  successIcon: { alignItems: 'center', marginBottom: Spacing.md },
  successTitle: { fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center', color: Colors.success },
  successCode: { fontSize: FontSize.sm, textAlign: 'center', color: Colors.textHint, marginTop: 4, marginBottom: Spacing.lg },
  successBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  successBtn: { flex: 1, minWidth: 90, borderRadius: Radius.md },
});
