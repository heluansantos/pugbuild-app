import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";
import { darkColors, lightColors, shadows, type Palette, type Shadows } from "./tokens";

export type Scheme = "light" | "dark";
export type ThemePreference = "system" | Scheme;

export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];
export const THEME_KEY = "pb.theme";

const palettes: Record<Scheme, Palette> = { light: lightColors, dark: darkColors };

export function isThemePreference(v: unknown): v is ThemePreference {
  return typeof v === "string" && (THEME_PREFERENCES as readonly string[]).includes(v);
}

/** Read once at boot (before the splash hides) so the first frame already has the right palette. */
export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (isThemePreference(saved)) return saved;
  } catch {
    // storage unavailable: follow the system
  }
  return "system";
}

async function saveThemePreference(pref: ThemePreference) {
  try {
    await AsyncStorage.setItem(THEME_KEY, pref);
  } catch {
    // best effort: the choice still applies for this session
  }
}

export interface ThemeValue {
  colors: Palette;
  shadow: Shadows;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const system = useColorScheme();
  const scheme: Scheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  // Keep native chrome (keyboard, alerts, pickers, status bar) in step with the in-app choice.
  useEffect(() => {
    Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
  }, [preference]);

  // Overscroll, keyboard resize and the gap behind transitions show the root view's colour.
  const bg = palettes[scheme].bg;
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(bg).catch(() => {
      // cosmetic only
    });
  }, [bg]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    void saveThemePreference(pref);
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ colors: palettes[scheme], shadow: shadows[scheme], scheme, preference, setPreference }),
    [scheme, preference, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}

type StyleFactory<T> = (colors: Palette, shadow: Shadows) => T;

// One StyleSheet per (factory, scheme): module-level factories are created at most twice per app run.
const styleCache = new WeakMap<StyleFactory<object>, Partial<Record<Scheme, object>>>();

/**
 * Themed `StyleSheet`. Pass a module-level factory (a stable reference) so the cache can hit:
 * `const makeStyles = (c: Palette) => StyleSheet.create({...})` then `useThemedStyles(makeStyles)`.
 */
export function useThemedStyles<T extends object>(factory: StyleFactory<T>): T {
  const { colors, shadow, scheme } = useTheme();
  return useMemo(() => {
    const key = factory as StyleFactory<object>;
    let entry = styleCache.get(key);
    if (!entry) {
      entry = {};
      styleCache.set(key, entry);
    }
    const hit = entry[scheme] as T | undefined;
    if (hit) return hit;
    const made = factory(colors, shadow);
    entry[scheme] = made;
    return made;
  }, [factory, colors, shadow, scheme]);
}
