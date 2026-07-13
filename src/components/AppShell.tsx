import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import type { Screen } from "../store/appStore";
import { PersistentAudioDock } from "./StoryAudioPlayer";

type Props = {
  children: ReactNode;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function AppShell({ children, screen, onNavigate }: Props) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      {screen !== "game" && <PersistentAudioDock />}
      <BottomNav active={screen} onNavigate={onNavigate} />
    </div>
  );
}
