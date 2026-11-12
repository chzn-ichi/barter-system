import { useEffect, useRef, type ReactNode } from "react";
import { Animated, View, type DimensionValue, type ViewStyle } from "react-native";

// Wrap a group of Bone blocks in one Pulse so they all fade together.
export function Pulse({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export function Bone({ w, h, r = 8, style }: { w?: DimensionValue; h: number; r?: number; style?: ViewStyle }) {
  return (
    <View style={[{ width: w ?? "100%", height: h, borderRadius: r, backgroundColor: "#E2E8F0" }, style]} />
  );
}