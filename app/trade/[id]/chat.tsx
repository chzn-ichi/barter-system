import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Send } from "lucide-react-native";
import { fetchMessages, sendMessage, subscribeToMessages, type Message } from "@/lib/chatApi";
import { fetchTradeTimeline } from "@/lib/tradesApi";
import { useAuthStore } from "@/store/authStore";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [otherPersonName, setOtherPersonName] = useState("");
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      fetchTradeTimeline(id).then((trade) => {
        if (!active || !user) return;
        setOtherPersonName(user.id === trade.proposerId ? trade.recipientName : trade.proposerName);
      });

      fetchMessages(id)
        .then((data) => {
          if (active) setMessages(data);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      const unsubscribe = subscribeToMessages(id, (newRow) => {
        setMessages((prev) => {
          // Avoid duplicate if this client was the sender (optimistic add already happened)
          if (prev.some((m) => m.id === newRow.id)) return prev;
          return [
            ...prev,
            {
              id: newRow.id,
              tradeId: newRow.trade_id,
              senderId: newRow.sender_id,
              senderName: newRow.sender_id === user?.id ? "You" : otherPersonName,
              content: newRow.content,
              createdAt: newRow.created_at,
            },
          ];
        });
      });

      return () => {
        active = false;
        unsubscribe();
      };
    }, [id, user])
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add so it feels instant, before the realtime echo arrives
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
      },
    ]);

    try {
        const inserted = await sendMessage(id, user.id, content);
        // Swap the temp message's fake ID for the real one, so the incoming
        // realtime echo (which arrives with the real ID) gets correctly deduped
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: inserted.id } : m)));
        } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } finally {
        setSending(false);
      }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-border px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#263238" />
        </Pressable>
        <Text className="ml-2 text-lg font-semibold text-ink">{otherPersonName || "Chat"}</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#243B53" />
        </View>
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-5 py-4"
            renderItem={({ item }) => {
              const isMine = item.senderId === user?.id;
              return (
                <View className={`mb-3 max-w-[75%] rounded-xl px-4 py-2.5 ${isMine ? "self-end bg-primary" : "self-start bg-card border border-border"}`}>
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

          <View className="flex-row items-center gap-2 border-t border-border px-4 py-3">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#6B7280"
              className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-base text-ink"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || sending}
              className={`h-11 w-11 items-center justify-center rounded-full ${input.trim() ? "bg-primary" : "bg-border"}`}
            >
              <Send size={18} color="#FFFFF8" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}