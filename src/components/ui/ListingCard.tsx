import { Image, Pressable, Text, View } from "react-native";
import { ImageOff, ArrowLeftRight } from "lucide-react-native";
import type { Listing } from "@/lib/listingsApi";

export function ListingCard({
  listing,
  onPress,
  width,
}: {
  listing: Listing;
  onPress?: () => void;
  width?: number;
}) {
  const subtitle = listing.ownerBarangay ? `${listing.category} · ${listing.ownerBarangay}` : listing.category;

  const wantsText = listing.openToOffers
    ? "Open to offers"
    : listing.wantsInExchange
    ? `Looking for ${listing.wantsInExchange}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        transform: [{ translateY: pressed ? 1 : 0 }],
        opacity: pressed ? 0.95 : 1,
      })}
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
    >
      <View className="relative h-32 w-full bg-border">
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <ImageOff size={24} color="#6B7280" />
          </View>
        )}

        <View className="absolute left-2 top-2 rounded-md bg-card px-2 py-0.5">
          <Text className="text-[11px] font-medium text-ink">{listing.condition}</Text>
        </View>

        <View className="absolute right-3 top-2 h-2.5 w-2.5 rounded-full border border-border bg-background" />
      </View>

      <View className="p-3">
        <Text numberOfLines={1} className="text-sm font-semibold text-ink">
          {listing.title}
        </Text>
        <Text numberOfLines={1} className="mb-2 mt-0.5 text-[11px] text-muted">
          {subtitle}
        </Text>

        {wantsText ? (
          <View className="flex-row items-start gap-1.5 rounded-lg bg-accent/10 px-2 py-1.5">
            <View className="mt-1">
              <ArrowLeftRight size={12} color="#8B6F47" />
            </View>
            <Text numberOfLines={2} className="flex-1 font-hand text-sm leading-5 text-accent">
              {wantsText}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}