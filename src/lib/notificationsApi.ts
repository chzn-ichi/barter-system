import { supabase } from "@/lib/supabase";

export type NotificationType =
  | "new_offer"
  | "counter_offer"
  | "trade_accepted"
  | "trade_declined"
  | "trade_cancelled"
  | "exchange_confirmed"
  | "trade_completed"
  | "meetup_proposed"
  | "meetup_response"
  | "message"
  | "follow";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  tradeId: string | null;
  actorId: string | null;
  read: boolean;
  createdAt: string;
};

function mapNotification(row: any): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    tradeId: row.trade_id,
    actorId: row.actor_id,
    read: !!row.read_at,
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(userId: string, limit = 60): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error("Could not load notifications.");
  return (data ?? []).map(mapNotification);
}

export async function countUnread(userId: string): Promise<{ total: number; trade: number }> {
  const [all, trade] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .not("trade_id", "is", null),
  ]);
  return { total: all.count ?? 0, trade: trade.count ?? 0 };
}

export async function markRead(id: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

// "activity" = everything about a trade except chat messages; "messages" = chat messages only.
export async function markTradeRead(userId: string, tradeId: string, kind: "activity" | "messages") {
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("trade_id", tradeId)
    .is("read_at", null);

  query = kind === "messages" ? query.eq("type", "message") : query.neq("type", "message");
  await query;
}

export function subscribeToNotifications(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications:${userId}:${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}