import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bone, Pulse } from "@/components/ui/Skeleton";

export function ListingGridSkeleton() {
  return (
    <Pulse>
      <View className="flex-row flex-wrap justify-between px-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} className="mb-4 w-[47%] overflow-hidden rounded-xl border border-border bg-card">
            <Bone h={128} r={0} />
            <View className="p-3">
              <Bone h={14} w="80%" style={{ marginBottom: 8 }} />
              <Bone h={10} w="55%" style={{ marginBottom: 10 }} />
              <Bone h={28} r={8} />
            </View>
          </View>
        ))}
      </View>
    </Pulse>
  );
}

export function ListingDetailSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Pulse>
        <View className="px-5 py-3">
          <Bone w={36} h={36} r={18} />
        </View>
        <View className="px-5">
          <Bone h={260} r={12} style={{ marginBottom: 16 }} />
          <Bone w="70%" h={24} style={{ marginBottom: 8 }} />
          <Bone w="35%" h={14} style={{ marginBottom: 24 }} />
          <Bone h={90} r={12} style={{ marginBottom: 20 }} />
          <Bone w="40%" h={14} style={{ marginBottom: 8 }} />
          <Bone h={14} style={{ marginBottom: 6 }} />
          <Bone w="80%" h={14} />
        </View>
      </Pulse>
    </SafeAreaView>
  );
}

export function TradeDetailSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <Pulse>
        <View className="flex-row items-center px-5 py-3">
          <Bone w={36} h={36} r={18} />
          <Bone w={180} h={20} style={{ marginLeft: 12 }} />
        </View>
        <View className="px-5">
          <Bone h={52} r={10} style={{ marginBottom: 16 }} />
          <Bone w={90} h={12} style={{ marginBottom: 8 }} />
          <View className="rounded-xl border border-border bg-card p-3">
            {[0, 1, 2].map((i) => (
              <View key={i} className="mb-3 flex-row items-center">
                <Bone w={40} h={40} r={6} />
                <Bone w="60%" h={14} style={{ marginLeft: 12 }} />
              </View>
            ))}
          </View>
        </View>
      </Pulse>
    </SafeAreaView>
  );
}

export function ProfileSectionsSkeleton() {
  return (
    <Pulse>
      <View className="px-5">
        <Bone w={110} h={18} style={{ marginBottom: 12 }} />
        <View className="flex-row gap-3">
          {[0, 1, 2].map((i) => (
            <Bone key={i} w={128} h={128} r={12} />
          ))}
        </View>
        <Bone w={130} h={18} style={{ marginTop: 32, marginBottom: 12 }} />
        <View className="flex-row gap-2">
          {[0, 1, 2].map((i) => (
            <Bone key={i} w={80} h={32} r={16} />
          ))}
        </View>
      </View>
    </Pulse>
  );
}


export function TradeListSkeleton() {
  return (
    <Pulse>
      <View className="px-5">
        <View className="mb-4 flex-row gap-2">
          <Bone w={90} h={34} r={17} />
          <Bone w={110} h={34} r={17} />
          <Bone w={95} h={34} r={17} />
        </View>
        {[0, 1, 2].map((i) => (
          <View key={i} className="mb-3 rounded-xl border border-border bg-card p-3">
            <View className="mb-3 flex-row items-center">
              <Bone w={44} h={44} r={8} />
              <Bone w={14} h={14} style={{ marginHorizontal: 8 }} />
              <Bone w={44} h={44} r={8} />
            </View>
            <Bone w="70%" h={14} style={{ marginBottom: 8 }} />
            <Bone w="45%" h={11} />
          </View>
        ))}
      </View>
    </Pulse>
  );
}


export function NotificationListSkeleton() {
  return (
    <Pulse>
      <View className="px-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} className="mb-3 flex-row items-center rounded-xl border border-border bg-card p-3">
            <Bone w={40} h={40} r={20} />
            <View className="ml-3 flex-1">
              <Bone w="45%" h={13} style={{ marginBottom: 8 }} />
              <Bone w="80%" h={11} />
            </View>
          </View>
        ))}
      </View>
    </Pulse>
  );
}