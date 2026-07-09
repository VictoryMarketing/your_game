import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { bootstrap, type AppState, type Screen } from "./store/appStore";
import { useTelegram } from "./telegram/useTelegram";
import { getTelegram, isTelegram, notify, telegramMiniAppLink } from "./telegram/telegram";
import { prepareShare } from "./api/shopApi";
import { getHome } from "./api/profileApi";
import type { GameSession, Profile } from "./api/types";
import { SplashScreen } from "./screens/SplashScreen";
import { ErrorScreen } from "./screens/ErrorScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { NewGameScreen } from "./screens/NewGameScreen";
import { GameScreen } from "./screens/GameScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ArchiveScreen } from "./screens/ArchiveScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { PaywallScreen } from "./screens/PaywallScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MissionsScreen } from "./screens/MissionsScreen";
import { FinalScreen } from "./screens/FinalScreen";

export default function App() {
  useTelegram();
  const [state, setState] = useState<AppState>({ screen: "splash", loading: true });

  async function load() {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const next = await bootstrap();
      setState((current) => ({ ...current, ...next, loading: false }));
    } catch (err) {
      setState((current) => ({
        ...current,
        loading: false,
        screen: "error",
        error: err instanceof Error ? err.message : "Не удалось загрузить приложение",
      }));
    }
  }

  useEffect(() => {
    if (!isTelegram() && import.meta.env.PROD) {
      const startParam = new URLSearchParams(window.location.search).get("startapp");
      if (startParam) {
        window.location.replace(telegramMiniAppLink(startParam));
        return;
      }
      setState({ screen: "error", loading: false, error: "Откройте приложение через Telegram." });
      return;
    }
    load();
  }, []);

  function navigate(screen: Screen) {
    setState((current) => ({ ...current, screen }));
  }

  function setProfile(profile: Profile) {
    setState((current) => ({ ...current, profile, screen: "profile" }));
    getHome().then((home) => setState((current) => ({ ...current, home, game: home.current_game || current.game }))).catch(() => null);
  }

  function setProfileAfterOnboarding(profile: Profile) {
    setState((current) => ({ ...current, profile, screen: "home" }));
    getHome().then((home) => setState((current) => ({ ...current, home, game: home.current_game || current.game }))).catch(() => null);
  }

  function setGame(game: GameSession) {
    const screen: Screen = game.status === "final_pending" || game.status === "finished" ? "final" : "game";
    setState((current) => ({ ...current, game, screen }));
  }

  function paywall(reason: string) {
    setState((current) => ({ ...current, paywallReason: reason, screen: "paywall" }));
  }

  async function share() {
    try {
      const result = await prepareShare();
      const tg = getTelegram();
      if (tg?.openTelegramLink) tg.openTelegramLink(result.share_url);
      else if (tg?.openLink) tg.openLink(result.share_url);
      else window.open(result.share_url, "_blank");
    } catch {
      notify("error");
    }
  }

  async function refreshHome(screen?: Screen) {
    try {
      const home = await getHome();
      setState((current) => ({ ...current, home, profile: home.profile, game: home.current_game || current.game || null, screen: screen || current.screen }));
    } catch {
      notify("error");
    }
  }

  if (state.loading) {
    return <SplashScreen />;
  }

  if (state.screen === "error") {
    return <ErrorScreen title="Откройте через Telegram" message={state.error} onRetry={!import.meta.env.PROD ? load : undefined} />;
  }

  return (
    <AppShell screen={state.screen} onNavigate={navigate}>
      {state.screen === "home" && state.home && <HomeScreen home={state.home} onNavigate={navigate} onShare={share} onRefresh={() => refreshHome("home")} />}
      {state.screen === "onboarding" && <OnboardingScreen onDone={setProfileAfterOnboarding} />}
      {state.screen === "newGame" && <NewGameScreen onStarted={setGame} />}
      {state.screen === "game" && <GameScreen game={state.game} profile={state.profile} onGame={setGame} onInventory={() => navigate("inventory")} onPaywall={paywall} />}
      {state.screen === "inventory" && <InventoryScreen game={state.game} profile={state.profile} />}
      {state.screen === "profile" && <ProfileScreen profile={state.profile} onSaved={setProfile} onShop={() => navigate("shop")} onInventory={() => navigate("inventory")} />}
      {state.screen === "archive" && <ArchiveScreen onNavigate={navigate} onGame={setGame} />}
      {state.screen === "shop" && <ShopScreen />}
      {state.screen === "paywall" && <PaywallScreen reason={state.paywallReason} onBack={() => navigate(state.game ? "game" : "home")} onShop={() => navigate("shop")} />}
      {state.screen === "leaderboard" && <LeaderboardScreen />}
      {state.screen === "missions" && <MissionsScreen missions={state.home?.missions || []} onShare={share} onClaimed={() => refreshHome("missions")} />}
      {state.screen === "final" && <FinalScreen game={state.game} onShare={share} onNewGame={() => navigate("newGame")} />}
      {state.screen === "splash" && <LoadingSkeleton />}
    </AppShell>
  );
}
