import { getDb, getSqliteDb } from './index';
import * as Crypto from 'expo-crypto';
import { users, categories, products, appSettings } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Hash a PIN using SHA-256 (expo-crypto).
 * In production, consider bcrypt via a native module.
 */
export async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
}

/**
 * Verify a PIN against a stored hash.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const inputHash = await hashPin(pin);
  return inputHash === hash;
}

/**
 * Seed default data on first launch.
 * Only runs if the users table is empty.
 */
export async function seedDefaultData() {
  const db = getDb();

  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) return;

  console.log('[Seed] Menyiapkan data awal...');

  // 1. Create default admin
  const adminPinHash = await hashPin('123456');
  await db.insert(users).values({
    username: 'admin',
    fullName: 'Super Admin',
    pinHash: adminPinHash,
    role: 'admin',
    isActive: true,
  });

  // 2. Create default kasir
  const kasirPinHash = await hashPin('000000');
  await db.insert(users).values({
    username: 'kasir1',
    fullName: 'Kasir 1',
    pinHash: kasirPinHash,
    role: 'kasir',
    isActive: true,
  });

  // 3. Seed default categories
  const defaultCategories = [
    { name: 'Oli & Pelumas', description: 'Oli mesin, oli gardan, pelumas rantai' },
    { name: 'Filter', description: 'Filter oli, udara, bensin' },
    { name: 'Busi & Kelistrikan', description: 'Busi, kabel busi, CDI, regulator' },
    { name: 'Baut & Mur', description: 'Baut, mur, ring, sekrup, klip' },
    { name: 'Kunci & Alat', description: 'Kunci ring, kunci pas, obeng, tang' },
    { name: 'Sparepart Mesin', description: 'Piston, karburator, gasket, seal' },
    { name: 'Sparepart Body', description: 'Cover body, spion, lampu, kaca' },
    { name: 'Aksesori Motor', description: 'Helm, sarung tangan, jas hujan' },
    { name: 'Aksesori Mobil', description: 'Parfum, karpet, cover jok' },
    { name: 'Lain-lain', description: 'Produk yang tidak masuk kategori di atas' },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat);
  }

  // 3b. Get category IDs for product seeding
  const catRows = await db.select().from(categories);
  const catMap: Record<string, number> = {};
  for (const c of catRows) catMap[c.name] = c.id;

  // 3c. Seed sample products
  const sampleProducts = [
    { sku: 'OLI-001', name: 'Oli Mesin Honda 0.8L', categoryId: catMap['Oli & Pelumas'], price: 35000, costPrice: 28000, stock: 24, minStock: 5, unit: 'botol', unitType: 'piece' as const },
    { sku: 'OLI-002', name: 'Oli Samping 2T 0.8L', categoryId: catMap['Oli & Pelumas'], price: 18000, costPrice: 13000, stock: 30, minStock: 10, unit: 'botol', unitType: 'piece' as const },
    { sku: 'OLI-003', name: 'Pelumas Rantai 100ml', categoryId: catMap['Oli & Pelumas'], price: 25000, costPrice: 18000, stock: 15, minStock: 5, unit: 'botol', unitType: 'piece' as const },
    { sku: 'FLT-001', name: 'Filter Oli Beat/Vario', categoryId: catMap['Filter'], price: 12000, costPrice: 7500, stock: 20, minStock: 5, unit: 'pcs', unitType: 'piece' as const },
    { sku: 'FLT-002', name: 'Filter Udara Supra X 125', categoryId: catMap['Filter'], price: 22000, costPrice: 15000, stock: 8, minStock: 3, unit: 'pcs', unitType: 'piece' as const },
    { sku: 'BSI-001', name: 'Busi NGK C7HSA', categoryId: catMap['Busi & Kelistrikan'], price: 16000, costPrice: 10000, stock: 40, minStock: 10, unit: 'pcs', unitType: 'piece' as const },
    { sku: 'BSI-002', name: 'Busi Iridium CR8EIX', categoryId: catMap['Busi & Kelistrikan'], price: 85000, costPrice: 65000, stock: 6, minStock: 3, unit: 'pcs', unitType: 'piece' as const },
    { sku: 'BMR-001', name: 'Baut 10mm Set (10pcs)', categoryId: catMap['Baut & Mur'], price: 8000, costPrice: 4000, stock: 50, minStock: 15, unit: 'set', unitType: 'piece' as const },
    { sku: 'KCI-001', name: 'Kunci Ring Pas Set 8-22mm', categoryId: catMap['Kunci & Alat'], price: 125000, costPrice: 85000, stock: 3, minStock: 1, unit: 'set', unitType: 'piece' as const },
    { sku: 'SPM-001', name: 'Kampas Rem Depan Beat', categoryId: catMap['Sparepart Mesin'], price: 30000, costPrice: 18000, stock: 12, minStock: 4, unit: 'set', unitType: 'piece' as const },
    { sku: 'SPB-001', name: 'Spion Honda Vario Kiri', categoryId: catMap['Sparepart Body'], price: 45000, costPrice: 28000, stock: 5, minStock: 2, unit: 'pcs', unitType: 'piece' as const },
    { sku: 'AKS-001', name: 'Sarung Tangan Motor', categoryId: catMap['Aksesori Motor'], price: 35000, costPrice: 20000, stock: 10, minStock: 3, unit: 'pasang', unitType: 'piece' as const },
  ];

  for (const p of sampleProducts) {
    await db.insert(products).values(p);
  }

  // 4. Seed default app settings
  const defaultSettings = [
    { key: 'store_name', value: 'Toko Kurnia' },
    { key: 'store_address', value: '' },
    { key: 'store_phone', value: '' },
    { key: 'receipt_footer', value: 'Terima kasih atas kunjungan Anda!' },
    { key: 'paper_size', value: '58mm' },
    { key: 'printer_address', value: '' },
  ];

  for (const setting of defaultSettings) {
    await db.insert(appSettings).values(setting);
  }

  console.log('[Seed] Data awal berhasil dibuat.');
  console.log('[Seed] Admin: username=admin pin=123456');
  console.log('[Seed] Kasir: username=kasir1 pin=000000');
}
