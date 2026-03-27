import { eq } from 'drizzle-orm';
import { getDb } from '../index';
import { appSettings } from '../schema';

export async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const result = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db.select().from(appSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
}

export async function setSetting(key: string, value: string) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export async function setSettings(settings: Record<string, string>) {
  for (const [key, value] of Object.entries(settings)) {
    await setSetting(key, value);
  }
}
