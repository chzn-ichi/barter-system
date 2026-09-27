import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, Check, ChevronLeft, X } from "lucide-react-native";
import { categories } from "@/lib/mockData";
import { createListing, uploadListingPhoto } from "@/lib/listingsApi";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const STEPS = ["Photos", "Details", "What You Want", "Review"];
const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"] as const;

type Draft = {
  photos: string[]; // local device URIs until upload
  title: string;
  category: string;
  condition: (typeof CONDITIONS)[number] | "";
  description: string;
  hasFlaw: boolean;
  flawDescription: string;
  wantsInExchange: string;
  bundleAllowed: boolean;
};

const initialDraft: Draft = {
  photos: [],
  title: "",
  category: "",
  condition: "",
  description: "",
  hasFlaw: false,
  flawDescription: "",
  wantsInExchange: "",
  bundleAllowed: false,
};

export default function CreateListingScreen() {
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [posted, setPosted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function canGoNext(): boolean {
    switch (step) {
      case 0:
        return draft.photos.length > 0;
      case 1:
        return !!draft.title.trim() && !!draft.category && !!draft.condition;
      case 2:
        return !!draft.wantsInExchange.trim();
      default:
        return true;
    }
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    await handleSubmit();
  }

  function handleBack() {
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }

  async function pickPhoto() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required to add pictures.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      update("photos", [...draft.photos, result.assets[0].uri]);
    }
  }

  function removePhoto(index: number) {
    update(
      "photos",
      draft.photos.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit() {
    if (!user) {
      setError("You must be logged in to post a listing.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < draft.photos.length; i++) {
        setUploadStatus(`Uploading photo ${i + 1} of ${draft.photos.length}...`);
        const url = await uploadListingPhoto(user.id, draft.photos[i]);
        uploadedUrls.push(url);
      }

      setUploadStatus("Saving listing...");
      await createListing({
        ownerId: user.id,
        title: draft.title.trim(),
        category: draft.category,
        condition: draft.condition as (typeof CONDITIONS)[number],
        description: draft.description.trim(),
        hasFlaw: draft.hasFlaw,
        flawDescription: draft.flawDescription.trim(),
        wantsInExchange: draft.wantsInExchange.trim(),
        bundleAllowed: draft.bundleAllowed,
        photoUrls: uploadedUrls,
      });

      setPosted(true);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong while posting your listing.");
    } finally {
      setSubmitting(false);
      setUploadStatus("");
    }
  }

  if (posted) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <Check size={30} color="#2E7D32" />
        </View>
        <Text className="mb-2 text-center text-2xl font-bold text-ink">Listing posted!</Text>
        <Text className="mb-8 text-center text-base text-muted">
          "{draft.title}" is now live on the marketplace.
        </Text>
        <View className="w-full">
          <Button label="Done" onPress={() => router.replace("/(tabs)/home")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
        <Pressable onPress={handleBack} className="h-9 w-9 items-center justify-center" disabled={submitting}>
          <ChevronLeft size={24} color="#263238" />
        </Pressable>
        <Text className="text-base font-semibold text-ink">{STEPS[step]}</Text>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center" disabled={submitting}>
          <X size={20} color="#263238" />
        </Pressable>
      </View>

      <View className="mb-4 flex-row gap-1.5 px-5">
        {STEPS.map((_, i) => (
          <View key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {error ? <ErrorBanner message={error} /> : null}

        {step === 0 ? (
          <View>
            <Text className="mb-1 text-lg font-semibold text-ink">Add photos</Text>
            <Text className="mb-4 text-sm text-muted">
              At least one photo is required. The first photo becomes the primary image.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {draft.photos.map((uri, i) => (
                <View key={uri} className="relative">
                  <Image source={{ uri }} className="h-24 w-24 rounded-lg bg-border" />
                  {i === 0 ? (
                    <View className="absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5">
                      <Text className="text-[10px] font-medium text-card">Primary</Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => removePhoto(i)}
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-ink"
                  >
                    <X size={13} color="#FFFFF8" />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={pickPhoto}
                className="h-24 w-24 items-center justify-center rounded-lg border border-dashed border-border bg-card"
              >
                <Camera size={20} color="#6B7280" />
                <Text className="mt-1 text-xs text-muted">Add photo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View>
            <Input
              label="Item Name"
              placeholder="e.g. Fujifilm Instax Mini Camera"
              value={draft.title}
              onChangeText={(v) => update("title", v)}
            />

            <Text className="mb-1.5 text-sm font-medium text-ink">Category</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {categories
                .filter((c) => c !== "All")
                .map((cat) => {
                  const active = cat === draft.category;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => update("category", cat)}
                      className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-card"}`}
                    >
                      <Text className={`text-xs font-medium ${active ? "text-card" : "text-ink"}`}>{cat}</Text>
                    </Pressable>
                  );
                })}
            </View>

            <Text className="mb-1.5 text-sm font-medium text-ink">Condition</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const active = c === draft.condition;
                return (
                  <Pressable
                    key={c}
                    onPress={() => update("condition", c)}
                    className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-card"}`}
                  >
                    <Text className={`text-xs font-medium ${active ? "text-card" : "text-ink"}`}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Description"
              placeholder="Describe the item..."
              multiline
              numberOfLines={4}
              style={{ height: 90, textAlignVertical: "top", paddingTop: 10 }}
              value={draft.description}
              onChangeText={(v) => update("description", v)}
            />

            <View className="mb-2 flex-row items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <Text className="text-sm text-ink">This item has a flaw</Text>
              <Switch
                value={draft.hasFlaw}
                onValueChange={(v) => update("hasFlaw", v)}
                trackColor={{ false: "#DDD6C8", true: "#243B53" }}
                thumbColor="#FFFFF8"
              />
            </View>
            {draft.hasFlaw ? (
              <Input
                label="Describe the flaw"
                placeholder="e.g. Small scratch on the lens"
                value={draft.flawDescription}
                onChangeText={(v) => update("flawDescription", v)}
              />
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <Text className="mb-1 text-lg font-semibold text-ink">What do you want in exchange?</Text>
            <Text className="mb-4 text-sm text-muted">
              Be specific, or general — this helps others find you when browsing.
            </Text>
            <Input
              label="Wanted in exchange"
              placeholder="e.g. Film camera or wireless headphones"
              multiline
              numberOfLines={3}
              style={{ height: 70, textAlignVertical: "top", paddingTop: 10 }}
              value={draft.wantsInExchange}
              onChangeText={(v) => update("wantsInExchange", v)}
            />
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="text-sm text-ink">Bundle allowed</Text>
                <Text className="text-xs text-muted">This item can be received as part of a multi-item trade.</Text>
              </View>
              <Switch
                value={draft.bundleAllowed}
                onValueChange={(v) => update("bundleAllowed", v)}
                trackColor={{ false: "#DDD6C8", true: "#243B53" }}
                thumbColor="#FFFFF8"
              />
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            <Text className="mb-4 text-lg font-semibold text-ink">Review your listing</Text>

            {draft.photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerClassName="gap-2">
                {draft.photos.map((uri) => (
                  <Image key={uri} source={{ uri }} className="h-20 w-20 rounded-lg bg-border" />
                ))}
              </ScrollView>
            ) : null}

            <ReviewRow label="Item Name" value={draft.title} />
            <ReviewRow label="Category" value={draft.category} />
            <ReviewRow label="Condition" value={draft.condition} />
            {draft.description ? <ReviewRow label="Description" value={draft.description} /> : null}
            {draft.hasFlaw ? <ReviewRow label="Flaw" value={draft.flawDescription || "Not described"} /> : null}
            <ReviewRow label="Wants in Exchange" value={draft.wantsInExchange} />
            <ReviewRow label="Bundle Allowed" value={draft.bundleAllowed ? "Yes" : "No"} />
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-border bg-background px-5 py-4">
        {uploadStatus ? <Text className="mb-2 text-center text-xs text-muted">{uploadStatus}</Text> : null}
        <Button
          label={step === STEPS.length - 1 ? "Post Listing" : "Next"}
          onPress={handleNext}
          disabled={!canGoNext()}
          loading={submitting}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 border-b border-border pb-3">
      <Text className="mb-0.5 text-xs font-medium uppercase text-muted">{label}</Text>
      <Text className="text-base text-ink">{value}</Text>
    </View>
  );
}