import { supabase } from "@/lib/supabase";

export type Message = {
  id: string;
  tradeId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
};

export async function fetchMessages(tradeId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      id,
      trade_id,
      sender_id,
      content,
      created_at,
      profiles ( name )
      `
    )
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Could not load messages.");

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tradeId: row.trade_id,
    senderId: row.sender_id,
    senderName: row.profiles?.name ?? "Unknown",
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function sendMessage(tradeId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      trade_id: tradeId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error || !data) throw new Error("Could not send message.");
  return data;
}

export function subscribeToMessages(tradeId: string, onInsert: (message: any) => void) {
  const channel = supabase
    .channel(`messages:${tradeId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `trade_id=eq.${tradeId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}