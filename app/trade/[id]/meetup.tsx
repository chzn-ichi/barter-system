import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MeetupScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      <Text className="text-center text-base text-muted">Meetup scheduling — coming in the next step.</Text>
    </SafeAreaView>
  );
}