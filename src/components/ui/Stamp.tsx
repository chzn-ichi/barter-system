import { Text, View } from "react-native";

export function Stamp({ label }: { label: string }) {
  return (
    <View
      className="self-center rounded-lg border-2 border-dashed border-seal px-4 py-1.5"
      style={{ transform: [{ rotate: "-6deg" }] }}
    >
      <Text className="font-hand text-2xl text-seal">{label}</Text>
    </View>
  );
}