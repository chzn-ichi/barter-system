import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { Info, MapPin, Package } from "lucide-react-native";
import type { MatchResult } from "@/lib/matchAlgorithm";
import { Button } from "@/components/ui/Button";

function percentColor(p: number) {
  if (p >= 75) return "text-success";
  if (p >= 50) return "text-primary";
  return "text-muted";
}

export function MatchCard({
  result,
  offerSummary,
  onPress,
}: {
  result: MatchResult;
  offerSummary: string;
  onPress: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { listing, percent } = result;

  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center">
        <Text className={`text-xl font-bold ${percentColor(percent)}`}>{percent}% Match</Text>
        <Pressable onPress={() => setInfoOpen(true)} hitSlop={10} className="ml-2">
          <Info size={16} color="#64748B" />
        </Pressable>
      </View>

      <View className="flex-row items-center">
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} className="h-16 w-16 rounded-lg bg-border" />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-border">
            <Package size={20} color="#64748B" />
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-xs text-muted">You offer</Text>
          <Text numberOfLines={1} className="mb-1.5 text-sm text-ink">
            {offerSummary}
          </Text>
          <Text className="text-xs text-muted">You'd get</Text>
          <Text numberOfLines={1} className="text-sm font-semibold text-ink">
            {listing.title}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <MapPin size={12} color="#64748B" />
        <Text numberOfLines={1} className="ml-1 flex-1 text-xs text-muted">
          {listing.ownerBarangay ?? "Cagayan de Oro"} &middot; {listing.ownerName}
        </Text>
      </View>

      <View className="mt-3">
        <Button label="View match" variant="outline" onPress={onPress} />
      </View>

      <Modal visible={infoOpen} animationType="fade" transparent onRequestClose={() => setInfoOpen(false)}>
        <View className="flex-1 items-center justify-center bg-ink/50 px-8">
          <View className="w-full max-w-sm rounded-2xl bg-card px-5 pb-5 pt-6">
            <Text className="mb-2 text-center text-lg font-bold text-ink">{percent}% Match</Text>
            <Text className="mb-4 text-center text-sm leading-5 text-muted">
              Based on: item compatibility, category, wants, bundle compatibility, and quantity.
            </Text>
            <Button label="Got it" onPress={() => setInfoOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}