import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "숨은 맛집 커뮤니티",
  description: "구로 주변의 숨은 맛집을 공유하고 발견하는 커뮤니티",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
