import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { ArrowLeftRight, CalendarDays, MessageCircle, Package, Repeat } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { fetchMyTrades, type Trade, type TradeGroup } from "@/lib/tradesApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { TradeListSkeleton } from "@/components/ui/Skeletons";

type Tab = "active" | "completed" | "declined";

const TAB_LABELS: Record<Tab, string> = {
  active: "Active",
  completed: "Completed",
  declined: "Declined",
};

const ACTIVE_SECTIONS: { group: TradeGroup; title: string }[] = [
  { group: "todo", title: "To do" },
  { group: "waiting", title: "Waiting" },
  { group: "agreed", title: "Agreed" },
];

const EMPTY_COPY: Record<Tab, { title: string; subtitle: string }> = {
  active: { title: "No active trades", subtitle: "Make an offer on any item to get started." },
  completed: { title: "No completed trades yet", subtitle: "Finished trades will show up here." },
  declined: { title: "Nothing here", subtitle: "Declined and cancelled trades will show up here." },
};

const chipStyles: Record<TradeGroup, { box: string; text: string }> = {
  todo: { box: "bg-primary", text: "text-card" },
  waiting: { box: "border border-border", text: "text-muted" },
  agreed: { box: "bg-success/15", text: "text-success" },
  completed: { box: "bg-success/15", text: "text-success" },
  declined: { box: "bg-danger/15", text: "text-danger" },
};

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Thumb({ uri }: { uri: string | null }) {
  return uri ? (
    <Image source={{ uri }} className="h-11 w-11 rounded-lg bg-border" />
  ) : (
    <View className="h-11 w-11 items-center justify-center rounded-lg bg-border">
      <Package size={18} color="#64748B" />
    </View>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const chip = chipStyles[trade.group];
  const todo = trade.group === "todo";
  const detail = trade.meetupText ?? trade.lastMessage;

  return (
    <Pressable
      onPress={() => router.push(`/trade/${trade.id}`)}
      className={`mb-3 rounded-xl bg-card p-3 ${todo ? "border-2 border-primary" : "border border-border"}`}
    >
      <View className="mb-3 flex-row items-center">
        <Thumb uri={trade.yourImage} />
        <View className="mx-2">
          <ArrowLeftRight size={14} color="#64748B" />
        </View>
        <Thumb uri={trade.theirImage} />
        <View className="flex-1" />
        <View className={`rounded-full px-2.5 py-1 ${chip.box}`}>
          <Text className={`text-xs font-medium ${chip.text}`}>{trade.chipLabel}</Text>
        </View>
      </View>

      <Text numberOfLines={1} className="text-sm font-semibold text-ink">
        {trade.title}
      </Text>
      <Text className="mt-0.5 text-xs text-muted">
        with {trade.withUserName} &middot; {timeAgo(trade.updatedAt)}
      </Text>

      {trade.hint ? (
        <Text className={`mt-2 text-xs font-medium ${todo ? "text-primary" : "text-muted"}`}>{trade.hint}</Text>
      ) : null}

      {detail ? (
        <View className="mt-2 flex-row items-center">
          {trade.meetupText ? (
            <CalendarDays size={12} color="#64748B" />
          ) : (
            <MessageCircle size={12} color="#64748B" />
          )}
          <Text numberOfLines={1} className="ml-1.5 flex-1 text-xs text-ink">
            {detail}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function TradesScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("active");

  const loadTrades = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);
      try {
        setTrades(await fetchMyTrades(userId));
      } catch {
        setTrades([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      loadTrades();
    }, [loadTrades])
  );

  const byTab = useMemo(
    () => ({
      active: trades.filter((t) => ["todo", "waiting", "agreed"].includes(t.group)),
      completed: trades.filter((t) => t.group === "completed"),
      declined: trades.filter((t) => t.group === "declined"),
    }),
    [trades]
  );

  const visible = byTab[tab];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pb-3 pt-2">
        <Text className="text-2xl font-bold text-primary">Trades</Text>
        <Text className="text-base text-muted">Offers, active trades, and history.</Text>
      </View>

      {loading ? (
        <TradeListSkeleton />
      ) : (
        <>
          <View className="mb-3 flex-row gap-2 px-5">
            {(Object.keys(TAB_LABELS) as Tab[]).map((key) => {
              const active = key === tab;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  className={`rounded-full border px-4 py-2 ${
                    active ? "border-primary bg-primary" : "border-border bg-card"
                  }`}
                >
                  <Text className={`text-sm font-medium ${active ? "text-card" : "text-ink"}`}>
                    {TAB_LABELS[key]} {byTab[key].length}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            contentContainerClassName="px-5 pb-6"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadTrades(true)} tintColor="#0F2A4A" />
            }
          >
            {visible.length === 0 ? (
              <View className="pt-16">
                <EmptyState icon={Repeat} title={EMPTY_COPY[tab].title} subtitle={EMPTY_COPY[tab].subtitle} />
              </View>
            ) : tab === "active" ? (
              ACTIVE_SECTIONS.map(({ group, title }) => {
                const list = visible.filter((t) => t.group === group);
                if (list.length === 0) return null;
                return (
                  <View key={group} className="mb-2">
                    <Text className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      {title} &middot; {list.length}
                    </Text>
                    {list.map((t) => (
                      <TradeCard key={t.id} trade={t} />
                    ))}
                  </View>
                );
              })
            ) : (
              visible.map((t) => <TradeCard key={t.id} trade={t} />)
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}