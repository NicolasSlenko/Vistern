import { SignIn } from "@clerk/nextjs"
import { AuthPage, clerkAppearance } from "@/components/auth/auth-page"

export default function SignInPage() {
  return (
    <AuthPage title="Vistern">
      <SignIn appearance={clerkAppearance} path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </AuthPage>
  )
}
