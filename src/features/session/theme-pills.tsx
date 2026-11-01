import { Monitor, Moon, Sun } from "lucide-react-native";
import { SegmentedPills, type SegmentedOption } from "../../components/ui/segmented-pills";
import { t } from "../../lib/i18n";
import { useTheme, type ThemePreference } from "../../theme/theme";

/** System / Light / Dark switch; persists the choice and repaints the app without remounting navigation. */
export function ThemePills() {
  const { preference, setPreference } = useTheme();
  const options: SegmentedOption<ThemePreference>[] = [
    { value: "system", label: t("common.theme.system"), Icon: Monitor },
    { value: "light", label: t("common.theme.light"), Icon: Sun },
    { value: "dark", label: t("common.theme.dark"), Icon: Moon },
  ];
  return <SegmentedPills options={options} value={preference} onChange={setPreference} stretch accessibilityLabel={t("common.theme.label")} />;
}
