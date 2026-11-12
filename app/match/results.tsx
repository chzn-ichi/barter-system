import { useRef } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, RefreshCw, SearchX } from "lucide-react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MatchCard } from "@/components/match/MatchCard";
import { MatchSkeleton } from "@/components/match/MatchSkeleton";
import { useMatchSessionStore } from "@/store/matchSessionStore";
import { summarizeOffers, useRefreshMatches } from "@/lib/useRefreshMatches";

export default function AllMatchesScreen() {
  const insets = useSafeAreaInsets();
  const results = useMatchSessionStore((s) => s.results);
  const offers = useMatchSessionStore((s) => s.offers);
  const { refreshing, refresh, justUpdated, error } = useRefreshMatches();
  const listRef = useRef<FlatList>(null);

  const weak = results.length > 0 && results[0].percent < 50;
  const offerSummary = summarizeOffers(offers);

  async function handleRefresh() {
    await refresh();
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }

  const header = (
    <View>
      {error ? <ErrorBanner message={error} /> : null}
      {justUpdated ? (
        <View className="mb-3 self-start rounded-full bg-success/15 px-3 py-1">
          <Text className="text-xs text-success">Matches updated</Text>
        </View>
      ) : null}
      {weak && !refreshing ? (
        <Text className="mb-3 text-sm text-muted">No strong matches yet. These are the closest ones.</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 py-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        <Text className="ml-2 flex-1 text-lg font-semibold text-ink">All matches</Text>
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          hitSlop={8}
          className={`h-10 w-10 items-center justify-center rounded-full border border-border bg-card ${
            refreshing ? "opacity-40" : ""
          }`}
        >
          <RefreshCw size={18} color="#0F2A4A" />
        </Pressable>
      </View>

      {refreshing ? (
        <View className="px-5">
          {header}
          <MatchSkeleton />
          <MatchSkeleton />
          <MatchSkeleton />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={results}
          keyExtractor={(item) => item.listing.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <MatchCard
              result={item}
              offerSummary={offerSummary}
              onPress={() => router.push(`/listing/${item.listing.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={SearchX}
              title="No matches yet"
              subtitle="Nothing close enough right now. Try different items."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}