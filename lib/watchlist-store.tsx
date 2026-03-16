"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change: number;
  changePct: number;
  exchange: string;
  addedAt: number;
  listId?: string;
}

export interface WatchlistList {
  id: string;
  name: string;
  createdAt: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  lists: WatchlistList[];
  activeListId: string;
  add: (item: Omit<WatchlistItem, "addedAt">, listId?: string) => void;
  remove: (symbol: string, listId?: string) => void;
  has: (symbol: string, listId?: string) => boolean;
  clear: (listId?: string) => void;
  createList: (name: string) => void;
  deleteList: (id: string) => void;
  renameList: (id: string, name: string) => void;
  setActiveList: (id: string) => void;
  getItemsForList: (listId: string) => WatchlistItem[];
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════
const WatchlistContext = createContext<WatchlistState | null>(null);

const STORAGE_KEY = "alphametric_watchlist_v2";
const LISTS_KEY = "alphametric_watchlists_v2";
const DEFAULT_LIST: WatchlistList = { id: "main", name: "Main", createdAt: 0 };

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [lists, setLists] = useState<WatchlistList[]>([DEFAULT_LIST]);
  const [activeListId, setActiveListId] = useState("main");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(parsed.map((i: WatchlistItem) => ({ ...i, listId: i.listId || "main" })));
      }
      const listsRaw = localStorage.getItem(LISTS_KEY);
      if (listsRaw) {
        const parsedLists = JSON.parse(listsRaw);
        if (parsedLists.length > 0) setLists(parsedLists);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
    } catch { /* ignore */ }
  }, [items, lists]);

  const add = useCallback((item: Omit<WatchlistItem, "addedAt">, listId?: string) => {
    const targetList = listId || activeListId;
    setItems(prev => {
      const existing = prev.find(i => i.symbol === item.symbol && (i.listId || "main") === targetList);
      if (existing) {
        return prev.map(i => i.symbol === item.symbol && (i.listId || "main") === targetList
          ? { ...item, addedAt: i.addedAt, listId: targetList }
          : i);
      }
      return [{ ...item, addedAt: Date.now(), listId: targetList }, ...prev];
    });
  }, [activeListId]);

  const remove = useCallback((symbol: string, listId?: string) => {
    const targetList = listId || activeListId;
    setItems(prev => prev.filter(i => !(i.symbol === symbol && (i.listId || "main") === targetList)));
  }, [activeListId]);

  const has = useCallback((symbol: string, listId?: string) => {
    const targetList = listId || activeListId;
    return items.some(i => i.symbol === symbol && (i.listId || "main") === targetList);
  }, [items, activeListId]);

  const clear = useCallback((listId?: string) => {
    const targetList = listId || activeListId;
    setItems(prev => prev.filter(i => (i.listId || "main") !== targetList));
  }, [activeListId]);

  const createList = useCallback((name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    setLists(prev => [...prev, { id, name, createdAt: Date.now() }]);
  }, []);

  const deleteList = useCallback((id: string) => {
    if (id === "main") return;
    setLists(prev => prev.filter(l => l.id !== id));
    setItems(prev => prev.filter(i => (i.listId || "main") !== id));
    if (activeListId === id) setActiveListId("main");
  }, [activeListId]);

  const renameList = useCallback((id: string, name: string) => {
    setLists(prev => prev.map(l => l.id === id ? { ...l, name } : l));
  }, []);

  const setActiveList = useCallback((id: string) => {
    setActiveListId(id);
  }, []);

  const getItemsForList = useCallback((listId: string) => {
    return items.filter(i => (i.listId || "main") === listId);
  }, [items]);

  return (
    <WatchlistContext.Provider value={{
      items, lists, activeListId,
      add, remove, has, clear,
      createList, deleteList, renameList, setActiveList, getItemsForList,
    }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistState {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
