import { Tabs } from "expo-router";
import { CalendarDays, Clock, CreditCard, HardHat, MapPin, User, Users } from "lucide-react-native";
import { PillTabBar, type TabSpec } from "../../components/ui/pill-tab-bar";
import { useSession } from "../../features/session/session";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

const WORKER_TABS = (): TabSpec[] => [
  { name: "index", label: t("nav.worker.clock"), Icon: Clock },
  { name: "week", label: t("nav.worker.week"), Icon: HardHat },
  { name: "payments", label: t("nav.worker.payments"), Icon: CreditCard },
  { name: "sites", label: t("nav.worker.sites"), Icon: MapPin },
  { name: "profile", label: t("nav.worker.profile"), Icon: User },
];

/** Office and admin see the company, not their own clock: today, the pay week, the team. */
const STAFF_TABS = (): TabSpec[] => [
  { name: "office", label: t("office.nav.today"), Icon: Clock },
  { name: "office-week", label: t("office.nav.week"), Icon: CalendarDays },
  { name: "team", label: t("office.nav.team"), Icon: Users },
  { name: "sites", label: t("nav.worker.sites"), Icon: MapPin },
  { name: "profile", label: t("nav.worker.profile"), Icon: User },
];

/** Always land on index: it sends office and admin to their home. */
export const unstable_settings = { anchor: "index" };

const ALL = ["index", "week", "payments", "sites", "profile", "office", "office-week", "team"];

export default function TabsLayout() {
  const { me } = useSession();
  // Signing out clears `me` while the tabs are still mounted: render nothing until the Gate moves on.
  if (!me) return null;
  const staff = me.member.role !== "worker";
  const tabs = staff ? STAFF_TABS() : WORKER_TABS();
  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={(props) => <PillTabBar {...props} tabs={tabs} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, lazy: true, animation: "shift" }}
    >
      {/* Declaration order is tab order: the role's tabs first, the rest hidden. */}
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
      {ALL.filter((name) => !tabs.some((x) => x.name === name)).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
