import { Text, View } from "react-native";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
      <Text className="text-sm text-danger">{message}</Text>
    </View>
  );
}