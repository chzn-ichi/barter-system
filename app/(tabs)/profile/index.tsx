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
import { Plus, Settings, X } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { fetchMyListings, type Listing } from "@/lib/listingsApi";
import { fetchWantedItems, addWantedItem, deleteWantedItem, type WantedItem } from "@/lib/wantedApi";
import { ListingCard } from "@/components/ui/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Package, Heart } from "lucide-react-native";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [wantedItems, setWantedItems] = useState<WantedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newWantedName, setNewWantedName] = useState("");
  const [addingWanted, setAddingWanted] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listings, wanted] = await Promise.all([
        fetchMyListings(user.id),
        fetchWantedItems(user.id),
      ]);
      setMyListings(listings);
      setWantedItems(wanted);
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
    Alert.alert("Remove item?", "This will remove it from your Wanted Items list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteWantedItem(id);
            setWantedItems((prev) => prev.filter((w) => w.id !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Could not remove item.");
          }
        },
      },
    ]);
  }

  function handleLogout() {
    Alert.alert("Log out?", "You'll need to log in again to access your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <View className="mb-6 flex-row items-center justify-between pt-2">
          <Text className="text-2xl font-bold text-primary">Profile</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/profile/settings")}
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          >
            <Settings size={20} color="#243B53" />
          </Pressable>
        </View>

        <View className="mb-6 items-center">
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} className="mb-3 h-24 w-24 rounded-full bg-border" />
          ) : (
            <View className="mb-3 h-24 w-24 items-center justify-center rounded-full bg-border">
              <Text className="text-2xl font-bold text-muted">{user.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text className="text-xl font-bold text-ink">{user.name}</Text>
          <Text className="mb-1 text-sm text-muted">
            📍 {user.barangay ?? "No barangay set"}, Cagayan de Oro
          </Text>
          <Text className="text-xs text-muted">Member since {user.memberSince}</Text>
        </View>

        <View className="mb-6 flex-row justify-around rounded-xl border border-border bg-card py-4">
          <View className="items-center">
            <Text className="text-lg font-bold text-ink">{user.completedTrades}</Text>
            <Text className="text-xs text-muted">Completed Trades</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-ink">{user.reviewsCount}</Text>
            <Text className="text-xs text-muted">Reviews</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-ink">{myListings.length}</Text>
            <Text className="text-xs text-muted">Active Listings</Text>
          </View>
        </View>

        <View className="mb-6">
          <Button label="Edit Profile" variant="outline" onPress={() => router.push("/(tabs)/profile/edit")} />
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#243B53" />
          </View>
        ) : (
          <>
            <View className="mb-8">
              <Text className="mb-3 text-lg font-semibold text-ink">My Listings</Text>
              {myListings.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No listings yet"
                  subtitle="Tap the + button in the tab bar to post your first item."
                />
              ) : (
                myListings.map((item) => <ListingCard key={item.id} listing={item} />)
              )}
            </View>

            <View className="mb-8">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink">Wanted Items</Text>
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
                  title="Nothing added yet"
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
                <Text className="mt-2 text-xs text-muted">Long-press an item to remove it.</Text>
              ) : null}
            </View>
          </>
        )}

        <Button label="Log Out" variant="ghost" onPress={handleLogout} />
      </ScrollView>

      <Modal visible={addModalOpen} animationType="slide" transparent onRequestClose={() => setAddModalOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setAddModalOpen(false)}>
          <Pressable className="rounded-t-2xl bg-background p-5" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-ink">Add Wanted Item</Text>
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
            <Button label="Add" onPress={handleAddWanted} loading={addingWanted} disabled={!newWantedName.trim()} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}