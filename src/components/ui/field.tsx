import { StyleSheet, Switch as RNSwitch, TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, radii } from "../../theme/tokens";
import { Txt } from "./text";

export function Input({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted2}
      selectionColor={colors.accent}
      {...rest}
      style={[styles.input, style]}
    />
  );
}

export function Textarea({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.muted2}
      selectionColor={colors.accent}
      {...rest}
      style={[styles.input, styles.area, style]}
    />
  );
}

export function SwitchRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <Txt size={15}>{label}</Txt>
      <RNSwitch value={value} onValueChange={onValueChange} trackColor={{ true: colors.ink, false: colors.line }} thumbColor={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 56,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
  area: { height: 120, paddingTop: 14, paddingBottom: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
});
