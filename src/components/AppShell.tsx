import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import type { Screen } from "../store/appStore";

type Props = {
  children: ReactNode;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
};

export function AppShell({ children, screen, onNavigate }: Props) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <BottomNav active={screen} onNavigate={onNavigate} />
    </div>
  );
}
