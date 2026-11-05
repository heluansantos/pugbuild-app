import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";

export type ShiftActivityProps = {
  /** Epoch ms the running clock counts up from (clock-in minus time already worked today). */
  startedAtMs: number;
  siteName: string | null;
  /** Pre-translated, e.g. "Started 8:02 AM". */
  startedLabel: string;
  brand: string;
  hint: string;
  /** Set on the final frame: the clock is frozen and this ("Ended · 7h 32m") takes its place. */
  endedLabel?: string;
};

/**
 * Lock Screen banner + Dynamic Island for the running shift.
 *
 * The timer is a native SwiftUI `Text(date, style: .timer)`: the system ticks it every
 * second on its own, so the app never has to wake up to update the clock.
 *
 * Declared with `function` (not an arrow) because the Babel transform behind the `'widget'`
 * directive only recognises function declarations, expressions and object methods.
 *
 * Runs in the isolated widget runtime: no hooks, no imports at call time and no references
 * to anything declared outside this function, so every colour lives inside it and every
 * string arrives pre-translated through props.
 */
function ShiftActivity(props: ShiftActivityProps, environment: LiveActivityEnvironment) {
  "widget";
  const dark = environment.colorScheme !== "light";
  const dim = !!environment.isLuminanceReduced;
  const bg = dark ? "#141414" : "#F4F3EF";
  const text = dark ? "#F4F3EF" : "#141414";
  const muted = dark ? "#A8A7A1" : "#6B6A64";
  // Always-on display: no glow, the accent falls back to the text colour.
  const accent = dim ? text : dark ? "#FFC83D" : "#B07A00";
  const started = new Date(props.startedAtMs);
  const site = props.siteName ?? "";

  const ended = props.endedLabel ?? null;
  const timerModifiers = (size: number, width?: number) => [
    font({ size, weight: "bold", design: "rounded" }),
    monospacedDigit(),
    foregroundStyle(dim ? text : accent),
    lineLimit(1),
    ...(width ? [frame({ width, alignment: "trailing" })] : []),
  ];
  // Once ended the native timer would keep ticking on a banner the system still shows, so the
  // final frame prints a fixed duration instead.
  const timer = (size: number, width?: number) =>
    ended ? (
      <Text modifiers={timerModifiers(width ? size - 2 : size, width)}>{ended}</Text>
    ) : (
      <Text date={started} dateStyle="timer" modifiers={timerModifiers(size, width)} />
    );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[padding({ all: 16 }), activityBackgroundTint(bg), frame({ maxWidth: 10000, alignment: "leading" })]}>
        <HStack spacing={6}>
          <Image systemName="clock.fill" size={14} color={accent} />
          <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle(accent)]}>{props.brand}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(muted), lineLimit(1)]}>{site}</Text>
        </HStack>
        {timer(44)}
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{props.startedLabel}</Text>
      </VStack>
    ),
    compactLeading: <Image systemName="clock.fill" size={14} color={accent} />,
    compactTrailing: timer(14, 58),
    minimal: <Image systemName="clock.fill" size={14} color={accent} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 8 })]}>
        <Image systemName="clock.fill" size={18} color={accent} />
        <Text modifiers={[font({ size: 12, weight: "medium" }), foregroundStyle(muted), lineLimit(1)]}>{site}</Text>
      </VStack>
    ),
    expandedTrailing: <VStack modifiers={[padding({ trailing: 8 })]}>{timer(26, 120)}</VStack>,
    expandedCenter: (
      <Text modifiers={[font({ size: 13, weight: "semibold" }), foregroundStyle("#F4F3EF")]}>{props.brand}</Text>
    ),
    expandedBottom: (
      <VStack spacing={2} modifiers={[padding({ top: 4 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle("#A8A7A1")]}>{props.startedLabel}</Text>
        <Text modifiers={[font({ size: 12, weight: "medium" }), foregroundStyle("#F4F3EF")]}>{props.hint}</Text>
      </VStack>
    ),
  };
}

export default createLiveActivity<ShiftActivityProps>("ShiftActivity", ShiftActivity);
