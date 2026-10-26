import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import type { Locale } from "./api-types";
import enAuth from "../messages/en/auth.json";
import enCommon from "../messages/en/common.json";
import enErrors from "../messages/en/errors.json";
import enNav from "../messages/en/nav.json";
import enOffice from "../messages/en/office.json";
import enWorker from "../messages/en/worker.json";
import esAuth from "../messages/es/auth.json";
import esCommon from "../messages/es/common.json";
import esErrors from "../messages/es/errors.json";
import esNav from "../messages/es/nav.json";
import esOffice from "../messages/es/office.json";
import esWorker from "../messages/es/worker.json";
import ptAuth from "../messages/pt/auth.json";
import ptCommon from "../messages/pt/common.json";
import ptErrors from "../messages/pt/errors.json";
import ptNav from "../messages/pt/nav.json";
import ptOffice from "../messages/pt/office.json";
import ptWorker from "../messages/pt/worker.json";

export const LOCALES: Locale[] = ["en", "pt", "es"];
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", pt: "Português", es: "Español" };
export const LOCALE_KEY = "pb.locale";

/** Same namespaces and keys as the web app's messages/{locale}/*.json. */
export const i18n = new I18n({
  en: { auth: enAuth, common: enCommon, errors: enErrors, nav: enNav, office: enOffice, worker: enWorker },
  pt: { auth: ptAuth, common: ptCommon, errors: ptErrors, nav: ptNav, office: ptOffice, worker: ptWorker },
  es: { auth: esAuth, common: esCommon, errors: esErrors, nav: esNav, office: esOffice, worker: esWorker },
});
i18n.enableFallback = true;
i18n.defaultLocale = "en";
// next-intl uses {name}; i18n-js uses %{name} by default. Match the web files.
i18n.placeholder = /\{(\w+)\}/g;

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as string[]).includes(v);
}

export function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode ?? "en";
  return isLocale(code) ? code : "en";
}

export async function loadLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // storage unavailable: fall back to the device language
  }
  return deviceLocale();
}

export async function saveLocale(locale: Locale) {
  try {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // best effort
  }
}

/** Translate with the web's key syntax: t("worker.home.greeting", { name }). */
export function t(key: string, values?: Record<string, string | number>): string {
  return i18n.t(key, values);
}
