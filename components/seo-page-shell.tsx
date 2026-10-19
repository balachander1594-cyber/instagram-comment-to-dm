import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

export interface SeoPageSection {
  title: string;
  body: string;
}

export interface SeoPageConfig {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta?: string;
  bullets: string[];
  sections: SeoPageSection[];
  comparisonTitle: string;
  comparisons: Array<{
    label: string;
    leadDoor: string;
    other: string;
  }>;
  templateLinks: Array<{
    label: string;
    href: string;
  }>;
  faqs: SeoPageSection[];
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42 0l-3.25-3.28a1 1 0 1 1 1.42-1.408l2.54 2.563 6.54-6.593a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function SeoPageShell({ config }: { config: SeoPageConfig }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      <section className="border-b border-[#101C3D]/10 bg-white/70">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-[#7A5F14]">
              {config.eyebrow}
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight text-[#101C3D] sm:text-6xl">
              {config.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5B6478]">
              {config.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center bg-[#C9A227] px-6 py-3 text-sm font-bold text-[#101C3D] transition hover:bg-[#D9B545]"
              >
                {config.primaryCta}
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center justify-center border border-[#101C3D]/10 bg-[#101C3D]/[0.04] px-6 py-3 text-sm font-bold text-[#101C3D] transition hover:border-[#101C3D]/20 hover:bg-[#101C3D]/[0.06]"
              >
                {config.secondaryCta ?? "Browse templates"}
              </Link>
            </div>
          </div>

          <div className="border border-[#101C3D]/10 bg-[#101C3D]/[0.03] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B7590]">
              Campaign OS checklist
            </p>
            <ul className="mt-5 space-y-4">
              {config.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-sm leading-6 text-[#3E4A68]">
                  <span className="mt-1 text-emerald-700">
                    <CheckIcon />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {config.sections.map((section) => (
            <article key={section.title} className="border border-[#101C3D]/10 bg-[#101C3D]/[0.03] p-6">
              <h2 className="text-2xl font-black text-[#101C3D]">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[#5B6478]">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#101C3D]/10 bg-white/[0.025] py-16">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-[#101C3D]">{config.comparisonTitle}</h2>
          <div className="mt-8 overflow-hidden border border-[#101C3D]/10">
            <div className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-[#101C3D]/10 bg-white text-xs font-bold uppercase tracking-wide text-[#6B7590]">
              <div className="p-4">Need</div>
              <div className="p-4 text-[#7A5F14]">LeadDoor</div>
              <div className="p-4">Generic automation</div>
            </div>
            {config.comparisons.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-1 border-b border-[#101C3D]/10 last:border-0 md:grid-cols-[0.8fr_1fr_1fr]"
              >
                <div className="bg-white/50 p-4 text-sm font-semibold text-[#101C3D]">
                  {item.label}
                </div>
                <div className="p-4 text-sm leading-6 text-[#3E4A68]">
                  {item.leadDoor}
                </div>
                <div className="p-4 text-sm leading-6 text-[#6B7590]">
                  {item.other}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">
            Start from a template
          </p>
          <h2 className="mt-3 text-4xl font-black text-[#101C3D]">
            Launch a campaign faster than building a chatbot flow
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#5B6478]">
            Use a campaign template, connect the right Instagram account, pick
            the post, and ship a measurable comment-to-DM loop.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {config.templateLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border border-[#101C3D]/10 bg-[#101C3D]/[0.03] p-5 text-sm font-semibold text-[#101C3D] transition hover:border-[#C9A227]/30 hover:bg-[#C9A227]/10"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[#101C3D]/10 bg-white/70 py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-[#7A5F14]">FAQ</p>
            <h2 className="mt-3 text-4xl font-black text-[#101C3D]">
              Search questions, answered clearly
            </h2>
          </div>
          <div className="grid gap-3">
            {config.faqs.map((faq) => (
              <article key={faq.title} className="border border-[#101C3D]/10 bg-[#101C3D]/[0.03] p-5">
                <h3 className="text-lg font-bold text-[#101C3D]">{faq.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5B6478]">{faq.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="border border-[#C9A227]/30 bg-[#C9A227]/10 p-8 text-center">
          <h2 className="text-4xl font-black text-[#101C3D]">
            Turn the next high-intent comment into a private reply
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#3E4A68]">
            LeadDoor is built for Instagram professional accounts, official
            Meta private replies, and campaign reporting teams can show clients.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center bg-[#C9A227] px-6 py-3 text-sm font-bold text-[#101C3D] transition hover:bg-[#D9B545]"
          >
            Start free
          </Link>
        </div>
      </section>
    </main>
  );
}

