import { StyleSheet, Switch as RNSwitch, TextInput, View, type TextInputProps } from "react-native";
import { useTheme, useThemedStyles } from "../../theme/theme";
import { fonts, radii, type Palette } from "../../theme/tokens";
import { Txt } from "./text";

export function Input({ style, ...rest }: TextInputProps) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      placeholderTextColor={colors.muted2}
      selectionColor={colors.accent}
      keyboardAppearance={scheme}
      {...rest}
      style={[styles.input, style]}
    />
  );
}

export function Textarea({ style, ...rest }: TextInputProps) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.muted2}
      selectionColor={colors.accent}
      keyboardAppearance={scheme}
      {...rest}
      style={[styles.input, styles.area, style]}
    />
  );
}

export function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.switchRow}>
      <Txt size={15}>{label}</Txt>
      <RNSwitch value={value} onValueChange={onValueChange} trackColor={{ true: colors.ink, false: colors.line }} thumbColor={value || scheme === "light" ? colors.onInk : colors.muted} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    input: {
      height: 56,
      borderRadius: radii.card,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 16,
      fontSize: 17,
      fontFamily: fonts.regular,
      color: c.ink,
    },
    area: { height: 120, paddingTop: 14, paddingBottom: 14 },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  });
