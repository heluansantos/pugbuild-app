import { Image, StyleSheet, View } from "react-native";
import { colors } from "../../theme/tokens";
import { initials } from "../../lib/format";
import { Txt } from "./text";

export function Avatar({ name, photoUrl, size = 48 }: { name: string; photoUrl?: string; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) return <Image source={{ uri: photoUrl }} style={[styles.base, shape]} accessibilityLabel={name} />;
  return (
    <View style={[styles.base, shape]}>
      <Txt size={size * 0.36} weight="semibold" tone="white">
        {initials(name)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ base: { backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", overflow: "hidden" } });
