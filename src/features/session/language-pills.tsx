import { SegmentedPills, type SegmentedOption } from "../../components/ui/segmented-pills";
import { LOCALES, LOCALE_NAMES } from "../../lib/i18n";
import type { Locale } from "../../lib/api-types";
import { useSession } from "./session";

/** EN / PT / ES switch; persists and re-renders the whole app. */
export function LanguagePills({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useSession();
  const options: SegmentedOption<Locale>[] = LOCALES.map((l) => ({
    value: l,
    label: compact ? l.toUpperCase() : LOCALE_NAMES[l],
    accessibilityLabel: LOCALE_NAMES[l],
  }));
  return <SegmentedPills options={options} value={locale} onChange={setLocale} compact={compact} />;
}
