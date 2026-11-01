import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../../theme/theme";

/**
 * Soft accent glow behind the page: a hint in light mode, warmer in dark. Pure SVG, no blur
 * views, so it costs nothing on scroll. Sits under the content and ignores touches.
 */
export function Glow() {
  const { colors, scheme } = useTheme();
  const peak = scheme === "dark" ? 0.26 : 0.16;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="pb-glow-top" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={peak} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="pb-glow-bottom" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={peak * 0.6} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="88" cy="4" rx="46" ry="22" fill="url(#pb-glow-top)" />
        <Ellipse cx="8" cy="96" rx="40" ry="18" fill="url(#pb-glow-bottom)" />
      </Svg>
    </View>
  );
}
