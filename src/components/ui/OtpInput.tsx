import { useRef } from "react";
import { TextInput, View } from "react-native";

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
};

export function OtpInput({ value, onChange, length = 6, error }: Props) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function handleChange(text: string, index: number) {
    // supports pasting the full code into any box
    if (text.length > 1) {
      onChange(text.replace(/\D/g, "").slice(0, length));
      inputs.current[length - 1]?.focus();
      return;
    }
    const next = digits.slice();
    next[index] = text.replace(/\D/g, "");
    onChange(next.join(""));
    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <View className="flex-row justify-between">
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          value={digit}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={length}
          className={`h-14 w-12 rounded-lg border bg-card text-center text-xl font-semibold text-ink ${
            error ? "border-danger" : "border-border"
          }`}
        />
      ))}
    </View>
  );
}