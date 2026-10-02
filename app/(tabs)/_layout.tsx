import { Tabs, useRouter } from "expo-router";
import { Home, Plus, Repeat, Shuffle, User } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { hasActionableTrades } from "@/lib/tradesApi";
import { useAuthStore } from "@/store/authStore";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [hasAction, setHasAction] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    hasActionableTrades(user.id).then((result) => {
      if (active) setHasAction(result);
    });
    const interval = setInterval(() => {
      hasActionableTrades(user.id).then((result) => {
        if (active) setHasAction(result);
      });
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#243B53",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#FFFFF8",
          borderTopColor: "#DDD6C8",
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
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary -mt-4 border-4 border-background">
              <Plus color="#FFFFF8" size={22} />
            </View>
          ),
          tabBarButton: ({ children, style }) => (
            <Pressable
              onPress={() => router.push("/listing/create")}
              style={style}
            >
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
              {hasAction ? (
                <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-danger" />
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}