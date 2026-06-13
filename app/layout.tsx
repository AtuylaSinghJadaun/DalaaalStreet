import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import StoreInitializer from "@/components/StoreInitializer";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Geometric display face — carries the "gamified" character through type,
// used for headings and financial numbers rather than loud colors.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DalaaalStreet | Virtual Trading",
  description: "A virtual Dalal Street trading, auction, and competition platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased min-h-screen bg-background text-foreground`}>
        <StoreInitializer>
          {children}
        </StoreInitializer>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
