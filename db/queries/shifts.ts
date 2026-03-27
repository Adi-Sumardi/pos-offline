import { eq, and, sql } from 'drizzle-orm';
import { getDb, getSqliteDb } from '../index';
import { shifts } from '../schema';

export async function getOpenShift(cashierId: number) {
  const db = getDb();
  const result = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.cashierId, cashierId), eq(shifts.status, 'OPEN')))
    .limit(1);
  return result[0] ?? null;
}

export async function openShift(cashierId: number, openingBalance: number) {
  const db = getDb();

  // Pastikan tidak ada shift open lain
  const existing = await getOpenShift(cashierId);
  if (existing) return existing;

  const [shift] = await db
    .insert(shifts)
    .values({ cashierId, openingBalance, status: 'OPEN' })
    .returning();
  return shift;
}

export async function closeShift(
  shiftId: number,
  closingBalance: number,
  notes?: string
) {
  const db = getSqliteDb();
  const drizzleDb = getDb();

  // Hitung system balance: pemasukan tunai dalam shift ini
  const shift = await drizzleDb.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  if (!shift[0]) throw new Error('Shift tidak ditemukan');
  if (shift[0].status === 'CLOSED') throw new Error('Shift sudah ditutup');

  const openedAt = shift[0].openedAt;

  // Total tunai yang masuk selama shift (penjualan tunai + bayar hutang)
  const cashIn = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total FROM transactions
     WHERE payment_type = 'cash' AND status = 'DONE'
     AND created_at >= ? AND cashier_id = ?`,
    [openedAt, shift[0].cashierId]
  );
  const debtPaid = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments
     WHERE paid_at >= ? AND cashier_id = ?`,
    [openedAt, shift[0].cashierId]
  );

  const systemBalance =
    shift[0].openingBalance +
    (cashIn?.total ?? 0) +
    (debtPaid?.total ?? 0);

  const difference = closingBalance - systemBalance;

  await drizzleDb.update(shifts).set({
    closingBalance,
    systemBalance,
    difference,
    status: 'CLOSED',
    closedAt: new Date().toISOString(),
    notes: notes ?? null,
  }).where(eq(shifts.id, shiftId));

  return { systemBalance, closingBalance, difference };
}

export async function getShiftHistory(cashierId: number, limit = 20) {
  const db = getDb();
  return db
    .select()
    .from(shifts)
    .where(eq(shifts.cashierId, cashierId))
    .orderBy(sql`${shifts.openedAt} DESC`)
    .limit(limit);
}
