import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemedStyles } from "../../theme/theme";
import { radii, type Palette, type Shadows } from "../../theme/tokens";
import { Txt } from "./text";

type Tone = "neutral" | "ok" | "error";
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

interface ToastApi {
  toast: (text: string, tone?: Tone) => void;
  ok: (text: string) => void;
  error: (text: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  const toast = useCallback((text: string, tone: Tone = "neutral") => {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 3600);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ toast, ok: (t) => toast(t, "ok"), error: (t) => toast(t, "error") }),
    [toast],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
        {items.map((i) => (
          <Animated.View
            key={i.id}
            entering={FadeInDown.springify().stiffness(300).damping(26)}
            exiting={FadeOutDown.duration(180)}
            style={[styles.item, i.tone === "ok" && styles.ok, i.tone === "error" && styles.error]}
            accessibilityLiveRegion="polite"
          >
            <Txt size={14} weight="medium" tone={i.tone === "neutral" ? "onInk" : "ink"} center>
              {i.text}
            </Txt>
          </Animated.View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}

const makeStyles = (c: Palette, shadow: Shadows) =>
  StyleSheet.create({
    host: { position: "absolute", left: 20, right: 20, gap: 8, alignItems: "center" },
    item: { backgroundColor: c.ink, borderRadius: radii.card, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 360, ...shadow.float },
    ok: { backgroundColor: c.okBg },
    error: { backgroundColor: c.warnBg },
  });
