import { eq, like, or, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { customers, transactions, debtPayments } from '../schema';
import type { NewCustomer } from '../schema';
import { generateMemberCode } from '@/utils/trxCode';

export async function getAllCustomers(activeOnly = true) {
  const db = getDb();
  const query = db.select().from(customers).orderBy(customers.fullName);
  if (activeOnly) return query.where(eq(customers.isActive, true));
  return query;
}

export async function searchCustomers(query: string) {
  const db = getDb();
  return db
    .select()
    .from(customers)
    .where(
      or(
        like(customers.fullName, `%${query}%`),
        like(customers.phone, `%${query}%`),
        like(customers.memberCode, `%${query}%`)
      )
    )
    .limit(20);
}

export async function getCustomerById(id: number) {
  const db = getDb();
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createCustomer(data: Omit<NewCustomer, 'memberCode'>) {
  const db = getDb();

  // Auto-generate member code
  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(customers);
  const seq = (countResult[0]?.count ?? 0) + 1;
  const memberCode = generateMemberCode(seq);

  const [inserted] = await db
    .insert(customers)
    .values({ ...data, memberCode })
    .returning();
  return inserted;
}

export async function updateCustomer(id: number, data: Partial<NewCustomer>) {
  const db = getDb();
  await db
    .update(customers)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id));
}

export async function getCustomerDebtHistory(customerId: number) {
  const db = getDb();
  return db
    .select({
      id: transactions.id,
      trxCode: transactions.trxCode,
      total: transactions.total,
      createdAt: transactions.createdAt,
      status: transactions.status,
    })
    .from(transactions)
    .where(eq(transactions.customerId, customerId))
    .orderBy(sql`${transactions.createdAt} DESC`)
    .limit(50);
}

/**
 * Bayar hutang member.
 * Kurangi debtBalance, catat di debt_payments.
 */
export async function payDebt(
  customerId: number,
  cashierId: number,
  amount: number,
  notes?: string
) {
  const db = getDb();
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Member tidak ditemukan');
  if (amount <= 0) throw new Error('Nominal harus lebih dari 0');
  if (amount > customer.debtBalance) throw new Error('Nominal melebihi saldo hutang');

  const newBalance = customer.debtBalance - amount;
  await db.update(customers).set({ debtBalance: newBalance }).where(eq(customers.id, customerId));
  await db.insert(debtPayments).values({ customerId, cashierId, amount, notes });

  return { newBalance, paid: amount };
}

export async function getDebtPaymentHistory(customerId: number) {
  const db = getDb();
  return db
    .select()
    .from(debtPayments)
    .where(eq(debtPayments.customerId, customerId))
    .orderBy(sql`${debtPayments.paidAt} DESC`)
    .limit(50);
}
