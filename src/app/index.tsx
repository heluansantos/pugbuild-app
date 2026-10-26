import { ActivityIndicator, StyleSheet, View } from "react-native";
import { PugMark } from "../components/brand/logo";
import { colors } from "../theme/tokens";

/** Shown only while the session probe runs; the root layout redirects right after. */
export default function Index() {
  return (
    <View style={styles.root}>
      <PugMark size={96} />
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 24 } });
