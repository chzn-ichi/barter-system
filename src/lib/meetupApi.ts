import { supabase } from "@/lib/supabase";

export type MeetupProposal = {
  id: string;
  tradeId: string;
  proposedBy: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  isChange: boolean;
  status: "pending" | "accepted" | "declined" | "superseded";
};

export function mapProposal(row: any): MeetupProposal {
  return {
    id: row.id,
    tradeId: row.trade_id,
    proposedBy: row.proposed_by,
    date: row.meetup_date,
    time: String(row.meetup_time).slice(0, 5),
    location: row.location,
    isChange: row.is_change,
    status: row.status,
  };
}

// The meetup that currently stands, plus any proposal waiting for a reply.
export async function fetchMeetupState(tradeId: string): Promise<{
  confirmed: MeetupProposal | null;
  pending: MeetupProposal | null;
}> {
  const { data, error } = await supabase
    .from("meetup_proposals")
    .select("*")
    .eq("trade_id", tradeId)
    .in("status", ["pending", "accepted"]);

  if (error) throw new Error("Could not load the meetup.");

  const proposals = (data ?? []).map(mapProposal);
  return {
    confirmed: proposals.find((p) => p.status === "accepted") ?? null,
    pending: proposals.find((p) => p.status === "pending") ?? null,
  };
}

export async function proposeMeetup(input: {
  tradeId: string;
  date: string;
  time: string;
  location: string;
}) {
  const { error } = await supabase.rpc("propose_meetup", {
    p_trade_id: input.tradeId,
    p_date: input.date,
    p_time: `${input.time}:00`,
    p_location: input.location,
  });
  if (error) throw new Error(error.message || "Could not send the meetup proposal.");
}

export async function respondToMeetup(proposalId: string, accept: boolean) {
  const { error } = await supabase.rpc("respond_to_meetup", {
    p_proposal_id: proposalId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message || "Could not respond to the proposal.");
}

export async function confirmExchange(tradeId: string): Promise<"completed" | "waiting"> {
  const { data, error } = await supabase.rpc("confirm_exchange", { p_trade_id: tradeId });
  if (error) throw new Error(error.message || "Could not confirm the exchange.");
  return data as "completed" | "waiting";
}