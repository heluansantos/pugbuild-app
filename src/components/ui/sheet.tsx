import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import { colors, radii, touch } from "../../theme/tokens";
import { Txt } from "./text";

/** Bottom sheet with a spring slide, matching the web <Sheet>. */
export function Sheet({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify().stiffness(260).damping(28)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={20} weight="semibold">
                {title}
              </Txt>
              {description && (
                <Txt size={14} tone="muted">
                  {description}
                </Txt>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { backgroundColor: "rgba(20,20,20,0.45)" },
  panel: {
    marginTop: "auto",
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  close: { width: touch.min, height: touch.min, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
});
