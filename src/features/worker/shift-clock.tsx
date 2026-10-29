import { memo, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { RingTimer } from "../../components/ui/ring-timer";
import { Txt } from "../../components/ui/text";
import type { LunchRule } from "../../lib/api-types";
import { formatClockSeconds } from "../../lib/format";
import { t } from "../../lib/i18n";
import { computeElapsed } from "../../lib/time";
import { colors } from "../../theme/tokens";

const FULL_SHIFT_MINUTES = 8 * 60;

/**
 * The running clock. It owns the once-a-second tick, so the rest of the working screen (comment
 * sheet, buttons, site card) does not re-render every second.
 */
export const ShiftClock = memo(function ShiftClock({ clockInAt, lunch }: { clockInAt: string; lunch: LunchRule }) {
  const start = new Date(clockInAt);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = computeElapsed(start, now, lunch);
  // Live display in seconds; the lunch deduction applies as soon as the rule kicks in.
  const liveSeconds = Math.floor((now.getTime() - start.getTime()) / 1000) - elapsed.lunchDeductedMinutes * 60;
  return (
    <RingTimer fraction={Math.min(1, elapsed.spanMinutes / FULL_SHIFT_MINUTES)}>
      <Txt size={13} tone="muted">
        {t("worker.home.timeToday")}
      </Txt>
      <Txt size={40} weight="semibold" tabular tracking={-1} accessibilityLabel={t("worker.home.timeToday")}>
        {formatClockSeconds(liveSeconds)}
      </Txt>
      {elapsed.lunchDeductedMinutes > 0 && (
        <View style={styles.lunch}>
          <Txt size={12} tone="muted">
            {t("worker.home.lunchDeducted", { minutes: elapsed.lunchDeductedMinutes })}
          </Txt>
        </View>
      )}
    </RingTimer>
  );
});

const styles = StyleSheet.create({
  lunch: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.bg },
});
