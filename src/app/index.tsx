import { ActivityIndicator, StyleSheet, View } from "react-native";
import { PugMark } from "../components/brand/logo";
import { useTheme, useThemedStyles } from "../theme/theme";
import type { Palette } from "../theme/tokens";

/** Shown only while the session probe runs; the root layout redirects right after. */
export default function Index() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.root}>
      <PugMark size={96} />
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({ root: { flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 24 } });
