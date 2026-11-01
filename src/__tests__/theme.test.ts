import AsyncStorage from "@react-native-async-storage/async-storage";
import { isThemePreference, loadThemePreference, THEME_KEY } from "../theme/theme";
import { darkColors, lightColors } from "../theme/tokens";

const mockStore = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  },
}));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(async () => true) }));

const HEX = /^#[0-9A-F]{6}$/i;

describe("palettes", () => {
  it("expose exactly the same keys", () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it("only hold 6-digit hex colours", () => {
    for (const v of [...Object.values(lightColors), ...Object.values(darkColors)]) expect(v).toMatch(HEX);
  });

  it("flip the ink pairing: text on ink is the opposite of ink", () => {
    expect(lightColors.onInk).toBe("#FFFFFF");
    expect(darkColors.onInk).toBe("#141413");
    expect(darkColors.ink).toBe("#F4F3EF");
  });

  it("keeps the yellow accent and its label colour in both modes", () => {
    expect(darkColors.accent).toBe(lightColors.accent);
    expect(darkColors.onAccent).toBe(lightColors.onAccent);
  });
});

describe("isThemePreference", () => {
  it("accepts the three choices only", () => {
    expect(["system", "light", "dark"].every(isThemePreference)).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe("loadThemePreference", () => {
  beforeEach(() => mockStore.clear());

  it("follows the system when nothing is saved", async () => {
    await expect(loadThemePreference()).resolves.toBe("system");
  });

  it("returns a saved choice", async () => {
    await AsyncStorage.setItem(THEME_KEY, "dark");
    await expect(loadThemePreference()).resolves.toBe("dark");
  });

  it("ignores a corrupted value", async () => {
    await AsyncStorage.setItem(THEME_KEY, "sepia");
    await expect(loadThemePreference()).resolves.toBe("system");
  });
});
