import { Text, View } from "react-native";
import type { Trade } from "@/lib/mockData";

const statusColors: Record<Trade["status"], { bg: string; text: string }> = {
  Pending: { bg: "bg-accent/15", text: "text-accent" },
  Accepted: { bg: "bg-secondary/15", text: "text-secondary" },
  Completed: { bg: "bg-success/15", text: "text-success" },
  Cancelled: { bg: "bg-danger/15", text: "text-danger" },
};

export function TradeCard({ trade }: { trade: Trade }) {
  const colors = statusColors[trade.status];
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink">With {trade.withUser}</Text>
        <View className={`rounded-full px-2.5 py-1 ${colors.bg}`}>
          <Text className={`text-xs font-medium ${colors.text}`}>{trade.status}</Text>
        </View>
      </View>
      <Text className="text-sm text-ink">
        {trade.offeredItem} <Text className="text-muted">↔</Text> {trade.wantedItem}
      </Text>
      <Text className="mt-2 text-xs text-muted">Updated {trade.updatedAt}</Text>
    </View>
  );
}