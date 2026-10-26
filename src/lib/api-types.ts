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
