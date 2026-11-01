import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/theme";
import { spacing } from "../../theme/tokens";
import { Txt } from "./text";

/** Page frame: safe-area padding, 20px gutters, space for the floating tab bar. */
export function Screen({ children, scroll = true, tabs = false, style, ...rest }: ScrollViewProps & { children: ReactNode; scroll?: boolean; tabs?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const padding = { paddingTop: insets.top + 8, paddingBottom: (tabs ? 96 : 16) + insets.bottom, paddingHorizontal: spacing.screen };
  if (!scroll)
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }, padding, style]}>
        {children}
      </View>
    );
  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={[styles.content, padding, style]} keyboardShouldPersistTaps="handled" indicatorStyle={scheme === "dark" ? "white" : "black"} {...rest}>
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: string }) {
  return (
    <Txt size={28} weight="semibold" tracking={-0.5}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, flexGrow: 1 },
});
