import * as Haptics from "expo-haptics";
import { ChevronRight } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button } from "../../components/ui/button";
import { Chip } from "../../components/ui/chip";
import { Sheet } from "../../components/ui/sheet";
import { Txt } from "../../components/ui/text";
import type { AssetDto, WorkerFleetDto } from "../../lib/api-types";
import { t } from "../../lib/i18n";
import { radii, touch, type Palette } from "../../theme/tokens";
import { useTheme, useThemedStyles } from "../../theme/theme";
import { assetEmoji, assetLabel, splitAssetChoice } from "./asset-choice";

/**
 * "What are you using today?" between the Start tap and the clock-in (docs/FLEET.md). The last
 * shift's asset is one tap; the others are a short list; "None today" is always there. Only
 * operators of a company with fleet on ever see it.
 */
export function AssetPicker({
  open,
  onClose,
  fleet,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  fleet: WorkerFleetDto;
  onPick: (assetId: string | undefined) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { suggested, others } = useMemo(() => splitAssetChoice(fleet), [fleet]);
  const pick = (id: string | undefined) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPick(id);
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("worker.fleet.title")}>
      <ScrollView
        style={{ maxHeight: 380 }}
        contentContainerStyle={{ gap: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {suggested && (
          <Pressable
            onPress={() => pick(suggested.id)}
            accessibilityRole="button"
            accessibilityLabel={assetLabel(suggested)}
            style={({ pressed }) => [styles.row, styles.suggested, pressed && styles.pressed]}
            testID="asset-suggested"
          >
            <AssetTile asset={suggested} onInk />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={17} weight="semibold" tone="onInk" numberOfLines={1}>
                {suggested.name}
              </Txt>
              <Txt size={13} tone="muted3" numberOfLines={1}>
                {suggested.identifier ?? t(`worker.fleet.kinds.${suggested.kind}`)}
              </Txt>
            </View>
            <Chip tone="accent" size="sm">
              {t("worker.fleet.suggested")}
            </Chip>
          </Pressable>
        )}
        {others.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => pick(a.id)}
            accessibilityRole="button"
            accessibilityLabel={assetLabel(a)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <AssetTile asset={a} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={16} weight="medium" numberOfLines={1}>
                {a.name}
              </Txt>
              <Txt size={13} tone="muted" numberOfLines={1}>
                {a.identifier ?? t(`worker.fleet.kinds.${a.kind}`)}
              </Txt>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
      <Button variant="secondary" onPress={() => pick(undefined)} testID="asset-none">
        {t("worker.fleet.none")}
      </Button>
    </Sheet>
  );
}

/** Square emoji tile, the same shape as the site icon on the working view. */
export function AssetTile({
  asset,
  onInk,
  size = 44,
}: {
  asset: Pick<AssetDto, "kind" | "icon">;
  onInk?: boolean;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.icon,
        backgroundColor: onInk ? colors.ink2 : colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessible={false}
    >
      <Txt size={Math.round(size * 0.5)} style={{ lineHeight: Math.round(size * 0.65) }}>
        {assetEmoji(asset)}
      </Txt>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      minHeight: touch.hero,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 10,
      paddingRight: 14,
      borderRadius: radii.cardMd,
      backgroundColor: c.surface,
    },
    suggested: { backgroundColor: c.ink, paddingVertical: 12 },
    pressed: { opacity: 0.85 },
  });
