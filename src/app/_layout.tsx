import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, useFonts } from "@expo-google-fonts/outfit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "../components/ui/toast";
import { SessionProvider, useSession } from "../features/session/session";
import { colors } from "../theme/tokens";

SplashScreen.preventAutoHideAsync();

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
  const { status, locale } = useSession();
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
    else if (status === "offline" && !top) router.replace("/login");
  }, [status, segments, router]);

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
