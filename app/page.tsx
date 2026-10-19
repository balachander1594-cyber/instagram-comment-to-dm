import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LeadDoor — Turn Every Instagram Comment Into a Conversation",
  description:
    "LeadDoor is Meta-compliant Instagram comment-to-DM automation. Keywords trigger instant DMs, follow-ups, broadcasts and lead capture — for creators, brands and agencies. Every comment opens a door.",
};

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Compare", href: "#compare" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const seoLinks = [
  { label: "Manychat alternative", href: "/manychat-alternative" },
  { label: "Comment-to-DM templates", href: "/instagram-comment-to-dm-templates" },
  { label: "Agencies", href: "/instagram-dm-automation-agencies" },
  { label: "Comment LINK automation", href: "/comment-link-automation" },
];

const audiences = [
  "Creators",
  "Coaches",
  "D2C brands",
  "Course sellers",
  "Agencies",
  "Local businesses",
  "Fitness studios",
  "Event organisers",
];

const steps = [
  {
    step: "01",
    title: "Connect your Instagram",
    description:
      "Sign in with email, link your Instagram professional account once via the official Meta login. No passwords shared, no scraping, no ban risk.",
  },
  {
    step: "02",
    title: "Create a campaign",
    description:
      "Pick a post or reel — or cover every post at once. Set trigger keywords, write the DM, add buttons, delays and follow-ups.",
  },
  {
    step: "03",
    title: "Comments become DMs",
    description:
      "Someone comments PRICE? They get the price in their DM within seconds — plus a public reply, lead tagging and full logs. Automatically.",
  },
];

const featureGroups = [
  {
    eyebrow: "Core automation",
    title: "Never miss a buying signal again",
    description:
      "Every comment is a hand raised. LeadDoor catches it in seconds and starts the conversation while intent is hot.",
    features: [
      {
        title: "Keyword comment-to-DM",
        description:
          "Set trigger words like PRICE, LINK or DEMO. A matching comment instantly fires a private DM with your link, price or lead magnet.",
      },
      {
        title: "Backtrack",
        description:
          "Already posted? Backtrack scans the last 7 days of comments on any post and sends DMs to people you missed. Launch-day rescue built in.",
      },
      {
        title: "Universal automation",
        description:
          "One campaign that watches every post and reel on your account — no need to attach automations one by one.",
      },
      {
        title: "Keyword exclusion filters",
        description:
          "Ignore comments containing words you choose — filter out spam, competitors or job seekers so only real buyers get DMs.",
      },
      {
        title: "Public reply + private DM",
        description:
          "Post a friendly public reply for social proof and send the real details privately. Best of both worlds, fully automatic.",
      },
      {
        title: "Smart delay",
        description:
          "Randomised human-like timing between comment and DM, so every conversation feels personal — never robotic.",
      },
      {
        title: "Follow Nudge Flow",
        description:
          "Commenter doesn't follow you yet? They get a polite nudge to follow first — then the DM lands the moment they engage back.",
      },
    ],
  },
  {
    eyebrow: "Growth tools",
    title: "Turn DMs into a sales pipeline",
    description:
      "One DM is a start. Sequences, buttons and testing turn casual commenters into qualified leads.",
    features: [
      {
        title: "Multi-step DM sequences",
        description:
          "Don't stop at one message. Build timed follow-up sequences that nurture, answer objections and close — all inside Instagram.",
      },
      {
        title: "Quick-reply buttons",
        description:
          "Add tappable buttons to your DMs — size selectors, booking slots, yes/no qualifiers. Replies become structured data.",
      },
      {
        title: "Lead tags, CRM & CSV export",
        description:
          "Every person who engages becomes a tagged lead. Filter, segment and export your full lead list to CSV any time.",
      },
      {
        title: "A/B testing with click attribution",
        description:
          "Test two DM versions 50/50. Tracked links show exactly which message drives clicks — stop guessing what converts.",
      },
    ],
  },
  {
    eyebrow: "Scale & safety",
    title: "Built for serious volume",
    description:
      "Agencies and high-traffic accounts get broadcast power with Meta's rules baked in — compliant by design, not by luck.",
    features: [
      {
        title: "Broadcasts to engaged audiences",
        description:
          "Send announcements and offers to people who messaged you recently. Only reachable, opted-in audiences — never cold DMs.",
      },
      {
        title: "Story reply triggers",
        description:
          "Replies to your stories can trigger the same automation flows as comments. Every interaction becomes an entry point.",
      },
      {
        title: "Spam comment auto-hide",
        description:
          "Abusive or spammy comments get hidden automatically, keeping your posts clean while real conversations flow.",
      },
      {
        title: "750 DMs/hour throughput",
        description:
          "Queue-backed delivery engine handles viral spikes without dropping a single conversation or tripping rate limits.",
      },
    ],
  },
  {
    eyebrow: "Platform",
    title: "Agency-grade control room",
    description:
      "Everything you need to run client work professionally — visibility, reporting and clean separation.",
    features: [
      {
        title: "Analytics dashboard",
        description:
          "DMs sent, delivery rate, clicks, CTR and conversions — per campaign, per account, in real time.",
      },
      {
        title: "Client reports with share links",
        description:
          "Generate beautiful public report links for every campaign. Clients see results without needing a login.",
      },
      {
        title: "Multi-client workspaces",
        description:
          "Run every client in their own isolated workspace — separate accounts, campaigns, leads and billing. One login, unlimited clients.",
      },
      {
        title: "Meta-compliant by design",
        description:
          "One private reply per comment within 7 days, 24-hour messaging windows respected, encrypted tokens. Built on the official API.",
      },
    ],
  },
];

const comparison = [
  {
    label: "Client accounts",
    leaddoor: "Unlimited workspaces, one login",
    manychat: "One business per channel",
  },
  {
    label: "Pricing model",
    leaddoor: "Flat monthly, launch pricing",
    manychat: "Per-contact tiers that grow fast",
  },
  {
    label: "Comment-to-DM core",
    leaddoor: "Included on every plan",
    manychat: "Included",
  },
  {
    label: "Backtrack (past comments)",
    leaddoor: "Yes — last 7 days",
    manychat: "No",
  },
  {
    label: "Follow Nudge Flow",
    leaddoor: "Yes, built in",
    manychat: "No",
  },
  {
    label: "A/B testing + click attribution",
    leaddoor: "Yes",
    manychat: "Higher tiers only",
  },
  {
    label: "Client report share links",
    leaddoor: "Yes",
    manychat: "No",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "₹0",
    period: "free forever",
    tag: "Test the waters",
    description: "Prove comment-to-DM works for you before spending a rupee.",
    features: [
      "1 active campaign",
      "100 DMs / month",
      "Keyword triggers",
      "Basic DM logs",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    tag: "Launch pricing",
    description: "For creators and brands running comment-to-DM every week.",
    features: [
      "10 active campaigns",
      "5,000 DMs / month",
      "Sequences + quick replies",
      "A/B testing & click tracking",
      "Lead tags + CSV export",
      "Broadcasts & story triggers",
    ],
    cta: "Start Pro trial",
    featured: true,
  },
  {
    name: "Agency",
    price: "₹1,999",
    period: "/month",
    tag: "Launch pricing",
    description: "For agencies running client accounts at scale.",
    features: [
      "Unlimited campaigns",
      "Unlimited client workspaces",
      "25,000 DMs / month",
      "Client report share links",
      "Spam auto-hide",
      "Priority support",
    ],
    cta: "Start Agency trial",
    featured: false,
  },
];

const faqs = [
  {
    question: "Is LeadDoor Meta-compliant? Will my Instagram account get banned?",
    answer:
      "Yes, compliant — and no ban risk from our side. LeadDoor uses only the official Instagram Messaging API: one private reply per comment within 7 days, follow-ups only inside Meta's 24-hour messaging window, and rate limits respected automatically. We never scrape, never ask for your password, and never use browser automation — the three things that actually get accounts flagged.",
  },
  {
    question: "Do I need Meta App Review approval to use LeadDoor?",
    answer:
      "For your own account during testing, no — developer-mode access works immediately after you connect. For full production use (and for agencies onboarding clients), the app completes Meta's App Review for the messaging permissions. We handle the technical side; you just connect your account.",
  },
  {
    question: "What happens after the 24-hour messaging window closes?",
    answer:
      "Meta only lets businesses message someone within 24 hours of their last reply. LeadDoor tracks every window automatically — broadcasts only go to people inside their window, and sequences pause gracefully instead of failing silently. No cold DMs, ever.",
  },
  {
    question: "What is the 7-day private reply rule?",
    answer:
      "Meta allows exactly one private reply per comment, and it must be sent within 7 days of the comment. LeadDoor enforces this per comment, deduplicates webhook events, and logs everything — so you stay compliant without thinking about it.",
  },
  {
    question: "How is LeadDoor different from ManyChat?",
    answer:
      "Three big differences: (1) Multi-client workspaces — run unlimited client accounts from one login, while ManyChat ties one account to one business per channel. (2) Flat, transparent pricing — no per-contact tiers that balloon as you grow. (3) Features ManyChat doesn't have, like Backtrack for past comments, the Follow Nudge Flow, and shareable client reports.",
  },
  {
    question: "I'm an agency. Can I manage my clients' accounts?",
    answer:
      "That's exactly what workspaces are for. Each client gets an isolated workspace with their own Instagram account, campaigns, leads and reports — and you manage all of them from a single login. Share read-only report links with clients so they see results without touching your setup.",
  },
];

/* ─── Icons ─── */

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7m0 0a2.25 2.25 0 0 1 0-4.5m0 4.5a2.25 2.25 0 0 0 0-4.5M6 3h9.75A2.25 2.25 0 0 1 18 5.25v13.5A2.25 2.25 0 0 1 15.75 21H6a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 6 3Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 14.25 2.25 12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

const groupIcons = [BoltIcon, ChatIcon, ChartIcon, ShieldIcon];

/* ─── Hero demo: comment → DM flow, pure CSS ─── */

function HeroDemo() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <style>{`
        @keyframes ld-pulse-dot { 0%,100% { opacity:.25; transform:scale(.8);} 50% { opacity:1; transform:scale(1);} }
        @keyframes ld-flow { 0% { stroke-dashoffset: 24; } 100% { stroke-dashoffset: 0; } }
        @keyframes ld-pop { 0% { opacity:0; transform:translateY(10px) scale(.96);} 12%,88% { opacity:1; transform:translateY(0) scale(1);} 100% { opacity:0; transform:translateY(-6px) scale(.98);} }
        @keyframes ld-typing { 0%,60%,100% { transform:translateY(0);} 30% { transform:translateY(-4px);} }
        .ld-flow-line { stroke-dasharray: 6 6; animation: ld-flow 1.2s linear infinite; }
        .ld-msg-in { animation: ld-pop 6s ease-in-out infinite; }
        .ld-msg-in-2 { animation: ld-pop 6s ease-in-out 3s infinite; }
        .ld-dot { animation: ld-pulse-dot 1.2s ease-in-out infinite; }
        .ld-dot:nth-child(2) { animation-delay:.15s; } .ld-dot:nth-child(3) { animation-delay:.3s; }
      `}</style>

      {/* Comment card */}
      <div className="relative z-10 rounded-2xl border border-[#101C3D]/10 bg-white p-4 shadow-xl shadow-[#101C3D]/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A227] to-[#8a6d15] text-sm font-black text-white">
            P
          </div>
          <div>
            <p className="text-sm font-bold text-[#101C3D]">priya.shops</p>
            <p className="text-xs text-[#6B7590]">commented on your reel</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            Keyword matched
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-[#101C3D]/[0.04] px-3 py-2.5 text-sm text-[#3E4A68]">
          “PRICE please!! I need this before Diwali 🪔”
        </p>
      </div>

      {/* Flow connector */}
      <div className="relative z-0 mx-auto -my-1 h-14 w-px">
        <svg className="absolute inset-0 h-full w-px overflow-visible" aria-hidden="true">
          <line x1="0" y1="0" x2="0" y2="56" stroke="#C9A227" strokeWidth="3" className="ld-flow-line" />
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C9A227]/40 bg-[#FDFCF8] p-1.5 text-[#7A5F14] shadow">
          <BoltIcon />
        </div>
      </div>

      {/* DM card */}
      <div className="relative z-10 rounded-2xl border border-[#101C3D]/10 bg-white p-4 shadow-xl shadow-[#101C3D]/10">
        <div className="flex items-center gap-3 border-b border-[#101C3D]/10 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101C3D] text-sm font-black text-[#C9A227]">
            LD
          </div>
          <div>
            <p className="text-sm font-bold text-[#101C3D]">Your business</p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Active now
            </p>
          </div>
          <span className="ml-auto text-[11px] font-semibold text-[#6B7590]">DM · just now</span>
        </div>
        <div className="space-y-2.5 pt-3">
          <div className="ld-msg-in max-w-[85%] rounded-2xl rounded-tl-md bg-[#101C3D] px-3.5 py-2.5 text-sm leading-6 text-white">
            Hey Priya! 👋 Thanks for asking — the festive combo is{" "}
            <span className="font-bold text-[#C9A227]">₹1,499</span> (was ₹1,999).
          </div>
          <div className="ld-msg-in-2 max-w-[85%] rounded-2xl rounded-tl-md bg-[#101C3D] px-3.5 py-2.5 text-sm leading-6 text-white">
            Want the order link?{" "}
            <span className="font-semibold text-[#C9A227] underline">shop.link/diwali</span>
            <span className="mt-2 flex gap-2">
              <span className="rounded-full bg-[#C9A227] px-3 py-1 text-xs font-bold text-[#101C3D]">Yes, send it</span>
              <span className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/90">Not now</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-1 pt-1">
            <span className="text-[11px] text-[#6B7590]">LeadDoor is typing</span>
            <span className="flex gap-1">
              <span className="ld-dot h-1.5 w-1.5 rounded-full bg-[#C9A227]" />
              <span className="ld-dot h-1.5 w-1.5 rounded-full bg-[#C9A227]" />
              <span className="ld-dot h-1.5 w-1.5 rounded-full bg-[#C9A227]" />
            </span>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -left-3 top-6 z-20 hidden rounded-xl border border-[#101C3D]/10 bg-white px-3 py-2 shadow-lg sm:block">
        <p className="text-[11px] font-bold text-emerald-700">✓ Public reply posted</p>
      </div>
      <div className="absolute -right-3 bottom-8 z-20 hidden rounded-xl border border-[#101C3D]/10 bg-white px-3 py-2 shadow-lg sm:block">
        <p className="text-[11px] font-bold text-[#101C3D]">Lead tagged: <span className="text-[#7A5F14]">hot</span></p>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#FDFCF8] text-[#101C3D] antialiased">
      {/* backdrop texture */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(16,28,61,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(16,28,61,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(201,162,39,0.16),transparent_70%)]" />

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-40 border-b border-[#101C3D]/10 bg-[#FDFCF8]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="LeadDoor home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#101C3D] text-sm font-black text-[#C9A227]">
              LD
            </span>
            <span className="text-lg font-extrabold tracking-tight">LeadDoor</span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-[#5B6478] transition hover:text-[#101C3D]">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-4 py-2 text-sm font-semibold text-[#3E4A68] transition hover:text-[#101C3D] sm:inline-flex">
              Log in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-4 py-2.5 text-sm font-bold text-[#101C3D] shadow-md shadow-[#C9A227]/30 transition hover:bg-[#d9b545]"
            >
              Start free
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-emerald-600/10 px-3.5 py-1.5 text-[13px] font-semibold text-emerald-800">
            <span className="[&>svg]:h-4 [&>svg]:w-4"><ShieldIcon /></span>
            100% Meta-compliant · Official Instagram API
          </div>

          <h1 className="mt-6 text-balance text-[2.75rem] font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.25rem]">
            Turn every comment into a <span className="text-[#7A5F14]">conversation.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#3E4A68]">
            LeadDoor watches your Instagram comments 24/7. Someone types{" "}
            <span className="font-bold text-[#101C3D]">PRICE</span>? They get the price in their DM
            within seconds — while they're still excited. Every comment opens a door.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-7 py-3.5 text-[15px] font-bold text-[#101C3D] shadow-lg shadow-[#C9A227]/30 transition hover:bg-[#d9b545]"
            >
              Start free — no card needed
              <ArrowIcon />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-[#101C3D]/15 bg-white px-7 py-3.5 text-[15px] font-bold text-[#101C3D] transition hover:border-[#101C3D]/30"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#5B6478]">
            {["No scraping", "No password sharing", "No ban risk"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <span className="text-emerald-700"><CheckIcon /></span>{t}
              </span>
            ))}
          </div>
        </div>

        <HeroDemo />
      </section>

      {/* ── Audience strip ── */}
      <section className="border-y border-[#101C3D]/10 bg-white/60 py-8">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-[#6B7590]">
            Built for creators, brands &amp; agencies who live in their comments
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {audiences.map((a) => (
              <span key={a} className="rounded-full border border-[#101C3D]/10 bg-[#FDFCF8] px-4 py-2 text-sm font-semibold text-[#3E4A68]">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-[#7A5F14]">How it works</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Live in under 5 minutes
          </h2>
          <p className="mt-4 text-lg text-[#5B6478]">
            No code, no complicated flows. If you can post on Instagram, you can run LeadDoor.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <article key={s.step} className="relative rounded-2xl border border-[#101C3D]/10 bg-white p-7 shadow-sm">
              <span className="text-5xl font-black text-[#C9A227]/30">{s.step}</span>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#5B6478]">{s.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-20 border-y border-[#101C3D]/10 bg-white/50 py-20 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-[#7A5F14]">Features</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Everything a comment is worth
            </h2>
            <p className="mt-4 text-lg text-[#5B6478]">
              From the first keyword trigger to agency-scale broadcasts — one platform, zero plugins.
            </p>
          </div>

          <div className="mt-14 space-y-16">
            {featureGroups.map((group, gi) => {
              const Icon = groupIcons[gi % groupIcons.length];
              return (
                <div key={group.eyebrow}>
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#101C3D] text-[#C9A227]">
                      <Icon />
                    </span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-[#7A5F14]">{group.eyebrow}</p>
                      <h3 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{group.title}</h3>
                      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#5B6478]">{group.description}</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.features.map((f) => (
                      <article key={f.title} className="rounded-2xl border border-[#101C3D]/10 bg-[#FDFCF8] p-6 transition hover:border-[#C9A227]/50 hover:shadow-md">
                        <h4 className="font-bold text-[#101C3D]">{f.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-[#5B6478]">{f.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ManyChat comparison ── */}
      <section id="compare" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-[#7A5F14]">Why switch</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            LeadDoor vs ManyChat
          </h2>
          <p className="mt-4 text-lg text-[#5B6478]">
            ManyChat is a fine tool — until you outgrow one business per account and per-contact billing.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-[#101C3D]/10 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-[#101C3D] text-sm font-bold text-white">
            <div className="px-5 py-4"> </div>
            <div className="px-5 py-4 text-[#C9A227]">LeadDoor</div>
            <div className="px-5 py-4 text-white/70">ManyChat</div>
          </div>
          {comparison.map((row, i) => (
            <div key={row.label} className={`grid grid-cols-[1.2fr_1fr_1fr] text-sm ${i % 2 ? "bg-[#101C3D]/[0.025]" : "bg-white"}`}>
              <div className="px-5 py-4 font-semibold text-[#101C3D]">{row.label}</div>
              <div className="flex items-start gap-2 px-5 py-4 font-medium text-[#101C3D]">
                <span className="mt-0.5 text-emerald-700"><CheckIcon /></span>{row.leaddoor}
              </div>
              <div className="px-5 py-4 text-[#6B7590]">{row.manychat}</div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-4xl text-center text-sm text-[#6B7590]">
          Comparison based on publicly listed ManyChat plans and features as of 2026. ManyChat is a trademark of its owner.
        </p>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="scroll-mt-20 border-y border-[#101C3D]/10 bg-white/50 py-20 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-[#7A5F14]">Pricing</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Flat pricing. No contact-count traps.
            </h2>
            <p className="mt-4 text-lg text-[#5B6478]">
              Launch pricing locked for early users — it will never increase on your account.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  tier.featured
                    ? "border-[#C9A227] bg-[#101C3D] text-white shadow-xl shadow-[#101C3D]/20"
                    : "border-[#101C3D]/10 bg-[#FDFCF8]"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#C9A227] px-4 py-1 text-xs font-black uppercase tracking-wide text-[#101C3D]">
                    Most popular
                  </span>
                )}
                <p className={`text-xs font-bold uppercase tracking-wider ${tier.featured ? "text-[#C9A227]" : "text-[#7A5F14]"}`}>
                  {tier.tag}
                </p>
                <h3 className="mt-2 text-2xl font-black">{tier.name}</h3>
                <p className={`mt-2 text-sm leading-6 ${tier.featured ? "text-white/70" : "text-[#5B6478]"}`}>
                  {tier.description}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tight">{tier.price}</span>
                  <span className={`text-sm ${tier.featured ? "text-white/60" : "text-[#6B7590]"}`}>{tier.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex gap-2.5 text-sm ${tier.featured ? "text-white/85" : "text-[#3E4A68]"}`}>
                      <span className={tier.featured ? "text-[#C9A227]" : "text-emerald-700"}><CheckIcon /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition ${
                    tier.featured
                      ? "bg-[#C9A227] text-[#101C3D] hover:bg-[#d9b545]"
                      : "border border-[#101C3D]/15 bg-white text-[#101C3D] hover:border-[#101C3D]/30"
                  }`}
                >
                  {tier.cta}
                  <ArrowIcon />
                </Link>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[#6B7590]">
            Prices in INR, taxes extra. Cancel anytime — your campaigns pause, your data stays.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto w-full max-w-4xl scroll-mt-20 px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-[#7A5F14]">FAQ</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Questions, answered honestly
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-2xl border border-[#101C3D]/10 bg-white open:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left font-bold text-[#101C3D] marker:hidden">
                {faq.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/15 text-lg font-black text-[#7A5F14] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-6 pb-6 text-[15px] leading-7 text-[#5B6478]">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#101C3D] px-6 py-14 text-center sm:px-12 lg:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(201,162,39,0.25),transparent_70%)]" />
          <div className="relative">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A227] text-[#101C3D]">
              <DoorIcon />
            </span>
            <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Your next 100 comments are already leads.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Connect Instagram, set one keyword, and wake up to DMs that started while you slept.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A227] px-8 py-3.5 text-[15px] font-bold text-[#101C3D] shadow-lg transition hover:bg-[#d9b545]"
              >
                Start free today
                <ArrowIcon />
              </Link>
              <a
                href="/manychat-alternative"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 px-8 py-3.5 text-[15px] font-bold text-white transition hover:border-white/40"
              >
                Compare with ManyChat
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#101C3D]/10 bg-white/60 py-10">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#101C3D] text-sm font-black text-[#C9A227]">
                  LD
                </span>
                <span className="text-lg font-extrabold">LeadDoor</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#6B7590]">
                Every comment opens a door. Meta-compliant Instagram comment-to-DM automation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B7590]">Product</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><a href="#features" className="text-[#3E4A68] hover:text-[#101C3D]">Features</a></li>
                  <li><a href="#pricing" className="text-[#3E4A68] hover:text-[#101C3D]">Pricing</a></li>
                  <li><Link href="/templates" className="text-[#3E4A68] hover:text-[#101C3D]">Templates</Link></li>
                  <li><Link href="/login" className="text-[#3E4A68] hover:text-[#101C3D]">Log in</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B7590]">Compare</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {seoLinks.map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-[#3E4A68] hover:text-[#101C3D]">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B7590]">Legal</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><Link href="/privacy" className="text-[#3E4A68] hover:text-[#101C3D]">Privacy</Link></li>
                  <li><Link href="/terms" className="text-[#3E4A68] hover:text-[#101C3D]">Terms</Link></li>
                  <li><Link href="/data-deletion" className="text-[#3E4A68] hover:text-[#101C3D]">Data deletion</Link></li>
                  <li><Link href="/meta-review" className="text-[#3E4A68] hover:text-[#101C3D]">Meta review</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[#101C3D]/10 pt-6 text-xs text-[#6B7590] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 LeadDoor. All rights reserved.</p>
            <p>Built on the official Instagram Messaging API.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
