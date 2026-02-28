"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Vaults" },
  { href: "/compare", label: "Compare" },
];

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 flex h-14 items-center gap-6">
        <Link href="/" className="font-bold text-lg">
          HL Vaults
        </Link>
        <nav className="flex gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
