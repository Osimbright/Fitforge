import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pill CTA with a circular arrow badge (Bartos-style). */
export function ArrowLink({
  href,
  children,
  className,
  tone = "lime",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "lime" | "white";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-4 rounded-full py-2 pl-6 pr-2 font-semibold transition-all",
        tone === "lime"
          ? "bg-lime text-black hover:bg-[#d4ff4a] shadow-[0_10px_40px_-12px_rgb(198_244_50/0.7)]"
          : "bg-white text-black hover:bg-white/90",
        className,
      )}
    >
      {children}
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition-transform group-hover:rotate-45">
        <ArrowUpRight className="h-5 w-5" />
      </span>
    </Link>
  );
}
