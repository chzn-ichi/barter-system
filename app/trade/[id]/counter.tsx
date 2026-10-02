import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { fetchTradeTimeline, sendCounter } from "@/lib/tradesApi";
import { fetchMyListings, type Listing } from "@/lib/listingsApi";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { AddItemModal } from "@/components/trade/AddItemModal";

const QUICK_MESSAGES = ["I need a bit more", "Can you add something?", "A different item, please"];

type SimpleItem = { id: string; title: string; imageUrl: string | null };

export default function CounterTradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [otherUserId, setOtherUserId] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [offerNumber, setOfferNumber] = useState(1);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [extraMyItems, setExtraMyItems] = useState<SimpleItem[]>([]);
  const [theirItems, setTheirItems] = useState<SimpleItem[]>([]); // fixed, carried over as-is

  const [initialMyIds, setInitialMyIds] = useState<string[]>([]);
  const [myItemIds, setMyItemIds] = useState<string[]>([]);

  const [message, setMessage] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
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
        setOfferNumber(trade.roundCount + 1);

        const latestRound = trade.rounds[trade.rounds.length - 1];
        const myIds = latestRound.items.filter((i) => i.offeredBy === user.id).map((i) => i.listingId);
        const theirCurrentItems = latestRound.items
          .filter((i) => i.offeredBy === otherId)
          .map((i) => ({ id: i.listingId, title: i.listingTitle, imageUrl: i.imageUrl }));

        setInitialMyIds(myIds);
        setMyItemIds(myIds);
        setTheirItems(theirCurrentItems);

        const mine = await fetchMyListings(user.id, { includeOfferOnly: true });
        setMyListings(mine);
      } catch (e: any) {
        setError(e.message ?? "Could not load this trade.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  function toggleMine(itemId: string) {
    setMyItemIds((prev) => (prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]));
  }

  function handleItemAdded(listing: SimpleItem) {
    setExtraMyItems((prev) => [...prev, listing]);
    setMyItemIds((prev) => [...prev, listing.id]);
  }

  async function handleSend() {
    if (!user) return;
    if (myItemIds.length === 0) {
      setError("Pick at least one item to give.");
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
        theirItemIds: theirItems.map((i) => i.id), // carried over unchanged
        theirUserId: otherUserId,
      });
      router.replace(`/trade/${id}`);
    } catch (e: any) {
      setError(e.message ?? "Could not send your counter.");
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

  const myCombinedListings: SimpleItem[] = [...myListings, ...extraMyItems];

  return (
    <View className="flex-1 bg-background px-5 py-6">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-ink">Counter offer</Text>
        <Text className="text-xs text-muted">Offer {offerNumber} of 5</Text>
      </View>
      <Text className="mb-5 text-sm text-muted">
        Change what you give. To ask {otherUserName} for something different, leave a message below.
      </Text>

      {error ? <ErrorBanner message={error} /> : null}

      <ScrollView>
        <Text className="mb-2 text-sm font-semibold text-ink">You give</Text>
        {myCombinedListings.length === 0 ? (
          <Text className="mb-4 text-sm text-muted">You have no items to offer.</Text>
        ) : (
          myCombinedListings.map((item) => (
            <SelectableRow
              key={item.id}
              item={item}
              selected={myItemIds.includes(item.id)}
              tag={!initialMyIds.includes(item.id) && myItemIds.includes(item.id) ? "Added" : undefined}
              onPress={() => toggleMine(item.id)}
            />
          ))
        )}
        <Pressable onPress={() => setAddModalOpen(true)} className="mb-5 flex-row items-center gap-1.5">
          <Plus size={14} color="#243B53" />
          <Text className="text-sm text-primary">Add something else</Text>
        </Pressable>

        <Text className="mb-2 text-sm font-semibold text-ink">You get, from {otherUserName}</Text>
        <View className="mb-4">
          {theirItems.map((item) => (
            <View
              key={item.id}
              className="mb-2 flex-row items-center rounded-lg border border-border bg-card p-3 opacity-80"
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} className="h-12 w-12 rounded-md bg-border" />
              ) : (
                <View className="h-12 w-12 rounded-md bg-border" />
              )}
              <Text className="ml-3 flex-1 text-sm text-ink" numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          ))}
          <Text className="mt-1 text-xs text-muted">
            This is up to {otherUserName}. Say what you'd like below instead of picking it yourself.
          </Text>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          {QUICK_MESSAGES.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMessage(m)}
              className={`rounded-full border px-3 py-1.5 ${
                message === m ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <Text className="text-xs text-ink">{m}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Message (optional)"
          placeholder="e.g. Can you add a charger to the offer?"
          multiline
          numberOfLines={3}
          style={{ height: 70, textAlignVertical: "top", paddingTop: 10 }}
          value={message}
          onChangeText={setMessage}
        />
      </ScrollView>

      <Button label="Send Counter Offer" onPress={handleSend} loading={submitting} />
      <Text className="mt-2 text-center text-xs text-muted">Then it's {otherUserName}'s turn.</Text>

      {user ? (
        <AddItemModal
          visible={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          ownerId={user.id}
          onCreated={handleItemAdded}
        />
      ) : null}
    </View>
  );
}

function SelectableRow({
  item,
  selected,
  tag,
  onPress,
}: {
  item: SimpleItem;
  selected: boolean;
  tag?: string;
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
      {tag ? (
        <View className="mr-2 rounded-full bg-success/15 px-2 py-0.5">
          <Text className="text-[11px] text-success">{tag}</Text>
        </View>
      ) : null}
      {selected ? <Check size={18} color="#243B53" /> : null}
    </Pressable>
  );
}