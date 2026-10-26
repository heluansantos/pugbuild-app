import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/tokens";
import { initials } from "../../lib/format";
import { Txt } from "./text";

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}>
      <Txt size={size * 0.36} weight="semibold" tone="white">
        {initials(name)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ base: { backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" } });
