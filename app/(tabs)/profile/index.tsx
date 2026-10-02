import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Heart, Package, Plus, Settings, Trash2, X } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { fetchMyListings, removeListing, type Listing } from "@/lib/listingsApi";
import { fetchWantedItems, addWantedItem, deleteWantedItem, type WantedItem } from "@/lib/wantedApi";
import { getFollowCounts } from "@/lib/followApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type ConfirmConfig = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
};

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newWantedName, setNewWantedName] = useState("");
  const [addingWanted, setAddingWanted] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listings, wanted, counts] = await Promise.all([
        fetchMyListings(user.id, { includeOfferOnly: false }),
        fetchWantedItems(user.id),
        getFollowCounts(user.id),
      ]);
      setMyListings(listings);
      setWantedItems(wanted);
      setFollowCounts(counts);
    } catch {
      setMyListings([]);
      setWantedItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleConfirm() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  }

  async function handleAddWanted() {
    if (!user || !newWantedName.trim()) return;
    setAddingWanted(true);
    try {
      const item = await addWantedItem(user.id, newWantedName.trim());
      setWantedItems((prev) => [item, ...prev]);
      setNewWantedName("");
      setAddModalOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not add item.");
    } finally {
      setAddingWanted(false);
    }
  }

  function handleRemoveWanted(id: string) {
    setConfirm({
      title: "Remove this item?",
      message: "This will remove it from your Wanted Board.",
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteWantedItem(id);
          setWantedItems((prev) => prev.filter((w) => w.id !== id));
        } catch (e: any) {
          Alert.alert("Error", e.message ?? "Could not remove item.");
        }
      },
    });
  }

  function handleRemoveListing(item: Listing) {
    setConfirm({
      title: "Remove this item?",
      message:
        "It will disappear from the Market and your stall. Any open deal that includes it keeps going until it ends.",
      confirmLabel: "Remove",
      destructive: true,
      onConfirm: async () => {
        try {
          await removeListing(item.id);
          setMyListings((prev) => prev.filter((l) => l.id !== item.id));
        } catch (e: any) {
          Alert.alert("Error", e.message ?? "Could not remove this item.");
        }
      },
    });
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="pb-10">
        <View
          className="bg-accent"
          style={{
            height: 150,
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            paddingHorizontal: 20,
            paddingTop: 14,
          }}
        >
          <View className="flex-row items-center justify-end">
            <Pressable
              onPress={() => router.push("/(tabs)/profile/settings")}
              className="h-9 w-9 items-center justify-center rounded-full bg-card/20"
            >
              <Settings size={18} color="#FFFFF8" />
            </Pressable>
          </View>
        </View>

        <View className="items-center px-5">
          <View className="-mt-10 h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-card">
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="h-full w-full rounded-full" />
            ) : (
              <Text className="text-2xl font-bold text-muted">{user.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>

          <Text className="mt-2 text-xl font-bold text-ink">{user.name}</Text>
          <Text className="mb-4 text-sm text-muted">
            {user.barangay ? `${user.barangay}, Cagayan de Oro` : "Cagayan de Oro"}
          </Text>

          <View className="mb-5 items-center">
            <Text className="text-sm text-muted">
              {user.completedTrades} {user.completedTrades === 1 ? "Trade" : "Trades"} &middot;{" "}
              {user.reviewsCount} {user.reviewsCount === 1 ? "Review" : "Reviews"}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {followCounts.followers} {followCounts.followers === 1 ? "Follower" : "Followers"} &middot;{" "}
              {followCounts.following} Following
            </Text>
          </View>

          <View className="mb-6 w-full">
            <Button label="Edit Profile" variant="outline" onPress={() => router.push("/(tabs)/profile/edit")} />
          </View>
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#243B53" />
          </View>
        ) : (
          <>
            <View className="mb-8 px-5">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink">On the stall</Text>
              </View>

              {myListings.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No items yet"
                  subtitle="Tap the + button in the tab bar to post your first item."
                />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
                  {myListings.map((item) => (
                    <Pressable key={item.id} onPress={() => router.push(`/listing/${item.id}`)} style={{ width: 128 }}>
                      <View className="relative overflow-hidden rounded-xl bg-border" style={{ height: 128 }}>
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="h-full w-full items-center justify-center">
                            <Package size={20} color="#6B7280" />
                          </View>
                        )}
                        <Pressable
                          onPress={() => handleRemoveListing(item)}
                          className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-ink/60"
                        >
                          <Trash2 size={14} color="#FFFFF8" />
                        </Pressable>
                      </View>
                      <Text numberOfLines={1} className="mt-1.5 text-xs text-ink">
                        {item.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View className="mb-8 px-5">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink">Wanted Board</Text>
                <Pressable
                  onPress={() => setAddModalOpen(true)}
                  className="h-8 w-8 items-center justify-center rounded-full border border-border bg-card"
                >
                  <Plus size={16} color="#243B53" />
                </Pressable>
              </View>
              {wantedItems.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title="Nothing pinned yet"
                  subtitle="Add items you're hoping to find to help others discover trades with you."
                />
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {wantedItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onLongPress={() => handleRemoveWanted(item.id)}
                      className="rounded-full border border-border bg-card px-3 py-1.5"
                    >
                      <Text className="text-sm text-ink">{item.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {wantedItems.length > 0 ? (
                <Text className="mt-2 text-xs text-muted">Long-press a note to remove it.</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={addModalOpen} animationType="slide" transparent onRequestClose={() => setAddModalOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setAddModalOpen(false)}>
          <Pressable className="rounded-t-2xl bg-background p-5" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">Pin a Wanted Note</Text>
              <Pressable onPress={() => setAddModalOpen(false)}>
                <X size={20} color="#263238" />
              </Pressable>
            </View>
            <TextInput
              placeholder="e.g. Film Camera"
              placeholderTextColor="#6B7280"
              value={newWantedName}
              onChangeText={setNewWantedName}
              autoFocus
              className="mb-4 h-12 rounded-lg border border-border bg-card px-4 text-base text-ink"
            />
            <Button label="Pin It" onPress={handleAddWanted} loading={addingWanted} disabled={!newWantedName.trim()} />
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        loading={confirmLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </SafeAreaView>
  );
}