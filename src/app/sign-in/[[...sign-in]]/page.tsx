"use client"

import { SignIn } from "@clerk/nextjs"
import { AuthPage } from "@/components/auth/auth-page"
import { useClerkAppearance } from "@/components/auth/use-clerk-appearance"

export default function SignInPage() {
  const appearance = useClerkAppearance()
  return (
    <AuthPage title="Vistern">
      <SignIn appearance={appearance} path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </AuthPage>
  )
}
