"use client";

import type { Locale } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethodId = "orange_money" | "mtn_momo";

type MethodDef = {
  id: PaymentMethodId;
  labelFr: string;
  labelEn: string;
  subtitleFr: string;
  subtitleEn: string;
  color: string;
  icon: React.ReactNode;
};

// ─── Icônes ───────────────────────────────────────────────────────────────────

function OrangeIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden width="40" height="40">
      <circle cx="24" cy="24" r="24" fill="#FF6600" />
      <rect x="11" y="18" width="26" height="12" rx="6" fill="#fff" />
      <rect x="17" y="22" width="6" height="4" rx="2" fill="#FF6600" />
    </svg>
  );
}

function MtnIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden width="40" height="40">
      <circle cx="24" cy="24" r="24" fill="#FFCC00" />
      <path d="M14 30 L20 18 L24 26 L28 18 L34 30" stroke="#00508F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// ─── Données des méthodes ─────────────────────────────────────────────────────

const METHODS: MethodDef[] = [
  {
    id: "orange_money",
    labelFr: "Orange Money",
    labelEn: "Orange Money",
    subtitleFr: "Paiement mobile sécurisé",
    subtitleEn: "Secure mobile payment",
    color: "#FF6600",
    icon: <OrangeIcon />,
  },
  {
    id: "mtn_momo",
    labelFr: "MTN MoMo",
    labelEn: "MTN MoMo",
    subtitleFr: "Paiement mobile sécurisé",
    subtitleEn: "Secure mobile payment",
    color: "#FFCC00",
    icon: <MtnIcon />,
  },
];

// ─── Composant ────────────────────────────────────────────────────────────────

type Props = {
  locale: Locale;
  selected: string | null;
  onSelect: (id: string) => void;
};

export function PaymentMethod({ locale, selected, onSelect }: Props) {
  return (
    <div className="method-grid" role="radiogroup" aria-label={locale === "fr" ? "Moyen de paiement" : "Payment method"}>
      {METHODS.map((m) => {
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className="method-card"
            data-selected={isSelected}
            onClick={() => onSelect(m.id)}
          >
            <div className="method-icon">{m.icon}</div>
            <div className="method-info">
              <span className="method-name">{locale === "fr" ? m.labelFr : m.labelEn}</span>
              <span className="method-sub">{locale === "fr" ? m.subtitleFr : m.subtitleEn}</span>
            </div>
            <div className="method-check" aria-hidden>
              {isSelected && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
      <p className="method-note">
        {locale === "fr"
          ? "Une demande de paiement sera envoyée sur votre téléphone : validez-la avec votre code secret Mobile Money. Le complexe ne voit jamais votre code."
          : "A payment request will be sent to your phone: approve it with your Mobile Money PIN. The property never sees your PIN."}
      </p>
    </div>
  );
}
