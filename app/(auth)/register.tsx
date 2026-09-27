import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { barangays } from "@/lib/mockData";

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [barangay, setBarangay] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!name.trim()) return "Please enter your name.";
    if (!identifier.trim()) return "Please enter your email or phone number.";
    if (!barangay) return "Please select your barangay.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleRegister() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register({ name, identifier: identifier.trim(), password, barangay });
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { identifier: identifier.trim(), purpose: "register" },
      });
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="px-6 py-10" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-primary">Create your account</Text>
        <Text className="mb-6 text-base text-muted">Join SwapQuest and start trading in CDO.</Text>

        {error ? <ErrorBanner message={error} /> : null}

        <Input label="Full Name" placeholder="Juan Dela Cruz" value={name} onChangeText={setName} />
        <Input
          label="Email or Phone"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
        />

        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-ink">Barangay</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            className="h-12 flex-row items-center justify-between rounded-lg border border-border bg-card px-4"
          >
            <Text className={barangay ? "text-base text-ink" : "text-base text-muted"}>
              {barangay || "Select your barangay"}
            </Text>
            <ChevronDown size={18} color="#6B7280" />
          </Pressable>
        </View>

        <Input label="Password" placeholder="At least 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="Confirm Password" placeholder="Re-enter password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        <Button label="Sign Up" onPress={handleRegister} loading={loading} />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">Already have an account? </Text>
          <Link href="/(auth)/login" className="text-sm font-semibold text-primary">
            Log in
          </Link>
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setPickerOpen(false)}>
          <Pressable className="max-h-[70%] rounded-t-2xl bg-background p-5" onPress={(e) => e.stopPropagation()}>
            <Text className="mb-4 text-lg font-semibold text-ink">Select Barangay</Text>
            <ScrollView>
              {barangays.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => {
                    setBarangay(b);
                    setPickerOpen(false);
                  }}
                  className="border-b border-border py-3"
                >
                  <Text className="text-base text-ink">{b}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}