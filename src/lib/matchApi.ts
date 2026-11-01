import { supabase } from "@/lib/supabase";
import { computeMatches, type Candidate, type MatchResult, type OfferItem, type WantItem } from "@/lib/matchAlgorithm";

async function fetchCandidates(userId: string): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id, title, category, wants_in_exchange, open_to_offers, bundle_allowed, created_at, owner_id,
      profiles ( name, barangay ),
      listing_photos ( url, position )
      `
    )
    .eq("status", "active")
    .eq("visibility", "public")
    .neq("owner_id", userId)
    .limit(300);

  if (error) throw new Error("Could not load items to match against.");

  return (data ?? []).map((row: any) => {
    const photos = [...(row.listing_photos ?? [])].sort((a: any, b: any) => a.position - b.position);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      wantsInExchange: row.wants_in_exchange,
      openToOffers: row.open_to_offers ?? false,
      bundleAllowed: row.bundle_allowed ?? false,
      imageUrl: photos[0]?.url ?? null,
      ownerId: row.owner_id,
      ownerName: row.profiles?.name ?? "Unknown",
      ownerBarangay: row.profiles?.barangay ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function findMatches(input: {
  userId: string;
  myBarangay: string | null;
  offers: OfferItem[];
  wants: WantItem[];
}): Promise<MatchResult[]> {
  const candidates = await fetchCandidates(input.userId);
  return computeMatches({
    candidates,
    offers: input.offers,
    wants: input.wants,
    myBarangay: input.myBarangay,
  });
}