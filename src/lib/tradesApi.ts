import { supabase } from "@/lib/supabase";
import { formatDate, formatTime } from "@/lib/meetupUtils";

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

export type TradeGroup = "todo" | "waiting" | "agreed" | "completed" | "declined";

export type Trade = {
  id: string;
  withUserName: string;
  status: TradeStatus;
  updatedAt: string; // ISO timestamp, formatted on screen
  group: TradeGroup;
  chipLabel: string;
  hint: string | null;
  title: string;
  yourImage: string | null;
  theirImage: string | null;
  meetupText: string | null;
  lastMessage: string | null;
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
  endedBy: string | null;
  proposerConfirmedExchange: boolean;
  recipientConfirmedExchange: boolean;
  rounds: TradeRound[];
};

const MAX_ROUNDS = 5;

function firstPhoto(listing: any): string | null {
  const photos = [...(listing?.listing_photos ?? [])].sort((a: any, b: any) => a.position - b.position);
  return photos[0]?.url ?? null;
}

function sideTitle(items: any[]) {
  const first = items[0]?.listings?.title ?? "an item";
  return items.length > 1 ? `${first} +${items.length - 1}` : first;
}

export async function fetchMyTrades(userId: string): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id,
      status,
      updated_at,
      ended_by,
      proposer_id,
      recipient_id,
      proposer_confirmed_exchange,
      recipient_confirmed_exchange,
      proposer:profiles!trades_proposer_id_fkey ( name ),
      recipient:profiles!trades_recipient_id_fkey ( name )
      `
    )
    .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Could not load trades.");

  const rows = data ?? [];
  if (rows.length === 0) return [];
  const ids = rows.map((r: any) => r.id);

  const [roundsRes, meetupsRes, msgsRes] = await Promise.all([
    supabase
      .from("trade_rounds")
      .select(
        `
        id,
        trade_id,
        round_number,
        proposer_accepted,
        recipient_accepted,
        trade_round_items (
          offered_by,
          listings ( title, listing_photos ( url, position ) )
        )
        `
      )
      .in("trade_id", ids)
      .order("round_number", { ascending: false }),
    supabase
      .from("meetup_proposals")
      .select("trade_id, proposed_by, meetup_date, meetup_time, location, status")
      .in("trade_id", ids)
      .in("status", ["pending", "accepted"]),
    supabase
      .from("messages")
      .select("trade_id, content, sender_id, kind, created_at")
      .in("trade_id", ids)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (roundsRes.error) throw new Error("Could not load trades.");

  // Rounds arrive newest-first, so the first one seen per trade is its latest.
  const latestRound: Record<string, any> = {};
  for (const r of roundsRes.data ?? []) {
    if (!latestRound[r.trade_id]) latestRound[r.trade_id] = r;
  }

  const previews: Record<string, string> = {};
  for (const m of msgsRes.data ?? []) {
    if (previews[m.trade_id]) continue;
    previews[m.trade_id] = m.kind === "text" && m.sender_id === userId ? `You: ${m.content}` : m.content;
  }

  const meetups = meetupsRes.data ?? [];

  return rows.map((row: any): Trade => {
    const isProposer = row.proposer_id === userId;
    const other = isProposer ? row.recipient : row.proposer;
    const otherName: string = other?.name ?? "Unknown";
    const otherFirst = otherName.split(" ")[0];

    const round = latestRound[row.id];
    const items: any[] = round?.trade_round_items ?? [];
    const mine = items.filter((i) => i.offered_by === userId);
    const theirs = items.filter((i) => i.offered_by !== userId);

    const myAccepted = round ? (isProposer ? round.proposer_accepted : round.recipient_accepted) : false;
    const myConfirmedExchange = isProposer ? row.proposer_confirmed_exchange : row.recipient_confirmed_exchange;
    const otherConfirmedExchange = isProposer ? row.recipient_confirmed_exchange : row.proposer_confirmed_exchange;

    const tradeMeetups = meetups.filter((m: any) => m.trade_id === row.id);
    const pendingMeetup = tradeMeetups.find((m: any) => m.status === "pending");
    const confirmedMeetup = tradeMeetups.find((m: any) => m.status === "accepted");

    const endedByMe = row.ended_by === userId;
    const endedByOther = !!row.ended_by && !endedByMe;

    let group: TradeGroup = "agreed";
    let chipLabel = "Confirmed";
    let hint: string | null = null;

    switch (row.status) {
      case "pending":
      case "countered":
        if (!myAccepted) {
          group = "todo";
          chipLabel = "Action needed";
          hint = `Review ${otherFirst}'s offer`;
        } else {
          group = "waiting";
          chipLabel = "Waiting";
          hint = `Waiting for ${otherFirst} to respond`;
        }
        break;
      case "accepted":
        if (pendingMeetup && pendingMeetup.proposed_by !== userId) {
          group = "todo";
          chipLabel = "Action needed";
          hint = "Answer the meetup proposal";
        } else if (otherConfirmedExchange && !myConfirmedExchange) {
          group = "todo";
          chipLabel = "Action needed";
          hint = `${otherFirst} confirmed the exchange. Confirm yours`;
        } else if (myConfirmedExchange) {
          group = "waiting";
          chipLabel = "Waiting";
          hint = `Waiting for ${otherFirst} to confirm`;
        }
        break;
      case "completed":
        group = "completed";
        chipLabel = "Completed";
        break;
      case "rejected":
        group = "declined";
        chipLabel = endedByMe ? "You declined" : endedByOther ? `${otherFirst} declined` : "Declined";
        break;
      case "cancelled":
        group = "declined";
        chipLabel = endedByMe ? "You cancelled" : endedByOther ? `${otherFirst} cancelled` : "Cancelled";
        break;
      case "disputed":
        group = "declined";
        chipLabel = "Disputed";
        break;
      default:
        break;
    }

    let meetupText: string | null = null;
    if (confirmedMeetup) {
      meetupText = `Meetup ${formatDate(confirmedMeetup.meetup_date)} · ${formatTime(
        String(confirmedMeetup.meetup_time).slice(0, 5)
      )} · ${confirmedMeetup.location}`;
    } else if (pendingMeetup) {
      meetupText = "Meetup proposed";
    }

    return {
      id: row.id,
      withUserName: otherName,
      status: row.status,
      updatedAt: row.updated_at,
      group,
      chipLabel,
      hint,
      title: `${sideTitle(mine)} for ${sideTitle(theirs)}`,
      yourImage: firstPhoto(mine[0]?.listings),
      theirImage: firstPhoto(theirs[0]?.listings),
      meetupText,
      lastMessage: previews[row.id] ?? null,
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
      proposer_confirmed_exchange,
      recipient_confirmed_exchange,
      ended_by,
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
    endedBy: trade.ended_by,
    proposerConfirmedExchange: trade.proposer_confirmed_exchange,
    recipientConfirmedExchange: trade.recipient_confirmed_exchange,
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
      proposer_accepted: true,
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
    .select("round_count, proposer_id")
    .eq("id", input.tradeId)
    .single();

  if (tradeFetchError || !trade) throw new Error("Could not load this deal.");
  if (trade.round_count >= MAX_ROUNDS) {
    throw new Error("You've reached 5 offers on this deal. Accept the current one, or cancel the deal.");
  }

  const nextRoundNumber = trade.round_count + 1;

  const authorIsProposer = trade.proposer_id === input.proposedBy;

  const { data: round, error: roundError } = await supabase
    .from("trade_rounds")
    .insert({
      trade_id: input.tradeId,
      round_number: nextRoundNumber,
      proposed_by: input.proposedBy,
      message: input.message || null,
      proposer_accepted: authorIsProposer,
      recipient_accepted: !authorIsProposer,
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

export async function rejectTrade(tradeId: string, userId: string) {
  const { error } = await supabase
    .from("trades")
    .update({ status: "rejected", ended_by: userId, updated_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw new Error("Could not decline this deal.");
}

export async function cancelTrade(tradeId: string, userId: string) {
  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled", ended_by: userId, updated_at: new Date().toISOString() })
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