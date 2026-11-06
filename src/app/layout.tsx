import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "./providers";
import "./globals.css";

// The app is set in Geist Sans only. Its variable goes on <html>, where Tailwind
// sets the base font; on <body> it was undefined there, so pages without their
// own font rule fell back to the system font. The landing page adds its own
// display faces (components/landing/fonts.ts).
export const metadata: Metadata = {
  title: "Vistern",
  description: "Empower your journey in computer science",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
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
