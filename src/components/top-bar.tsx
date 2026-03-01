"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BarChart3, GitCompare, Search, Vault } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRecentVaults } from "@/lib/hooks/use-recent-vaults";
import { Button } from "@/components/ui/button";
import { HLLogo } from "@/components/hl-logo";

const navItems = [
  { href: "/", label: "Vaults", icon: Vault },
  { href: "/deep-dive", label: "Deep Dive", icon: BarChart3 },
  { href: "/compare", label: "Compare", icon: GitCompare },
];

export function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { recentVaults } = useRecentVaults();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
        {/* Mobile: hamburger + brand */}
        <div className="flex items-center gap-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <HLLogo className="h-6 w-8 text-accent-teal" />
            <span className="font-semibold">Hyperliquid</span>
          </Link>
        </div>

        {/* Desktop: empty left (brand is in sidebar) */}
        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="https://app.hyperliquid.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 rounded-lg bg-accent-teal px-3 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Trade on
            <HLLogo className="h-4 w-5 text-black" />
          </a>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 left-0 h-full w-[260px] border-r border-border bg-background p-4">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <div className="h-6 w-6 rounded-md bg-accent-teal flex items-center justify-center">
                  <span className="text-xs font-bold text-black">HL</span>
                </div>
                <span className="font-semibold">Hyperliquid</span>
              </Link>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Analytics
            </p>
            <ul className="space-y-0.5 mb-6">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "border-l-2 border-accent-teal text-accent-teal bg-accent"
                          : "border-l-2 border-transparent text-foreground/70 hover:text-foreground hover:bg-accent",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {recentVaults.length > 0 && (
              <>
                <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Recent Vaults
                </p>
                <ul className="space-y-0.5">
                  {recentVaults.map((vault) => (
                    <li key={vault.address}>
                      <Link
                        href={`/vaults/${vault.address}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm border-l-2 border-transparent text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {vault.name || `${vault.address.slice(0, 6)}...${vault.address.slice(-4)}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
