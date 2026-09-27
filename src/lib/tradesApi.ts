import { supabase } from "@/lib/supabase";

export type TradeStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "countered"
  | "meetup_pending"
  | "meetup_confirmed"
  | "completed"
  | "cancelled"
  | "disputed";

export type Trade = {
  id: string;
  withUserName: string;
  status: TradeStatus;
  updatedAt: string;
};

export type RoundItem = {
  id: string;
  listingId: string;
  listingTitle: string;
  imageUrl: string | null;
  offeredBy: string;
  listingStatus: string;
};

export type TradeRound = {
  id: string;
  roundNumber: number;
  proposedBy: string;
  message: string | null;
  createdAt: string;
  items: RoundItem[];
};

export type TradeTimeline = {
  id: string;
  proposerId: string;
  proposerName: string;
  recipientId: string;
  recipientName: string;
  status: TradeStatus;
  roundCount: number;
  needsAttention: boolean;
  attentionReason: string | null;
  rounds: TradeRound[];
};

const MAX_ROUNDS = 5;

export async function fetchMyTrades(userId: string): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      status,
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
      updatedAt: new Date(row.updated_at).toLocaleDateString(),
    };
  });
}

export async function fetchTradeTimeline(tradeId: string): Promise<TradeTimeline> {
  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .select(
      `
      id,
      status,
      round_count,
      needs_attention,
      attention_reason,
      proposer_id,
      recipient_id,
      proposer:profiles!trades_proposer_id_fkey ( name ),
      recipient:profiles!trades_recipient_id_fkey ( name )
      `
    )
    .eq("id", tradeId)
    .single();

  if (tradeError || !trade) throw new Error("Could not load this trade.");

  const { data: rounds, error: roundsError } = await supabase
    .from("trade_rounds")
    .select(
      `
      id,
      round_number,
      proposed_by,
      message,
      created_at,
      trade_round_items (
        id,
        offered_by,
        listings ( id, title, status, listing_photos ( url, position ) )
      )
      `
    )
    .eq("trade_id", tradeId)
    .order("round_number", { ascending: true });

  if (roundsError) throw new Error("Could not load negotiation history.");

  return {
    id: trade.id,
    proposerId: trade.proposer_id,
    proposerName: (trade.proposer as any)?.name ?? "Unknown",
    recipientId: trade.recipient_id,
    recipientName: (trade.recipient as any)?.name ?? "Unknown",
    status: trade.status,
    roundCount: trade.round_count,
    needsAttention: trade.needs_attention,
    attentionReason: trade.attention_reason,
    rounds: (rounds ?? []).map((r: any) => ({
      id: r.id,
      roundNumber: r.round_number,
      proposedBy: r.proposed_by,
      message: r.message,
      createdAt: r.created_at,
      items: (r.trade_round_items ?? []).map((item: any) => {
        const photos = (item.listings?.listing_photos ?? []).sort((a: any, b: any) => a.position - b.position);
        return {
          id: item.id,
          listingId: item.listings?.id,
          listingTitle: item.listings?.title ?? "Unknown item",
          imageUrl: photos[0]?.url ?? null,
          offeredBy: item.offered_by,
          listingStatus: item.listings?.status ?? "active",
        };
      }),
    })),
  };
}

export async function proposeTrade(input: {
  proposerId: string;
  recipientId: string;
  targetListingId: string;
  offeredListingIds: string[];
  message: string;
}) {
  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .insert({
      proposer_id: input.proposerId,
      recipient_id: input.recipientId,
      round_count: 1,
    })
    .select()
    .single();

  if (tradeError || !trade) throw new Error("Could not create trade proposal.");

  const { data: round, error: roundError } = await supabase
    .from("trade_rounds")
    .insert({
      trade_id: trade.id,
      round_number: 1,
      proposed_by: input.proposerId,
      message: input.message || null,
    })
    .select()
    .single();

  if (roundError || !round) throw new Error("Could not create trade proposal.");

  const items = [
    ...input.offeredListingIds.map((listingId) => ({
      round_id: round.id,
      listing_id: listingId,
      offered_by: input.proposerId,
    })),
    {
      round_id: round.id,
      listing_id: input.targetListingId,
      offered_by: input.recipientId,
    },
  ];

  const { error: itemsError } = await supabase.from("trade_round_items").insert(items);
  if (itemsError) throw new Error("Trade created, but items failed to attach.");

  return trade;
}

export async function sendCounter(input: {
  tradeId: string;
  proposedBy: string;
  message: string;
  myItemIds: string[];
  theirItemIds: string[];
  theirUserId: string;
}) {
  const { data: trade, error: tradeFetchError } = await supabase
    .from("trades")
    .select("round_count")
    .eq("id", input.tradeId)
    .single();

  if (tradeFetchError || !trade) throw new Error("Could not load trade.");
  if (trade.round_count >= MAX_ROUNDS) {
    throw new Error("Negotiation limit reached. Accept the current proposal or start a new trade.");
  }

  const nextRoundNumber = trade.round_count + 1;

  const { data: round, error: roundError } = await supabase
    .from("trade_rounds")
    .insert({
      trade_id: input.tradeId,
      round_number: nextRoundNumber,
      proposed_by: input.proposedBy,
      message: input.message || null,
    })
    .select()
    .single();

  if (roundError || !round) throw new Error("Could not send counteroffer.");

  const items = [
    ...input.myItemIds.map((listingId) => ({
      round_id: round.id,
      listing_id: listingId,
      offered_by: input.proposedBy,
    })),
    ...input.theirItemIds.map((listingId) => ({
      round_id: round.id,
      listing_id: listingId,
      offered_by: input.theirUserId,
    })),
  ];

  const { error: itemsError } = await supabase.from("trade_round_items").insert(items);
  if (itemsError) throw new Error("Counteroffer created, but items failed to attach.");

  const { error: updateError } = await supabase
    .from("trades")
    .update({ status: "countered", round_count: nextRoundNumber, updated_at: new Date().toISOString() })
    .eq("id", input.tradeId);

  if (updateError) throw new Error("Could not update trade status.");
}

export async function acceptTrade(tradeId: string) {
  // Guard against your plan's rule #11: never let a trade be accepted if any
  // item in the current (latest) round is no longer active.
  const { data: rounds } = await supabase
    .from("trade_rounds")
    .select("id, round_number")
    .eq("trade_id", tradeId)
    .order("round_number", { ascending: false })
    .limit(1);

  const latestRoundId = rounds?.[0]?.id;
  if (latestRoundId) {
    const { data: items } = await supabase
      .from("trade_round_items")
      .select("listings ( status, title )")
      .eq("round_id", latestRoundId);

    const unavailable = (items ?? []).find((i: any) => i.listings?.status !== "active");
    if (unavailable) {
      await supabase
        .from("trades")
        .update({
          needs_attention: true,
          attention_reason: `${(unavailable as any).listings?.title ?? "An item"} is no longer available.`,
        })
        .eq("id", tradeId);
      throw new Error(
        `This trade can no longer continue. ${(unavailable as any).listings?.title ?? "An item"} is no longer available.`
      );
    }
  }

  const { error } = await supabase
    .from("trades")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw new Error("Could not accept this trade.");
}

export async function rejectTrade(tradeId: string) {
  const { error } = await supabase
    .from("trades")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw new Error("Could not reject this trade.");
}

export async function cancelTrade(tradeId: string) {
  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw new Error("Could not cancel this trade.");
}