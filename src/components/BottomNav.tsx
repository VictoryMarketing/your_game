import { BookOpen, Home, ShoppingBag, Target, UserRound } from "lucide-react";
import type { Screen } from "../store/appStore";
import { haptic } from "../telegram/telegram";

type Props = {
  active: Screen;
  onNavigate: (screen: Screen) => void;
};

const items: Array<{ screen: Screen; label: string; Icon: typeof Home }> = [
  { screen: "home", label: "Дом", Icon: Home },
  { screen: "game", label: "История", Icon: BookOpen },
  { screen: "missions", label: "Миссии", Icon: Target },
  { screen: "shop", label: "Магазин", Icon: ShoppingBag },
  { screen: "profile", label: "Герой", Icon: UserRound },
];

export function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav className="bottom-nav">
      {items.map(({ screen, label, Icon }) => (
        <button
          key={screen}
          className={active === screen ? "nav-item active" : "nav-item"}
          onClick={() => {
            haptic("light");
            onNavigate(screen);
          }}
          type="button"
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
