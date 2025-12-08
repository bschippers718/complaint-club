import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Complaint Club | NYC 311 Leaderboard",
  description: "See which NYC neighborhoods are complaining the most. Leaderboards, stats, and chaos scores for every neighborhood.",
  keywords: ["NYC", "311", "complaints", "leaderboard", "neighborhoods", "rats", "noise", "parking"],
  openGraph: {
    title: "Complaint Club | NYC 311 Leaderboard",
    description: "See which NYC neighborhoods are complaining the most",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  );
}
