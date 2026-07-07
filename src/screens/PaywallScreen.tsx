import { createInvoice } from "../api/shopApi";
import { PaywallCard } from "../components/PaywallCard";

export function PaywallScreen({ reason, onBack, onShop }: { reason?: string; onBack: () => void; onShop: () => void }) {
  async function premium() {
    try {
      await createInvoice("premium_month");
    } finally {
      onShop();
    }
  }

  return <PaywallCard reason={reason} onPremium={premium} onBack={onBack} />;
}
