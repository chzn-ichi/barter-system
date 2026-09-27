import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shuffle } from "lucide-react-native";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function MatchesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-2">
        <Text className="text-2xl font-bold text-primary">Matches</Text>
        <Text className="mb-2 text-base text-muted">Find your next trade.</Text>
      </View>

      <EmptyState
        icon={Shuffle}
        title="Auto Match is coming soon"
        subtitle="Soon you'll be able to find potential trades automatically based on what you have and what you want."
      />

      <View className="px-8 pb-10">
        <Button label="Auto Match" onPress={() => {}} disabled />
      </View>
    </SafeAreaView>
  );
}