"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ name, level }: { name: string; level: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 lg:flex">
      <Logo href="/dashboard" className="px-2" />
      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-lime/15 text-lime" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="card flex items-center gap-3 p-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs capitalize text-lime">{level}</p>
        </div>
        <form action={signOut}>
          <button type="submit" aria-label="Log out" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
