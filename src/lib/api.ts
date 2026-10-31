import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiErrorCode, BillingOverviewDto, FeedPageDto, GeoPoint, MeDto, MemberDto, MembershipSummary, PayHistoryDto, Period, PeriodSummaryDto, PunchDto, PunchInput, SiteCostsDto, SiteDetailDto, SiteDto, SiteExpenseDto, SiteExpenseInput, TaskDto, TodayOverview, VerifyResult, WeekDto, WeekSummaryDto } from "./api-types";

/**
 * Where the web app lives. Expo inlines EXPO_PUBLIC_* at build time; a person can override it
 * from the login screen (long-press the logo) without a rebuild, e.g. to point a demo at another deployment.
 */
const PRODUCTION_URL = "https://pugbuild.com";
/** Build-time URL per EAS profile; a release build without one talks to production, never localhost. */
export const DEFAULT_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? "http://localhost:3002" : PRODUCTION_URL)).replace(/\/$/, "");
/** Switching servers is a developer tool: in release builds only these hosts are accepted. */
export const SERVER_SWITCH_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_ALLOW_SERVER_SWITCH === "1";
const API_URL_KEY = "pb.apiUrl";
let apiUrl = DEFAULT_API_URL;

export function getApiUrl() {
  return apiUrl;
}

export const SERVER_PRESETS: { label: string; url: string }[] = [
  { label: "Production", url: "https://pugbuild.com" },
  { label: "Preview (demo data)", url: "https://pugbuild-web-git-development-heluansantos-projects.vercel.app" },
];
const ALLOWED_HOSTS = new Set(SERVER_PRESETS.map((p) => new URL(p.url).host));

/** Release builds accept only the known https deployments; dev builds accept anything. */
export function isAllowedServer(url: string): boolean {
  try {
    const u = new URL(url);
    if (__DEV__) return u.protocol === "https:" || u.protocol === "http:";
    return u.protocol === "https:" && (ALLOWED_HOSTS.has(u.host) || u.host === new URL(DEFAULT_API_URL).host);
  } catch {
    return false;
  }
}

export async function loadApiUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_URL_KEY);
    if (saved && SERVER_SWITCH_ENABLED && isAllowedServer(saved)) apiUrl = saved.replace(/\/$/, "");
  } catch {
    // storage unavailable: keep the build-time default
  }
  return apiUrl;
}

/** Null restores the build-time default. */
export async function setApiUrl(url: string | null) {
  if (url && (!SERVER_SWITCH_ENABLED || !isAllowedServer(url))) throw new Error("server_not_allowed");
  apiUrl = (url ?? DEFAULT_API_URL).replace(/\/$/, "");
  try {
    if (url) await AsyncStorage.setItem(API_URL_KEY, apiUrl);
    else await AsyncStorage.removeItem(API_URL_KEY);
  } catch {
    // best effort
  }
}

/** Optional Vercel "Protection Bypass for Automation" secret for protected previews. */
const BYPASS_SECRET = process.env.EXPO_PUBLIC_VERCEL_BYPASS;

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
  /** The session exists but the person has not accepted the current Terms yet. */
  get consentRequired() {
    return this.code === "forbidden" && this.message === "consent_required";
  }
}

export function isApiError(e: unknown, code?: ApiErrorCode): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}

const CODES: ReadonlySet<string> = new Set(["unauthorized", "forbidden", "not_found", "validation", "conflict", "rate_limited", "locked", "billing_required"]);
/** Anything the API (or a proxy in front of it) sends that we do not know reads as "unknown". */
const knownCode = (code: unknown): ApiErrorCode => (typeof code === "string" && CODES.has(code) ? (code as ApiErrorCode) : "unknown");

/** The session provider registers this so any 401 outside the login flow sends the person back to sign in. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: ApiErrorCode; message: string } };

const TIMEOUT_MS = 15_000;

const UPLOAD_TIMEOUT_MS = 90_000;

async function request<T>(path: string, init: RequestInit & { json?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const { json, headers, timeoutMs, ...rest } = init;
  const controller = new AbortController();
  // Photos on a weak job-site signal take longer than a JSON call.
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? (rest.body instanceof FormData ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS));
  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      ...rest,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(BYPASS_SECRET && /\.vercel\.app$/.test(new URL(apiUrl).host) ? { "x-vercel-protection-bypass": BYPASS_SECRET } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } finally {
    clearTimeout(timer);
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    body = null;
  }
  if (!body) {
    // Vercel Authentication answers HTML; anything without the JSON envelope is a server problem.
    throw new ApiError(res.status === 401 ? "unauthorized" : "unknown", `Bad response (${res.status})`, res.status);
  }
  if (!body.ok) {
    const err = new ApiError(knownCode(body.error?.code), body.error?.message ?? "", res.status);
    if (err.code === "unauthorized" && !path.startsWith("/api/v1/auth/")) onUnauthorized?.();
    throw err;
  }
  return body.data;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, json: unknown = {}) => request<T>(path, { method: "POST", json });

export const api = {
  /** The only endpoint without the envelope. */
  health: async () => {
    const res = await fetch(`${apiUrl}/api/v1`, { headers: BYPASS_SECRET ? { "x-vercel-protection-bypass": BYPASS_SECRET } : {} });
    return (await res.json()) as { name: string; version: string };
  },
  auth: {
    requestCode: (phone: string, locale: string) => post<{ ok: true }>("/api/v1/auth/otp/request", { phone, locale }),
    verify: (phone: string, code: string) => post<VerifyResult>("/api/v1/auth/otp/verify", { phone, code }),
    logout: () => post<{ ok: true }>("/api/v1/auth/logout"),
    memberships: () => get<{ memberships: MembershipSummary[] }>("/api/v1/memberships"),
    selectCompany: (membershipId: string) => post<{ ok: true; role: string }>("/api/v1/select-company", { membershipId }),
    consent: (locale: string) => post<{ ok: true }>("/api/v1/consent", { sms: true, location: true, locale }),
  },
  me: () => get<MeDto>("/api/v1/me"),
  /** Multipart upload of a profile photo picked on the phone (read as a Blob: RN 0.88 dropped the {uri,name,type} form part). */
  setPhoto: async (uri: string, mimeType = "image/jpeg") => {
    const raw = await (await fetch(uri)).blob();
    // The native blob carries no content type; re-wrap it so the server sees the real mime type.
    const blob = new Blob([raw], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, `avatar.${mimeType.split("/")[1] ?? "jpg"}`);
    return request<{ photoUrl: string }>("/api/v1/me/photo", { method: "POST", body: form });
  },
  punches: {
    open: () => get<PunchDto | null>("/api/v1/punches/open"),
    clockIn: (input: PunchInput) => post<PunchDto>("/api/v1/punches/clock-in", input),
    clockOut: (input: PunchInput) => post<PunchDto>("/api/v1/punches/clock-out", input),
    annotate: (input: { comment?: string; notifyOffice?: boolean }) => post<{ ok: true }>("/api/v1/punches/annotate", input),
    /** Position during an open shift (office map). 409 when not clocked in. */
    location: (location: GeoPoint) => post<{ accepted: boolean }>("/api/v1/punches/location", location),
    today: () => get<{ dayKey: string; punches: PunchDto[] }>("/api/v1/punches/today"),
  },
  week: (weekKey?: string) => get<WeekDto>(`/api/v1/week${weekKey ? `?week=${weekKey}` : ""}`),
  hours: (period: Period, at?: string) => get<PeriodSummaryDto>(`/api/v1/hours?period=${period}${at ? `&at=${at}` : ""}`),
  payments: {
    list: () => get<PayHistoryDto>("/api/v1/payments"),
    confirm: (id: string) => post<{ ok: true }>(`/api/v1/payments/${encodeURIComponent(id)}/confirm`),
    dispute: (id: string, note: string) => post<{ ok: true }>(`/api/v1/payments/${encodeURIComponent(id)}/dispute`, { note }),
  },
  sites: () => get<{ sites: SiteDto[] }>("/api/v1/sites"),
  site: {
    get: (id: string) => get<SiteDetailDto>(`/api/v1/sites/${encodeURIComponent(id)}`),
    feed: (id: string, before?: string) => get<FeedPageDto>(`/api/v1/sites/${encodeURIComponent(id)}/feed${before ? `?before=${encodeURIComponent(before)}` : ""}`),
    /** Text and up to four photos picked on the phone, in one multipart request. */
    post: async (id: string, text: string, photos: { uri: string; mimeType?: string }[]) => {
      const form = new FormData();
      if (text.trim()) form.append("text", text.trim());
      for (const [i, p] of photos.entries()) {
        const type = p.mimeType ?? "image/jpeg";
        const raw = await (await fetch(p.uri)).blob();
        form.append("files", new Blob([raw], { type }), `photo-${i}.${type.split("/")[1] ?? "jpg"}`);
      }
      return request<{ id: string }>(`/api/v1/sites/${encodeURIComponent(id)}/posts`, { method: "POST", body: form });
    },
    costs: (id: string) => get<SiteCostsDto>(`/api/v1/sites/${encodeURIComponent(id)}/costs`),
    addExpense: (id: string, input: SiteExpenseInput) => post<SiteExpenseDto>(`/api/v1/sites/${encodeURIComponent(id)}/expenses`, input),
    deleteExpense: (id: string, expenseId: string) => request<{ ok: true }>(`/api/v1/sites/${encodeURIComponent(id)}/expenses/${encodeURIComponent(expenseId)}`, { method: "DELETE" }),
    deletePost: (id: string, postId: string) => request<{ ok: true }>(`/api/v1/sites/${encodeURIComponent(id)}/posts/${encodeURIComponent(postId)}`, { method: "DELETE" }),
  },
  tasks: {
    list: (status?: "open" | "done") => get<{ tasks: TaskDto[] }>(`/api/v1/tasks${status ? `?status=${status}` : ""}`),
    get: (id: string) => get<TaskDto>(`/api/v1/tasks/${encodeURIComponent(id)}`),
    complete: (id: string, note?: string) => post<TaskDto>(`/api/v1/tasks/${encodeURIComponent(id)}/complete`, { note }),
    reopen: (id: string) => post<TaskDto>(`/api/v1/tasks/${encodeURIComponent(id)}/reopen`),
    /** Multipart completion photo picked on the phone. */
    addPhoto: async (id: string, uri: string, mimeType = "image/jpeg") => {
      const raw = await (await fetch(uri)).blob();
      const form = new FormData();
      form.append("file", new Blob([raw], { type: mimeType }), `task.${mimeType.split("/")[1] ?? "jpg"}`);
      form.append("kind", "completion");
      return request<TaskDto>(`/api/v1/tasks/${encodeURIComponent(id)}/photos`, { method: "POST", body: form });
    },
    removePhoto: (id: string, pathname: string) => request<TaskDto>(`/api/v1/tasks/${encodeURIComponent(id)}/photos`, { method: "DELETE", json: { pathname } }),
  },
  billing: {
    overview: () => get<BillingOverviewDto>("/api/v1/billing"),
    portal: () => post<{ url: string }>("/api/v1/billing/portal"),
    checkout: () => post<{ url: string }>("/api/v1/billing/checkout"),
  },
  office: {
    today: () => get<TodayOverview>("/api/v1/office/today"),
    week: (weekKey?: string) => get<WeekSummaryDto>(`/api/v1/office/week${weekKey ? `?week=${weekKey}` : ""}`),
    team: () => get<{ members: MemberDto[] }>("/api/v1/office/team"),
    approve: (punchId: string) => post<{ ok: true }>(`/api/v1/office/punches/${punchId}/approve`),
  },
};

/** React Query keys, in one place so invalidation stays consistent. */
export const keys = {
  me: ["me"] as const,
  openPunch: ["punches", "open"] as const,
  week: (weekKey?: string) => ["week", weekKey ?? "current"] as const,
  payments: ["payments"] as const,
  sites: ["sites"] as const,
  memberships: ["memberships"] as const,
  officeToday: ["office", "today"] as const,
  officeWeek: (weekKey?: string) => ["office", "week", weekKey ?? "current"] as const,
  officeTeam: ["office", "team"] as const,
  billing: ["billing"] as const,
  tasks: ["tasks"] as const,
  site: (id: string) => ["site", id] as const,
  siteCosts: (id: string) => ["site", id, "costs"] as const,
  siteFeed: (id: string) => ["site", id, "feed"] as const,
  hours: (period: string, at?: string) => ["week", "hours", period, at ?? "current"] as const,
  task: (id: string) => ["tasks", id] as const,
};
