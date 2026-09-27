import { Text, TextInput, TextInputProps, View } from "react-native";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, ...rest }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-ink">{label}</Text>
      <TextInput
        placeholderTextColor="#6B7280"
        className={`h-12 rounded-lg border bg-card px-4 text-base text-ink ${
          error ? "border-danger" : "border-border"
        }`}
        {...rest}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}