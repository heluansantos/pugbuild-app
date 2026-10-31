import { memo, useEffect, useState } from "react";
import { RingTimer } from "../../components/ui/ring-timer";
import { Txt } from "../../components/ui/text";
import { formatClockSeconds, formatMinutes } from "../../lib/format";
import { t } from "../../lib/i18n";
import { minutesBetween } from "../../lib/time";

const FULL_SHIFT_MINUTES = 8 * 60;

/**
 * The running clock. It owns the once-a-second tick, so the rest of the working screen (comment
 * sheet, buttons, site card) does not re-render every second.
 */
export const ShiftClock = memo(function ShiftClock({
  clockInAt,
  earlierMinutes = 0,
}: {
  clockInAt: string;
  /** Minutes already worked today in shifts closed before this one: the clock continues from them. */
  earlierMinutes?: number;
}) {
  const start = new Date(clockInAt);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  // Gross seconds: lunch only matters for pay, never for the clock.
  // The phone's clock can trail the server's by a few seconds right after Start: never show less
  // than what was already worked today.
  const shiftSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const liveSeconds = earlierMinutes * 60 + shiftSeconds;
  return (
    <RingTimer fraction={Math.min(1, (earlierMinutes + minutesBetween(start, now)) / FULL_SHIFT_MINUTES)}>
      <Txt size={13} tone="muted">
        {t("worker.home.timeToday")}
      </Txt>
      <Txt size={40} weight="semibold" tabular tracking={-1} accessibilityLabel={t("worker.home.timeToday")}>
        {formatClockSeconds(liveSeconds)}
      </Txt>
      {earlierMinutes > 0 && (
        <Txt size={12} tone="muted">
          {t("worker.home.earlierToday", { time: formatMinutes(earlierMinutes) })}
        </Txt>
      )}
    </RingTimer>
  );
});
