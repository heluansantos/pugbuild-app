import type { Locale, MemberDto } from "./api-types";
import { formatMoney } from "./format";
import { t } from "./i18n";

/** "$25.00/h", "$1,200/wk" or "$4,800/mo"; null when there is nothing to show. */
export function formatPay(member: Pick<MemberDto, "payType" | "salaryCents" | "salaryPeriod" | "hourlyRateCents">, locale: Locale | string): string | null {
  if (member.payType === "salary") {
    if (!member.salaryCents) return null;
    const unit = member.salaryPeriod === "month" ? t("office.team.perMonth") : t("office.team.perWeek");
    return `${formatMoney(member.salaryCents, locale)}${unit}`;
  }
  return member.hourlyRateCents > 0 ? `${formatMoney(member.hourlyRateCents, locale)}${t("office.team.perHour")}` : null;
}
