import { eq } from 'drizzle-orm';
import { getDb } from '../index';
import { discounts } from '../schema';
import type { NewProduct } from '../schema';

export async function getActiveDiscounts() {
  const db = getDb();
  return db.select().from(discounts).where(eq(discounts.isActive, true));
}

export async function getAllDiscounts() {
  const db = getDb();
  return db.select().from(discounts).orderBy(discounts.name);
}

export async function createDiscount(data: {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'all' | 'category' | 'product' | 'member';
  scopeId?: number;
  minPurchase?: number;
  maxDiscount?: number;
  notes?: string;
  createdBy: number;
}) {
  const db = getDb();
  const [inserted] = await db.insert(discounts).values(data).returning();
  return inserted;
}

export async function toggleDiscount(id: number, isActive: boolean) {
  const db = getDb();
  await db.update(discounts).set({ isActive, updatedAt: new Date().toISOString() }).where(eq(discounts.id, id));
}

export async function updateDiscount(
  id: number,
  data: Partial<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    scope: 'all' | 'category' | 'product' | 'member';
    scopeId: number;
    minPurchase: number;
    maxDiscount: number;
    notes: string;
  }>
) {
  const db = getDb();
  await db.update(discounts).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(discounts.id, id));
}

export async function deleteDiscount(id: number) {
  const db = getDb();
  await db.delete(discounts).where(eq(discounts.id, id));
}
