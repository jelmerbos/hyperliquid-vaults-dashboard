import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hyperliquid Vaults Dashboard",
  description: "Compare and analyze Hyperliquid vaults with risk-adjusted metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Providers>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col md:ml-[220px]">
                <TopBar />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
