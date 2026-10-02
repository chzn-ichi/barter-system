import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F7F3EA" },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}