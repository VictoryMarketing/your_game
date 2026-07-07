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

export async function bootstrap(): Promise<Partial<AppState>> {
  const startParam = getTelegram()?.initDataUnsafe?.start_param;
  await createSession(startParam);
  const home = await getHome();
  const profile = home.profile;
  const nextScreen = profile.onboarding_done ? "home" : "onboarding";
  return { home, profile, game: home.current_game || null, screen: nextScreen };
}
