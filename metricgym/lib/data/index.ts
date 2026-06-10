/**
 * Repository selection by env detection.
 *
 * No Supabase env vars → DEMO MODE: LocalRepository (IndexedDB) seeded
 * with 10 deterministic weeks — instantly investor-demoable, zero backend.
 */
import type { DataRepository } from "./repository";
import { LocalRepository } from "./local-repository";

export const DEMO_USER_ID = "00000000-0000-7000-8000-000000000d20";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

let cached: Promise<DataRepository> | null = null;

/**
 * Client-side only (IndexedDB). Demo mode seeds on first call.
 */
export function getRepository(): Promise<DataRepository> {
  if (typeof window === "undefined") {
    throw new Error("getRepository() is client-side only");
  }
  if (!cached) {
    cached = createRepository();
  }
  return cached;
}

async function createRepository(): Promise<DataRepository> {
  if (isSupabaseConfigured()) {
    const { createBrowserSupabase } = await import("@/lib/supabase/client");
    const { SupabaseRepository } = await import("./supabase-repository");
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      // Not signed in yet — onboarding runs locally until the signup wall.
      return seededLocal();
    }
    const repo = new SupabaseRepository(supabase, userId);
    void repo.flushOutbox();
    window.addEventListener("online", () => void repo.flushOutbox());
    return repo;
  }
  return seededLocal();
}

async function seededLocal(): Promise<DataRepository> {
  const local = new LocalRepository(DEMO_USER_ID);
  if (isDemoMode()) {
    const seeded = await local.getMeta("demo_seeded_v1");
    if (!seeded) {
      const { seedDemoData } = await import("./seed");
      await seedDemoData(local);
      await local.setMeta("demo_seeded_v1", new Date().toISOString());
    }
  }
  return local;
}
