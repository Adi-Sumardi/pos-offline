import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { getDb, getSqliteDb } from '../index';
import {
  transactions, transactionItems, products,
  customers, cashFlow, stockLogs, debtPayments,
} from '../schema';
import type { CartItem } from '@/stores/useCartStore';
import type { Customer, Discount } from '../schema';
import { generateTrxCode, todayTrxPrefix } from '@/utils/trxCode';

/**
 * Ambil sequence transaksi hari ini.
 * Menggunakan MAX agar aman bila ada data yang dihapus.
 */
async function getNextTrxSequence(): Promise<number> {
  const db = getSqliteDb();
  const prefix = todayTrxPrefix();
  // Extract 4-digit sequence from end of trx_code (format: TRX-YYYYMMDD-XXXX, pos 14+)
  const result = await db.getFirstAsync<{ maxSeq: number }>(
    `SELECT COALESCE(MAX(CAST(SUBSTR(trx_code, 14) AS INTEGER)), 0) as maxSeq
     FROM transactions WHERE trx_code LIKE ?`,
    [`${prefix}%`]
  );
  return (result?.maxSeq ?? 0) + 1;
}

export interface CheckoutPayload {
  items: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  discountAmount: number;
  paymentType: 'cash' | 'debt';
  amountPaid: number;
  notes: string;
  cashierId: number;
}

/**
 * Proses transaksi penjualan — ACID (semua atau tidak sama sekali).
 */
export async function processTransaction(payload: CheckoutPayload) {
  const db = getDb();
  const sqlite = getSqliteDb();
  const {
    items, customer, discount, discountAmount,
    paymentType, amountPaid, notes, cashierId,
  } = payload;

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal - discountAmount;
  const changeAmount = paymentType === 'cash' ? amountPaid - total : 0;

  // Validasi: kasir harus punya shift aktif
  const openShiftRow = await sqlite.getFirstAsync<{ id: number }>(
    `SELECT id FROM shifts WHERE cashier_id = ? AND status = 'OPEN' LIMIT 1`,
    [cashierId]
  );
  if (!openShiftRow) {
    throw new Error('Tidak ada shift aktif. Buka shift terlebih dahulu sebelum bertransaksi.');
  }

  // Validasi stok awal (pre-check, sebelum masuk TX)
  for (const item of items) {
    const remaining = Math.round((item.product.stock - item.quantity) * 10000) / 10000;
    if (remaining < 0) {
      throw new Error(`Stok "${item.product.name}" tidak cukup (sisa: ${item.product.stock} ${item.product.unit})`);
    }
  }

  // Validasi hutang
  if (paymentType === 'debt') {
    if (!customer) throw new Error('Pilih member untuk transaksi hutang');
    if (customer.debtLimit === 0) throw new Error('Member ini tidak memiliki limit hutang');
    const newDebt = customer.debtBalance + total;
    if (newDebt > customer.debtLimit) {
      throw new Error(`Hutang melebihi limit (limit: Rp ${customer.debtLimit.toLocaleString('id-ID')})`);
    }
  }

  const seq = await getNextTrxSequence();
  const trxCode = generateTrxCode(seq);

  // Jalankan dalam satu transaksi SQLite
  await sqlite.withTransactionAsync(async () => {
    // Re-validasi stok di dalam transaksi (defense in depth)
    for (const item of items) {
      const currentProduct = await db
        .select({ stock: products.stock })
        .from(products)
        .where(eq(products.id, item.product.id))
        .limit(1);

      if (!currentProduct[0]) {
        throw new Error(`Produk "${item.product.name}" tidak ditemukan`);
      }

      const remaining = Math.round((currentProduct[0].stock - item.quantity) * 10000) / 10000;
      if (remaining < 0) {
        throw new Error(`Stok "${item.product.name}" tidak cukup (sisa: ${currentProduct[0].stock} ${item.product.unit})`);
      }
    }

    // 1. Insert header transaksi
    const [trx] = await db.insert(transactions).values({
      trxCode,
      customerId: customer?.id ?? null,
      cashierId,
      paymentType,
      subtotal,
      discountId: discount?.id ?? null,
      discountName: discount?.name ?? null,
      discountAmount,
      total,
      amountPaid,
      changeAmount,
      notes: notes || null,
      status: 'DONE',
    }).returning();

    // 2. Insert detail item + kurangi stok
    for (const item of items) {
      await db.insert(transactionItems).values({
        transactionId: trx.id,
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        productUnit: item.product.unit,
        unitPrice: item.product.price,
        costPrice: item.product.costPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });

      const newStock = Math.round((item.product.stock - item.quantity) * 10000) / 10000;
      await db.update(products).set({ stock: newStock }).where(eq(products.id, item.product.id));
      await db.insert(stockLogs).values({
        productId: item.product.id,
        userId: cashierId,
        type: 'sale',
        qtyBefore: item.product.stock,
        qtyChange: -item.quantity,
        qtyAfter: newStock,
        notes: `Penjualan ${trxCode}`,
      });
    }

    // 3. Update saldo hutang member (jika hutang)
    if (paymentType === 'debt' && customer) {
      await db.update(customers)
        .set({ debtBalance: customer.debtBalance + total })
        .where(eq(customers.id, customer.id));
    }

    // 4. Cash flow masuk (hanya untuk pembayaran tunai)
    if (paymentType === 'cash') {
      await db.insert(cashFlow).values({
        type: 'in',
        category: 'penjualan_tunai',
        amount: total,
        transactionId: trx.id,
        userId: cashierId,
        notes: trxCode,
      });
    }
  });

  return trxCode;
}

export async function getTransactionByCode(trxCode: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.trxCode, trxCode))
    .limit(1);
  return result[0] ?? null;
}

export async function getTransactionItems(transactionId: number) {
  const db = getDb();
  return db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, transactionId));
}

export async function getTransactionsByDate(from: string, to: string) {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      trxCode: transactions.trxCode,
      paymentType: transactions.paymentType,
      total: transactions.total,
      discountAmount: transactions.discountAmount,
      discountName: transactions.discountName,
      status: transactions.status,
      cashierId: transactions.cashierId,
      customerId: transactions.customerId,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(
      and(
        gte(sql`date(${transactions.createdAt})`, from),
        lte(sql`date(${transactions.createdAt})`, to)
      )
    )
    .orderBy(sql`${transactions.createdAt} DESC`);
}

/**
 * Void transaksi — kembalikan stok, batalkan hutang.
 * Hanya Admin yang boleh.
 */
export async function voidTransaction(trxId: number, adminId: number, reason: string) {
  const db = getDb();
  const sqlite = getSqliteDb();
  const trx = await db.select().from(transactions).where(eq(transactions.id, trxId)).limit(1);
  if (!trx[0]) throw new Error('Transaksi tidak ditemukan');
  if (trx[0].status === 'VOID') throw new Error('Transaksi sudah di-void');

  const items = await getTransactionItems(trxId);

  await sqlite.withTransactionAsync(async () => {
    // Kembalikan stok
    for (const item of items) {
      const prod = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (prod[0]) {
        const newStock = Math.round((prod[0].stock + item.quantity) * 10000) / 10000;
        await db.update(products).set({ stock: newStock }).where(eq(products.id, item.productId));
        await db.insert(stockLogs).values({
          productId: item.productId,
          userId: adminId,
          type: 'void_return',
          qtyBefore: prod[0].stock,
          qtyChange: item.quantity,
          qtyAfter: newStock,
          notes: `Void ${trx[0].trxCode}: ${reason}`,
        });
      }
    }

    // Batalkan hutang jika transaksi hutang
    if (trx[0].paymentType === 'debt' && trx[0].customerId) {
      const cust = await db.select().from(customers).where(eq(customers.id, trx[0].customerId)).limit(1);
      if (cust[0] && cust[0].debtBalance > 0) {
        const cancelAmount = Math.min(trx[0].total, cust[0].debtBalance);
        const newBalance = cust[0].debtBalance - cancelAmount;

        await db.update(customers)
          .set({ debtBalance: newBalance })
          .where(eq(customers.id, trx[0].customerId));

        // Catat audit trail pembatalan hutang
        await db.insert(debtPayments).values({
          customerId: trx[0].customerId,
          cashierId: adminId,
          amount: -cancelAmount,
          notes: `VOID: ${trx[0].trxCode} - ${reason}`,
        });
      }
    }

    // Update status transaksi
    await db.update(transactions).set({
      status: 'VOID',
      voidReason: reason,
      voidBy: adminId,
      voidAt: new Date().toISOString(),
    }).where(eq(transactions.id, trxId));
  });
}
