"use client";

import { Bot, Dumbbell, LayoutDashboard, Plus, Salad } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { QuickAdd } from "./quick-add";

const LEFT = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
];
const RIGHT = [
  { href: "/diet", label: "Nutrition", icon: Salad },
  { href: "/coach", label: "Coach", icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const item = ({ href, label, icon: Icon }: (typeof LEFT)[number]) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link key={href} href={href} className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium", active ? "text-lime" : "text-muted")}>
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center px-2">
          {LEFT.map(item)}
          <div className="flex flex-1 justify-center">
            <button
              type="button"
              aria-label="Quick add"
              onClick={() => setOpen(true)}
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black shadow-[0_8px_30px_-6px_rgb(198_244_50/0.7)] cursor-pointer"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          {RIGHT.map(item)}
        </div>
      </nav>
      <QuickAdd open={open} onClose={() => setOpen(false)} />
    </>
  );
}
