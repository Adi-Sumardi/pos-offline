import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { expenses } from '../schema';
import type { NewExpense } from '../schema';
import { today } from '@/utils/date';

export const EXPENSE_CATEGORIES = [
  'Operasional',
  'Gaji & Upah',
  'Listrik & Air',
  'Sewa Tempat',
  'Transport',
  'ATK & Perlengkapan',
  'Pembelian Stok',
  'Lain-lain',
] as const;

export async function getExpenses(from: string, to: string) {
  const db = getDb();
  return db
    .select()
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, from),
        lte(expenses.expenseDate, to)
      )
    )
    .orderBy(sql`${expenses.expenseDate} DESC`);
}

export async function createExpense(data: NewExpense) {
  const db = getDb();
  const [inserted] = await db.insert(expenses).values(data).returning();
  return inserted;
}

export async function updateExpense(id: number, data: Partial<NewExpense>) {
  const db = getDb();
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = getDb();
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getTodayExpenses() {
  const db = getDb();
  return db.select().from(expenses).where(eq(expenses.expenseDate, today()));
}
