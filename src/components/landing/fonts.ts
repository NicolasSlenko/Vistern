import { GeistMono } from "geist/font/mono"
import { Newsreader } from "next/font/google"

// The landing page's display faces. The app itself is set in Geist Sans only
// (loaded in app/layout.tsx), so these load on the landing page and nowhere else.
// Italic is loaded too: headlines set a word in it.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
})

export const landingFontVariables = `${newsreader.variable} ${GeistMono.variable}`
