import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "lucide-react-native";
import { categories } from "@/lib/mockData";
import { createOfferOnlyItem } from "@/lib/listingsApi";
import { Button } from "@/components/ui/Button";

const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"] as const;

export function AddItemModal({
  visible,
  onClose,
  ownerId,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  ownerId: string;
  onCreated: (listing: { id: string; title: string; imageUrl: string | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number] | "">("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setCategory("");
    setCondition("");
    setPhotoUri(null);
    setError(null);
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleCreate() {
    if (!title.trim() || !category || !condition) {
      setError("Fill in the name, category, and condition.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const listing = await createOfferOnlyItem({
        ownerId,
        title: title.trim(),
        category,
        condition,
        photoUri,
      });
      onCreated({ id: listing.id, title: listing.title, imageUrl: listing.imageUrl });
      reset();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Could not add this item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-ink/40" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-background p-5" onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-ink">Add something else</Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#263238" />
            </Pressable>
          </View>

          {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}

          <Pressable
            onPress={pickPhoto}
            className="mb-3 h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-card"
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} className="h-20 w-20 rounded-lg" />
            ) : (
              <>
                <Camera size={18} color="#6B7280" />
                <Text className="mt-1 text-[10px] text-muted">Optional photo</Text>
              </>
            )}
          </Pressable>

          <TextInput
            placeholder="Item name"
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={setTitle}
            className="mb-3 h-11 rounded-lg border border-border bg-card px-3 text-base text-ink"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerClassName="gap-2"
          >
            {categories
              .filter((c) => c !== "All")
              .map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 ${
                    category === c ? "border-primary bg-primary" : "border-border bg-card"
                  }`}
                >
                  <Text className={`text-xs ${category === c ? "text-card" : "text-ink"}`}>{c}</Text>
                </Pressable>
              ))}
          </ScrollView>

          <View className="mb-4 flex-row flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCondition(c)}
                className={`rounded-full border px-3 py-1.5 ${
                  condition === c ? "border-primary bg-primary" : "border-border bg-card"
                }`}
              >
                <Text className={`text-xs ${condition === c ? "text-card" : "text-ink"}`}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Button label="Add to offer" onPress={handleCreate} loading={submitting} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}