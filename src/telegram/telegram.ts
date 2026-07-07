export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: { id: number; first_name?: string; username?: string };
    start_param?: string;
  };
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close?: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred?: (type: "light" | "medium" | "heavy") => void;
    notificationOccurred?: (type: "success" | "warning" | "error") => void;
  };
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegram() {
  return window.Telegram?.WebApp;
}

export function isTelegram() {
  return Boolean(getTelegram()?.initData);
}

export function initTelegramApp() {
  const tg = getTelegram();
  applyTelegramTheme();
  if (!tg) return;
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast?.("6.1")) {
    tg.enableClosingConfirmation?.();
  }
}

export function applyTelegramTheme() {
  document.documentElement.dataset.theme = "dark";
}

export function haptic(type: "light" | "medium" | "heavy" = "medium") {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(type);
}

export function notify(type: "success" | "warning" | "error") {
  window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.(type);
}
