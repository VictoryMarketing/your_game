import { createSession, getHome } from "../api/profileApi";
import type { GameSession, HomePayload, Profile } from "../api/types";
import { getTelegram } from "../telegram/telegram";

export type Screen =
  | "splash"
  | "home"
  | "onboarding"
  | "newGame"
  | "game"
  | "inventory"
  | "profile"
  | "archive"
  | "shop"
  | "paywall"
  | "leaderboard"
  | "missions"
  | "final"
  | "error";

export type AppState = {
  screen: Screen;
  loading: boolean;
  error?: string;
  profile?: Profile;
  home?: HomePayload;
  game?: GameSession | null;
  paywallReason?: string;
};

const directScreens = new Set<Screen>(["home", "game", "inventory", "profile", "archive", "shop", "leaderboard", "missions"]);

function requestedScreen(): Screen | undefined {
  const raw = new URLSearchParams(window.location.search).get("screen") as Screen | null;
  return raw && directScreens.has(raw) ? raw : undefined;
}

export async function bootstrap(): Promise<Partial<AppState>> {
  const urlStartParam = new URLSearchParams(window.location.search).get("startapp") || undefined;
  const startParam = getTelegram()?.initDataUnsafe?.start_param || urlStartParam;
  await createSession(startParam);
  const home = await getHome();
  const profile = home.profile;
  const nextScreen = profile.onboarding_done ? requestedScreen() || "home" : "onboarding";
  return { home, profile, game: home.current_game || null, screen: nextScreen };
}
