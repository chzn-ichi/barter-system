import { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/(auth)/login");
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 py-6">
      <Text className="mb-3 text-sm font-semibold uppercase text-muted">Notifications</Text>
      <SettingRow label="Push notifications" value={pushEnabled} onChange={setPushEnabled} />
      <SettingRow label="Trade update emails" value={tradeEmails} onChange={setTradeEmails} />

      <Text className="mb-3 mt-8 text-sm font-semibold uppercase text-muted">Privacy</Text>
      <SettingRow label="Show my general location" value={showLocation} onChange={setShowLocation} />

      <View className="mt-10">
        <Button label="Log Out" variant="outline" onPress={() => setConfirmLogout(true)} />
      </View>

      <ConfirmModal
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to log in again to access your account."
        confirmLabel="Log Out"
        destructive
        loading={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </ScrollView>
  );
}