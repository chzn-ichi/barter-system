import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export default function ForgotPasswordScreen() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!identifier.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(identifier.trim());
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { identifier: identifier.trim(), purpose: "reset" },
      });
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-primary">Forgot password?</Text>
        <Text className="mb-8 text-base text-muted">
          Enter your account email. If it matches an existing account, we'll send you a code to reset your password.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        <Input
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
        />

        <Button label="Send Code" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}