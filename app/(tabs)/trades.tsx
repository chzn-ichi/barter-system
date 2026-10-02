import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Repeat } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { fetchMyTrades, type Trade } from "@/lib/tradesApi";
import { EmptyState } from "@/components/ui/EmptyState";

const statusMeta: Record<Trade["status"], { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-accent/15", text: "text-accent", label: "Negotiating" },
  accepted: { bg: "bg-secondary/15", text: "text-secondary", label: "Accepted" },
  countered: { bg: "bg-accent/15", text: "text-accent", label: "Negotiating" },
  meetup_pending: { bg: "bg-secondary/15", text: "text-secondary", label: "Meetup Pending" },
  meetup_confirmed: { bg: "bg-secondary/15", text: "text-secondary", label: "Meetup Confirmed" },
  completed: { bg: "bg-success/15", text: "text-success", label: "Completed" },
  rejected: { bg: "bg-danger/15", text: "text-danger", label: "Declined" },
  cancelled: { bg: "bg-danger/15", text: "text-danger", label: "Cancelled" },
  disputed: { bg: "bg-danger/15", text: "text-danger", label: "Disputed" },
};

const ACTIVE_STATUSES: Trade["status"][] = [
  "pending",
  "accepted",
  "countered",
  "meetup_pending",
  "meetup_confirmed",
];
const DECLINED_STATUSES: Trade["status"][] = ["rejected", "cancelled", "disputed"];

function TradeCard({ trade }: { trade: Trade }) {
  const meta = statusMeta[trade.status];
  return (
    <Pressable
      onPress={() => router.push(`/trade/${trade.id}`)}
      className="mb-3 rounded-xl border border-border bg-card p-4"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink">With {trade.withUserName}</Text>
        <View className={`rounded-full px-2.5 py-1 ${meta.bg}`}>
          <Text className={`text-xs font-medium ${meta.text}`}>{meta.label}</Text>
        </View>
      </View>
      <Text className="text-xs text-muted">Updated {trade.updatedAt}</Text>
    </Pressable>
  );
}

function Section({ title, trades }: { title: string; trades: Trade[] }) {
  if (trades.length === 0) return null;
  return (
    <View className="mb-5">
      <Text className="mb-2 text-sm font-semibold text-ink">{title}</Text>
      {trades.map((t) => (
        <TradeCard key={t.id} trade={t} />
      ))}
    </View>
  );
}

export default function TradesScreen() {
  const user = useAuthStore((s) => s.user);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrades = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchMyTrades(user.id);
        setTrades(data);
      } catch {
        setTrades([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      loadTrades();
    }, [loadTrades])
  );

  const active = useMemo(() => trades.filter((t) => ACTIVE_STATUSES.includes(t.status)), [trades]);
  const completed = useMemo(() => trades.filter((t) => t.status === "completed"), [trades]);
  const declined = useMemo(() => trades.filter((t) => DECLINED_STATUSES.includes(t.status)), [trades]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-primary">Trades</Text>
        <Text className="text-base text-muted">Offers, active deals, and history.</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#243B53" />
        </View>
      ) : trades.length === 0 ? (
        <EmptyState icon={Repeat} title="No trades yet" subtitle="Make an offer on any item to get started." />
      ) : (
        <ScrollView
          contentContainerClassName="px-5 pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadTrades(true)} tintColor="#243B53" />
          }
        >
          <Section title="Active" trades={active} />
          <Section title="Completed" trades={completed} />
          <Section title="Declined" trades={declined} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}