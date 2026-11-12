import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export function MatchSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <View className="mb-3 rounded-xl border border-border bg-card p-4">
        <View className="mb-4 h-6 w-28 rounded-md bg-border" />
        <View className="flex-row">
          <View className="h-16 w-16 rounded-lg bg-border" />
          <View className="ml-3 flex-1 justify-center">
            <View className="mb-2 h-3 w-3/4 rounded bg-border" />
            <View className="h-3 w-1/2 rounded bg-border" />
          </View>
        </View>
        <View className="mt-4 h-11 rounded-xl bg-border" />
      </View>
    </Animated.View>
  );
}