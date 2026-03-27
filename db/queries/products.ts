import { eq, like, and, or, lte, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { products, categories, stockLogs, priceLogs } from '../schema';
import type { NewProduct } from '../schema';

export async function getAllProducts(includeInactive = false) {
  const db = getDb();
  const query = db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      categoryId: products.categoryId,
      categoryName: categories.name,
      brand: products.brand,
      unit: products.unit,
      unitType: products.unitType,
      qtyStep: products.qtyStep,
      price: products.price,
      costPrice: products.costPrice,
      stock: products.stock,
      minStock: products.minStock,
      location: products.location,
      hasQr: products.hasQr,
      isActive: products.isActive,
      notes: products.notes,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));

  if (!includeInactive) {
    return query.where(eq(products.isActive, true));
  }
  return query;
}

export async function searchProducts(query: string, categoryId?: number) {
  const db = getDb();
  const searchCondition = or(
    like(products.name, `%${query}%`),
    like(products.sku, `%${query}%`)
  );
  const conditions = [eq(products.isActive, true), searchCondition!];
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      unit: products.unit,
      unitType: products.unitType,
      qtyStep: products.qtyStep,
      price: products.price,
      costPrice: products.costPrice,
      stock: products.stock,
      minStock: products.minStock,
      location: products.location,
      hasQr: products.hasQr,
      categoryId: products.categoryId,
      categoryName: categories.name,
      brand: products.brand,
      isActive: products.isActive,
      notes: products.notes,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .limit(50);
}

export async function searchBySku(sku: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.sku, sku), eq(products.isActive, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function getProductById(id: number) {
  const db = getDb();
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getLowStockProducts() {
  const db = getDb();
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      stock: products.stock,
      minStock: products.minStock,
      unit: products.unit,
    })
    .from(products)
    .where(and(eq(products.isActive, true), lte(products.stock, products.minStock)));
}

export async function createProduct(data: NewProduct, adminId: number) {
  const db = getDb();
  
  // Validate required fields
  if (!data.name || !data.sku || !data.price) {
    throw new Error('Nama, SKU, dan Harga wajib diisi');
  }

  // Check SKU uniqueness
  const existing = await searchBySku(data.sku);
  if (existing) {
    throw new Error(`SKU "${data.sku}" sudah digunakan oleh produk "${existing.name}"`);
  }

  const [inserted] = await db.insert(products).values(data).returning();
  
  if (!inserted) {
    throw new Error('Gagal menyimpan produk ke database');
  }

  // Log stok awal
  if (data.stock && data.stock > 0) {
    await db.insert(stockLogs).values({
      productId: inserted.id,
      userId: adminId,
      type: 'adjustment',
      qtyBefore: 0,
      qtyChange: data.stock,
      qtyAfter: data.stock,
      notes: 'Stok awal saat produk ditambahkan',
    });
  }
  return inserted;
}

export async function updateProduct(
  id: number,
  data: Partial<NewProduct>,
  adminId: number
) {
  const db = getDb();
  const old = await getProductById(id);
  if (!old) throw new Error('Produk tidak ditemukan');

  // Log perubahan harga
  if (data.price !== undefined && data.price !== old.price) {
    await db.insert(priceLogs).values({
      productId: id,
      field: 'price',
      oldValue: old.price,
      newValue: data.price,
      changedBy: adminId,
      notes: 'Update harga jual',
    });
  }
  if (data.costPrice !== undefined && data.costPrice !== old.costPrice) {
    await db.insert(priceLogs).values({
      productId: id,
      field: 'cost_price',
      oldValue: old.costPrice,
      newValue: data.costPrice,
      changedBy: adminId,
      notes: 'Update HPP',
    });
  }

  await db
    .update(products)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));
}

export async function adjustStock(
  productId: number,
  userId: number,
  newStock: number,
  notes: string
) {
  const db = getDb();
  const product = await getProductById(productId);
  if (!product) throw new Error('Produk tidak ditemukan');

  const change = newStock - product.stock;
  await db.update(products).set({ stock: newStock }).where(eq(products.id, productId));
  await db.insert(stockLogs).values({
    productId,
    userId,
    type: 'adjustment',
    qtyBefore: product.stock,
    qtyChange: change,
    qtyAfter: newStock,
    notes,
  });
}

export async function getNextSkuSequence(categoryId: number): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(eq(products.categoryId, categoryId));
  return (result[0]?.count ?? 0) + 1;
}
