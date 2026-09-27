import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export default function ResetPasswordScreen() {
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(identifier, password);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="mb-2 text-2xl font-bold text-primary">Password reset!</Text>
        <Text className="mb-8 text-center text-base text-muted">
          Your password has been updated. You can now log in with your new password.
        </Text>
        <View className="w-full">
          <Button label="Back to Login" onPress={() => router.replace("/(auth)/login")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-primary">Set a new password</Text>
        <Text className="mb-8 text-base text-muted">
          Create a new password for {identifier}.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        <Input label="New Password" placeholder="At least 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="Confirm New Password" placeholder="Re-enter password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        <Button label="Reset Password" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}