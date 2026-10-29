import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, useFonts } from "@expo-google-fonts/outfit";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ErrorBoundaryProps } from "expo-router";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";
import { Txt } from "../components/ui/text";
import { t } from "../lib/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../components/ui/toast";
import { SessionProvider, useSession } from "../features/session/session";
import { colors } from "../theme/tokens";

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
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <Gate />
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Sends the person to the right place for their session state; screens never guess. */
function Gate() {
  const session = useSession();
  const { status, locale } = session;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    SplashScreen.hideAsync();
    const top = segments[0] as string | undefined;
    const inAuth = top === "login";
    const inTabs = top === "(tabs)" || top === "task" || top === "site";
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
  return (
    <View style={styles.error}>
      <Txt size={22} weight="semibold" center>
        {t("common.states.error")}
      </Txt>
      <Txt size={15} tone="muted" center>
        {t("common.states.errorBody")}
      </Txt>
      <Pressable onPress={retry} style={styles.retry} accessibilityRole="button">
        <Txt size={16} weight="semibold" tone="white">
          {t("common.actions.retry")}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32, backgroundColor: colors.bg },
  retry: { marginTop: 12, height: 52, paddingHorizontal: 28, borderRadius: 999, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
});
