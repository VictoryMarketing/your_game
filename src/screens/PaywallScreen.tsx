import { PaywallCard } from "../components/PaywallCard";

export function PaywallScreen({ reason, onBack, onShop }: { reason?: string; onBack: () => void; onShop: () => void }) {
  return <PaywallCard reason={reason} onPremium={onShop} onBack={onBack} />;
}
