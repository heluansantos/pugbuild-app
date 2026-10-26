import { Tabs } from "expo-router";
import { Clock, CreditCard, HardHat, MapPin, User } from "lucide-react-native";
import { PillTabBar, type TabSpec } from "../../components/ui/pill-tab-bar";
import { t } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

export default function TabsLayout() {
  const tabs: TabSpec[] = [
    { name: "index", label: t("nav.worker.clock"), Icon: Clock },
    { name: "week", label: t("nav.worker.week"), Icon: HardHat },
    { name: "payments", label: t("nav.worker.payments"), Icon: CreditCard },
    { name: "sites", label: t("nav.worker.sites"), Icon: MapPin },
    { name: "profile", label: t("nav.worker.profile"), Icon: User },
  ];
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} tabs={tabs} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, lazy: true }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
