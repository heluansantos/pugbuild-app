import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/theme";
import { radii } from "../../theme/tokens";
import { Txt } from "./text";

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.base, { backgroundColor: colors.surface }]}>
      <View style={[styles.icon, { backgroundColor: colors.bg }]}>{icon}</View>
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
  base: { alignItems: "center", gap: 8, paddingVertical: 36, paddingHorizontal: 24, borderRadius: radii.cardLg },
  icon: { width: 44, height: 44, borderRadius: radii.icon, alignItems: "center", justifyContent: "center", marginBottom: 4 },
});
