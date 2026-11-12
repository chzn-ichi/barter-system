import { useCallback, useEffect, useRef, useState } from "react";
import { findMatches } from "@/lib/matchApi";
import type { OfferItem } from "@/lib/matchAlgorithm";
import { useAuthStore } from "@/store/authStore";
import { useMatchSessionStore } from "@/store/matchSessionStore";

export function summarizeOffers(offers: OfferItem[]): string {
  if (offers.length === 0) return "";
  if (offers.length === 1) return offers[0].title;
  return `${offers[0].title} + ${offers.length - 1} more`;
}

export function useRefreshMatches() {
  const user = useAuthStore((s) => s.user);
  const offers = useMatchSessionStore((s) => s.offers);
  const wants = useMatchSessionStore((s) => s.wants);
  const setResults = useMatchSessionStore((s) => s.setResults);

  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const [results] = await Promise.all([
        findMatches({ userId: user.id, myBarangay: user.barangay, offers, wants }),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      setResults(results);
      setJustUpdated(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustUpdated(false), 2000);
    } catch (e: any) {
      setError(e.message ?? "Could not refresh matches.");
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshing, offers, wants, setResults]);

  return { refreshing, refresh, justUpdated, error };
}