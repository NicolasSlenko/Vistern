import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Newsreader } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "./providers";
import "./globals.css";

// Titles in the resume studio (font-serif). Italic is loaded too: the review
// panel sets a word of each headline in it.
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
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${GeistSans.variable} ${GeistMono.variable} ${newsreader.variable} antialiased`}
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
