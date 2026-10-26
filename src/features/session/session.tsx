import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, isApiError, loadApiUrl } from "../../lib/api";
import type { Locale, MeDto } from "../../lib/api-types";
import { i18n, loadLocale, saveLocale } from "../../lib/i18n";

/**
 * What the app knows about the signed-in person.
 * - "loading": probing /api/v1/me on launch
 * - "anonymous": no session cookie (or it expired)
 * - "consent": signed in but must accept the Terms first
 * - "ready": full session with a company
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
      setState((s) => ({ ...s, status: "ready", me }));
    } catch (e) {
      if (isApiError(e) && e.consentRequired) setState((s) => ({ ...s, status: "consent", me: null }));
      else if (isApiError(e, "unauthorized")) setState((s) => ({ ...s, status: "anonymous", me: null }));
      else if (isApiError(e, "forbidden") || isApiError(e, "not_found")) {
        // Session without an active company: pick one or sign in again.
        setState((s) => ({ ...s, status: "consent", me: null }));
      } else setState((s) => ({ ...s, status: s.me ? "ready" : "offline" }));
    }
  }, []);

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

/** Only for screens behind the auth gate, where `me` is guaranteed. */
export function useMe(): MeDto {
  const { me } = useSession();
  if (!me) throw new Error("useMe before the session is ready");
  return me;
}
