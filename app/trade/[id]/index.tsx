import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, AlertTriangle } from "lucide-react-native";
import {
  fetchTradeTimeline,
  acceptTrade,
  rejectTrade,
  cancelTrade,
  type TradeTimeline,
  type TradeRound,
} from "@/lib/tradesApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const MAX_ROUNDS = 5;

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-accent" },
  accepted: { label: "Accepted", color: "text-secondary" },
  countered: { label: "Countered", color: "text-secondary" },
  meetup_pending: { label: "Meetup Pending", color: "text-secondary" },
  meetup_confirmed: { label: "Meetup Confirmed", color: "text-secondary" },
  completed: { label: "Completed", color: "text-success" },
  rejected: { label: "Rejected", color: "text-danger" },
  cancelled: { label: "Cancelled", color: "text-danger" },
  disputed: { label: "Disputed", color: "text-danger" },
};

export default function TradeTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [trade, setTrade] = useState<TradeTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchTradeTimeline(id)
      .then(setTrade)
      .catch(() => setTrade(null))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(load);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#243B53" />
      </SafeAreaView>
    );
  }

  if (!trade || !user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-base text-muted">This trade could not be found.</Text>
      </SafeAreaView>
    );
  }

  const currentTrade = trade;

  const isProposer = user.id === currentTrade.proposerId;
  const otherPersonName = isProposer ? currentTrade.recipientName : currentTrade.proposerName;
  const latestRound = currentTrade.rounds[currentTrade.rounds.length - 1];
  const latestRoundIsMine = latestRound?.proposedBy === user.id;

  const canRespond =
    (currentTrade.status === "pending" || currentTrade.status === "countered") && !latestRoundIsMine;
  const roundLimitReached = currentTrade.roundCount >= MAX_ROUNDS;

  async function handleAccept() {
    setActionLoading(true);
    setError(null);
    try {
      await acceptTrade(currentTrade.id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleReject() {
    Alert.alert("Reject this trade?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          setError(null);
          try {
            await rejectTrade(currentTrade.id);
            load();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  function handleCancelProposal() {
    Alert.alert("Withdraw this proposal?", "The other person will no longer see it.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await cancelTrade(currentTrade.id);
            load();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#263238" />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-semibold text-ink">Trade with {otherPersonName}</Text>
        <View className={`rounded-full px-2.5 py-1 bg-card border border-border`}>
          <Text className={`text-xs font-medium ${statusLabels[currentTrade.status]?.color}`}>
            {statusLabels[currentTrade.status]?.label ?? currentTrade.status}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-4">
        {error ? <ErrorBanner message={error} /> : null}

        {currentTrade.needsAttention ? (
          <View className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
            <View className="mb-2 flex-row items-center gap-2">
              <AlertTriangle size={16} color="#B3261E" />
              <Text className="text-sm font-semibold text-danger">This trade needs updating</Text>
            </View>
            <Text className="mb-3 text-sm text-danger">{currentTrade.attentionReason}</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Edit Trade" variant="outline" onPress={() => router.push(`/trade/${currentTrade.id}/counter`)} />
              </View>
              <View className="flex-1">
                <Button label="Cancel Trade" variant="ghost" onPress={handleCancelProposal} />
              </View>
            </View>
          </View>
        ) : null}

        {currentTrade.rounds.map((round, index) => (
          <RoundCard
            key={round.id}
            round={round}
            isLatest={index === currentTrade.rounds.length - 1}
            currentUserId={user.id}
            proposerName={currentTrade.proposerName}
            recipientName={currentTrade.recipientName}
          />
        ))}
      </ScrollView>

      <View className="border-t border-border bg-background px-5 py-4">
        {canRespond && !currentTrade.needsAttention ? (
          <View className="gap-2">
            <Button label="Accept" onPress={handleAccept} loading={actionLoading} />
            {!roundLimitReached ? (
              <Button
                label="Counter"
                variant="outline"
                onPress={() => router.push(`/trade/${currentTrade.id}/counter`)}
                disabled={actionLoading}
              />
            ) : (
              <Text className="text-center text-xs text-muted">
                Negotiation limit reached — accept or reject to continue.
              </Text>
            )}
            <Button label="Reject" variant="ghost" onPress={handleReject} disabled={actionLoading} />
          </View>
        ) : null}

        {currentTrade.status === "pending" && isProposer ? (
          <View className="gap-2">
            <Text className="text-center text-sm text-muted">Waiting for {otherPersonName} to respond.</Text>
            <Button label="Withdraw Proposal" variant="ghost" onPress={handleCancelProposal} disabled={actionLoading} />
          </View>
        ) : null}

        {currentTrade.status === "countered" && latestRoundIsMine ? (
          <Text className="text-center text-sm text-muted">
            Waiting for {otherPersonName} to respond to your counter.
          </Text>
        ) : null}

        {currentTrade.status === "accepted" ? (
          <Button label="Schedule Meetup" onPress={() => router.push(`/trade/${currentTrade.id}/meetup`)} />
        ) : null}

        {currentTrade.status === "meetup_pending" || currentTrade.status === "meetup_confirmed" ? (
          <Button label="View Meetup" variant="outline" onPress={() => router.push(`/trade/${currentTrade.id}/meetup`)} />
        ) : null}

        {currentTrade.status === "completed" ? (
          <Text className="text-center text-sm text-success">This trade is complete.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function RoundCard({
  round,
  isLatest,
  currentUserId,
}: {
  round: TradeRound;
  isLatest: boolean;
  currentUserId: string;
  proposerName?: string;
  recipientName?: string;
}) {
  const proposedByLabel = round.proposedBy === currentUserId ? "You" : "them";
  const heading = round.roundNumber === 1 ? "Original proposal" : `Counter offer #${round.roundNumber - 1}`;

  return (
    <View className={`mb-3 ${isLatest ? "" : "opacity-50"}`}>
      <Text className="mb-1.5 text-xs font-medium text-muted">
        {heading} &middot; {proposedByLabel}
      </Text>
      <View
        className={`rounded-xl p-3 ${
          isLatest ? "border-2 border-primary bg-primary/5" : "border border-border bg-card"
        }`}
      >
        {round.items.map((item) => (
          <View key={item.id} className="mb-2 flex-row items-center last:mb-0">
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} className="h-10 w-10 rounded-md bg-border" />
            ) : (
              <View className="h-10 w-10 rounded-md bg-border" />
            )}
            <View className="ml-3 flex-1">
              <Text className="text-sm text-ink" numberOfLines={1}>
                {item.listingTitle}
              </Text>
              <Text className="text-xs text-muted">
                From {item.offeredBy === currentUserId ? "you" : "them"}
              </Text>
            </View>
          </View>
        ))}
        {round.message ? (
          <Text className="mt-2 border-t border-border pt-2 text-sm italic text-muted">"{round.message}"</Text>
        ) : null}
      </View>
    </View>
  );
}