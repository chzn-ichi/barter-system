import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, Minus, Package, Plus, X } from "lucide-react-native";
import { categories } from "@/lib/mockData";
import { fetchMyListings, type Listing } from "@/lib/listingsApi";
import { findMatches } from "@/lib/matchApi";
import { useAuthStore } from "@/store/authStore";
import { useMatchSessionStore } from "@/store/matchSessionStore";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

const CATEGORY_OPTIONS = categories.filter((c) => c !== "All");

function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className={`h-7 w-7 items-center justify-center rounded-full border border-border ${
          value <= 1 ? "opacity-40" : ""
        }`}
      >
        <Minus size={14} color="#0F172A" />
      </Pressable>
      {value > 1 ? <Text className="min-w-[16px] text-center text-sm font-medium text-ink">{value}</Text> : null}
      <Pressable
        onPress={() => onChange(Math.min(99, value + 1))}
        className="h-7 w-7 items-center justify-center rounded-full border border-border"
      >
        <Plus size={14} color="#0F172A" />
      </Pressable>
    </View>
  );
}

function RowCard({
  imageUrl,
  isOffer,
  title,
  subtitle,
  quantity,
  onQuantity,
  switchLabel,
  switchValue,
  onSwitch,
  onRemove,
}: {
  imageUrl: string | null;
  isOffer: boolean;
  title: string;
  subtitle: string;
  quantity: number;
  onQuantity: (v: number) => void;
  switchLabel: string;
  switchValue: boolean;
  onSwitch: (v: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <View className="mb-2 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="h-12 w-12 rounded-md bg-border" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-md bg-border">
            {isOffer ? <Package size={18} color="#64748B" /> : <Heart size={18} color="#64748B" />}
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-ink">
            {title}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted">
            {subtitle}
          </Text>
        </View>
        <Pressable onPress={onRemove} className="h-8 w-8 items-center justify-center">
          <X size={16} color="#64748B" />
        </Pressable>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
        <QuantityStepper value={quantity} onChange={onQuantity} />
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-muted">{switchLabel}</Text>
          <Switch
            value={switchValue}
            onValueChange={onSwitch}
            trackColor={{ false: "#E2E8F0", true: "#0F2A4A" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={onClose}>
          <Pressable className="max-h-[85%] rounded-t-2xl bg-background p-5" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">{title}</Text>
              <Pressable onPress={onClose}>
                <X size={20} color="#0F172A" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategoryChips({
  value,
  onChange,
  allowNone,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
}) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {CATEGORY_OPTIONS.map((c) => {
        const active = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(active && allowNone ? null : c)}
            className={`rounded-full border px-3 py-1.5 ${
              active ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <Text className={`text-xs ${active ? "text-card" : "text-ink"}`}>{c}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AddOfferSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const offers = useMatchSessionStore((s) => s.offers);
  const addOffer = useMatchSessionStore((s) => s.addOffer);

  const [myItems, setMyItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    fetchMyListings(user.id)
      .then(setMyItems)
      .catch(() => setMyItems([]))
      .finally(() => setLoading(false));
  }, [visible, user]);

  const addedIds = new Set(offers.map((o) => o.listingId).filter(Boolean));
  const available = myItems.filter((i) => !addedIds.has(i.id));

  function addManual() {
    if (!name.trim() || !category) return;
    addOffer({ listingId: null, title: name.trim(), category, imageUrl: null });
    setName("");
    setCategory(null);
    onClose();
  }

  return (
    <Sheet visible={visible} title="Add something I can offer" onClose={onClose}>
      <Text className="mb-2 text-sm font-semibold text-ink">From my items</Text>
      {loading ? (
        <ActivityIndicator color="#0F2A4A" />
      ) : available.length === 0 ? (
        <Text className="mb-4 text-sm text-muted">
          {myItems.length === 0 ? "You haven't posted any items yet." : "All your items are already added."}
        </Text>
      ) : (
        <View className="mb-4">
          {available.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                addOffer({ listingId: item.id, title: item.title, category: item.category, imageUrl: item.imageUrl })
              }
              className="mb-2 flex-row items-center rounded-lg border border-border bg-card p-3"
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} className="h-10 w-10 rounded-md bg-border" />
              ) : (
                <View className="h-10 w-10 rounded-md bg-border" />
              )}
              <Text numberOfLines={1} className="ml-3 flex-1 text-sm text-ink">
                {item.title}
              </Text>
              <Plus size={16} color="#0F2A4A" />
            </Pressable>
          ))}
        </View>
      )}

      <Text className="mb-2 text-sm font-semibold text-ink">Or add something new</Text>
      <TextInput
        placeholder="Item name"
        placeholderTextColor="#64748B"
        value={name}
        onChangeText={setName}
        className="mb-3 h-11 rounded-lg border border-border bg-card px-3 text-base text-ink"
      />
      <CategoryChips value={category} onChange={setCategory} />
      <Button label="Add" onPress={addManual} disabled={!name.trim() || !category} />
    </Sheet>
  );
}

function AddWantSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addWant = useMatchSessionStore((s) => s.addWant);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    addWant({ name: name.trim(), category });
    setName("");
    setCategory(null);
    onClose();
  }

  return (
    <Sheet visible={visible} title="Add something I want" onClose={onClose}>
      <TextInput
        placeholder="e.g. Film camera"
        placeholderTextColor="#64748B"
        value={name}
        onChangeText={setName}
        autoFocus
        className="mb-3 h-11 rounded-lg border border-border bg-card px-3 text-base text-ink"
      />
      <Text className="mb-2 text-sm font-semibold text-ink">Category (optional)</Text>
      <CategoryChips value={category} onChange={setCategory} allowNone />
      <Button label="Add" onPress={add} disabled={!name.trim()} />
    </Sheet>
  );
}

export default function MatchSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const offers = useMatchSessionStore((s) => s.offers);
  const wants = useMatchSessionStore((s) => s.wants);
  const updateOffer = useMatchSessionStore((s) => s.updateOffer);
  const removeOffer = useMatchSessionStore((s) => s.removeOffer);
  const updateWant = useMatchSessionStore((s) => s.updateWant);
  const removeWant = useMatchSessionStore((s) => s.removeWant);
  const setResults = useMatchSessionStore((s) => s.setResults);

  const [offerSheetOpen, setOfferSheetOpen] = useState(false);
  const [wantSheetOpen, setWantSheetOpen] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = offers.length > 0 && wants.length > 0;

  async function handleFind() {
    if (!user || !ready) return;
    setError(null);
    setFinding(true);
    try {
      const results = await findMatches({
        userId: user.id,
        myBarangay: user.barangay,
        offers,
        wants,
      });
      setResults(results);
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Could not find matches. Please try again.");
    } finally {
      setFinding(false);
    }
  }

  if (finding) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0F2A4A" />
        <Text className="mt-4 text-base font-medium text-ink">Finding trades...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-2xl font-bold text-primary">Auto Match</Text>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center">
          <X size={22} color="#0F172A" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-6" keyboardShouldPersistTaps="handled">
        {error ? <ErrorBanner message={error} /> : null}

        <Text className="mb-1 text-base font-semibold text-ink">What I can offer</Text>
        <Text className="mb-3 text-xs text-muted">
          "Include in bundle" means this item can be offered together with others in one trade.
        </Text>
        {offers.length === 0 ? (
          <Text className="mb-3 text-sm text-muted">Nothing added yet.</Text>
        ) : (
          offers.map((o) => (
            <RowCard
              key={o.id}
              isOffer
              imageUrl={o.imageUrl}
              title={o.title}
              subtitle={o.category}
              quantity={o.quantity}
              onQuantity={(v) => updateOffer(o.id, { quantity: v })}
              switchLabel="Include in bundle"
              switchValue={o.bundle}
              onSwitch={(v) => updateOffer(o.id, { bundle: v })}
              onRemove={() => removeOffer(o.id)}
            />
          ))
        )}
        <Pressable onPress={() => setOfferSheetOpen(true)} className="mb-8 mt-1 flex-row items-center gap-1.5">
          <Plus size={14} color="#0F2A4A" />
          <Text className="text-sm text-primary">Add an item</Text>
        </Pressable>

        <Text className="mb-1 text-base font-semibold text-ink">What I want</Text>
        <Text className="mb-3 text-xs text-muted">
          "Bundle allowed" means you're fine receiving this as part of a trade with several items.
        </Text>
        {wants.length === 0 ? (
          <Text className="mb-3 text-sm text-muted">Nothing added yet.</Text>
        ) : (
          wants.map((w) => (
            <RowCard
              key={w.id}
              isOffer={false}
              imageUrl={null}
              title={w.name}
              subtitle={w.category ?? "Any category"}
              quantity={w.quantity}
              onQuantity={(v) => updateWant(w.id, { quantity: v })}
              switchLabel="Bundle allowed"
              switchValue={w.bundleAllowed}
              onSwitch={(v) => updateWant(w.id, { bundleAllowed: v })}
              onRemove={() => removeWant(w.id)}
            />
          ))
        )}
        <Pressable onPress={() => setWantSheetOpen(true)} className="mt-1 flex-row items-center gap-1.5">
          <Plus size={14} color="#0F2A4A" />
          <Text className="text-sm text-primary">Add something I want</Text>
        </Pressable>
      </ScrollView>

      <View
        className="border-t border-border bg-background px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label="Find matches"
          variant={ready ? "primary" : "outline"}
          onPress={handleFind}
          disabled={!ready}
        />
        {!ready ? (
          <Text className="mt-2 text-center text-xs text-muted">Add at least one item on each side to continue.</Text>
        ) : null}
      </View>

      <AddOfferSheet visible={offerSheetOpen} onClose={() => setOfferSheetOpen(false)} />
      <AddWantSheet visible={wantSheetOpen} onClose={() => setWantSheetOpen(false)} />
    </SafeAreaView>
  );
}