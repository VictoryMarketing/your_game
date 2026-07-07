import { useEffect, useState } from "react";
import { getTelegram, initTelegramApp } from "./telegram";

export function useTelegram() {
  const [tg] = useState(() => getTelegram());

  useEffect(() => {
    initTelegramApp();
    const params = getTelegram()?.themeParams || {};
    const root = document.documentElement;
    if (params.bg_color) root.style.setProperty("--tg-bg", params.bg_color);
    if (params.text_color) root.style.setProperty("--tg-text", params.text_color);
    if (params.button_color) root.style.setProperty("--tg-button", params.button_color);
  }, []);

  return tg;
}
