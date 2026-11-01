import { create } from "zustand";
import type { MatchResult, OfferItem, WantItem } from "@/lib/matchAlgorithm";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type MatchSessionState = {
  offers: OfferItem[];
  wants: WantItem[];
  results: MatchResult[];
  hasRun: boolean;

  addOffer: (item: Omit<OfferItem, "id" | "quantity" | "bundle"> & Partial<Pick<OfferItem, "quantity" | "bundle">>) => void;
  updateOffer: (id: string, patch: Partial<OfferItem>) => void;
  removeOffer: (id: string) => void;

  addWant: (item: { name: string; category?: string | null }) => void;
  updateWant: (id: string, patch: Partial<WantItem>) => void;
  removeWant: (id: string) => void;

  setResults: (results: MatchResult[]) => void;
  reset: () => void;
};

export const useMatchSessionStore = create<MatchSessionState>((set) => ({
  offers: [],
  wants: [],
  results: [],
  hasRun: false,

  addOffer: (item) =>
    set((s) => ({
      offers: [...s.offers, { quantity: 1, bundle: true, ...item, id: newId() }],
    })),
  updateOffer: (id, patch) =>
    set((s) => ({ offers: s.offers.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  removeOffer: (id) => set((s) => ({ offers: s.offers.filter((o) => o.id !== id) })),

  addWant: (item) =>
    set((s) => ({
      wants: [
        ...s.wants,
        { id: newId(), name: item.name.trim(), category: item.category ?? null, quantity: 1, bundleAllowed: true },
      ],
    })),
  updateWant: (id, patch) =>
    set((s) => ({ wants: s.wants.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  removeWant: (id) => set((s) => ({ wants: s.wants.filter((w) => w.id !== id) })),

  setResults: (results) => set({ results, hasRun: true }),
  reset: () => set({ offers: [], wants: [], results: [], hasRun: false }),
}));