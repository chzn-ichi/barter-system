import { Stack } from "expo-router";

export default function MatchLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="setup" />
    </Stack>
  );
}