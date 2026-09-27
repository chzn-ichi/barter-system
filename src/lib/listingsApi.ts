import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

export type Listing = {
  id: string;
  title: string;
  category: string;
  condition: "Brand New" | "Like New" | "Good" | "Fair";
  wantsInExchange: string;
  imageUrl: string | null;
  ownerName: string;
  ownerId: string;
  createdAt: string;
};

export async function fetchActiveListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      category,
      condition,
      wants_in_exchange,
      created_at,
      owner_id,
      profiles ( name ),
      listing_photos ( url, position )
    `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load listings.");

  return (data ?? []).map((row: any) => {
    const photos = (row.listing_photos ?? []).sort((a: any, b: any) => a.position - b.position);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      condition: row.condition,
      wantsInExchange: row.wants_in_exchange,
      imageUrl: photos[0]?.url ?? null,
      ownerName: row.profiles?.name ?? "Unknown",
      ownerId: row.owner_id,
      createdAt: row.created_at,
    };
  });
}


export async function uploadListingPhoto(userId: string, localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const fileExt = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
  const path = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from("listing-photos")
    .upload(path, decode(base64), {
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
  condition: "Brand New" | "Like New" | "Good" | "Fair";
  description: string;
  hasFlaw: boolean;
  flawDescription: string;
  wantsInExchange: string;
  bundleAllowed: boolean;
  photoUrls: string[];
}) {
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      owner_id: input.ownerId,
      title: input.title,
      category: input.category,
      condition: input.condition,
      description: input.description || null,
      has_flaw: input.hasFlaw,
      flaw_description: input.hasFlaw ? input.flawDescription || null : null,
      wants_in_exchange: input.wantsInExchange,
      bundle_allowed: input.bundleAllowed,
    })
    .select()
    .single();

  if (listingError || !listing) throw new Error("Could not create listing.");

  if (input.photoUrls.length > 0) {
    const photoRows = input.photoUrls.map((url, index) => ({
      listing_id: listing.id,
      url,
      position: index,
    }));
    const { error: photosError } = await supabase.from("listing_photos").insert(photoRows);
    if (photosError) throw new Error("Listing created, but photos failed to attach.");
  }

  return listing;
}


export async function fetchMyListings(ownerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      category,
      condition,
      wants_in_exchange,
      created_at,
      owner_id,
      profiles ( name ),
      listing_photos ( url, position )
    `
    )
    .eq("owner_id", ownerId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load your listings.");

  return (data ?? []).map((row: any) => {
    const photos = (row.listing_photos ?? []).sort((a: any, b: any) => a.position - b.position);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      condition: row.condition,
      wantsInExchange: row.wants_in_exchange,
      imageUrl: photos[0]?.url ?? null,
      ownerName: row.profiles?.name ?? "Unknown",
      ownerId: row.owner_id,
      createdAt: row.created_at,
    };
  });
}


export type ListingDetail = Listing & {
  description: string | null;
  hasFlaw: boolean;
  flawDescription: string | null;
  photoUrls: string[];
};

export async function fetchListingById(id: string): Promise<ListingDetail> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      category,
      condition,
      description,
      has_flaw,
      flaw_description,
      wants_in_exchange,
      created_at,
      owner_id,
      profiles ( name ),
      listing_photos ( url, position )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Could not load this listing.");

  const photos = (data.listing_photos ?? []).sort((a: any, b: any) => a.position - b.position);

  return {
    id: data.id,
    title: data.title,
    category: data.category,
    condition: data.condition,
    description: data.description,
    hasFlaw: data.has_flaw,
    flawDescription: data.flaw_description,
    wantsInExchange: data.wants_in_exchange,
    imageUrl: photos[0]?.url ?? null,
    photoUrls: photos.map((p: any) => p.url),
    ownerName: (data.profiles as any)?.name ?? "Unknown",
    ownerId: data.owner_id,
    createdAt: data.created_at,
  };
}


export async function fetchActiveListingsByOwner(ownerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id, title, category, condition, wants_in_exchange, created_at, owner_id,
      profiles ( name ),
      listing_photos ( url, position )
      `
    )
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load listings.");

  return (data ?? []).map((row: any) => {
    const photos = (row.listing_photos ?? []).sort((a: any, b: any) => a.position - b.position);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      condition: row.condition,
      wantsInExchange: row.wants_in_exchange,
      imageUrl: photos[0]?.url ?? null,
      ownerName: row.profiles?.name ?? "Unknown",
      ownerId: row.owner_id,
      createdAt: row.created_at,
    };
  });
}