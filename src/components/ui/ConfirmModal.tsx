import { Modal, Pressable, Text, View } from "react-native";

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-ink/50 px-8">
        <View className="w-full max-w-sm rounded-2xl bg-card px-5 pb-5 pt-6">
          <Text className="mb-2 text-center text-lg font-bold text-ink">{title}</Text>
          <Text className="mb-5 text-center text-sm leading-5 text-muted">{message}</Text>

          <View className="border-t border-border pt-4">
            <View className="flex-row gap-3">
              <Pressable
                onPress={onCancel}
                disabled={loading}
                className="flex-1 items-center rounded-xl border border-border py-3"
              >
                <Text className="text-base font-semibold text-ink">{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={loading}
                className={`flex-1 items-center rounded-xl py-3 ${destructive ? "bg-danger" : "bg-primary"}`}
              >
                <Text className="text-base font-semibold text-card">
                  {loading ? "..." : confirmLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}