import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { getDb, getSqliteDb } from '../index';
import {
  transactions, transactionItems, products,
  customers, cashFlow, stockLogs,
} from '../schema';
import type { CartItem } from '@/stores/useCartStore';
import type { Customer, Discount } from '../schema';
import { generateTrxCode, todayTrxPrefix } from '@/utils/trxCode';

/** Ambil sequence transaksi hari ini untuk generate kode */
async function getNextTrxSequence(): Promise<number> {
  const db = getSqliteDb();
  const prefix = todayTrxPrefix();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE trx_code LIKE ?`,
    [`${prefix}%`]
  );
  return (result?.count ?? 0) + 1;
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

  // Validasi stok (gunakan epsilon untuk menghindari floating-point error)
  const EPSILON = 1e-9;
  for (const item of items) {
    if (item.product.stock - item.quantity < -EPSILON) {
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

      const newStock = item.product.stock - item.quantity;
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
    // Transaksi hutang TIDAK dicatat sebagai kas masuk sampai pelanggan membayar
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
        const newStock = prod[0].stock + item.quantity;
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
      if (cust[0]) {
        await db.update(customers)
          .set({ debtBalance: Math.max(0, cust[0].debtBalance - trx[0].total) })
          .where(eq(customers.id, trx[0].customerId));
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
