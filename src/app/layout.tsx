import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vistern",
  description: "Empower your journey in computer science",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
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
