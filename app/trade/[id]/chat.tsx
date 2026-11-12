import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarDays, Send, X } from "lucide-react-native";
import {
  fetchMessages,
  fetchProposals,
  sendMessage,
  subscribeToChat,
  type Message,
} from "@/lib/chatApi";
import { fetchTradeTimeline, type TradeTimeline } from "@/lib/tradesApi";
import { proposeMeetup, respondToMeetup, type MeetupProposal } from "@/lib/meetupApi";
import { formatDate, formatTime } from "@/lib/meetupUtils";
import { useAuthStore } from "@/store/authStore";
import { MeetupForm } from "@/components/trade/MeetupForm";
import { MeetupProposalCard } from "@/components/trade/MeetupProposalCard";
import { markTradeRead } from "@/lib/notificationsApi";
import { useNotificationStore } from "@/store/notificationStore";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const refreshNotifications = useNotificationStore((s) => s.refresh);

  const insets = useSafeAreaInsets();

  const [trade, setTrade] = useState<TradeTimeline | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposals, setProposals] = useState<Record<string, MeetupProposal>>({});
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);

  const reload = useCallback(async () => {
    try {
      const [msgs, props] = await Promise.all([fetchMessages(id), fetchProposals(id)]);
      setMessages(msgs);
      setProposals(Object.fromEntries(props.map((p) => [p.id, p])));
      if (user?.id) {
        markTradeRead(user.id, id, "messages").then(() => refreshNotifications(user.id));
      }
    } catch {
      // keep what's on screen if a refresh fails
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, refreshNotifications]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchTradeTimeline(id)
        .then((t) => {
          if (active) setTrade(t);
        })
        .catch(() => {});
      reload();
      const unsubscribe = subscribeToChat(id, () => {
        reload();
      });
      return () => {
        active = false;
        unsubscribe();
      };
    }, [id, reload])
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const otherName =
    trade && user ? (user.id === trade.proposerId ? trade.recipientName : trade.proposerName) : "";

  const proposalList = Object.values(proposals);
  const confirmedMeetup = proposalList.find((p) => p.status === "accepted") ?? null;
  const tradeOpenForMeetups = trade?.status === "accepted";

  async function handleSend() {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        tradeId: id,
        senderId: user.id,
        senderName: "You",
        content,
        createdAt: new Date().toISOString(),
        kind: "text",
        proposalId: null,
      },
    ]);

    try {
      await sendMessage(id, user.id, content);
      await reload();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Your message wasn't sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handlePropose(date: string, time: string, location: string) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      await proposeMeetup({ tradeId: id, date, time, location });
      setFormOpen(false);
      await reload();
    } catch (e: any) {
      setFormError(e.message ?? "Could not send the proposal.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleRespond(proposal: MeetupProposal, accept: boolean) {
    setRespondingId(proposal.id);
    setError(null);
    try {
      await respondToMeetup(proposal.id, accept);
      await reload();
    } catch (e: any) {
      setError(e.message ?? "Could not respond to the proposal.");
    } finally {
      setRespondingId(null);
    }
  }

  function openForm() {
    setFormError(null);
    setFormOpen(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-border px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-semibold text-ink">{otherName || "Chat"}</Text>
      </View>

      {confirmedMeetup ? (
        <View className="flex-row items-center border-b border-border bg-success/10 px-5 py-2.5">
          <CalendarDays size={14} color="#2E7D32" />
          <Text numberOfLines={1} className="ml-2 flex-1 text-xs font-medium text-success">
            Meetup: {formatDate(confirmedMeetup.date)} · {formatTime(confirmedMeetup.time)} · {confirmedMeetup.location}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0F2A4A" />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={listRef}
            data={messages}
            extraData={proposals}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-5 py-4"
            renderItem={({ item }) => {
              if (item.kind === "system") {
                return (
                  <View className="my-2 items-center">
                    <View className="rounded-full border border-border bg-card px-3 py-1">
                      <Text className="text-xs text-muted">{item.content}</Text>
                    </View>
                  </View>
                );
              }

              if (item.kind === "meetup_proposal") {
                const proposal = item.proposalId ? proposals[item.proposalId] : undefined;
                if (!proposal) return null;
                const mine = proposal.proposedBy === user?.id;
                return (
                  <View className={`mb-3 ${mine ? "items-end" : "items-start"}`}>
                    <MeetupProposalCard
                      proposal={proposal}
                      mine={mine}
                      otherName={otherName}
                      canRespond={!!tradeOpenForMeetups}
                      responding={respondingId === proposal.id}
                      onRespond={(accept) => handleRespond(proposal, accept)}
                    />
                  </View>
                );
              }

              const isMine = item.senderId === user?.id;
              return (
                <View
                  className={`mb-3 max-w-[75%] rounded-xl px-4 py-2.5 ${
                    isMine ? "self-end bg-primary" : "self-start border border-border bg-card"
                  }`}
                >
                  <Text className={`text-sm ${isMine ? "text-card" : "text-ink"}`}>{item.content}</Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Text className="text-sm text-muted">No messages yet. Say hello!</Text>
              </View>
            }
          />

          {error ? <Text className="px-5 pb-1 text-xs text-danger">{error}</Text> : null}

          {tradeOpenForMeetups ? (
            <View className="px-4 pb-2">
              <Pressable
                onPress={openForm}
                className="flex-row items-center self-start rounded-full border border-border bg-card px-3.5 py-2"
              >
                <CalendarDays size={14} color="#0F2A4A" />
                <Text className="ml-2 text-xs font-medium text-primary">
                  {confirmedMeetup ? "Request meetup change" : "Propose meetup"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View className="flex-row items-center gap-2 border-t border-border px-4 py-3">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#64748B"
              className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-base text-ink"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || sending}
              className={`h-11 w-11 items-center justify-center rounded-full ${
                input.trim() ? "bg-primary" : "bg-border"
              }`}
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setFormOpen(false)}>
            <Pressable
              className="max-h-[90%] rounded-t-2xl bg-background px-5 pt-5"
              style={{ paddingBottom: insets.bottom + 20 }}
              onPress={(e) => e.stopPropagation()}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink">
                  {confirmedMeetup ? "Request a meetup change" : "Propose a meetup"}
                </Text>
                <Pressable onPress={() => setFormOpen(false)}>
                  <X size={20} color="#0F172A" />
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <MeetupForm
                  initial={
                    confirmedMeetup
                      ? {
                          date: confirmedMeetup.date,
                          time: confirmedMeetup.time,
                          location: confirmedMeetup.location,
                        }
                      : null
                  }
                  submitting={formSubmitting}
                  error={formError}
                  submitLabel={confirmedMeetup ? "Send change request" : "Send proposal"}
                  onSubmit={handlePropose}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}