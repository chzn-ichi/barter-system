import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Repeat } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { fetchMyTrades, type Trade } from "@/lib/tradesApi";
import { EmptyState } from "@/components/ui/EmptyState";

const statusColors: Record<Trade["status"], { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-accent/15", text: "text-accent", label: "Pending" },
  accepted: { bg: "bg-secondary/15", text: "text-secondary", label: "Accepted" },
  countered: { bg: "bg-secondary/15", text: "text-secondary", label: "Countered" },
  meetup_pending: { bg: "bg-secondary/15", text: "text-secondary", label: "Meetup Pending" },
  meetup_confirmed: { bg: "bg-secondary/15", text: "text-secondary", label: "Meetup Confirmed" },
  completed: { bg: "bg-success/15", text: "text-success", label: "Completed" },
  rejected: { bg: "bg-danger/15", text: "text-danger", label: "Rejected" },
  cancelled: { bg: "bg-danger/15", text: "text-danger", label: "Cancelled" },
  disputed: { bg: "bg-danger/15", text: "text-danger", label: "Disputed" },
};

function TradeCard({ trade }: { trade: Trade }) {
  const colors = statusColors[trade.status];
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink">With {trade.withUserName}</Text>
        <View className={`rounded-full px-2.5 py-1 ${colors.bg}`}>
          <Text className={`text-xs font-medium ${colors.text}`}>{colors.label}</Text>
        </View>
      </View>
      <Text className="mt-2 text-xs text-muted">Updated {trade.updatedAt}</Text>
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-primary">Trades</Text>
        <Text className="text-base text-muted">Proposals, active trades, and history.</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#243B53" />
        </View>
      ) : (
        <FlatList
          data={trades}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadTrades(true)} tintColor="#243B53" />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/trade/${item.id}`)}>
              <TradeCard trade={item} />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Repeat}
              title="No trades yet"
              subtitle="Propose a trade from any listing to get started."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}