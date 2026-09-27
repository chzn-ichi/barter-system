import { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon: Icon, title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-10">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-accent/10">
        <Icon size={28} color="#8B6F47" />
      </View>
      <Text className="mb-1 text-center text-lg font-semibold text-ink">{title}</Text>
      {subtitle ? <Text className="text-center text-sm text-muted">{subtitle}</Text> : null}
    </View>
  );
}