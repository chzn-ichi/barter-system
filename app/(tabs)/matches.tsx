import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { RefreshCw, SearchX, Shuffle } from "lucide-react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MatchCard } from "@/components/match/MatchCard";
import { MatchSkeleton } from "@/components/match/MatchSkeleton";
import { useMatchSessionStore } from "@/store/matchSessionStore";
import { summarizeOffers, useRefreshMatches } from "@/lib/useRefreshMatches";

export default function MatchesScreen() {
  const hasRun = useMatchSessionStore((s) => s.hasRun);
  const results = useMatchSessionStore((s) => s.results);
  const offers = useMatchSessionStore((s) => s.offers);
  const wants = useMatchSessionStore((s) => s.wants);
  const reset = useMatchSessionStore((s) => s.reset);

  const { refreshing, refresh, justUpdated, error } = useRefreshMatches();

  const [continueOpen, setContinueOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);

  const hasSetup = offers.length > 0 || wants.length > 0;
  const best = results[0];
  const weak = !!best && best.percent < 50;

  function handleStart() {
    if (hasSetup) setContinueOpen(true);
    else router.push("/match/setup");
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-start justify-between px-5 pt-2">
        <View>
          <Text className="text-2xl font-bold text-primary">Matches</Text>
          <Text className="mb-2 text-base text-muted">Find your next trade.</Text>
        </View>
        {hasRun ? (
          <Pressable
            onPress={refresh}
            disabled={refreshing}
            hitSlop={8}
            className={`mt-1 h-10 w-10 items-center justify-center rounded-full border border-border bg-card ${
              refreshing ? "opacity-40" : ""
            }`}
          >
            <RefreshCw size={18} color="#0F2A4A" />
          </Pressable>
        ) : null}
      </View>

      {!hasRun ? (
        <>
          <EmptyState
            icon={Shuffle}
            title="Auto Match"
            subtitle="Find potential trades based on what you have and what you want."
          />
          <View className="px-8 pb-10">
            <Button label="Auto Match" onPress={handleStart} />
          </View>
        </>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-10 pt-2">
          {error ? <ErrorBanner message={error} /> : null}

          {justUpdated ? (
            <View className="mb-3 self-start rounded-full bg-success/15 px-3 py-1">
              <Text className="text-xs text-success">Matches updated</Text>
            </View>
          ) : null}

          {refreshing ? (
            <MatchSkeleton />
          ) : best ? (
            <>
              {weak ? (
                <Text className="mb-2 text-sm text-muted">
                  No strong matches yet. This is the closest one.
                </Text>
              ) : (
                <Text className="mb-2 text-sm text-muted">Your best match</Text>
              )}
              <MatchCard
                result={best}
                offerSummary={summarizeOffers(offers)}
                onPress={() => router.push(`/listing/${best.listing.id}`)}
              />
              {results.length > 1 ? (
                <Pressable onPress={() => router.push("/match/results")} className="mb-4 self-start">
                  <Text className="text-sm font-medium text-accent">View all matches ({results.length})</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No matches yet"
              subtitle="Nothing close enough right now. Try different items, or check back when more people post."
            />
          )}

          <View className="mt-4 gap-2">
            <Button label="Edit setup" variant="outline" onPress={() => router.push("/match/setup")} />
            <Button label="Start new match" variant="ghost" onPress={() => setConfirmNewOpen(true)} />
          </View>
        </ScrollView>
      )}

      <ConfirmModal
        visible={continueOpen}
        title="Continue previous setup?"
        message="You already started setting up a match."
        confirmLabel="Continue"
        cancelLabel="Start New"
        onConfirm={() => {
          setContinueOpen(false);
          router.push("/match/setup");
        }}
        onCancel={() => {
          setContinueOpen(false);
          setConfirmNewOpen(true);
        }}
      />

      <ConfirmModal
        visible={confirmNewOpen}
        title="Start a new match?"
        message="Your old setup will be permanently replaced."
        confirmLabel="Start New"
        cancelLabel="Keep Old"
        destructive
        onConfirm={() => {
          setConfirmNewOpen(false);
          reset();
          router.push("/match/setup");
        }}
        onCancel={() => setConfirmNewOpen(false)}
      />
    </SafeAreaView>
  );
}