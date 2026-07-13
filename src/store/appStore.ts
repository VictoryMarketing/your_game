import { createSession, getFeatureFlags, getHome } from "../api/profileApi";
import { getProducts } from "../api/shopApi";
import type { FeatureFlags, GameSession, HomePayload, Profile } from "../api/types";
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
  | "support"
  | "analytics"
  | "final"
  | "error";

export type AppState = {
  screen: Screen;
  loading: boolean;
  loadingStage?: BootstrapStage;
  error?: string;
  profile?: Profile;
  home?: HomePayload;
  flags?: FeatureFlags;
  game?: GameSession | null;
  paywallReason?: string;
};

export type BootstrapStage =
  | "idle"
  | "detecting_environment"
  | "authenticating"
  | "loading_profile"
  | "loading_home"
  | "ready"
  | "error"
  | "timeout";

const directScreens = new Set<Screen>(["home", "game", "inventory", "profile", "archive", "shop", "leaderboard", "missions", "support", "newGame", "analytics"]);

function requestedScreen(): Screen | undefined {
  const raw = new URLSearchParams(window.location.search).get("screen") as Screen | null;
  return raw && directScreens.has(raw) ? raw : undefined;
}

export async function bootstrap(onStage?: (stage: BootstrapStage) => void): Promise<Partial<AppState>> {
  onStage?.("detecting_environment");
  const urlStartParam = new URLSearchParams(window.location.search).get("startapp") || undefined;
  const pendingWebStartParam = localStorage.getItem("yougame_pending_start_param") || undefined;
  const startParam = getTelegram()?.initDataUnsafe?.start_param || urlStartParam || pendingWebStartParam;
  const challengeRequested = Boolean(startParam?.startsWith("challenge_"));
  if (startParam?.startsWith("challenge_")) {
    localStorage.setItem("yougame_challenge_seed", startParam.slice("challenge_".length));
  }
  onStage?.("authenticating");
  await createSession(startParam);
  if (startParam?.startsWith("ref_")) localStorage.removeItem("yougame_pending_start_param");
  void getProducts()
    .then((payload) => sessionStorage.setItem("yougame_shop_products_v3", JSON.stringify(payload.products)))
    .catch(() => null);
  onStage?.("loading_home");
  const [home, flagsPayload] = await Promise.all([getHome(), getFeatureFlags().catch(() => ({ flags: {} as FeatureFlags }))]);
  if (challengeRequested && home.weekly_challenge) {
    localStorage.setItem("yougame_challenge_settings", JSON.stringify(home.weekly_challenge.settings));
  }
  onStage?.("loading_profile");
  const profile = home.profile;
  const nextScreen = profile.onboarding_done ? (challengeRequested ? "newGame" : requestedScreen() || "home") : "onboarding";
  onStage?.("ready");
  return { home, profile, flags: flagsPayload.flags, game: home.current_game || null, screen: nextScreen };
}
