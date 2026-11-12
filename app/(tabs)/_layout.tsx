import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Home, Plus, Repeat, Shuffle, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { subscribeToNotifications } from "@/lib/notificationsApi";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userId = useAuthStore((s) => s.user?.id);
  const refreshNotifications = useNotificationStore((s) => s.refresh);
  const tradeUnread = useNotificationStore((s) => s.tradeUnread);

  useEffect(() => {
    if (!userId) return;
    refreshNotifications(userId);
    return subscribeToNotifications(userId, () => refreshNotifications(userId));
  }, [userId, refreshNotifications]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F2A4A",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Market",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => <Shuffle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarIcon: () => (
            <View className="-mt-4 h-11 w-11 items-center justify-center rounded-full border-4 border-background bg-primary">
              <Plus color="#FFFFFF" size={22} />
            </View>
          ),
          tabBarButton: ({ children, style }) => (
            <Pressable onPress={() => router.push("/listing/create")} style={style}>
              {children}
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: "Trades",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Repeat color={color} size={size} />
              {tradeUnread > 0 ? (
                <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger" />
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Your Stall",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}