import { lazy, Suspense, useEffect, useRef, useState } from "react";
import i18n from "./i18n";
import { AppShell } from "./components/AppShell";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { bootstrap, type AppState, type BootstrapStage, type Screen } from "./store/appStore";
import { useTelegram } from "./telegram/useTelegram";
import { getTelegram, isTelegram, notify } from "./telegram/telegram";
import { prepareShare } from "./api/shopApi";
import { getHome, getWebAuthStatus, logoutWebAccount } from "./api/profileApi";
import type { GameSession, Profile } from "./api/types";
import { type StartPolicy } from "./api/gameApi";
import { SplashScreen } from "./screens/SplashScreen";
import { WebLandingScreen } from "./screens/WebLandingScreen";
import { AppCrashScreen } from "./screens/AppCrashScreen";
import { trackClientEvent } from "./api/eventsApi";
import { runtimeConfigError } from "./config/runtime";
import { normalizeLocale } from "./i18n";
import { copyText } from "./utils/clipboard";

const HomeScreen = lazy(() => import("./screens/HomeScreen").then((module) => ({ default: module.HomeScreen })));
const OnboardingScreen = lazy(() => import("./screens/OnboardingScreen").then((module) => ({ default: module.OnboardingScreen })));
const NewGameScreen = lazy(() => import("./screens/NewGameScreen").then((module) => ({ default: module.NewGameScreen })));
const GameScreen = lazy(() => import("./screens/GameScreen").then((module) => ({ default: module.GameScreen })));
const InventoryScreen = lazy(() => import("./screens/InventoryScreen").then((module) => ({ default: module.InventoryScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then((module) => ({ default: module.ProfileScreen })));
const ArchiveScreen = lazy(() => import("./screens/ArchiveScreen").then((module) => ({ default: module.ArchiveScreen })));
const ShopScreen = lazy(() => import("./screens/ShopScreen").then((module) => ({ default: module.ShopScreen })));
const PaywallScreen = lazy(() => import("./screens/PaywallScreen").then((module) => ({ default: module.PaywallScreen })));
const LeaderboardScreen = lazy(() => import("./screens/LeaderboardScreen").then((module) => ({ default: module.LeaderboardScreen })));
const MissionsScreen = lazy(() => import("./screens/MissionsScreen").then((module) => ({ default: module.MissionsScreen })));
const FinalScreen = lazy(() => import("./screens/FinalScreen").then((module) => ({ default: module.FinalScreen })));
const SupportScreen = lazy(() => import("./screens/SupportScreen").then((module) => ({ default: module.SupportScreen })));
const AnalyticsScreen = lazy(() => import("./screens/AnalyticsScreen").then((module) => ({ default: module.AnalyticsScreen })));

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
  const [webAuthorized, setWebAuthorized] = useState<boolean | null>(() => isTelegram() ? true : null);
  const [toast, setToast] = useState("");
  const [newGamePolicy, setNewGamePolicy] = useState<StartPolicy>("archive_old");
  const toastTimer = useRef<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 4200);
  }

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

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (state.profile?.interface_language) {
      const nextLocale = normalizeLocale(state.profile.interface_language);
      if (i18n.language !== nextLocale) void i18n.changeLanguage(nextLocale);
      document.documentElement.lang = nextLocale;
    }
  }, [state.profile?.interface_language]);

  useEffect(() => {
    if (isTelegram()) {
      void load();
      return;
    }
    getWebAuthStatus()
      .then((result) => {
        setWebAuthorized(result.authenticated);
        if (result.authenticated) void load();
        else setState({ screen: "splash", loading: false, loadingStage: "ready" });
      })
      .catch(() => {
        setWebAuthorized(false);
        setState({ screen: "splash", loading: false, loadingStage: "ready" });
      });
  }, []);

  function navigate(screen: Screen) {
    if (screen === "newGame") {
      localStorage.removeItem("yougame_challenge_seed");
      localStorage.removeItem("yougame_challenge_settings");
      sessionStorage.removeItem("yougame_challenge_intent");
      setNewGamePolicy("archive_old");
    }
    setState((current) => ({ ...current, screen }));
    void trackClientEvent("screen_view", { screen }).catch(() => null);
    if (screen === "missions") {
      void refreshHome("missions");
    }
  }

  function setProfile(profile: Profile) {
    setState((current) => ({ ...current, profile, screen: "profile" }));
    getHome().then((home) => setState((current) => ({ ...current, home, game: home.current_game || null }))).catch(() => null);
  }

  function setProfileAfterOnboarding(profile: Profile) {
    setState((current) => ({ ...current, profile, screen: "home" }));
    getHome().then((home) => setState((current) => ({ ...current, home, game: home.current_game || null }))).catch(() => null);
  }

  function openNewGame(policy: StartPolicy = "archive_old") {
    localStorage.removeItem("yougame_challenge_seed");
    localStorage.removeItem("yougame_challenge_settings");
    sessionStorage.removeItem("yougame_challenge_intent");
    setNewGamePolicy(policy);
    setState((current) => ({ ...current, screen: "newGame" }));
    void trackClientEvent("screen_view", { screen: "newGame", start_policy: policy }).catch(() => null);
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
      const referralLink = result.preview_link || result.deep_link;
      const copied = await copyText(referralLink);
      showToast(copied
        ? "Реферальная ссылка скопирована. Вставьте её в сообщение и отправьте друзьям."
        : "Открываем меню отправки. Выберите друга или чат.");
      const tg = getTelegram();
      if (!isTelegram() && navigator.share) {
        try {
          await navigator.share({ title: "Твои правила", text: result.share_text || "Начни свою интерактивную историю и получи бонусные главы.", url: referralLink });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (!copied) throw error;
        }
      } else if (!isTelegram()) notify("success");
      else if (tg?.openTelegramLink) {
        await new Promise((resolve) => window.setTimeout(resolve, 320));
        tg.openTelegramLink(result.share_url);
      }
      else if (tg?.openLink) tg.openLink(result.share_url);
      else window.open(result.share_url, "_blank");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showToast("Не удалось открыть отправку. Попробуйте ещё раз.");
      notify("error");
    }
  }

  async function refreshHome(screen?: Screen) {
    try {
      const home = await getHome();
      setState((current) => ({ ...current, home, profile: home.profile, game: home.current_game || null, screen: screen || current.screen }));
    } catch {
      notify("error");
    }
  }

  async function completeWebAuth() {
    setWebAuthorized(true);
    await load();
  }

  async function logoutWeb() {
    try {
      await logoutWebAccount();
    } finally {
      setWebAuthorized(false);
      setState({ screen: "splash", loading: false, loadingStage: "ready" });
    }
  }

  if (!isTelegram() && webAuthorized === null) {
    return <SplashScreen stage="detecting_environment" />;
  }

  if (!isTelegram() && webAuthorized === false) {
    return <WebLandingScreen onAuthenticated={completeWebAuth} />;
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
      <Suspense fallback={<LoadingSkeleton label="Открываем раздел..." />}>
        {state.screen === "home" && state.home && <HomeScreen home={state.home} onNavigate={navigate} onShare={share} onRefresh={() => refreshHome("home")} onStartNewGame={openNewGame} />}
        {state.screen === "onboarding" && <OnboardingScreen onDone={setProfileAfterOnboarding} />}
        {state.screen === "newGame" && <NewGameScreen profile={state.profile} activeGame={state.game?.status === "active" || state.game?.status === "final_pending" ? state.game : null} initialStartPolicy={newGamePolicy} onStarted={setGame} onShop={() => navigate("shop")} onContinueCurrent={() => navigate("game")} />}
        {state.screen === "game" && <GameScreen game={state.game} profile={state.profile} onGame={setGame} onInventory={() => navigate("inventory")} onPaywall={paywall} />}
        {state.screen === "inventory" && <InventoryScreen game={state.game} profile={state.profile} />}
        {state.screen === "profile" && <ProfileScreen profile={state.profile} onSaved={setProfile} onShop={() => navigate("shop")} onInventory={() => navigate("inventory")} onSupport={() => navigate("support")} onAnalytics={() => navigate("analytics")} onLogout={logoutWeb} />}
        {state.screen === "archive" && <ArchiveScreen onNavigate={navigate} onGame={setGame} />}
        {state.screen === "shop" && <ShopScreen profile={state.profile} onPaid={() => refreshHome("shop")} onAccount={() => navigate("profile")} onSupport={() => navigate("support")} />}
        {state.screen === "paywall" && <PaywallScreen reason={state.paywallReason} onBack={() => navigate(state.game ? "game" : "home")} onShop={() => navigate("shop")} />}
        {state.screen === "leaderboard" && <LeaderboardScreen />}
        {state.screen === "missions" && <MissionsScreen missions={state.home?.missions || []} referralLink={state.home?.referral?.link} onShare={share} onClaimed={() => refreshHome("missions")} />}
        {state.screen === "support" && <SupportScreen />}
        {state.screen === "analytics" && state.profile?.is_admin && <AnalyticsScreen />}
        {state.screen === "analytics" && !state.profile?.is_admin && <section className="panel error-panel"><h1>Раздел недоступен</h1><p>Эта панель открывается только владельцу игры.</p></section>}
        {state.screen === "final" && <FinalScreen game={state.game} profile={state.profile} onGame={setGame} onPaywall={paywall} onNewGame={() => openNewGame()} />}
        {state.screen === "splash" && <LoadingSkeleton />}
      </Suspense>
      {toast && <div className="app-toast" role="status"><strong>Ссылка готова</strong><span>{toast}</span></div>}
    </AppShell>
  );
}
