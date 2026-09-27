import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/authStore";

export default function RootLayout() {
  const restore = useAuthStore((s) => s.restore);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [fontsReady] = useState(true); // placeholder if custom fonts are added later

  useEffect(() => {
    restore();
  }, []);

  if (isLoading || !fontsReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#243B53" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listing" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}