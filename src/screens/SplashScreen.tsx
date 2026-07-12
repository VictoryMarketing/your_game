import { useTranslation } from "react-i18next";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import type { BootstrapStage } from "../store/appStore";

export function SplashScreen({ stage = "loading_profile" }: { stage?: BootstrapStage }) {
  const { t } = useTranslation();
  return (
    <section className="splash-screen">
      <div className="brand-mark">
        <img src={`${import.meta.env.BASE_URL}images/icon_YG.png`} alt={t("app.name")} />
      </div>
      <h1>{t("app.name")}</h1>
      <p>{t("app.tagline")}</p>
      <LoadingSkeleton label={t(`loading.${stage}`)} />
    </section>
  );
}
