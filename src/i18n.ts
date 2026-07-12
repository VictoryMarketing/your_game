import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru/common.json";
import en from "./locales/en/common.json";

export const supportedLocales = ["ru", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export function normalizeLocale(value?: string | null): SupportedLocale {
  const short = (value || "").slice(0, 2).toLowerCase();
  return short === "en" ? "en" : "ru";
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { common: ru },
    en: { common: en },
  },
  lng: normalizeLocale(document.documentElement.lang || navigator.language),
  fallbackLng: "ru",
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
