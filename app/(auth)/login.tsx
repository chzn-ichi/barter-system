import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-3xl font-bold text-primary">SwapQuest</Text>
        <Text className="mb-8 font-hand text-lg text-muted">Your stuff has another story.</Text>

        {error ? <ErrorBanner message={error} /> : null}

        <Input
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View className="mb-6 items-end">
          <Link href="/(auth)/forgot-password" className="text-sm font-medium text-secondary">
            Forgot password?
          </Link>
        </View>

        <Button label="Log In" onPress={handleLogin} loading={loading} />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-muted">Don't have an account? </Text>
          <Link href="/(auth)/register" className="text-sm font-semibold text-primary">
            Join
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}