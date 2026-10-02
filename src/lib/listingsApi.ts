import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

export type Condition = "Brand New" | "Like New" | "Good" | "Fair";

export type Listing = {
  id: string;
  title: string;
  category: string;
  condition: Condition;
  wantsInExchange: string | null;
  openToOffers: boolean;
  visibility: "public" | "offer_only";
  imageUrl: string | null;
  ownerName: string;
  ownerBarangay?: string | null;
  ownerId: string;
  createdAt: string;
};

export type ListingDetail = Listing & {
  description: string | null;
  hasFlaw: boolean;
  flawDescription: string | null;
  photoUrls: string[];
};

const LISTING_SELECT = `
  id,
  title,
  category,
  condition,
  wants_in_exchange,
  open_to_offers,
  visibility,
  created_at,
  owner_id,
  profiles ( name, barangay ),
  listing_photos ( url, position )
`;

function sortedPhotos(row: any): { url: string; position: number }[] {
  return [...(row.listing_photos ?? [])].sort((a: any, b: any) => a.position - b.position);
}

function mapListing(row: any): Listing {
  const photos = sortedPhotos(row);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    condition: row.condition,
    wantsInExchange: row.wants_in_exchange,
    openToOffers: row.open_to_offers ?? false,
    visibility: row.visibility ?? "public",
    imageUrl: photos[0]?.url ?? null,
    ownerName: row.profiles?.name ?? "Unknown",
    ownerBarangay: row.profiles?.barangay ?? null,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

export async function fetchActiveListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load listings.");
  return (data ?? []).map(mapListing);
}

export async function fetchMyListings(
  ownerId: string,
  options?: { includeOfferOnly?: boolean }
): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "active");

  if (!options?.includeOfferOnly) {
    query = query.eq("visibility", "public");
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your listings.");
  return (data ?? []).map(mapListing);
}

export async function fetchActiveListingsByOwner(ownerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load listings.");
  return (data ?? []).map(mapListing);
}

export async function fetchListingById(id: string): Promise<ListingDetail> {
  const { data, error } = await supabase
    .from("listings")
    .select(`${LISTING_SELECT.trim()}, description, has_flaw, flaw_description`)
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Could not load this listing.");

  const row: any = data;
  return {
    ...mapListing(row),
    description: row.description,
    hasFlaw: row.has_flaw,
    flawDescription: row.flaw_description,
    photoUrls: sortedPhotos(row).map((p) => p.url),
  };
}

export async function uploadListingPhoto(userId: string, localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileExt = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
  const path = `${userId}/${fileName}`;

  const { error } = await supabase.storage.from("listing-photos").upload(path, decode(base64), {
    contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
  });

  if (error) throw new Error("Could not upload photo.");

  const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function createListing(input: {
  ownerId: string;
  title: string;
  category: string;
  condition: Condition;
  description?: string;
  hasFlaw?: boolean;
  flawDescription?: string;
  wantsInExchange?: string;
  openToOffers?: boolean;
  bundleAllowed?: boolean;
  visibility?: "public" | "offer_only";
  photoUrls?: string[];
}) {
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      owner_id: input.ownerId,
      title: input.title,
      category: input.category,
      condition: input.condition,
      description: input.description?.trim() || null,
      has_flaw: input.hasFlaw ?? false,
      flaw_description: input.hasFlaw ? input.flawDescription?.trim() || null : null,
      wants_in_exchange: input.openToOffers ? null : input.wantsInExchange?.trim() || null,
      open_to_offers: input.openToOffers ?? false,
      bundle_allowed: input.bundleAllowed ?? false,
      visibility: input.visibility ?? "public",
    })
    .select()
    .single();

  if (listingError || !listing) throw new Error("Could not create listing.");

  const photoUrls = input.photoUrls ?? [];
  if (photoUrls.length > 0) {
    const photoRows = photoUrls.map((url, index) => ({
      listing_id: listing.id,
      url,
      position: index,
    }));
    const { error: photosError } = await supabase.from("listing_photos").insert(photoRows);
    if (photosError) throw new Error("Listing created, but photos failed to attach.");
  }

  return listing;
}

// An item added on the spot while making an offer. It never shows on the Market.
export async function createOfferOnlyItem(input: {
  ownerId: string;
  title: string;
  category: string;
  condition: Condition;
  photoUri?: string | null;
}): Promise<Listing> {
  const photoUrls: string[] = [];
  if (input.photoUri) {
    photoUrls.push(await uploadListingPhoto(input.ownerId, input.photoUri));
  }

  const row = await createListing({
    ownerId: input.ownerId,
    title: input.title.trim(),
    category: input.category,
    condition: input.condition,
    visibility: "offer_only",
    photoUrls,
  });

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    condition: row.condition,
    wantsInExchange: null,
    openToOffers: false,
    visibility: "offer_only",
    imageUrl: photoUrls[0] ?? null,
    ownerName: "You",
    ownerBarangay: null,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

// Removing only hides an item. It never cancels a deal that already includes it.
export async function removeListing(id: string) {
  const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
  if (error) throw new Error("Could not remove this item.");
}