"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Mail,
  Send,
  Crown,
  GraduationCap,
  Code2,
  FlaskConical,
  Users,
  UserPlus,
  ArrowDown,
  Briefcase,
  GitPullRequest,
  Lightbulb,
  Shield,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TeamNode {
  name: string
  role: string
  subtitle: string
  description: string
  icon: React.ElementType
  imageUrl?: string
  filled: boolean
  tags?: string[]
  mentorLink?: boolean
  bridgeNode?: boolean
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const advisors: TeamNode[] = [
  {
    name: "Dr. Amanpreet Kapoor",
    role: "Faculty Advisor",
    subtitle: "Strategic Oversight",
    description:
      "Instructional Associate Professor in the UF Department of Engineering Education. Provides academic direction and research methodology guidance.",
    icon: GraduationCap,
    imageUrl: "/team/amanpreet-kapoor.png",
    filled: true,
    tags: ["Research Direction", "Academic Rigor"],
  },
  {
    name: "Jason Tolen",
    role: "Alumni Consultant",
    subtitle: "Strategic Oversight",
    description:
      "Computer Science Alumni and Data Annotation Freelancer. Brings industry perspective and long-term architectural insight to the project.",
    icon: Briefcase,
    imageUrl: "/team/jason-tolen.png",
    filled: true,
    tags: ["Industry Lens", "Architecture"],
  },
]

const projectLead: TeamNode = {
  name: "Wyatt Harris",
  role: "Project & Research Lead",
  subtitle: "Central Hub · Owns Vision, Roadmap & Research",
  description:
    "The central decision-maker who owns the product vision, drives the research agenda, manages the project roadmap, and coordinates all cross-functional work. Every major technical and research decision flows through this role — bridging academic objectives with engineering execution.",
  icon: Crown,
  imageUrl: "/team/wyatt-harris.png",
  filled: true,
  tags: ["Vision", "Research", "Roadmap", "PM", "Full Stack", "Decision Authority"],
}

const executionTeam: TeamNode[] = [
  {
    name: "Nicolas Slenko",
    role: "Tech Lead",
    subtitle: "Execution · Code Quality Filter",
    description:
      "Acts as the quality gate for all incoming code. Responsible for architecture decisions, code reviews, CI/CD standards, and mentoring junior contributors.",
    icon: Code2,
    imageUrl: "/team/nicolas-slenko.png",
    filled: true,
    tags: ["Architecture", "Code Review", "CI/CD", "Mentorship"],
  },
  {
    name: "Oliver",
    role: "User Research & Testing",
    subtitle: "Execution · Insights Specialist",
    description:
      "Bridges the gap between human insights and technical requirements. Conducts user interviews, usability testing, and translates findings into actionable specs.",
    icon: FlaskConical,
    filled: true,
    tags: ["UX Research", "Testing", "Requirements"],
    bridgeNode: true,
  },
  {
    name: "TBD",
    role: "Junior Developer",
    subtitle: "Execution · Apprentice",
    description:
      "Contributes features and fixes under the Tech Lead's mentorship. Follows established patterns and grows through structured code review.",
    icon: UserPlus,
    filled: false,
    tags: ["Feature Dev", "Learning"],
    mentorLink: true,
  },
  {
    name: "TBD",
    role: "Student Assistant",
    subtitle: "Execution · Support",
    description:
      "Supports documentation, data collection, and exploratory development tasks. Reports to Tech Lead for code contributions.",
    icon: Users,
    filled: false,
    tags: ["Documentation", "Data", "Support"],
    mentorLink: true,
  },
]

// ─── Card Component ────────────────────────────────────────────────────────────

function NodeCard({
  node,
  variant,
}: {
  node: TeamNode
  variant: "advisor" | "lead" | "execution"
}) {
  const styles = {
    advisor: {
      border: "border-[#d9e4da]",
      bg: "bg-white",
      text: "text-[#27332d]",
      subtitleText: "text-[#4f705b]",
      descText: "text-[#5c685f]",
      tagBg: "bg-[#eaf1ec] text-[#246347]",
      iconBg: "bg-[#eaf1ec]",
    },
    lead: {
      border: "border-[#a6c9ad]",
      bg: "bg-[#f2f7f1]",
      text: "text-[#27332d]",
      subtitleText: "text-[#246347]",
      descText: "text-[#4f6555]",
      tagBg: "bg-[#deecdf] text-[#246347]",
      iconBg: "bg-[#d5e8d8]",
    },
    execution: {
      border: "border-[#d9e4da]",
      bg: "bg-white",
      text: "text-[#27332d]",
      subtitleText: "text-[#4f705b]",
      descText: "text-[#5c685f]",
      tagBg: "bg-[#eaf1ec] text-[#246347]",
      iconBg: "bg-[#eaf1ec]",
    },
  }

  const s = styles[variant]
  const Icon = node.icon

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md",
        s.border, s.bg,
        variant === "lead" && "shadow-[0_12px_30px_#24634712]",
        !node.filled && "opacity-70 border-dashed"
      )}
    >
      {/* Bridge indicator */}
      {node.bridgeNode && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-[#246347] text-white hover:bg-[#1b5038] text-[10px] gap-1 font-semibold">
            <Lightbulb className="h-3 w-3" /> Insights ↔ Requirements
          </Badge>
        </div>
      )}

      {/* Mentor link indicator */}
      {node.mentorLink && (
        <div className="absolute -top-3 right-3">
          <Badge variant="outline" className="border-[#a6c9ad] text-[#246347] text-[10px] gap-1 bg-[#f2f7f1]">
            <GitPullRequest className="h-3 w-3" /> → Tech Lead
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        {node.imageUrl ? (
          <div className={cn("relative shrink-0 overflow-hidden rounded-full aspect-square border-2 border-[#d9e4da] shadow-sm", variant === "lead" ? "w-24 sm:w-28" : "w-16 sm:w-20")}>
            <Image
              src={node.imageUrl}
              alt={node.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className={cn("shrink-0 rounded-full flex items-center justify-center", s.iconBg, variant === "lead" ? "w-24 h-24 sm:w-28 sm:h-28" : "w-16 h-16 sm:w-20 sm:h-20")}>
            <Icon className={cn("text-[#246347]", variant === "lead" ? "h-10 w-10" : "h-7 w-7")} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className={cn("font-bold leading-tight", s.text, variant === "lead" ? "text-lg" : "text-base", !node.filled && "italic")}>
            {node.name}
          </h3>
          <p className={cn("font-semibold", s.subtitleText, variant === "lead" ? "text-base" : "text-sm")}>{node.role}</p>
          <p className={cn("text-xs opacity-75 mt-0.5", s.subtitleText)}>{node.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p className={cn("leading-relaxed mb-3", s.descText, variant === "lead" ? "text-sm" : "text-xs")}>{node.description}</p>

      {/* Tags */}
      {node.tags && (
        <div className="flex flex-wrap gap-1.5">
          {node.tags.map((tag) => (
            <span key={tag} className={cn("font-medium px-2 py-0.5 rounded-full", s.tagBg, variant === "lead" ? "text-xs" : "text-[10px]")}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Connectors ────────────────────────────────────────────────────────────────

function VerticalConnector({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex justify-center py-3">
      <div className="flex flex-col items-center gap-1">
        <div className={cn("w-0.5 h-8 rounded-full bg-gradient-to-b", from, to)} />
        <ArrowDown className={cn("h-4 w-4", to.replace("to-", "text-"))} />
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-20">
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            <Shield className="h-3 w-3 mr-1" /> Project Ecosystem
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About Us
          </h1>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground leading-relaxed">
              We built this site based on information found from past research where students may benefit from learning which factors could benefit them the most in obtaining an internship. We aim to help students further their career and guide them in the correct direction.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              An organizational hierarchy built around a central research and project lead,
              with advisory oversight and specialized execution teams.
            </p>
          </div>
        </div>

        {/* ─── Faculty Director (Dr. Kapoor) ───────────────────────── */}
        <div className="mb-16 max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">Faculty Advisor</h2>
            <div className="w-16 h-1.5 bg-[#8fba98] mx-auto rounded-full" />
          </div>
          <div className="max-w-xl mx-auto">
            <NodeCard node={advisors[0]} variant="advisor" />
          </div>
        </div>

        {/* ─── Core Leadership Team ────────────────────────────────── */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">Project Leadership</h2>
            <div className="w-16 h-1.5 bg-[#8fba98] mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
            <NodeCard node={advisors[1]} variant="advisor" />
            <div className="relative z-10 scale-105 transform">
              <NodeCard node={projectLead} variant="lead" />
            </div>
            <NodeCard node={executionTeam[0]} variant="execution" />
          </div>
        </div>

        {/* ─── Execution Team ──────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">Execution Team</h2>
            <div className="w-16 h-1.5 bg-[#8fba98] mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto items-start">
            {executionTeam.slice(1).map((node, i) => (
              <NodeCard key={i} node={node} variant="execution" />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 border rounded-lg p-4 max-w-2xl mx-auto bg-muted/30">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Legend</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-[#d9e4da] bg-white shrink-0" />
              <span className="text-muted-foreground">Advisory — Strategic Oversight</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-[#a6c9ad] bg-[#f2f7f1] shrink-0" />
              <span className="text-muted-foreground">Project Lead — Central Hub</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-[#d9e4da] bg-white shrink-0" />
              <span className="text-muted-foreground">Execution Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-[#a6c9ad] bg-[#f2f7f1] shrink-0" />
              <span className="text-muted-foreground">Unfilled Position</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#246347] text-white text-[9px] h-4 px-1.5">Bridge</Badge>
              <span className="text-muted-foreground">Human Insights ↔ Technical Specs</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#a6c9ad] text-[#246347] text-[9px] h-4 px-1.5">→ Tech Lead</Badge>
              <span className="text-muted-foreground">Code Review Reporting Line</span>
            </div>
          </div>
        </div>

        {/* ─── Contact Section ──────────────────────────────────────── */}
        <div className="mt-32 max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Get in Touch
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Have questions about the project? Want to collaborate or report an issue?
                We&apos;d love to hear from you.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Email Us</p>
                  <a href="mailto:wharris2023@gmail.com" className="text-lg hover:text-primary transition-colors">wharris2023@gmail.com</a>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name</label>
                  <Input id="name" placeholder="Your name" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" type="email" placeholder="name@example.com" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <Textarea
                    id="message"
                    placeholder="How can we help?"
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Send className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
