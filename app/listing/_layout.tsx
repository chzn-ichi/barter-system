import { Platform } from "react-native";
import { Stack } from "expo-router";

export default function ListingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: Platform.OS === "web" ? "card" : "modal",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="propose" />
    </Stack>
  );
}