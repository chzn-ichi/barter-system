import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Pressable } from "react-native";
import { fetchListingById, type ListingDetail } from "@/lib/listingsApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchListingById(id)
      .then((data) => {
        if (active) setListing(data);
      })
      .catch(() => {
        if (active) setListing(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#243B53" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-base text-muted">This listing could not be found.</Text>
        <View className="mt-4">
          <Button label="Go Back" variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isOwnListing = user?.id === listing.ownerId;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#263238" />
        </Pressable>
        <Text className="ml-2 text-lg font-semibold text-ink">Listing Details</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10">
        {listing.photoUrls.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="mb-4">
            {listing.photoUrls.map((url) => (
              <Image key={url} source={{ uri: url }} className="mr-2 h-64 w-80 rounded-xl bg-border" resizeMode="cover" />
            ))}
          </ScrollView>
        ) : (
          <View className="mb-4 h-64 w-full items-center justify-center rounded-xl bg-border">
            <Text className="text-sm text-muted">No photos</Text>
          </View>
        )}

        <Text className="mb-1 text-2xl font-bold text-ink">{listing.title}</Text>
        <Text className="mb-4 text-sm text-accent">{listing.category}</Text>

        <View className="mb-4 flex-row flex-wrap gap-2">
          <View className="rounded-full border border-border bg-card px-3 py-1.5">
            <Text className="text-xs text-ink">Condition: {listing.condition}</Text>
          </View>
          {listing.hasFlaw ? (
            <View className="rounded-full border border-border bg-card px-3 py-1.5">
              <Text className="text-xs text-ink">Has a flaw</Text>
            </View>
          ) : null}
        </View>

        {listing.description ? (
          <>
            <Text className="mb-1 text-sm font-semibold text-ink">Description</Text>
            <Text className="mb-4 text-base text-muted">{listing.description}</Text>
          </>
        ) : null}

        {listing.hasFlaw && listing.flawDescription ? (
          <>
            <Text className="mb-1 text-sm font-semibold text-ink">Flaw</Text>
            <Text className="mb-4 text-base text-muted">{listing.flawDescription}</Text>
          </>
        ) : null}

        <Text className="mb-1 text-sm font-semibold text-ink">Owner wants in exchange</Text>
        <Text className="mb-4 text-base text-muted">{listing.wantsInExchange}</Text>

        <Text className="mb-1 text-sm font-semibold text-ink">Posted by</Text>
        <Text className="mb-8 text-base text-muted">{listing.ownerName}</Text>

        {isOwnListing ? (
          <View className="rounded-lg border border-border bg-card px-4 py-3">
            <Text className="text-center text-sm text-muted">This is your own listing.</Text>
          </View>
        ) : (
          <Button
            label="Propose Trade"
            onPress={() =>
              router.push({
                pathname: "/listing/propose",
                params: { targetListingId: listing.id, targetTitle: listing.title, recipientId: listing.ownerId },
              })
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}