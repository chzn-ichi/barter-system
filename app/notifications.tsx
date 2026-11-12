import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, Bell, CalendarDays, Check, MessageCircle, Repeat, UserPlus, X, type LucideIcon } from "lucide-react-native";
import {
  fetchNotifications,
  markAllRead,
  markRead,
  subscribeToNotifications,
  type AppNotification,
  type NotificationType,
} from "@/lib/notificationsApi";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationListSkeleton } from "@/components/ui/Skeletons";

const META: Record<NotificationType, { icon: LucideIcon; bg: string; color: string }> = {
  new_offer: { icon: Repeat, bg: "bg-primary/10", color: "#0F2A4A" },
  counter_offer: { icon: Repeat, bg: "bg-primary/10", color: "#0F2A4A" },
  trade_accepted: { icon: Check, bg: "bg-success/15", color: "#2E7D32" },
  trade_declined: { icon: X, bg: "bg-danger/15", color: "#B3261E" },
  trade_cancelled: { icon: X, bg: "bg-danger/15", color: "#B3261E" },
  exchange_confirmed: { icon: Check, bg: "bg-accent/10", color: "#2F5D9E" },
  trade_completed: { icon: Check, bg: "bg-success/15", color: "#2E7D32" },
  meetup_proposed: { icon: CalendarDays, bg: "bg-accent/10", color: "#2F5D9E" },
  meetup_response: { icon: CalendarDays, bg: "bg-accent/10", color: "#2F5D9E" },
  message: { icon: MessageCircle, bg: "bg-accent/10", color: "#2F5D9E" },
  follow: { icon: UserPlus, bg: "bg-accent/10", color: "#2F5D9E" },
};

const FALLBACK = { icon: Bell, bg: "bg-border", color: "#64748B" };

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const userId = useAuthStore((s) => s.user?.id);
  const refreshCounts = useNotificationStore((s) => s.refresh);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);
      try {
        setItems(await fetchNotifications(userId));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      load();
      return subscribeToNotifications(userId, () => load());
    }, [userId, load])
  );

  async function handleOpen(n: AppNotification) {
    if (!n.read && userId) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markRead(n.id).then(() => refreshCounts(userId));
    }

    if (n.type === "follow" && n.actorId) router.push(`/user/${n.actorId}`);
    else if (n.type === "message" && n.tradeId) router.push(`/trade/${n.tradeId}/chat`);
    else if (n.tradeId) router.push(`/trade/${n.tradeId}`);
  }

  async function handleMarkAll() {
    if (!userId) return;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    await markAllRead(userId);
    refreshCounts(userId);
  }

  const hasUnread = items.some((n) => !n.read);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-semibold text-ink">Notifications</Text>
        {hasUnread ? (
          <Pressable onPress={handleMarkAll} hitSlop={8}>
            <Text className="text-sm font-medium text-accent">Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <NotificationListSkeleton />
      ) : (
        <ScrollView
          contentContainerClassName="px-5 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0F2A4A" />}
        >
          {items.length === 0 ? (
            <View className="pt-16">
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                subtitle="Offers, replies, and meetup updates will show up here."
              />
            </View>
          ) : (
            items.map((n) => {
              const meta = META[n.type] ?? FALLBACK;
              const Icon = meta.icon;
              return (
                <Pressable
                  key={n.id}
                  onPress={() => handleOpen(n)}
                  className={`mb-2 flex-row items-center rounded-xl border p-3 ${
                    n.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <View className={`h-10 w-10 items-center justify-center rounded-full ${meta.bg}`}>
                    <Icon size={18} color={meta.color} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className={`text-sm text-ink ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</Text>
                    {n.body ? (
                      <Text numberOfLines={2} className="mt-0.5 text-xs text-muted">
                        {n.body}
                      </Text>
                    ) : null}
                  </View>
                  <View className="ml-2 items-end">
                    <Text className="text-[11px] text-muted">{timeAgo(n.createdAt)}</Text>
                    {!n.read ? <View className="mt-1.5 h-2 w-2 rounded-full bg-primary" /> : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}