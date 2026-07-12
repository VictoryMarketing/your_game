import { useEffect, useState } from "react";
import i18n from "./i18n";
import { AppShell } from "./components/AppShell";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { bootstrap, type AppState, type BootstrapStage, type Screen } from "./store/appStore";
import { useTelegram } from "./telegram/useTelegram";
import { getTelegram, isTelegram, notify } from "./telegram/telegram";
import { prepareShare } from "./api/shopApi";
import { getHome } from "./api/profileApi";
import type { GameSession, Profile } from "./api/types";
import { SplashScreen } from "./screens/SplashScreen";
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
import { WebLandingScreen } from "./screens/WebLandingScreen";
import { AppCrashScreen } from "./screens/AppCrashScreen";
import { runtimeConfigError } from "./config/runtime";
import { normalizeLocale } from "./i18n";

const BOOTSTRAP_TIMEOUT_MS = 15000;

function timeoutPromise(): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error("timeout")), BOOTSTRAP_TIMEOUT_MS);
  });
}

function stageErrorMessage(error: unknown) {
  if (!navigator.onLine) return "Нет соединения с интернетом. Проверьте сеть и повторите.";
  if (error instanceof Error && error.message === "timeout") return "Сервер отвечает слишком долго. Повторите загрузку.";
  if (error instanceof Error) return error.message;
  return "Не удалось загрузить приложение.";
}

export default function App() {
  useTelegram();
  const [state, setState] = useState<AppState>({ screen: "splash", loading: true, loadingStage: "idle" });
  const [globalError, setGlobalError] = useState<{ message: string; id: string } | null>(null);

  async function load() {
    const configError = runtimeConfigError();
    if (configError) {
      setState((current) => ({ ...current, loading: false, screen: "error", loadingStage: "error", error: configError }));
      return;
    }
    let expired = false;
    setGlobalError(null);
    setState((current) => ({ ...current, loading: true, loadingStage: "detecting_environment", error: undefined }));
    try {
      const next = await Promise.race([
        bootstrap((stage: BootstrapStage) => {
          if (!expired) setState((current) => ({ ...current, loadingStage: stage }));
        }),
        timeoutPromise(),
      ]);
      expired = true;
      setState((current) => ({ ...current, ...next, loading: false, loadingStage: "ready" }));
    } catch (err) {
      expired = true;
      setState((current) => ({
        ...current,
        loading: false,
        screen: "error",
        loadingStage: err instanceof Error && err.message === "timeout" ? "timeout" : "error",
        error: stageErrorMessage(err),
      }));
    }
  }

  useEffect(() => {
    function onUnhandled(event: PromiseRejectionEvent) {
      setGlobalError({ message: event.reason instanceof Error ? event.reason.message : "Необработанная ошибка приложения.", id: Math.random().toString(36).slice(2, 8).toUpperCase() });
    }
    function onWindowError(event: ErrorEvent) {
      setGlobalError({ message: event.message || "Ошибка интерфейса.", id: Math.random().toString(36).slice(2, 8).toUpperCase() });
    }
    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onWindowError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onWindowError);
    };
  }, []);

  useEffect(() => {
    if (state.profile?.interface_language) {
      const nextLocale = normalizeLocale(state.profile.interface_language);
      if (i18n.language !== nextLocale) void i18n.changeLanguage(nextLocale);
      document.documentElement.lang = nextLocale;
    }
  }, [state.profile?.interface_language]);

  useEffect(() => {
    if (!isTelegram() && import.meta.env.PROD) {
      setState({ screen: "splash", loading: false, loadingStage: "ready" });
      return;
    }
    load();
  }, []);

  function navigate(screen: Screen) {
    setState((current) => ({ ...current, screen }));
    if (screen === "missions") {
      void refreshHome("missions");
    }
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

  if (!isTelegram() && import.meta.env.PROD) {
    return <WebLandingScreen />;
  }

  if (globalError) {
    return <AppCrashScreen title="Игра не смогла открыться" message={globalError.message} errorId={globalError.id} onRetry={load} />;
  }

  if (state.loading) {
    return <SplashScreen stage={state.loadingStage} />;
  }

  if (state.screen === "error") {
    return (
      <AppCrashScreen
        title="Не удалось загрузить игру"
        message={state.error}
        errorId={state.loadingStage === "timeout" ? "TIMEOUT" : undefined}
        onRetry={load}
      />
    );
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
      {state.screen === "shop" && <ShopScreen profile={state.profile} onPaid={() => refreshHome("shop")} />}
      {state.screen === "paywall" && <PaywallScreen reason={state.paywallReason} onBack={() => navigate(state.game ? "game" : "home")} onShop={() => navigate("shop")} />}
      {state.screen === "leaderboard" && <LeaderboardScreen />}
      {state.screen === "missions" && <MissionsScreen missions={state.home?.missions || []} referralLink={state.home?.referral?.link} onShare={share} onClaimed={() => refreshHome("missions")} />}
      {state.screen === "final" && <FinalScreen game={state.game} onShare={share} onNewGame={() => navigate("newGame")} />}
      {state.screen === "splash" && <LoadingSkeleton />}
    </AppShell>
  );
}
