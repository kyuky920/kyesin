import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "WALK WITH HIM | 2026 계신 청년 하계수련회",
  description: "2026 계신 청년 하계수련회 공식 서비스",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WALK WITH HIM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-navy text-white antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
