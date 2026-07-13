import { BookOpen, Home, ShoppingBag, Target, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Screen } from "../store/appStore";
import { haptic } from "../telegram/telegram";

type Props = {
  active: Screen;
  onNavigate: (screen: Screen) => void;
};

const items: Array<{ screen: Screen; labelKey: string; Icon: typeof Home }> = [
  { screen: "home", labelKey: "nav.home", Icon: Home },
  { screen: "game", labelKey: "nav.story", Icon: BookOpen },
  { screen: "missions", labelKey: "nav.missions", Icon: Target },
  { screen: "shop", labelKey: "nav.shop", Icon: ShoppingBag },
  { screen: "profile", labelKey: "nav.hero", Icon: UserRound },
];

export function BottomNav({ active, onNavigate }: Props) {
  const { t } = useTranslation();
  return (
    <nav className="bottom-nav">
      {items.map(({ screen, labelKey, Icon }) => (
        <button
          key={screen}
          className={active === screen || (active === "support" && screen === "profile") ? "nav-item active" : "nav-item"}
          onClick={() => {
            haptic("light");
            onNavigate(screen);
          }}
          type="button"
        >
          <Icon size={18} />
          <span>{t(labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
