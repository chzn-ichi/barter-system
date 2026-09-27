import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { barangays } from "@/lib/mockData";

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? "");
  const [barangay, setBarangay] = useState(user?.barangay ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), barangay });
      router.back();
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="px-5 py-6">
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your name" />

        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-ink">Barangay</Text>
          <Pressable
            onPress={() => setShowPicker((v) => !v)}
            className="h-12 flex-row items-center justify-between rounded-lg border border-border bg-card px-4"
          >
            <Text className="text-base text-ink">{barangay}</Text>
            <ChevronDown size={18} color="#6B7280" />
          </Pressable>
          {showPicker ? (
            <View className="mt-2 rounded-lg border border-border bg-card">
              {barangays.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => {
                    setBarangay(b);
                    setShowPicker(false);
                  }}
                  className="border-b border-border px-4 py-3 last:border-b-0"
                >
                  <Text className="text-base text-ink">{b}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable className="mb-6">
          <Text className="text-sm font-medium text-secondary">Change Photo (coming soon)</Text>
        </Pressable>

        <Button label="Save Changes" onPress={handleSave} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}