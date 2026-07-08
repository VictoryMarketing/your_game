import { BookOpen, Home, PackageOpen, ShoppingBag, Target, Trophy, UserRound } from "lucide-react";
import type { Screen } from "../store/appStore";

type Props = {
  active: Screen;
  onNavigate: (screen: Screen) => void;
};

const items: Array<{ screen: Screen; label: string; Icon: typeof Home }> = [
  { screen: "home", label: "Дом", Icon: Home },
  { screen: "game", label: "Игра", Icon: BookOpen },
  { screen: "missions", label: "Миссии", Icon: Target },
  { screen: "leaderboard", label: "Топ", Icon: Trophy },
  { screen: "shop", label: "Магазин", Icon: ShoppingBag },
  { screen: "inventory", label: "Инв.", Icon: PackageOpen },
  { screen: "profile", label: "Герой", Icon: UserRound },
];

export function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav className="bottom-nav">
      {items.map(({ screen, label, Icon }) => (
        <button key={screen} className={active === screen ? "nav-item active" : "nav-item"} onClick={() => onNavigate(screen)} type="button">
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
