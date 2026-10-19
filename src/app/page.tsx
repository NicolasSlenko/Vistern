import { HeroSection } from "@/components/landing/hero-section";
import { FeatureBentoGrid } from "@/components/landing/feature-bento-grid";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/home");
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <main className="container mx-auto px-4 pt-10 pb-20 space-y-12">
        <HeroSection />
        <FeatureBentoGrid />
      </main>
    </div>
  );
}
