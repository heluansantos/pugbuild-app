/** Plain JSON shapes returned by the web API (docs/MOBILE_API.md in pugbuild-web). Dates are ISO strings. */

export type Locale = "en" | "pt" | "es";
export type Role = "admin" | "office" | "worker";
export type PunchStatus = "open" | "closed";
export type PaymentStatus = "pending" | "ready" | "confirmed" | "disputed";
export type PaymentMethod = "cash" | "check" | "deposit";
export type PhotoPolicy = "off" | "optional" | "required";

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  /** The OS reported a simulated position (Android mock providers; iOS exposes no such flag). */
  mocked?: boolean;
}

export interface LunchRule {
  minutes: number;
  paid: boolean;
  minShiftMinutes: number;
}

export interface OvertimeRule {
  enabled: boolean;
  weeklyThresholdMinutes: number;
  multiplier: number;
}

export interface CompanySettings {
  timezone: string;
  workDays: number[];
  lunch: LunchRule;
  closingDay: number;
  payDayOffset: number;
  overtime: OvertimeRule;
  siteRadiusMeters: number;
  workersCanEditOwnHours: boolean;
  forgottenClockOutReminderHours: number | null;
  photoPolicy: PhotoPolicy;
  defaultLocale: Locale;
}

export interface CompanyDto {
  id: string;
  name: string;
  sector: string;
  address?: string;
  logoUrl?: string;
  status: string;
  settings: CompanySettings;
}

export interface PersonDto {
  id: string;
  phone: string;
  name: string;
  email?: string;
  locale: Locale;
  isSuperAdmin: boolean;
  photoUrl?: string;
  consentAcceptedAt?: string;
  consentVersion?: string;
}

export interface MemberDto {
  id: string;
  personId: string;
  companyId: string;
  name: string;
  phone: string;
  locale: Locale;
  role: Role;
  hourlyRateCents: number;
  jobTitle?: string;
  status: string;
  canEditOwnHours: boolean;
}

export interface MeDto {
  person: PersonDto;
  member: MemberDto;
  company: CompanyDto;
  impersonating?: boolean;
  legalVersion?: string;
}

export interface SitePhotoDto {
  url: string;
  pathname: string;
  addedAt: string;
}

export interface SiteDto {
  id: string;
  companyId: string;
  name: string;
  address: string;
  description?: string;
  photos: SitePhotoDto[];
  location: GeoPoint;
  radiusMeters?: number;
  status: string;
}

export interface PunchEventDto {
  at: string;
  deviceAt?: string;
  location?: GeoPoint;
  siteId?: string;
  distanceMeters?: number;
  photoUrl?: string;
  comment?: string;
  notifyOffice?: boolean;
  clientId?: string;
}

export interface PunchDto {
  id: string;
  companyId: string;
  membershipId: string;
  personId: string;
  dayKey: string;
  weekKey: string;
  clockIn: PunchEventDto;
  clockOut?: PunchEventDto;
  status: PunchStatus;
  workedMinutes?: number;
  lunchDeductedMinutes?: number;
  flags: string[];
  /** Latest position the phone reported during this open shift (office map). */
  live?: { at: string; location: GeoPoint; siteId?: string; distanceMeters?: number };
}

/** A past pay week with hours the office has not closed yet (no payment exists). */
export interface OpenWeekDto {
  weekKey: string;
  endKey: string;
  minutes: number;
  grossCents: number;
}

export interface PayHistoryDto {
  payments: PaymentDto[];
  openWeeks: OpenWeekDto[];
}

export interface PaymentDto {
  id: string;
  closedWeekId: string;
  weekKey: string;
  endKey: string;
  membershipId: string;
  amountCents: number;
  minutes: number;
  method?: PaymentMethod;
  pickupNote?: string;
  status: PaymentStatus;
  readyAt?: string;
  confirmedAt?: string;
  disputedAt?: string;
  disputeNote?: string;
}

export interface MembershipSummary {
  membershipId: string;
  role: Role;
  companyId: string;
  companyName: string;
  logoUrl?: string;
}

export interface WeekDto {
  week: { startKey: string; endKey: string; dayKeys: string[] };
  todayKey: string;
  minutesByDay: Record<string, number>;
  totalMinutes: number;
  grossCents: number;
  hourlyRateCents: number;
  overtime: OvertimeRule;
  lunch: LunchRule;
  punches: PunchDto[];
}

export interface VerifyResult {
  ok: true;
  consentRequired: boolean;
  role?: Role;
  companyId?: string;
}

export interface PunchInput {
  location?: GeoPoint;
  deviceAt?: string;
  comment?: string;
  notifyOffice?: boolean;
  clientId?: string;
}

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "locked"
  | "billing_required"
  | "unknown";

/* ---- Office / admin ---- */

export interface TeamRow {
  membershipId: string;
  personId: string;
  name: string;
  role: Role;
  hourlyRateCents: number;
  status: "working" | "done" | "off";
  clockInAt?: string;
  clockOutAt?: string;
  siteId?: string;
  siteName?: string;
  farFromSite: boolean;
  missingClockOut: boolean;
  minutes: number;
  costCents: number;
  punches: PunchDto[];
}

export interface SiteToday extends SiteDto {
  peopleNow: number;
  peopleToday: number;
  costCents: number;
}

export interface SiteSuggestionDto {
  id: string;
  address?: string;
  location: GeoPoint;
  punchCount: number;
  status: string;
}

export type ReviewItem =
  | { kind: "far_from_site"; punch: PunchDto; name: string; distanceMeters?: number }
  | { kind: "missing_clock_out"; punch: PunchDto; name: string }
  | { kind: "suggested_site"; suggestion: SiteSuggestionDto };

export interface TodayOverview {
  dayKey: string;
  weekKey: string;
  weekEndKey: string;
  payDateKey: string;
  workingNow: number;
  activeMembers: number;
  costTodayCents: number;
  weekMinutes: number;
  review: ReviewItem[];
  sites: SiteToday[];
  team: TeamRow[];
  punches: PunchDto[];
}

export interface WeekLine {
  membershipId: string;
  personId: string;
  name: string;
  role: Role;
  hourlyRateCents: number;
  minutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  grossCents: number;
  punchCount: number;
  openPunches: number;
  flagged: number;
  byDay: Record<string, number>;
}

export interface WeekSummaryDto {
  week: { startKey: string; endKey: string; dayKeys: string[] };
  closed: { id: string; weekKey: string; endKey: string; closedAt: string; totalMinutes: number; totalGrossCents: number } | null;
  lines: WeekLine[];
  totalMinutes: number;
  totalGrossCents: number;
  openPunches: number;
  unresolvedFlags: number;
  canClose: boolean;
  blockers: string[];
}

/* ---- Billing (admin / office) ---- */

export type BillingStatus = "trialing" | "active" | "past_due" | "read_only" | "suspended" | "canceled" | "comped";

export interface BillingAccessDto {
  mode: "full" | "read_only" | "suspended";
  status: BillingStatus;
  trialEndsAt?: string;
  daysLeft: number | null;
  needsPayment: boolean;
}

export interface CompanyBillingDto {
  status: BillingStatus;
  plan: "monthly" | "annual" | "comped";
  trialEndsAt: string;
  hasCustomer: boolean;
  hasSubscription: boolean;
  hasPaymentMethod: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  activeEmployeesThisPeriod: number;
}

export interface InvoiceSummaryDto {
  id: string;
  number: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  totalCents: number;
  currency: string;
  created: string;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
}

export interface BillingOverviewDto {
  enabled: boolean;
  canManage: boolean;
  access: BillingAccessDto;
  billing?: CompanyBillingDto;
  estimate?: { activeEmployees: number; quote: { totalCents: number }; periodEnd: string };
  invoices: InvoiceSummaryDto[];
  invoicesUnavailable: boolean;
}

/* ---- Tasks ---- */

export type TaskStatus = "open" | "done";

export interface TaskPhotoDto {
  url: string;
  pathname: string;
  addedAt: string;
}

export interface TaskDto {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  siteId?: string;
  siteName?: string;
  assigneeMembershipId?: string;
  assigneeName?: string;
  dueKey?: string;
  status: TaskStatus;
  photos: TaskPhotoDto[];
  completion?: { at: string; byName?: string; note?: string; photos: TaskPhotoDto[] };
  createdAt: string;
  updatedAt: string;
}

/* ---- Hours over a period (month / year / all) ---- */

export type Period = "month" | "year" | "all";

export interface PeriodSummaryDto {
  period: Period;
  at: string;
  startKey: string;
  endKey: string;
  prevAt: string | null;
  nextAt: string | null;
  buckets: { key: string; kind: "block" | "month" | "year"; minutes: number }[];
  totalMinutes: number;
  grossCents: number;
  paidCents: number;
  daysWorked: number;
}

/* ---- Site detail and timeline ---- */

export interface SiteDetailDto extends SiteDto {
  openTasks: number;
  doneTasks: number;
  posts: number;
  latestPhotoUrl?: string;
}

export interface FeedAuthorDto {
  name: string;
  photoUrl?: string;
  role?: string;
}

export type FeedItemDto =
  | { kind: "post"; id: string; at: string; author: FeedAuthorDto; text?: string; photos: TaskPhotoDto[]; canDelete: boolean }
  | { kind: "task_created"; id: string; at: string; author: FeedAuthorDto; taskId: string; title: string; assigneeName?: string }
  | { kind: "task_done"; id: string; at: string; author: FeedAuthorDto; taskId: string; title: string; note?: string; photos: TaskPhotoDto[] };

export interface FeedPageDto {
  items: FeedItemDto[];
  nextBefore: string | null;
}
