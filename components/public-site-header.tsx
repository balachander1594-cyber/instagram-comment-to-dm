import Link from "next/link";

interface PublicSiteHeaderProps {
  active?: "home" | "templates";
}

const navLinks = [
  { label: "Templates", href: "/templates", key: "templates" },
  { label: "Agencies", href: "/instagram-dm-automation-agencies", key: "agencies" },
  { label: "Pricing", href: "/#pricing", key: "pricing" },
  { label: "Security", href: "/#security", key: "security" },
];

export default function PublicSiteHeader({ active }: PublicSiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#101C3D]/10 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="LeadDoor home">
          <span className="flex h-9 w-9 items-center justify-center border border-[#C9A227]/30 bg-[#C9A227]/10 text-sm font-black text-[#7A5F14]">
            LD
          </span>
          <span className="text-lg font-bold text-[#101C3D]">LeadDoor</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`text-sm font-medium transition ${
                active === link.key ? "text-[#101C3D]" : "text-[#5B6478] hover:text-[#101C3D]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-4 py-2 text-sm font-semibold text-[#3E4A68] transition hover:text-[#101C3D] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-[#C9A227] px-4 py-2 text-sm font-bold text-[#101C3D] transition hover:bg-[#D9B545]"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
