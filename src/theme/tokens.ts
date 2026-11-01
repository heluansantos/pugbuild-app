/** Design tokens shared with the web app (globals.css @theme). Keep both in sync. */
export type ColorName =
  | "bg"
  | "surface"
  | "surface2"
  | "ink"
  | "ink2"
  | "ink3"
  | "muted"
  | "muted2"
  | "muted3"
  | "line"
  | "line2"
  | "nav"
  | "accent"
  | "accentDeep"
  | "ok"
  | "okBg"
  | "warn"
  | "warnBg"
  | "warnDot"
  | "danger"
  | "dangerBg"
  | "white"
  | "onInk"
  | "onAccent"
  | "inkLine"
  | "accentOnInk";

/** Every palette has exactly these keys; components read them through `useTheme()`. */
export type Palette = { readonly [K in ColorName]: string };

/**
 * `ink` is the "strong" surface colour (dark in light mode, cream in dark mode), so text drawn on
 * it must use `onInk`, never `white`. `onAccent` is for text on the yellow accent in both modes and
 * `inkLine` is a hairline and `accentOnInk` the yellow accent when drawn on an `ink` surface.
 */
export const lightColors = {
  bg: "#F4F3EF",
  surface: "#FFFFFF",
  surface2: "#F7F6F2",
  ink: "#141414",
  ink2: "#262626",
  ink3: "#3A3A3A",
  muted: "#6B6A65",
  muted2: "#9A9892",
  muted3: "#B8B6AF",
  line: "#E4E2DC",
  line2: "#EEECE6",
  nav: "#E8E6E0",
  accent: "#FFC83D",
  accentDeep: "#E6AE1C",
  ok: "#1E6B45",
  okBg: "#E3F2E9",
  warn: "#6E4800",
  warnBg: "#FFF1CC",
  warnDot: "#F2A900",
  danger: "#B42318",
  dangerBg: "#FDE8E6",
  white: "#FFFFFF",
  onInk: "#FFFFFF",
  onAccent: "#141414",
  inkLine: "#3A3A3A",
  accentOnInk: "#FFC83D",
} as const satisfies Record<ColorName, string>;

export const darkColors = {
  bg: "#141413",
  surface: "#1F1E1C",
  surface2: "#262522",
  ink: "#F4F3EF",
  ink2: "#E8E6E0",
  ink3: "#D4D2CC",
  muted: "#A3A19B",
  muted2: "#7B7973",
  muted3: "#55534E",
  line: "#2E2D2A",
  line2: "#262522",
  nav: "#262522",
  accent: "#FFC83D",
  accentDeep: "#E6AE1C",
  ok: "#6FCF97",
  okBg: "#17311F",
  warn: "#F2C14E",
  warnBg: "#3A2C06",
  warnDot: "#F2A900",
  danger: "#F28B82",
  dangerBg: "#3C1A17",
  white: "#FFFFFF",
  onInk: "#141413",
  onAccent: "#141414",
  inkLine: "#BDBBB4",
  accentOnInk: "#8A5A00",
} as const satisfies Record<ColorName, string>;

export const radii = {
  icon: 14,
  card: 18,
  cardMd: 22,
  cardLg: 26,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screen: 20,
} as const;

export const fonts = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
} as const;

/** Minimum touch target (Apple HIG) and the big worker buttons from the mockups. */
export const touch = { min: 44, primary: 54, hero: 60 } as const;

const lightShadow = {
  soft: {
    shadowColor: "#141414",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: "#141414",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

const darkShadow = {
  soft: { ...lightShadow.soft, shadowColor: "#000000", shadowOpacity: 0.3 },
  float: { ...lightShadow.float, shadowColor: "#000000", shadowOpacity: 0.5 },
} as const;

export type Shadows = typeof lightShadow | typeof darkShadow;

/** Same keys in both modes: dark surfaces need a heavier, true-black shadow to read at all. */
export const shadows = { light: lightShadow, dark: darkShadow } as const;
