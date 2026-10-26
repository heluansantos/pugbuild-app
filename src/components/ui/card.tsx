import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radii } from "../../theme/tokens";

type Size = "md" | "lg";
type Tone = "surface" | "ink" | "bg";

/** Rounded surface: 22px for rows, 26px for the big cards from the mockups. */
export function Card({ size = "md", tone = "surface", style, ...rest }: ViewProps & { size?: Size; tone?: Tone }) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        { borderRadius: size === "lg" ? radii.cardLg : radii.cardMd, padding: size === "lg" ? 18 : 14 },
        tone === "ink" && { backgroundColor: colors.ink },
        tone === "bg" && { backgroundColor: colors.bg },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({ base: { backgroundColor: colors.surface } });
