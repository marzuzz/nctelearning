import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NCTElearning - Nền tảng học văn học trực tuyến",
  description: "Nền tảng học văn học trực tuyến cho học sinh lớp 10, 11, 12 với video bài giảng, bài tập trắc nghiệm và bài tập viết luận",
  keywords: "văn học, học trực tuyến, lớp 10, lớp 11, lớp 12, giáo dục, Việt Nam",
  authors: [{ name: "NCTelearning Team" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="vietnamese-text" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/NCTlearning-01.svg" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-nc-cream`} suppressHydrationWarning>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
