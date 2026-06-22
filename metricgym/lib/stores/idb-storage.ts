/**
 * IndexedDB-backed StateStorage for zustand/persist.
 * NOT localStorage: an in-progress workout must survive app kill,
 * reload and device sleep — and localStorage writes are synchronous
 * main-thread work with a ~5 MB cap.
 */
import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { StateStorage } from "zustand/middleware";

interface StateDB extends DBSchema {
  kv: { key: string; value: string };
}

let dbPromise: Promise<IDBPDatabase<StateDB>> | null = null;

function db(): Promise<IDBPDatabase<StateDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StateDB>("metricgym-state", 1, {
      upgrade(database) {
        database.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

export const idbStorage: StateStorage = {
  async getItem(name) {
    if (typeof window === "undefined") return null;
    return (await (await db()).get("kv", name)) ?? null;
  },
  async setItem(name, value) {
    if (typeof window === "undefined") return;
    await (await db()).put("kv", value, name);
  },
  async removeItem(name) {
    if (typeof window === "undefined") return;
    await (await db()).delete("kv", name);
  },
};
