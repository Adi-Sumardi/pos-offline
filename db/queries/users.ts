import { eq, like, or, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { users } from '../schema';
import type { NewUser } from '../schema';
import { hashPin } from '../seed';

/**
 * Ambil semua user (opsional filter active-only).
 */
export async function getAllUsers(activeOnly = false) {
  const db = getDb();
  const query = db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.fullName);
  if (activeOnly) return query.where(eq(users.isActive, true));
  return query;
}

/**
 * Ambil user berdasarkan ID (tanpa pin hash).
 */
export async function getUserById(id: number) {
  const db = getDb();
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Buat user baru. Pin di-hash otomatis.
 */
export async function createUser(data: {
  username: string;
  fullName: string;
  pin: string;
  role: 'admin' | 'kasir';
}) {
  const db = getDb();

  // Cek duplikat username
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1);
  if (existing.length > 0) {
    throw new Error(`Username "${data.username}" sudah digunakan`);
  }

  const pinHash = await hashPin(data.pin);
  const [inserted] = await db
    .insert(users)
    .values({
      username: data.username,
      fullName: data.fullName,
      pinHash,
      role: data.role,
      isActive: true,
    })
    .returning();
  return inserted;
}

/**
 * Update data user (tanpa ubah PIN).
 */
export async function updateUser(
  id: number,
  data: {
    fullName?: string;
    role?: 'admin' | 'kasir';
    isActive?: boolean;
  }
) {
  const db = getDb();
  await db
    .update(users)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));
}

/**
 * Reset PIN user.
 */
export async function resetUserPin(id: number, newPin: string) {
  const db = getDb();
  if (newPin.length < 4 || newPin.length > 8) {
    throw new Error('PIN harus 4-8 digit');
  }
  if (!/^\d+$/.test(newPin)) {
    throw new Error('PIN harus berupa angka');
  }
  const pinHash = await hashPin(newPin);
  await db
    .update(users)
    .set({ pinHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));
}

/**
 * (Soft) Delete / Deactivate user.
 * Supaya referensi ke user lain (transaksi, dll) tidak rusak.
 */
export async function deactivateUser(id: number) {
  const db = getDb();
  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));
}

/**
 * Hitung jumlah user berdasarkan role.
 */
export async function getUserCountByRole() {
  const db = getDb();
  const all = await db.select().from(users);
  const adminCount = all.filter((u) => u.role === 'admin' && u.isActive).length;
  const kasirCount = all.filter((u) => u.role === 'kasir' && u.isActive).length;
  return { adminCount, kasirCount, total: adminCount + kasirCount };
}
