import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, isApiError, loadApiUrl, setUnauthorizedHandler } from "../../lib/api";
import type { Locale, MeDto } from "../../lib/api-types";
import { i18n, loadLocale, saveLocale } from "../../lib/i18n";
import { disconnectRealtime } from "./realtime-socket";

/**
 * What the app knows about the signed-in person.
 * - "loading": probing /api/v1/me on launch
 * - "anonymous": no session cookie (or it expired)
 * - "consent": signed in but must accept the Terms first
 * - "ready": full session with a company
 * - "offline": no answer from the server; with a cached profile the app still works (clock in
 *   offline), without one the login screen waits for the network
 */
export type SessionStatus = "loading" | "anonymous" | "consent" | "ready" | "offline";

interface SessionState {
  status: SessionStatus;
  me: MeDto | null;
  locale: Locale;
  /** Phone used on the login screen, kept for the verify step. */
  pendingPhone: string | null;
}

interface SessionApi extends SessionState {
  refresh: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setPendingPhone: (phone: string | null) => void;
  /** Called after a successful OTP verification. */
  afterVerify: (result: { consentRequired: boolean; role?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionApi | null>(null);

/** Last known profile, so a cold start at a job site without signal can still clock in. */
const ME_KEY = "pb.me.v1";
async function saveMe(me: MeDto | null) {
  try {
    if (me) await AsyncStorage.setItem(ME_KEY, JSON.stringify(me));
    else await AsyncStorage.removeItem(ME_KEY);
  } catch {
    // best effort
  }
}
async function loadMe(): Promise<MeDto | null> {
  try {
    const raw = await AsyncStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw) as MeDto) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<SessionState>({
    status: "loading",
    me: null,
    locale: "en",
    pendingPhone: null,
  });

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      void saveMe(me);
      setState((s) => {
        // Another company (or person) than before: nothing cached for the old one may leak in.
        if (s.me && (s.me.member.id !== me.member.id || s.me.company.id !== me.company.id)) qc.clear();
        return { ...s, status: "ready", me };
      });
    } catch (e) {
      if (isApiError(e) && e.consentRequired) setState((s) => ({ ...s, status: "consent", me: null }));
      else if (isApiError(e, "unauthorized") || isApiError(e, "not_found")) {
        void saveMe(null);
        setState((s) => ({ ...s, status: "anonymous", me: null }));
      } else if (isApiError(e, "forbidden")) {
        // Session without an active company: pick one or sign in again.
        setState((s) => ({ ...s, status: "consent", me: null }));
      } else {
        // No answer: keep working with the last known profile.
        const cached = await loadMe();
        setState((s) => ({ ...s, status: "offline", me: s.me ?? cached }));
      }
    }
  }, [qc]);

  // A 401 anywhere (expired cookie, demo data reseeded) drops the session so the Gate shows the login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.clear();
      void saveMe(null);
      setState((s) => (s.status === "anonymous" ? s : { ...s, status: "anonymous", me: null }));
    });
    return () => setUnauthorizedHandler(null);
  }, [qc]);

  // Offline at launch: try again as soon as the network or the app comes back.
  useEffect(() => {
    if (state.status !== "offline") return;
    const unsubNet = NetInfo.addEventListener((n) => {
      if (n.isConnected && n.isInternetReachable !== false) void refresh();
    });
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") void refresh();
    });
    return () => {
      unsubNet();
      sub.remove();
    };
  }, [state.status, refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const locale = await loadLocale();
      await loadApiUrl();
      i18n.locale = locale;
      if (!cancelled) setState((s) => ({ ...s, locale }));
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<SessionApi>(
    () => ({
      ...state,
      refresh,
      setPendingPhone: (phone) => setState((s) => ({ ...s, pendingPhone: phone })),
      setLocale: async (locale) => {
        i18n.locale = locale;
        await saveLocale(locale);
        setState((s) => ({ ...s, locale }));
      },
      afterVerify: async (result) => {
        if (result.consentRequired) setState((s) => ({ ...s, status: "consent", me: null }));
        else await refresh();
      },
      signOut: async () => {
        try {
          await api.auth.logout();
        } catch {
          // the cookie is gone either way once the server answers; offline sign-out still clears the UI
        }
        qc.clear();
        void saveMe(null);
        disconnectRealtime();
        setState((s) => ({ ...s, status: "anonymous", me: null, pendingPhone: null }));
      },
    }),
    [state, refresh, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/**
 * Only for screens behind the auth gate. Screens that can outlive a sign-out (task, site) must
 * check `useSession().me` instead, because the gate redirects one render later.
 */
export function useMe(): MeDto {
  const { me } = useSession();
  if (!me) throw new Error("useMe before the session is ready");
  return me;
}

/** The app language the person picked (falls back to the device language), for dates and money. */
export function useLocale(): Locale {
  return useSession().locale;
}
