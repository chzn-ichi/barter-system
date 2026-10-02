import "../global.css";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export default function RootLayout() {
  const restore = useAuthStore((s) => s.restore);
  const isLoading = useAuthStore((s) => s.isLoading);
    const [fontsLoaded] = useFonts({ DMSans_500Medium });

  useEffect(() => {
    restore();
  }, []);

  if (isLoading || !fontsLoaded) {
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
        <Stack.Screen name="trade" />
        <Stack.Screen name="user" />
      </Stack>
    </SafeAreaProvider>
  );
}