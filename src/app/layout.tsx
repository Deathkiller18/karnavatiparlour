import type { Metadata, Viewport } from "next";
import { Baloo_Bhai_2, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const body = Noto_Sans_Gujarati({
  variable: "--font-body",
  subsets: ["gujarati", "latin"],
  weight: ["400", "500", "600", "700"],
});
const display = Baloo_Bhai_2({
  variable: "--font-display",
  subsets: ["gujarati", "latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "કર્ણાવતી પાર્લર",
  description: "કર્ણાવતી પાર્લર — માલ, વકરો અને નફાનો હિસાબ",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#7a1f2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="gu" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
