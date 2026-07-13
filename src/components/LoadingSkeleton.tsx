import { MagicLoader } from "./MagicLoader";

export function LoadingSkeleton({ label = "Загрузка..." }: { label?: string }) {
  return <MagicLoader label={label} />;
}
