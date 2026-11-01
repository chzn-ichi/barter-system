import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Shuffle } from "lucide-react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useMatchSessionStore } from "@/store/matchSessionStore";

export default function MatchesScreen() {
  const hasRun = useMatchSessionStore((s) => s.hasRun);
  const results = useMatchSessionStore((s) => s.results);
  const reset = useMatchSessionStore((s) => s.reset);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-2">
        <Text className="text-2xl font-bold text-primary">Matches</Text>
        <Text className="mb-2 text-base text-muted">Find your next trade.</Text>
      </View>

      {!hasRun ? (
        <>
          <EmptyState
            icon={Shuffle}
            title="Auto Match"
            subtitle="Find potential trades based on what you have and what you want."
          />
          <View className="px-8 pb-10">
            <Button label="Auto Match" onPress={() => router.push("/match/setup")} />
          </View>
        </>
      ) : (
        <View className="flex-1 px-5 pt-4">
          <View className="mb-4 rounded-xl border border-border bg-card p-4">
            <Text className="mb-1 text-xs text-muted">Temporary summary (full results come next)</Text>
            <Text className="text-lg font-semibold text-ink">
              {results.length} {results.length === 1 ? "match" : "matches"} found
            </Text>
            {results[0] ? (
              <Text className="mt-1 text-sm text-ink">
                Best: {results[0].percent}% — {results[0].listing.title}
              </Text>
            ) : (
              <Text className="mt-1 text-sm text-muted">Nothing close enough yet. Try different items.</Text>
            )}
          </View>

          <View className="gap-2">
            <Button label="Edit setup" variant="outline" onPress={() => router.push("/match/setup")} />
            <Button label="Start over" variant="ghost" onPress={reset} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}