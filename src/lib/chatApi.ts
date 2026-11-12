import { supabase } from "@/lib/supabase";
import { mapProposal, type MeetupProposal } from "@/lib/meetupApi";

export type MessageKind = "text" | "meetup_proposal" | "system";

export type Message = {
  id: string;
  tradeId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  kind: MessageKind;
  proposalId: string | null;
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
      kind,
      proposal_id,
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
    kind: row.kind ?? "text",
    proposalId: row.proposal_id ?? null,
  }));
}

export async function fetchProposals(tradeId: string): Promise<MeetupProposal[]> {
  const { data, error } = await supabase.from("meetup_proposals").select("*").eq("trade_id", tradeId);
  if (error) throw new Error("Could not load meetup proposals.");
  return (data ?? []).map(mapProposal);
}

export async function sendMessage(tradeId: string, senderId: string, content: string) {
  const { error } = await supabase.from("messages").insert({
    trade_id: tradeId,
    sender_id: senderId,
    content: content.trim(),
  });
  if (error) throw new Error("Could not send message.");
}

// Fires whenever a message arrives or a meetup proposal changes.
export function subscribeToChat(tradeId: string, onChange: () => void) {
  const channel = supabase
    .channel(`chat:${tradeId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `trade_id=eq.${tradeId}` },
      () => onChange()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "meetup_proposals", filter: `trade_id=eq.${tradeId}` },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}