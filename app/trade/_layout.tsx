import { Stack } from "expo-router";

export default function TradeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F7F3EA" },
      }}
    >
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/counter" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]/chat" />
      <Stack.Screen name="[id]/meetup" />
    </Stack>
  );
}