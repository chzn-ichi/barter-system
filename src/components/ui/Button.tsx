import { ActivityIndicator, Pressable, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = "primary", loading, disabled }: Props) {
  const isDisabled = disabled || loading;

  const base = "h-12 rounded-xl items-center justify-center px-5";
  const styles = {
    primary: isDisabled ? "bg-primary/40" : "bg-primary",
    outline: `border ${isDisabled ? "border-border" : "border-primary"} bg-transparent`,
    ghost: "bg-transparent",
  }[variant];

  const textStyles = {
    primary: "text-card font-semibold text-base",
    outline: `font-semibold text-base ${isDisabled ? "text-muted" : "text-primary"}`,
    ghost: "font-medium text-base text-primary",
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${base} ${styles}`}
      style={({ pressed }) => ({ opacity: pressed && !isDisabled ? 0.85 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#FFFFF8" : "#243B53"} />
      ) : (
        <Text className={textStyles}>{label}</Text>
      )}
    </Pressable>
  );
}