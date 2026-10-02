import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react-native";
import {
  fetchTradeTimeline,
  acceptRound,
  rejectTrade,
  cancelTrade,
  diffRounds,
  type TradeTimeline,
  type TradeRound,
} from "@/lib/tradesApi";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const MAX_ROUNDS = 5;
const NEGOTIATING_STATUSES = ["pending", "countered"];
const OPEN_STATUSES = ["pending", "accepted", "countered"];

const finalStatusLabel: Record<string, string> = {
  completed: "Completed",
  rejected: "Declined",
  cancelled: "Cancelled",
  disputed: "Disputed",
  meetup_pending: "Meetup Pending",
  meetup_confirmed: "Meetup Confirmed",
};

export default function TradeTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [trade, setTrade] = useState<TradeTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const previousRounds = currentTrade.rounds.slice(0, -1);

  const myAccepted = isProposer ? latestRound?.proposerAccepted : latestRound?.recipientAccepted;
  const otherAccepted = isProposer ? latestRound?.recipientAccepted : latestRound?.proposerAccepted;

  const unavailableItem = latestRound?.items.find((i) => i.listingStatus === "traded");
  const isNegotiating = NEGOTIATING_STATUSES.includes(currentTrade.status);
  const roundLimitReached = currentTrade.roundCount >= MAX_ROUNDS;
  const canCancel = OPEN_STATUSES.includes(currentTrade.status);

  const theyGiveYou = latestRound?.items.filter((i) => i.offeredBy !== user.id) ?? [];
  const youGiveThem = latestRound?.items.filter((i) => i.offeredBy === user.id) ?? [];

  // Header badge: what state is this trade in, right now, in one or two words.
  let headerBadge = finalStatusLabel[currentTrade.status] ?? "";
  if (currentTrade.status === "accepted") headerBadge = "Confirmed";
  if (isNegotiating) headerBadge = myAccepted ? "Waiting" : "Your Turn";

  // Banner: one short sentence explaining what's going on and what happens next.
  let bannerTone: "accent" | "secondary" | "success" | "danger" = "accent";
  let bannerText = "";
  if (unavailableItem) {
    bannerTone = "danger";
    bannerText = `${unavailableItem.listingTitle} was traded away elsewhere. Counter with something else, or cancel.`;
  } else if (currentTrade.status === "accepted") {
    bannerTone = "success";
    bannerText = "Both of you agreed to this offer. Next, schedule a meetup.";
  } else if (currentTrade.status === "completed") {
    bannerTone = "success";
    bannerText = "This trade is complete.";
  } else if (currentTrade.status === "rejected") {
    bannerTone = "danger";
    bannerText = `${otherPersonName} declined this trade.`;
  } else if (currentTrade.status === "cancelled") {
    bannerTone = "danger";
    bannerText = "This trade was cancelled.";
  } else if (isNegotiating) {
    if (myAccepted) {
      bannerTone = "secondary";
      bannerText = `You accepted this offer. Waiting for ${otherPersonName} to accept.`;
    } else if (otherAccepted) {
      bannerTone = "accent";
      bannerText = `${otherPersonName} accepted this offer. Review it and accept to confirm.`;
    } else {
      bannerTone = "accent";
      bannerText = `${otherPersonName} sent you an offer. Accept, counter, or decline.`;
    }
  }

  const bannerStyles = {
    accent: "bg-accent/10 text-accent",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  }[bannerTone];

  async function handleAccept() {
    if (!latestRound) return;
    setActionLoading(true);
    setError(null);
    try {
      await acceptRound({ tradeId: currentTrade.id, roundId: latestRound.id, isProposer });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleDecline() {
    Alert.alert("Decline this trade?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
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

  function handleWithdraw() {
    Alert.alert("Withdraw this offer?", `${otherPersonName} will no longer see it.`, [
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

  function handleCancelConfirmed() {
    Alert.alert(
      "Cancel this trade?",
      "Both of you already agreed to this deal. Cancelling will end it and notify the other person.",
      [
        { text: "Keep Trade", style: "cancel" },
        {
          text: "Cancel Trade",
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
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#263238" />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-semibold text-ink">Trade with {otherPersonName}</Text>
        {headerBadge ? (
          <View className="rounded-full border border-border bg-card px-2.5 py-1">
            <Text className="text-xs font-medium text-ink">{headerBadge}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-4">
        {error ? <ErrorBanner message={error} /> : null}

        {bannerText ? (
          <View className={`mb-4 rounded-lg px-4 py-3 ${bannerStyles}`}>
            {unavailableItem ? (
              <View className="mb-1 flex-row items-center gap-2">
                <AlertTriangle size={16} color="#B3261E" />
                <Text className="text-sm font-semibold text-danger">This trade needs updating</Text>
              </View>
            ) : null}
            <Text className={`text-sm font-medium ${bannerStyles.split(" ")[1]}`}>{bannerText}</Text>
          </View>
        ) : null}

        {latestRound ? (
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {currentTrade.roundCount > 1 ? "Current offer" : "Offer"}
            </Text>

            <View className="rounded-xl border-2 border-primary bg-primary/5 p-3">
              {theyGiveYou.length > 0 ? (
                <View className="mb-3">
                  <Text className="mb-1.5 text-xs font-semibold text-secondary">THEY GIVE YOU</Text>
                  {theyGiveYou.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </View>
              ) : null}

              {youGiveThem.length > 0 ? (
                <View>
                  <Text className="mb-1.5 text-xs font-semibold text-accent">YOU GIVE THEM</Text>
                  {youGiveThem.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </View>
              ) : null}

              {latestRound.message ? (
                <Text className="mt-3 border-t border-border pt-2 text-sm italic text-muted">
                  "{latestRound.message}"
                </Text>
              ) : null}

              <View className="mt-3 flex-row gap-4 border-t border-border pt-2">
                <Text className="text-xs text-muted">
                  {myAccepted ? "✓ You accepted" : "○ You haven't accepted yet"}
                </Text>
                <Text className="text-xs text-muted">
                  {otherAccepted ? `✓ ${otherPersonName} accepted` : `○ ${otherPersonName} hasn't accepted yet`}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {previousRounds.length > 0 ? (
          <View className="mb-2">
            <Pressable
              onPress={() => setHistoryOpen((v) => !v)}
              className="flex-row items-center justify-between rounded-lg bg-card px-3 py-2.5"
            >
              <Text className="text-xs font-medium text-muted">
                Proposal history &middot; {previousRounds.length} earlier{" "}
                {previousRounds.length === 1 ? "offer" : "offers"}
              </Text>
              {historyOpen ? (
                <ChevronUp size={16} color="#6B7280" />
              ) : (
                <ChevronDown size={16} color="#6B7280" />
              )}
            </Pressable>

            {historyOpen ? (
              <View className="mt-2">
                {previousRounds.map((round, index) => {
                  const { added, removed } = diffRounds(currentTrade.rounds[index - 1], round);
                  return (
                    <HistoryRow
                      key={round.id}
                      round={round}
                      currentUserId={user.id}
                      added={added}
                      removed={removed}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View className="gap-2 border-t border-border bg-background px-5 py-4">
        {isNegotiating && !unavailableItem && !myAccepted ? (
          <View className="gap-2">
            <Button label="Accept" onPress={handleAccept} loading={actionLoading} />
            {!roundLimitReached ? (
              <Button
                label="Counter Offer"
                variant="outline"
                onPress={() => router.push(`/trade/${currentTrade.id}/counter`)}
                disabled={actionLoading}
              />
            ) : (
              <Text className="text-center text-xs text-muted">
                5 offers reached — accept or decline to continue.
              </Text>
            )}
            <Button label="Decline" variant="ghost" onPress={handleDecline} disabled={actionLoading} />
          </View>
        ) : null}

        {isNegotiating && !unavailableItem && myAccepted ? (
          <View className="gap-2">
            {!roundLimitReached ? (
              <Button
                label="Counter Offer"
                variant="outline"
                onPress={() => router.push(`/trade/${currentTrade.id}/counter`)}
                disabled={actionLoading}
              />
            ) : null}
            <Button label="Withdraw Offer" variant="ghost" onPress={handleWithdraw} disabled={actionLoading} />
          </View>
        ) : null}

        {isNegotiating && unavailableItem && !roundLimitReached ? (
          <Button
            label="Counter Offer"
            variant="outline"
            onPress={() => router.push(`/trade/${currentTrade.id}/counter`)}
            disabled={actionLoading}
          />
        ) : null}

        {currentTrade.status === "accepted" ? (
          <View className="gap-2">
            <Button label="Schedule a Meetup" onPress={() => router.push(`/trade/${currentTrade.id}/meetup`)} />
            <Button
              label="Cancel Trade"
              variant="ghost"
              onPress={handleCancelConfirmed}
              disabled={actionLoading}
            />
          </View>
        ) : null}

        {currentTrade.status === "meetup_pending" || currentTrade.status === "meetup_confirmed" ? (
          <Button
            label="View Meetup"
            variant="outline"
            onPress={() => router.push(`/trade/${currentTrade.id}/meetup`)}
          />
        ) : null}

        {canCancel && currentTrade.status !== "accepted" && !myAccepted ? (
          <Button label="Cancel Trade" variant="ghost" onPress={handleWithdraw} disabled={actionLoading} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ItemRow({ item }: { item: TradeRound["items"][number] }) {
  return (
    <View className="mb-2 flex-row items-center last:mb-0">
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} className="h-10 w-10 rounded-md bg-border" />
      ) : (
        <View className="h-10 w-10 rounded-md bg-border" />
      )}
      <Text className="ml-3 flex-1 text-sm text-ink" numberOfLines={1}>
        {item.listingTitle}
      </Text>
    </View>
  );
}

function HistoryRow({
  round,
  currentUserId,
  added,
  removed,
}: {
  round: TradeRound;
  currentUserId: string;
  added: TradeRound["items"];
  removed: TradeRound["items"];
}) {
  const proposedByLabel = round.proposedBy === currentUserId ? "You" : "them";
  const heading = round.roundNumber === 1 ? "Original offer" : `Counter offer #${round.roundNumber - 1}`;
  const time = new Date(round.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <View className="mb-2 rounded-lg border border-border bg-card p-3 opacity-70">
      <Text className="mb-1 text-xs font-medium text-muted">
        {heading} &middot; {proposedByLabel} &middot; {time}
      </Text>
      {round.message ? <Text className="mb-1.5 text-xs italic text-muted">"{round.message}"</Text> : null}
      {added.length > 0 || removed.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {added.map((item) => (
            <View key={`add-${item.id}`} className="rounded-full bg-success/15 px-2 py-0.5">
              <Text className="text-[11px] text-success">Added: {item.listingTitle}</Text>
            </View>
          ))}
          {removed.map((item) => (
            <View key={`rem-${item.id}`} className="rounded-full bg-danger/15 px-2 py-0.5">
              <Text className="text-[11px] text-danger">Removed: {item.listingTitle}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-xs text-muted">No items changed in this offer.</Text>
      )}
    </View>
  );
}