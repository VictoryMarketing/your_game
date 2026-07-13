import { useEffect, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import type { Screen } from "../store/appStore";
import { PersistentAudioDock } from "./StoryAudioPlayer";

type Props = {
  children: ReactNode;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function AppShell({ children, screen, onNavigate }: Props) {
  useEffect(() => {
    document.body.dataset.appScreen = screen;
    return () => {
      if (document.body.dataset.appScreen === screen) delete document.body.dataset.appScreen;
    };
  }, [screen]);

  return (
    <div className="app-shell" data-screen={screen}>
      <main className="app-main">{children}</main>
      {screen !== "game" && <PersistentAudioDock />}
      <BottomNav active={screen} onNavigate={onNavigate} />
    </div>
  );
}
