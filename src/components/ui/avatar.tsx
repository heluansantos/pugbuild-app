import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/theme";
import { initials } from "../../lib/format";
import { Txt } from "./text";

export function Avatar({ name, photoUrl, size = 48 }: { name: string; photoUrl?: string; size?: number }) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) return <Image source={{ uri: photoUrl }} style={[styles.base, shape]} accessibilityLabel={name} contentFit="cover" cachePolicy="disk" transition={120} />;
  return (
    <View style={[styles.base, shape, { backgroundColor: colors.ink }]}>
      <Txt size={size * 0.36} weight="semibold" tone="onInk">
        {initials(name)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ base: { alignItems: "center", justifyContent: "center", overflow: "hidden" } });
