import { Stack } from "expo-router";

export default function ListingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
        contentStyle: { backgroundColor: "#F7F3EA" },
      }}
    >
      <Stack.Screen name="create" />
    </Stack>
  );
}