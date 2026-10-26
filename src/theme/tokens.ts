/** Design tokens shared with the web app (globals.css @theme). Keep both in sync. */
export const colors = {
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
} as const;

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

export const shadow = {
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
