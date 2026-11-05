import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, useFonts } from "@expo-google-fonts/outfit";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ErrorBoundaryProps } from "expo-router";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, Text as RNText, useColorScheme, View } from "react-native";
import { t } from "../lib/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../components/ui/toast";
import { useNotificationTaps } from "../features/notifications/taps";
import { SessionProvider, useSession } from "../features/session/session";
import { loadThemePreference, ThemeProvider, useTheme, type ThemePreference } from "../theme/theme";
import { darkColors, fonts, lightColors } from "../theme/tokens";

SplashScreen.preventAutoHideAsync();

// React Query only knows about browsers by default: tell it when the app is in front and online,
// so refetch-on-reconnect works and nothing refetches while the phone sits in a pocket.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(!!s.isConnected && s.isInternetReachable !== false)));
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener("change", (state) => {
    if (Platform.OS !== "web") setFocused(state === "active");
  });
  return () => sub.remove();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnReconnect: true } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  // The saved theme is read alongside the fonts; the splash stays up until both are ready so the
  // first painted frame already has the right palette.
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  useEffect(() => {
    void loadThemePreference().then(setThemePreference);
  }, []);
  if (!fontsLoaded || themePreference === null) return null;
  return (
    <ThemeProvider initialPreference={themePreference}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <ToastProvider>
                <ThemedStatusBar />
                <Gate />
              </ToastProvider>
            </SessionProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

/** Sends the person to the right place for their session state; screens never guess. */
function Gate() {
  const session = useSession();
  const { status, locale } = session;
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  // Notification taps navigate only once there is someone signed in to show the tab to.
  useNotificationTaps(status === "ready" || (status === "offline" && session.me !== null));

  useEffect(() => {
    if (status === "loading") return;
    SplashScreen.hideAsync();
    const top = segments[0] as string | undefined;
    const inAuth = top === "login";
    const inTabs = top === "(tabs)" || top === "task" || top === "site" || top === "map" || top === "site-costs";
    if (status === "anonymous" && !inAuth) router.replace("/login");
    else if (status === "consent" && top !== "welcome" && top !== "select-company") router.replace("/welcome");
    else if (status === "ready" && !inTabs) router.replace("/(tabs)");
    // Offline with a known profile: keep working (clock in offline). Without one: the login waits.
    else if (status === "offline" && session.me && !inTabs) router.replace("/(tabs)");
    else if (status === "offline" && !session.me && !inAuth) router.replace("/login");
  }, [status, segments, router, session.me]);

  return (
    <Stack key={locale} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login/index" />
      <Stack.Screen name="login/verify" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="select-company" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

/** Any render error lands here instead of a blank screen; "Try again" re-mounts the route. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) console.error(error);
  // Rendered outside the providers, so it reads the system scheme directly and styles itself with plain text.
  const c = useColorScheme() === "dark" ? darkColors : lightColors;
  return (
    <View style={[styles.error, { backgroundColor: c.bg }]}>
      <RNText style={[styles.title, { color: c.ink }]}>{t("common.states.error")}</RNText>
      <RNText style={[styles.body, { color: c.muted }]}>{t("common.states.errorBody")}</RNText>
      <Pressable onPress={retry} style={[styles.retry, { backgroundColor: c.ink }]} accessibilityRole="button">
        <RNText style={[styles.retryLabel, { color: c.onInk }]}>{t("common.actions.retry")}</RNText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  title: { fontFamily: fonts.semibold, fontSize: 22, textAlign: "center" },
  body: { fontFamily: fonts.regular, fontSize: 15, textAlign: "center" },
  retry: { marginTop: 12, height: 52, paddingHorizontal: 28, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  retryLabel: { fontFamily: fonts.semibold, fontSize: 16 },
});
