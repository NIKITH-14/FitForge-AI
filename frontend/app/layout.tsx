import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "react-hot-toast";
import OfflineBanner from "@/components/OfflineBanner";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Astraa — Smart Gym OS",
  description: "AI-powered fitness OS integrated with custom smart gym machines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${exo2.variable}`}>
      <body style={{ fontFamily: 'var(--font-exo2), sans-serif' }}>
        <AuthProvider>
          <OfflineBanner />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#10101f', color: '#F0F4FF', border: '1px solid rgba(0,200,255,0.2)' },
              success: { iconTheme: { primary: '#00E5A0', secondary: '#fff' } },
              error: { iconTheme: { primary: '#FF3366', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
