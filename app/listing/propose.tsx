import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Pressable, Image } from "react-native";
import { Check } from "lucide-react-native";
import { fetchMyListings, type Listing } from "@/lib/listingsApi";
import { proposeTrade } from "@/lib/tradesApi";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageX } from "lucide-react-native";

export default function ProposeTradeScreen() {
  const { targetListingId, targetTitle, recipientId } = useLocalSearchParams<{
    targetListingId: string;
    targetTitle: string;
    recipientId: string;
  }>();
  const user = useAuthStore((s) => s.user);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMyListings(user.id)
      .then(setMyListings)
      .catch(() => setMyListings([]))
      .finally(() => setLoading(false));
  }, [user]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleSend() {
    if (!user) return;
    if (selectedIds.length === 0) {
      setError("Select at least one item to offer.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await proposeTrade({
        proposerId: user.id,
        recipientId,
        targetListingId,
        offeredListingIds: selectedIds,
        message: message.trim(),
      });
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? "Could not send your proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <Check size={30} color="#2E7D32" />
        </View>
        <Text className="mb-2 text-center text-2xl font-bold text-ink">Proposal sent!</Text>
        <Text className="mb-8 text-center text-base text-muted">
          You'll be notified when they respond. Check the Trades tab for updates.
        </Text>
        <View className="w-full">
          <Button label="Go to Trades" onPress={() => router.replace("/(tabs)/trades")} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="mb-1 text-2xl font-bold text-ink">Propose Trade</Text>
      <Text className="mb-6 text-base text-muted">For: {targetTitle}</Text>

      {error ? <ErrorBanner message={error} /> : null}

      <Text className="mb-3 text-sm font-semibold text-ink">Select items to offer</Text>

      {loading ? (
        <ActivityIndicator color="#243B53" />
      ) : myListings.length === 0 ? (
        <EmptyState
          icon={PackageX}
          title="You have no listings"
          subtitle="Post a listing first so you have something to offer in trade."
        />
      ) : (
        <ScrollView className="mb-4 max-h-64">
          {myListings.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleSelect(item.id)}
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
          })}
        </ScrollView>
      )}

      <Input
        label="Message (optional)"
        placeholder="Would you be interested in this?"
        multiline
        numberOfLines={3}
        style={{ height: 70, textAlignVertical: "top", paddingTop: 10 }}
        value={message}
        onChangeText={setMessage}
      />

      <Button label="Send Proposal" onPress={handleSend} loading={submitting} disabled={myListings.length === 0} />
    </View>
  );
}