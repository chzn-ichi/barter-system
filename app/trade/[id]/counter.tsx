import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { fetchTradeTimeline, sendCounter } from "@/lib/tradesApi";
import { fetchMyListings, fetchActiveListingsByOwner, type Listing } from "@/lib/listingsApi";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export default function CounterTradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [otherUserId, setOtherUserId] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [theirListings, setTheirListings] = useState<Listing[]>([]);
  const [myItemIds, setMyItemIds] = useState<string[]>([]);
  const [theirItemIds, setTheirItemIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const trade = await fetchTradeTimeline(id);
        const otherId = user.id === trade.proposerId ? trade.recipientId : trade.proposerId;
        const otherName = user.id === trade.proposerId ? trade.recipientName : trade.proposerName;
        setOtherUserId(otherId);
        setOtherUserName(otherName);

        const latestRound = trade.rounds[trade.rounds.length - 1];
        setMyItemIds(latestRound.items.filter((i) => i.offeredBy === user.id).map((i) => i.listingId));
        setTheirItemIds(latestRound.items.filter((i) => i.offeredBy === otherId).map((i) => i.listingId));

        const [mine, theirs] = await Promise.all([
          fetchMyListings(user.id),
          fetchActiveListingsByOwner(otherId),
        ]);
        setMyListings(mine);
        setTheirListings(theirs);
      } catch (e: any) {
        setError(e.message ?? "Could not load trade details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  function toggle(list: string[], setList: (v: string[]) => void, itemId: string) {
    setList(list.includes(itemId) ? list.filter((i) => i !== itemId) : [...list, itemId]);
  }

  async function handleSend() {
    if (!user) return;
    if (myItemIds.length === 0 || theirItemIds.length === 0) {
      setError("Select at least one item on each side.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await sendCounter({
        tradeId: id,
        proposedBy: user.id,
        message: message.trim(),
        myItemIds,
        theirItemIds,
        theirUserId: otherUserId,
      });
      router.replace(`/trade/${id}`);
    } catch (e: any) {
      setError(e.message ?? "Could not send counteroffer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#243B53" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="mb-1 text-2xl font-bold text-ink">Counter Offer</Text>
      <Text className="mb-6 text-base text-muted">With {otherUserName}</Text>

      {error ? <ErrorBanner message={error} /> : null}

      <ScrollView>
        <Text className="mb-2 text-sm font-semibold text-ink">You give</Text>
        {myListings.length === 0 ? (
          <Text className="mb-4 text-sm text-muted">You have no listings to offer.</Text>
        ) : (
          myListings.map((item) => (
            <SelectableRow
              key={item.id}
              item={item}
              selected={myItemIds.includes(item.id)}
              onPress={() => toggle(myItemIds, setMyItemIds, item.id)}
            />
          ))
        )}

        <Text className="mb-2 mt-4 text-sm font-semibold text-ink">You receive</Text>
        {theirListings.length === 0 ? (
          <Text className="mb-4 text-sm text-muted">{otherUserName} has no active listings.</Text>
        ) : (
          theirListings.map((item) => (
            <SelectableRow
              key={item.id}
              item={item}
              selected={theirItemIds.includes(item.id)}
              onPress={() => toggle(theirItemIds, setTheirItemIds, item.id)}
            />
          ))
        )}

        <View className="mt-4">
          <Input
            label="Message (optional)"
            placeholder="e.g. Can you add a charger to the offer?"
            multiline
            numberOfLines={3}
            style={{ height: 70, textAlignVertical: "top", paddingTop: 10 }}
            value={message}
            onChangeText={setMessage}
          />
        </View>
      </ScrollView>

      <Button label="Send Counter Offer" onPress={handleSend} loading={submitting} />
    </View>
  );
}

function SelectableRow({
  item,
  selected,
  onPress,
}: {
  item: Listing;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 flex-row items-center rounded-lg border p-3 ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} className="h-12 w-12 rounded-md bg-border" />
      ) : (
        <View className="h-12 w-12 rounded-md bg-border" />
      )}
      <Text className="ml-3 flex-1 text-sm text-ink" numberOfLines={1}>
        {item.title}
      </Text>
      {selected ? <Check size={18} color="#243B53" /> : null}
    </Pressable>
  );
}