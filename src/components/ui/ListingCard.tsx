import { Image, Pressable, Text, View } from "react-native";
import { ImageOff } from "lucide-react-native";
import type { Listing } from "@/lib/listingsApi";

export function ListingCard({ listing, onPress, width }: { listing: Listing; onPress?: () => void; width?: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={width ? { width } : undefined}
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
    >
      {listing.imageUrl ? (
        <Image source={{ uri: listing.imageUrl }} className="h-32 w-full bg-border" resizeMode="cover" />
      ) : (
        <View className="h-32 w-full items-center justify-center bg-border">
          <ImageOff size={24} color="#6B7280" />
        </View>
      )}
      <View className="p-3">
        <Text numberOfLines={1} className="mb-1 text-sm font-semibold text-ink">
          {listing.title}
        </Text>
        <Text className="mb-1.5 text-xs text-accent">{listing.category}</Text>
        <Text numberOfLines={1} className="text-xs text-muted">
          Wants: {listing.wantsInExchange}
        </Text>
      </View>
    </Pressable>
  );
}