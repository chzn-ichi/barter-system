import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  MessageCircle,
  type LucideIcon,
} from "lucide-react-native";
import {
  fetchTradeTimeline,
  acceptRound,
  rejectTrade,
  cancelTrade,
  diffRounds,
  type TradeTimeline,
  type TradeRound,
} from "@/lib/tradesApi";
import { confirmExchange, fetchMeetupState, type MeetupProposal } from "@/lib/meetupApi";
import { formatDate, formatTime } from "@/lib/meetupUtils";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { TradeDetailSkeleton } from "@/components/ui/Skeletons";

const MAX_ROUNDS = 5;
const NEGOTIATING_STATUSES = ["pending", "countered"];

const finalStatusLabel: Record<string, string> = {
  completed: "Completed",
  rejected: "Declined",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

type ConfirmConfig = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

type MeetupState = { confirmed: MeetupProposal | null; pending: MeetupProposal | null };

export default function TradeTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [trade, setTrade] = useState<TradeTimeline | null>(null);
  const [meetup, setMeetup] = useState<MeetupState>({ confirmed: null, pending: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetchTradeTimeline(id),
      fetchMeetupState(id).catch(() => ({ confirmed: null, pending: null }) as MeetupState),
    ])
      .then(([t, m]) => {
        setTrade(t);
        setMeetup(m);
      })
      .catch(() => setTrade(null))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(load);

  if (loading) return <TradeDetailSkeleton />;

  if (!trade || !user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-base text-muted">This trade could not be found.</Text>
      </SafeAreaView>
    );
  }

  const currentTrade = trade;
  const myId = user.id;
  const endedByMe = currentTrade.endedBy === myId;
  const endedByOther = !!currentTrade.endedBy && currentTrade.endedBy !== myId;

  const isProposer = myId === currentTrade.proposerId;
  const otherPersonName = isProposer ? currentTrade.recipientName : currentTrade.proposerName;
  const latestRound = currentTrade.rounds[currentTrade.rounds.length - 1];
  const previousRounds = currentTrade.rounds.slice(0, -1);

  const myAccepted = isProposer ? latestRound?.proposerAccepted : latestRound?.recipientAccepted;
  const otherAccepted = isProposer ? latestRound?.recipientAccepted : latestRound?.proposerAccepted;

  const myConfirmedExchange = isProposer
    ? currentTrade.proposerConfirmedExchange
    : currentTrade.recipientConfirmedExchange;
  const otherConfirmedExchange = isProposer
    ? currentTrade.recipientConfirmedExchange
    : currentTrade.proposerConfirmedExchange;

  const unavailableItem = latestRound?.items.find((i) => i.listingStatus === "traded");
  const isNegotiating = NEGOTIATING_STATUSES.includes(currentTrade.status);
  const isAccepted = currentTrade.status === "accepted";
  const isCompleted = currentTrade.status === "completed";
  const roundLimitReached = currentTrade.roundCount >= MAX_ROUNDS;

  const theyGiveYou = latestRound?.items.filter((i) => i.offeredBy !== myId) ?? [];
  const youGiveThem = latestRound?.items.filter((i) => i.offeredBy === myId) ?? [];

  let headerBadge = finalStatusLabel[currentTrade.status] ?? "";
  if (isAccepted) headerBadge = "Confirmed";
  if (isNegotiating) headerBadge = myAccepted ? "Waiting" : "Action needed";

  let bannerTone: "accent" | "secondary" | "success" | "danger" = "accent";
  let bannerText = "";
  if (unavailableItem && isNegotiating) {
    bannerTone = "danger";
    bannerText = `${unavailableItem.listingTitle} was traded away elsewhere. Counter with something else, or cancel.`;
  } else if (isAccepted) {
    if (myConfirmedExchange && !otherConfirmedExchange) {
      bannerTone = "secondary";
      bannerText = `You confirmed the exchange. Waiting for ${otherPersonName} to confirm.`;
    } else if (otherConfirmedExchange && !myConfirmedExchange) {
      bannerTone = "accent";
      bannerText = `${otherPersonName} confirmed the exchange. Confirm once you've received and checked your items.`;
    } else if (meetup.confirmed) {
      bannerTone = "success";
      bannerText = "Meetup set. Meet up, check the items, then confirm the exchange.";
    } else {
      bannerTone = "success";
      bannerText = "Both of you agreed to this offer. Arrange your meetup in chat.";
    }
  } else if (isCompleted) {
    bannerTone = "success";
    bannerText = "This trade is complete.";
  } else if (currentTrade.status === "rejected") {
    bannerTone = "danger";
    bannerText = endedByMe
      ? "You declined this trade."
      : endedByOther
      ? `${otherPersonName} declined this trade.`
      : "This trade was declined.";
  } else if (currentTrade.status === "cancelled") {
    bannerTone = "danger";
    bannerText = endedByMe
      ? "You cancelled this trade."
      : endedByOther
      ? `${otherPersonName} cancelled this trade.`
      : "This trade was cancelled.";
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

  function openChat() {
    router.push(`/trade/${currentTrade.id}/chat`);
  }

  async function runAction(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  }

  async function handleAccept() {
    if (!latestRound) return;
    setActionLoading(true);
    await runAction(() => acceptRound({ tradeId: currentTrade.id, roundId: latestRound.id, isProposer }));
    setActionLoading(false);
  }

  function askDecline() {
    setConfirm({
      title: "Decline this trade?",
      message: "This ends the trade and can't be undone.",
      confirmLabel: "Decline",
      destructive: true,
      onConfirm: () => runAction(() => rejectTrade(currentTrade.id, myId)),
    });
  }

  function askWithdraw() {
    setConfirm({
      title: "Withdraw your offer?",
      message: `${otherPersonName} will see that you ended this trade.`,
      confirmLabel: "Withdraw",
      destructive: true,
      onConfirm: () => runAction(() => cancelTrade(currentTrade.id, myId)),
    });
  }

  function askCancel() {
    setConfirm({
      title: "Cancel this trade?",
      message: isAccepted
        ? "Both of you already agreed to this deal. Cancelling will end it and notify the other person."
        : `${otherPersonName} will see that you cancelled it.`,
      confirmLabel: "Cancel Trade",
      cancelLabel: "Keep Trade",
      destructive: true,
      onConfirm: () => runAction(() => cancelTrade(currentTrade.id, myId)),
    });
  }

  function askConfirmExchange() {
    setConfirm({
      title: "Complete this trade?",
      message: "Confirm only after you have physically received the items and checked them.",
      confirmLabel: "Confirm Exchange",
      onConfirm: () =>
        runAction(async () => {
          const result = await confirmExchange(currentTrade.id);
          if (result === "completed") await useAuthStore.getState().refreshUser();
        }),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        <Text numberOfLines={1} className="ml-2 flex-1 text-lg font-semibold text-ink">
          Trade with {otherPersonName}
        </Text>
        {headerBadge ? (
          <View className="mr-2 rounded-full border border-border bg-card px-2.5 py-1">
            <Text className="text-xs font-medium text-ink">{headerBadge}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={openChat}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card"
        >
          <MessageCircle size={18} color="#0F2A4A" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-4">
        {error ? <ErrorBanner message={error} /> : null}

        {bannerText ? (
          <View className={`mb-4 rounded-lg px-4 py-3 ${bannerStyles}`}>
            {unavailableItem && isNegotiating ? (
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
              {isNegotiating ? (currentTrade.roundCount > 1 ? "Current offer" : "Offer") : "Agreed trade"}
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

              {isNegotiating ? (
                <View className="mt-3 flex-row gap-4 border-t border-border pt-2">
                  <Text className="text-xs text-muted">
                    {myAccepted ? "✓ You accepted" : "○ You haven't accepted yet"}
                  </Text>
                  <Text className="text-xs text-muted">
                    {otherAccepted ? `✓ ${otherPersonName} accepted` : `○ ${otherPersonName} hasn't accepted yet`}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {isAccepted || (isCompleted && meetup.confirmed) ? (
          <MeetupCard meetup={meetup} myId={myId} otherName={otherPersonName} onOpenChat={openChat} />
        ) : null}

        {isAccepted ? (
          <View className="mb-4 rounded-xl border border-border bg-card p-4">
            <Text className="mb-1 text-sm font-semibold text-ink">Exchange</Text>
            <Text className="mb-3 text-xs leading-5 text-muted">
              After you've met and checked the items, each of you confirms. The trade completes once both have.
            </Text>
            <Text className="mb-1 text-xs text-muted">
              {myConfirmedExchange ? "✓ You confirmed the exchange" : "○ You haven't confirmed yet"}
            </Text>
            <Text className="text-xs text-muted">
              {otherConfirmedExchange
                ? `✓ ${otherPersonName} confirmed the exchange`
                : `○ ${otherPersonName} hasn't confirmed yet`}
            </Text>
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
                <ChevronUp size={16} color="#64748B" />
              ) : (
                <ChevronDown size={16} color="#64748B" />
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
                      currentUserId={myId}
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
          <>
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
            <Button label="Decline" variant="ghost" onPress={askDecline} disabled={actionLoading} />
          </>
        ) : null}

        {isNegotiating && !unavailableItem && myAccepted ? (
          <>
            {!roundLimitReached ? (
              <Button
                label="Counter Offer"
                variant="outline"
                onPress={() => router.push(`/trade/${currentTrade.id}/counter`)}
                disabled={actionLoading}
              />
            ) : null}
            <Button label="Withdraw Offer" variant="ghost" onPress={askWithdraw} disabled={actionLoading} />
          </>
        ) : null}

        {isNegotiating && unavailableItem ? (
          <>
            {!roundLimitReached ? (
              <Button
                label="Counter Offer"
                variant="outline"
                onPress={() => router.push(`/trade/${currentTrade.id}/counter`)}
                disabled={actionLoading}
              />
            ) : null}
            <Button label="Cancel Trade" variant="ghost" onPress={askCancel} disabled={actionLoading} />
          </>
        ) : null}

        {isAccepted ? (
          <>
            <Button label="Open Chat" variant={myConfirmedExchange ? "outline" : "primary"} onPress={openChat} />
            {!myConfirmedExchange ? (
              <>
                <Button
                  label="Confirm Exchange"
                  variant="outline"
                  onPress={askConfirmExchange}
                  disabled={actionLoading}
                />
                <Text className="text-center text-xs text-muted">
                  Tap this after you've met and checked the items.
                </Text>
                <Button label="Cancel Trade" variant="ghost" onPress={askCancel} disabled={actionLoading} />
              </>
            ) : null}
          </>
        ) : null}

        {isCompleted ? (
          <Button label="Open Chat" variant="outline" onPress={openChat} />
        ) : null}
      </View>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        destructive={confirm?.destructive}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </SafeAreaView>
  );
}

function MeetupRow({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View className="mb-1.5 flex-row items-center last:mb-0">
      <Icon size={14} color="#0F2A4A" />
      <Text className="ml-2 flex-1 text-sm text-ink">{text}</Text>
    </View>
  );
}

function MeetupCard({
  meetup,
  myId,
  otherName,
  onOpenChat,
}: {
  meetup: MeetupState;
  myId: string;
  otherName: string;
  onOpenChat: () => void;
}) {
  const shown = meetup.confirmed ?? meetup.pending;

  if (!shown) {
    return (
      <View className="mb-4 rounded-xl border-2 border-dashed border-border bg-card/50 p-4">
        <Text className="mb-1 text-sm font-semibold text-ink">Meetup</Text>
        <Text className="mb-3 text-xs leading-5 text-muted">
          Nothing arranged yet. Chat with {otherName} to agree on a time and place, then tap "Propose meetup" in the
          chat to save it here.
        </Text>
        <Pressable onPress={onOpenChat} className="self-start">
          <Text className="text-sm font-medium text-accent">Open chat</Text>
        </Pressable>
      </View>
    );
  }

  const confirmed = !!meetup.confirmed;
  const pending = meetup.pending;
  const pendingMine = pending?.proposedBy === myId;

  let note = "";
  if (!confirmed && pending) {
    note = pendingMine ? `Waiting for ${otherName} to respond.` : `${otherName} proposed this. Respond in chat.`;
  } else if (confirmed && pending) {
    note = pendingMine
      ? `Your change request is waiting for ${otherName}.`
      : `${otherName} requested a change. Respond in chat.`;
  }

  return (
    <View className="mb-4 rounded-xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink">Meetup</Text>
        <View className={`rounded-full px-2.5 py-0.5 ${confirmed ? "bg-success/15" : "bg-accent/15"}`}>
          <Text className={`text-xs font-medium ${confirmed ? "text-success" : "text-accent"}`}>
            {confirmed ? "Confirmed" : "Proposed"}
          </Text>
        </View>
      </View>

      <MeetupRow icon={CalendarDays} text={formatDate(shown.date)} />
      <MeetupRow icon={Clock} text={formatTime(shown.time)} />
      <MeetupRow icon={MapPin} text={shown.location} />

      {note ? (
        <View className="mt-3 border-t border-border pt-3">
          <Text className="mb-1 text-xs text-muted">{note}</Text>
          {!pendingMine ? (
            <Pressable onPress={onOpenChat} className="self-start">
              <Text className="text-sm font-medium text-accent">Open chat</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
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