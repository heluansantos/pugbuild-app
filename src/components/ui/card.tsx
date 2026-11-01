import { View, type ViewProps } from "react-native";
import { useTheme } from "../../theme/theme";
import { radii } from "../../theme/tokens";

type Size = "md" | "lg";
type Tone = "surface" | "ink" | "bg";

/** Rounded surface: 22px for rows, 26px for the big cards from the mockups. */
export function Card({ size = "md", tone = "surface", style, ...rest }: ViewProps & { size?: Size; tone?: Tone }) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: colors[tone], borderRadius: size === "lg" ? radii.cardLg : radii.cardMd, padding: size === "lg" ? 18 : 14 },
        style,
      ]}
    />
  );
}
