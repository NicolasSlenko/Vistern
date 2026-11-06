import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { Newsreader } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "./providers";
import "./globals.css";

// Geist Sans for everything, Newsreader for page titles only (font-serif). The
// variables go on <html>, where Tailwind sets the base font; on <body> they were
// undefined there, so pages without their own font rule fell back to the system
// font. Italic is loaded too: titles set a word in it. The landing page adds
// Geist Mono (components/landing/fonts.ts).
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "Vistern",
  description: "Empower your journey in computer science",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" className={`${GeistSans.variable} ${newsreader.variable}`} suppressHydrationWarning>
        <body
          className="antialiased"
          suppressHydrationWarning
        >
          <AppProviders>
            {children}
            <Toaster />
          </AppProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
