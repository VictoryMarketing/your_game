import { useEffect, useState } from "react";
import { applyTelegramTheme, getTelegram, initTelegramApp } from "./telegram";

export function useTelegram() {
  const [tg] = useState(() => getTelegram());

  useEffect(() => {
    initTelegramApp();
    applyTelegramTheme();
  }, []);

  return tg;
}
