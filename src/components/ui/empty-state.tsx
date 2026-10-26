import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { colors, radii } from "../../theme/tokens";
import { Txt } from "./text";

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <View style={styles.base}>
      <View style={styles.icon}>{icon}</View>
      <Txt size={16} weight="semibold" center>
        {title}
      </Txt>
      <Txt size={14} tone="muted" center>
        {body}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", gap: 8, paddingVertical: 36, paddingHorizontal: 24, backgroundColor: colors.surface, borderRadius: radii.cardLg },
  icon: { width: 44, height: 44, borderRadius: radii.icon, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginBottom: 4 },
});
