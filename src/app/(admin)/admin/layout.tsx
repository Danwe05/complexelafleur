import type { Metadata } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Espace gestion — Complexe La Fleur - Obala",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="admin">{children}</body>
    </html>
  );
}
