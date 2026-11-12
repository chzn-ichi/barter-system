import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { useNotificationStore } from "@/store/notificationStore";

export function NotificationBell() {
  const unread = useNotificationStore((s) => s.unread);

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
    >
      <Bell size={20} color="#0F2A4A" />
      {unread > 0 ? (
        <View className="absolute -right-1 -top-1 min-w-[18px] items-center rounded-full bg-danger px-1 py-0.5">
          <Text className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}