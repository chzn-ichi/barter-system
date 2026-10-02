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
  proposerAccepted: boolean;
  recipientAccepted: boolean;
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

  if (error) throw new Error("Could not load deals.");

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
      proposer_id,
      recipient_id,
      proposer:profiles!trades_proposer_id_fkey ( name ),
      recipient:profiles!trades_recipient_id_fkey ( name )
      `
    )
    .eq("id", tradeId)
    .single();

  if (tradeError || !trade) throw new Error("Could not load this deal.");

  const { data: rounds, error: roundsError } = await supabase
    .from("trade_rounds")
    .select(
      `
      id,
      round_number,
      proposed_by,
      message,
      created_at,
      proposer_accepted,
      recipient_accepted,
      trade_round_items (
        id,
        offered_by,
        listings ( id, title, status, listing_photos ( url, position ) )
      )
      `
    )
    .eq("trade_id", tradeId)
    .order("round_number", { ascending: true });

  if (roundsError) throw new Error("Could not load the history for this deal.");

  return {
    id: trade.id,
    proposerId: trade.proposer_id,
    proposerName: (trade.proposer as any)?.name ?? "Unknown",
    recipientId: trade.recipient_id,
    recipientName: (trade.recipient as any)?.name ?? "Unknown",
    status: trade.status,
    roundCount: trade.round_count,
    rounds: (rounds ?? []).map((r: any) => ({
      id: r.id,
      roundNumber: r.round_number,
      proposedBy: r.proposed_by,
      message: r.message,
      createdAt: r.created_at,
      proposerAccepted: r.proposer_accepted,
      recipientAccepted: r.recipient_accepted,
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

export function diffRounds(previous: TradeRound | undefined, current: TradeRound) {
  const prevIds = new Set((previous?.items ?? []).map((i) => i.listingId));
  const currIds = new Set(current.items.map((i) => i.listingId));

  const added = current.items.filter((i) => !prevIds.has(i.listingId));
  const removed = (previous?.items ?? []).filter((i) => !currIds.has(i.listingId));

  return { added, removed };
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

  if (tradeError || !trade) throw new Error("Could not send this offer.");

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

  if (roundError || !round) throw new Error("Could not send this offer.");

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
  if (itemsError) throw new Error("Offer sent, but the items failed to attach.");

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

  if (tradeFetchError || !trade) throw new Error("Could not load this deal.");
  if (trade.round_count >= MAX_ROUNDS) {
    throw new Error("You've reached 5 offers on this deal. Accept the current one, or cancel the deal.");
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

  if (roundError || !round) throw new Error("Could not send your counter.");

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
  if (itemsError) throw new Error("Counter sent, but the items failed to attach.");

  const { error: updateError } = await supabase
    .from("trades")
    .update({ status: "countered", round_count: nextRoundNumber, updated_at: new Date().toISOString() })
    .eq("id", input.tradeId);

  if (updateError) throw new Error("Could not update this deal.");
}

// Records one person's "yes" on the current offer. Only when BOTH people have
// said yes to this exact round does the deal actually move to Accepted.
export async function acceptRound(input: { tradeId: string; roundId: string; isProposer: boolean }) {
  const { data: items } = await supabase
    .from("trade_round_items")
    .select("listings ( status, title )")
    .eq("round_id", input.roundId);

  const unavailable = (items ?? []).find((i: any) => i.listings?.status === "traded");
  if (unavailable) {
    throw new Error(
      `${(unavailable as any).listings?.title ?? "An item"} was traded away in another deal. Counter with something else, or cancel this deal.`
    );
  }

  const field = input.isProposer ? "proposer_accepted" : "recipient_accepted";
  const { error } = await supabase.from("trade_rounds").update({ [field]: true }).eq("id", input.roundId);
  if (error) throw new Error("Could not record your acceptance.");

  const { data: round } = await supabase
    .from("trade_rounds")
    .select("proposer_accepted, recipient_accepted")
    .eq("id", input.roundId)
    .single();

  if (round?.proposer_accepted && round?.recipient_accepted) {
    const { error: tradeUpdateError } = await supabase
      .from("trades")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", input.tradeId);
    if (tradeUpdateError) throw new Error("Could not confirm this deal.");
  }
}

export async function rejectTrade(tradeId: string) {
  const { error } = await supabase
    .from("trades")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw new Error("Could not decline this deal.");
}

export async function cancelTrade(tradeId: string) {
  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw new Error("Could not cancel this deal.");
}


// Used for the little red dot on the Deals tab: true when at least one open
// deal is waiting on this person specifically.
export async function hasActionableTrades(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      status,
      proposer_id,
      recipient_id,
      trade_rounds ( round_number, proposed_by, proposer_accepted, recipient_accepted )
      `
    )
    .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
    .in("status", ["pending", "countered"]);

  if (error || !data) return false;

  return data.some((trade: any) => {
    const rounds = trade.trade_rounds ?? [];
    const latest = rounds.reduce(
      (a: any, b: any) => (b.round_number > (a?.round_number ?? -1) ? b : a),
      null
    );
    if (!latest) return false;

    const isProposer = trade.proposer_id === userId;
    const myAccepted = isProposer ? latest.proposer_accepted : latest.recipient_accepted;
    return latest.proposed_by !== userId && !myAccepted;
  });
}