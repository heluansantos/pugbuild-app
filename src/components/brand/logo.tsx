import { StyleSheet, View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";
import { lightColors } from "../../theme/tokens";
import { Txt } from "../ui/text";
import { PUG_ANCHOR_Y, PUG_HAT_PATH, PUG_INK_PATH, PUG_SCALE, PUG_SILHOUETTE_PATH, PUG_VIEWBOX } from "./pug-mark-paths";

export type MarkTone = "light" | "dark";

/** PugBuild mark: the approved pug in a hard hat inside the yellow badge, transparent background. */
export function PugMark({ size = 56, tone = "light" }: { size?: number; tone?: MarkTone }) {
  // The artwork is brand, not UI: it keeps the approved light-palette values in both themes.
  const ink = tone === "dark" ? lightColors.bg : lightColors.ink;
  const body = tone === "dark" ? lightColors.ink : lightColors.bg;
  return (
    <Svg width={size} height={size} viewBox={PUG_VIEWBOX}>
      <Rect x={206} y={206} width={612} height={612} rx={88} fill="none" stroke={lightColors.accent} strokeWidth={24} />
      <G transform={`translate(512,${PUG_ANCHOR_Y}) scale(${PUG_SCALE}) translate(-512,-${PUG_ANCHOR_Y})`}>
        <Path fill={body} d={PUG_SILHOUETTE_PATH} />
        <Path fillRule="evenodd" fill={lightColors.accent} d={PUG_HAT_PATH} />
        <Path fillRule="evenodd" fill={ink} d={PUG_INK_PATH} />
      </G>
    </Svg>
  );
}

export function Logo({ tone = "light", size = 56 }: { tone?: MarkTone; size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel="PugBuild">
      <PugMark size={size} tone={tone} />
      <Txt size={22} weight="semibold" tracking={-0.3} tone="ink">
        PugBuild
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 10 } });
