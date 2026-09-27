import { supabase } from "@/lib/supabase";

export type TradeStatus = "pending" | "accepted" | "rejected" | "countered" | "completed" | "cancelled";

export type Trade = {
  id: string;
  withUserName: string;
  status: TradeStatus;
  message: string | null;
  updatedAt: string;
};

export async function fetchMyTrades(userId: string): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      status,
      message,
      updated_at,
      proposer_id,
      recipient_id,
      proposer:profiles!trades_proposer_id_fkey ( name ),
      recipient:profiles!trades_recipient_id_fkey ( name )
    `
    )
    .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Could not load trades.");

  return (data ?? []).map((row: any) => {
    const isProposer = row.proposer_id === userId;
    const otherUser = isProposer ? row.recipient : row.proposer;
    return {
      id: row.id,
      withUserName: otherUser?.name ?? "Unknown",
      status: row.status,
      message: row.message,
      updatedAt: new Date(row.updated_at).toLocaleDateString(),
    };
  });
}