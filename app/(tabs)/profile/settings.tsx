import { useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

function SettingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-border py-4">
      <Text className="text-base text-ink">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#DDD6C8", true: "#243B53" }}
        thumbColor="#FFFFF8"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [tradeEmails, setTradeEmails] = useState(true);
  const [showLocation, setShowLocation] = useState(false);

  function handleLogout() {
    Alert.alert("Log out?", "You'll need to log in again to access your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 py-6">
      <Text className="mb-3 text-sm font-semibold uppercase text-muted">Notifications</Text>
      <SettingRow label="Push notifications" value={pushEnabled} onChange={setPushEnabled} />
      <SettingRow label="Trade update emails" value={tradeEmails} onChange={setTradeEmails} />

      <Text className="mb-3 mt-8 text-sm font-semibold uppercase text-muted">Privacy</Text>
      <SettingRow label="Show my general location" value={showLocation} onChange={setShowLocation} />

      <View className="mt-10">
        <Button label="Log Out" variant="outline" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}