"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, GitCompare, PieChart, Search, Vault } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentVaults } from "@/lib/hooks/use-recent-vaults";
import { HLWordmark } from "@/components/hl-logo";

const navSections = [
  {
    label: "Analytics",
    items: [
      { href: "/", label: "Vaults", icon: Vault },
      { href: "/deep-dive", label: "Deep Dive", icon: BarChart3 },
      { href: "/compare", label: "Compare", icon: GitCompare },
      { href: "/portfolio", label: "Portfolio", icon: PieChart },
    ],
  },
];

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const { recentVaults } = useRecentVaults();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 z-40 h-screen w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
        {/* Brand */}
        <div className="flex h-14 items-center px-5">
          <Link href="/" className="block">
            <HLWordmark className="h-7" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-6">
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                          active
                            ? "border-l-2 border-accent-teal text-accent-teal bg-sidebar-accent"
                            : "border-l-2 border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Recent Vaults */}
          {recentVaults.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Recent Vaults
              </p>
              <ul className="space-y-0.5">
                {recentVaults.map((vault) => (
                  <li key={vault.address}>
                    <Link
                      href={`/vaults/${vault.address}`}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                        pathname === `/vaults/${vault.address}`
                          ? "border-l-2 border-accent-teal text-accent-teal bg-sidebar-accent"
                          : "border-l-2 border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      )}
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {vault.name || shortenAddress(vault.address)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
