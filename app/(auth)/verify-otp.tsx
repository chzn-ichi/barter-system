import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const RESEND_SECONDS = 60;

export default function VerifyOtpScreen() {
  const { identifier, purpose } = useLocalSearchParams<{
    identifier: string;
    purpose: "register" | "reset";
  }>();

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const resendOtp = useAuthStore((s) => s.resendOtp);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  function startCountdown() {
    setSecondsLeft(RESEND_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1 && timer.current) {
          clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleVerify() {
    setError(null);
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(identifier, code, purpose);
      if (purpose === "register") {
        router.replace("/(tabs)/home");
      } else {
        router.replace({ pathname: "/(auth)/reset-password", params: { identifier } });
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResending(true);
    try {
      await resendOtp(identifier, purpose);
      setCode("");
      startCountdown();
    } catch (e: any) {
      setError(e.message ?? "Could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 py-10">
      <Text className="mb-1 text-2xl font-bold text-primary">Verify your account</Text>
      <Text className="mb-8 text-base text-muted">
        We sent a 6-digit code to{"\n"}
        <Text className="font-semibold text-ink">{identifier}</Text>
      </Text>

      {error ? <ErrorBanner message={error} /> : null}

      <OtpInput value={code} onChange={setCode} error={!!error} />

      <View className="mt-10">
        <Button label="Verify" onPress={handleVerify} loading={loading} />
      </View>

      <View className="mt-6 items-center">
        {secondsLeft > 0 ? (
          <Text className="text-sm text-muted">Resend code in {secondsLeft}s</Text>
        ) : (
          <Button label="Resend Code" onPress={handleResend} variant="ghost" loading={resending} />
        )}
      </View>

      <View className="mt-auto rounded-lg border border-border bg-card p-3">
        <Text className="text-xs text-muted">Didn't get it? Check your spam folder, or tap Resend Code above.</Text>
      </View>
    </View>
  );
}