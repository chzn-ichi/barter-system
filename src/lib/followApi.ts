import { supabase } from "@/lib/supabase";

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
  if (error) throw new Error("Could not follow this person.");
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw new Error("Could not unfollow this person.");
}

export async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export type FollowedPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  barangay: string | null;
};

export async function fetchFollowing(userId: string): Promise<FollowedPerson[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!follows_following_id_fkey ( id, name, avatar_url, barangay )")
    .eq("follower_id", userId);

  if (error) throw new Error("Could not load your following list.");
  return (data ?? []).map((row: any) => ({
    id: row.profiles.id,
    name: row.profiles.name,
    avatarUrl: row.profiles.avatar_url,
    barangay: row.profiles.barangay,
  }));
}

export async function fetchFollowers(userId: string): Promise<FollowedPerson[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!follows_follower_id_fkey ( id, name, avatar_url, barangay )")
    .eq("following_id", userId);

  if (error) throw new Error("Could not load your followers.");
  return (data ?? []).map((row: any) => ({
    id: row.profiles.id,
    name: row.profiles.name,
    avatarUrl: row.profiles.avatar_url,
    barangay: row.profiles.barangay,
  }));
}

export async function fetchListingsFromFollowed(userId: string) {
  const { data: followingRows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  const followingIds = (followingRows ?? []).map((r) => r.following_id);
  if (followingIds.length === 0) return [];

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id, title, category, condition, wants_in_exchange, open_to_offers, visibility, created_at, owner_id,
      profiles ( name, barangay ),
      listing_photos ( url, position )
      `
    )
    .in("owner_id", followingIds)
    .eq("status", "active")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error("Could not load items from people you follow.");

  return (data ?? []).map((row: any) => {
    const photos = (row.listing_photos ?? []).sort((a: any, b: any) => a.position - b.position);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      condition: row.condition,
      wantsInExchange: row.wants_in_exchange,
      openToOffers: row.open_to_offers ?? false,
      visibility: row.visibility,
      imageUrl: photos[0]?.url ?? null,
      ownerName: row.profiles?.name ?? "Unknown",
      ownerBarangay: row.profiles?.barangay ?? null,
      ownerId: row.owner_id,
      createdAt: row.created_at,
    };
  });
}