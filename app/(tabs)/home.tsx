import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, PackageSearch, Search } from "lucide-react-native";
import { categories } from "@/lib/mockData";
import { fetchActiveListings, type Listing } from "@/lib/listingsApi";
import { ListingCard } from "@/components/ui/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";



export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((s) => s.user);

  const loadListings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchActiveListings();
      setListings(data);
    } catch (e) {
      // Keep it simple for now — an empty list is a safe fallback on error
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch every time Home comes into focus, so a listing you just created shows up
  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() || item.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [listings, activeCategory, searchQuery]);

  const header = (
    <View className="px-5">
      <View className="mb-4 flex-row items-center justify-between pt-2">
        <Text className="text-2xl font-bold text-primary">Market</Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-card border border-border">
          <Bell size={20} color="#243B53" />
        </Pressable>
      </View>

      <View className="mb-4 flex-row items-center rounded-lg border border-border bg-card px-3">
        <Search size={18} color="#6B7280" />
        <TextInput
          placeholder="Search for items..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="ml-2 h-11 flex-1 text-base text-ink"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5"
        contentContainerClassName="gap-2"
      >
        {categories.map((cat) => {
          const active = cat === activeCategory;
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-2 ${
                active ? "border-primary bg-primary" : "border-border bg-card"
              }`}
            >
              <Text className={`text-sm font-medium ${active ? "text-card" : "text-ink"}`}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mb-3 text-lg font-semibold text-ink">
        {activeCategory === "All" ? "Fresh on the stalls" : activeCategory}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#243B53" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperClassName="justify-between px-5"
        contentContainerClassName="pb-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadListings(true)} tintColor="#243B53" />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View className="w-[47%]">
            <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
          </View>
        )}
        ListEmptyComponent={
          listings.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="The market's quiet today"
              subtitle="Be the first to post something for trade. Tap the + button to create a listing."
            />
          ) : (
            <View className="items-center px-5 py-16">
              <Text className="text-base text-muted">No items match your search.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}