"use client"

import { useTheme } from "next-themes"

/**
 * Clerk derives its own shades (hover, borders, placeholder text) from the
 * colours it is given, so it needs real colour values: a `var(--color-ink)`
 * it cannot parse falls back to Clerk's light-theme defaults, which left
 * dark text on the dark sheet. These mirror the tokens in zip-tokens.css.
 */
const palette = {
  light: {
    brand: "#246347",
    onBrand: "#ffffff",
    ink: "#141a17",
    ink2: "#576159",
    sheet: "#ffffff",
  },
  dark: {
    brand: "#8fd2a4",
    onBrand: "#0d1a13",
    ink: "#e8efea",
    ink2: "#a6b1aa",
    sheet: "#141a17",
  },
} as const

/**
 * Clerk's widget, dressed as part of the sheet: no card of its own, the
 * theme's green on the main action, and the theme's hairlines everywhere
 * else. Clerk renders into our DOM, so `elements` are its slots rather than
 * our own classes; the Tailwind tokens there follow `.dark` by themselves.
 */
export function useClerkAppearance() {
  const { resolvedTheme } = useTheme()
  const colors = palette[resolvedTheme === "dark" ? "dark" : "light"]

  return {
    variables: {
      colorPrimary: colors.brand,
      colorTextOnPrimaryBackground: colors.onBrand,
      colorText: colors.ink,
      colorTextSecondary: colors.ink2,
      colorNeutral: colors.ink,
      colorBackground: "transparent",
      colorInputBackground: colors.sheet,
      colorInputText: colors.ink,
      borderRadius: "12px",
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full shadow-none",
      card: "w-full border-0 bg-transparent shadow-none",
      header: "gap-1",
      headerTitle: "font-serif text-[30px] font-normal leading-tight tracking-[-0.03em] text-ink",
      headerSubtitle: "text-[14px] text-ink-2",
      socialButtonsBlockButton: "white-button rounded-full border-0 text-ink",
      socialButtonsBlockButtonText: "text-ink",
      dividerLine: "bg-hairline",
      dividerText: "label-mono text-ink-3",
      formFieldLabel: "label-mono text-ink-2",
      formFieldInput: "rounded-[10px] border-rule-strong bg-sheet text-ink",
      formButtonPrimary: "brand-button rounded-full text-[15px] font-medium normal-case tracking-[-0.01em] shadow-none",
      footer: "bg-transparent",
      footerAction: "bg-transparent",
      footerActionText: "text-ink-2",
      footerActionLink: "font-medium text-brand hover:underline",
      identityPreviewText: "text-ink",
      identityPreviewEditButton: "text-brand",
      otpCodeFieldInput: "border-rule-strong text-ink",
    },
  }
}
