import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Heart, Package, UserPlus, UserCheck } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { fetchActiveListingsByOwner, type Listing } from "@/lib/listingsApi";
import { followUser, unfollowUser, isFollowing, getFollowCounts } from "@/lib/followApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { fetchWantedItems, type WantedItem } from "@/lib/wantedApi";

type PublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  barangay: string | null;
  completedTrades: number;
  reviewsCount: number;
};

export default function PublicStallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [following, setFollowingState] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profileRow }, items, wanted, followState, followCounts] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, avatar_url, barangay, completed_trades, reviews_count")
          .eq("id", id)
          .single(),
        fetchActiveListingsByOwner(id),
        fetchWantedItems(id),
        currentUser ? isFollowing(currentUser.id, id) : Promise.resolve(false),
        getFollowCounts(id),
      ]);

      if (profileRow) {
        setProfile({
          id: profileRow.id,
          name: profileRow.name,
          avatarUrl: profileRow.avatar_url,
          barangay: profileRow.barangay,
          completedTrades: profileRow.completed_trades,
          reviewsCount: profileRow.reviews_count,
        });
      }
      setListings(items);
      setWantedItems(wanted);
      setFollowingState(followState);
      setCounts(followCounts);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleToggleFollow() {
    if (!currentUser) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(currentUser.id, id);
        setFollowingState(false);
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      } else {
        await followUser(currentUser.id, id);
        setFollowingState(true);
        setCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch {
      // keep it simple — silently ignore, counts will self-correct on next load
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#243B53" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-base text-muted">This stall could not be found.</Text>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="pb-10">
        <View
          className="bg-accent"
          style={{
            height: 150,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            paddingHorizontal: 20,
            paddingTop: 14,
          }}
        >
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
            <ArrowLeft size={20} color="#FFFFF8" />
          </Pressable>
        </View>

        <View className="items-center px-5">
          <View className="-mt-10 h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-card">
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} className="h-full w-full rounded-full" />
            ) : (
              <Text className="text-2xl font-bold text-muted">{profile.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          <Text className="mt-2 text-xl font-bold text-ink">{profile.name}</Text>
          <Text className="mb-4 text-sm text-muted">
            {profile.barangay ? `${profile.barangay}, Cagayan de Oro` : "Cagayan de Oro"}
          </Text>

          <View className="mb-5 items-center">
            <Text className="text-sm text-muted">
              {profile.completedTrades} {profile.completedTrades === 1 ? "Trade" : "Trades"}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {counts.followers} {counts.followers === 1 ? "Follower" : "Followers"} &middot;{" "}
              {counts.following} Following
            </Text>
          </View>

          {!isOwnProfile ? (
            <View className="mb-6 w-full">
              <Button
                label={following ? "Following" : "Follow"}
                variant={following ? "outline" : "primary"}
                onPress={handleToggleFollow}
                loading={followLoading}
              />
            </View>
          ) : null}
        </View>

        <View className="px-5">
          <Text className="mb-3 text-lg font-semibold text-ink">On the stall</Text>
          {listings.length === 0 ? (
            <Text className="text-sm text-muted">Nothing posted yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {listings.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/listing/${item.id}`)}
                  style={{ width: 128 }}
                >
                  <View className="overflow-hidden rounded-xl bg-border" style={{ height: 128 }}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Package size={20} color="#6B7280" />
                      </View>
                    )}
                  </View>
                  <Text numberOfLines={1} className="mt-1.5 text-xs text-ink">
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {wantedItems.length > 0 ? (
          <View className="mt-6 px-5">
            <Text className="mb-3 text-lg font-semibold text-ink">Wanted Board</Text>
            <View className="flex-row flex-wrap gap-2">
              {wantedItems.map((item) => (
                <View key={item.id} className="rounded-full border border-border bg-card px-3 py-1.5">
                  <Text className="text-sm text-ink">{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}