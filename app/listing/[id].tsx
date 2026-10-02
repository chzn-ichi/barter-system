import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, ArrowLeft, ImageOff, MapPin } from "lucide-react-native";
import { fetchListingById, type ListingDetail } from "@/lib/listingsApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const imageWidth = width - 40;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

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
        <Text className="mb-4 text-center text-base text-muted">This listing could not be found.</Text>
        <Button label="Go Back" variant="outline" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const current = listing;
  const isOwnListing = user?.id === current.ownerId;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#263238" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-8">
        <View className="mb-2 overflow-hidden rounded-xl bg-border" style={{ width: imageWidth, height: 260 }}>
          {current.photoUrls.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth))
              }
            >
              {current.photoUrls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width: imageWidth, height: 260 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View className="h-full w-full items-center justify-center">
              <ImageOff size={32} color="#6B7280" />
            </View>
          )}

          <View className="absolute left-3 top-3 rounded-md bg-card px-2.5 py-1">
            <Text className="text-xs font-medium text-ink">{current.condition}</Text>
          </View>
        </View>

        {current.photoUrls.length > 1 ? (
          <View className="mb-4 flex-row justify-center gap-1.5">
            {current.photoUrls.map((url, i) => (
              <View
                key={url}
                className={`h-1.5 w-1.5 rounded-full ${i === photoIndex ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </View>
        ) : (
          <View className="mb-4" />
        )}

        <Text className="mb-1 text-2xl font-bold text-ink">{current.title}</Text>
        <Text className="mb-6 text-sm text-accent">{current.category}</Text>

        <View
          className="relative mb-6 mt-2 rounded-xl border border-accent/30 bg-accent/10 px-4 pb-4 pt-5"
          style={{ transform: [{ rotate: "-1deg" }] }}
        >
          <View className="absolute -top-2 left-1/2 h-4 w-4 rounded-full border-2 border-card bg-seal" />
          <Text className="mb-1 text-xs font-medium text-accent">In return, they'd like…</Text>
          <Text className="font-hand text-lg leading-6 text-ink">
            {current.openToOffers || !current.wantsInExchange
              ? "Open to offers. Tell me what you have!"
              : current.wantsInExchange}
          </Text>
        </View>

        {current.description ? (
          <View className="mb-5">
            <Text className="mb-1 text-sm font-semibold text-ink">About this item</Text>
            <Text className="text-base leading-6 text-muted">{current.description}</Text>
          </View>
        ) : null}

        {current.hasFlaw ? (
          <View className="mb-5 rounded-xl border border-border bg-card p-4">
            <View className="mb-1.5 flex-row items-center gap-2">
              <AlertTriangle size={16} color="#8B6F47" />
              <Text className="text-sm font-semibold text-ink">Worth knowing</Text>
            </View>
            <Text className="text-sm leading-5 text-muted">
              {current.flawDescription || "The owner noted a flaw but didn't describe it."}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push(`/user/${current.ownerId}`)}
          className="flex-row items-center rounded-xl border border-border bg-card p-3"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-border">
            <Text className="text-base font-bold text-muted">
              {current.ownerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-ink">{current.ownerName}</Text>
            {current.ownerBarangay ? (
              <View className="mt-0.5 flex-row items-center gap-1">
                <MapPin size={12} color="#6B7280" />
                <Text className="text-xs text-muted">{current.ownerBarangay}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </ScrollView>

      <View className="border-t border-border bg-background px-5 py-4">
        {isOwnListing ? (
          <Text className="text-center text-sm text-muted">This is your own listing.</Text>
        ) : (
          <Button
            label="Propose Trade"
            onPress={() =>
              router.push({
                pathname: "/listing/propose",
                params: {
                  targetListingId: current.id,
                  targetTitle: current.title,
                  recipientId: current.ownerId,
                },
              })
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}