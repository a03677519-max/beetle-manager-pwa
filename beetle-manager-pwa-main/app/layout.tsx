import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Beetle Manager",
  description: "Beetle breeding management PWA",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FF9800",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}